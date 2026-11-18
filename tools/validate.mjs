// Validate app/data/*.json: schema, unique ids, ruby ↔ ja ↔ kana, romaji ↔ kana, reply links,
// and the rule "the shipped app is English-only": no Cyrillic in any text file under app/.
// Run: node tools/validate.mjs  (exit code 1 on errors). Also used by tests/.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rubyToJa, rubyToKana, kanjiWithoutReading, romajiComparable, kanaComparable, romajiMatchesKana } from '../app/modules/text.js';
import { ROMAJI_REVIEWED } from './content/phrases.src.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(root, 'app');
const load = (n) => JSON.parse(readFileSync(join(APP, 'data', n), 'utf8'));

const KINDS = new Set(['say', 'hear', 'pattern', 'card']);
const KANA_ONLY = /^[぀-ゟ゠-ヿ〇、。・？！ 　ー]+$/u;
const ROMAJI_OK = /^[A-Za-zāīūēō'’ \-,.?!〇]+$/u;
const CYRILLIC = /[\u0400-\u04FF]/u;
const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.md', '.txt', '.svg', '']);

function checkJapanese(it, where, errors, warnings) {
  for (const f of ['ja', 'ruby', 'kana', 'romaji']) {
    if (!it[f] || typeof it[f] !== 'string') errors.push(`${where}: missing ${f}`);
  }
  if (!it.ruby) return;
  if (rubyToJa(it.ruby) !== it.ja) errors.push(`${where}: ruby→ja "${rubyToJa(it.ruby)}" ≠ ja "${it.ja}"`);
  if (rubyToKana(it.ruby) !== it.kana) errors.push(`${where}: ruby→kana "${rubyToKana(it.ruby)}" ≠ kana "${it.kana}"`);
  if (kanjiWithoutReading(it.ruby)) errors.push(`${where}: kanji without reading in ruby "${it.ruby}"`);
  if (!KANA_ONLY.test(it.kana)) errors.push(`${where}: kana field is not kana-only "${it.kana}"`);
  if (!ROMAJI_OK.test(it.romaji)) errors.push(`${where}: invalid characters in romaji "${it.romaji}"`);
  if (!romajiMatchesKana(it.romaji, it.kana)) {
    if (ROMAJI_REVIEWED[it.id]) warnings.push(`${where}: romaji differs from auto-transliteration (reviewed: ${ROMAJI_REVIEWED[it.id]})`);
    else errors.push(`${where}: romaji "${it.romaji}" → ${romajiComparable(it.romaji)} ≠ from kana ${kanaComparable(it.kana)}`);
  }
}

function checkEnglish(text, where, field, errors) {
  if (!text || typeof text !== 'string') errors.push(`${where}: missing ${field}`);
  else if (CYRILLIC.test(text)) errors.push(`${where}: ${field} contains Cyrillic "${text}"`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Shipped files must not contain Cyrillic (the app is English-only). */
export function cyrillicInApp() {
  const hits = [];
  for (const p of walk(APP)) {
    if (!TEXT_EXT.has(extname(p).toLowerCase()) && !p.endsWith('_headers')) continue;
    const lines = readFileSync(p, 'utf8').split('\n');
    lines.forEach((l, i) => { if (CYRILLIC.test(l)) hits.push(`${relative(root, p).replace(/\\/g, '/')}:${i + 1}: ${l.trim().slice(0, 80)}`); });
  }
  return hits;
}

export function validateAll() {
  const errors = [], warnings = [];
  const ids = new Set();
  const dupId = (id, where) => { if (ids.has(id)) errors.push(`${where}: duplicate id ${id}`); ids.add(id); };

  // phrases
  const ph = load('phrases.json');
  if (!Number.isInteger(ph.version)) errors.push('phrases.json: missing version');
  for (const c of ph.categories || []) checkEnglish(c.en, `category[${c.id}]`, 'en', errors);
  const cats = new Set((ph.categories || []).map((c) => c.id));
  const jaSeen = new Map();
  for (const it of ph.items || []) {
    const where = `phrases[${it.id}]`;
    if (!it.id || !/^[a-z0-9.\-]+$/.test(it.id)) errors.push(`${where}: bad id`);
    dupId(it.id, where);
    if (!cats.has(it.cat)) errors.push(`${where}: unknown category ${it.cat}`);
    if (!KINDS.has(it.kind)) errors.push(`${where}: unknown kind ${it.kind}`);
    if ('ru' in it) errors.push(`${where}: legacy field ru (use en)`);
    checkEnglish(it.en, where, 'en', errors);
    if (it.note && CYRILLIC.test(it.note)) errors.push(`${where}: note contains Cyrillic`);
    if (!Array.isArray(it.tags) || !it.tags.some((t) => /^w[123]$/.test(t))) errors.push(`${where}: no week tag`);
    checkJapanese(it, where, errors, warnings);
    if (it.tts && !KANA_ONLY.test(it.tts)) errors.push(`${where}: tts must be kana "${it.tts}"`);
    if (jaSeen.has(it.ja) && it.kind === 'say') warnings.push(`${where}: same phrase as ${jaSeen.get(it.ja)}`);
    jaSeen.set(it.ja, it.id);
  }

  // "heard → reply" links: exist, right kind, symmetric
  const byId = new Map((ph.items || []).map((it) => [it.id, it]));
  let links = 0;
  for (const it of ph.items || []) {
    for (const r of it.replies || []) {
      links += 1;
      const t = byId.get(r);
      if (!t) errors.push(`phrases[${it.id}]: replies → missing ${r}`);
      else if (t.kind !== 'say') errors.push(`phrases[${it.id}]: replies → ${r} is not say`);
      else if (!(t.replyTo || []).includes(it.id)) errors.push(`phrases[${r}]: no reverse replyTo → ${it.id}`);
      if (it.kind !== 'hear') errors.push(`phrases[${it.id}]: replies only allowed on hear`);
    }
    for (const r of it.replyTo || []) {
      const t = byId.get(r);
      if (!t || !(t.replies || []).includes(it.id)) errors.push(`phrases[${it.id}]: replyTo → ${r} without reverse link`);
    }
  }
  if (links === 0) errors.push('phrases.json: no replies/replyTo links');

  // kanji
  const kj = load('kanji.json');
  for (const g of kj.groups || []) checkEnglish(g.en, `group[${g.id}]`, 'en', errors);
  const groups = new Set((kj.groups || []).map((g) => g.id));
  for (const it of kj.items || []) {
    const where = `kanji[${it.id}]`;
    dupId(it.id, where);
    if (!groups.has(it.group)) errors.push(`${where}: unknown group ${it.group}`);
    checkEnglish(it.en, where, 'en', errors);
    checkJapanese(it, where, errors, warnings);
  }

  // kana
  const kn = load('kana.json');
  for (const sec of ['gojuon', 'dakuten', 'yoon', 'extended']) {
    for (const rowArr of kn[sec] || []) for (const c of rowArr) {
      if (!c) continue;
      const ch = c.h || c.k;
      const exp = kanaComparable(ch);
      // を is shown as o, ぢ/づ as ji/zu — same as the converter
      if (exp !== c.r) errors.push(`kana.${sec}: ${ch} romaji "${c.r}" ≠ ${exp}`);
      if (c.h && c.k && kanaComparable(c.k) !== c.r) errors.push(`kana.${sec}: katakana ${c.k} ≠ ${c.r}`);
    }
  }
  for (const n of kn.notes || []) checkEnglish(n.en, `kana.notes[${n.mark}]`, 'en', errors);
  for (const w of kn.words || []) {
    if (!romajiMatchesKana(w.r, w.k)) errors.push(`kana.words: ${w.k} "${w.r}" ≠ ${kanaComparable(w.k)}`);
    checkEnglish(w.en, `kana.words[${w.k}]`, 'en', errors);
  }

  // English-only app
  for (const h of cyrillicInApp()) errors.push('Cyrillic in shipped file: ' + h);

  return {
    errors, warnings,
    counts: {
      phrases: (ph.items || []).length,
      byKind: (ph.items || []).reduce((a, it) => ((a[it.kind] = (a[it.kind] || 0) + 1), a), {}),
      links,
      kanji: (kj.items || []).length,
      kanaWords: (kn.words || []).length,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = validateAll();
  console.log('Counts:', JSON.stringify(r.counts));
  for (const w of r.warnings) console.log('WARNING', w);
  for (const e of r.errors.slice(0, 60)) console.log('ERROR', e);
  if (r.errors.length > 60) console.log(`… and ${r.errors.length - 60} more`);
  console.log(r.errors.length ? `Errors: ${r.errors.length}` : 'OK: no errors');
  process.exit(r.errors.length ? 1 : 0);
}
