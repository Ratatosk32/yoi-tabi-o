import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

const HAN = '\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF';
const RUBY_RE = new RegExp(`\\{([^|{}]+)\\|([^{}]+)\\}|([${HAN}]+)\\[([^\\]]+)\\]`, 'g');
export const HAN_RE = new RegExp(`[${HAN}]`);

export function parseRuby(src) {
  const out = [];
  let last = 0, m;
  RUBY_RE.lastIndex = 0;
  while ((m = RUBY_RE.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    if (m[1] != null) out.push({ base: m[1], rt: m[2], explicit: true });
    else out.push({ base: m[3], rt: m[4], explicit: false });
    last = RUBY_RE.lastIndex;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

export const rubyToJa = (s) => parseRuby(s).map((x) => (x.text != null ? x.text : x.base)).join('');

const VOWEL_START = /^[aoeāáǎàōóǒòēéěèAOEĀÁǍÀŌÓǑÒĒÉĚÈ]/;

export function joinWord(syllables) {
  return syllables.map((s, i) => (i > 0 && VOWEL_START.test(s) ? "'" + s : s)).join('');
}

const PUNCT = { '，': ', ', '。': '. ', '？': '? ', '！': '! ', '、': ', ', '：': ': ', '；': '; ', '…': '...', '—': ' - ' };

export function rubyToRomaji(src) {
  let out = '';
  for (const seg of parseRuby(src)) {
    if (seg.text != null) {
      for (const ch of seg.text) out += PUNCT[ch] ?? ch;
      continue;
    }
    const word = joinWord(seg.rt.trim().split(/\s+/));
    if (out && !/[\s(]$/.test(out)) out += ' ';
    out += word;
  }
  out = out.replace(/\s+/g, ' ').replace(/ ([,.?!:;])/g, '$1').trim();
  if (!/[。？！，]/.test(src)) return out;
  return out.replace(/(^|[.?!] )(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

export function romajiToKana(romaji) {
  return romaji
    .replace(/[üǖǘǚǜÜǕǗǙǛ]/g, 'v')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const rubyToKana = (src) => romajiToKana(rubyToRomaji(src));

const TONED = {
  a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ',
};
const MARK_OF = {};
for (const [v, s] of Object.entries(TONED)) [...s].forEach((c, i) => { MARK_OF[c] = [v, i + 1]; });

export function splitTone(syl) {
  const lower = syl.toLowerCase();
  let tone = 5, marks = 0, base = '';
  for (const ch of lower) {
    if (MARK_OF[ch]) { base += MARK_OF[ch][0]; tone = MARK_OF[ch][1]; marks++; } else base += ch;
  }
  return { base, tone, marks };
}

export function markVowelIndex(base) {
  if (base.includes('a')) return base.indexOf('a');
  if (base.includes('e')) return base.indexOf('e');
  if (base.includes('ou')) return base.indexOf('o');
  for (let i = base.length - 1; i >= 0; i--) if ('iouü'.includes(base[i])) return i;
  return -1;
}

export function addTone(base, tone) {
  if (tone === 5 || tone == null) return base;
  const i = markVowelIndex(base);
  return base.slice(0, i) + TONED[base[i]][tone - 1] + base.slice(i + 1);
}

const FINALS = {
  a: 'b p m f d t n l g k h zh ch sh z c s', o: 'b p m f y', e: 'm d t n l g k h zh ch sh r z c s',
  ai: 'b p m d t n l g k h zh ch sh z c s', ei: 'b p m f d n l g k h z zh sh',
  ao: 'b p m d t n l g k h zh ch sh r z c s', ou: 'p m f d t n l g k h zh ch sh r z c s y',
  an: 'b p m f d t n l g k h zh ch sh r z c s y w', en: 'b p m f d n g k h zh ch sh r z c s w',
  ang: 'b p m f d t n l g k h zh ch sh r z c s y w', eng: 'b p m f d t n l g k h zh ch sh r z c s w',
  ong: 'd t n l g k h zh ch r z c s y', i: 'zh ch sh r z c s y b p m d t n l j q x',
  ia: 'd l j q x', ie: 'b p m d t n l j q x y', iao: 'b p m d t n l j q x',
  iu: 'm d n l j q x', ian: 'b p m d t n l j q x', in: 'b p m n l j q x y', iang: 'n l j q x',
  ing: 'b p m d t n l j q x y', iong: 'j q x', u: 'b p m f d t n l g k h zh ch sh r z c s w y j q x',
  ua: 'g k h zh ch sh w', uo: 'd t n l g k h zh ch sh r z c s w', uai: 'g k h zh ch sh w',
  ui: 'd t g k h zh ch sh r z c s', uan: 'd t n l g k h zh ch sh r z c s y j q x',
  un: 'd t l g k h zh ch sh r z c s y j q x', uang: 'g k h zh ch sh w', 'ü': 'n l', 'üe': 'n l',
  ue: 'j q x',
};
const SYLLABLES = new Set(['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'er', 'ya', 'yao', 'ye', 'yi', 'yin', 'ying', 'yong', 'yu', 'yuan', 'yun', 'yue', 'wa', 'wo', 'wai', 'wei', 'wan', 'wen', 'wang', 'weng', 'wu', 'you', 'yan', 'yang', 'yo']);
for (const [fin, inits] of Object.entries(FINALS)) {
  for (const ini of inits.split(' ').filter(Boolean)) {
    if (ini === 'y' || ini === 'w') continue;
    SYLLABLES.add(ini + fin);
  }
}
['nü', 'lü', 'nüe', 'lüe', 'dei', 'shei', 'nen', 'den', 'zhei', 'lo'].forEach((s) => SYLLABLES.add(s));
export { SYLLABLES };

export function checkSyllable(syl) {
  const { base, tone, marks } = splitTone(syl);
  if (/[0-9]/.test(syl)) return 'tone number instead of a mark';
  if (marks > 1) return 'more than one tone mark';
  if (!SYLLABLES.has(base)) return `not a pinyin syllable: ${base}`;
  if (marks === 1) {
    const expected = addTone(base, tone);
    if (expected !== syl.toLowerCase()) return `tone mark on the wrong vowel (expected ${expected})`;
  }
  return null;
}

export function findCedict(root) {
  const dirs = [join(root, 'dictionary', 'zh', 'raw', 'cedict'), process.env.CEDICT_DIR].filter(Boolean);
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (/\.gz$/.test(f)) return gunzipSync(readFileSync(p)).toString('utf8');
      if (/\.(u8|txt)$/.test(f)) return readFileSync(p, 'utf8');
    }
  }
  return null;
}

export function loadCedict(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) continue;
    const m = /^\S+ (\S+) \[([^\]]+)\]/.exec(line);
    if (!m) continue;
    const syls = m[2].toLowerCase().replace(/u:/g, 'ü').split(' ').map((s) => {
      const t = /([1-5])$/.exec(s);
      return { base: t ? s.slice(0, -1) : s, tone: t ? +t[1] : 5 };
    });
    if (!map.has(m[1])) map.set(m[1], []);
    map.get(m[1]).push(syls);
  }
  return map;
}
