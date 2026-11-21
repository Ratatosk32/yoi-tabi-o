import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { readWordfreq } from './wordfreq.mjs';

const [cedictPath, freqPath, hskPath, outDir, appDir] = process.argv.slice(2);
if (!cedictPath || !freqPath || !hskPath || !outDir) {
  console.error('usage: node build-dict.mjs <cedict.txt.gz> <large_zh.msgpack.gz> <hsk complete.json> <outDir> [appDir]');
  process.exit(2);
}

const TOTAL = 16000;
const CORE = 4000;
const MAX_GLOSSES = 3;
const MAX_READINGS = 2;
const DROP_ENTRY = /\((vulgar|derog|offensive|coarse|obscene|pejorative)/i;
const DROP_SENSE = [/^\(slang\)/i, /^surname\b/i, /^(old |archaic |erroneous )?variant of\b/i, /^see\b/i, /^used in\b/i, /^(old )?name for\b/i, /^Japanese variant\b/i, /^CL:/, /^also (pr|written)\./i];
const HAN = /[\u3400-\u9fff]/;

function fnv1a31(s) {
  let h = 0x811c9dc5;
  for (const ch of Buffer.from(s, 'utf8')) { h ^= ch; h = Math.imul(h, 0x01000193) >>> 0; }
  return h & 0x7fffffff;
}

const MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
function markSyllable(raw) {
  const m = /^([A-Za-zü:]+?)([1-5])?$/.exec(raw);
  if (!m) return null;
  let syl = m[1].replace(/u:/g, 'ü').replace(/U:/g, 'Ü').replace(/v/g, 'ü');
  const tone = Number(m[2] || 5);
  if (!/[aeiouü]/i.test(syl)) return tone === 5 ? syl : null;
  if (tone === 5) return syl;
  const low = syl.toLowerCase();
  let idx = low.search(/[ae]/);
  if (idx < 0) idx = low.indexOf('ou');
  if (idx < 0) { for (let i = low.length - 1; i >= 0; i--) if ('aeiouü'.includes(low[i])) { idx = i; break; } }
  const v = low[idx];
  let mark = MARKS[v][tone - 1];
  if (syl[idx] !== v) mark = mark.toUpperCase();
  return syl.slice(0, idx) + mark + syl.slice(idx + 1);
}
function toneless(raw) {
  return raw.replace(/[1-5]$/, '').replace(/u:/gi, 'v').toLowerCase();
}

function parsePinyin(p) {
  const parts = p.trim().split(/\s+/);
  const marked = [];
  const plain = [];
  for (const part of parts) {
    if (/^[,·\-]$/.test(part)) continue;
    const mk = markSyllable(part);
    if (mk === null) return null;
    marked.push(mk);
    plain.push(toneless(part));
  }
  if (!marked.length) return null;
  const romaji = marked.map((s, i) => (i > 0 && /^[aeoāáǎàēéěèōóǒò]/i.test(s) ? "'" + s : s)).join('');
  return { romaji, kana: plain.join(' ') };
}

const lines = gunzipSync(readFileSync(cedictPath)).toString('utf8').split('\n');
const cedictDate = (lines.find((l) => l.startsWith('#! date=')) || '').slice(8).trim() || 'unknown date';
const LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/;
const byWord = new Map();
let parsed = 0;
let dropped = { register: 0, empty: 0, reading: 0, noHan: 0 };
for (const line of lines) {
  if (!line || line.startsWith('#')) continue;
  const m = LINE.exec(line);
  if (!m) continue;
  parsed++;
  const [, trad, simp, pin, glossStr] = m;
  if (!HAN.test(simp)) { dropped.noHan++; continue; }
  const glosses = glossStr.split('/').map((g) => g.trim()).filter(Boolean);
  if (glosses.some((g) => DROP_ENTRY.test(g))) { dropped.register++; continue; }
  const isClassifier = glosses.length > 0 && glosses.every((g) => /^classifier for\b/i.test(g) || /^CL:/.test(g));
  const kept = glosses.filter((g) => !DROP_SENSE.some((re) => re.test(g)))
    .map((g) => g.replace(/\s*\|[^\s|\]]+/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean);
  if (!kept.length) { dropped.empty++; continue; }
  const rd = parsePinyin(pin);
  if (!rd) { dropped.reading++; continue; }
  const isName = /^[A-Z]/.test(pin.trim());
  const entry = {
    key: `${trad} ${simp} [${pin}]`, simp, trad, romaji: rd.romaji, kana: rd.kana, pinNum: pin.trim(),
    en: kept.slice(0, MAX_GLOSSES).join('; '), pos: isName ? 'name' : isClassifier ? 'ctr' : /^abbr\./i.test(kept[0]) ? 'abbr' : '',
    senses: kept.length, isName,
  };
  if (!byWord.has(simp)) byWord.set(simp, []);
  byWord.get(simp).push(entry);
}

const { zipf } = readWordfreq(freqPath);
const hskList = JSON.parse(readFileSync(hskPath, 'utf8'));
const hsk = new Map();
for (const w of hskList) {
  const lv = w.level.map((l) => /^new-(\d)$/.exec(l)).filter(Boolean).map((m) => Number(m[1]));
  const lvNewest = w.level.map((l) => /^newest-(\d)$/.exec(l)).filter(Boolean).map((m) => Number(m[1]));
  const lvOld = w.level.map((l) => /^old-(\d)$/.exec(l)).filter(Boolean).map((m) => Number(m[1]));
  const level = lv.length ? Math.min(...lv) : lvNewest.length ? Math.min(...lvNewest) : lvOld.length ? Math.min(...lvOld) : 0;
  const numeric = (w.forms || []).map((f) => (f.transcriptions?.numeric || '').toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean);
  const prev = hsk.get(w.simplified);
  if (!prev || (level && level < prev.level)) hsk.set(w.simplified, { level, numeric });
}

function hskBoost(level) {
  if (!level) return 0;
  if (level <= 3) return 1.5;
  if (level <= 5) return 0.8;
  if (level === 6) return 0.4;
  return 0.2;
}

const candidates = [];
for (const [simp, entries] of byWord) {
  const h = hsk.get(simp);
  const z = zipf.get(simp) || 0;
  if (!h && z < 2.5) continue;
  const norm = (p) => p.toLowerCase().replace(/u:/g, 'v').replace(/\s+/g, ' ').trim();
  const scored = entries.map((e) => ({
    e,
    s: (h && h.numeric.includes(norm(e.pinNum)) ? 100 : 0) + (e.isName ? -50 : 0) + e.senses,
  })).sort((a, b) => b.s - a.s);
  const best = scored[0].e;
  if (best.isName && !h && z < 4) continue;
  const readings = [best];
  for (const { e } of scored.slice(1)) {
    if (readings.length >= MAX_READINGS) break;
    if (e.isName || e.romaji === best.romaji) continue;
    if (e.pos === 'ctr' || e.senses >= 1) readings.push(e);
  }
  const score = z + hskBoost(h?.level || 0);
  readings.forEach((e, i) => candidates.push({ e, score: score - i * 0.01, hsk: h?.level || 0, others: readings.filter((o) => o !== e).map((o) => o.romaji) }));
}

candidates.sort((a, b) => b.score - a.score || a.e.simp.length - b.e.simp.length || (a.e.simp < b.e.simp ? -1 : 1));
const picked = candidates.slice(0, TOTAL);
const ids = new Set();
const rows = [];
for (const [i, c] of picked.entries()) {
  let id = fnv1a31(c.e.key);
  while (ids.has(id)) id = (id + 1) & 0x7fffffff;
  ids.add(id);
  const alt = [c.e.trad !== c.e.simp ? c.e.trad : '', ...c.others].filter(Boolean).join(',');
  rows.push([id, c.e.simp, c.e.kana, c.e.romaji, c.e.en, c.e.pos, '', i + 1, i < CORE ? 1 : 0, alt, c.hsk]);
}

const fields = ['id', 'ja', 'kana', 'romaji', 'en', 'pos', 'topic', 'rank', 'core', 'alt', 'hsk'];
const source = `CC-CEDICT ${cedictDate} (MDBG); frequency: wordfreq large_zh (Robyn Speer, CC BY-SA 4.0); HSK 3.0 levels: complete-hsk-vocabulary (MIT)`;
const attribution = 'This app uses CC-CEDICT (https://cc-cedict.org/wiki/), maintained by MDBG (https://www.mdbg.net/chinese/dictionary?page=cc-cedict) and licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Word frequencies from wordfreq by Robyn Speer (data CC BY-SA 4.0). HSK levels from complete-hsk-vocabulary (MIT). The dictionary in this app is a selected, ranked and abridged version of CC-CEDICT and is available under CC BY-SA 4.0.';
const head = (part, count) => ({ format: 'japan-trip-dict/1', lang: 'zh', locale: 'zh-CN', script: 'Hans', part, fields, count, total: rows.length, coreSize: Math.min(CORE, rows.length), source, license: 'CC BY-SA 4.0', attribution });
const core = { ...head('core', Math.min(CORE, rows.length)), rows: rows.slice(0, CORE) };
const rest = { ...head('rest', Math.max(0, rows.length - CORE)), rows: rows.slice(CORE) };

for (const dir of [outDir, appDir].filter(Boolean)) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'dict-core.json'), JSON.stringify(core));
  writeFileSync(join(dir, 'dict-rest.json'), JSON.stringify(rest));
}
console.log(JSON.stringify({ parsed, words: byWord.size, candidates: candidates.length, rows: rows.length, core: core.rows.length, rest: rest.rows.length, withHsk: rows.filter((r) => r[10]).length, dropped }));
