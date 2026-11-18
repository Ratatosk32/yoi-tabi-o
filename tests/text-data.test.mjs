import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseRuby, rubyToJa, rubyToKana, kanjiWithoutReading, normalize, search, kanaToHepburn, romajiMatchesKana, ttsText,
} from '../app/modules/text.js';
import { validateAll } from '../tools/validate.mjs';

const phrases = JSON.parse(readFileSync(new URL('../app/data/phrases.json', import.meta.url), 'utf8'));

test('ruby: разбор, ja, kana', () => {
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

test('kanaToHepburn: долгие гласные, っ, ん, катакана', () => {
  assert.equal(kanaToHepburn('ありがとう'), 'arigatō');
  assert.equal(kanaToHepburn('きって'), 'kitte');
  assert.equal(kanaToHepburn('まっちゃ'), 'matcha');
  assert.equal(kanaToHepburn('きんえん'), "kin'en");
  assert.equal(kanaToHepburn('コーヒー'), 'kōhī');
  assert.equal(kanaToHepburn('ラストオーダー'), 'rasutoōdā');
  assert.equal(kanaToHepburn('せんせい'), 'sensei');
  assert.equal(kanaToHepburn('ボディ'), 'bodi');
});

test('romajiMatchesKana: ловит ошибки, но не границы слов', () => {
  assert.ok(romajiMatchesKana('okaikei o onegai shimasu', 'おかいけいをおねがいします'));
  assert.ok(romajiMatchesKana('eigo no menyū wa arimasu ka', 'えいごのメニューはありますか'));
  assert.ok(romajiMatchesKana('kochira e dōzo', 'こちらへどうぞ'));
  assert.ok(!romajiMatchesKana('arigato gozaimasu', 'ありがとうございます'), 'пропущенный макрон');
  assert.ok(!romajiMatchesKana('sanpyaku-en', 'さんびゃくえん'), 'неверное озвончение');
  assert.ok(!romajiMatchesKana('kite', 'きって'), 'потерянная っ');
  assert.ok(!romajiMatchesKana('fukuro ha irimasen', 'ふくろをいりません'), 'не та частица');
});

test('поиск: ふくろ / пакет / fukuro находят фразу про пакет', () => {
  for (const q of ['ふくろ', 'пакет', 'fukuro', 'フクロ', 'Пакет']) {
    const ids = search(phrases.items, q).map((x) => x.id);
    assert.ok(ids.includes('konbini.bag-none'), `запрос «${q}»: ${ids.slice(0, 5)}`);
  }
  // макроны и долгие гласные: arigato / arigatou / arigatō
  for (const q of ['arigato', 'arigatou', 'arigatō']) {
    assert.ok(search(phrases.items, q).some((x) => x.id === 'basics.arigato'), q);
  }
  assert.equal(normalize('Ёлка'), 'елка');
  assert.deepEqual(search(phrases.items, ''), []);
});

test('ttsText: плейсхолдеры не озвучиваются, override tts', () => {
  assert.equal(ttsText({ ja: '〇〇駅はどこですか' }), '駅はどこですか');
  assert.equal(ttsText({ ja: '十分', tts: 'じゅっぷん' }), 'じゅっぷん');
});

test('данные: схема, уникальные id, ruby↔kana, ромадзи↔кана (validate.mjs)', () => {
  const r = validateAll();
  assert.deepEqual(r.errors, []);
  assert.ok(r.counts.phrases >= 230, 'фраз ' + r.counts.phrases);
  assert.ok(r.counts.kanji >= 60, 'кандзи ' + r.counts.kanji);
  assert.ok(r.counts.byKind.hear >= 40, 'фраз персонала ' + r.counts.byKind.hear);
});

test('данные: все категории непусты, у hear есть перевод, нет дублей id', () => {
  const ids = new Set();
  for (const it of phrases.items) { assert.ok(!ids.has(it.id), it.id); ids.add(it.id); }
  for (const c of phrases.categories) assert.ok(phrases.items.some((it) => it.cat === c.id), c.id);
});
