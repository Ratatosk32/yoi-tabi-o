// Build app/data/*.json from tools/content/*.src.mjs.
// Run: node tools/build-data.mjs   (then node tools/validate.mjs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { completeItem } from '../app/modules/text.js';
import { CATEGORIES, ITEMS, REPLIES } from './content/phrases.src.mjs';
import * as KANA from './content/kana.src.mjs';
import { GROUPS, KANJI } from './content/kanji.src.mjs';
import { GROUPS_EXTRA, KANJI_EXTRA } from '../curriculum/src/kanji-extra.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name, data) => {
  const p = join(root, 'app', 'data', name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 1) + '\n', 'utf8');
  return p;
};

// Data format version: 2 = English translations in the `en` field (was `ru` in v1).
const VERSION = 2;
const weekOf = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.week]));
// Listening: convenience-store till from week 1, restaurant from week 2, the rest from week 3
const HEAR_WEEK = { konbini: 1, food: 2, transport: 3, hotel: 3, shop: 3, family: 3 };

function row([id, ruby, romaji, en, note, more], extra) {
  const it = completeItem({ id, ...extra, en, ruby, romaji });
  if (note) it.note = note;
  if (more && more.tts) it.tts = more.tts;
  return it;
}

// ---------- phrases ----------
const items = [];
for (const [key, list] of Object.entries(ITEMS)) {
  const [cat, kind] = key.split(':');
  for (const r of list) {
    const week = kind === 'hear' ? HEAR_WEEK[cat] : weekOf[cat];
    const tags = [`w${week}`];
    if (kind === 'hear') tags.push('hear');
    if (cat === 'basics' || cat === 'patterns') tags.push('core');
    const it = row(r, { cat, kind });
    if (kind === 'pattern' && it.note) {
      const m = it.note.match(/^(～[^ ]+)/);
      if (m) it.pattern = m[1];
    }
    it.tags = tags;
    // field order as in the schema (PLAN.md 3.3)
    items.push({
      id: it.id, cat: it.cat, kind: it.kind, en: it.en, ja: it.ja, ruby: it.ruby, kana: it.kana, romaji: it.romaji,
      ...(it.tts ? { tts: it.tts } : {}), ...(it.note ? { note: it.note } : {}), ...(it.pattern ? { pattern: it.pattern } : {}), tags: it.tags,
    });
  }
}
// "heard → reply" links: replies on hear items, reverse replyTo on say items
const byId = new Map(items.map((it) => [it.id, it]));
for (const [hearId, sayIds] of Object.entries(REPLIES)) {
  const h = byId.get(hearId);
  if (!h) throw new Error('REPLIES: no phrase ' + hearId);
  h.replies = [...sayIds];
  for (const sid of sayIds) {
    const s = byId.get(sid);
    if (!s) throw new Error('REPLIES: no reply ' + sid);
    s.replyTo = [...new Set([...(s.replyTo || []), hearId])];
  }
}
const p1 = out('phrases.json', { version: VERSION, categories: CATEGORIES, items });

// ---------- kana ----------
const toKata = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const cell = (x, kataOnly = false) => {
  if (!x) return null;
  const [ch, r] = x.split(' ');
  return kataOnly ? { h: null, k: ch, r } : { h: ch, k: toKata(ch), r };
};
const grid = (rows, kataOnly) => rows.map((rw) => rw.map((x) => cell(x, kataOnly)));
const p2 = out('kana.json', {
  version: VERSION,
  gojuon: grid(KANA.GOJUON),
  dakuten: grid(KANA.DAKUTEN),
  yoon: grid(KANA.YOON),
  extended: grid(KANA.EXTENDED, true),
  notes: KANA.SPECIAL_NOTES,
  words: KANA.WORDS.map(([k, r, en]) => ({ k, r, en })),
});

// ---------- kanji ----------
// Groups: ours, plus the linguist's extra groups (pharmacy goes right after allergen).
const groups = [...GROUPS];
for (const g of GROUPS_EXTRA) {
  if (groups.some((x) => x.id === g.id)) continue;
  const at = groups.findIndex((x) => x.id === 'allergen');
  groups.splice(at < 0 ? groups.length : at + 1, 0, g);
}
const kanji = [];
const pick = (it) => ({ id: it.id, group: it.group, ja: it.ja, ruby: it.ruby, kana: it.kana, romaji: it.romaji, en: it.en, ...(it.note ? { note: it.note } : {}) });
for (const g of groups) {
  for (const r of KANJI[g.id] || []) kanji.push(pick(row(r, { group: g.id })));
  // curriculum/src/kanji-extra.mjs: appended after our items of the same group, in its own (frequency) order
  for (const it of KANJI_EXTRA.filter((x) => x.group === g.id)) kanji.push(pick(it));
}
const unknown = KANJI_EXTRA.filter((x) => !groups.some((g) => g.id === x.group));
if (unknown.length) throw new Error('kanji-extra: unknown groups ' + [...new Set(unknown.map((x) => x.group))].join(', '));
const p3 = out('kanji.json', { version: VERSION, groups, items: kanji });

const byKind = items.reduce((a, it) => ((a[it.kind] = (a[it.kind] || 0) + 1), a), {});
console.log(`links: ${Object.keys(REPLIES).length} hear → ${items.filter((it) => it.replyTo).length} say`);
console.log(`phrases: ${items.length} ${JSON.stringify(byKind)} → ${p1}`);
console.log(`kana: words ${KANA.WORDS.length} → ${p2}`);
console.log(`kanji: ${kanji.length} (${KANJI_EXTRA.length} from curriculum/src/kanji-extra.mjs) → ${p3}`);
