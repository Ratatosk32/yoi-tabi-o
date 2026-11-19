import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkForUpdates, hardRefresh, consumeUpdatedFlag } from '../app/modules/updates.js';

function fakeWorker(state) {
  const w = new EventTarget();
  w.state = state;
  w.sent = [];
  w.postMessage = (m) => { w.sent.push(m); };
  return w;
}
function fakeSw({ newWorker = null, updateFails = false } = {}) {
  const sw = new EventTarget();
  const reg = {
    installing: null, waiting: null, unregistered: false,
    async update() { if (updateFails) throw new TypeError('Failed to fetch'); if (newWorker) this[newWorker.state === 'installed' ? 'waiting' : 'installing'] = newWorker; },
    async unregister() { this.unregistered = true; return true; },
  };
  sw.getRegistration = async () => reg;
  sw.reg = reg;
  return sw;
}
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('check for updates: nothing new → current; offline → offline (navigator.onLine or a failed sw.js request)', async () => {
  assert.equal((await checkForUpdates({ sw: fakeSw(), onLine: true })).status, 'current');
  assert.equal((await checkForUpdates({ sw: fakeSw(), onLine: false })).status, 'offline');
  assert.equal((await checkForUpdates({ sw: fakeSw({ updateFails: true }), onLine: true })).status, 'offline');
  assert.equal((await checkForUpdates({ sw: undefined })).status, 'unsupported');
});

test('check for updates: a waiting worker is told to skip waiting; reload on controllerchange (once); flag for the toast', async () => {
  const w = fakeWorker('installed');
  const sw = fakeSw({ newWorker: w });
  const storage = memStorage();
  let reloads = 0;
  const r = await checkForUpdates({ sw, onLine: true, storage, reload: () => { reloads += 1; }, waitMs: 50 });
  assert.equal(r.status, 'updating');
  assert.deepEqual(w.sent, ['skipWaiting']);
  sw.dispatchEvent(new Event('controllerchange'));
  await new Promise((ok) => setTimeout(ok, 80)); // the safety timeout must not reload a second time
  assert.equal(reloads, 1);
  assert.equal(consumeUpdatedFlag(storage), true);
  assert.equal(consumeUpdatedFlag(storage), false, 'the flag is used once');
});

test('check for updates: an installing worker is nudged when installed; safety reload if controllerchange never comes', async () => {
  const w = fakeWorker('installing');
  let reloads = 0;
  const r = await checkForUpdates({ sw: fakeSw({ newWorker: w }), onLine: true, storage: memStorage(), reload: () => { reloads += 1; }, waitMs: 30 });
  assert.equal(r.status, 'updating');
  assert.deepEqual(w.sent, []);
  w.state = 'installed';
  w.dispatchEvent(new Event('statechange'));
  assert.deepEqual(w.sent, ['skipWaiting']);
  await new Promise((ok) => setTimeout(ok, 60));
  assert.equal(reloads, 1);
});

test('hard refresh: deletes only jt-* caches, keeps dict-*, unregisters, reloads; refuses offline', async () => {
  const names = new Set(['jt-v14', 'jt-v15', 'dict-2026-11-16', 'other']);
  const cacheStorage = { keys: async () => [...names], delete: async (k) => names.delete(k) };
  const sw = fakeSw();
  let reloads = 0;
  const ok = await hardRefresh({ cacheStorage, sw, fetchFn: async () => ({ ok: true }), reload: () => { reloads += 1; } });
  assert.deepEqual(ok, { status: 'reloading', deleted: ['jt-v14', 'jt-v15'] });
  assert.deepEqual([...names].sort(), ['dict-2026-11-16', 'other']);
  assert.equal(sw.reg.unregistered, true);
  assert.equal(reloads, 1);

  const names2 = new Set(['jt-v15', 'dict-2026-11-16']);
  const off = await hardRefresh({ cacheStorage: { keys: async () => [...names2], delete: async (k) => names2.delete(k) }, sw: fakeSw(),
    fetchFn: async () => { throw new TypeError('Failed to fetch'); }, reload: () => { reloads += 1; } });
  assert.equal(off.status, 'offline');
  assert.equal(names2.size, 2, 'nothing deleted offline (the app would lose its offline copy)');
  assert.equal(reloads, 1);
});

test('the service worker answers a version request and precaches the updates module', () => {
  const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("if (event.data === 'version') event.ports[0]?.postMessage(VERSION);"));
  assert.ok(sw.includes("'modules/updates.js',"));
});
