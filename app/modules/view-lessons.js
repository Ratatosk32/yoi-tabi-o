// Lessons (CURRICULUM §3.3, §3.4, §3.8): units → lessons with progress and unlocking, a lesson page,
// lesson quiz, test-out, reply chains.
import { h, clear, rubyEl, speakItem, ico, toast, jaText, shuffle } from './ui.js';
import { todayStr, keyOf } from './srs.js';
import * as C from './curriculum.js';
import { runSession, noteActivity, doneCard } from './study-session.js';
import { phraseCard } from './view-phrases.js';

const PATH_INFO = {
  core: { title: 'Core', hint: 'One lesson a day before the flight. The next lesson opens when 80 % of the current one is learned (box 2+), or test out.' },
  ext: { title: 'Extended', hint: 'Study by situation: the evening before a camera-shop day, a shinkansen trip or an onsen. Always open.' },
  ref: { title: 'Reference', hint: 'Look things up and show them. Always open.' },
};

const lessonLog = (ctx) => ctx.store.get('lessons', {}) || {};
const updateLog = (ctx, fn) => ctx.store.update('lessons', {}, (l) => fn({ started: {}, passed: {}, quiz: {}, badges: {}, ...l }));

// ---------- Units → lessons ----------
export function renderLessons(ctx, box) {
  const state = ctx.store.get('srs', {});
  const log = lessonLog(ctx);
  const passed = log.passed || {};
  const cur = C.currentLesson(ctx.data, state, passed);
  const stats = C.coreStats(ctx.data, state);
  box.append(h('div.card.today',
    h('div.dayline', h('strong', `Core ${stats.learned} / ${stats.total}`), h('span', ' learned')),
    h('div.progress', h('span', { style: { width: `${Math.round((stats.learned / Math.max(1, stats.total)) * 100)}%` } })),
    cur ? h('button.btn.primary.wide#continue-lesson', { type: 'button', on: { click: () => ctx.go('#/study/lesson/' + cur.code) } },
      `Continue: ${cur.code} ${cur.title}`) : h('p.small', 'The core is done. Pick extended lessons by situation.')));

  for (const path of ['core', 'ext', 'ref']) {
    box.append(h('h2.section', PATH_INFO[path].title), h('p.small.path-hint', PATH_INFO[path].hint));
    for (const unit of ctx.data.units.filter((u) => u.path === path)) {
      const ls = ctx.data.lessons.filter((l) => l.unit === unit.id);
      box.append(h('div.unit',
        h('h3.unit-head', h('span.unit-code', unit.id), ' ', unit.title),
        ls.map((l) => lessonRow(ctx, l, state, passed, cur))));
    }
  }
  box.append(h('div.actions.wrap', h('button.btn', { type: 'button', on: { click: () => ctx.go('#/study/cards') } }, 'Custom training')));
}

function lessonRow(ctx, l, state, passed, cur) {
  const p = C.lessonProgress(ctx.data, l, state, passed);
  const open = C.isUnlocked(ctx.data, l, state, passed);
  const pct = Math.round(p.share * 100);
  return h('button.lesson-row' + (open ? '' : '.locked') + (cur && cur.code === l.code ? '.current' : '') + (p.done ? '.done' : ''), {
    type: 'button', 'data-lesson': l.code,
    'aria-label': `${l.code} ${l.title}. ${p.learned} of ${p.total} learned${open ? '' : '. Locked'}`,
    on: { click: () => ctx.go('#/study/lesson/' + l.code) },
  },
  h('span.lesson-main',
    h('span.lesson-title', h('span.lesson-code', l.code.slice(4)), ' ', l.title),
    h('span.lesson-bar', h('span', { style: { width: pct + '%' } }))),
  h('span.lesson-side', open ? (p.done ? h('span.ok', p.passed ? 'passed' : 'done') : `${p.learned}/${p.total}`) : ico('lock')));
}

// ---------- One lesson ----------
export function renderLesson(ctx, box, code) {
  const l = ctx.data.lessonByCode[code];
  if (!l) { box.append(h('div.empty', h('p', 'No such lesson.'), h('button.btn', { type: 'button', on: { click: () => ctx.go('#/study/lessons') } }, 'All lessons'))); return; }
  const state = ctx.store.get('srs', {});
  const log = lessonLog(ctx);
  const p = C.lessonProgress(ctx.data, l, state, log.passed || {});
  const open = C.isUnlocked(ctx.data, l, state, log.passed || {});
  const items = C.lessonItems(ctx.data, code);
  const fresh = C.newCards(ctx.data, code, state);
  const unit = ctx.data.unitById[l.unit];
  const back = () => ctx.go('#/study/lesson/' + code);

  box.append(
    h('button.btn.small.back-link', { type: 'button', on: { click: () => ctx.go('#/study/lessons') } }, ico('chevron'), 'All lessons'),
    h('div.card.lesson-card', { 'data-lesson': code },
      h('div.small.muted', `${l.code} · ${unit ? unit.title : ''} · ${PATH_INFO[l.path].title}`),
      h('h2.lesson-h', l.title),
      h('p', l.goal),
      l.patterns?.length ? h('p.small', 'Patterns: ', l.patterns.map((pt, i) => [i ? ', ' : '', jaText(pt)])) : null,
      h('div.lesson-bar.big', h('span', { style: { width: Math.round(p.share * 100) + '%' } })),
      h('p.small', `${p.learned} of ${p.total} learned (box 2+)` + (p.passed ? ' · passed by test-out' : '') + (log.quiz?.[code] != null ? ` · best quiz ${log.quiz[code]}` : '')),
      open ? null : h('p.small.warn', ico('lock'), ' Opens when the previous core lesson is 80 % learned. You can test out of it instead.'),
      h('div.actions.wrap',
        open ? h('button.btn.primary#lesson-learn', { type: 'button', disabled: !fresh.length, on: { click: () => startLearn(ctx, box, l, back) } }, fresh.length ? `Learn new (${fresh.length})` : 'All started') : null,
        open ? h('button.btn#lesson-review', { type: 'button', on: { click: () => startReview(ctx, box, l, back) } }, 'Review lesson') : null,
        open ? h('button.btn#lesson-quiz', { type: 'button', on: { click: () => runQuiz(ctx, box, code, back) } }, 'Quiz') : null,
        C.lessonHasChain(ctx.data, code) ? h('button.btn#lesson-chain', { type: 'button', on: { click: () => runChain(ctx, box, { title: l.title, lessons: [code] }, back) } }, 'Reply chain') : null,
        h('button.btn#lesson-testout', { type: 'button', on: { click: () => runTestOut(ctx, box, code, back) } }, 'Test out')),
    ),
    h('h2.section', `Phrases · ${items.length}`),
    h('div.list', items.map((it) => phraseCard(ctx, it, ctx.store.get('favs', []).includes(it.id), null))),
  );
}

export function markStarted(ctx, code) {
  updateLog(ctx, (l) => (l.started[code] ? l : { ...l, started: { ...l.started, [code]: todayStr() } }));
}

function startLearn(ctx, box, l, back) {
  markStarted(ctx, l.code);
  runSession(ctx, box, {
    title: l.title, queue: C.newCards(ctx.data, l.code, ctx.store.get('srs', {})),
    onDone: (c) => { clear(box).append(doneCard(`${l.title}: learned`, c,
      h('div.actions.wrap', h('button.btn.primary', { type: 'button', on: { click: () => runQuiz(ctx, box, l.code, back) } }, 'Lesson quiz'),
        h('button.btn', { type: 'button', on: { click: back } }, 'Back to the lesson')))); },
    onExit: back,
  });
}

function startReview(ctx, box, l, back) {
  const queue = C.lessonItems(ctx.data, l.code).filter(C.trainable)
    .map((it) => ({ key: keyOf(it.id, C.mainMode(it)), id: it.id, mode: C.mainMode(it), item: it, isNew: false }));
  runSession(ctx, box, { title: `${l.title}: review`, queue: shuffle(queue), onDone: (c) => { clear(box).append(doneCard('Review done', c, h('button.btn.primary', { type: 'button', on: { click: back } }, 'Back to the lesson'))); }, onExit: back });
}

// ---------- Lesson quiz (§3.8) ----------
export function runQuiz(ctx, box, code, onDone) {
  const qs = C.buildQuiz(ctx.data, code);
  let i = 0, score = 0;
  const step = () => {
    clear(box);
    if (i >= qs.length) {
      updateLog(ctx, (l) => ({ ...l, quiz: { ...l.quiz, [code]: Math.max(l.quiz[code] || 0, score) } }));
      box.append(h('div.card.done#quiz-done', h('h2', 'Lesson quiz'), h('p.score', h('strong', String(score)), ` of ${qs.length} correct`),
        h('div.actions.wrap', h('button.btn.primary', { type: 'button', on: { click: () => runQuiz(ctx, box, code, onDone) } }, 'Again'),
          h('button.btn', { type: 'button', on: { click: () => onDone?.() } }, 'Done'))));
      return;
    }
    const q = qs[i];
    const it = q.item;
    const card = h('div.card.quiz#lesson-quiz-card', { 'data-type': q.type });
    const feedback = h('div.feedback');
    const next = h('button.btn.primary.big.wide#quiz-next', { type: 'button', on: { click: () => { i += 1; step(); } } }, i + 1 < qs.length ? 'Next' : 'See the score');
    const finish = (ok, answerText) => {
      if (ok) score += 1;
      feedback.append(h('p' + (ok ? '.ok' : '.bad'), ok ? 'Correct' : 'Answer: ', ok ? null : answerText),
        h('div.jp', rubyEl(it.ruby, { furigana: true })), h('div.en', it.en), next);
      speakItem(it, 1.0);
    };
    const head = h('div.sess-head', h('span', `Quiz · ${i + 1}/${qs.length}`), h('span', `correct: ${score}`));
    if (q.type === 'ja2en' || q.type === 'audio') {
      card.append(q.type === 'ja2en'
        ? h('div.jp.center', rubyEl(it.ruby, { furigana: true }))
        : h('div.actions.center', h('button.btn.big.primary.listen', { type: 'button', on: { click: () => speakItem(it, 1.0) } }, ico('play'), 'Listen')),
      h('p.prompt', 'What does it mean?'),
      h('div.opts', q.options.map((o) => h('button.btn.opt', { type: 'button', on: { click: (e) => {
        if (card.dataset.answered) return; card.dataset.answered = '1';
        const ok = o === it.en;
        e.currentTarget.classList.add(ok ? 'right' : 'wrong');
        card.querySelectorAll('.opt').forEach((b) => { if (b.textContent === it.en) b.classList.add('right'); });
        finish(ok, it.en);
      } } }, o))), feedback);
      if (q.type === 'audio') setTimeout(() => speakItem(it, 1.0), 0);
    } else if (q.type === 'reply') {
      card.append(h('div.actions.center', h('button.btn.big.primary.listen', { type: 'button', on: { click: () => speakItem(it, 1.0) } }, ico('play'), 'Listen')),
        h('p.prompt', 'Staff said this. Pick your reply.'),
        h('div.opts.ja-opts', q.options.map((o) => h('button.btn.opt', { type: 'button', 'data-id': o.id, on: { click: (e) => {
          if (card.dataset.answered) return; card.dataset.answered = '1';
          const ok = q.correct.has(o.id);
          e.currentTarget.classList.add(ok ? 'right' : 'wrong');
          card.querySelectorAll('.opt').forEach((b) => { if (q.correct.has(b.dataset.id)) b.classList.add('right'); });
          speakItem(o, 1.0);
          if (ok) score += 1;
          feedback.append(h('p' + (ok ? '.ok' : '.bad'), ok ? 'Good reply' : 'A better reply is marked'), h('div.en', `${it.en} → ${o.en}`), next);
        } } }, rubyEl(o.ruby, { furigana: true })))), feedback);
      setTimeout(() => speakItem(it, 1.0), 0);
    } else {
      // EN → JA aloud, self-graded
      card.append(h('div.en.big.center', it.en), h('p.prompt', 'Say it in Japanese out loud.'),
        h('div.grade', h('button.btn.primary.wide.big', { type: 'button', on: { click: (e) => {
          e.currentTarget.parentElement.replaceWith(h('div.grade.two',
            h('button.btn.again', { type: 'button', on: { click: () => { i += 1; step(); } } }, 'Didn’t know'),
            h('button.btn.good', { type: 'button', on: { click: () => { score += 1; i += 1; step(); } } }, 'Knew')));
          card.append(h('div.back', h('div.jp.center', rubyEl(it.ruby, { furigana: true }))));
          speakItem(it, 1.0);
        } } }, 'Show answer')));
    }
    box.append(head, card);
  };
  step();
}

// ---------- Test-out (§3.3) ----------
export function runTestOut(ctx, box, code, onDone) {
  const pick = C.pickTestOut(ctx.data, code);
  const correct = [];
  let i = 0;
  const step = () => {
    clear(box);
    if (i >= pick.length) {
      const passed = C.testOutPassed(correct.length, pick.length);
      if (passed) {
        ctx.store.update('srs', {}, (st) => C.applyTestOut(st, correct, todayStr()));
        updateLog(ctx, (l) => ({ ...l, passed: { ...l.passed, [code]: todayStr() } }));
        correct.forEach((it) => noteActivity(ctx, it.id, true));
      }
      box.append(h('div.card.done#testout-done', h('h2', passed ? 'Passed' : 'Not yet'),
        h('p.score', h('strong', String(correct.length)), ` of ${pick.length} correct (8 needed)`),
        h('p.small', passed ? 'The lesson counts as done; the items you knew stay in light review.' : 'Learn the lesson as usual — early lessons are worth the time.'),
        h('div.actions.wrap', h('button.btn.primary', { type: 'button', on: { click: () => onDone?.() } }, 'Back to the lesson'))));
      return;
    }
    const it = pick[i];
    const audio = it.kind === 'hear';
    const card = h('div.card.flash#testout-card', { 'data-id': it.id });
    card.append(audio
      ? h('div.actions.center', h('button.btn.big.primary.listen', { type: 'button', on: { click: () => speakItem(it, 1.0) } }, ico('play'), 'Listen'))
      : h('div.en.big.center', it.en),
    h('p.prompt', audio ? 'What does it mean?' : 'Say it in Japanese out loud.'));
    const grade = h('div.grade', h('button.btn.primary.wide.big#reveal', { type: 'button', on: { click: () => {
      card.append(h('div.back', h('div.jp.center', rubyEl(it.ruby, { furigana: true })), h('div.en.center', it.en)));
      grade.replaceWith(h('div.grade.two',
        h('button.btn.again', { type: 'button', on: { click: () => { i += 1; step(); } } }, 'Didn’t know'),
        h('button.btn.good', { type: 'button', on: { click: () => { correct.push(it); i += 1; step(); } } }, 'Knew')));
      if (!audio) speakItem(it, 1.0);
    } } }, 'Show answer'));
    box.append(h('div.sess-head', h('span', `Test out · ${i + 1}/${pick.length}`), h('span', `knew: ${correct.length}`)), card, grade);
    if (audio) setTimeout(() => speakItem(it, 1.0), 0);
  };
  step();
}

// ---------- Reply chains (§3.4) ----------
export const CHAIN_SECONDS = 3;

/** scene: { id?, title, lessons, badge? } */
export function runChain(ctx, box, scene, onDone) {
  const steps = C.chainSteps(ctx.data, scene.lessons);
  if (steps.length < 1) { toast('No staff lines with replies here.'); onDone?.(); return; }
  let i = 0, score = 0, fast = 0;
  const step = () => {
    clear(box);
    if (i >= steps.length) {
      const ok = score >= Math.ceil(steps.length * 0.8);
      if (ok && scene.id) ctx.store.update('lessons', {}, (l) => ({ ...l, badges: { ...(l.badges || {}), [scene.id]: todayStr() } }));
      box.append(h('div.card.done#chain-done', h('h2', scene.title),
        h('p.score', h('strong', String(score)), ` of ${steps.length} good replies · ${fast} within ${CHAIN_SECONDS} s`),
        ok && scene.badge ? h('p.badge-earned', ico('star-fill'), ' ', scene.badge) : h('p.small', 'Aim for 8 of 10 good replies. Try again tomorrow.'),
        h('div.actions.wrap', h('button.btn.primary', { type: 'button', on: { click: () => runChain(ctx, box, scene, onDone) } }, 'Again'),
          h('button.btn', { type: 'button', on: { click: () => onDone?.() } }, 'Done'))));
      return;
    }
    const st = steps[i];
    const t0 = Date.now();
    const card = h('div.card.quiz#chain-card', { 'data-id': st.item.id });
    const timer = h('div.countdown', { style: { '--secs': CHAIN_SECONDS + 's' } }, h('span'));
    const feedback = h('div.feedback');
    card.append(
      h('div.actions.center', h('button.btn.big.primary.listen', { type: 'button', on: { click: () => speakItem(st.item, 1.0) } }, ico('play'), 'Staff line')),
      timer,
      h('p.prompt', 'Answer within 3 seconds: pick or say your reply.'),
      h('div.opts.ja-opts', st.options.map((o) => h('button.btn.opt', { type: 'button', 'data-id': o.id, on: { click: (e) => {
        if (card.dataset.answered) return; card.dataset.answered = '1';
        const secs = (Date.now() - t0) / 1000;
        const ok = st.correct.has(o.id);
        if (ok) { score += 1; if (secs <= CHAIN_SECONDS + 1) fast += 1; } // + 1 s for the line itself
        timer.classList.add('stopped');
        e.currentTarget.classList.add(ok ? 'right' : 'wrong');
        card.querySelectorAll('.opt').forEach((b) => { if (st.correct.has(b.dataset.id)) b.classList.add('right'); });
        speakItem(o, 1.0);
        feedback.append(h('p' + (ok ? '.ok' : '.bad'), ok ? `Good reply · ${secs.toFixed(1)} s` : 'A better reply is marked'),
          h('div.en', `${st.item.en} → ${o.en}`),
          h('button.btn.primary.big.wide#chain-next', { type: 'button', on: { click: () => { i += 1; step(); } } }, i + 1 < steps.length ? 'Next line' : 'Finish'));
      } } }, rubyEl(o.ruby, { furigana: true })))),
      feedback);
    box.append(h('div.sess-head', h('span', `${scene.title} · ${i + 1}/${steps.length}`), h('span', `good: ${score}`)), card);
    setTimeout(() => speakItem(st.item, 1.0), 0);
  };
  step();
}
