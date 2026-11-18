// Validates the built dictionary files.
// Usage: node dictionary/tools/validate-dict.mjs        (exit code 1 on any error)
// Checks: schema/fields present and typed, unique ids, rank 1..N contiguous, core flag consistent,
// core+rest == full, romaji re-derived from kana (same converter as the build) and accepted by the
// app's romajiMatchesKana, romaji alphabet, no Cyrillic anywhere under dictionary/ (text files),
// size budgets.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entryRomaji } from './romaji.mjs';
import { romajiMatchesKana } from '../../app/modules/text.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'out');
const errors = [];
const warn = [];
const err = (m) => { if (errors.length < 200) errors.push(m); else if (errors.length === 200) errors.push('... more errors'); };

const load = (name) => JSON.parse(readFileSync(join(OUT, name), 'utf8'));
const full = load('dict.json'), core = load('dict-core.json'), rest = load('dict-rest.json');
const FIELDS = ['id', 'ja', 'kana', 'romaji', 'en', 'pos', 'topic', 'rank', 'core', 'alt'];
for (const [n, d] of [['dict.json', full], ['dict-core.json', core], ['dict-rest.json', rest]]) {
  if (JSON.stringify(d.fields) !== JSON.stringify(FIELDS)) err(`${n}: unexpected fields ${d.fields}`);
  if (d.count !== d.rows.length) err(`${n}: count ${d.count} != rows ${d.rows.length}`);
  if (!(d.attribution || '').includes('https://www.edrdg.org/edrdg/licence.html') || !/JMdict/.test(d.attribution) || d.license !== 'CC BY-SA 4.0') err(`${n}: attribution/licence missing`);
}
const F = Object.fromEntries(FIELDS.map((f, i) => [f, i]));

// core + rest must equal full, in order
const joined = [...core.rows, ...rest.rows];
if (joined.length !== full.rows.length || joined.some((r, i) => JSON.stringify(r) !== JSON.stringify(full.rows[i]))) err('core+rest rows != full rows');

const KANA_ONLY = /^[ぁ-ゖゝゞァ-ヺーヽヾ・ー]+$/;
const ROMAJI = /^[a-zāīūēō'\- ]+$/;
const TOPICS = new Set(['drink', 'food', 'money', 'shop', 'transport', 'place', 'hotel', 'health', 'body', 'time', 'number', 'people',
  'weather', 'nature', 'sight', 'tech', 'clothes', 'phrase', 'grammar', 'leisure', 'general', 'society']);
// The app check reads a lone "wa"/"e" token as the particle は/へ; a dictionary headword is a single
// token, so append a neutral marker, and map a final particle reading wa/e back to the kana letter.
function appMatches(romaji, kana) {
  let r = romaji;
  if (kana.endsWith('は') && r.endsWith('wa')) r = r.slice(0, -2) + 'ha';
  if (kana === 'へ' && r === 'e') r = 'he';
  return romajiMatchesKana(r + 'x', kana + 'x');
}
const ids = new Set();
let romajiFixups = 0;
full.rows.forEach((r, i) => {
  const at = `row ${i + 1} (id ${r[F.id]})`;
  if (r.length !== FIELDS.length) return err(`${at}: ${r.length} fields`);
  const [id, ja, kana, romaji, en, pos, topic, rank, isCore, alt] = r;
  if (!Number.isInteger(id) || id <= 0) err(`${at}: bad id`);
  if (ids.has(id)) err(`${at}: duplicate id`); ids.add(id);
  for (const [k, v] of [['ja', ja], ['kana', kana], ['romaji', romaji], ['en', en], ['pos', pos], ['topic', topic]]) {
    if (typeof v !== 'string' || !v.trim()) err(`${at}: empty ${k}`);
  }
  if (typeof alt !== 'string') err(`${at}: alt not a string`);
  if (!KANA_ONLY.test(kana)) err(`${at}: reading is not pure kana: ${kana}`);
  if (!ROMAJI.test(romaji)) err(`${at}: romaji alphabet: ${romaji}`);
  if (!appMatches(romaji, kana)) err(`${at}: romaji ${romaji} does not match kana ${kana} (app check)`);
  // re-derive: plain converter result, or the word-level fixes in romaji.mjs (particles, verb-final u)
  const plain = entryRomaji(kana, []);
  if (romaji !== plain) {
    romajiFixups++;
    const ok = [entryRomaji(kana, ['prt']), entryRomaji(kana, ['v5u']), entryRomaji(kana, ['exp'])].includes(romaji);
    if (!ok) err(`${at}: romaji ${romaji} not derivable from kana ${kana}`);
  }
  if (rank !== i + 1) err(`${at}: rank ${rank} != position ${i + 1}`);
  if (isCore !== (rank <= full.coreSize ? 1 : 0)) err(`${at}: core flag inconsistent`);
  if (!TOPICS.has(topic)) err(`${at}: unknown topic ${topic}`);
  if (en.length > 200) err(`${at}: gloss text too long (${en.length})`);
});
if (core.rows.length !== full.coreSize) err(`core tier has ${core.rows.length} rows, expected ${full.coreSize}`);

// no Cyrillic anywhere under dictionary/ (except downloads, which are not tracked)
const CYR = new RegExp(`[${String.fromCharCode(0x400)}-${String.fromCharCode(0x4ff)}]`); // built from code points so this file stays ASCII
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (['dl', 'build', 'node_modules'].includes(f)) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
for (const f of walk(ROOT)) {
  if (['.png', '.jpg', '.gz', '.zip', '.tgz'].includes(extname(f))) continue;
  const t = readFileSync(f, 'utf8');
  if (CYR.test(t)) err(`Cyrillic in ${relative(ROOT, f)}`);
}

// sizes
const sizes = {};
for (const n of ['dict-core.json', 'dict-rest.json', 'dict.json']) {
  const b = readFileSync(join(OUT, n));
  sizes[n] = { raw: b.length, gzip: gzipSync(b, { level: 9 }).length };
}
if (sizes['dict-core.json'].raw > 600_000) err(`dict-core.json ${sizes['dict-core.json'].raw} B > 600 KB budget`);
if (sizes['dict.json'].raw > 4_000_000) err(`dict.json ${sizes['dict.json'].raw} B > 4 MB budget`);
if (sizes['dict.json'].gzip > 1_500_000) err(`dict.json gzip ${sizes['dict.json'].gzip} B > 1.5 MB budget`);

console.log(JSON.stringify({ entries: full.rows.length, core: core.rows.length, romajiWordLevelFixes: romajiFixups, sizes }, null, 1));
for (const w of warn) console.log('warn:', w);
if (errors.length) { for (const e of errors) console.log('ERROR', e); console.log(`FAILED: ${errors.length} error(s)`); process.exit(1); }
console.log('OK: dictionary valid');
