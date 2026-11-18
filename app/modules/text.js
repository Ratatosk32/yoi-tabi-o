// Текстовые утилиты: фуригана, нормализация для поиска, кана → Хэпбёрн.
// Чистые функции, без DOM.

// ---------- Фуригана ----------
// Формат поля `ruby`:
//   袋[ふくろ]はいりません      — чтение относится к непрерывной группе кандзи перед [ ]
//   {Wi-Fi|ワイファイ}          — явная пара «основа|чтение» для не-кандзи
const KANJI = '\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF々〆ヶ';
const RUBY_RE = new RegExp(`\\{([^|{}]+)\\|([^{}]+)\\}|([${KANJI}]+)\\[([^\\]]+)\\]`, 'g');

/** Разбор в сегменты: [{ base, rt }] или [{ text }]. */
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

/** Текст без чтений (как пишут японцы). */
export function rubyToJa(src) {
  return parseRuby(src).map((s) => (s.text != null ? s.text : s.base)).join('');
}

/** Полное чтение каной. */
export function rubyToKana(src) {
  return parseRuby(src).map((s) => (s.text != null ? s.text : s.rt)).join('');
}

/** Есть ли в строке кандзи без чтения (для проверки данных). */
export function kanjiWithoutReading(src) {
  const plain = parseRuby(src).filter((s) => s.text != null).map((s) => s.text).join('');
  return new RegExp(`[${KANJI}]`).test(plain.replace(/〇/g, ''));
}

/** Дополнить элемент полями ja/kana из ruby, если их нет. */
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

/** Текст для TTS: без плейсхолдеров 〇〇. */
export function ttsText(item) {
  const t = item.tts || item.ja || '';
  // 〇〇 вслух японцы читают «まるまる» — фраза-шаблон звучит целиком, а не обрывается
  return t.replace(/〇〇/g, 'まるまる').replace(/〇/g, 'まる');
}

// ---------- Поиск ----------
export function kataToHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const MACRON = { 'ā': 'a', 'ī': 'i', 'ū': 'u', 'ē': 'e', 'ō': 'o', 'â': 'a', 'î': 'i', 'û': 'u', 'ê': 'e', 'ô': 'o' };

/** Нормализация: регистр, NFKC, ё→е, катакана→хирагана, макроны и долгие гласные, без пробелов/знаков. */
export function normalize(s) {
  if (!s) return '';
  let t = String(s).normalize('NFKC').toLowerCase().replace(/ё/g, 'е');
  t = kataToHira(t).replace(/ー/g, '');
  t = t.replace(/[āīūēōâîûêô]/g, (c) => MACRON[c]);
  // долгие гласные без макронов: kohii / koohii / kōhī, raamen / rāmen, takushii / takushī (B10)
  t = t.replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u').replace(/aa/g, 'a').replace(/ii/g, 'i').replace(/ee/g, 'e');
  t = t.replace(/[\s\-'’.,!?！？。、・「」『』()（）〜～:：;；"“”«»…]/g, '');
  return t;
}

export function searchFields(item) {
  return [item.ru, item.ja, item.kana, item.romaji, item.note, item.pattern, ...(item.tags || [])]
    .filter(Boolean).map(normalize);
}

/** Поиск: все слова запроса должны встретиться; ранжирование — точное начало выше. */
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

// ---------- Кана → Хэпбёрн (для проверки данных; соглашение PLAN.md 1.6) ----------
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
  // расширенная катакана (после перевода в хирагану)
  てぃ: 'ti', でぃ: 'di', ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  しぇ: 'she', じぇ: 'je', ちぇ: 'che', とぅ: 'tu', どぅ: 'du', ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  つぁ: 'tsa', てゅ: 'tyu', でゅ: 'dyu', ふゅ: 'fyu',
};
const LONG = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };

/**
 * Кана → Хэпбёрн c макронами (без пробелов, частицы читаются как буквы: は=ha, へ=he).
 * Долгие: おう/おお → ō, うう → ū, ー → макрон; えい → ei, いい → ii.
 * Ограничение: не знает границ морфем (思う → omō вместо omou) — расхождения смотрит человек.
 */
export function kanaToHepburn(input, { long = true } = {}) {
  const orig = String(input).normalize('NFKC');
  const s = kataToHira(orig);
  let out = '';
  let geminate = false;
  let lastN = false; // предыдущий слог — ん
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
    if (lastN && /^[aiueoy]/.test(syl)) out += "'"; // ん перед гласной/y → n'
    const prev = out.slice(-1);
    // в катакане долгота всегда пишется через ー, поэтому гласные не склеиваем (ラストオーダー = rasuto ōdā)
    const isKata = /[゠-ヿ]/.test(orig[i]);
    const isSingleVowel = syl.length === 1 && 'aiueo'.includes(syl) && c !== 'ん' && !isKata;
    lastN = c === 'ん' && syl === 'n';
    // долгие гласные: おう/おお → ō, うう → ū, ああ → ā (не после ん и не после n')
    if (long && isSingleVowel && !out.endsWith("'")) {
      if (syl === 'u' && (prev === 'o' || prev === 'u')) { out = out.slice(0, -1) + LONG[prev]; continue; }
      if (syl === 'o' && prev === 'o' && c === 'お') { out = out.slice(0, -1) + 'ō'; continue; }
      if (syl === 'a' && prev === 'a' && c === 'あ') { out = out.slice(0, -1) + 'ā'; continue; }
    }
    out += syl;
  }
  return out;
}

/** Сравнимая форма ромадзи: без пробелов/дефисов/апострофов/знаков, частицы wa/e → ha/he. */
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
 * Строгое сравнение ромадзи с каной без ложных срабатываний на границах слов
 * (を+お, は+あ, の+う): кана транслитерируется БЕЗ склейки гласных, а каждый макрон
 * в ромадзи может означать удвоенную гласную (ō = ou|oo, ū = uu, ā = aa, ī = ii, ē = ee|ei).
 * Пропущенный макрон (arigato вместо arigatō) по-прежнему считается ошибкой.
 */
export function romajiMatchesKana(romaji, kana) {
  const r = romajiComparable(romaji);
  const raw = kanaComparable(kana, { long: false });
  if (r === raw || r === kanaComparable(kana)) return true;
  const src = [...r].map((c) => MACRON_ALT[c] || escapeRe(c)).join('');
  return new RegExp('^' + src + '$').test(raw);
}
