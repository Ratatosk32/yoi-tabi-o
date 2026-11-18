// Independent reference ("oracle") for Japanese number / price / time / date / counter readings.
// Written from first principles by QA, WITHOUT looking at app/modules/numbers.js.
//
// Every function returns { kana, romaji, alts } where `alts` is a list of OTHER kana readings
// that are also acceptable (a disagreement with an alt is a "convention" note, not a bug).
//
// ---------------------------------------------------------------------------------------------
// CONVENTIONS (decisions documented here; see also REPORT.md section "Number oracle")
//  C1. 1000 standing alone or as the thousands digit of the lower (units) group = せん.
//      As the thousands digit of the 万 group (10,000,000..19,999,999) the standard reading of
//      一千万 is いっせんまん (NHK / dictionary style); せんまん is common in speech.
//      Primary: いっせんまん; alt: せんまん.  (Same for 一千万 inside e.g. 12,340,000.)
//      Rule of thumb used: いっせん only directly before 万 (or 億, out of range here).
//  C2. 4 = よん, 7 = なな, 9 = きゅう in plain numbers and prices (し/しち/く are alts only for
//      bare digits, never preferred for prices).
//  C3. 0 = ぜろ (alt れい).
//  C4. Yen: number + えん, EXCEPT a final 4 → よえん (4円 よえん, 14円 じゅうよえん,
//      104円 ひゃくよえん). よんえん is a common learner error; accepted as alt? NO – よえん is
//      the standard reading; よんえん is flagged.
//  C5. Romaji: modified Hepburn with macrons (jū, kyū, yō, tō). Word-separation is a convention:
//      万-group and the rest separated by a space, suffixes -en with hyphen (sanbyaku-en,
//      jūniman hassen-en). Comparison with the app is done after stripping spaces / hyphens /
//      apostrophes, and separately an ambiguity check (n before vowel/y without separator).
//  C6. Hours: よじ, しちじ (alt ななじ), くじ; 0時 れいじ; 24h supported (じゅうよじ, にじゅうよじ).
//  C7. Minutes: いっぷん にふん さんぷん よんぷん ごふん ろっぷん ななふん はっぷん(alt はちふん)
//      きゅうふん じゅっぷん(alt じっぷん); 30 → はん is an alt of さんじゅっぷん.
//      Alt さんふん / よんふん / しちふん are tolerated colloquial variants.
//  C8. Dates: ついたち … とおか, はつか, じゅうよっか, にじゅうよっか; others ～にち with
//      じゅうしちにち, じゅうくにち.  なのか (alt なぬか).
//  C9. Counters: つ (1-10 native; 11+ = bare number), 人 (ひとり ふたり, then ～にん with よにん,
//      しちにん alt ななにん, きゅうにん alt くにん), 枚 (regular), 本 (h→p after っ, h→b after ん:
//      いっぽん にほん さんぼん よんほん ごほん ろっぽん ななほん はっぽん(alt はちほん) きゅうほん
//      じゅっぽん(alt じっぽん) ひゃっぽん せんぼん), 個 (いっこ ろっこ はっこ(alt はちこ) じゅっこ(alt じっこ)
//      ひゃっこ), 分 as above, 階 (いっかい さんがい(alt さんかい) ろっかい はっかい じゅっかい),
//      名様 (regular めい; 4 よんめい).
// ---------------------------------------------------------------------------------------------

const DIG = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const HUND = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'];
const THOU = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん'];
const TENS = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう', 'ろくじゅう', 'ななじゅう', 'はちじゅう', 'きゅうじゅう'];

// ---------- kana -> Hepburn romaji (only what numbers need, but general enough) ----------
const K2R = {
  あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',
  さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',
  だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
  ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',
  や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'o',ん:'n',
};
const YOON = { ゃ:'a', ゅ:'u', ょ:'o' };
export function kanaToRomaji(kana) {
  // tokenise into syllables
  const syl = [];
  for (let i = 0; i < kana.length; i++) {
    const c = kana[i], nx = kana[i + 1];
    if (c === 'っ') { syl.push('っ'); continue; }
    if (nx && YOON[nx] && K2R[c]) {
      const base = K2R[c]; // e.g. ki, shi, chi, ji, hi, bi, pi
      const stem = base.endsWith('i') ? base.slice(0, -1) : base;
      const s = (stem === 'sh' || stem === 'ch' || stem === 'j') ? stem + YOON[nx] : stem + 'y' + YOON[nx];
      syl.push(s); i++; continue;
    }
    if (K2R[c] === undefined) throw new Error('kanaToRomaji: unknown ' + c + ' in ' + kana);
    syl.push(K2R[c]);
  }
  let out = '';
  for (let i = 0; i < syl.length; i++) {
    let s = syl[i];
    if (s === 'っ') { const n = syl[i + 1] || ''; out += n.startsWith('ch') ? 't' : n[0] || ''; continue; }
    if (s === 'n') { const n = syl[i + 1] || ''; out += /^[aiueoy]/.test(n) ? "n'" : 'n'; continue; }
    // long vowels: o+u, o+o, u+u -> macron (but not across what are clearly separate morphemes;
    // callers convert per morpheme so this is safe)
    const n = syl[i + 1];
    if (n === 'u' && /[ou]$/.test(s)) { out += s.slice(0, -1) + (s.endsWith('o') ? 'ō' : 'ū'); i++; continue; }
    if (n === 'o' && /o$/.test(s)) { out += s.slice(0, -1) + 'ō'; i++; continue; }
    out += s;
  }
  return out;
}

// ---------- integers ----------
function group4(n, beforeMan) {
  // n: 1..9999 ; returns array of [kana] variants (first = primary)
  const th = Math.floor(n / 1000), h = Math.floor(n / 100) % 10, t = Math.floor(n / 10) % 10, o = n % 10;
  const tail = HUND[h] + TENS[t] + DIG[o];
  if (th === 1 && beforeMan) return ['いっせん' + tail, 'せん' + tail];
  return [THOU[th] + tail];
}
function group4Romaji(kana) { return kanaToRomaji(kana); }

export function readInt(n) {
  if (!Number.isInteger(n) || n < 0 || n > 99999999) throw new RangeError('readInt range ' + n);
  if (n === 0) return { kana: 'ぜろ', romaji: 'zero', alts: ['れい'] };
  const man = Math.floor(n / 10000), rest = n % 10000;
  const manV = man ? group4(man, true).map(k => k + 'まん') : [''];
  const restV = rest ? group4(rest, false) : [''];
  const kana = manV[0] + restV[0];
  const alts = manV.slice(1).map(m => m + restV[0]);
  const parts = [];
  if (man) parts.push(group4Romaji(manV[0]));
  if (rest) parts.push(group4Romaji(restV[0]));
  return { kana, romaji: parts.join(' '), alts };
}

export function readYen(n) {
  const r = readInt(n);
  // final 4 (…よん) -> …よえん
  const yen = k => k.endsWith('よん') ? k.slice(0, -1) + 'えん' : k + 'えん';
  const kana = yen(r.kana);
  const alts = r.alts.map(yen);
  let romaji = r.romaji;
  if (r.kana.endsWith('よん')) romaji = romaji.slice(0, -1) + '-en'; else romaji += '-en';
  return { kana, romaji, alts };
}

// ---------- time ----------
const HOUR_SPECIAL = { 4: 'よ', 7: 'しち', 9: 'く' };
function hourPrefix(h) {
  // 0..24
  if (h === 0) return 'れい';
  const t = Math.floor(h / 10), o = h % 10;
  const ones = o ? (HOUR_SPECIAL[o] || DIG[o]) : '';
  return TENS[t] + ones;
}
export function readHour(h) {
  const kana = hourPrefix(h) + 'じ';
  const alts = [];
  if (h % 10 === 7) alts.push(TENS[Math.floor(h / 10)] + 'ななじ');
  if (h === 0) alts.push('ぜろじ');
  return { kana, romaji: kanaToRomaji(kana), alts };
}
// minute counter ふん/ぷん
const MIN_ONES = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん'];
const MIN_ONES_ALT = { 3: ['さんふん'], 4: ['よんふん'], 7: ['しちふん'], 8: ['はちふん'] };
export function readMinutes(m) {
  if (m < 1 || m > 59) throw new RangeError('min');
  const t = Math.floor(m / 10), o = m % 10;
  if (o === 0) {
    const kana = (t === 1 ? '' : DIG[t]) + 'じゅっぷん';
    const alts = [(t === 1 ? '' : DIG[t]) + 'じっぷん'];
    if (m === 30) alts.push('はん');
    return { kana, romaji: kanaToRomaji(kana), alts };
  }
  const kana = TENS[t] + MIN_ONES[o];
  const alts = (MIN_ONES_ALT[o] || []).map(a => TENS[t] + a);
  return { kana, romaji: kanaToRomaji(kana), alts };
}
export function readTime(h, m) {
  const H = readHour(h);
  if (!m) return { kana: H.kana, romaji: H.romaji, alts: H.alts.concat(H.alts.length ? [] : []) };
  if (m === 30) {
    const M = readMinutes(30);
    return { kana: H.kana + 'はん', romaji: H.romaji + ' han',
      alts: [H.kana + M.kana, H.kana + 'さんじっぷん', ...H.alts.map(a => a + 'はん')] };
  }
  const M = readMinutes(m);
  const alts = [...M.alts.map(a => H.kana + a), ...H.alts.map(a => a + M.kana)];
  return { kana: H.kana + M.kana, romaji: H.romaji + ' ' + M.romaji, alts };
}

// ---------- dates ----------
const DAYS = {
  1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか',
  9: 'ここのか', 10: 'とおか', 14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか',
};
export function readDay(d) {
  if (d < 1 || d > 31) throw new RangeError('day');
  let kana = DAYS[d];
  if (!kana) {
    const t = Math.floor(d / 10), o = d % 10;
    const ones = o ? ({ 4: 'よ', 7: 'しち', 9: 'く' }[o] || DIG[o]) : '';
    kana = TENS[t] + ones + 'にち';
  }
  const alts = [];
  if (d === 7) alts.push('なぬか');
  if (d % 10 === 7 && d > 10) alts.push(TENS[Math.floor(d / 10)] + 'ななにち');
  return { kana, romaji: kanaToRomaji(kana), alts };
}
export function readMonth(mo) {
  const special = { 4: 'しがつ', 7: 'しちがつ', 9: 'くがつ' };
  const kana = special[mo] || (mo >= 10 ? TENS[1] + DIG[mo - 10] : DIG[mo]) + 'がつ';
  return { kana, romaji: kanaToRomaji(kana), alts: [] };
}
export const WEEKDAYS = { 月: 'げつようび', 火: 'かようび', 水: 'すいようび', 木: 'もくようび', 金: 'きんようび', 土: 'どようび', 日: 'にちようび' };

// ---------- counters ----------
const TSU = ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とお'];
const TSU_R = ['', 'hitotsu', 'futatsu', 'mittsu', 'yottsu', 'itsutsu', 'muttsu', 'nanatsu', 'yattsu', 'kokonotsu', 'tō'];

// h-row counters (本 ほん, 杯 はい, 匹 ひき): returns prefix+counter for ones digit 0..9 given base kana
function hRow(n, base /* 'ほん' */) {
  const voiced = { ほ: 'ぼ', は: 'ば', ひ: 'び' }[base[0]] + base.slice(1);
  const semi = { ほ: 'ぽ', は: 'ぱ', ひ: 'ぴ' }[base[0]] + base.slice(1);
  const t = Math.floor(n / 10) % 10, o = n % 10, h = Math.floor(n / 100) % 10, th = Math.floor(n / 1000);
  if (n % 10 !== 0) {
    const prefix = readInt(n - o).kana.replace('ぜろ', '');
    const map = { 1: ['いっ' + semi], 2: ['に' + base], 3: ['さん' + voiced], 4: ['よん' + base], 5: ['ご' + base],
      6: ['ろっ' + semi], 7: ['なな' + base], 8: ['はっ' + semi, 'はち' + base], 9: ['きゅう' + base] };
    return map[o].map(x => prefix + x);
  }
  if (n % 100 !== 0) { const prefix = readInt(n - n % 100).kana.replace('ぜろ', ''); const tt = t === 1 ? '' : DIG[t];
    return [prefix + tt + 'じゅっ' + semi, prefix + tt + 'じっ' + semi]; }
  if (n % 1000 !== 0) { const prefix = readInt(n - n % 1000).kana.replace('ぜろ', '');
    const hh = { 1: 'ひゃっ', 3: 'さんびゃっ', 6: 'ろっぴゃっ', 8: 'はっぴゃっ' }[h] || HUND[h].slice(0, -1) + 'っ';
    return [prefix + hh + semi]; }
  void th;
  return [readInt(n).kana + voiced]; // せんぼん, まんぼん
}
// k-row counters with gemination (個 こ, 回 かい, 階 かい, 箇月 かげつ)
function kRow(n, base, sanVoice /* e.g. 階: さんがい */) {
  const t = Math.floor(n / 10) % 10, o = n % 10, h = Math.floor(n / 100) % 10;
  if (o !== 0) {
    const prefix = readInt(n - o).kana.replace('ぜろ', '');
    const voiced = { か: 'が', こ: 'ご' }[base[0]] + base.slice(1);
    const map = { 1: ['いっ' + base], 2: ['に' + base], 3: sanVoice ? ['さん' + voiced, 'さん' + base] : ['さん' + base],
      4: ['よん' + base], 5: ['ご' + base], 6: ['ろっ' + base], 7: ['なな' + base], 8: ['はっ' + base, 'はち' + base], 9: ['きゅう' + base] };
    return map[o].map(x => prefix + x);
  }
  if (n % 100 !== 0) { const prefix = readInt(n - n % 100).kana.replace('ぜろ', ''); const tt = t === 1 ? '' : DIG[t];
    return [prefix + tt + 'じゅっ' + base, prefix + tt + 'じっ' + base]; }
  if (n % 1000 !== 0) { const prefix = readInt(n - n % 1000).kana.replace('ぜろ', '');
    const hh = { 1: 'ひゃっ', 3: 'さんびゃっ', 6: 'ろっぴゃっ', 8: 'はっぴゃっ' }[h] || HUND[h].slice(0, -1) + 'っ';
    return [prefix + hh + base, prefix + HUND[h] + base]; }
  return [readInt(n).kana + base];
}
function regular(n, base, special = {}) {
  const o = n % 10, prefix = readInt(n - o).kana.replace('ぜろ', '');
  if (o === 0) return [readInt(n).kana + base];
  const sp = special[o];
  if (sp) return sp.map(x => prefix + x + base);
  return [prefix + DIG[o] + base];
}
function wrap(variants) { return { kana: variants[0], romaji: kanaToRomaji(variants[0]), alts: variants.slice(1) }; }

export function readCounter(n, counter) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('counter n');
  switch (counter) {
    case 'つ': case 'tsu':
      if (n <= 10) return { kana: TSU[n], romaji: TSU_R[n], alts: n === 10 ? ['じゅう'] : [] };
      return readInt(n);
    case '人': case 'nin': {
      if (n === 1) return wrap(['ひとり']);
      if (n === 2) return wrap(['ふたり']);
      return wrap(regular(n, 'にん', { 4: ['よ'], 7: ['しち', 'なな'], 9: ['きゅう', 'く'] }));
    }
    case '枚': case 'mai': return wrap(regular(n, 'まい', { 4: ['よん'], 7: ['なな', 'しち'], 9: ['きゅう'] }));
    case '本': case 'hon': return wrap(hRow(n, 'ほん'));
    case '杯': case 'hai': return wrap(hRow(n, 'はい'));
    case '匹': case 'hiki': return wrap(hRow(n, 'ひき'));
    case '個': case 'ko': return wrap(kRow(n, 'こ', false));
    case '回': case 'kai': return wrap(kRow(n, 'かい', false));
    case '階': return wrap(kRow(n, 'かい', true));
    case '分': case 'fun': return readMinutes(n);
    case '名様': case '名': {
      const v = regular(n, 'めい', { 4: ['よん'], 7: ['なな', 'しち'], 9: ['きゅう'] });
      return wrap(counter === '名様' ? v.map(x => x + 'さま') : v);
    }
    case '時間': return wrap([readHour(n).kana + 'かん']);
    case '円': return readYen(n);
    case '時': return readHour(n);
    case '日': return readDay(n);
    case '月': return readMonth(n);
    case '番線': return wrap(regular(n, 'ばんせん', { 4: ['よん'], 7: ['なな'], 9: ['きゅう'] }));
    case '歳': case '才': {
      if (n === 20) return wrap(['はたち', 'にじゅっさい', 'にじっさい']);
      const o = n % 10, prefix = readInt(n - o).kana.replace('ぜろ', '');
      if (o === 0) return wrap(n === 10 ? ['じゅっさい', 'じっさい'] : [prefix.slice(0, -2) + 'じゅっさい', prefix.slice(0, -2) + 'じっさい']);
      const m = { 1: 'いっさい', 8: 'はっさい' }[o];
      return wrap([prefix + (m || DIG[o] + 'さい')]);
    }
    default: throw new Error('oracle: unknown counter ' + counter);
  }
}

// Normalise romaji for comparison (ignore separators / apostrophes / case)
export function normRomaji(s) { return String(s).toLowerCase().normalize('NFC').replace(/[\s\-'’]/g, ''); }
// Ambiguity check (Hepburn): every ん followed by a vowel / y-sound must be separated in the
// app's romaji by ' or - or space. `kana` is the oracle's kana (same reading as app assumed).
export function romajiAmbiguity(appRomaji, kana) {
  const full = kanaToRomaji(kana);              // contains n' where needed
  const need = [];                               // indices in stripped string after which a sep is needed
  let k = 0;
  for (let i = 0; i < full.length; i++) { if (full[i] === "'") need.push(k - 1); else k++; }
  const sepAfter = new Set(); let j = 0;
  const a = String(appRomaji).toLowerCase();
  for (let i = 0; i < a.length; i++) { if (/[\s\-'’]/.test(a[i])) sepAfter.add(j - 1); else j++; }
  return need.filter(x => !sepAfter.has(x));
}
