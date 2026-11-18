// Curriculum shipped to app/data/curriculum.json: build output, structure and the validator's negative cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCurriculum } from '../tools/build-curriculum.mjs';
import { validateCurriculum } from '../tools/validate.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const shipped = read('../app/data/curriculum.json');
const source = read('../curriculum/data/curriculum.json');
const phrases = read('../app/data/phrases.json');
const kanji = read('../app/data/kanji.json');

test('app/data/curriculum.json is the current build of curriculum/data/curriculum.json', () => {
  assert.deepEqual(shipped, JSON.parse(JSON.stringify(buildCurriculum(source))));
});

test('curriculum counts: 1015 items, 80 lessons, core 248 / ext 553 / ref 214', () => {
  assert.equal(shipped.items.length, 1015);
  assert.equal(shipped.lessons.length, 80);
  const byPath = shipped.items.reduce((a, it) => ((a[it.tags[0]] = (a[it.tags[0]] || 0) + 1), a), {});
  assert.deepEqual(byPath, { core: 248, ext: 553, ref: 214 });
  assert.equal(shipped.lessons.filter((l) => l.path === 'core').length, 20);
});

test('validator: the shipped curriculum is clean and keeps every v1 id', () => {
  const errors = [], warnings = [];
  const r = validateCurriculum(shipped, phrases, kanji, errors, warnings);
  assert.deepEqual(errors, []);
  assert.equal(r.v1Kept, phrases.items.length);
});

test('items are sorted by study order and the first lesson starts with the polite basics', () => {
  assert.ok(shipped.items.every((it, i) => it.order === i + 1));
  assert.equal(shipped.lessons[0].code, 'U01-L01');
  assert.equal(shipped.items[0].id, 'basics.sumimasen');
});

test('one romaji for クォーツ in the curriculum and the kanji sheet (kwōtsu)', () => {
  assert.equal(shipped.items.find((it) => it.ja === 'クォーツ').romaji, 'kwōtsu');
  assert.equal(kanji.items.find((k) => k.ja === 'クォーツ').romaji, 'kwōtsu');
});

test('validator catches broken curriculum data', () => {
  const run = (mutate) => {
    const c = JSON.parse(JSON.stringify(shipped));
    mutate(c);
    const errors = [];
    validateCurriculum(c, phrases, kanji, errors, []);
    return errors.join('\n');
  };
  assert.match(run((c) => { c.items[0].romaji = 'sumimasn'; }), /romaji/);
  assert.match(run((c) => { c.items[0].ja = 'すいません'; }), /ruby→ja|ja changed/);
  assert.match(run((c) => { c.items[5].order = 1; }), /order/);
  assert.match(run((c) => { c.lessons[0].count += 1; }), /count/);
  assert.match(run((c) => { c.items = c.items.filter((it) => it.id !== 'konbini.bag-none'); }), /v1 id missing: konbini\.bag-none|unknown id/);
  assert.match(run((c) => { const h = c.items.find((it) => it.replies?.length); h.replies.push('basics.hai.nope'); }), /missing basics\.hai\.nope/);
  assert.match(run((c) => { c.items[0].tags = ['ext']; }), /path/);
  assert.match(run((c) => { c.items[0].tts = '十分'; }), /tts must be kana/);
});

test('kanji sheet: curriculum/src/kanji-extra.mjs merged after our items; pharmacy group after allergen', async () => {
  const { KANJI_EXTRA, GROUPS_EXTRA } = await import('../curriculum/src/kanji-extra.mjs');
  const ids = kanji.items.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  for (const x of KANJI_EXTRA) assert.ok(ids.includes(x.id), x.id);
  const g = kanji.groups.map((x) => x.id);
  for (const x of GROUPS_EXTRA) assert.ok(g.includes(x.id));
  assert.equal(g.indexOf('pharmacy'), g.indexOf('allergen') + 1);
  // within a group: our items first, then the extras in their own order
  for (const grp of g) {
    const inGroup = kanji.items.filter((k) => k.group === grp).map((k) => k.id);
    const extra = KANJI_EXTRA.filter((x) => x.group === grp).map((x) => x.id);
    assert.deepEqual(inGroup.slice(inGroup.length - extra.length), extra, grp);
  }
});
