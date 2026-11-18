// Study tab: lesson of the day (morning / evening), lessons, kana, prices, time (CURRICULUM.md §3).
import { h, add, clear, jaText, chip, shuffle, toast, ico, openSheet } from './ui.js';
import { buildSession, todayStr, studyWeek, stats, MODES, keyOf } from './srs.js';
import * as N from './numbers.js';
import * as tts from './tts.js';
import * as C from './curriculum.js';
import { runSession, doneCard } from './study-session.js';
import { renderLessons, renderLesson, runQuiz, runChain, markStarted } from './view-lessons.js';

const SUBS = [
  { id: 'today', label: 'Today' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'kana', label: 'Kana' },
  { id: 'numbers', label: 'Prices' },
  { id: 'time', label: 'Time', title: 'Time, dates and counting' },
];

export function render(ctx, root, params) {
  const route = params[0] || 'today';
  const sub = route === 'lesson' || route === 'cards' ? 'lessons' : SUBS.find((s) => s.id === route) ? route : 'today';
  // Five equal segments that always fit the width (no sideways scrolling)
  const subnav = h('div.chips.subnav.seg', { 'aria-label': 'Study sections' },
    SUBS.map((s) => chip(s.label, s.id === sub, () => ctx.go('#/study/' + s.id), { 'data-sub': s.id, title: s.title || s.label })));
  root.append(h('header.top', h('h1', 'Study')), subnav);
  const box = h('div.study#study-box');
  root.append(box);
  if (route === 'lesson') return renderLesson(ctx, box, params[1]);
  if (route === 'cards') return renderCustom(ctx, box);
  ({ today: renderToday, lessons: renderLessons, kana: renderKana, numbers: renderNumbers, time: renderTime })[sub](ctx, box);
}

const trainable = (ctx) => ctx.allItems().filter((it) => it.kind !== 'card');

// ---------- Today: morning and evening sessions (§3.2) ----------
function renderToday(ctx, box) {
  const s = ctx.settings();
  const today = todayStr();
  const { day, week } = studyWeek(s.startDate || today);
  const state = ctx.store.get('srs', {});
  const log = ctx.store.get('lessons', {}) || {};
  const plan = C.morningPlan(ctx.data, state, log, today);
  const evening = C.eveningQueue(ctx.data, ctx.store.get('learned', {}), today);
  const core = C.coreStats(ctx.data, state);
  const streak = C.streak(ctx.store.get('activity', []), today);
  const st = stats(state);
  const toTrip = C.daysUntil(s.tripDate, today);

  const lastBackup = s.lastBackup ? new Date(s.lastBackup) : null;
  if (st.total >= 10 && (!lastBackup || (Date.now() - lastBackup.getTime()) > 7 * 86400000)) {
    box.append(h('div.card.notice#backup-reminder',
      h('strong', 'Back up your progress'),
      h('p.small', lastBackup ? `Last backup: ${lastBackup.toLocaleDateString('en-US')}.` : 'No backup yet.',
        ' Progress lives only in this browser and can be lost (especially on iPhone).'),
      h('button.btn.primary', { type: 'button', on: { click: () => ctx.go('#/tools') } }, 'Go to backup')));
  }

  const lessonLine = plan.lesson
    ? `${plan.continuing ? 'Continue' : 'New'}: ${plan.lesson.code} ${plan.lesson.title}` + (plan.learn.length ? ` (${plan.learn.length} new)` : '')
    : plan.allowNew ? 'Core done — pick an extended lesson' : `No new lesson today: ${plan.due.length} reviews due`;
  box.append(h('div.card.today',
    h('div.dayline.today-line', h('strong', `Day ${day}`), h('span', `week ${week} of 3`), h('span', `streak ${streak} ${streak === 1 ? 'day' : 'days'}`)),
    h('div.small', `Core ${core.learned} / ${core.total} learned`),
    h('div.progress', h('span', { style: { width: `${Math.round((core.learned / Math.max(1, core.total)) * 100)}%` } })),
    day <= 5 ? h('p.small', `Kana block: ${day <= 2 ? 'hiragana today' : 'katakana today'} — Study → Kana.`) : null));

  box.append(h('div.tiles',
    tile('Morning', `${plan.due.length} due · ${lessonLine}`, '12–15 min: reviews → pretest → lesson → quiz', () => runMorning(ctx, box), 'start-morning'),
    tile('Evening', `${evening.length} new from today`, '8–10 min: today’s items + price listening', () => runEvening(ctx, box), 'start-evening'),
    tile('Prices', '2–3 min, every day', 'Hear a price → type digits', () => ctx.go('#/study/numbers'), 'go-numbers'),
    tile('Lessons', `${ctx.data.lessons.length} lessons`, 'Units, progress, test out', () => ctx.go('#/study/lessons'), 'go-lessons'),
  ));

  // Reply chains and the trip
  const badges = log.badges || {};
  box.append(h('h2.section', 'Practice a scene'),
    h('p.small', 'A staff line plays; reply within 3 seconds. Badges: ' + (Object.keys(badges).length ? C.SCENES.filter((x) => badges[x.id]).map((x) => x.badge).join(', ') : 'none yet') + '.'),
    h('button.btn.wide#pick-scene', { type: 'button', on: { click: () => openSheet({
      title: 'Scene', attr: 'data-scene',
      options: C.SCENES.map((x) => ({ id: x.id, label: x.title, icon: badges[x.id] ? '★' : null })),
      onPick: (id) => runChain(ctx, box, C.SCENES.find((x) => x.id === id), () => ctx.rerender()),
    }) } }, ico('sound'), 'Reply chain: pick a scene'));

  box.append(h('h2.section', 'Trip'),
    toTrip == null ? h('p.small', 'Set your flight date in Tools → Settings to get the pre-flight run on the last 3 days.')
      : h('p.small', toTrip > 3 ? `Flight in ${toTrip} days.` : toTrip >= 0 ? `Flight in ${toTrip} ${toTrip === 1 ? 'day' : 'days'}: no new lessons, do the pre-flight run.` : 'Have a great trip! Before each situation, do a 3-minute run.'),
    h('div.trip-row',
      h('button.btn' + (toTrip != null && toTrip <= 3 && toTrip >= 0 ? '.primary' : '') + '#start-preflight', { type: 'button', on: { click: () => runPreflight(ctx, box) } }, 'Pre-flight run'),
      h('button.btn#pick-situation', { type: 'button', on: { click: () => openSheet({
        title: 'Before a situation', attr: 'data-situation',
        options: C.SITUATIONS.map((x) => ({ id: x.id, label: x.title })),
        onPick: (id) => runSituation(ctx, box, id),
      }) } }, 'Before a situation')));
  box.append(h('p.small.muted', `Cards in progress: ${st.total}. Boxes 1–5: ${st.boxes.join(' / ')}.`));
}

function tile(title, line1, line2, onClick, id) {
  return h('button.tile', { type: 'button', id, on: { click: onClick } }, h('strong', title), h('span', line1), h('small', line2));
}

const backToToday = (ctx) => () => ctx.go('#/study/today');

/** Morning: due reviews → pretest of the new lesson → new lesson → lesson quiz. */
function runMorning(ctx, box) {
  const today = todayStr();
  const plan = C.morningPlan(ctx.data, ctx.store.get('srs', {}), ctx.store.get('lessons', {}) || {}, today);
  const steps = [];
  if (plan.due.length) steps.push((next) => runSession(ctx, box, { title: 'Reviews', queue: plan.due, onDone: next, onExit: backToToday(ctx) }));
  if (plan.lesson && plan.allowNew !== false) {
    const code = plan.lesson.code;
    if (plan.pretest.length) {
      steps.push((next) => {
        markStarted(ctx, code);
        const queue = plan.pretest.map((it) => ({ key: keyOf(it.id, C.mainMode(it)), id: it.id, mode: 'audio', item: it, isNew: true }));
        runSession(ctx, box, { title: 'Pretest', kind: 'pretest', queue, onDone: next, onExit: backToToday(ctx) });
      });
    }
    steps.push((next) => {
      markStarted(ctx, code);
      const queue = C.newCards(ctx.data, code, ctx.store.get('srs', {}));
      if (!queue.length) return next();
      runSession(ctx, box, { title: plan.lesson.title, queue, onDone: next, onExit: backToToday(ctx) });
    });
    steps.push((next) => runQuiz(ctx, box, code, next));
  }
  if (!steps.length) { toast(plan.allowNew ? 'Nothing due. Open Lessons for extended lessons.' : 'Nothing to do this morning.'); return; }
  let i = 0;
  const next = () => {
    if (i < steps.length) { steps[i++](next); return; }
    clear(box).append(h('div.card.done#morning-done', h('h2', 'Morning done'),
      h('p', 'Come back this evening: today’s new items once more, plus 2–3 minutes of price listening.'),
      h('button.btn.primary', { type: 'button', on: { click: backToToday(ctx) } }, 'Back to today')));
  };
  next();
}

/** Evening: today's new items again, then price listening. */
function runEvening(ctx, box) {
  const queue = C.eveningQueue(ctx.data, ctx.store.get('learned', {}), todayStr());
  const afterwards = () => clear(box).append(h('div.card.done#evening-done', h('h2', 'Evening review done'),
    h('p', 'Finish with 2–3 minutes of price listening.'),
    h('div.actions.wrap', h('button.btn.primary#go-prices', { type: 'button', on: { click: () => ctx.go('#/study/numbers') } }, 'Price listening'),
      h('button.btn', { type: 'button', on: { click: backToToday(ctx) } }, 'Back to today'))));
  if (!queue.length) { afterwards(); return; }
  runSession(ctx, box, { title: 'Evening', queue, onDone: afterwards, onExit: backToToday(ctx) });
}

/** Pre-flight run (§3.7): every core item once, audio → meaning; misses go to favorites. */
function runPreflight(ctx, box) {
  runSession(ctx, box, {
    title: 'Pre-flight', kind: 'trip', queue: shuffle(C.preflightQueue(ctx.data)),
    onDone: (c) => clear(box).append(doneCard('Pre-flight run', c, h('p.small', 'Lines you missed are in Phrases → Favorites.'),
      h('button.btn.primary', { type: 'button', on: { click: backToToday(ctx) } }, 'Back to today'))),
    onExit: backToToday(ctx),
  });
}

/** Before a situation: a 3-minute run; "forgot" lines go into the SRS as due. */
function runSituation(ctx, box, id) {
  const sit = C.SITUATIONS.find((x) => x.id === id);
  runSession(ctx, box, {
    title: sit.title, queue: C.situationQueue(ctx.data, id),
    onDone: (c) => clear(box).append(doneCard(sit.title, c, h('button.btn.primary', { type: 'button', on: { click: backToToday(ctx) } }, 'Back to today'))),
    onExit: backToToday(ctx),
  });
}

// ---------- Custom training ----------
function renderCustom(ctx, box) {
  const cats = ctx.data.categories.filter((c) => c.id !== 'cards');
  let cat = 'all', mode = 'en2ja', onlyFav = false;
  const form = h('div.card');
  const back = () => ctx.go('#/study/cards');
  function draw() {
    clear(form);
    form.append(
      h('button.btn.small.back-link', { type: 'button', on: { click: () => ctx.go('#/study/lessons') } }, ico('chevron'), 'All lessons'),
      h('h2.section', 'Custom training'),
      h('p.small', 'Any category and mode, outside the lesson plan. Progress is shared with the lessons.'),
      h('label.field', h('span', 'Category'),
        h('select#custom-cat', { on: { change: (e) => { cat = e.target.value; draw(); } } },
          [['all', 'All'], ['hear', 'Staff will say'], ...cats.map((c) => [c.id, c.en])].map(([id, label]) => h('option', { value: id, selected: cat === id }, label)))),
      h('div.small.chips-label', 'Mode'),
      h('div.chips', Object.entries(MODES).map(([k, v]) => chip(v, mode === k, () => { mode = k; draw(); }))),
      h('label.check', h('input', { type: 'checkbox', checked: onlyFav, on: { change: (e) => { onlyFav = e.target.checked; draw(); } } }), ' favorites only'),
    );
    const favs = new Set(ctx.store.get('favs', []));
    const filter = (it) => (cat === 'all' || (cat === 'hear' ? it.kind === 'hear' : it.cat === cat)) && (!onlyFav || favs.has(it.id));
    const q = buildSession({ items: trainable(ctx), state: ctx.store.get('srs', {}), modes: [mode], newLimit: 20, filter });
    const all = trainable(ctx).filter(filter).filter((it) => (mode === 'audio' ? true : it.kind !== 'hear'));
    const done = (c) => clear(box).append(doneCard('Training done', c, h('button.btn.primary', { type: 'button', on: { click: back } }, 'Back')));
    form.append(h('div.actions.wrap',
      h('button.btn.primary', { type: 'button', on: { click: () => runSession(ctx, box, { title: 'Training', queue: q, onDone: done, onExit: back }) } }, `Start (${q.length})`),
      h('button.btn', { type: 'button', on: { click: () => {
        const queue = shuffle(all).slice(0, 20).map((it) => ({ key: `${it.id}|${mode}`, id: it.id, mode, item: it, isNew: false }));
        runSession(ctx, box, { title: 'Shuffle', queue, onDone: done, onExit: back });
      } } }, 'Shuffle 20 (ignore dates)')));
  }
  box.append(form);
  draw();
}

// ---------- Kana (§3.5): tables, quiz with response time, look-alike pairs ----------
let kanaScript = 'h';
function renderKana(ctx, box) {
  const K = ctx.data.kana;
  const tables = h('div');
  const quizBox = h('div.card#kana-quiz');
  function cellBtn(c) {
    if (!c) return h('span.kcell-empty');
    const ch = kanaScript === 'h' ? (c.h || c.k) : c.k;
    return h('button.kana', { type: 'button', on: { click: () => tts.speak(ch, 0.9) } }, jaText(ch, 'kch'), h('span.kr', c.r));
  }
  function table(title, rows, cols) {
    return h('div.kana-table',
      h('h3', title),
      h('div.kgrid5', { style: { '--cols': cols } }, rows.flat().map(cellBtn)));
  }
  function drawTables() {
    clear(tables);
    add(tables,
      h('h2.section', 'Kana tables'),
      h('p.small', 'Tap a kana to hear it.'),
      h('div.chips', chip('Hiragana', kanaScript === 'h', () => { kanaScript = 'h'; drawTables(); }), chip('Katakana', kanaScript === 'k', () => { kanaScript = 'k'; drawTables(); })),
      table('Gojūon', K.gojuon, 5),
      table('Dakuten and handakuten', K.dakuten, 5),
      table('Yōon (combinations)', K.yoon, 3),
      kanaScript === 'k' ? table('Extended katakana (loanwords)', K.extended, 4) : null,
      h('div.notes', K.notes.map((n) => h('p.small', h('strong', { lang: 'ja' }, n.mark), ' — ', n.en))),
    );
  }
  drawTables();
  drawQuizStart(ctx, quizBox, K);
  box.append(quizBox, tables);
}

// Confusable pairs from CURRICULUM §3.5
const LOOKALIKES = [['シ', 'ツ'], ['ソ', 'ン'], ['ク', 'ケ'], ['ぬ', 'め'], ['は', 'ほ'], ['る', 'ろ'], ['わ', 'ね', 'れ']];

const KANA_SETS = {
  hira: { label: 'Hiragana', pick: (K) => cells(K.gojuon).map((c) => ({ q: c.h, a: c.r })) },
  kata: { label: 'Katakana', pick: (K) => cells(K.gojuon).map((c) => ({ q: c.k, a: c.r })) },
  look: { label: 'Look-alikes', pick: (K) => {
    const all = [...cells(K.gojuon), ...cells(K.dakuten)];
    const r = (ch) => all.find((c) => c.h === ch || c.k === ch)?.r;
    return LOOKALIKES.flat().map((ch) => ({ q: ch, a: r(ch), group: LOOKALIKES.find((g) => g.includes(ch)).map(r) }));
  } },
  dakuyoon: { label: 'Dakuten + yōon', pick: (K) => [...cells(K.dakuten), ...cells(K.yoon)].flatMap((c) => [{ q: c.h, a: c.r }, { q: c.k, a: c.r }]) },
  words: { label: 'Katakana words', pick: (K) => K.words.map((w) => ({ q: w.k, a: w.en, sub: w.r })) },
};
function cells(rows) { return rows.flat().filter(Boolean); }

function drawQuizStart(ctx, quizBox, K) {
  clear(quizBox);
  const best = ctx.store.get('quizStats', {}).kana || {};
  quizBox.append(h('h2.section', 'Kana quiz'), h('p.small', '10 questions, 4 options. Aim for under 2 seconds each; look-alikes train シ/ツ, ソ/ン, ク/ケ, ぬ/め, は/ほ, る/ろ, わ/ね/れ.'),
    h('div.chips', Object.entries(KANA_SETS).map(([k, v]) => chip(`${v.label}${best[k] != null ? ` · ${best[k]}/10` : ''}`, false, () => runKanaQuiz(ctx, quizBox, K, k), { 'data-set': k }))));
}

function runKanaQuiz(ctx, quizBox, K, setKey) {
  const pool = KANA_SETS[setKey].pick(K);
  const qs = shuffle(pool).slice(0, 10);
  let i = 0, score = 0;
  const times = [];
  const step = () => {
    clear(quizBox);
    if (i >= qs.length) {
      ctx.store.update('quizStats', {}, (st) => ({ ...st, kana: { ...(st.kana || {}), [setKey]: score } }));
      const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : '–';
      quizBox.append(h('h2.section', 'Kana quiz'), h('p.score', h('strong', `${score}`), ` of ${qs.length} correct · ${avg} s on average`),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => runKanaQuiz(ctx, quizBox, K, setKey) } }, 'Again'),
          h('button.btn', { type: 'button', on: { click: () => drawQuizStart(ctx, quizBox, K) } }, 'Another set')));
      return;
    }
    const q = qs[i];
    const answers = [...new Set(pool.map((p) => p.a))].filter((a) => a && a !== q.a);
    // look-alikes: the partner characters' sounds are always among the options
    const partners = (q.group || []).filter((a) => a && a !== q.a);
    const opts = shuffle([q.a, ...partners, ...shuffle(answers.filter((a) => !partners.includes(a))).slice(0, 3 - partners.length)]);
    const feedback = h('div.feedback');
    const t0 = performance.now();
    quizBox.append(
      h('div.sess-head', h('span', `${KANA_SETS[setKey].label} · ${i + 1}/10`), h('span', `correct: ${score}`)),
      h('div.quiz-q', jaText(q.q, 'kana-big'), h('button.btn.icon', { type: 'button', 'aria-label': 'Play', on: { click: () => tts.speak(q.q, 0.9) } }, ico('play'))),
      h('div.opts', opts.map((o) => h('button.btn.opt', { type: 'button', on: { click: (e) => {
        if (quizBox.dataset.answered) return;
        quizBox.dataset.answered = '1';
        const secs = (performance.now() - t0) / 1000;
        times.push(secs);
        const ok = o === q.a;
        if (ok) score += 1;
        e.currentTarget.classList.add(ok ? 'right' : 'wrong');
        quizBox.querySelectorAll('.opt').forEach((b) => { if (b.textContent === q.a) b.classList.add('right'); });
        feedback.append(h('p' + (ok ? '.ok' : '.bad'), ok ? 'Correct' : 'Answer: ' + q.a, q.sub ? ` (${q.sub})` : '', ` · ${secs.toFixed(1)} s`));
        tts.speak(q.q, 0.9);
        feedback.append(h('button.btn.primary.big.wide#quiz-next', { type: 'button', on: { click: () => { delete quizBox.dataset.answered; i += 1; step(); } } }, i + 1 < qs.length ? 'Next' : 'See the score'));
      } } }, o))),
      feedback,
    );
  };
  step();
}

// ---------- Prices ----------
const numState = { range: 'konbini', mode: 'audio', n: null, ok: 0, total: 0 };
function renderNumbers(ctx, box) {
  const card = h('div.card#num-card');
  function next() { numState.n = N.randomPrice(numState.range); draw(); }
  function draw() {
    clear(card);
    const n = numState.n;
    const r = N.yenReading(n);
    const input = h('input.num-input#num-answer', { type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Digits, e.g. 12800', 'aria-label': 'Answer in digits' });
    const fb = h('div.feedback#num-feedback');
    const reveal = (ok) => {
      add(clear(fb),
        ok == null ? null : h('p' + (ok ? '.ok' : '.bad'), ok ? 'Correct' : 'Not quite'),
        h('div.answer', h('strong.price-big', `¥${n.toLocaleString('en-US')}`), jaText(N.yenMixed(n), 'ja answer-ja')),
        h('div.kana-line', { lang: 'ja' }, r.kana), h('div.romaji', r.romaji),
        h('div.actions', h('button.btn', { type: 'button', on: { click: () => tts.speak(`${n}円`, 0.8) } }, ico('play'), 'Play again'),
          h('button.btn.primary#num-next', { type: 'button', on: { click: next } }, 'Next')));
    };
    let answered = false; // one answer counts once (QA B5)
    const check = () => {
      if (answered) return;
      const v = N.parseDigits(input.value);
      if (Number.isNaN(v)) { toast('Type the number in digits'); return; }
      answered = true;
      const ok = v === n;
      numState.total += 1; if (ok) numState.ok += 1;
      reveal(ok);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (answered) next(); else check(); } });
    card.append(h('div.sess-head', h('span', `Correct ${numState.ok} of ${numState.total}`), h('span.small', N.PRICE_RANGES[numState.range].label)));
    if (numState.mode === 'audio') {
      card.append(h('div.actions.center',
        h('button.btn.big.primary#num-play', { type: 'button', on: { click: () => tts.speak(`${n}円`, 1.0) } }, ico('play'), 'Listen to the price'),
        h('button.btn.icon.slow', { type: 'button', title: 'Slow (0.7×)', 'aria-label': 'Play slowly', on: { click: () => tts.speak(`${n}円`, 0.7) } }, '0.7×')),
      input, h('div.actions', h('button.btn.primary#num-check', { type: 'button', on: { click: check } }, 'Check'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Show answer')));
    } else if (numState.mode === 'mixed') {
      card.append(h('div.center', jaText(N.yenMixed(n), 'price-big')), h('p.prompt', 'What is it in digits?'),
        input, h('div.actions', h('button.btn.primary', { type: 'button', on: { click: check } }, 'Check'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Show answer')));
    } else {
      card.append(h('div.center', h('div.price-big', `¥${n.toLocaleString('en-US')}`)), h('p.prompt', 'Say it out loud in Japanese, then check yourself.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { reveal(null); tts.speak(`${n}円`, 1.0); } } }, 'Show answer')));
    }
    card.append(fb);
  }
  box.append(
    h('div.small.chips-label', 'Price range'),
    h('div.chips', Object.entries(N.PRICE_RANGES).map(([k, v]) => chip(v.label, numState.range === k, () => { numState.range = k; numState.n = N.randomPrice(k); ctx.rerender(); }))), // B4
    h('div.small.chips-label', 'Exercise'),
    h('div.chips', [['audio', 'Listen → digits'], ['mixed', '12万8千円 → digits'], ['say', 'Digits → say it']].map(([k, v]) => chip(v, numState.mode === k, () => { numState.mode = k; ctx.rerender(); }))),
    card,
    h('p.small.muted', 'Tip: 万 = 10,000. 128,000 = 12万8千 = じゅうにまん はっせん. Sound changes: 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん.'),
  );
  if (numState.n == null) numState.n = N.randomPrice(numState.range);
  draw();
}

// ---------- Time, dates, counting ----------
const timeState = { mode: 'audio', t: null, ok: 0, total: 0 };
function speakTime({ h: hr, m }) { return `${hr}時${m ? (m === 30 ? '半' : m + '分') : ''}`; }
function parseTime(s) {
  const t = String(s).normalize('NFKC').trim().replace(/[.\s時]/g, ':').replace(/分/g, '').replace(/:+/g, ':');
  let m = t.match(/^(\d{1,2}):?(\d{2})?$/);
  if (!m) return null;
  return { h: Number(m[1]), m: m[2] ? Number(m[2]) : 0 };
}

function renderTime(ctx, box) {
  const card = h('div.card#time-card');
  function next() { timeState.t = N.randomTime(); draw(); }
  function draw() {
    clear(card);
    const t = timeState.t;
    const r = N.timeReading(t.h, t.m);
    const label = `${t.h}:${String(t.m).padStart(2, '0')}`;
    const fb = h('div.feedback');
    const input = h('input.num-input', { type: 'text', inputmode: 'numeric', placeholder: 'e.g. 9:30', 'aria-label': 'Time' });
    const reveal = (ok) => add(clear(fb),
      ok == null ? null : h('p' + (ok ? '.ok' : '.bad'), ok ? 'Correct' : 'Not quite'),
      h('div.answer', h('strong.price-big', label), jaText(speakTime(t), 'ja answer-ja')),
      h('div.kana-line', { lang: 'ja' }, r.kana), h('div.romaji', r.romaji),
      h('div.actions', h('button.btn', { type: 'button', on: { click: () => tts.speak(speakTime(t), 0.8) } }, ico('play'), 'Play again'),
        h('button.btn.primary', { type: 'button', on: { click: next } }, 'Next')));
    let answered = false; // one answer counts once (QA B5)
    const check = () => {
      if (answered) return;
      const v = parseTime(input.value);
      if (!v) { toast('Format: 9:30'); return; }
      answered = true;
      const ok = v.h === t.h && v.m === t.m;
      timeState.total += 1; if (ok) timeState.ok += 1;
      reveal(ok);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (answered) next(); else check(); } });
    card.append(h('div.sess-head', h('span', `Correct ${timeState.ok} of ${timeState.total}`)));
    if (timeState.mode === 'audio') {
      card.append(h('div.actions.center', h('button.btn.big.primary', { type: 'button', on: { click: () => tts.speak(speakTime(t), 1.0) } }, ico('play'), 'Listen to the time'),
        h('button.btn.icon.slow', { type: 'button', title: 'Slow (0.7×)', 'aria-label': 'Play slowly', on: { click: () => tts.speak(speakTime(t), 0.7) } }, '0.7×')),
      input, h('div.actions', h('button.btn.primary', { type: 'button', on: { click: check } }, 'Check'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Show answer')));
    } else {
      card.append(h('div.center', h('div.price-big', label)), h('p.prompt', 'Say it in Japanese, then check.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { reveal(null); tts.speak(speakTime(t), 1.0); } } }, 'Show answer')));
    }
    card.append(fb);
  }
  if (!timeState.t) timeState.t = N.randomTime();

  const counters = h('div.card',
    h('h2.section', 'Counters'),
    h('p.small', 'Open a list and tap a word to hear it.'),
    Object.entries(N.COUNTERS).map(([k, c]) => h('details.more',
      h('summary', c.label),
      h('div.ctable', c.items.map(([kana, romaji], i) => h('button.cnt', { type: 'button', on: { click: () => tts.speak(kana, 0.9) } },
        h('b', String(i + 1)), jaText(kana), h('small', romaji)))))));

  const year = new Date().getFullYear();
  const month = 12;
  const days = h('details.more',
    h('summary', 'December dates (with weekdays)'),
    h('div.ctable', Array.from({ length: 31 }, (_, i) => {
      const d = i + 1, r = N.dateReading(month, d), wd = N.WEEKDAYS[new Date(year, month - 1, d).getDay()];
      return h('button.cnt', { type: 'button', on: { click: () => tts.speak(r.kana, 0.9) } }, h('b', `${d} ${wd.short}`), jaText(r.kana), h('small', r.romaji));
    })));
  const weekdays = h('details.more', h('summary', 'Days of the week'),
    h('div.ctable', N.WEEKDAYS.map((w) => h('button.cnt', { type: 'button', on: { click: () => tts.speak(w.kana, 0.9) } }, h('b', { lang: 'ja' }, w.ja), jaText(w.kana), h('small', `${w.romaji} — ${w.en}`)))));

  box.append(
    h('div.chips', [['audio', 'Listen → time'], ['say', 'Time → say it']].map(([k, v]) => chip(v, timeState.mode === k, () => { timeState.mode = k; ctx.rerender(); }))),
    card, counters, h('div.card', h('h2.section', 'Dates'), days, weekdays),
  );
  draw();
}
