// Curriculum logic (CURRICULUM.md §3): lesson progress and unlocking, lesson of the day, pretest, test-out,
// lesson quizzes, reply chains, situation runs, pre-flight run, streak, romaji visibility.
// Pure functions (no DOM, no storage) — tested in Node: tests/curriculum-logic.test.mjs.
import { normBox, keyOf, buildSession, addDays, INTERVALS } from './srs.js';

export const UNLOCK_SHARE = 0.8;      // next CORE lesson opens when ≥ 80 % of items are in box ≥ 2
export const MAX_DUE_FOR_NEW = 60;    // more due reviews than this → no new lesson today
export const PRETEST_SIZE = 5;
export const TEST_OUT_SIZE = 10;
export const TEST_OUT_PASS = 8;
export const QUIZ_SIZE = 10;

/** Main study mode of an item: say/pattern → EN → JA aloud; hear → audio → meaning; card → none. */
export function mainMode(it) {
  if (it.kind === 'card') return null;
  return it.kind === 'hear' ? 'audio' : 'en2ja';
}
export const trainable = (it) => it.kind !== 'card';

export function lessonItems(data, code) {
  const l = data.lessonByCode[code];
  return l ? l.ids.map((id) => data.byId[id]).filter(Boolean) : [];
}

/** Best box of an item over all its modes (0 = never studied). */
export function itemBox(state, it) {
  let best = 0;
  for (const m of ['en2ja', 'ja2en', 'audio']) {
    const st = state[keyOf(it.id, m)];
    if (st) best = Math.max(best, normBox(st.box));
  }
  return best;
}

export function lessonProgress(data, lesson, state, passed = {}) {
  const items = lessonItems(data, lesson.code).filter(trainable);
  const learned = items.filter((it) => itemBox(state, it) >= 2).length;
  const seen = items.filter((it) => itemBox(state, it) >= 1).length;
  const share = items.length ? learned / items.length : 1;
  const isPassed = !!passed[lesson.code];
  return { total: items.length, learned, seen, share, passed: isPassed, done: isPassed || share >= UNLOCK_SHARE };
}

export const coreLessons = (data) => data.lessons.filter((l) => l.path === 'core');

/** EXT and REF are always open; a CORE lesson opens when the previous CORE lesson is done (or passed by test-out). */
export function isUnlocked(data, lesson, state, passed = {}) {
  if (lesson.path !== 'core') return true;
  const core = coreLessons(data);
  const i = core.findIndex((l) => l.code === lesson.code);
  if (i <= 0) return true;
  return lessonProgress(data, core[i - 1], state, passed).done;
}

/** The CORE lesson to work on: the first unlocked one that is not done yet (null when the core is complete). */
export function currentLesson(data, state, passed = {}) {
  for (const l of coreLessons(data)) {
    if (!isUnlocked(data, l, state, passed)) return null;
    if (!lessonProgress(data, l, state, passed).done) return l;
  }
  return null;
}

/** Cards due today across the whole corpus (one per phrase). */
export function dueQueue(data, state, today) {
  return buildSession({ items: data.items.filter(trainable), state, modes: ['en2ja', 'ja2en', 'audio'], today, newLimit: 0, maxReviews: 500 });
}

/** New cards of a lesson in lesson order, in the item's main mode, skipping anything already started. */
export function newCards(data, code, state) {
  return lessonItems(data, code).filter(trainable).filter((it) => itemBox(state, it) === 0)
    .map((it) => ({ key: keyOf(it.id, mainMode(it)), id: it.id, mode: mainMode(it), item: it, isNew: true }));
}

/** Pretest (R8): up to 5 unseen items of the lesson, staff lines first — audio → "what does it mean?". */
export function pickPretest(data, code, state, n = PRETEST_SIZE) {
  const fresh = lessonItems(data, code).filter(trainable).filter((it) => itemBox(state, it) === 0);
  const hear = fresh.filter((it) => it.kind === 'hear');
  const say = fresh.filter((it) => it.kind !== 'hear');
  return [...hear, ...say].slice(0, n);
}

/**
 * Morning plan: due reviews → (pretest → new lesson → quiz) unless more than 60 reviews are due
 * or a lesson was already started today.
 */
export function morningPlan(data, state, log, today) {
  const due = dueQueue(data, state, today);
  const passed = log.passed || {};
  const lesson = currentLesson(data, state, passed);
  const startedToday = Object.entries(log.started || {}).find(([, d]) => d === today)?.[0] || null;
  const todays = startedToday ? data.lessonByCode[startedToday] : null;
  const allowNew = due.length <= MAX_DUE_FOR_NEW;
  const target = todays || (allowNew ? lesson : null);
  return {
    due,
    allowNew,
    lesson: target,
    continuing: !!todays,
    pretest: target ? pickPretest(data, target.code, state) : [],
    learn: target ? newCards(data, target.code, state) : [],
  };
}

/** Evening: today's new items once more (main mode), regardless of due dates. */
export function eveningQueue(data, learned, today) {
  return Object.entries(learned || {}).filter(([, d]) => d === today).map(([id]) => data.byId[id]).filter(Boolean).filter(trainable)
    .map((it) => ({ key: keyOf(it.id, mainMode(it)), id: it.id, mode: mainMode(it), item: it, isNew: false }));
}

// ---------- Test-out ----------
export function pickTestOut(data, code, rnd = Math.random, n = TEST_OUT_SIZE) {
  return shuffle(lessonItems(data, code).filter(trainable), rnd).slice(0, n);
}
export function testOutPassed(correct, asked) {
  return asked > 0 && correct >= Math.ceil((TEST_OUT_PASS / TEST_OUT_SIZE) * asked);
}
/** Correct test-out items go to box 3 in their main mode (light review stays). Returns a new state object. */
export function applyTestOut(state, items, today) {
  const out = { ...state };
  for (const it of items) {
    const k = keyOf(it.id, mainMode(it));
    const cur = out[k] || {};
    if (normBox(cur.box) < 3 || !out[k]) out[k] = { box: 3, due: addDays(today, INTERVALS[2]), seen: (cur.seen || 0) + 1, lapses: cur.lapses || 0 };
  }
  return out;
}

// ---------- Quizzes ----------
function meaningOptions(correct, pool, rnd, n = 4) {
  const others = [...new Set(pool.map((x) => x.en).filter((e) => e && e !== correct.en))];
  return shuffle([correct.en, ...shuffle(others, rnd).slice(0, n - 1)], rnd);
}

/** Reply options: the correct replies (at most 2 shown) plus say-distractors from the same lessons, 4 in total. */
export function replyOptions(data, hearItem, poolCodes, rnd = Math.random) {
  const replies = (hearItem.replies || []).map((id) => data.byId[id]).filter(Boolean);
  const right = shuffle(replies, rnd).slice(0, Math.min(2, replies.length));
  const ids = new Set(hearItem.replies || []);
  const pool = poolCodes.flatMap((c) => lessonItems(data, c)).filter((x) => (x.kind === 'say' || x.kind === 'pattern') && !ids.has(x.id));
  const fallback = data.items.filter((x) => x.kind === 'say' && x.cat === hearItem.cat && !ids.has(x.id));
  const distractors = shuffle([...new Map([...pool, ...fallback].map((x) => [x.id, x])).values()], rnd).slice(0, 4 - right.length);
  return { options: shuffle([...right, ...distractors], rnd), correct: ids };
}

/**
 * Lesson quiz (§3.8): JA → EN (4 options), audio → meaning for hear items, mini-dialog (hear → pick the reply),
 * EN → JA aloud (self-graded). Up to 10 questions.
 */
export function buildQuiz(data, code, rnd = Math.random, n = QUIZ_SIZE) {
  const items = lessonItems(data, code).filter(trainable);
  const pool = items.length >= 4 ? items : data.items.filter((x) => x.cat === items[0]?.cat && trainable(x));
  const qs = [];
  for (const it of shuffle(items, rnd)) {
    if (it.kind === 'hear') {
      if (it.replies?.length && rnd() < 0.6) qs.push({ type: 'reply', item: it, ...replyOptions(data, it, [code], rnd) });
      else qs.push({ type: 'audio', item: it, options: meaningOptions(it, pool, rnd) });
    } else {
      qs.push(rnd() < 0.6 ? { type: 'ja2en', item: it, options: meaningOptions(it, pool, rnd) } : { type: 'en2ja', item: it });
    }
    if (qs.length >= n) break;
  }
  return qs;
}

// ---------- Reply chains (§3.4) ----------
export const SCENES = [
  { id: 'konbini', title: 'Konbini register', lessons: ['U01-L05', 'U01-L04'], badge: 'Ready for the konbini register' },
  { id: 'table', title: 'Getting a table', lessons: ['U03-L01'], badge: 'Ready to get a table' },
  { id: 'order', title: 'Ordering food', lessons: ['U03-L02', 'U03-L04'], badge: 'Ready to order and pay' },
  { id: 'shop-pay', title: 'Paying in shops', lessons: ['U04-L05'], badge: 'Ready for the shop counter' },
  { id: 'camera', title: 'Camera shop staff', lessons: ['U08-L05', 'U04-L04'], badge: 'Ready for the camera shop' },
  { id: 'taxfree', title: 'Tax-free counter', lessons: ['U14-L04'], badge: 'Ready for tax-free' },
];

/** Steps of a reply chain: the staff lines (with replies) of the scene's lessons, in study order. */
export function chainSteps(data, lessonCodes, rnd = Math.random) {
  const hears = lessonCodes.flatMap((c) => lessonItems(data, c)).filter((it) => it.kind === 'hear' && it.replies?.length);
  hears.sort((a, b) => a.order - b.order);
  return hears.map((it) => ({ item: it, ...replyOptions(data, it, lessonCodes, rnd) }));
}

export function lessonHasChain(data, code) {
  return lessonItems(data, code).filter((it) => it.kind === 'hear' && it.replies?.length).length >= 2;
}

export function lessonScenes(data) {
  return data.lessons.filter((l) => lessonHasChain(data, l.code))
    .map((l) => ({ id: l.code, title: `${l.code} ${l.title}`, lessons: [l.code], badge: `Ready: ${l.title}` }));
}

// ---------- Trip: situations and pre-flight (§3.7) ----------
export const SITUATIONS = [
  { id: 'register', title: 'Register (konbini, shops)', lessons: ['U01-L04', 'U01-L05', 'U04-L05', 'U14-L01'] },
  { id: 'restaurant', title: 'Restaurant', lessons: ['U03-L01', 'U03-L02', 'U03-L03', 'U03-L04', 'U14-L02'] },
  { id: 'station', title: 'Station and trains', lessons: ['U04-L01', 'U04-L02', 'U07-L01', 'U07-L02'] },
  { id: 'taxi', title: 'Taxi and hotel check-in', lessons: ['U04-L03'] },
  { id: 'camera', title: 'Camera shop', lessons: ['U04-L04', 'U08-L01', 'U08-L02', 'U08-L03', 'U08-L04', 'U08-L05'] },
  { id: 'onsen', title: 'Onsen and ryokan', lessons: ['U09-L03'] },
];

/** A ~3-minute run: hear and say items of the situation's lessons, shuffled. */
export function situationQueue(data, situationId, rnd = Math.random, n = 15) {
  const s = SITUATIONS.find((x) => x.id === situationId);
  if (!s) return [];
  const items = s.lessons.flatMap((c) => lessonItems(data, c)).filter((it) => it.kind === 'hear' || it.kind === 'say');
  return shuffle(items, rnd).slice(0, n).map((it) => ({ key: keyOf(it.id, mainMode(it)), id: it.id, mode: mainMode(it), item: it, isNew: false }));
}

/** Pre-flight run: every CORE item once, audio → meaning. */
export function preflightQueue(data) {
  return data.items.filter((it) => it.tags?.[0] === 'core' && trainable(it))
    .map((it) => ({ key: keyOf(it.id, 'audio'), id: it.id, mode: 'audio', item: it, isNew: false }));
}

export function daysUntil(dateStr, today) {
  if (!dateStr) return null;
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = dateStr.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
}

// ---------- Motivation (§3.9) ----------
export function coreStats(data, state) {
  const core = data.items.filter((it) => it.tags?.[0] === 'core' && trainable(it));
  return { learned: core.filter((it) => itemBox(state, it) >= 2).length, total: core.length };
}

/** Consecutive study days ending today (or yesterday, if today has no activity yet). */
export function streak(days, today) {
  const set = new Set(days || []);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) { n += 1; d = addDays(d, -1); }
  return n;
}

// ---------- Romaji (§3.6) ----------
/** 'show' = romaji visible (small); 'tap' = hidden until tapped. Setting: auto (week 1 show, then tap) | show | hide. */
export function romajiMode(setting, week) {
  if (setting === 'show') return 'show';
  if (setting === 'hide') return 'tap';
  return week <= 1 ? 'show' : 'tap';
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
