import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Z from '../app/modules/numbers-zh.js';

const hanzi = (n) => Z.numberReading(n).hanzi;

test('plain numbers: 十 alone at the start, 一十 inside a larger number', () => {
  assert.equal(hanzi(0), '零');
  assert.equal(hanzi(10), '十');
  assert.equal(hanzi(15), '十五');
  assert.equal(hanzi(110), '一百一十');
  assert.equal(hanzi(115), '一百一十五');
  assert.equal(hanzi(1010), '一千零一十');
  assert.equal(hanzi(100000), '十万');
  assert.equal(hanzi(110000), '十一万');
  assert.equal(hanzi(1100000), '一百一十万');
  assert.equal(hanzi(100010), '十万零一十');
});

test('零: one 零 for any run of zeros inside the number, none at the end', () => {
  assert.equal(hanzi(101), '一百零一');
  assert.equal(hanzi(1001), '一千零一');
  assert.equal(hanzi(1050), '一千零五十');
  assert.equal(hanzi(1100), '一千一百');
  assert.equal(hanzi(10500), '一万零五百');
  assert.equal(hanzi(10005), '一万零五');
  assert.equal(hanzi(100005000), '一亿零五千');
  assert.equal(hanzi(100050000), '一亿零五万');
  assert.equal(hanzi(2000), '两千');
});

test('两 vs 二: 两 before 百 / 千 / 万 / 亿 and measure words, 二 for tens and ones', () => {
  assert.equal(hanzi(2), '二');
  assert.equal(hanzi(12), '十二');
  assert.equal(hanzi(20), '二十');
  assert.equal(hanzi(22), '二十二');
  assert.equal(hanzi(200), '两百');
  assert.equal(hanzi(2222), '两千两百二十二');
  assert.equal(hanzi(20000), '两万');
  assert.equal(hanzi(220000), '二十二万');
  assert.equal(hanzi(200000000), '两亿');
  assert.equal(hanzi(10002), '一万零二');
  assert.equal(Z.priceReading(200).hanzi, '两块');
  assert.equal(Z.priceReading(1200).hanzi, '十二块');
  assert.equal(Z.priceReading(2200).hanzi, '二十二块');
  assert.equal(Z.timeReading(2, 0).hanzi, '两点');
  assert.equal(Z.timeReading(2, 2).hanzi, '两点零二分');
});

test('pinyin: 一 is yí before a 4th tone and yì before other units, yī in 十一 and at the end', () => {
  assert.equal(Z.numberReading(110).pinyin, 'yì bǎi yī shí');
  assert.equal(Z.numberReading(10500).pinyin, 'yí wàn líng wǔ bǎi');
  assert.equal(Z.numberReading(1001).pinyin, 'yì qiān líng yī');
  assert.equal(Z.priceReading(100).pinyin, 'yí kuài');
  assert.equal(Z.priceReading(1100).pinyin, 'shí yī kuài');
  assert.equal(Z.timeReading(1, 15).pinyin, 'yì diǎn yí kè');
  assert.equal(Z.toneOf('kuài'), 4);
  assert.equal(Z.toneOf('ge'), 0);
});

test('prices: 块 / 毛 / 分 spoken (last unit dropped), full, and written 元 / 角', () => {
  const p = Z.priceReading(350);
  assert.equal(p.hanzi, '三块五');
  assert.equal(p.pinyin, 'sān kuài wǔ');
  assert.equal(p.full.hanzi, '三块五毛');
  assert.equal(p.written.hanzi, '三元五角');
  assert.equal(Z.priceReading(220).hanzi, '两块二');
  assert.equal(Z.priceReading(20).hanzi, '两毛');
  assert.equal(Z.priceReading(50).hanzi, '五毛');
  assert.equal(Z.priceReading(5).hanzi, '五分');
  assert.equal(Z.priceReading(305).hanzi, '三块零五分');
  assert.equal(Z.priceReading(355).hanzi, '三块五毛五');
  assert.equal(Z.priceReading(355).full.hanzi, '三块五毛五分');
  assert.equal(Z.priceReading(105000).hanzi, '一千零五十块');
  assert.equal(Z.priceReading(1280000).hanzi, '一万两千八百块');
});

test('clock time: 点, 半, 一刻, 零 before minutes 1-9, alternatives', () => {
  assert.equal(Z.timeReading(2, 30).hanzi, '两点半');
  assert.equal(Z.timeReading(2, 30).alt[0].hanzi, '两点三十分');
  assert.equal(Z.timeReading(3, 15).hanzi, '三点一刻');
  assert.equal(Z.timeReading(3, 45).hanzi, '三点四十五分');
  assert.equal(Z.timeReading(3, 45).alt[0].hanzi, '三点三刻');
  assert.equal(Z.timeReading(10, 10).hanzi, '十点十分');
  assert.equal(Z.timeReading(9, 5).pinyin, 'jiǔ diǎn líng wǔ fēn');
  assert.equal(Z.timeReading(12, 0).alt[0].hanzi, '十二点整');
  assert.throws(() => Z.timeReading(25, 0));
  assert.throws(() => Z.numberReading(-1));
  assert.throws(() => Z.numberReading(1.5));
});

test('parsing and formatting yuan; random tasks stay in range', () => {
  assert.equal(Z.parseYuan('3.5'), 350);
  assert.equal(Z.parseYuan('3.50'), 350);
  assert.equal(Z.parseYuan('¥1,200'), 120000);
  assert.equal(Z.parseYuan('12 块'), 1200);
  assert.ok(Number.isNaN(Z.parseYuan('3.555')));
  assert.ok(Number.isNaN(Z.parseYuan('abc')));
  assert.equal(Z.formatYuan(350), '¥3.50');
  assert.equal(Z.formatYuan(1280000), '¥12,800');
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const [k, r] of Object.entries(Z.PRICE_RANGES_ZH)) {
    for (let i = 0; i < 300; i++) {
      const fen = Z.randomPriceZh(k, rnd);
      assert.ok(fen >= r.min * 100 && fen <= r.max * 100 + 90, `${k}: ${fen}`);
      assert.ok(Z.priceReading(fen).hanzi.length > 0);
    }
  }
  for (let i = 0; i < 300; i++) {
    const t = Z.randomTimeZh(rnd);
    assert.ok(t.h >= 1 && t.h <= 12 && t.m >= 0 && t.m < 60);
    assert.ok(Z.timeReading(t.h, t.m).hanzi.includes('点'));
  }
});
