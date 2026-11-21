// Validate app/data/*.json: schema, unique ids, ruby ↔ ja ↔ kana, romaji ↔ kana, reply links,
// and the rule "the shipped app is English-only": no Cyrillic in any text file under app/.
// Run: node tools/validate.mjs  (exit code 1 on errors). Also used by tests/.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseRuby, rubyToJa, rubyToKana, kanjiWithoutReading, romajiComparable, kanaComparable, romajiMatchesKana } from '../app/modules/text.js';
import { ROMAJI_REVIEWED } from './content/phrases.src.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(root, 'app');
const load = (n) => JSON.parse(readFileSync(join(APP, 'data', n), 'utf8'));

const KINDS = new Set(['say', 'hear', 'pattern', 'card']);
const PATHS = new Set(['core', 'ext', 'ref']);
const CURRICULUM_KINDS = new Set(['say', 'hear', 'pattern', 'card']);
const KANA_ONLY = /^[぀-ゟ゠-ヿ〇、。・？！ 　ー]+$/u;
const ROMAJI_OK = /^[A-Za-zāīūēōĀĪŪĒŌ'’ \-,.?!〇]+$/u;
const CYRILLIC = /[\u0400-\u04FF]/u;
const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.md', '.txt', '.svg', '']);

// Reviewed romaji exceptions in the curriculum (filled from its own reviewed list when present).
const reviewedExtra = {};

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
    if (ROMAJI_REVIEWED[it.id] || reviewedExtra[it.id]) warnings.push(`${where}: romaji differs from auto-transliteration (reviewed: ${ROMAJI_REVIEWED[it.id] || reviewedExtra[it.id]})`);
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

  // curriculum (app/data/curriculum.json, built by tools/build-curriculum.mjs)
  const cur = existsSync(join(APP, 'data', 'curriculum.json')) ? validateCurriculum(load('curriculum.json'), ph, kj, errors, warnings) : null;

  const zh = validateZhData(errors);

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
      ...(cur ? { curriculum: cur } : {}),
      ...(zh ? { zh } : {}),
    },
  };
}

const ZH_DIR = join(APP, 'data', 'zh');
const ZH_KEY = /^[a-z v]*$/;
const HAN_RUN = /^[\u3400-\u4DBF\u4E00-\u9FFF]+$/u;

function zhRubyErrors(ruby) {
  return parseRuby(ruby).filter((seg) => seg.rt != null && HAN_RUN.test(seg.base) && [...seg.base].length !== seg.rt.trim().split(/\s+/).length)
    .map((seg) => `${seg.base}[${seg.rt}]: syllables ≠ characters`);
}

export function validateZhData(errors) {
  if (!existsSync(ZH_DIR)) return null;
  const read = (n) => (existsSync(join(ZH_DIR, n)) ? JSON.parse(readFileSync(join(ZH_DIR, n), 'utf8')) : null);
  const E = (m) => errors.push('zh ' + m);
  const counts = {};
  for (const n of readdirSync(ZH_DIR).filter((f) => f.endsWith('.json'))) {
    if (read(n).lang !== 'zh') E(`${n}: header lang must be "zh"`);
  }
  const cur = read('curriculum.json');
  if (cur) {
    const ids = new Set();
    for (const it of cur.items || []) {
      const where = `curriculum[${it.id}]`;
      if (!/^zh\.[a-z0-9.\-]+$/.test(it.id || '')) E(`${where}: id must start with zh.`);
      if (ids.has(it.id)) E(`${where}: duplicate id`);
      ids.add(it.id);
      for (const f of ['ja', 'ruby', 'kana', 'romaji', 'en']) if (!it[f] || typeof it[f] !== 'string') E(`${where}: missing ${f}`);
      if (it.ruby && rubyToJa(it.ruby) !== it.ja) E(`${where}: ruby→ja "${rubyToJa(it.ruby)}" ≠ ja "${it.ja}"`);
      if (it.ruby) for (const m of zhRubyErrors(it.ruby)) E(`${where}: ${m}`);
      if (it.kana && !ZH_KEY.test(it.kana)) E(`${where}: kana must be toneless lowercase pinyin "${it.kana}"`);
    }
    for (const l of cur.lessons || []) {
      if (!/^Z\d\d-L\d\d$/.test(l.code || '')) E(`lesson ${l.code}: code must look like Z01-L01`);
      for (const id of l.ids || []) if (!ids.has(id)) E(`lesson ${l.code}: unknown item ${id}`);
    }
    for (const it of cur.items || []) for (const r of [...(it.replies || []), ...(it.replyTo || [])]) if (!ids.has(r)) E(`curriculum[${it.id}]: link to unknown ${r}`);
    counts.items = ids.size;
    counts.lessons = (cur.lessons || []).length;
  }
  const hz = read('hanzi.json');
  if (hz) {
    for (const it of hz.items || []) if (!/^zh\.h\./.test(it.id || '')) E(`hanzi[${it.id}]: id must start with zh.h.`);
    counts.hanzi = (hz.items || []).length;
  }
  const py = read('pinyin.json');
  if (py) {
    for (const q of py.quizzes || []) {
      if (!['listen', 'read'].includes(q.mode)) E(`pinyin quiz ${q.id}: mode must be listen or read`);
      for (const x of q.items || []) if (x.opts && !x.opts.includes(x.a)) E(`pinyin quiz ${q.id}: answer "${x.a}" missing from opts`);
    }
    counts.pinyinQuizzes = (py.quizzes || []).length;
  }
  const dict = read('dict-core.json');
  if (dict) counts.dictCore = dict.count;
  return counts;
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


/**
 * Curriculum checks: every item like a phrase (Japanese, English, tts), lessons ↔ items consistency,
 * global study order 1..N, path tag = lesson path, symmetric reply links, every v1 phrase id kept with
 * unchanged Japanese / kana / romaji / tts and links, and one romaji for words shared with the kanji sheet.
 */
export function validateCurriculum(c, phrases, kanji, errors, warnings) {
  const E = (m) => errors.push('curriculum: ' + m);
  const items = c.items || [];
  const byId = new Map(items.map((it) => [it.id, it]));
  if (byId.size !== items.length) E('duplicate item ids');
  const cats = new Set((c.categories || []).map((x) => x.id));
  const units = new Set((c.units || []).map((x) => x.id));
  const lessons = new Map((c.lessons || []).map((l) => [l.code, l]));

  for (const it of items) {
    const where = `curriculum[${it.id}]`;
    if (!cats.has(it.cat)) E(`${it.id}: unknown category ${it.cat}`);
    if (!CURRICULUM_KINDS.has(it.kind)) E(`${it.id}: unknown kind ${it.kind}`);
    checkEnglish(it.en, where, 'en', errors);
    if (it.note && CYRILLIC.test(it.note)) E(`${it.id}: note contains Cyrillic`);
    checkJapanese(it, where, errors, warnings);
    if (it.tts && !KANA_ONLY.test(it.tts)) E(`${it.id}: tts must be kana "${it.tts}"`);
    if (!Array.isArray(it.tags) || !PATHS.has(it.tags[0])) E(`${it.id}: tags[0] must be core/ext/ref`);
    const l = lessons.get(it.lesson);
    if (!l) E(`${it.id}: unknown lesson ${it.lesson}`);
    else {
      if (!l.ids.includes(it.id)) E(`${it.id}: not listed in lesson ${it.lesson}`);
      if (it.tags && it.tags[0] !== l.path) E(`${it.id}: path ${it.tags[0]} ≠ lesson path ${l.path}`);
    }
    if (!Number.isInteger(it.level) || it.level < 1 || it.level > 5) E(`${it.id}: level must be 1..5`);
    if (it.src !== 'v1' && it.src !== 'new') E(`${it.id}: src must be v1/new`);
    for (const r of it.replies || []) {
      const t = byId.get(r);
      if (!t) E(`${it.id}: replies → missing ${r}`);
      else if (!(t.replyTo || []).includes(it.id)) E(`${r}: no reverse replyTo → ${it.id}`);
    }
    for (const r of it.replyTo || []) {
      const t = byId.get(r);
      if (!t || !(t.replies || []).includes(it.id)) E(`${it.id}: replyTo → ${r} without reverse link`);
    }
  }

  // lessons
  const seen = new Map();
  for (const l of c.lessons || []) {
    if (!units.has(l.unit)) E(`lesson ${l.code}: unknown unit ${l.unit}`);
    if (!PATHS.has(l.path)) E(`lesson ${l.code}: bad path ${l.path}`);
    if (l.count !== l.ids.length) E(`lesson ${l.code}: count ${l.count} ≠ ${l.ids.length} ids`);
    for (const id of l.ids) {
      if (!byId.has(id)) E(`lesson ${l.code}: unknown id ${id}`);
      if (seen.has(id)) E(`${id}: in two lessons (${seen.get(id)}, ${l.code})`);
      seen.set(id, l.code);
    }
  }
  if (seen.size !== items.length) E(`${items.length - seen.size} items are in no lesson`);

  // global order 1..N
  const orders = items.map((it) => it.order).sort((a, b) => a - b);
  if (orders.some((o, i) => o !== i + 1)) E('order must be exactly 1..N without gaps or repeats');

  // v1 phrases kept
  let kept = 0;
  for (const p of phrases.items || []) {
    const it = byId.get(p.id);
    if (!it) { E(`v1 id missing: ${p.id}`); continue; }
    kept += 1;
    for (const f of ['ja', 'kana', 'romaji', 'tts']) if ((p[f] || null) !== (it[f] || null)) E(`${p.id}: ${f} changed "${p[f]}" → "${it[f]}"`);
    for (const f of ['replies', 'replyTo']) for (const r of p[f] || []) if (!(it[f] || []).includes(r)) E(`${p.id}: v1 link ${f} → ${r} lost`);
  }

  // one romaji for a word shared with the kanji cheat sheet (e.g. クォーツ)
  const kanjiByJa = new Map((kanji.items || []).map((k) => [k.ja, k]));
  for (const it of items) {
    const k = kanjiByJa.get(it.ja);
    if (k && k.romaji !== it.romaji) E(`${it.id}: romaji "${it.romaji}" ≠ kanji sheet ${k.id} "${k.romaji}"`);
  }

  const byPath = items.reduce((a, it) => ((a[it.tags[0]] = (a[it.tags[0]] || 0) + 1), a), {});
  return { items: items.length, lessons: (c.lessons || []).length, units: units.size, byPath, v1Kept: kept };
}
