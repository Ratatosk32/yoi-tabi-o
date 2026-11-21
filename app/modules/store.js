// Local storage: localStorage with try/catch and an in-memory fallback.
// A custom backend can be passed (for tests in Node).
import { migrateSrsKeys } from './srs.js';

const PREFIX = 'jt.';
export const LANG_PREFIXES = { zh: 'jt.zh.' };
export const BACKUP_FORMAT = 3;
export const KEYS = ['favs', 'srs', 'settings', 'cards', 'userItems', 'history', 'quizStats', 'lessons', 'learned', 'activity', 'dictFavs'];

function memoryBackend() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

/**
 * Bring data saved by older versions up to date:
 * SRS keys "id|ja2ru" / "id|ru2ja" → "id|ja2en" / "id|en2ja"; user phrases { ru } → { en }.
 */
export function migrateValue(key, v) {
  if (key === 'srs') return migrateSrsKeys(v);
  if (key === 'userItems' && Array.isArray(v)) {
    return v.map((x) => {
      if (!isPlainObject(x) || !('ru' in x)) return x;
      const { ru, ...rest } = x;
      return { ...rest, en: rest.en || ru };
    });
  }
  return v;
}

export function createStore(backend, { prefix = PREFIX, langs = LANG_PREFIXES } = {}) {
  let be = backend;
  if (!be) {
    try {
      be = globalThis.localStorage;
      const t = PREFIX + '__t';
      be.setItem(t, '1'); be.removeItem(t);
    } catch {
      be = memoryBackend();
    }
  }
  const cache = new Map();

  const children = new Map();

  function get(key, fallback) {
    if (cache.has(key)) return cache.get(key);
    try {
      const raw = be.getItem(prefix + key);
      if (raw != null) {
        const v = JSON.parse(raw);
        cache.set(key, v); // cache only real stored values, never the caller's fallback
        return v;
      }
    } catch { /* corrupted data — use the fallback */ }
    return fallback;
  }

  function set(key, value) {
    cache.set(key, value);
    try { be.setItem(prefix + key, JSON.stringify(value)); return true; } catch { return false; }
  }

  function remove(key) {
    cache.delete(key);
    try { be.removeItem(prefix + key); } catch { /* ignore */ }
  }

  function update(key, fallback, fn) {
    const next = fn(structuredCloneSafe(get(key, fallback)));
    set(key, next);
    return next;
  }

  /** Migrate stored data from older versions in place. Returns the list of migrated keys. */
  function migrate() {
    const changed = [];
    for (const k of ['srs', 'userItems']) {
      const v = get(k, undefined);
      if (v === undefined) continue;
      const m = migrateValue(k, v);
      if (JSON.stringify(m) !== JSON.stringify(v)) { set(k, m); changed.push(k); }
    }
    return changed;
  }

  function lang(id) {
    if (!langs[id]) return api;
    if (!children.has(id)) children.set(id, createStore(be, { prefix: langs[id], langs: {} }));
    return children.get(id);
  }

  function exportData() {
    const data = {};
    for (const k of KEYS) {
      const v = get(k, undefined);
      if (v !== undefined) data[k] = v;
    }
    return data;
  }

  function exportAll() {
    const out = { app: 'japan-trip', format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), data: exportData(), langs: {} };
    for (const id of Object.keys(langs)) out.langs[id] = lang(id).exportData();
    return out;
  }

  function importData(data, mode) {
    const changed = [];
    for (const k of KEYS) {
      if (!(k in data)) continue;
      if (!typeOk(k, data[k])) continue;
      const incoming = migrateValue(k, data[k]);
      if (mode === 'merge' && isPlainObject(incoming) && isPlainObject(get(k, undefined))) {
        set(k, { ...get(k, {}), ...incoming });
      } else if (mode === 'merge' && Array.isArray(incoming) && Array.isArray(get(k, undefined))) {
        set(k, mergeArrays(get(k, []), incoming));
      } else {
        set(k, incoming);
      }
      changed.push(k);
    }
    return changed;
  }

  /**
   * Import: an object or JSON string in exportAll() format (format 1 backups are migrated).
   * mode: 'replace' | 'merge'. Fields of the wrong type are skipped (QA B6);
   * empty arrays don't wipe current data (QA B1).
   */
  function importAll(input, mode = 'merge') {
    let obj;
    try { obj = typeof input === 'string' ? JSON.parse(input) : input; } catch { obj = null; }
    if (!obj || obj.app !== 'japan-trip' || !obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) {
      throw new Error('This file is not a Japan Trip backup');
    }
    const changed = importData(obj.data, mode);
    for (const id of Object.keys(langs)) {
      const part = obj.langs?.[id];
      if (isPlainObject(part)) changed.push(...lang(id).importData(part, mode).map((k) => `${id}.${k}`));
    }
    return changed;
  }

  const api = { get, set, remove, update, migrate, exportData, importData, exportAll, importAll, lang, langIds: Object.keys(langs), prefix };
  return api;
}

function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

// Expected types of backup fields
const ARRAY_KEYS = new Set(['favs', 'userItems', 'history', 'activity', 'dictFavs']);
function typeOk(key, v) {
  if (ARRAY_KEYS.has(key)) {
    if (!Array.isArray(v)) return false;
    if (key === 'userItems') return v.every((x) => isPlainObject(x) && typeof x.id === 'string');
    if (key === 'dictFavs') return v.every((x) => isPlainObject(x) && Number.isInteger(x.id) && typeof x.ja === 'string'); // dictionary words (JMdict ids)
    return v.every((x) => typeof x === 'string');
  }
  return isPlainObject(v);
}

const hasIds = (arr) => arr.length > 0 && arr.every((x) => isPlainObject(x) && 'id' in x);

function mergeArrays(a, b) {
  if (!b.length) return a; // an empty array in the backup doesn't wipe current data
  // objects with id — merge by id (only if both arrays hold objects with id); primitives — union without duplicates
  if (hasIds(b) && (a.length === 0 || hasIds(a))) {
    const m = new Map(a.filter((x) => x && x.id).map((x) => [x.id, x]));
    for (const x of b) m.set(x.id, x);
    return [...m.values()];
  }
  return [...new Set([...a, ...b])];
}

function structuredCloneSafe(v) {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  return JSON.parse(JSON.stringify(v));
}
