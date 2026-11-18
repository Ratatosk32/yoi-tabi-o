// Применить машинные правки (формат review/fixes.json) к исходникам tools/content/*.src.mjs.
// Запуск: node tools/apply-fixes.mjs <fixes.json> [--dry]
// Запись исходника — однострочный массив [id, ruby, romaji, ru, note?, extra?]; правка поля проверяет old.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [, , fixesPath, flag] = process.argv;
if (!fixesPath) { console.error('usage: node tools/apply-fixes.mjs <fixes.json> [--dry]'); process.exit(2); }
const dry = flag === '--dry';
const fixes = JSON.parse(readFileSync(fixesPath, 'utf8'));

const FIELD = { ruby: 1, romaji: 2, ru: 3, note: 4 };
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
function serialize(arr) {
  const out = arr.map((v) => {
    if (v == null) return "''";
    if (typeof v === 'object') return '{ ' + Object.entries(v).map(([k, x]) => `${k}: ${q(x)}`).join(', ') + ' }';
    return q(v);
  });
  return '[' + out.join(', ') + ']';
}

const files = new Map();
const report = { applied: 0, skipped: [] };
for (const fx of fixes) {
  const path = join(ROOT, fx.file);
  if (!files.has(path)) files.set(path, readFileSync(path, 'utf8').split('\n'));
  const lines = files.get(path);
  const idx = lines.findIndex((l) => l.trimStart().startsWith(`[${q(fx.id)},`));
  if (idx < 0) { report.skipped.push(`${fx.id}: запись не найдена в ${fx.file}`); continue; }
  const line = lines[idx];
  const indent = line.match(/^\s*/)[0];
  const body = line.trim().replace(/,\s*$/, '');
  const arr = Function(`"use strict"; return (${body});`)();
  let cur;
  if (fx.field === 'tts') {
    cur = arr[5]?.tts ?? null;
    if (cur !== fx.old) { report.skipped.push(`${fx.id}.tts: ожидалось ${fx.old}, есть ${cur}`); continue; }
    while (arr.length < 5) arr.push('');
    arr[5] = { ...(arr[5] || {}), tts: fx.new };
  } else if (fx.field in FIELD) {
    const i = FIELD[fx.field];
    cur = arr[i] === undefined || arr[i] === '' ? null : arr[i];
    if (cur !== fx.old) { report.skipped.push(`${fx.id}.${fx.field}: ожидалось «${fx.old}», есть «${cur}»`); continue; }
    while (arr.length < i) arr.push('');
    arr[i] = fx.new;
  } else { report.skipped.push(`${fx.id}: неизвестное поле ${fx.field}`); continue; }
  lines[idx] = indent + serialize(arr) + ',';
  report.applied += 1;
}
if (!dry) for (const [p, lines] of files) writeFileSync(p, lines.join('\n'), 'utf8');
console.log(`Применено: ${report.applied}/${fixes.length}${dry ? ' (dry run)' : ''}`);
for (const s of report.skipped) console.log('ПРОПУЩЕНО', s);
