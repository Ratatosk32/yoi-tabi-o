// English version: data in `en`, legacy progress keys and backups migrated, no Cyrillic in the shipped app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, migrateValue } from '../app/modules/store.js';
import { migrateSrsKeys, MODES } from '../app/modules/srs.js';
import { cyrillicInApp } from '../tools/validate.mjs';

const phrases = JSON.parse(readFileSync(new URL('../app/data/phrases.json', import.meta.url), 'utf8'));

test('data uses en, no ru field; natural English for key phrases', () => {
  for (const it of phrases.items) { assert.ok(it.en, it.id); assert.ok(!('ru' in it), it.id); }
  const by = Object.fromEntries(phrases.items.map((x) => [x.id, x]));
  assert.equal(by['konbini.bag-none'].en, 'I don’t need a bag');
  assert.equal(by['hear.konbini.bag'].en, 'Do you need a bag?');
  assert.deepEqual(Object.keys(MODES), ['ja2en', 'en2ja', 'audio']);
});

test('legacy SRS keys are migrated (ids stay stable)', () => {
  const m = migrateSrsKeys({ 'basics.hai|ja2ru': { box: 3, due: '2026-11-20' }, 'basics.hai|ru2ja': { box: 2, due: '2026-11-21' }, 'x|audio': { box: 1, due: '2026-11-19' } });
  assert.deepEqual(Object.keys(m).sort(), ['basics.hai|en2ja', 'basics.hai|ja2en', 'x|audio']);
  assert.equal(m['basics.hai|ja2en'].box, 3);
});

test('stored data and old backups migrate (srs keys, user phrases ru → en)', () => {
  const mem = new Map();
  const be = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  be.setItem('jt.srs', JSON.stringify({ 'a|ja2ru': { box: 2, due: '2026-11-20' } }));
  be.setItem('jt.userItems', JSON.stringify([{ id: 'u.1', ru: 'Зонт', ja: '傘' }]));
  const s = createStore(be);
  assert.deepEqual(s.migrate().sort(), ['srs', 'userItems']);
  assert.ok(s.get('srs')['a|ja2en']);
  assert.equal(s.get('userItems')[0].en, 'Зонт');
  assert.ok(!('ru' in s.get('userItems')[0]));
  // a format-1 backup is migrated on import
  const t = createStore({ getItem: () => null, setItem() {}, removeItem() {} });
  t.importAll(JSON.stringify({ app: 'japan-trip', format: 1, data: { srs: { 'b|ru2ja': { box: 1, due: '2026-11-20' } }, userItems: [{ id: 'u.2', ru: 'x', ja: 'y' }] } }));
  assert.ok(t.get('srs')['b|en2ja']);
  assert.equal(t.get('userItems')[0].en, 'x');
  assert.deepEqual(migrateValue('favs', ['a']), ['a']);
});

test('no Cyrillic in any shipped file under app/', () => {
  assert.deepEqual(cyrillicInApp(), []);
});

test('store.get never caches a fallback (migrate() on an empty store must not break later reads)', () => {
  const s = createStore({ getItem: () => null, setItem() {}, removeItem() {} });
  s.migrate();
  assert.deepEqual(s.get('srs', {}), {});
  assert.deepEqual(s.get('favs', []), []);
});
