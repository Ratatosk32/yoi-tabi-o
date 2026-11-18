// Builds the offline learner dictionary from JMdict (EDRDG, CC BY-SA 4.0).
// Usage: node dictionary/tools/build-dict.mjs <jmdict-eng-common-*.json> <JMdict_e.gz> [--full <jmdict-eng-*.json>] [--core 4000]
//   --full is needed only for the ids listed under "add" in tools/overrides.json.
// Output: dictionary/out/dict-core.json, dict-rest.json, dict.json (+ review files in dictionary/build/, gitignored)
// Inputs are untrusted data: they are only parsed (JSON.parse / regex), never executed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPriority } from './jmdict-priority.mjs';
import { entryRomaji } from './romaji.mjs';
import { topicOf, scoreEntry } from './topics.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'out');
const DBG = join(HERE, '..', 'build'); // gitignored review files
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const fullPath = opt('--full');
const [jsonPath, xmlPath] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const coreN = +(opt('--core') || 0) || 4000;
if (!jsonPath || !xmlPath) {
  console.error('usage: node build-dict.mjs <jmdict-eng-common.json> <JMdict_e.gz> [--core N]');
  process.exit(2);
}

// Senses carrying only these tags are not useful to a learner and are skipped; an entry with no
// remaining sense is dropped.
const DROP_MISC = new Set(['arch', 'obs', 'rare', 'obsc', 'vulg', 'X']);
const BAD_K = new Set(['sK', 'rK', 'oK', 'iK']);
const BAD_R = new Set(['sk', 'rk', 'ok', 'ik']);
const KANA_RE = /[ぁ-ゖァ-ヺ]/;

// Short part-of-speech labels (first sense; "vs" appended when the noun takes する).
function shortPos(posList) {
  const out = [];
  const push = (x) => { if (x && !out.includes(x)) out.push(x); };
  for (const p of posList) {
    if (p.startsWith('v5') || p.startsWith('v4')) push('v5');
    else if (p === 'v1' || p === 'v1-s') push('v1');
    else if (p === 'vk') push('vk');
    else if (p === 'vs-i' || p === 'vs-s' || p === 'vz') push('vs');
    else if (p === 'adj-i' || p === 'adj-ix') push('adj-i');
    else if (p === 'adj-na') push('adj-na');
    else if (p === 'adj-no' || p === 'adj-pn' || p === 'adj-t' || p === 'adj-f') push('adj');
    else if (p === 'adv' || p === 'adv-to') push('adv');
    else if (p === 'n' || p === 'n-adv' || p === 'n-t') push('n');
    else if (p === 'pn') push('pron');
    else if (p === 'prt') push('prt');
    else if (p === 'conj') push('conj');
    else if (p === 'int') push('int');
    else if (p === 'exp') push('exp');
    else if (p === 'ctr') push('ctr');
    else if (p === 'num') push('num');
    else if (p === 'pref' || p === 'n-pref') push('pref');
    else if (p === 'suf' || p === 'n-suf') push('suf');
    else if (p.startsWith('aux') || p === 'cop') push('aux');
  }
  const vsNoun = posList.includes('vs');
  const main = out.filter((x) => x !== 'vs').slice(0, 2);
  if (vsNoun || out.includes('vs')) main.push('vs');
  return main.slice(0, 3).join(',') || 'unc';
}

const applies = (list, text) => list.includes('*') || list.includes(text);
const fullwidthAscii = (s) => s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

const src = JSON.parse(readFileSync(jsonPath, 'utf8'));
const pri = readPriority(xmlPath);
const dropped = { noSense: [], noKana: [] };
const overrides = JSON.parse(readFileSync(join(HERE, 'overrides.json'), 'utf8'));

/** One JMdict word (jmdict-simplified shape) -> dictionary entry, or null when dropped. */
function convert(w) {
  // senses that survive the junk filter
  const kept = w.sense.filter((s) => !s.misc.some((m) => DROP_MISC.has(m)));
  if (!kept.length) { dropped.noSense.push(w.id); return null; }

  // --- written form ---
  const first = kept[0];
  const uk = first.misc.includes('uk');
  const goodK = w.kanji.filter((k) => !k.tags.some((t) => BAD_K.has(t)));
  const commonK = goodK.filter((k) => k.common);
  let kanji = null;
  if (!uk && commonK.length) kanji = commonK[0];
  else if (!uk && goodK.length && !w.kana.some((r) => r.common && !r.tags.some((t) => BAD_R.has(t)))) kanji = goodK[0];
  // if the first sense is restricted to a kanji form, honour it
  if (kanji && !applies(first.appliesToKanji, kanji.text)) {
    const k2 = goodK.find((k) => applies(first.appliesToKanji, k.text));
    if (k2) kanji = k2;
  }

  // --- reading ---
  const okR = w.kana.filter((r) => !r.tags.some((t) => BAD_R.has(t)) && (!kanji || r.appliesToKanji.includes('*') || r.appliesToKanji.includes(kanji.text)));
  const reading = (okR.find((r) => r.common) || okR[0] || w.kana[0]).text;
  if (!KANA_RE.test(reading)) { dropped.noKana.push(w.id); return null; }
  const ja = fullwidthAscii(kanji ? kanji.text : reading);

  // senses applicable to the chosen form
  const senses = kept
    .filter((s) => (!kanji || applies(s.appliesToKanji, kanji.text)) && applies(s.appliesToKana, reading))
    .map((s) => ({ pos: s.partOfSpeech, field: s.field, misc: s.misc, gloss: s.gloss.filter((g) => g.lang === 'eng').map((g) => g.text) }))
    .filter((s) => s.gloss.length);
  if (!senses.length) { dropped.noSense.push(w.id); return null; }

  // --- glosses: up to 3 from the first two senses ---
  const MARKED = ['sl', 'net-sl', 'derog', 'vulg', 'joc', 'hist', 'dated', 'sens', 'col', 'poet', 'id', 'yoji'];
  const s2ok = senses[1] && !senses[1].misc.some((m) => MARKED.includes(m));
  const s1 = senses[0].gloss, s2 = s2ok ? senses[1].gloss : [];
  const short = (g) => g.length <= 48;
  let gl = s2.length ? s1.slice(0, s1.length >= 3 ? 2 : s1.length) : s1.slice(0, 3);
  gl = [gl[0], ...gl.slice(1).filter(short)];
  for (const g of s2) { if (gl.length >= 3) break; if (short(g) && !gl.includes(g)) gl.push(g); if (gl.length >= 2 && s1.length >= 2) break; }
  const en = gl.slice(0, 3).join('; ');

  // --- alternative forms (searchable, not displayed as headword) ---
  const alt = [];
  for (const k of goodK) { const t = fullwidthAscii(k.text); if (t !== ja && !alt.includes(t)) alt.push(t); }
  for (const r of w.kana) if (r.common && !r.tags.some((t) => BAD_R.has(t)) && r.text !== reading && r.text !== ja && !alt.includes(r.text)) alt.push(r.text);

  // --- priority tags (entry level) ---
  const p = pri.get(w.id);
  const tags = new Set();
  if (p) for (const m of [p.k, p.r]) for (const v of m.values()) for (const t of v) tags.add(t);

  const allPos = [...new Set(senses.flatMap((s) => s.pos))];
  const topic = topicOf(senses);
  const { score, parts } = scoreEntry({ pri: tags, senses, topic, ja, kana: reading });
  return {
    id: +w.id, ja, kana: reading, romaji: entryRomaji(reading, senses[0].pos.concat(allPos.includes('prt') ? ['prt'] : [])),
    en, pos: shortPos(senses[0].pos.concat(senses[0].pos.includes('vs') ? [] : allPos.filter((x) => x === 'vs'))),
    topic, alt: alt.slice(0, 4).join(','), score, parts, pri: [...tags].sort().join(' '),
  };
}

const entries = src.words.map(convert).filter(Boolean);

// --- manual overrides (tools/overrides.json) ---
const have = new Set(entries.map((e) => e.id));
const addIds = new Set(overrides.add.map(Number).filter((id) => !have.has(id)));
if (addIds.size) {
  if (!fullPath) { console.error('overrides.add needs --full <jmdict-eng-*.json>'); process.exit(2); }
  const full = JSON.parse(readFileSync(fullPath, 'utf8'));
  for (const w of full.words) {
    if (!addIds.has(+w.id)) continue;
    const e = convert(w);
    if (e) { e.added = true; entries.push(e); addIds.delete(+w.id); }
  }
  if (addIds.size) console.warn('overrides.add ids not found:', [...addIds].join(' '));
}
for (const [id, why] of Object.entries(overrides.demote)) {
  const e = entries.find((x) => x.id === +id);
  if (e) { e.score -= 30; e.demoted = why; }
}

// forced into the core tier: audit list + every entry added from the full JMdict
const forced = new Set([...overrides.core, ...overrides.add].map(Number));

entries.sort((a, b) => b.score - a.score || a.id - b.id);
// forced ids get a score floor equal to the core cutoff so they land inside the core tier
// (the cutoff is taken with the forced entries left out, so they replace the weakest regular entries)
const regular = entries.filter((e) => !forced.has(e.id));
const cutoff = regular[Math.min(coreN - forced.size, regular.length) - 1].score;
for (const e of entries) if (forced.has(e.id) && e.score <= cutoff) { e.forcedFrom = e.score; e.score = cutoff + 0.001; }
entries.sort((a, b) => b.score - a.score || a.id - b.id);
entries.forEach((e, i) => { e.rank = i + 1; e.core = e.rank <= coreN ? 1 : 0; });

const FIELDS = ['id', 'ja', 'kana', 'romaji', 'en', 'pos', 'topic', 'rank', 'core', 'alt'];
const meta = (part, rows) => ({
  format: 'japan-trip-dict/1',
  part,
  fields: FIELDS,
  count: rows.length,
  total: entries.length,
  coreSize: coreN,
  source: `JMdict (EDRDG) via jmdict-simplified ${src.version}, dictDate ${src.dictDate}; priority tags from ${basename(xmlPath)}`,
  license: 'CC BY-SA 4.0',
  attribution: "This app uses the JMdict/EDICT dictionary files (https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project). These files are the property of the Electronic Dictionary Research and Development Group (https://www.edrdg.org/), and are used in conformance with the Group's licence (https://www.edrdg.org/edrdg/licence.html). The dictionary data in this app is a selected, ranked and abridged version of JMdict and is available under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).",
  rows: rows.map((e) => FIELDS.map((f) => e[f])),
});
mkdirSync(OUT, { recursive: true });
const core = entries.filter((e) => e.core), rest = entries.filter((e) => !e.core);
const files = { 'dict-core.json': meta('core', core), 'dict-rest.json': meta('rest', rest), 'dict.json': meta('full', entries) };
const sizes = {};
for (const [name, obj] of Object.entries(files)) {
  const txt = JSON.stringify(obj);
  writeFileSync(join(OUT, name), txt);
  sizes[name] = { raw: Buffer.byteLength(txt), gzip: gzipSync(txt, { level: 9 }).length };
}

// --- build report (not shipped to the app) ---
const topicDist = (list) => list.reduce((m, e) => ((m[e.topic] = (m[e.topic] || 0) + 1), m), {});
const report = {
  input: src.words.length, kept: entries.length, coreN,
  dropped: { onlyJunkSenses: dropped.noSense.length, noKanaReading: dropped.noKana.length, ids: dropped },
  sizes, topicsCore: topicDist(core), topicsAll: topicDist(entries),
  forced: entries.filter((e) => e.forcedFrom != null).map((e) => ({ id: e.id, ja: e.ja, from: e.forcedFrom, added: !!e.added })),
  demoted: entries.filter((e) => e.demoted).map((e) => ({ id: e.id, ja: e.ja, rank: e.rank })),
};
mkdirSync(DBG, { recursive: true });
writeFileSync(join(DBG, 'build-report.json'), JSON.stringify(report, null, 1));
// a debug listing for human review (scores and the parts they came from)
writeFileSync(join(DBG, 'ranked-debug.tsv'), entries.map((e) => [e.rank, e.core, e.score, e.id, e.ja, e.kana, e.romaji, e.pos, e.topic, e.pri, JSON.stringify(e.parts), e.en].join('\t')).join('\n'));
console.log(JSON.stringify({ input: report.input, kept: report.kept, dropped: { junk: dropped.noSense.length, noKana: dropped.noKana.length }, sizes, topicsCore: report.topicsCore }, null, 1));
