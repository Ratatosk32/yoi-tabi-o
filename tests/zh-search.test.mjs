import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { normalizeZh, pinyinSearchKey, pinyinNumbersToMarks, search, completeItem, rubyPairs, ttsText } from '../app/modules/text.js';
import { createDictIndex } from '../app/modules/dict-search.js';

const load = (url) => JSON.parse(readFileSync(url, 'utf8'));
const fixtureUrl = (n) => new URL(`./fixtures/zh/${n}`, import.meta.url);
const realDictUrl = (n) => new URL(`../app/data/zh/${n}`, import.meta.url);
const items = load(fixtureUrl('curriculum.json')).items.map(completeItem);
const zhSearch = (q) => search(items, q, 100, normalizeZh).map((x) => x.id);

test('normalizeZh folds tone marks, ü (typed as v, u: or ü), case, spaces and punctuation', () => {
  assert.equal(normalizeZh('Wǒ shì xuésheng.'), 'woshixuesheng');
  assert.equal(normalizeZh('lǜchá'), 'lvcha');
  assert.equal(normalizeZh('LÜ CHA'), 'lvcha');
  assert.equal(normalizeZh('nǚ’ér'), 'nver');
  assert.equal(normalizeZh('学生'), '学生');
  assert.equal(normalizeZh('你好！'), '你好');
  assert.equal(pinyinSearchKey("Nǚ'ér, lǜchá!"), 'nv er lvcha');
});

test('phrase search: toneless pinyin, joined or spaced, hanzi and English', () => {
  assert.ok(zhSearch('xuesheng').includes('zh.people.wo-shi-xuesheng'));
  assert.ok(zhSearch('xue sheng').includes('zh.people.wo-shi-xuesheng'));
  assert.ok(zhSearch('xuésheng').includes('zh.people.wo-shi-xuesheng'));
  assert.ok(zhSearch('学生').includes('zh.people.wo-shi-xuesheng'));
  assert.ok(zhSearch('student').includes('zh.people.wo-shi-xuesheng'));
  assert.equal(zhSearch('lvcha')[0], 'zh.food.lv-cha');
  assert.equal(zhSearch('lü')[0], 'zh.food.lv-cha');
  assert.equal(zhSearch('nihao')[0], 'zh.basics.ni-hao');
  assert.deepEqual(zhSearch('qwertyx'), []);
});

function dictIndex(url) {
  const core = load(url('dict-core.json'));
  const idx = createDictIndex(core.fields, core.rows, normalizeZh);
  idx.add(load(url('dict-rest.json')).rows);
  const top = (q, n = 5) => idx.search(q, n).map(({ row }) => row[idx.F.ja]);
  return { idx, top };
}

test('dictionary search on the fixture: pinyin, v for ü, hanzi, English', () => {
  const { top } = dictIndex(fixtureUrl);
  assert.equal(top('xuesheng')[0], '学生');
  assert.equal(top('student')[0], '学生');
  assert.equal(top('学生')[0], '学生');
  assert.deepEqual(top('学').slice(0, 3).sort(), ['学习', '学校', '学生'].sort());
  assert.equal(top('lvcha')[0], '绿茶');
  assert.equal(top('nver')[0], '女儿');
  assert.ok(top('lv').includes('旅行'));
});

test('dictionary search on the real CC-CEDICT data (when present)', { skip: !existsSync(realDictUrl('dict-core.json')) }, () => {
  const { top } = dictIndex(realDictUrl);
  assert.equal(top('xuesheng')[0], '学生');
  assert.equal(top('学生')[0], '学生');
  assert.ok(top('student', 5).includes('学生'));
  assert.ok(top('lvcha', 5).includes('绿茶'));
  assert.ok(top('nihao', 5).includes('你好'));
});

test('tone numbers become tone marks (user phrases)', () => {
  assert.equal(pinyinNumbersToMarks('ni3 hao3'), 'nǐ hǎo');
  assert.equal(pinyinNumbersToMarks('xue2sheng5'), 'xuésheng');
  assert.equal(pinyinNumbersToMarks('lv4 cha2'), 'lǜ chá');
  assert.equal(pinyinNumbersToMarks('nu:3 er2'), 'nǚ ér');
  assert.equal(pinyinNumbersToMarks('Bei3jing1'), 'Běijīng');
  assert.equal(pinyinNumbersToMarks('gou3 dui4 liu2'), 'gǒu duì liú');
  assert.equal(pinyinNumbersToMarks('nǐ hǎo'), 'nǐ hǎo');
});

test('pinyin ruby is one syllable per character; readings of digits stay whole', () => {
  assert.deepEqual(rubyPairs('学生', 'xué sheng'), [['学', 'xué'], ['生', 'sheng']]);
  assert.deepEqual(rubyPairs('北京', 'Běi jīng'), [['北', 'Běi'], ['京', 'jīng']]);
  assert.deepEqual(rubyPairs('25', 'èr shí wǔ'), [['25', 'èr shí wǔ']]);
  assert.deepEqual(rubyPairs('学生', 'xuésheng'), [['学生', 'xuésheng']]);
});

test('TTS text: zh speaks tts || ja unchanged; Japanese placeholders are only rewritten for Japanese', () => {
  assert.equal(ttsText({ ja: '我是学生。' }, 'zh'), '我是学生。');
  assert.equal(ttsText({ ja: '十块钱', tts: '十块钱' }, 'zh'), '十块钱');
  assert.equal(ttsText({ ja: '〇〇駅' }, 'zh'), '〇〇駅');
  assert.equal(ttsText({ ja: '〇〇駅' }), 'まるまる駅');
});
