import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../app/modules/numbers.js';

// Контрольный набор из задания + краевые случаи
const NUMBERS = [
  [1, 'いち', 'ichi'],
  [4, 'よん', 'yon'],
  [10, 'じゅう', 'jū'],
  [11, 'じゅういち', 'jūichi'],
  [100, 'ひゃく', 'hyaku'],
  [300, 'さんびゃく', 'sanbyaku'],
  [600, 'ろっぴゃく', 'roppyaku'],
  [800, 'はっぴゃく', 'happyaku'],
  [1000, 'せん', 'sen'],
  [3000, 'さんぜん', 'sanzen'],
  [8000, 'はっせん', 'hassen'],
  [10000, 'いちまん', 'ichiman'],
  [12800, 'いちまんにせんはっぴゃく', 'ichiman nisenhappyaku'],
  [100000, 'じゅうまん', 'jūman'],
  [128000, 'じゅうにまんはっせん', 'jūniman hassen'],
  [250000, 'にじゅうごまん', 'nijūgoman'],
  [1001, 'せんいち', "sen'ichi"],
  [1004, 'せんよん', "sen'yon"],
  [10000000, 'いっせんまん', 'issenman'],
  [3600, 'さんぜんろっぴゃく', 'sanzenroppyaku'],
  [99999, 'きゅうまんきゅうせんきゅうひゃくきゅうじゅうきゅう', 'kyūman kyūsenkyūhyakukyūjūkyū'],
];

test('numberReading: контрольный набор', () => {
  for (const [n, kana, romaji] of NUMBERS) {
    const r = N.numberReading(n);
    assert.equal(r.kana, kana, `kana ${n}`);
    assert.equal(r.romaji, romaji, `romaji ${n}`);
  }
});

test('yenReading: цены и 4円 = よえん', () => {
  assert.deepEqual(N.yenReading(300), { kana: 'さんびゃくえん', romaji: 'sanbyaku-en' });
  assert.deepEqual(N.yenReading(1000), { kana: 'せんえん', romaji: 'sen-en' });
  assert.deepEqual(N.yenReading(128000), { kana: 'じゅうにまんはっせんえん', romaji: 'jūniman hassen-en' });
  assert.deepEqual(N.yenReading(4), { kana: 'よえん', romaji: 'yo-en' });
  assert.deepEqual(N.yenReading(104), { kana: 'ひゃくよえん', romaji: 'hyakuyo-en' });
  assert.deepEqual(N.yenReading(40), { kana: 'よんじゅうえん', romaji: 'yonjū-en' });
});

test('yenMixed: запись с 万', () => {
  assert.equal(N.yenMixed(128000), '12万8千円');
  assert.equal(N.yenMixed(125500), '12万5,500円');
  assert.equal(N.yenMixed(3000), '3,000円');
  assert.equal(N.yenMixed(250000), '25万円');
  assert.equal(N.yenMixed(980), '980円');
});

test('timeReading: часы и минуты', () => {
  const T = [
    [[4, 0], 'よじ', 'yoji'],
    [[7, 0], 'しちじ', 'shichiji'],
    [[9, 0], 'くじ', 'kuji'],
    [[9, 30], 'くじはん', 'kuji han'],
    [[10, 10], 'じゅうじじゅっぷん', 'jūji juppun'],
    [[1, 1], 'いちじいっぷん', 'ichiji ippun'],
    [[3, 3], 'さんじさんぷん', 'sanji sanpun'],
    [[6, 6], 'ろくじろっぷん', 'rokuji roppun'],
    [[8, 8], 'はちじはっぷん', 'hachiji happun'],
    [[14, 45], 'じゅうよじよんじゅうごふん', 'jūyoji yonjūgofun'],
    [[19, 20], 'じゅうくじにじゅっぷん', 'jūkuji nijuppun'],
    [[12, 4], 'じゅうにじよんぷん', 'jūniji yonpun'],
  ];
  for (const [[hh, mm], kana, romaji] of T) {
    const r = N.timeReading(hh, mm);
    assert.equal(r.kana, kana, `${hh}:${mm}`);
    assert.equal(r.romaji, romaji, `${hh}:${mm} romaji`);
  }
  assert.equal(N.timeReading(9, 30, { half: false }).kana, 'くじさんじゅっぷん');
});

test('minuteReading: 1, 3, 6, 8, 10 минут', () => {
  assert.equal(N.minuteReading(1).kana, 'いっぷん');
  assert.equal(N.minuteReading(3).kana, 'さんぷん');
  assert.equal(N.minuteReading(6).kana, 'ろっぷん');
  assert.equal(N.minuteReading(8).kana, 'はっぷん');
  assert.equal(N.minuteReading(10).kana, 'じゅっぷん');
  assert.equal(N.minuteReading(11).kana, 'じゅういっぷん');
  assert.equal(N.minuteReading(59).kana, 'ごじゅうきゅうふん');
});

test('dateReading и счётные суффиксы', () => {
  assert.equal(N.dateReading(12, 1).kana, 'じゅうにがつついたち');
  assert.equal(N.dateReading(4, 20).kana, 'しがつはつか');
  assert.equal(N.dateReading(9, 14).kana, 'くがつじゅうよっか');
  assert.equal(N.counterReading('hon', 3).kana, 'さんぼん');
  assert.equal(N.counterReading('hon', 6).kana, 'ろっぽん');
  assert.equal(N.counterReading('nin', 4).kana, 'よにん');
  assert.equal(N.counterReading('ko', 1).kana, 'いっこ');
  assert.equal(N.counterReading('tsu', 10).kana, 'とお');
});

test('randomPrice в пределах диапазона; parseDigits', () => {
  for (const key of Object.keys(N.PRICE_RANGES)) {
    for (let i = 0; i < 300; i++) {
      const p = N.randomPrice(key);
      const r = N.PRICE_RANGES[key];
      assert.ok(p >= r.min && p <= r.max, `${key}: ${p}`);
      assert.doesNotThrow(() => N.yenReading(p));
    }
  }
  assert.equal(N.parseDigits('12,800'), 12800);
  assert.equal(N.parseDigits('12 800円'), 12800);
  assert.equal(N.parseDigits('１２８００'), 12800);
  assert.ok(Number.isNaN(N.parseDigits('abc')));
});

test('ошибки диапазона', () => {
  assert.throws(() => N.numberReading(-1));
  assert.throws(() => N.numberReading(1.5));
  assert.throws(() => N.minuteReading(0));
  assert.throws(() => N.timeReading(25, 0));
});
