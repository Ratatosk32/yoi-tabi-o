// Dictionary loader (JMdict, see dictionary/README.md): after the first paint load the core tier (4,000 words)
// and build the search index; then add the rest (18,667) in 500-row chunks when the browser is idle.
// The service worker keeps both files in their own cache (cache-first), so the dictionary works offline
// once it has been downloaded. Search results are ranked: match tier first, then dictionary rank (core first).
import { normalize } from './text.js';
import { createDictIndex } from './dict-search.js';

export const CHUNK = 500;
const state = { status: 'idle', loaded: 0, total: 0, error: null, dictDate: null, attribution: '', source: '', index: null };
const listeners = new Set();
let started = null;

const emit = () => listeners.forEach((fn) => { try { fn(status()); } catch { /* a listener must not break loading */ } });

/** { status: idle | loading | core | ready | error, loaded, total, dictDate, error } */
export function status() {
  const { index, ...s } = state;
  return { ...s };
}

/** Subscribe to progress; returns an unsubscribe function. */
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 16));

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

/** Start loading (idempotent). Resolves when everything is indexed (or rejects on error). */
export function load({ base = 'data/' } = {}) {
  if (started) return started;
  started = (async () => {
    try {
      state.status = 'loading'; emit();
      const core = await getJson(base + 'dict-core.json');
      state.total = core.total;
      state.attribution = core.attribution;
      state.source = core.source;
      state.dictDate = (core.source.match(/dictDate (\d{4}-\d{2}-\d{2})/) || [])[1] || null;
      state.index = createDictIndex(core.fields, core.rows, normalize);
      state.loaded = state.index.size;
      state.status = 'core'; emit();
      const rest = await getJson(base + 'dict-rest.json');
      await new Promise((resolve) => {
        let i = 0;
        const step = () => {
          state.index.add(rest.rows.slice(i, i + CHUNK));
          i += CHUNK;
          state.loaded = state.index.size;
          if (i < rest.rows.length) { emit(); idle(step); } else resolve();
        };
        idle(step);
      });
      state.status = 'ready'; emit();
    } catch (e) {
      state.status = state.index ? 'core' : 'error';
      state.error = String(e && e.message || e);
      started = null; // allow a retry
      emit();
      throw e;
    }
  })();
  return started;
}

/** Ranked search: [{ id, ja, kana, romaji, en, pos, topic, rank, core, alt, tier }]. Empty until core is indexed. */
export function search(query, limit = 30) {
  const idx = state.index;
  if (!idx) return [];
  const F = idx.F;
  return idx.search(query, limit).map(({ row, tier }) => ({
    id: row[F.id], ja: row[F.ja], kana: row[F.kana], romaji: row[F.romaji], en: row[F.en],
    pos: row[F.pos], topic: row[F.topic], rank: row[F.rank], core: row[F.core], alt: row[F.alt], tier,
  }));
}

export function progressText(s = status()) {
  if (s.status === 'ready') return `Dictionary: ${s.total.toLocaleString('en-US')} words ready`;
  if (s.status === 'core' || (s.status === 'loading' && s.loaded)) return `Dictionary: ${s.loaded.toLocaleString('en-US')} / ${s.total.toLocaleString('en-US')} words ready`;
  if (s.status === 'error') return 'Dictionary: not downloaded yet (needs a connection once)';
  return 'Dictionary: loading…';
}
