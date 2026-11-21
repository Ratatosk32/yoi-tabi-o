// Automatic local snapshots of progress: once a day (on the first start of the day) the whole store is saved
// to IndexedDB on this device; the last 3 days are kept. Protects against our own bugs and data migrations
// ("Restore yesterday's state" in Tools). Same origin, never leaves the device. Not a replacement for a backup
// copy elsewhere: clearing the site data clears these too.

export const KEEP = 3;
const DB = 'jt-snapshots', STORE = 'daily';

/** Key-value adapter over IndexedDB: { all(), put(rec), del(day) }; null when IndexedDB is unavailable. */
export function idbKV(idb = globalThis.indexedDB) {
  if (!idb) return null;
  const open = () => new Promise((resolve, reject) => {
    const r = idb.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'day' }); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const run = async (mode, fn) => {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  };
  return {
    all: () => run('readonly', (s) => s.getAll()),
    put: (rec) => run('readwrite', (s) => s.put(rec)),
    del: (day) => run('readwrite', (s) => s.delete(day)),
  };
}

/** Is there anything worth saving? (a fresh install has no progress) */
export function hasProgress(data) {
  return Object.entries(data || {}).filter(([k]) => k !== 'settings').map(([, v]) => v).some((v) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : v != null));
}

/**
 * Save today's snapshot once (the state before today's changes), keep the newest KEEP days.
 * Returns the list of snapshots, newest first: [{ day, at, data }].
 */
export async function takeDailySnapshot(store, kv, today, now = new Date()) {
  if (!kv) return [];
  let list = (await kv.all()) || [];
  if (!list.some((s) => s.day === today)) {
    const { data, langs = {} } = store.exportAll();
    if (hasProgress(data) || Object.values(langs).some(hasProgress)) {
      const rec = { day: today, at: now.toISOString(), data, langs };
      await kv.put(rec);
      list = [...list, rec];
    }
  }
  list.sort((a, b) => (a.day < b.day ? 1 : -1));
  for (const old of list.slice(KEEP)) await kv.del(old.day);
  return list.slice(0, KEEP);
}

export async function listSnapshots(kv) {
  if (!kv) return [];
  return ((await kv.all()) || []).sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, KEEP);
}

/** Put the store back exactly as in the snapshot (keys missing from the snapshot are removed). */
export function restoreSnapshot(store, snap, keys) {
  restoreKeys(store, snap.data, keys);
  if (!snap.langs) return;
  for (const id of store.langIds || []) restoreKeys(store.lang(id), snap.langs[id] || {}, keys);
}

function restoreKeys(store, data, keys) {
  for (const k of keys) {
    if (k in data) store.set(k, data[k]);
    else store.remove(k);
  }
}
