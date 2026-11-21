import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rubyToJa, rubyToRomaji, romajiToKana, splitTone } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const zh = join(here, '..');
const root = join(zh, '..', '..');
const outDir = join(root, 'app', 'data', 'zh');
const imp = (p) => import(pathToFileURL(join(zh, 'src', p)).href);
const today = new Date().toISOString().slice(0, 10);
const HEADER = { format: 1, lang: 'zh', locale: 'zh-CN', script: 'Hans', version: 1, generated: today };

const { UNITS, CATEGORIES } = await imp('units.mjs');
const lessonFiles = readdirSync(join(zh, 'src')).filter((f) => /^z\d\d.*\.mjs$/.test(f)).sort();
const lessons = [];
for (const f of lessonFiles) lessons.push(...(await imp(f)).LESSONS);
lessons.sort((a, b) => a.code.localeCompare(b.code));

const unitById = Object.fromEntries(UNITS.map((u) => [u.id, u]));
const fullId = (s) => (s.startsWith('zh.') ? s : 'zh.' + s);
const items = [];
const lessonMeta = [];
let order = 0;
for (const L of lessons) {
  const unit = unitById[L.code.slice(0, 3)];
  if (!unit) throw new Error(`${L.code}: unknown unit`);
  const ids = [];
  for (const entry of L.items) {
    const [slug, kind, ruby, en, note, extra = {}] = entry;
    const romaji = rubyToRomaji(ruby);
    const it = { id: fullId(slug), cat: extra.cat || slug.split('.')[0], kind, en, ja: rubyToJa(ruby), ruby, kana: romajiToKana(romaji), romaji };
    if (extra.tts) it.tts = extra.tts;
    if (note) it.note = note;
    if (extra.pattern) it.pattern = extra.pattern;
    if (extra.replyTo) it.replyTo = extra.replyTo.map(fullId);
    if (extra.replies) it.replies = extra.replies.map(fullId);
    it.tags = [unit.path, ...(extra.tags || [])];
    it.lesson = L.code;
    it.level = L.level;
    it.order = ++order;
    it.src = 'new';
    items.push(it);
    ids.push(it.id);
  }
  lessonMeta.push({ code: L.code, unit: unit.id, title: L.title, goal: L.goal, level: L.level, path: unit.path, hsk: L.hsk || unit.hsk, patterns: L.patterns || [], count: ids.length, ids });
}

const byId = new Map(items.map((it) => [it.id, it]));
for (const it of items) {
  for (const r of it.replies || []) {
    const t = byId.get(r);
    if (t) { t.replyTo = t.replyTo || []; if (!t.replyTo.includes(it.id)) t.replyTo.push(it.id); }
  }
  for (const r of it.replyTo || []) {
    const t = byId.get(r);
    if (t) { t.replies = t.replies || []; if (!t.replies.includes(it.id)) t.replies.push(it.id); }
  }
}
const outItems = items.map((it) => {
  const o = { id: it.id, cat: it.cat, kind: it.kind, en: it.en, ja: it.ja, ruby: it.ruby, kana: it.kana, romaji: it.romaji };
  for (const k of ['tts', 'note', 'pattern', 'replyTo', 'replies']) if (it[k] && (!Array.isArray(it[k]) || it[k].length)) o[k] = it[k];
  return Object.assign(o, { tags: it.tags, lesson: it.lesson, level: it.level, order: it.order, src: it.src });
});

mkdirSync(outDir, { recursive: true });
const curriculum = { ...HEADER, source: 'curriculum/zh/src/*.mjs via curriculum/zh/tools/build.mjs', categories: CATEGORIES, units: UNITS, lessons: lessonMeta, items: outItems };
writeFileSync(join(outDir, 'curriculum.json'), JSON.stringify(curriculum, null, 1) + '\n', 'utf8');

const word = (ruby) => rubyToRomaji(ruby).replace(/[.?!]$/, '');
let hanziCount = 0;
if (existsSync(join(zh, 'src', 'hanzi-groups.mjs'))) {
  const { GROUPS } = await imp('hanzi-groups.mjs');
  const { HSK } = existsSync(join(zh, 'src', 'hanzi-hsk.mjs')) ? await imp('hanzi-hsk.mjs') : { HSK: {} };
  const hanziFiles = readdirSync(join(zh, 'src')).filter((f) => /^hanzi-\d+.*\.mjs$/.test(f)).sort();
  const rows = [];
  for (const f of hanziFiles) rows.push(...(await imp(f)).HANZI);
  const groupOrder = GROUPS.map((g) => g.id);
  rows.sort((a, b) => groupOrder.indexOf(a[3]) - groupOrder.indexOf(b[3]));
  const keyOf = (r) => {
    const { base, tone } = splitTone(r[1]);
    return (r[3] === 'radical' ? 'r-' : '') + base.replace(/ü/g, 'v') + (r[3] === 'radical' ? '' : tone);
  };
  const hanzi = rows.map((r) => {
    const [ch, py, en, group, exRuby, exEn, alt] = r;
    const key = keyOf(r);
    const id = `zh.h.${key}-${ch.codePointAt(0).toString(16)}`;
    const it = { id, group, ja: ch, ruby: `${ch}[${py}]`, kana: romajiToKana(py), romaji: py, en, hsk: group === 'radical' ? 0 : (HSK[ch]?.[0] ?? 0) };
    if (HSK[ch]?.[1] && group !== 'radical') it.radical = HSK[ch][1];
    it.ex = { ja: rubyToJa(exRuby), ruby: exRuby, romaji: word(exRuby), en: exEn };
    if (alt) it.alt = alt;
    return it;
  });
  hanziCount = hanzi.length;
  writeFileSync(join(outDir, 'hanzi.json'), JSON.stringify({ ...HEADER, source: 'curriculum/zh/src/hanzi-*.mjs via curriculum/zh/tools/build.mjs', groups: GROUPS, items: hanzi }, null, 1) + '\n', 'utf8');
}

let quizCount = 0;
if (existsSync(join(zh, 'src', 'pinyin.mjs'))) {
  const { PINYIN } = await imp('pinyin.mjs');
  quizCount = PINYIN.quizzes.length;
  const { format, lang, version, generated } = HEADER;
  writeFileSync(join(outDir, 'pinyin.json'), JSON.stringify({ format, lang, locale: 'zh-CN', script: 'Hans', version, generated, ...PINYIN }, null, 1) + '\n', 'utf8');
}

const cnt = (arr, key) => arr.reduce((a, x) => ((a[key(x)] = (a[key(x)] || 0) + 1), a), {});
const kinds = ['say', 'hear', 'pattern'];
let md = `# Mandarin curriculum summary\n\nGenerated by \`curriculum/zh/tools/build.mjs\` (${today}). Items: **${outItems.length}**; lessons: **${lessonMeta.length}**; units: **${UNITS.length}**; hanzi: **${hanziCount}**; pinyin quizzes: **${quizCount}**.\n\n`;
md += '## By unit\n\n| Unit | Path | HSK | Lessons | Items | say | hear | pattern | words |\n|---|---|---|---|---|---|---|---|---|\n';
for (const u of UNITS) {
  const its = outItems.filter((x) => x.lesson.startsWith(u.id + '-'));
  const k = cnt(its, (x) => x.kind);
  md += `| ${u.id} ${u.title} | ${u.path} | ${u.hsk} | ${lessonMeta.filter((l) => l.unit === u.id).length} | ${its.length} | ${kinds.map((x) => k[x] || 0).join(' | ')} | ${its.filter((x) => x.tags.includes('word')).length} |\n`;
}
md += '\n## By level\n\n| Level | Items | say | hear | pattern |\n|---|---|---|---|---|\n';
for (const lv of [1, 2, 3, 4, 5]) {
  const its = outItems.filter((x) => x.level === lv); const k = cnt(its, (x) => x.kind);
  md += `| ${lv} | ${its.length} | ${kinds.map((x) => k[x] || 0).join(' | ')} |\n`;
}
md += '\n## Lessons\n\n| Lesson | HSK | Level | Title | Items | say/hear/pattern | New patterns |\n|---|---|---|---|---|---|---|\n';
for (const l of lessonMeta) {
  const k = cnt(l.ids.map((id) => byId.get(id)), (x) => x.kind);
  md += `| ${l.code} | ${l.hsk} | ${l.level} | ${l.title} | ${l.count} | ${kinds.map((x) => k[x] || 0).join('/')} | ${l.patterns.join(', ')} |\n`;
}
writeFileSync(join(zh, 'SUMMARY.md'), md, 'utf8');
console.log(`items ${outItems.length}, lessons ${lessonMeta.length}, units ${UNITS.length}, hanzi ${hanziCount}, quizzes ${quizCount}`);
