// Text utilities: furigana, search normalisation, kana → Hepburn.
// Pure functions, no DOM.

// ---------- Furigana ----------
// Format of the `ruby` field:
//   袋[ふくろ]はいりません      — the reading belongs to the kanji run right before [ ]
//   {Wi-Fi|ワイファイ}          — explicit base|reading pair for non-kanji
const KANJI = '\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF々〆ヶ';
const RUBY_RE = new RegExp(`\\{([^|{}]+)\\|([^{}]+)\\}|([${KANJI}]+)\\[([^\\]]+)\\]`, 'g');

/** Parse into segments: [{ base, rt }] or [{ text }]. */
export function parseRuby(src) {
  const out = [];
  let last = 0;
  RUBY_RE.lastIndex = 0;
  let m;
  while ((m = RUBY_RE.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    out.push({ base: m[1] ?? m[3], rt: m[2] ?? m[4] });
    last = RUBY_RE.lastIndex;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

/** Text without readings (as Japanese people write it). */
export function rubyToJa(src) {
  return parseRuby(src).map((s) => (s.text != null ? s.text : s.base)).join('');
}

/** Full reading in kana. */
export function rubyToKana(src) {
  return parseRuby(src).map((s) => (s.text != null ? s.text : s.rt)).join('');
}

/** Whether the string has kanji without a reading (data check). */
export function kanjiWithoutReading(src) {
  const plain = parseRuby(src).filter((s) => s.text != null).map((s) => s.text).join('');
  return new RegExp(`[${KANJI}]`).test(plain.replace(/〇/g, ''));
}

/** Fill in ja/kana from ruby when missing. */
export function completeItem(item) {
  const it = { ...item };
  if (it.ruby) {
    if (!it.ja) it.ja = rubyToJa(it.ruby);
    if (!it.kana) it.kana = rubyToKana(it.ruby);
  } else if (it.ja && !it.ruby) {
    it.ruby = it.ja;
    if (!it.kana) it.kana = it.ja;
  }
  return it;
}

/** Text for TTS. */
export function ttsText(item) {
  const t = item.tts || item.ja || '';
  // Japanese read the 〇〇 placeholder aloud as "marumaru", so template phrases sound complete
  return t.replace(/〇〇/g, 'まるまる').replace(/〇/g, 'まる');
}

// ---------- Search ----------
export function kataToHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const MACRON = { 'ā': 'a', 'ī': 'i', 'ū': 'u', 'ē': 'e', 'ō': 'o', 'â': 'a', 'î': 'i', 'û': 'u', 'ê': 'e', 'ô': 'o' };

/** Normalise: case, NFKC, katakana → hiragana, macrons and long vowels, no spaces/punctuation. */
export function normalize(s) {
  if (!s) return '';
  let t = String(s).normalize('NFKC').toLowerCase();
  t = kataToHira(t).replace(/ー/g, '');
  t = t.replace(/[āīūēōâîûêô]/g, (c) => MACRON[c]);
  // long vowels without macrons: kohii / koohii / kōhī, raamen / rāmen, takushii / takushī (QA B10)
  t = t.replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u').replace(/aa/g, 'a').replace(/ii/g, 'i').replace(/ee/g, 'e');
  t = t.replace(/[\s\-'’.,!?！？。、・「」『』()（）〜～:：;；"“”«»…]/g, '');
  return t;
}

export function searchFields(item) {
  return [item.en, item.ja, item.kana, item.romaji, item.note, item.pattern, ...(item.tags || [])]
    .filter(Boolean).map(normalize);
}

/** Search: every query word must match; matches at the start of a field rank higher. */
export function search(items, query, limit = 100) {
  const words = String(query || '').split(/\s+/).map(normalize).filter(Boolean);
  if (!words.length) return [];
  const scored = [];
  for (const it of items) {
    const f = it._search || (it._search = searchFields(it));
    let score = 0, ok = true;
    for (const w of words) {
      let best = -1;
      for (let i = 0; i < f.length; i++) {
        const pos = f[i].indexOf(w);
        if (pos === 0) best = Math.max(best, 3);
        else if (pos > 0) best = Math.max(best, 1);
      }
      if (best < 0) { ok = false; break; }
      score += best;
    }
    if (ok) scored.push({ it, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.it);
}

// ---------- Kana → Hepburn (for data checks; convention in PLAN.md 1.6) ----------
const BASE = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゔ: 'vu',
};
const DIGRAPH = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho', ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo', ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo', じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo', ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo', ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  // extended katakana (after conversion to hiragana)
  てぃ: 'ti', でぃ: 'di', ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  しぇ: 'she', じぇ: 'je', ちぇ: 'che', とぅ: 'tu', どぅ: 'du', ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  つぁ: 'tsa', てゅ: 'tyu', でゅ: 'dyu', ふゅ: 'fyu',
};
const LONG = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };

/**
 * Kana → Hepburn with macrons (no spaces; particles read as letters: は=ha, へ=he).
 * Long vowels: おう/おお → ō, うう → ū, ー → macron; えい → ei, いい → ii.
 * Limitation: unaware of morpheme boundaries (思う → omō instead of omou) — a human reviews differences.
 */
export function kanaToHepburn(input, { long = true } = {}) {
  const orig = String(input).normalize('NFKC');
  const s = kataToHira(orig);
  let out = '';
  let geminate = false;
  let lastN = false; // previous syllable was ん
  for (let i = 0; i < s.length; i++) {
    const c = s[i], two = s.slice(i, i + 2);
    let syl = null;
    if (DIGRAPH[two]) { syl = DIGRAPH[two]; i++; }
    else if (c === 'っ') { geminate = true; lastN = false; continue; }
    else if (c === 'ー') {
      const v = out.slice(-1);
      if (LONG[v]) out = out.slice(0, -1) + LONG[v];
      lastN = false;
      continue;
    } else if (BASE[c]) syl = BASE[c];
    else { out += c; geminate = false; lastN = false; continue; }

    if (geminate) {
      syl = (syl.startsWith('ch') ? 't' : syl[0]) + syl;
      geminate = false;
    }
    if (lastN && /^[aiueoy]/.test(syl)) out += "'"; // ん before a vowel/y → n'
    const prev = out.slice(-1);
    // katakana always marks length with ー, so vowels are not merged (ラストオーダー = rasuto ōdā)
    const isKata = /[゠-ヿ]/.test(orig[i]);
    const isSingleVowel = syl.length === 1 && 'aiueo'.includes(syl) && c !== 'ん' && !isKata;
    lastN = c === 'ん' && syl === 'n';
    // long vowels: おう/おお → ō, うう → ū, ああ → ā (not after ん / n')
    if (long && isSingleVowel && !out.endsWith("'")) {
      if (syl === 'u' && (prev === 'o' || prev === 'u')) { out = out.slice(0, -1) + LONG[prev]; continue; }
      if (syl === 'o' && prev === 'o' && c === 'お') { out = out.slice(0, -1) + 'ō'; continue; }
      if (syl === 'a' && prev === 'a' && c === 'あ') { out = out.slice(0, -1) + 'ā'; continue; }
    }
    out += syl;
  }
  return out;
}

/** Comparable romaji: no spaces/hyphens/apostrophes/punctuation; particles wa/e → ha/he. */
export function romajiComparable(romaji) {
  return String(romaji)
    .toLowerCase()
    .replace(/(^|[\s,.!?])wa(?=[\s,.!?]|$)/g, '$1ha')
    .replace(/(^|[\s,.!?])e(?=[\s,.!?]|$)/g, '$1he')
    .replace(/[\s\-.,!?'’"«»()〇]/g, '');
}

export function kanaComparable(kana, opts) {
  return kanaToHepburn(String(kana).replace(/[\s、。・！？!?「」〇]/g, ''), opts).replace(/'/g, '');
}

const MACRON_ALT = { 'ō': '(?:ō|ou|oo)', 'ū': '(?:ū|uu)', 'ā': '(?:ā|aa)', 'ī': '(?:ī|ii)', 'ē': '(?:ē|ee|ei)' };
const escapeRe = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Strict romaji ↔ kana comparison without false alarms at word boundaries
 * (を+お, は+あ, の+う): kana is transliterated WITHOUT merging vowels, and each macron
 * in the romaji may stand for a doubled vowel (ō = ou|oo, ū = uu, ā = aa, ī = ii, ē = ee|ei).
 * A missing macron (arigato instead of arigatō) is still an error.
 */
export function romajiMatchesKana(romaji, kana) {
  const r = romajiComparable(romaji);
  const raw = kanaComparable(kana, { long: false });
  if (r === raw || r === kanaComparable(kana)) return true;
  const src = [...r].map((c) => MACRON_ALT[c] || escapeRe(c)).join('');
  return new RegExp('^' + src + '$').test(raw);
}
