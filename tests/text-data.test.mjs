import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseRuby, rubyToJa, rubyToKana, kanjiWithoutReading, normalize, search, kanaToHepburn, romajiMatchesKana, ttsText,
} from '../app/modules/text.js';
import { validateAll } from '../tools/validate.mjs';

const phrases = JSON.parse(readFileSync(new URL('../app/data/phrases.json', import.meta.url), 'utf8'));

test('ruby: parsing, ja, kana', () => {
  const r = '袋[ふくろ]はご利用[りよう]ですか';
  assert.equal(rubyToJa(r), '袋はご利用ですか');
  assert.equal(rubyToKana(r), 'ふくろはごりようですか');
  assert.equal(parseRuby(r).filter((x) => x.rt).length, 2);
  assert.equal(rubyToJa('{ATM|エーティーエム}はありますか'), 'ATMはありますか');
  assert.equal(rubyToKana('{ATM|エーティーエム}はありますか'), 'エーティーエムはありますか');
  assert.equal(kanjiWithoutReading('袋はいりません'), true);
  assert.equal(kanjiWithoutReading('袋[ふくろ]はいりません'), false);
  assert.equal(kanjiWithoutReading('〇〇駅[えき]'), false);
});

test('kanaToHepburn: long vowels, っ, ん, katakana', () => {
  assert.equal(kanaToHepburn('ありがとう'), 'arigatō');
  assert.equal(kanaToHepburn('きって'), 'kitte');
  assert.equal(kanaToHepburn('まっちゃ'), 'matcha');
  assert.equal(kanaToHepburn('きんえん'), "kin'en");
  assert.equal(kanaToHepburn('コーヒー'), 'kōhī');
  assert.equal(kanaToHepburn('ラストオーダー'), 'rasutoōdā');
  assert.equal(kanaToHepburn('せんせい'), 'sensei');
  assert.equal(kanaToHepburn('ボディ'), 'bodi');
});

test('romajiMatchesKana: catches errors, not word boundaries', () => {
  assert.ok(romajiMatchesKana('okaikei o onegai shimasu', 'おかいけいをおねがいします'));
  assert.ok(romajiMatchesKana('eigo no menyū wa arimasu ka', 'えいごのメニューはありますか'));
  assert.ok(romajiMatchesKana('kochira e dōzo', 'こちらへどうぞ'));
  assert.ok(!romajiMatchesKana('arigato gozaimasu', 'ありがとうございます'), 'missing macron');
  assert.ok(!romajiMatchesKana('sanpyaku-en', 'さんびゃくえん'), 'wrong voicing');
  assert.ok(!romajiMatchesKana('kite', 'きって'), 'lost っ');
  assert.ok(!romajiMatchesKana('fukuro ha irimasen', 'ふくろをいりません'), 'wrong particle');
});

test('search: ふくろ / bag / fukuro find the bag phrase', () => {
  for (const q of ['ふくろ', 'bag', 'fukuro', 'フクロ', 'Bag', "don't need a bag"]) {
    const ids = search(phrases.items, q).map((x) => x.id);
    assert.ok(ids.includes('konbini.bag-none'), `query "${q}": ${ids.slice(0, 5)}`);
  }
  // macrons and long vowels: arigato / arigatou / arigatō
  for (const q of ['arigato', 'arigatou', 'arigatō']) {
    assert.ok(search(phrases.items, q).some((x) => x.id === 'basics.arigato'), q);
  }
  assert.deepEqual(search(phrases.items, ''), []);
});

test('ttsText: placeholders are read まるまる, tts override', () => {
  assert.equal(ttsText({ ja: '〇〇駅はどこですか' }), 'まるまる駅はどこですか');
  assert.equal(ttsText({ ja: '十分', tts: 'じゅっぷん' }), 'じゅっぷん');
});

test('data: schema, unique ids, ruby↔kana, romaji↔kana (validate.mjs)', () => {
  const r = validateAll();
  assert.deepEqual(r.errors, []);
  assert.ok(r.counts.phrases >= 230, 'phrases ' + r.counts.phrases);
  assert.ok(r.counts.kanji >= 60, 'kanji ' + r.counts.kanji);
  assert.ok(r.counts.byKind.hear >= 40, 'staff phrases ' + r.counts.byKind.hear);
});

test('data: heard → reply links exist and are symmetric', () => {
  const byId = new Map(phrases.items.map((it) => [it.id, it]));
  const hears = phrases.items.filter((it) => it.replies?.length);
  assert.ok(hears.length >= 20, 'hear items with links: ' + hears.length);
  for (const h of hears) for (const r of h.replies) assert.ok(byId.get(r)?.replyTo?.includes(h.id), `${h.id} → ${r}`);
  assert.deepEqual(byId.get('hear.konbini.bag').replies.slice(0, 2), ['konbini.bag-none', 'konbini.bag-yes']);
  assert.ok(byId.get('food.mochikaeri-de').replyTo.includes('hear.food.eatin'));
});

test('data: proofreading fixes in place (丼 どんぶり, 各駅停車, staff keigo)', () => {
  const kj = JSON.parse(readFileSync(new URL('../app/data/kanji.json', import.meta.url), 'utf8'));
  const k = new Map(kj.items.map((x) => [x.id, x]));
  assert.equal(k.get('k.don').kana, 'どんぶり');
  assert.equal(k.get('k.kakutei').ja, '各駅停車');
  const p = new Map(phrases.items.map((x) => [x.id, x]));
  assert.equal(p.get('hear.food.karasa').ja, '辛さはどうなさいますか');
  assert.equal(p.get('hear.food.karasa').tts, 'からさはどうなさいますか');
  assert.equal(p.get('shop.passport').ja, 'パスポートです');
});

test('data: every category is non-empty, no duplicate ids', () => {
  const ids = new Set();
  for (const it of phrases.items) { assert.ok(!ids.has(it.id), it.id); ids.add(it.id); }
  for (const c of phrases.categories) assert.ok(phrases.items.some((it) => it.cat === c.id), c.id);
});
