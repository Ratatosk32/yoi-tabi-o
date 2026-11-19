// "Check for updates" and "Hard refresh" (Tools). Browser objects are injected so the logic is testable in Node.
// Data is never touched: progress lives in localStorage, the dictionary in its own cache (dict-*).

const nav = () => globalThis.navigator;
const UPDATED_KEY = 'jt.updatedTo'; // sessionStorage: show "Updated to vN" after the reload

/** The running service worker's VERSION (e.g. "v15"), or null when the page is not controlled yet. */
export function appVersion({ sw = nav()?.serviceWorker, timeout = 1500 } = {}) {
  const ctl = sw?.controller;
  if (!ctl || typeof MessageChannel === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const t = setTimeout(() => resolve(null), timeout);
    ch.port1.onmessage = (e) => { clearTimeout(t); resolve(typeof e.data === 'string' ? e.data : null); };
    ctl.postMessage('version', [ch.port2]);
  });
}

/**
 * Ask the server for a new sw.js. Resolves to:
 *   { status: 'offline' }  no connection
 *   { status: 'current' }  nothing new
 *   { status: 'updating' } a new version is installing; the page reloads when it takes over
 *   { status: 'unsupported' }
 */
export async function checkForUpdates({ sw = nav()?.serviceWorker, onLine = nav()?.onLine !== false, reload = () => location.reload(),
  storage = globalThis.sessionStorage, waitMs = 20000 } = {}) {
  if (!sw) return { status: 'unsupported' };
  if (!onLine) return { status: 'offline' };
  const reg = await sw.getRegistration();
  if (!reg) return { status: 'unsupported' };
  try {
    await reg.update();
  } catch {
    return { status: 'offline' }; // the sw.js request failed
  }
  const worker = reg.installing || reg.waiting;
  if (!worker) return { status: 'current' };
  globalThis.__updateRequested = true; // app.js reloads on controllerchange
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    try { storage?.setItem(UPDATED_KEY, '1'); } catch { /* private mode */ }
    reload();
  };
  sw.addEventListener('controllerchange', go, { once: true });
  const nudge = () => { if (worker.state === 'installed') worker.postMessage('skipWaiting'); if (worker.state === 'activated') go(); };
  worker.addEventListener('statechange', nudge);
  nudge();
  setTimeout(go, waitMs); // safety net: never leave the user waiting
  return { status: 'updating' };
}

/** After a reload caused by checkForUpdates: true once (then forgotten). */
export function consumeUpdatedFlag(storage = globalThis.sessionStorage) {
  try {
    if (storage?.getItem(UPDATED_KEY)) { storage.removeItem(UPDATED_KEY); return true; }
  } catch { /* private mode */ }
  return false;
}

/**
 * Hard refresh: only when the server is reachable (otherwise the app would lose its offline copy).
 * Deletes the app-shell caches (jt-*), keeps the dictionary cache (dict-*) and localStorage,
 * unregisters the service worker and reloads; the fresh worker precaches the whole shell again.
 * Resolves to { status: 'offline' } or { status: 'reloading', deleted: [...] }.
 */
export async function hardRefresh({ cacheStorage = globalThis.caches, sw = nav()?.serviceWorker, fetchFn = globalThis.fetch,
  reload = () => location.reload(), probeUrl = 'manifest.webmanifest' } = {}) {
  try {
    const r = await fetchFn(probeUrl + '?probe=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return { status: 'offline' };
  } catch {
    return { status: 'offline' };
  }
  const deleted = [];
  if (cacheStorage) {
    for (const k of await cacheStorage.keys()) {
      if (k.startsWith('jt-')) { await cacheStorage.delete(k); deleted.push(k); }
    }
  }
  const reg = await sw?.getRegistration?.();
  if (reg) await reg.unregister();
  reload();
  return { status: 'reloading', deleted };
}
