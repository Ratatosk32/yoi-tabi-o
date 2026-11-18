// Проверка app/data/*.json: схема, уникальность id, ruby ↔ ja ↔ kana, ромадзи ↔ кана.
// Запуск: node tools/validate.mjs  (код выхода 1 при ошибках). Используется и в tests/.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rubyToJa, rubyToKana, kanjiWithoutReading, romajiComparable, kanaComparable, romajiMatchesKana } from '../app/modules/text.js';
import { ROMAJI_REVIEWED } from './content/phrases.src.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (n) => JSON.parse(readFileSync(join(root, 'app', 'data', n), 'utf8'));

const KINDS = new Set(['say', 'hear', 'pattern', 'card']);
const KANA_ONLY = /^[぀-ゟ゠-ヿ〇、。・？！ 　ー]+$/u;
const ROMAJI_OK = /^[A-Za-zāīūēō'’ \-,.?!〇]+$/u;

function checkJapanese(it, where, errors, warnings, { romajiCheck = true } = {}) {
  for (const f of ['ja', 'ruby', 'kana', 'romaji']) {
    if (!it[f] || typeof it[f] !== 'string') errors.push(`${where}: нет поля ${f}`);
  }
  if (errors.length && !it.ruby) return;
  if (rubyToJa(it.ruby) !== it.ja) errors.push(`${where}: ruby→ja «${rubyToJa(it.ruby)}» ≠ ja «${it.ja}»`);
  if (rubyToKana(it.ruby) !== it.kana) errors.push(`${where}: ruby→kana «${rubyToKana(it.ruby)}» ≠ kana «${it.kana}»`);
  if (kanjiWithoutReading(it.ruby)) errors.push(`${where}: кандзи без чтения в ruby «${it.ruby}»`);
  if (!KANA_ONLY.test(it.kana)) errors.push(`${where}: в kana не только кана «${it.kana}»`);
  if (!ROMAJI_OK.test(it.romaji)) errors.push(`${where}: недопустимые символы в romaji «${it.romaji}»`);
  if (romajiCheck) {
    const a = romajiComparable(it.romaji), b = kanaComparable(it.kana);
    if (!romajiMatchesKana(it.romaji, it.kana)) {
      if (ROMAJI_REVIEWED[it.id]) warnings.push(`${where}: ромадзи отличается от автотранслитерации (проверено: ${ROMAJI_REVIEWED[it.id]})`);
      else errors.push(`${where}: romaji «${it.romaji}» → ${a} ≠ из каны ${b}`);
    }
  }
}

export function validateAll() {
  const errors = [], warnings = [];
  const ids = new Set();
  const dupId = (id, where) => { if (ids.has(id)) errors.push(`${where}: повтор id ${id}`); ids.add(id); };

  // phrases
  const ph = load('phrases.json');
  if (!Number.isInteger(ph.version)) errors.push('phrases.json: нет version');
  const cats = new Set((ph.categories || []).map((c) => c.id));
  const jaSeen = new Map();
  for (const it of ph.items || []) {
    const where = `phrases[${it.id}]`;
    if (!it.id || !/^[a-z0-9.\-]+$/.test(it.id)) errors.push(`${where}: плохой id`);
    dupId(it.id, where);
    if (!cats.has(it.cat)) errors.push(`${where}: неизвестная категория ${it.cat}`);
    if (!KINDS.has(it.kind)) errors.push(`${where}: неизвестный kind ${it.kind}`);
    if (!it.ru) errors.push(`${where}: нет ru`);
    if (!Array.isArray(it.tags) || !it.tags.some((t) => /^w[123]$/.test(t))) errors.push(`${where}: нет тега недели`);
    checkJapanese(it, where, errors, warnings);
    if (it.tts && !KANA_ONLY.test(it.tts)) errors.push(`${where}: tts должен быть каной «${it.tts}»`);
    if (jaSeen.has(it.ja) && it.kind === 'say') warnings.push(`${where}: та же фраза, что ${jaSeen.get(it.ja)}`);
    jaSeen.set(it.ja, it.id);
  }

  // связи «услышал → ответ»: существуют, правильного типа, симметричны
  const byId = new Map((ph.items || []).map((it) => [it.id, it]));
  let links = 0;
  for (const it of ph.items || []) {
    for (const r of it.replies || []) {
      links += 1;
      const t = byId.get(r);
      if (!t) errors.push(`phrases[${it.id}]: replies → нет ${r}`);
      else if (t.kind !== 'say') errors.push(`phrases[${it.id}]: replies → ${r} не say`);
      else if (!(t.replyTo || []).includes(it.id)) errors.push(`phrases[${r}]: нет обратной связи replyTo → ${it.id}`);
      if (it.kind !== 'hear') errors.push(`phrases[${it.id}]: replies только у hear`);
    }
    for (const r of it.replyTo || []) {
      const t = byId.get(r);
      if (!t || !(t.replies || []).includes(it.id)) errors.push(`phrases[${it.id}]: replyTo → ${r} без обратной связи`);
    }
  }
  if (links === 0) errors.push('phrases.json: нет ни одной связи replies/replyTo');

  // kanji
  const kj = load('kanji.json');
  const groups = new Set((kj.groups || []).map((g) => g.id));
  for (const it of kj.items || []) {
    const where = `kanji[${it.id}]`;
    dupId(it.id, where);
    if (!groups.has(it.group)) errors.push(`${where}: неизвестная группа ${it.group}`);
    if (!it.ru) errors.push(`${where}: нет ru`);
    checkJapanese(it, where, errors, warnings);
  }

  // kana
  const kn = load('kana.json');
  for (const sec of ['gojuon', 'dakuten', 'yoon', 'extended']) {
    for (const rowArr of kn[sec] || []) for (const c of rowArr) {
      if (!c) continue;
      const ch = c.h || c.k;
      const exp = kanaComparable(ch);
      // を показываем как o, ぢ/づ — ji/zu: это совпадает с конвертером
      if (exp !== c.r) errors.push(`kana.${sec}: ${ch} romaji «${c.r}» ≠ ${exp}`);
      if (c.h && c.k && kanaComparable(c.k) !== c.r) errors.push(`kana.${sec}: катакана ${c.k} ≠ ${c.r}`);
    }
  }
  for (const w of kn.words || []) {
    if (!romajiMatchesKana(w.r, w.k)) errors.push(`kana.words: ${w.k} «${w.r}» ≠ ${kanaComparable(w.k)}`);
    if (!w.ru) errors.push(`kana.words: ${w.k} без перевода`);
  }

  return {
    errors, warnings,
    counts: {
      phrases: (ph.items || []).length,
      byKind: (ph.items || []).reduce((a, it) => ((a[it.kind] = (a[it.kind] || 0) + 1), a), {}),
      kanji: (kj.items || []).length,
      kanaWords: (kn.words || []).length,
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = validateAll();
  console.log('Количество:', JSON.stringify(r.counts));
  for (const w of r.warnings) console.log('ПРЕДУПРЕЖДЕНИЕ', w);
  for (const e of r.errors) console.log('ОШИБКА', e);
  console.log(r.errors.length ? `Ошибок: ${r.errors.length}` : 'OK: ошибок нет');
  process.exit(r.errors.length ? 1 : 0);
}
