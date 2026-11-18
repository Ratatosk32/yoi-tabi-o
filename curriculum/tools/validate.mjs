// Validates curriculum/data/curriculum.json and checks that curriculum/ contains no Cyrillic.
// Run: node curriculum/tools/validate.mjs   (exit code 1 on errors)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rubyToJa, rubyToKana, kanjiWithoutReading, romajiMatches, suggestRomaji } from './lib.mjs';

const cur = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(cur, '..');
const data = JSON.parse(readFileSync(join(cur, 'data', 'curriculum.json'), 'utf8'));
const v1 = JSON.parse(readFileSync(join(root, 'app', 'data', 'phrases.json'), 'utf8'));

const errors = [], warnings = [];
const E = (m) => errors.push(m), W = (m) => warnings.push(m);
const KINDS = new Set(['say', 'hear', 'pattern', 'card']);
const KANA_ONLY = /^[぀-ゟ゠-ヿ〇、。・？！ 　ー〜～]+$/u;
const ROMAJI_OK = /^[A-Za-zāīūēōĀĪŪĒŌ'’ \-,.?!〇]+$/u;
const CYR = new RegExp("[\u0400-\u04FF]");
// こんにちは / こんばんは: the は inside the word is read "wa" (checked by hand).
const ROMAJI_REVIEWED = new Set(['basics.konnichiwa', 'basics.konbanwa']);

const ids = new Set();
const cats = new Set(data.categories.map((c) => c.id));
const lessons = new Map(data.lessons.map((l) => [l.code, l]));
const byId = new Map(data.items.map((it) => [it.id, it]));
let prevOrder = 0;

for (const it of data.items) {
  const w = `[${it.id}]`;
  if (!it.id || !/^[a-z0-9.\-]+$/.test(it.id)) E(`${w} bad id`);
  if (ids.has(it.id)) E(`${w} duplicate id`); ids.add(it.id);
  for (const f of ['cat', 'kind', 'en', 'ja', 'ruby', 'kana', 'romaji', 'lesson', 'level', 'order']) if (it[f] == null || it[f] === '') E(`${w} missing field ${f}`);
  if ('ru' in it) E(`${w} has a "ru" field (data must use "en" only)`);
  if (!cats.has(it.cat)) E(`${w} unknown category ${it.cat}`);
  if (!KINDS.has(it.kind)) E(`${w} unknown kind ${it.kind}`);
  if (!lessons.has(it.lesson)) E(`${w} unknown lesson ${it.lesson}`);
  if (!(it.level >= 1 && it.level <= 5)) E(`${w} level outside 1..5`);
  if (it.order !== prevOrder + 1) E(`${w} order ${it.order} out of sequence`); prevOrder = it.order;
  if (it.ruby) {
    if (rubyToJa(it.ruby) !== it.ja) E(`${w} ruby->ja differs from ja`);
    if (rubyToKana(it.ruby) !== it.kana) E(`${w} ruby->kana differs from kana`);
    if (kanjiWithoutReading(it.ruby)) E(`${w} kanji without reading: ${it.ruby}`);
  }
  if (!KANA_ONLY.test(it.kana)) E(`${w} kana field contains non-kana: ${it.kana}`);
  if (!ROMAJI_OK.test(it.romaji)) E(`${w} invalid characters in romaji: ${it.romaji}`);
  else if (!romajiMatches(it.romaji, it.kana) && !ROMAJI_REVIEWED.has(it.id)) E(`${w} romaji "${it.romaji}" does not match kana "${it.kana}" (expected roughly: ${suggestRomaji(it.kana)})`);
  for (const f of ['en', 'note']) if (it[f] && CYR.test(it[f])) E(`${w} Cyrillic in ${f}`);
  if (it.en && it.en !== it.en.trim()) W(`${w} leading/trailing spaces in en`);
  if (it.kind === 'pattern' && !it.pattern) E(`${w} pattern item without a "pattern" field`);
  for (const r of it.replies || []) {
    const t = byId.get(r);
    if (!t) E(`${w} replies -> missing ${r}`); else if (t.kind === 'hear') E(`${w} replies -> ${r} is also a hear item`);
  }
  for (const r of it.replyTo || []) {
    const t = byId.get(r);
    if (!t) E(`${w} replyTo -> missing ${r}`); else if (t.kind !== 'hear') E(`${w} replyTo -> ${r} is not a hear item`);
  }
  if (it.kind !== 'hear' && it.replies?.length) E(`${w} replies on a non-hear item`);
  if (it.src === 'new' && it.kind === 'hear' && !(it.replies?.length) && !/no reply|nod|just listen|smile/i.test(it.note || '')) W(`${w} new hear item without replies and without a "no reply" note`);
}

// All 271 v1 items are present and their Japanese is unchanged.
for (const o of v1.items) {
  const it = byId.get(o.id);
  if (!it) { E(`v1 id ${o.id} is not placed in any lesson`); continue; }
  for (const f of ['ja', 'kana', 'romaji', 'ruby', 'kind']) if (it[f] !== o[f]) E(`[${o.id}] field ${f} changed from v1`);
  if (o.note && !it.note) W(`[${o.id}] v1 item had a note; the EN version has none`);
}

// Lessons
for (const l of data.lessons) {
  if (!/^U\d\d-L\d\d$/.test(l.code)) E(`lesson ${l.code}: bad code`);
  if (l.count < 10 || l.count > 15) E(`lesson ${l.code}: ${l.count} items (must be 10-15)`);
  if (l.ids.some((id) => byId.get(id)?.lesson !== l.code)) E(`lesson ${l.code}: ids out of sync`);
  const seen = new Set();
  for (const id of l.ids) { const ja = byId.get(id).ja; if (seen.has(ja)) W(`lesson ${l.code}: repeated ja "${ja}"`); seen.add(ja); }
}

// No Cyrillic anywhere under curriculum/ (owner rule).
let cyrFiles = 0;
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (CYR.test(readFileSync(p, 'utf8'))) { cyrFiles++; E(`Cyrillic found in ${relative(root, p)}`); }
  }
})(cur);

const k = data.items.reduce((a, x) => ((a[x.kind] = (a[x.kind] || 0) + 1), a), {});
console.log(`items ${data.items.length} ${JSON.stringify(k)}; lessons ${data.lessons.length}; files with Cyrillic ${cyrFiles}; errors ${errors.length}; warnings ${warnings.length}`);
for (const m of errors) console.log('ERROR', m);
for (const m of warnings) console.log('warn ', m);
process.exit(errors.length ? 1 : 0);
