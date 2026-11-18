// Сборка app/data/*.json из tools/content/*.src.mjs.
// Запуск: node tools/build-data.mjs   (затем node tools/validate.mjs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { completeItem } from '../app/modules/text.js';
import { CATEGORIES, ITEMS } from './content/phrases.src.mjs';
import * as KANA from './content/kana.src.mjs';
import { GROUPS, KANJI } from './content/kanji.src.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name, data) => {
  const p = join(root, 'app', 'data', name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 1) + '\n', 'utf8');
  return p;
};

const VERSION = 1;
const weekOf = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.week]));
// Слушание: касса конбини — с 1-й недели, ресторан — со 2-й, остальное — с 3-й
const HEAR_WEEK = { konbini: 1, food: 2, transport: 3, hotel: 3, shop: 3, family: 3 };

function row([id, ruby, romaji, ru, note, more], extra) {
  const it = completeItem({ id, ...extra, ru, ruby, romaji });
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
    // порядок полей как в схеме PLAN.md 3.3
    items.push({
      id: it.id, cat: it.cat, kind: it.kind, ru: it.ru, ja: it.ja, ruby: it.ruby, kana: it.kana, romaji: it.romaji,
      ...(it.tts ? { tts: it.tts } : {}), ...(it.note ? { note: it.note } : {}), ...(it.pattern ? { pattern: it.pattern } : {}), tags: it.tags,
    });
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
  words: KANA.WORDS.map(([k, r, ru]) => ({ k, r, ru })),
});

// ---------- kanji ----------
const kanji = [];
for (const g of GROUPS) {
  for (const r of KANJI[g.id]) {
    const it = row(r, { group: g.id });
    kanji.push({ id: it.id, group: it.group, ja: it.ja, ruby: it.ruby, kana: it.kana, romaji: it.romaji, ru: it.ru, ...(it.note ? { note: it.note } : {}) });
  }
}
const p3 = out('kanji.json', { version: VERSION, groups: GROUPS, items: kanji });

const byKind = items.reduce((a, it) => ((a[it.kind] = (a[it.kind] || 0) + 1), a), {});
console.log(`phrases: ${items.length} ${JSON.stringify(byKind)} → ${p1}`);
console.log(`kana: words ${KANA.WORDS.length} → ${p2}`);
console.log(`kanji: ${kanji.length} → ${p3}`);
