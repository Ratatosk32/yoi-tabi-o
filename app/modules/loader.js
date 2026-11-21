import { LANGS } from './lang.js';
import { completeItem } from './text.js';

export const LOAD_TIMEOUT_MS = 12000;

export async function loadJson(path, { fetchFn = globalThis.fetch, timeoutMs = LOAD_TIMEOUT_MS } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchFn(path, { signal: ctl.signal });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`${path}: no response in ${timeoutMs / 1000} s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function buildData(langId, cur, alphabet, chars) {
  const items = cur.items.map(completeItem);
  const lessons = cur.lessons.map((l, i) => ({ ...l, index: i }));
  return {
    lang: langId,
    version: `${cur.format}.${cur.version}`,
    categories: cur.categories,
    catById: Object.fromEntries(cur.categories.map((c) => [c.id, c])),
    items,
    byId: Object.fromEntries(items.map((it) => [it.id, it])),
    units: cur.units,
    unitById: Object.fromEntries(cur.units.map((u) => [u.id, u])),
    lessons,
    lessonByCode: Object.fromEntries(lessons.map((l) => [l.code, l])),
    kana: langId === 'ja' ? alphabet : null,
    pinyin: langId === 'zh' ? alphabet : null,
    kanji: chars,
  };
}

export async function loadLangData(langId, options = {}) {
  const paths = LANGS[langId].data;
  const [cur, alphabet, chars] = await Promise.all([
    loadJson(paths.curriculum, options),
    loadJson(paths.alphabet, options).catch((e) => { if (langId === 'ja') throw e; return {}; }),
    loadJson(paths.chars, options).catch((e) => { if (langId === 'ja') throw e; return { groups: [], items: [] }; }),
  ]);
  return buildData(langId, cur, alphabet, chars);
}
