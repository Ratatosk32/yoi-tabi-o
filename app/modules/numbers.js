// Японские числа, цены, время, даты и счётные суффиксы.
// Чистые функции (без DOM) — тестируются в Node: tests/numbers.test.mjs.
// Каждая функция возвращает { kana, romaji } (Хэпбёрн с макронами, см. PLAN.md 1.6).

const DIGIT = [
  null,
  ['いち', 'ichi'], ['に', 'ni'], ['さん', 'san'], ['よん', 'yon'], ['ご', 'go'],
  ['ろく', 'roku'], ['なな', 'nana'], ['はち', 'hachi'], ['きゅう', 'kyū'],
];
const TEN = [ // 10, 20 … 90
  null,
  ['じゅう', 'jū'], ['にじゅう', 'nijū'], ['さんじゅう', 'sanjū'], ['よんじゅう', 'yonjū'], ['ごじゅう', 'gojū'],
  ['ろくじゅう', 'rokujū'], ['ななじゅう', 'nanajū'], ['はちじゅう', 'hachijū'], ['きゅうじゅう', 'kyūjū'],
];
const HUNDRED = [ // 100 … 900 (звуковые изменения: 300, 600, 800)
  null,
  ['ひゃく', 'hyaku'], ['にひゃく', 'nihyaku'], ['さんびゃく', 'sanbyaku'], ['よんひゃく', 'yonhyaku'], ['ごひゃく', 'gohyaku'],
  ['ろっぴゃく', 'roppyaku'], ['ななひゃく', 'nanahyaku'], ['はっぴゃく', 'happyaku'], ['きゅうひゃく', 'kyūhyaku'],
];
const THOUSAND = [ // 1000 … 9000 (3000, 8000)
  null,
  ['せん', 'sen'], ['にせん', 'nisen'], ['さんぜん', 'sanzen'], ['よんせん', 'yonsen'], ['ごせん', 'gosen'],
  ['ろくせん', 'rokusen'], ['ななせん', 'nanasen'], ['はっせん', 'hassen'], ['きゅうせん', 'kyūsen'],
];

/** Части числа 1..9999 как массив [kana, romaji]. */
function under10000(n, { manBlock = false } = {}) {
  const parts = [];
  const th = Math.floor(n / 1000), h = Math.floor(n / 100) % 10, t = Math.floor(n / 10) % 10, o = n % 10;
  if (th) {
    // 1000万 = いっせんまん (в блоке перед 万 «1000» произносится いっせん)
    if (th === 1 && manBlock) parts.push(['いっせん', 'issen']);
    else parts.push(THOUSAND[th]);
  }
  if (h) parts.push(HUNDRED[h]);
  if (t) parts.push(TEN[t]);
  if (o) parts.push(DIGIT[o]);
  return parts;
}

/** Склейка ромадзи по Хэпбёрну: n перед гласной/y → n' (1001 = sen'ichi). */
export function joinRomaji(pieces, sep = '') {
  return pieces.reduce((acc, p) => (acc && sep === '' && /n$/.test(acc) && /^[aiueoy]/.test(p) ? acc + "'" + p : acc + (acc && sep ? sep : '') + p), '');
}

function join(parts, sep = '') {
  return {
    kana: parts.map((p) => p[0]).join(''),
    romaji: sep ? parts.map((p) => p[1]).join(sep) : joinRomaji(parts.map((p) => p[1])),
  };
}

/**
 * Число 0..99 999 999 → чтение. Ромадзи: группа 万 отделяется пробелом
 * (128000 → "jūniman hassen").
 */
export function numberParts(n) {
  if (!Number.isInteger(n) || n < 0 || n > 99999999) throw new RangeError('0..99999999: ' + n);
  if (n === 0) return [['ゼロ', 'zero']];
  const man = Math.floor(n / 10000), rest = n % 10000;
  const groups = [];
  if (man) {
    const mp = under10000(man, { manBlock: true });
    groups.push([mp.map((p) => p[0]).join('') + 'まん', joinRomaji(mp.map((p) => p[1])) + 'man']);
  }
  if (rest) {
    const rp = under10000(rest);
    groups.push([rp.map((p) => p[0]).join(''), joinRomaji(rp.map((p) => p[1]))]);
  }
  return groups;
}

export function numberReading(n) {
  return join(numberParts(n), ' ');
}

/** Цена в иенах: 4円 = よえん, 300円 = さんびゃくえん, 128000円 = じゅうにまんはっせんえん. */
export function yenReading(n) {
  const r = numberReading(n);
  let { kana, romaji } = r;
  if (n % 10 === 4 && n !== 0) { // …4円 → よえん
    kana = kana.replace(/よん$/, 'よ');
    romaji = romaji.replace(/yon$/, 'yo');
  }
  return { kana: kana + 'えん', romaji: romaji + '-en' };
}

/** Запись цены «как на ценнике/в речи»: 128000 → "12万8千円", 125500 → "12万5,500円", 3000 → "3千円". */
export function yenMixed(n) {
  const man = Math.floor(n / 10000), rest = n % 10000;
  let s = '';
  if (man) s += man + '万';
  if (rest) {
    if (rest % 1000 === 0) s += rest / 1000 + '千';
    else s += rest.toLocaleString('en-US');
  }
  if (!s) s = '0';
  return s + '円';
}

// ---------- Время ----------
const HOUR = {
  0: ['れいじ', 'reiji'], 1: ['いちじ', 'ichiji'], 2: ['にじ', 'niji'], 3: ['さんじ', 'sanji'], 4: ['よじ', 'yoji'],
  5: ['ごじ', 'goji'], 6: ['ろくじ', 'rokuji'], 7: ['しちじ', 'shichiji'], 8: ['はちじ', 'hachiji'], 9: ['くじ', 'kuji'],
  10: ['じゅうじ', 'jūji'], 11: ['じゅういちじ', 'jūichiji'], 12: ['じゅうにじ', 'jūniji'],
};
function hourParts(h) {
  if (!Number.isInteger(h) || h < 0 || h > 24) throw new RangeError('hour ' + h);
  if (HOUR[h]) return HOUR[h];
  const t = Math.floor(h / 10), o = h % 10;
  const tens = t === 1 ? ['じゅう', 'jū'] : ['にじゅう', 'nijū'];
  if (o === 0) return [tens[0] + 'じ', tens[1] + 'ji'];
  const oh = HOUR[o];
  return [tens[0] + oh[0], tens[1] + oh[1]];
}

const MIN_ONES = [ // 0..9 минут (для 0 — только в составе десятков)
  null,
  ['いっぷん', 'ippun'], ['にふん', 'nifun'], ['さんぷん', 'sanpun'], ['よんぷん', 'yonpun'], ['ごふん', 'gofun'],
  ['ろっぷん', 'roppun'], ['ななふん', 'nanafun'], ['はっぷん', 'happun'], ['きゅうふん', 'kyūfun'],
];
const MIN_TENS_EXACT = [ // 10, 20, … 50 минут
  null, ['じゅっぷん', 'juppun'], ['にじゅっぷん', 'nijuppun'], ['さんじゅっぷん', 'sanjuppun'],
  ['よんじゅっぷん', 'yonjuppun'], ['ごじゅっぷん', 'gojuppun'],
];

export function minuteReading(m) {
  if (!Number.isInteger(m) || m < 1 || m > 59) throw new RangeError('minute ' + m);
  const t = Math.floor(m / 10), o = m % 10;
  if (o === 0) { const p = MIN_TENS_EXACT[t]; return { kana: p[0], romaji: p[1] }; }
  const pre = t === 0 ? ['', ''] : t === 1 ? ['じゅう', 'jū'] : [DIGIT[t][0] + 'じゅう', DIGIT[t][1] + 'jū'];
  return { kana: pre[0] + MIN_ONES[o][0], romaji: pre[1] + MIN_ONES[o][1] };
}

/** 9:30 → くじはん (half=true) или くじさんじゅっぷん. */
export function timeReading(h, m = 0, { half = true } = {}) {
  const hp = hourParts(h);
  if (m === 0) return { kana: hp[0], romaji: hp[1] };
  if (m === 30 && half) return { kana: hp[0] + 'はん', romaji: hp[1] + ' han' };
  const mr = minuteReading(m);
  return { kana: hp[0] + mr.kana, romaji: hp[1] + ' ' + mr.romaji };
}

// ---------- Даты ----------
const DAY = [null,
  ['ついたち', 'tsuitachi'], ['ふつか', 'futsuka'], ['みっか', 'mikka'], ['よっか', 'yokka'], ['いつか', 'itsuka'],
  ['むいか', 'muika'], ['なのか', 'nanoka'], ['ようか', 'yōka'], ['ここのか', 'kokonoka'], ['とおか', 'tōka'],
  ['じゅういちにち', 'jūichinichi'], ['じゅうににち', 'jūninichi'], ['じゅうさんにち', 'jūsannichi'], ['じゅうよっか', 'jūyokka'],
  ['じゅうごにち', 'jūgonichi'], ['じゅうろくにち', 'jūrokunichi'], ['じゅうしちにち', 'jūshichinichi'], ['じゅうはちにち', 'jūhachinichi'],
  ['じゅうくにち', 'jūkunichi'], ['はつか', 'hatsuka'], ['にじゅういちにち', 'nijūichinichi'], ['にじゅうににち', 'nijūninichi'],
  ['にじゅうさんにち', 'nijūsannichi'], ['にじゅうよっか', 'nijūyokka'], ['にじゅうごにち', 'nijūgonichi'], ['にじゅうろくにち', 'nijūrokunichi'],
  ['にじゅうしちにち', 'nijūshichinichi'], ['にじゅうはちにち', 'nijūhachinichi'], ['にじゅうくにち', 'nijūkunichi'], ['さんじゅうにち', 'sanjūnichi'],
  ['さんじゅういちにち', 'sanjūichinichi'],
];
const MONTH = [null,
  ['いちがつ', 'ichigatsu'], ['にがつ', 'nigatsu'], ['さんがつ', 'sangatsu'], ['しがつ', 'shigatsu'], ['ごがつ', 'gogatsu'],
  ['ろくがつ', 'rokugatsu'], ['しちがつ', 'shichigatsu'], ['はちがつ', 'hachigatsu'], ['くがつ', 'kugatsu'], ['じゅうがつ', 'jūgatsu'],
  ['じゅういちがつ', 'jūichigatsu'], ['じゅうにがつ', 'jūnigatsu'],
];
export const WEEKDAYS = [ // getDay(): 0 = воскресенье
  { ja: '日曜日', kana: 'にちようび', romaji: 'nichiyōbi', ru: 'воскресенье', short: '日' },
  { ja: '月曜日', kana: 'げつようび', romaji: 'getsuyōbi', ru: 'понедельник', short: '月' },
  { ja: '火曜日', kana: 'かようび', romaji: 'kayōbi', ru: 'вторник', short: '火' },
  { ja: '水曜日', kana: 'すいようび', romaji: 'suiyōbi', ru: 'среда', short: '水' },
  { ja: '木曜日', kana: 'もくようび', romaji: 'mokuyōbi', ru: 'четверг', short: '木' },
  { ja: '金曜日', kana: 'きんようび', romaji: 'kin\'yōbi', ru: 'пятница', short: '金' },
  { ja: '土曜日', kana: 'どようび', romaji: 'doyōbi', ru: 'суббота', short: '土' },
];

export function dateReading(month, day) {
  const mo = MONTH[month], d = DAY[day];
  if (!mo || !d) throw new RangeError(`date ${month}/${day}`);
  return { kana: mo[0] + d[0], romaji: mo[1] + ' ' + d[1] };
}

// ---------- Счётные суффиксы (1..10) ----------
export const COUNTERS = {
  tsu: { label: '～つ (общий счёт предметов)', ja: 'つ', items: [
    ['ひとつ', 'hitotsu'], ['ふたつ', 'futatsu'], ['みっつ', 'mittsu'], ['よっつ', 'yottsu'], ['いつつ', 'itsutsu'],
    ['むっつ', 'muttsu'], ['ななつ', 'nanatsu'], ['やっつ', 'yattsu'], ['ここのつ', 'kokonotsu'], ['とお', 'tō']] },
  nin: { label: '～人 (люди)', ja: '人', items: [
    ['ひとり', 'hitori'], ['ふたり', 'futari'], ['さんにん', 'sannin'], ['よにん', 'yonin'], ['ごにん', 'gonin'],
    ['ろくにん', 'rokunin'], ['ななにん', 'nananin'], ['はちにん', 'hachinin'], ['きゅうにん', 'kyūnin'], ['じゅうにん', 'jūnin']] },
  mai: { label: '～枚 (плоское: билеты, полотенца)', ja: '枚', items: [
    ['いちまい', 'ichimai'], ['にまい', 'nimai'], ['さんまい', 'sanmai'], ['よんまい', 'yonmai'], ['ごまい', 'gomai'],
    ['ろくまい', 'rokumai'], ['ななまい', 'nanamai'], ['はちまい', 'hachimai'], ['きゅうまい', 'kyūmai'], ['じゅうまい', 'jūmai']] },
  hon: { label: '～本 (длинное: бутылки, зонты)', ja: '本', items: [
    ['いっぽん', 'ippon'], ['にほん', 'nihon'], ['さんぼん', 'sanbon'], ['よんほん', 'yonhon'], ['ごほん', 'gohon'],
    ['ろっぽん', 'roppon'], ['ななほん', 'nanahon'], ['はっぽん', 'happon'], ['きゅうほん', 'kyūhon'], ['じゅっぽん', 'juppon']] },
  ko: { label: '～個 (мелкие предметы)', ja: '個', items: [
    ['いっこ', 'ikko'], ['にこ', 'niko'], ['さんこ', 'sanko'], ['よんこ', 'yonko'], ['ごこ', 'goko'],
    ['ろっこ', 'rokko'], ['ななこ', 'nanako'], ['はっこ', 'hakko'], ['きゅうこ', 'kyūko'], ['じゅっこ', 'jukko']] },
};

export function counterReading(key, n) {
  const c = COUNTERS[key];
  if (!c || n < 1 || n > 10) throw new RangeError(`${key} ${n}`);
  const [kana, romaji] = c.items[n - 1];
  return { kana, romaji };
}

// ---------- Генераторы заданий ----------
export const PRICE_RANGES = {
  konbini: { label: 'Конбини', min: 100, max: 1500, step: 10 },
  cafe: { label: 'Кафе', min: 800, max: 8000, step: 10 },
  gear: { label: 'Техника', min: 20000, max: 250000, step: 100 },
  all: { label: 'Всё 100–250 000', min: 100, max: 250000, step: 10 },
};

export function randomPrice(rangeKey = 'all', rnd = Math.random) {
  const r = PRICE_RANGES[rangeKey] || PRICE_RANGES.all;
  // Для техники чаще «круглые» цены (…800, …000), как на ценниках.
  let step = r.step;
  if (rangeKey === 'gear' && rnd() < 0.6) step = 1000;
  const k = Math.floor(rnd() * ((r.max - r.min) / step + 1));
  return r.min + k * step;
}

export function randomTime(rnd = Math.random) {
  const h = 1 + Math.floor(rnd() * 23);
  const mins = [0, 0, 5, 10, 15, 20, 30, 30, 40, 45, 50, 1, 3, 6, 8];
  return { h, m: mins[Math.floor(rnd() * mins.length)] };
}

/** Разбор ответа пользователя: "12,800" / "12 800" / "１２８００" → 12800. */
export function parseDigits(s) {
  const t = String(s).normalize('NFKC').replace(/[\s,.'’円¥]/g, '');
  return /^\d+$/.test(t) ? Number(t) : NaN;
}
