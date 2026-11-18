// Shared helpers for building and validating the curriculum corpus (no dependency on app/).
// ruby: 袋[ふくろ]はいりません — the reading applies to the contiguous kanji run before [ ];
//       {Wi-Fi|ワイファイ} — explicit "base|reading" pair for non-kanji text.

const KANJI = '\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF々〆ヶ';
const RUBY_RE = new RegExp(`\\{([^|{}]+)\\|([^{}]+)\\}|([${KANJI}]+)\\[([^\\]]+)\\]`, 'g');

export function parseRuby(src) {
  const out = [];
  let last = 0, m;
  RUBY_RE.lastIndex = 0;
  while ((m = RUBY_RE.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    out.push({ base: m[1] ?? m[3], rt: m[2] ?? m[4] });
    last = RUBY_RE.lastIndex;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}
export const rubyToJa = (s) => parseRuby(s).map((x) => (x.text != null ? x.text : x.base)).join('');
export const rubyToKana = (s) => parseRuby(s).map((x) => (x.text != null ? x.text : x.rt)).join('');
export function kanjiWithoutReading(s) {
  const plain = parseRuby(s).filter((x) => x.text != null).map((x) => x.text).join('');
  return new RegExp(`[${KANJI}]`).test(plain.replace(/〇/g, ''));
}

// ---------- kana -> "raw" Hepburn (long vowels not merged; ん = N) ----------
const T = { あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'o',ん:'N',が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ゔ:'vu' };
const Y = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
const EXT = { てぃ:'ti',でぃ:'di',ふぁ:'fa',ふぃ:'fi',ふぇ:'fe',ふぉ:'fo',うぃ:'wi',うぇ:'we',うぉ:'wo',しぇ:'she',ちぇ:'che',じぇ:'je',とぅ:'tu',どぅ:'du',ゔぁ:'va',ゔぃ:'vi',ゔぇ:'ve',ゔぉ:'vo',くぉ:'kwo',くぁ:'kwa',つぁ:'tsa',いぇ:'ye',でゅ:'dyu' };
const k2h = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

export function rawRomaji(kana) {
  const s = [...k2h(kana).replace(/[^ぁ-ゖー]/g, '')];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === 'っ') { out.push('Q'); continue; }
    if (c === 'ー') { out.push('L'); continue; }
    if (n && EXT[c + n]) { out.push(EXT[c + n]); i++; continue; }
    if (n && Y[n] && T[c]) { const b = T[c].slice(0, -1); out.push(b === 'sh' || b === 'ch' || b === 'j' ? b + Y[n] : b + 'y' + Y[n]); i++; continue; }
    if (T[c] == null) return null; // unknown character (e.g. a stray small kana)
    out.push(T[c]);
  }
  let r = '';
  for (let i = 0; i < out.length; i++) {
    const x = out[i];
    if (x === 'Q') { const nx = out[i + 1] || ''; r += nx.startsWith('ch') ? 't' : nx[0]; continue; } // っち -> tchi
    if (x === 'L') { r += r.slice(-1); continue; }
    r += x;
  }
  return r;
}

/** Romaji (PLAN 1.6 convention) -> regular expression over the raw reading. */
export function romajiPattern(romaji) {
  const toks = romaji.toLowerCase().replace(/[〇,.?!;:"“”()…]/g, ' ').split(/[\s\-]+/).filter(Boolean);
  return toks.map((t) => {
    if (t === 'wa') return '(?:ha|wa)'; // particle は
    if (t === 'e') return '(?:he|e)';   // particle へ
    let p = '';
    const cs = [...t.replace(/’/g, "'")];
    for (let i = 0; i < cs.length; i++) {
      const ch = cs[i], nx = cs[i + 1] || '';
      if (ch === "'") continue;
      // n before a vowel or y inside a word must be the な-row; ん needs an apostrophe or a word boundary
      if (ch === 'n') { p += /[aiueoyāīūēō]/.test(nx) ? 'n' : 'N'; continue; }
      p += ({ 'ō': '(?:ou|oo)', 'ū': 'uu', 'ā': 'aa', 'ī': 'ii', 'ē': '(?:ee|ei)' })[ch] ?? ch;
    }
    return p;
  }).join('');
}

export function romajiMatches(romaji, kana) {
  const raw = rawRomaji(kana);
  if (raw == null) return false;
  return new RegExp('^' + romajiPattern(romaji) + '$').test(raw);
}

/** Suggested romaji for error messages: long vowels merged within the string. */
export function suggestRomaji(kana) {
  const r = rawRomaji(kana);
  return r == null ? '?' : r.replace(/ou/g, 'ō').replace(/oo/g, 'ō').replace(/uu/g, 'ū').replace(/N/g, 'n');
}
