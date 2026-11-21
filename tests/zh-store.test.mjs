import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, KEYS, BACKUP_FORMAT } from '../app/modules/store.js';
import { takeDailySnapshot, restoreSnapshot } from '../app/modules/snapshots.js';
import { savedLang, saveLang, setActive, current, tag, dataFiles, LANGS } from '../app/modules/lang.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const fakeKV = () => {
  const m = new Map();
  return { all: async () => [...m.values()].map((x) => structuredClone(x)), put: async (r) => { m.set(r.day, structuredClone(r)); }, del: async (d) => { m.delete(d); } };
};

test('the Chinese course writes under its own prefix; Japanese keys are untouched', () => {
  const be = memory();
  const root = createStore(be);
  root.set('srs', { 'basics.hai|en2ja': { box: 3, due: '2026-11-22' } });
  root.set('favs', ['basics.hai']);
  const before = JSON.stringify([...be.m.entries()].sort());
  const zh = root.lang('zh');
  zh.set('srs', { 'zh.basics.ni-hao|en2ja': { box: 1, due: '2026-11-21' } });
  zh.update('favs', [], (f) => [...f, 'zh.basics.ni-hao']);
  zh.set('settings', { furigana: false });
  const jaKeys = [...be.m.keys()].filter((k) => !k.startsWith('jt.zh.')).sort();
  assert.equal(JSON.stringify([...be.m.entries()].filter(([k]) => jaKeys.includes(k)).sort()), before);
  assert.deepEqual(root.get('favs'), ['basics.hai']);
  assert.deepEqual(Object.keys(root.get('srs')), ['basics.hai|en2ja']);
  assert.equal(be.m.get('jt.zh.favs'), '["zh.basics.ni-hao"]');
  assert.equal(root.get('settings', 'none'), 'none');
  assert.equal(root.lang('zh'), zh, 'one child store per language');
  assert.equal(root.lang('ja'), root, 'Japanese is the root store with the original jt.* keys');
  assert.deepEqual(createStore(be).lang('zh').get('favs'), ['zh.basics.ni-hao'], 'survives a reload');
});

test('a backup holds both courses and restores both', () => {
  const a = createStore(memory());
  a.set('favs', ['ja-1']);
  a.lang('zh').set('favs', ['zh.a']);
  a.lang('zh').set('srs', { 'zh.a|en2ja': { box: 2, due: '2026-11-22' } });
  const dump = a.exportAll();
  assert.equal(dump.format, BACKUP_FORMAT);
  assert.deepEqual(dump.data.favs, ['ja-1']);
  assert.deepEqual(dump.langs.zh.favs, ['zh.a']);
  const b = createStore(memory());
  const changed = b.importAll(JSON.stringify(dump), 'merge');
  assert.ok(changed.includes('favs') && changed.includes('zh.favs') && changed.includes('zh.srs'), changed.join());
  assert.deepEqual(b.get('favs'), ['ja-1']);
  assert.deepEqual(b.lang('zh').get('favs'), ['zh.a']);
});

test('restoring an older Japanese-only backup still works and leaves Chinese progress alone', () => {
  const s = createStore(memory());
  s.lang('zh').set('favs', ['zh.keep']);
  const old = JSON.stringify({ app: 'japan-trip', format: 2, data: { favs: ['basics.hai'], srs: { 'basics.hai|ja2en': { box: 2, due: '2026-11-20' } } } });
  const changed = s.importAll(old, 'merge');
  assert.deepEqual(changed.sort(), ['favs', 'srs']);
  assert.deepEqual(s.get('favs'), ['basics.hai']);
  assert.deepEqual(s.lang('zh').get('favs'), ['zh.keep']);
  const v1 = JSON.stringify({ app: 'japan-trip', format: 1, data: { srs: { 'x|ru2ja': { box: 1, due: '2026-11-19' } } } });
  s.importAll(v1, 'merge');
  assert.ok(s.get('srs')['x|en2ja'], 'format 1 keys are still migrated');
});

test('a malformed zh part of a backup is skipped, the Japanese part is restored', () => {
  const s = createStore(memory());
  const changed = s.importAll({ app: 'japan-trip', format: 3, data: { favs: ['a'] }, langs: { zh: 'oops' } }, 'merge');
  assert.deepEqual(changed, ['favs']);
  assert.deepEqual(s.importAll({ app: 'japan-trip', format: 3, data: {}, langs: { zh: { favs: 'not-an-array', srs: {} } } }, 'merge'), ['zh.srs']);
});

test('daily snapshots cover both courses; restore is exact per course; pre-zh snapshots leave Chinese alone', async () => {
  const store = createStore(memory());
  const kv = fakeKV();
  store.lang('zh').set('favs', ['zh.a']);
  const [snap] = await takeDailySnapshot(store, kv, '2026-11-21');
  assert.ok(snap, 'Chinese progress alone is worth a snapshot');
  assert.deepEqual(snap.langs.zh.favs, ['zh.a']);
  store.lang('zh').set('favs', ['zh.changed']);
  store.lang('zh').set('dictFavs', [{ id: 1, ja: '学生' }]);
  store.set('favs', ['ja.later']);
  restoreSnapshot(store, snap, KEYS);
  assert.deepEqual(store.lang('zh').get('favs'), ['zh.a']);
  assert.equal(store.lang('zh').get('dictFavs', 'none'), 'none');
  assert.equal(store.get('favs', 'none'), 'none');
  store.lang('zh').set('favs', ['zh.after']);
  restoreSnapshot(store, { day: '2026-11-19', data: { favs: ['ja.old'] } }, KEYS);
  assert.deepEqual(store.get('favs'), ['ja.old']);
  assert.deepEqual(store.lang('zh').get('favs'), ['zh.after']);
});

test('the chosen course is remembered outside the progress keys', () => {
  const be = memory();
  assert.equal(savedLang(be), 'ja');
  saveLang('zh', be);
  assert.equal(savedLang(be), 'zh');
  be.setItem('jt.lang', 'xx');
  assert.equal(savedLang(be), 'ja');
  assert.ok(!KEYS.includes('lang'));
  assert.equal(savedLang({ getItem: () => { throw new Error('blocked'); } }), 'ja');
});

test('language profiles: lang attributes, TTS locales, lazily loaded file lists', () => {
  assert.equal(setActive('zh').tag, 'zh-CN');
  assert.equal(tag(), 'zh-CN');
  assert.equal(current().locale, 'zh-CN');
  assert.equal(setActive('nope').id, 'ja');
  assert.equal(tag(), 'ja');
  assert.deepEqual(dataFiles('zh'), ['data/zh/curriculum.json', 'data/zh/pinyin.json', 'data/zh/hanzi.json', 'data/zh/dict-core.json', 'data/zh/dict-rest.json']);
  assert.ok(dataFiles('ja').every((f) => !f.includes('/zh/')));
  assert.equal(LANGS.zh.words.alphabet, 'Pinyin');
  assert.equal(LANGS.zh.words.translateTo, 'zh-CN');
});
