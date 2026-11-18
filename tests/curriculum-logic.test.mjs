// Curriculum logic on the real shipped data: unlocking, lesson of the day, test-out, quizzes, chains, trip runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { completeItem } from '../app/modules/text.js';
import { keyOf } from '../app/modules/srs.js';
import * as C from '../app/modules/curriculum.js';

const cur = JSON.parse(readFileSync(new URL('../app/data/curriculum.json', import.meta.url), 'utf8'));
const items = cur.items.map(completeItem);
const lessons = cur.lessons.map((l, i) => ({ ...l, index: i }));
const data = {
  items, byId: Object.fromEntries(items.map((i) => [i.id, i])), lessons,
  lessonByCode: Object.fromEntries(lessons.map((l) => [l.code, l])),
};
const T = '2026-11-20';
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const learnAll = (code, box = 2) => Object.fromEntries(C.lessonItems(data, code).filter(C.trainable)
  .map((it) => [keyOf(it.id, C.mainMode(it)), { box, due: '2026-11-30' }]));

test('main modes: say/pattern EN→JA, hear audio, card none', () => {
  assert.equal(C.mainMode({ kind: 'say' }), 'en2ja');
  assert.equal(C.mainMode({ kind: 'pattern' }), 'en2ja');
  assert.equal(C.mainMode({ kind: 'hear' }), 'audio');
  assert.equal(C.mainMode({ kind: 'card' }), null);
});

test('unlocking: first CORE lesson open, second locked until ≥ 80 % in box ≥ 2; EXT/REF always open', () => {
  const [l1, l2] = C.coreLessons(data);
  assert.ok(C.isUnlocked(data, l1, {}));
  assert.ok(!C.isUnlocked(data, l2, {}));
  assert.ok(C.isUnlocked(data, data.lessonByCode['U08-L05'], {}));
  assert.ok(C.isUnlocked(data, data.lessonByCode['U14-L01'], {}));
  const items1 = C.lessonItems(data, l1.code);
  // 9 of 12 learned = 75 % → still locked; 10 of 12 = 83 % → open
  const st = {};
  items1.slice(0, 9).forEach((it) => { st[keyOf(it.id, 'en2ja')] = { box: 2, due: T }; });
  assert.ok(!C.isUnlocked(data, l2, st));
  st[keyOf(items1[9].id, 'en2ja')] = { box: 2, due: T };
  assert.ok(C.isUnlocked(data, l2, st));
  // test-out also unlocks
  assert.ok(C.isUnlocked(data, l2, {}, { [l1.code]: T }));
});

test('current lesson walks the core in order', () => {
  assert.equal(C.currentLesson(data, {}).code, 'U01-L01');
  assert.equal(C.currentLesson(data, learnAll('U01-L01')).code, 'U01-L02');
});

test('morning plan: pretest of unseen items (staff lines first), new cards in lesson order, no new lesson when > 60 due', () => {
  const p = C.morningPlan(data, {}, {}, T);
  assert.equal(p.lesson.code, 'U01-L01');
  assert.equal(p.learn.length, C.lessonItems(data, 'U01-L01').filter(C.trainable).length);
  assert.ok(p.pretest.length > 0 && p.pretest.length <= 5);
  const hearPre = C.pickPretest(data, 'U01-L05', {});
  assert.ok(hearPre.every((it) => it.kind === 'hear'));
  // 61 due reviews → no new lesson
  const due = {};
  items.filter(C.trainable).slice(0, 61).forEach((it) => { due[keyOf(it.id, C.mainMode(it))] = { box: 1, due: '2026-11-19' }; });
  const p2 = C.morningPlan(data, due, {}, T);
  assert.equal(p2.due.length, 61);
  assert.equal(p2.allowNew, false);
  assert.equal(p2.lesson, null);
  // a lesson started today is continued, not replaced
  const p3 = C.morningPlan(data, learnAll('U01-L01'), { started: { 'U01-L01': T } }, T);
  assert.equal(p3.lesson.code, 'U01-L01');
  assert.ok(p3.continuing);
});

test('evening queue = items first learned today', () => {
  const q = C.eveningQueue(data, { 'basics.hai': T, 'basics.iie': '2026-11-19' }, T);
  assert.deepEqual(q.map((x) => x.id), ['basics.hai']);
});

test('test-out: 10 items, 8 of 10 passes, correct items go to box 3', () => {
  const pick = C.pickTestOut(data, 'U02-L01', seeded(3));
  assert.equal(pick.length, 10);
  assert.ok(C.testOutPassed(8, 10) && !C.testOutPassed(7, 10));
  const st = C.applyTestOut({}, pick.slice(0, 8), T);
  assert.equal(Object.keys(st).length, 8);
  assert.ok(Object.values(st).every((v) => v.box === 3 && v.due === '2026-11-22'));
});

test('lesson quiz: up to 10 questions; meaning options contain the answer; reply questions have a correct option', () => {
  for (const code of ['U01-L01', 'U01-L05', 'U03-L01', 'U08-L05']) {
    const qs = C.buildQuiz(data, code, seeded(7));
    assert.ok(qs.length > 0 && qs.length <= 10, code);
    for (const q of qs) {
      if (q.type === 'ja2en' || q.type === 'audio') { assert.ok(q.options.includes(q.item.en)); assert.equal(new Set(q.options).size, q.options.length); }
      if (q.type === 'reply') assert.ok(q.options.some((o) => q.correct.has(o.id)), q.item.id);
    }
  }
});

test('reply chains: every scene has steps with a correct reply among ≤ 4 options', () => {
  for (const s of C.SCENES) {
    const steps = C.chainSteps(data, s.lessons, seeded(5));
    assert.ok(steps.length >= 2, s.id);
    for (const st of steps) {
      assert.ok(st.options.length <= 4 && st.options.some((o) => st.correct.has(o.id)), `${s.id}/${st.item.id}`);
    }
  }
  assert.ok(C.lessonHasChain(data, 'U01-L05'));
  assert.ok(!C.lessonHasChain(data, 'U01-L01'));
});

test('trip: situation runs and the pre-flight run', () => {
  for (const s of C.SITUATIONS) assert.ok(C.situationQueue(data, s.id, seeded(2)).length > 0, s.id);
  const pre = C.preflightQueue(data);
  assert.equal(pre.length, items.filter((it) => it.tags[0] === 'core' && it.kind !== 'card').length);
  assert.ok(pre.every((x) => x.mode === 'audio'));
  assert.equal(C.daysUntil('2026-12-09', '2026-12-06'), 3);
});

test('motivation: CORE N / total, streak', () => {
  const s = C.coreStats(data, learnAll('U01-L01'));
  assert.equal(s.learned, C.lessonItems(data, 'U01-L01').length);
  assert.equal(s.total, items.filter((it) => it.tags[0] === 'core' && it.kind !== 'card').length);
  assert.equal(C.streak(['2026-11-18', '2026-11-19', '2026-11-20'], T), 3);
  assert.equal(C.streak(['2026-11-18', '2026-11-19'], T), 2); // today not studied yet
  assert.equal(C.streak(['2026-11-17'], T), 0);
});

test('romaji: week 1 shown, then tap-to-show; settings override', () => {
  assert.equal(C.romajiMode('auto', 1), 'show');
  assert.equal(C.romajiMode('auto', 2), 'tap');
  assert.equal(C.romajiMode('show', 3), 'show');
  assert.equal(C.romajiMode('hide', 1), 'tap');
});
