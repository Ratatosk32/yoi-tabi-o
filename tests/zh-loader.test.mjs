import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLangData, loadJson } from '../app/modules/loader.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/zh/${name}`, import.meta.url), 'utf8');
const FILES = { 'data/zh/curriculum.json': 'curriculum.json', 'data/zh/pinyin.json': 'pinyin.json', 'data/zh/hanzi.json': 'hanzi.json' };

function fakeFetch({ fail = null } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    if (url === fail) return { ok: false, status: 404, json: async () => ({}) };
    const name = FILES[url];
    if (!name) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => JSON.parse(fixture(name)) };
  };
  return { fn, calls };
}

test('the zh loader fetches exactly the three course files under data/zh/ (the dictionary loads later)', async () => {
  const f = fakeFetch();
  const data = await loadLangData('zh', { fetchFn: f.fn });
  assert.deepEqual(f.calls.sort(), ['data/zh/curriculum.json', 'data/zh/hanzi.json', 'data/zh/pinyin.json']);
  assert.equal(data.lang, 'zh');
  assert.ok(data.items.length > 10);
  assert.ok(data.items.every((it) => it.id.startsWith('zh.')));
  assert.ok(data.lessons.every((l) => /^Z\d\d-L\d\d$/.test(l.code)));
  assert.equal(data.byId['zh.basics.ni-hao'].ja, '你好！');
  assert.equal(data.lessonByCode['Z01-L01'].index, 0);
  assert.ok(data.pinyin.quizzes.length >= 2);
  assert.equal(data.kana, null);
  assert.ok(data.kanji.items.some((x) => x.group === 'radical'));
});

test('a failed or stalled download rejects with a message (the UI shows Retry)', async () => {
  const f = fakeFetch({ fail: 'data/zh/pinyin.json' });
  await assert.rejects(loadLangData('zh', { fetchFn: f.fn }), /data\/zh\/pinyin\.json: HTTP 404/);
  const never = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  await assert.rejects(loadJson('data/zh/hanzi.json', { fetchFn: never, timeoutMs: 20 }), /no response in 0.02 s/);
});

test('nothing Chinese is requested by the Japanese loader', async () => {
  const calls = [];
  const fn = async (url) => { calls.push(url); return { ok: true, json: async () => ({ format: 1, version: 1, categories: [], units: [], lessons: [], items: [] }) }; };
  await loadLangData('ja', { fetchFn: fn });
  assert.deepEqual(calls.sort(), ['data/curriculum.json', 'data/kana.json', 'data/kanji.json']);
});

test('the zh fixture follows the shared field contract (ja = hanzi, romaji = pinyin, kana = toneless key)', () => {
  const cur = JSON.parse(fixture('curriculum.json'));
  const ids = new Set(cur.items.map((x) => x.id));
  for (const it of cur.items) {
    assert.match(it.kana, /^[a-z v]+$/, it.id);
    for (const r of [...(it.replies || []), ...(it.replyTo || [])]) assert.ok(ids.has(r), `${it.id} → ${r}`);
  }
  for (const l of cur.lessons) for (const id of l.ids) assert.ok(ids.has(id), id);
});
