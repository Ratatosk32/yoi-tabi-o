import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRuby, rubyToJa, rubyToRomaji, romajiToKana, splitTone, checkSyllable, joinWord, addTone, findCedict, loadCedict, HAN_RE } from './lib.mjs';

const zh = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(zh, '..', '..');
const dataDir = join(root, 'app', 'data', 'zh');
const verbose = process.argv.includes('--verbose');
const errors = [], warnings = [];
const E = (m) => errors.push(m), W = (m) => warnings.push(m);
const CYR = new RegExp('[\\u0400-\\u04FF]');
const load = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

const cedictText = findCedict(root);
const CEDICT = cedictText ? loadCedict(cedictText) : null;
if (!CEDICT) W('CC-CEDICT not found (dictionary/zh/raw/cedict or $CEDICT_DIR): reading checks skipped');
const REVIEWED = new Set(['后面 hòu miàn', '那边 nà biān', '出来 chū lai', '出去 chū qu', '进来 jìn lai', '进去 jìn qu', '上来 shàng lai', '下去 xià qu', '钥 yào']);
const NEUTRAL_OK = new Set([...'个们子么的了吗呢吧着过得地啊呀哪啦上下里来去起开头候道儿么西气思服友生']);

function units(ruby) {
  const out = [];
  let prev = null;
  for (const seg of parseRuby(ruby)) {
    if (seg.text != null) { if (seg.text.trim()) prev = null; continue; }
    if (seg.explicit) { prev = null; continue; }
    const chars = [...seg.base];
    const syls = seg.rt.trim().split(/\s+/);
    out.push({ chars, syls, run: seg.base, adjacentToPrev: prev != null });
    prev = seg;
  }
  return out;
}

function sylMatch(mine, ced, ch) {
  const a = splitTone(mine);
  if (mine === 'r' && ch === '儿') return ced.base === 'r' || ced.base === 'er' ? 'ok' : 'no';
  if (a.base !== ced.base) return 'no';
  if (a.tone === ced.tone) return 'ok';
  if (ch === '一' || ch === '不') return 'ok';
  if (a.tone === 5 || ced.tone === 5) return 'soft';
  return 'no';
}

function readingCheck(w, chars, syls) {
  if (!CEDICT) return;
  const run = chars.join('');
  if (REVIEWED.has(run + ' ' + syls.join(' '))) return;
  const entries = CEDICT.get(run);
  if (entries && chars.length > 1) {
    let best = 'no';
    for (const e of entries) {
      if (e.length !== syls.length) continue;
      const r = syls.map((s, i) => sylMatch(s, e[i], chars[i]));
      const v = r.includes('no') ? 'no' : r.includes('soft') ? 'soft' : 'ok';
      if (v === 'ok') { best = 'ok'; break; }
      if (v === 'soft') best = 'soft';
    }
    if (best === 'ok') return;
    if (best === 'soft') {
      W(`${w} ${run}[${syls.join(' ')}] neutral tone differs from CC-CEDICT (${entries.map(fmt).join(' / ')})`);
      return;
    }
    E(`${w} ${run}[${syls.join(' ')}] does not match CC-CEDICT (${entries.map(fmt).join(' / ')})`);
    return;
  }
  chars.forEach((ch, i) => {
    const es = (CEDICT.get(ch) || []).filter((e) => e.length === 1).map((e) => e[0]);
    if (!es.length) { W(`${w} ${ch} not in CC-CEDICT`); return; }
    const r = es.map((e) => sylMatch(syls[i], e, ch));
    if (r.includes('ok')) return;
    if (r.includes('soft')) {
      const reduplicated = i > 0 && chars[i - 1] === ch && splitTone(syls[i]).tone === 5;
      if ((!NEUTRAL_OK.has(ch) && !reduplicated) || verbose) W(`${w} ${ch}[${syls[i]}] neutral tone not in CC-CEDICT (${es.map((e) => addTone(e.base, e.tone)).join(', ')})`);
      return;
    }
    E(`${w} ${ch}[${syls[i]}] is not a CC-CEDICT reading (${es.map((e) => addTone(e.base, e.tone)).join(', ')})`);
  });
}
const fmt = (e) => e.map((s) => addTone(s.base, s.tone)).join(' ');

function sandhiCheck(w, us) {
  const flat = [];
  for (const u of us) {
    if (!u.adjacentToPrev && flat.length) flat.push(null);
    u.chars.forEach((c, i) => flat.push({ c, s: u.syls[i] }));
  }
  flat.forEach((x, i) => {
    if (!x || (x.c !== '一' && x.c !== '不')) return;
    const nx = flat[i + 1];
    const nt = nx ? splitTone(nx.s).tone : null;
    const nOrig = nx && nx.c === '个' ? 4 : nt;
    const t = splitTone(x.s).tone;
    if (x.c === '不') {
      if (t === 2 && nOrig !== 4) E(`${w} 不 bú must be followed by a 4th tone`);
      if (t === 4 && nOrig === 4) E(`${w} 不 before a 4th tone is bú`);
      if (t === 1 || t === 3) E(`${w} 不 with tone ${t}`);
    } else {
      if (t === 2 && nOrig !== 4) E(`${w} 一 yí must be followed by a 4th tone (or 个)`);
      if (t === 4 && !(nt >= 1 && nt <= 3)) E(`${w} 一 yì must be followed by a 1st, 2nd or 3rd tone`);
      if (t === 3) E(`${w} 一 with 3rd tone`);
    }
  });
}

function checkRuby(w, ruby, ja) {
  if (rubyToJa(ruby) !== ja) E(`${w} ruby -> ja differs from ja`);
  const plain = parseRuby(ruby).filter((x) => x.text != null).map((x) => x.text).join('');
  if (HAN_RE.test(plain)) E(`${w} hanzi without pinyin: ${ruby}`);
  if (/[\[\]{}|]/.test(plain)) E(`${w} stray ruby syntax: ${ruby}`);
  for (const seg of parseRuby(ruby)) {
    if (!seg.explicit || !/^[0-9]+$/.test(seg.base)) continue;
    for (const s of seg.rt.trim().split(/\s+/)) { const err = checkSyllable(s); if (err) E(`${w} {${seg.base}}: ${err}`); }
  }
  const us = units(ruby);
  for (const u of us) {
    if (u.syls.length !== u.chars.length) { E(`${w} ${u.run}: ${u.chars.length} characters but ${u.syls.length} syllables`); continue; }
    u.syls.forEach((s, i) => {
      if (s === 'r') { if (u.chars[i] !== '儿' || i === 0) E(`${w} erhua "r" only for 儿 inside a word`); return; }
      const err = checkSyllable(s);
      if (err) E(`${w} ${u.chars[i]}[${s}]: ${err}`);
      if (s !== s.toLowerCase() && i > 0) E(`${w} capital letter inside a word: ${s}`);
    });
    readingCheck(w, u.chars, u.syls);
  }
  sandhiCheck(w, us);
}

function header(name, d, needScript = true) {
  if (d.lang !== 'zh') E(`${name}: lang must be "zh"`);
  for (const f of ['format', 'version', 'generated', 'locale']) if (d[f] == null) E(`${name}: missing header ${f}`);
  if (needScript && d.script !== 'Hans') E(`${name}: script must be "Hans"`);
}

let stats = {};
if (existsSync(join(dataDir, 'curriculum.json'))) {
  const d = load('curriculum.json');
  header('curriculum.json', d);
  const cats = new Set(d.categories.map((c) => c.id));
  const unitIds = new Map(d.units.map((u) => [u.id, u]));
  const lessons = new Map(d.lessons.map((l) => [l.code, l]));
  const byId = new Map();
  let prevOrder = 0;
  for (const it of d.items) {
    const w = `[${it.id}]`;
    if (!/^zh\.[a-z]+\.[a-z0-9\-]+$/.test(it.id || '')) E(`${w} bad id`);
    if (byId.has(it.id)) E(`${w} duplicate id`);
    byId.set(it.id, it);
    for (const f of ['cat', 'kind', 'en', 'ja', 'ruby', 'kana', 'romaji', 'lesson', 'level', 'order', 'src']) if (it[f] == null || String(it[f]).trim() === '') E(`${w} empty field ${f}`);
    if (it.id.split('.')[1] !== it.cat) E(`${w} id segment differs from cat ${it.cat}`);
    if (!cats.has(it.cat)) E(`${w} unknown category ${it.cat}`);
    if (!['say', 'hear', 'pattern'].includes(it.kind)) E(`${w} bad kind ${it.kind}`);
    if (!lessons.has(it.lesson)) E(`${w} unknown lesson ${it.lesson}`);
    if (!(it.level >= 1 && it.level <= 5)) E(`${w} level outside 1..5`);
    if (it.order !== prevOrder + 1) E(`${w} order out of sequence`);
    prevOrder = it.order;
    if (it.src !== 'new') E(`${w} src must be "new"`);
    const unit = unitIds.get((it.lesson || '').slice(0, 3));
    if (!unit || it.tags?.[0] !== unit.path) E(`${w} tags[0] must be the unit path`);
    if (it.ruby) {
      checkRuby(w, it.ruby, it.ja);
      if (rubyToRomaji(it.ruby) !== it.romaji) E(`${w} romaji differs from the one derived from ruby`);
    }
    if (it.kana !== romajiToKana(it.romaji || '')) E(`${w} kana differs from the one derived from romaji`);
    if (!/^[a-z0-9 ]+$/.test(it.kana || '')) E(`${w} kana must be toneless lowercase ASCII`);
    if (it.tts && !HAN_RE.test(it.tts)) E(`${w} tts must be hanzi`);
    if (it.kind === 'pattern' && !it.pattern) E(`${w} pattern item without "pattern"`);
    if (it.kind !== 'hear' && it.replies?.length) E(`${w} replies on a non-hear item`);
    if (it.kind === 'hear' && !it.replies?.length && !/no reply|just listen/i.test(it.note || '')) W(`${w} hear item without replies and without a "no reply" note`);
    for (const f of ['en', 'note', 'pattern']) if (it[f] && CYR.test(it[f])) E(`${w} Cyrillic in ${f}`);
  }
  for (const it of d.items) {
    for (const r of it.replies || []) {
      const t = byId.get(r);
      if (!t) E(`[${it.id}] replies -> missing ${r}`);
      else if (t.kind === 'hear') E(`[${it.id}] replies -> ${r} is a hear item`);
      else if (!(t.replyTo || []).includes(it.id)) E(`[${it.id}] replies -> ${r} not symmetric`);
    }
    for (const r of it.replyTo || []) {
      const t = byId.get(r);
      if (!t) E(`[${it.id}] replyTo -> missing ${r}`);
      else if (t.kind !== 'hear') E(`[${it.id}] replyTo -> ${r} is not a hear item`);
      else if (!(t.replies || []).includes(it.id)) E(`[${it.id}] replyTo -> ${r} not symmetric`);
    }
  }
  for (const l of d.lessons) {
    if (!/^Z\d\d-L\d\d$/.test(l.code)) E(`lesson ${l.code}: bad code`);
    if (!unitIds.has(l.unit)) E(`lesson ${l.code}: unknown unit`);
    if (l.count !== l.ids.length) E(`lesson ${l.code}: count differs from ids`);
    if (l.count < 10 || l.count > 15) E(`lesson ${l.code}: ${l.count} items (must be 10-15)`);
    if (!(l.hsk >= 1 && l.hsk <= 4)) E(`lesson ${l.code}: hsk outside 1..4`);
    for (const f of ['title', 'goal']) if (!l[f]) E(`lesson ${l.code}: empty ${f}`);
    for (const id of l.ids) if (byId.get(id)?.lesson !== l.code) E(`lesson ${l.code}: id ${id} does not resolve to this lesson`);
    const seen = new Set();
    for (const id of l.ids) { const ja = byId.get(id)?.ja; if (seen.has(ja)) W(`lesson ${l.code}: repeated "${ja}"`); seen.add(ja); }
  }
  const allJa = new Map();
  for (const it of d.items) { if (allJa.has(it.ja)) W(`[${it.id}] same hanzi as ${allJa.get(it.ja)}`); else allJa.set(it.ja, it.id); }
  stats.items = d.items.length; stats.lessons = d.lessons.length; stats.units = d.units.length;
  stats.kinds = d.items.reduce((a, x) => ((a[x.kind] = (a[x.kind] || 0) + 1), a), {});
}

if (existsSync(join(dataDir, 'hanzi.json'))) {
  const d = load('hanzi.json');
  header('hanzi.json', d);
  const groups = new Set(d.groups.map((g) => g.id));
  const ids = new Set(), chars = new Set();
  for (const it of d.items) {
    const w = `[${it.id}]`;
    if (!/^zh\.h\.[a-z0-9\-]+$/.test(it.id)) E(`${w} bad id`);
    if (ids.has(it.id)) E(`${w} duplicate id`); ids.add(it.id);
    if (chars.has(it.ja + it.group)) E(`${w} duplicate character ${it.ja}`); chars.add(it.ja + it.group);
    if ([...it.ja].length !== 1) E(`${w} ja must be one character`);
    if (!groups.has(it.group)) E(`${w} unknown group ${it.group}`);
    for (const f of ['ja', 'ruby', 'kana', 'romaji', 'en']) if (!it[f]) E(`${w} empty ${f}`);
    if (it.ruby !== `${it.ja}[${it.romaji}]`) E(`${w} ruby must be ja[romaji]`);
    const err = checkSyllable(it.romaji);
    if (err) E(`${w} ${err}`);
    if (it.kana !== romajiToKana(it.romaji)) E(`${w} kana`);
    if (it.group !== 'radical') readingCheck(w, [it.ja], [it.romaji]);
    if (!it.ex || !it.ex.ja || !it.ex.en || !it.ex.romaji) E(`${w} missing example`);
    else {
      checkRuby(`${w} ex`, it.ex.ruby, it.ex.ja);
      if (!it.ex.ja.includes(it.ja)) E(`${w} example word does not contain ${it.ja}`);
    }
  }
  stats.hanzi = d.items.length;
  stats.radicals = d.items.filter((x) => x.group === 'radical').length;
}

if (existsSync(join(dataDir, 'pinyin.json'))) {
  const d = load('pinyin.json');
  header('pinyin.json', d, false);
  const pyMatches = (a, tts) => {
    if (!CEDICT) return true;
    const want = a.toLowerCase().replace(/'/g, '');
    return (CEDICT.get(tts) || []).some((e) => e.map((s) => addTone(s.base, s.tone)).join('') === want);
  };
  for (const t of d.tables) for (const row of t.rows) for (const c of row) {
    if (!c) continue;
    if (c.tts && c.py && !pyMatches(c.py, c.ex || c.tts)) E(`pinyin table ${t.id}: ${c.ex || c.tts} is not ${c.py}`);
  }
  for (const q of d.quizzes) {
    if (!['listen', 'read'].includes(q.mode)) E(`quiz ${q.id}: bad mode`);
    if (!q.items?.length) E(`quiz ${q.id}: no items`);
    for (const x of q.items) {
      const w = `quiz ${q.id} "${x.q}"`;
      if (x.q == null || x.a == null) E(`${w}: missing q/a`);
      if (x.opts && !x.opts.includes(x.a)) E(`${w}: answer not among opts`);
      if (x.opts && new Set(x.opts).size !== x.opts.length) E(`${w}: duplicate opts`);
      if (q.mode === 'listen' && !x.tts) E(`${w}: listen item without tts`);
      if (x.py && x.tts && !pyMatches(x.py, x.tts)) E(`${w}: ${x.tts} is not read ${x.py} in CC-CEDICT`);
    }
  }
  for (const x of d.words || []) if (!pyMatches(x.r.replace(/ /g, ''), x.k)) E(`pinyin word ${x.k} is not ${x.r} in CC-CEDICT`);
  for (const x of d.tones || []) if (x.ex && !pyMatches(x.ex.r, x.ex.h)) E(`tone ${x.n}: ${x.ex.h} is not ${x.ex.r}`);
  stats.quizzes = d.quizzes.length;
  stats.quizItems = d.quizzes.reduce((a, q) => a + q.items.length, 0);
  stats.pinyinWords = (d.words || []).length;
}

let cyr = 0;
for (const dir of [zh, dataDir]) {
  if (!existsSync(dir)) continue;
  (function walk(p) {
    for (const f of readdirSync(p)) {
      const q = join(p, f);
      if (statSync(q).isDirectory()) walk(q);
      else if (CYR.test(readFileSync(q, 'utf8'))) { cyr++; E(`Cyrillic in ${relative(root, q)}`); }
    }
  })(dir);
}

const show = (arr, label) => { if (arr.length) console.log(`${label} (${arr.length}):\n  ` + arr.slice(0, verbose ? 1e9 : 60).join('\n  ')); };
show(warnings, 'WARNINGS');
show(errors, 'ERRORS');
console.log(JSON.stringify(stats));
console.log(errors.length ? `FAILED: ${errors.length} errors, ${warnings.length} warnings` : `OK: 0 errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
