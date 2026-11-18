// Validates curriculum/src/kanji-extra.mjs against app/data/kanji.json (read-only).
// Run: node curriculum/tools/validate-kanji-extra.mjs   (exit code 1 on errors)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rubyToJa, rubyToKana, kanjiWithoutReading, romajiMatches, suggestRomaji } from './lib.mjs';

const cur = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(cur, '..');
const srcPath = join(cur, 'src', 'kanji-extra.mjs');
const { KANJI_EXTRA, GROUPS_EXTRA } = await import(pathToFileURL(srcPath).href);
const base = JSON.parse(readFileSync(join(root, 'app', 'data', 'kanji.json'), 'utf8'));

const errors = [];
const E = (m) => errors.push(m);
const FIELDS = ['id', 'group', 'ja', 'ruby', 'kana', 'romaji', 'en', 'note'];
const KANA_ONLY = /^[぀-ゟ゠-ヿ〇、。・？！ 　ー〜～]+$/u;
const ROMAJI_OK = /^[A-Za-zāīūēōĀĪŪĒŌ'’ \-,.?!〇]+$/u;
const CYR = new RegExp('[\\u0400-\\u04FF]');

const groups = new Set([...base.groups.map((g) => g.id), ...GROUPS_EXTRA.map((g) => g.id)]);
const baseIds = new Set(base.items.map((i) => i.id));
const baseJa = new Map(base.items.map((i) => [i.ja, i.id]));
const ids = new Set(), jas = new Map();

for (const it of KANJI_EXTRA) {
  const w = `[${it.id}]`;
  const keys = Object.keys(it);
  const expected = FIELDS.filter((f) => f !== 'note' || 'note' in it);
  if (keys.join() !== expected.join()) E(`${w} fields ${keys.join()} != ${expected.join()}`);
  if (!/^k\.[a-z0-9\-]+$/.test(it.id)) E(`${w} bad id`);
  if (ids.has(it.id)) E(`${w} duplicate id in extra`); ids.add(it.id);
  if (baseIds.has(it.id)) E(`${w} id already exists in kanji.json`);
  for (const f of ['group', 'ja', 'ruby', 'kana', 'romaji', 'en']) if (!it[f]) E(`${w} missing ${f}`);
  if (!groups.has(it.group)) E(`${w} unknown group ${it.group}`);
  if (rubyToJa(it.ruby) !== it.ja) E(`${w} ruby->ja mismatch`);
  if (rubyToKana(it.ruby) !== it.kana) E(`${w} ruby->kana mismatch`);
  if (kanjiWithoutReading(it.ruby)) E(`${w} kanji without reading: ${it.ruby}`);
  if (!KANA_ONLY.test(it.kana)) E(`${w} kana field contains non-kana: ${it.kana}`);
  if (!ROMAJI_OK.test(it.romaji)) E(`${w} invalid romaji characters: ${it.romaji}`);
  else if (!romajiMatches(it.romaji, it.kana)) E(`${w} romaji "${it.romaji}" does not match kana "${it.kana}" (expected roughly: ${suggestRomaji(it.kana)})`);
  if (baseJa.has(it.ja)) E(`${w} same ja as existing ${baseJa.get(it.ja)}: ${it.ja}`);
  if (jas.has(it.ja)) E(`${w} same ja as ${jas.get(it.ja)} in extra: ${it.ja}`); jas.set(it.ja, it.id);
  for (const f of ['en', 'note']) if (it[f] && CYR.test(it[f])) E(`${w} Cyrillic in ${f}`);
}
if (CYR.test(readFileSync(srcPath, 'utf8'))) E('Cyrillic found in kanji-extra.mjs');

const count = (arr) => arr.reduce((a, i) => ((a[i.group] = (a[i.group] || 0) + 1), a), {});
const before = count(base.items), added = count(KANJI_EXTRA);
console.log('group      existing  new  total');
for (const g of groups) console.log(`${g.padEnd(10)} ${String(before[g] || 0).padStart(8)} ${String(added[g] || 0).padStart(4)} ${String((before[g] || 0) + (added[g] || 0)).padStart(6)}`);
console.log(`new items ${KANJI_EXTRA.length}; errors ${errors.length}`);
for (const m of errors) console.log('ERROR', m);
process.exit(errors.length ? 1 : 0);
