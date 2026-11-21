const DIGITS = [
  { h: '零', p: 'líng' }, { h: '一', p: 'yī' }, { h: '二', p: 'èr' }, { h: '三', p: 'sān' }, { h: '四', p: 'sì' },
  { h: '五', p: 'wǔ' }, { h: '六', p: 'liù' }, { h: '七', p: 'qī' }, { h: '八', p: 'bā' }, { h: '九', p: 'jiǔ' },
];
const LIANG = { h: '两', p: 'liǎng' };
const ZERO = DIGITS[0];
const POSITION_UNITS = [null, { h: '十', p: 'shí' }, { h: '百', p: 'bǎi' }, { h: '千', p: 'qiān' }];
const GROUP_UNITS = [null, { h: '万', p: 'wàn' }, { h: '亿', p: 'yì' }];
const UNIT = {
  kuai: { h: '块', p: 'kuài' }, mao: { h: '毛', p: 'máo' }, fen: { h: '分', p: 'fēn' },
  yuan: { h: '元', p: 'yuán' }, jiao: { h: '角', p: 'jiǎo' },
  dian: { h: '点', p: 'diǎn' }, ban: { h: '半', p: 'bàn' }, ke: { h: '刻', p: 'kè' }, zheng: { h: '整', p: 'zhěng' },
};
const SANDHI_TRIGGERS = new Set(['百', '千', '万', '亿', '块', '毛', '分', '元', '角', '点', '刻']);
export const MAX_NUMBER = 999999999999;

const TONE_OF = { 'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1, 'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
  'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3, 'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4 };

export function toneOf(syllable) {
  for (const c of syllable) if (TONE_OF[c]) return TONE_OF[c];
  return 0;
}

function digitWord(d, position) {
  if (d === 2 && position >= 2) return LIANG;
  return DIGITS[d];
}

function groupTokens(value, isFirstGroup) {
  const out = [];
  let pendingZero = false;
  for (let position = 3; position >= 0; position--) {
    const d = Math.floor(value / 10 ** position) % 10;
    if (d === 0) {
      if (out.length) pendingZero = true;
      continue;
    }
    if (pendingZero) { out.push(ZERO); pendingZero = false; }
    const bareTen = position === 1 && d === 1 && isFirstGroup && out.length === 0;
    if (!bareTen) out.push(digitWord(d, position));
    if (POSITION_UNITS[position]) out.push(POSITION_UNITS[position]);
  }
  return out;
}

export function numberTokens(n) {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NUMBER) throw new RangeError(`not a supported number: ${n}`);
  if (n === 0) return [ZERO];
  const groups = [n % 10000, Math.floor(n / 10000) % 10000, Math.floor(n / 1e8)];
  const out = [];
  let emittedHigher = false;
  let gapSinceHigher = false;
  for (let g = 2; g >= 0; g--) {
    const value = groups[g];
    if (value === 0) {
      if (emittedHigher) gapSinceHigher = true;
      continue;
    }
    if (emittedHigher && (gapSinceHigher || value < 1000)) out.push(ZERO);
    if (value === 2 && g > 0) out.push(LIANG);
    else out.push(...groupTokens(value, !emittedHigher));
    if (GROUP_UNITS[g]) out.push(GROUP_UNITS[g]);
    emittedHigher = true;
    gapSinceHigher = false;
  }
  return out;
}

function countTokens(n) {
  return n === 2 ? [LIANG] : numberTokens(n);
}

export function applyYiSandhi(tokens) {
  return tokens.map((t, i) => {
    if (t.h !== '一') return t;
    const next = tokens[i + 1];
    const prev = tokens[i - 1];
    if (!next || !SANDHI_TRIGGERS.has(next.h)) return t;
    if (prev && (prev.h === '十' || DIGITS.some((d) => d.h === prev.h))) return t;
    return { h: '一', p: toneOf(next.p) === 4 ? 'yí' : 'yì' };
  });
}

export function render(tokens) {
  const final = applyYiSandhi(tokens);
  return { hanzi: final.map((t) => t.h).join(''), pinyin: final.map((t) => t.p).join(' ') };
}

export function numberReading(n) {
  return render(numberTokens(n));
}

function splitFen(totalFen) {
  if (!Number.isInteger(totalFen) || totalFen < 0) throw new RangeError(`not an amount in fen: ${totalFen}`);
  return { yuan: Math.floor(totalFen / 100), jiao: Math.floor((totalFen % 100) / 10), fen: totalFen % 10 };
}

function amountTokens({ yuan, jiao, fen }, units, { dropLastUnit }) {
  const out = [];
  const parts = [[yuan, units[0]], [jiao, units[1]], [fen, units[2]]];
  const lastNonZero = parts.reduce((last, [v], i) => (v ? i : last), -1);
  let hasHigher = false;
  let skipped = false;
  parts.forEach(([value, unit], i) => {
    if (!value) {
      if (hasHigher && i < lastNonZero) skipped = true;
      return;
    }
    if (skipped) { out.push(ZERO); skipped = false; }
    const isLast = i === lastNonZero;
    const trailingSmallUnit = isLast && hasHigher && dropLastUnit && out[out.length - 1] !== ZERO;
    out.push(...(hasHigher && i > 0 ? numberTokens(value) : countTokens(value)));
    if (!trailingSmallUnit) out.push(unit);
    hasHigher = true;
  });
  if (!out.length) out.push(ZERO, units[0]);
  return out;
}

export function priceReading(totalFen) {
  const parts = splitFen(totalFen);
  const spoken = render(amountTokens(parts, [UNIT.kuai, UNIT.mao, UNIT.fen], { dropLastUnit: true }));
  const full = render(amountTokens(parts, [UNIT.kuai, UNIT.mao, UNIT.fen], { dropLastUnit: false }));
  const written = render(amountTokens(parts, [UNIT.yuan, UNIT.jiao, UNIT.fen], { dropLastUnit: false }));
  return { ...spoken, full, written };
}

export function formatYuan(totalFen) {
  const { yuan } = splitFen(totalFen);
  const cents = totalFen % 100;
  const whole = yuan.toLocaleString('en-US');
  return '¥' + (cents ? `${whole}.${String(cents).padStart(2, '0')}` : whole);
}

export function parseYuan(input) {
  const s = String(input || '').normalize('NFKC').trim().replace(/[¥￥元块\s]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  const m = s.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return NaN;
  return Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'));
}

export function timeReading(hour, minute) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 24 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError(`not a clock time: ${hour}:${minute}`);
  }
  const hourTokens = [...countTokens(hour), UNIT.dian];
  const minuteNumber = (m) => (m < 10 ? [ZERO, ...numberTokens(m)] : numberTokens(m));
  const withMinutes = (m) => [...hourTokens, ...minuteNumber(m), UNIT.fen];
  const alternatives = [];
  let main;
  if (minute === 0) {
    main = hourTokens;
    alternatives.push([...hourTokens, UNIT.zheng]);
  } else if (minute === 30) {
    main = [...hourTokens, UNIT.ban];
    alternatives.push(withMinutes(30));
  } else if (minute === 15) {
    main = [...hourTokens, DIGITS[1], UNIT.ke];
    alternatives.push(withMinutes(15));
  } else if (minute === 45) {
    main = withMinutes(45);
    alternatives.push([...hourTokens, DIGITS[3], UNIT.ke]);
  } else {
    main = withMinutes(minute);
    if (minute >= 10) alternatives.push([...hourTokens, ...numberTokens(minute)]);
  }
  return { ...render(main), alt: alternatives.map(render) };
}

export const PRICE_RANGES_ZH = {
  snack: { label: '¥1–20', min: 1, max: 19, decimals: true },
  meal: { label: '¥10–200', min: 10, max: 199, decimals: false },
  shop: { label: '¥100–9,999', min: 100, max: 9999, decimals: false },
  big: { label: '¥10,000+', min: 10000, max: 999999, decimals: false },
};

function withInnerZero(n, rnd) {
  const digits = String(n).split('');
  if (digits.length < 3) return n;
  const at = 1 + Math.floor(rnd() * (digits.length - 2));
  digits[at] = '0';
  return Number(digits.join(''));
}

export function randomPriceZh(range = 'snack', rnd = Math.random) {
  const r = PRICE_RANGES_ZH[range] || PRICE_RANGES_ZH.snack;
  let yuan = r.min + Math.floor(rnd() * (r.max - r.min + 1));
  if (!r.decimals && rnd() < 0.35) yuan = Math.max(r.min, withInnerZero(yuan, rnd));
  const jiao = r.decimals && rnd() < 0.6 ? 1 + Math.floor(rnd() * 9) : 0;
  return yuan * 100 + jiao * 10;
}

export function randomTimeZh(rnd = Math.random) {
  const hour = 1 + Math.floor(rnd() * 12);
  const minute = rnd() < 0.15 ? 1 + Math.floor(rnd() * 9) : 5 * Math.floor(rnd() * 12);
  return { h: hour, m: minute };
}

export const WEEKDAYS_ZH = [
  { hanzi: '星期一', pinyin: 'xīngqīyī', en: 'Monday' },
  { hanzi: '星期二', pinyin: 'xīngqī\'èr', en: 'Tuesday' },
  { hanzi: '星期三', pinyin: 'xīngqīsān', en: 'Wednesday' },
  { hanzi: '星期四', pinyin: 'xīngqīsì', en: 'Thursday' },
  { hanzi: '星期五', pinyin: 'xīngqīwǔ', en: 'Friday' },
  { hanzi: '星期六', pinyin: 'xīngqīliù', en: 'Saturday' },
  { hanzi: '星期天', pinyin: 'xīngqītiān', en: 'Sunday (also 星期日 xīngqīrì)' },
];
