// Compare app/modules/numbers.js against the independent QA oracle (qa/oracle-numbers.mjs).
// Output: console summary + qa/out/numbers-compare.json (all disagreements, grouped).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as O from './oracle-numbers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..', 'app');
const N = await import(pathToFileURL(path.join(APP, 'modules', 'numbers.js')).href);

const out = { bugs: [], conventions: [], romajiFormat: [], ambiguity: [], errors: [], counts: {} };
let checks = 0;

function cmp(kind, input, app, ora) {
  checks++;
  if (!app || typeof app.kana !== 'string') { out.errors.push({ kind, input, app }); return; }
  const kanaOk = app.kana === ora.kana;
  const kanaAlt = !kanaOk && (ora.alts || []).includes(app.kana);
  const rOk = O.normRomaji(app.romaji) === O.normRomaji(ora.romaji);
  const rec = { kind, input, app: { kana: app.kana, romaji: app.romaji }, oracle: { kana: ora.kana, romaji: ora.romaji, alts: ora.alts } };
  if (!kanaOk && !kanaAlt) { out.bugs.push(rec); return; }
  if (kanaAlt) { out.conventions.push(rec); return; }
  if (!rOk) { out.bugs.push({ ...rec, note: 'kana equal, romaji differs' }); return; }
  if (app.romaji !== ora.romaji) out.romajiFormat.push(rec);
  const amb = O.romajiAmbiguity(app.romaji, app.kana);
  if (amb.length) out.ambiguity.push({ ...rec, positions: amb });
}
const safe = (f) => { try { return f(); } catch (e) { return { error: String(e) }; } };

// 1. control set from PLAN.md phase 2
const CONTROL = [300, 600, 800, 3000, 8000, 10000, 128000, 250000];
const control = CONTROL.map((n) => {
  const a = N.yenReading(n), o = O.readYen(n);
  cmp('control-yen', n, a, o);
  return { n, app: a.kana, appRomaji: a.romaji, oracle: o.kana, oracleRomaji: o.romaji, ok: a.kana === o.kana && O.normRomaji(a.romaji) === O.normRomaji(o.romaji) };
});

// 2. every integer 1..10000 (plain + yen)
for (let n = 1; n <= 10000; n++) { cmp('int', n, safe(() => N.numberReading(n)), O.readInt(n)); cmp('yen', n, safe(() => N.yenReading(n)), O.readYen(n)); }
// 3. random 20000 up to 250000 (seeded LCG for reproducibility)
let seed = 20261118; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
for (let i = 0; i < 20000; i++) { const n = 1 + Math.floor(rnd() * 250000); cmp('rand-int', n, safe(() => N.numberReading(n)), O.readInt(n)); cmp('rand-yen', n, safe(() => N.yenReading(n)), O.readYen(n)); }
// 4. edge cases
const EDGE = [0, 4, 14, 104, 1004, 10004, 10000, 10001, 10010, 11000, 100000, 1000000, 10000000, 11000000, 12345678, 19999999, 99999999, 20000000, 30000000, 80000000, 1000004, 3000000, 6000000, 8000000];
for (const n of EDGE) { cmp('edge-int', n, safe(() => N.numberReading(n)), O.readInt(n)); cmp('edge-yen', n, safe(() => N.yenReading(n)), O.readYen(n)); }
const rangeErrors = [];
for (const bad of [-1, 100000000, 1.5, NaN, '300']) {
  try { const r = N.numberReading(bad); rangeErrors.push({ input: String(bad), result: r, threw: false }); }
  catch (e) { rangeErrors.push({ input: String(bad), threw: true, msg: String(e.message) }); }
}
// 5. times
for (let h = 0; h <= 24; h++) for (let m = 0; m < 60; m++) {
  cmp('time', `${h}:${String(m).padStart(2, '0')}`, safe(() => N.timeReading(h, m)), O.readTime(h, m));
}
for (let m = 1; m < 60; m++) cmp('minute', m, safe(() => N.minuteReading(m)), O.readMinutes(m));
// 6. dates
const DIM = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
for (let mo = 1; mo <= 12; mo++) for (let d = 1; d <= DIM[mo]; d++) {
  const o = O.readMonth(mo), dd = O.readDay(d);
  cmp('date', `${mo}/${d}`, safe(() => N.dateReading(mo, d)), { kana: o.kana + dd.kana, romaji: o.romaji + ' ' + dd.romaji, alts: dd.alts.map((a) => o.kana + a) });
}
const invalidDates = [];
for (const [mo, d] of [[2, 30], [2, 31], [4, 31], [13, 1], [0, 1], [1, 0], [1, 32]]) {
  try { const r = N.dateReading(mo, d); invalidDates.push({ in: `${mo}/${d}`, accepted: r.kana }); } catch { invalidDates.push({ in: `${mo}/${d}`, threw: true }); }
}
// 7. counters
const CKEY = { tsu: 'つ', nin: '人', mai: '枚', hon: '本', ko: '個' };
for (const [key, c] of Object.entries(CKEY)) for (let n = 1; n <= 10; n++) cmp('counter-' + c, n, safe(() => N.counterReading(key, n)), O.readCounter(n, c));
const counterKeysInApp = Object.keys(N.COUNTERS || {});
// 8. yenMixed consistency: parse "12万8千円"/"12万5,500円" back to a number
const parseMixed = (s) => { const m = /^(?:(\d+)万)?(?:(\d+)千|([\d,]+))?円$/.exec(s); if (!m) return NaN; return (+m[1] || 0) * 10000 + (m[2] ? +m[2] * 1000 : m[3] ? +m[3].replace(/,/g, '') : 0); };
const mixedBad = [];
for (let n = 1; n <= 250000; n += (n < 20000 ? 1 : 7)) { const s = N.yenMixed(n); if (parseMixed(s) !== n) mixedBad.push({ n, s }); }
const mixedSamples = [300, 1000, 1500, 10000, 10500, 12800, 128000, 125500, 250000, 100000, 1000000].map((n) => [n, N.yenMixed(n)]);
// 9. parseDigits
const PD = [['12800', 12800], ['12,800', 12800], ['12 800', 12800], ['１２８００', 12800], ['¥12,800', 12800], ['12800円', 12800], [' 300 ', 300],
  ['12 800 ', 12800], ['', NaN], ['abc', NaN], ['12万8千', 128000], ['12.800', 12800], ['0300', 300], ['12 800', 12800], ['12 800', 12800], ['-300', NaN]];
const parse = PD.map(([s, exp]) => { const got = N.parseDigits(s); return { in: JSON.stringify(s), exp, got, ok: Object.is(got, exp) || (Number.isNaN(got) && Number.isNaN(exp)) }; });
// 10. generators
const genBad = [];
for (const key of Object.keys(N.PRICE_RANGES)) {
  const r = N.PRICE_RANGES[key];
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < 20000; i++) { const p = N.randomPrice(key); mn = Math.min(mn, p); mx = Math.max(mx, p); if (p < r.min || p > r.max || (p - r.min) % r.step) genBad.push({ key, p }); }
  out.counts['range-' + key] = { min: mn, max: mx };
}
for (const edge of [0, 0.999999999]) for (const key of Object.keys(N.PRICE_RANGES)) { const p = N.randomPrice(key, () => edge); const r = N.PRICE_RANGES[key]; if (p < r.min || p > r.max) genBad.push({ key, edge, p }); }
const timeBad = [];
for (let i = 0; i < 5000; i++) { const t = N.randomTime(); if (t.h < 1 || t.h > 23 || t.m < 0 || t.m > 59) timeBad.push(t); try { N.timeReading(t.h, t.m); } catch (e) { timeBad.push({ ...t, err: String(e) }); } }

// ---- summary ----
const group = (arr) => { const g = {}; for (const r of arr) (g[r.kind] ??= []).push(r); return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { n: v.length, samples: v.slice(0, 12) }])); };
const summary = {
  checks, control, rangeErrors, invalidDates, counterKeysInApp, mixedBadCount: mixedBad.length, mixedBad: mixedBad.slice(0, 10), mixedSamples,
  parse, genBad: genBad.slice(0, 10), genBadCount: genBad.length, timeBad: timeBad.slice(0, 5),
  bugs: group(out.bugs), conventions: group(out.conventions), romajiFormat: group(out.romajiFormat), ambiguity: group(out.ambiguity), errors: out.errors.slice(0, 10), counts: out.counts,
};
fs.mkdirSync(path.join(here, 'out'), { recursive: true });
fs.writeFileSync(path.join(here, 'out', 'numbers-compare.json'), JSON.stringify(summary, null, 1));
console.log(`checks=${checks} bugs=${out.bugs.length} conventions=${out.conventions.length} romajiFormat=${out.romajiFormat.length} ambiguity=${out.ambiguity.length} errors=${out.errors.length}`);
console.log('control:', control.map((c) => `${c.n}:${c.ok ? 'OK' : 'FAIL'}`).join(' '));
for (const [k, v] of Object.entries(summary.bugs)) console.log('BUG', k, v.n, JSON.stringify(v.samples.slice(0, 4)));
for (const [k, v] of Object.entries(summary.conventions)) console.log('CONV', k, v.n, JSON.stringify(v.samples.slice(0, 3).map((s) => [s.input, s.app.kana, s.oracle.kana])));
for (const [k, v] of Object.entries(summary.romajiFormat)) console.log('RFMT', k, v.n, JSON.stringify(v.samples.slice(0, 3).map((s) => [s.input, s.app.romaji, s.oracle.romaji])));
for (const [k, v] of Object.entries(summary.ambiguity)) console.log('AMBIG', k, v.n, JSON.stringify(v.samples.slice(0, 4).map((s) => [s.input, s.app.romaji])));
console.log('errors', JSON.stringify(summary.errors.slice(0, 3)));
console.log('rangeErrors', JSON.stringify(rangeErrors));
console.log('invalidDates', JSON.stringify(invalidDates));
console.log('yenMixed bad', mixedBad.length, JSON.stringify(mixedBad.slice(0, 5)), 'samples', JSON.stringify(mixedSamples));
console.log('parseDigits fails', JSON.stringify(parse.filter((p) => !p.ok)));
console.log('gen bad', genBad.length, JSON.stringify(genBad.slice(0, 3)), JSON.stringify(out.counts), 'timeBad', timeBad.length);
