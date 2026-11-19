import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, KEYS } from '../app/modules/store.js';
import { takeDailySnapshot, listSnapshots, restoreSnapshot, hasProgress, idbKV, KEEP } from '../app/modules/snapshots.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const fakeKV = () => {
  const m = new Map();
  return { all: async () => [...m.values()].map((x) => structuredClone(x)), put: async (r) => { m.set(r.day, structuredClone(r)); }, del: async (d) => { m.delete(d); }, m };
};

test('one snapshot per day, only the newest 3 days kept, newest first', async () => {
  const store = createStore(mem());
  const kv = fakeKV();
  store.set('favs', ['a']);
  for (const [i, day] of ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'].entries()) {
    store.set('srs', { ['x' + i]: { box: 1 } });
    await takeDailySnapshot(store, kv, day);
  }
  store.set('srs', { changed: { box: 5 } });
  const again = await takeDailySnapshot(store, kv, '2026-11-18'); // a second start on the same day: no new snapshot
  assert.equal(again.length, KEEP);
  assert.deepEqual([...kv.m.keys()].sort(), ['2026-11-16', '2026-11-17', '2026-11-18']);
  const list = await listSnapshots(kv);
  assert.deepEqual(list.map((s) => s.day), ['2026-11-18', '2026-11-17', '2026-11-16']);
  assert.deepEqual(list[0].data.srs, { x3: { box: 1 } }, 'the snapshot is the state at the first start of the day');
});

test('nothing is saved for a fresh install (settings only)', async () => {
  const store = createStore(mem());
  store.set('settings', { furigana: true });
  const kv = fakeKV();
  assert.deepEqual(await takeDailySnapshot(store, kv, '2026-11-18'), []);
  assert.equal(hasProgress({ settings: { a: 1 } }), false);
  assert.equal(hasProgress({ settings: {}, favs: ['a'] }), true);
  assert.equal(hasProgress({ srs: {} }), false);
});

test('restore puts the store back exactly (keys added later are removed)', async () => {
  const be = mem();
  const store = createStore(be);
  store.set('favs', ['a', 'b']);
  store.set('srs', { k: { box: 2 } });
  const kv = fakeKV();
  const [snap] = await takeDailySnapshot(store, kv, '2026-11-18');
  store.set('favs', []);
  store.set('srs', { k: { box: 5 }, other: { box: 1 } });
  store.set('dictFavs', [{ id: 1, ja: 'x' }]);
  restoreSnapshot(store, snap, KEYS);
  assert.deepEqual(store.get('favs'), ['a', 'b']);
  assert.deepEqual(store.get('srs'), { k: { box: 2 } });
  assert.equal(store.get('dictFavs', 'none'), 'none');
  assert.equal(be.m.has('jt.dictFavs'), false, 'removed from localStorage too');
});

test('no IndexedDB (e.g. a private window): snapshots are skipped quietly', async () => {
  assert.equal(idbKV(undefined), null);
  assert.deepEqual(await takeDailySnapshot(createStore(mem()), null, '2026-11-18'), []);
  assert.deepEqual(await listSnapshots(null), []);
});
