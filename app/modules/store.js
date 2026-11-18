// Локальное хранилище: localStorage c try/catch и запасным in-memory вариантом.
// Можно передать свой backend (для тестов в Node).

const PREFIX = 'jt.';
export const KEYS = ['favs', 'srs', 'settings', 'cards', 'userItems', 'history', 'quizStats'];

function memoryBackend() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

export function createStore(backend) {
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

  function get(key, fallback) {
    if (cache.has(key)) return cache.get(key);
    let v = fallback;
    try {
      const raw = be.getItem(PREFIX + key);
      if (raw != null) v = JSON.parse(raw);
    } catch { /* повреждённые данные — используем fallback */ }
    cache.set(key, v);
    return v;
  }

  function set(key, value) {
    cache.set(key, value);
    try { be.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; }
  }

  function update(key, fallback, fn) {
    const next = fn(structuredCloneSafe(get(key, fallback)));
    set(key, next);
    return next;
  }

  function exportAll() {
    const out = { app: 'japan-trip', format: 1, exportedAt: new Date().toISOString(), data: {} };
    for (const k of KEYS) {
      const v = get(k, undefined);
      if (v !== undefined) out.data[k] = v;
    }
    return out;
  }

  /** Импорт: объект или JSON-строка формата exportAll(). mode: 'replace' | 'merge'. */
  function importAll(input, mode = 'merge') {
    const obj = typeof input === 'string' ? JSON.parse(input) : input;
    if (!obj || obj.app !== 'japan-trip' || typeof obj.data !== 'object') throw new Error('Не похоже на экспорт Japan Trip');
    const changed = [];
    for (const k of KEYS) {
      if (!(k in obj.data)) continue;
      const incoming = obj.data[k];
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

  return { get, set, update, exportAll, importAll };
}

function isPlainObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function mergeArrays(a, b) {
  // элементы с id — слияние по id; примитивы — объединение без повторов
  if (b.every((x) => x && typeof x === 'object' && 'id' in x)) {
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
