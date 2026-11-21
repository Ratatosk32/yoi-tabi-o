import { h, add, clear, jaText, chip, shuffle, ico } from './ui.js';
import * as tts from './tts.js';

const QUIZ_LENGTH = 10;
const OPTION_COUNT = 4;
const HAN = /[㐀-鿿]/u;

const say = (text, rate = 0.9) => text && tts.speak(text, rate);
const cueSize = (el, text) => { el.style.setProperty('--n', String([...text].length)); return el; };
const targetText = (text, cls) => (HAN.test(text) ? jaText(text, cls) : h('span', { class: cls }, text));

export function renderPinyin(ctx, box) {
  const P = ctx.data.pinyin || {};
  const quizBox = h('div.card#pinyin-quiz');
  drawQuizStart(ctx, quizBox, P);
  box.append(quizBox, tonesSection(P.tones || []), ...(P.tables || []).map(tableSection), notesSection(P.notes || []));
}

function tonesSection(tones) {
  if (!tones.length) return null;
  return h('section.block#pinyin-tones',
    h('h2.section', 'Tones'),
    h('p.small', 'Tap a tone to hear the example.'),
    h('div.tone-list', tones.map((t) => h('button.tone-row', {
      type: 'button', 'data-tone': String(t.n), on: { click: () => say(t.ex?.h) },
    },
    h('span.tone-mark', t.mark),
    h('span.tone-text', h('strong', t.name), h('small', [t.shape, t.contour ? `(${t.contour})` : null].filter(Boolean).join(' '))),
    t.ex ? h('span.tone-ex', jaText(t.ex.h, 'tone-ex-h'), h('small', `${t.ex.r} · ${t.ex.en}`)) : null))));
}

function tableSection(table) {
  const cell = (c) => {
    if (!c) return h('span.kcell-empty');
    return h('button.kana.py-cell', { type: 'button', title: c.en || c.h, on: { click: () => say(c.tts || c.ex) } },
      h('span.kch.py-h', c.h),
      h('span.kr', c.ex ? jaText(c.ex, 'py-ex') : null, c.py ? ' ' + c.py : ''));
  };
  return h('div.kana-table.py-table', { 'data-table': table.id },
    h('h3', table.title),
    h('div.kgrid5', { style: { '--cols': table.cols || 4 } }, (table.rows || []).flat().map(cell)));
}

function notesSection(notes) {
  if (!notes.length) return null;
  return h('div.notes', notes.map((n) => h('p.small', jaText(n.mark, 'note-mark'), ' — ', n.en)));
}

function drawQuizStart(ctx, quizBox, P) {
  clear(quizBox);
  const quizzes = (P.quizzes || []).filter((q) => q.items?.length);
  const best = ctx.store.get('quizStats', {}).pinyin || {};
  quizBox.append(h('h2.section', 'Pinyin quiz'),
    h('p.small', `${QUIZ_LENGTH} questions, ${OPTION_COUNT} options. Listening quizzes play the sound first; tap ▶ to hear it again.`));
  if (!quizzes.length) { quizBox.append(h('p.small.muted', 'No quizzes in this data yet.')); return; }
  quizBox.append(h('div.chips.quiz-sets', quizzes.map((q) => chip(`${q.label}${best[q.id] != null ? ` · ${best[q.id]}/${Math.min(QUIZ_LENGTH, q.items.length)}` : ''}`, false,
    () => runPinyinQuiz(ctx, quizBox, P, q), { 'data-set': q.id, title: q.hint || q.label }))));
}

export function quizOptions(q, pool, rnd = Math.random) {
  if (Array.isArray(q.opts) && q.opts.length) return shuffle(q.opts.includes(q.a) ? q.opts : [q.a, ...q.opts.slice(0, OPTION_COUNT - 1)], rnd);
  const others = [...new Set(pool.map((p) => p.a))].filter((a) => a && a !== q.a);
  return shuffle([q.a, ...shuffle(others, rnd).slice(0, OPTION_COUNT - 1)], rnd);
}

function runPinyinQuiz(ctx, quizBox, P, quiz) {
  const pool = quiz.items;
  const qs = shuffle(pool).slice(0, QUIZ_LENGTH);
  const listen = quiz.mode === 'listen';
  let i = 0, score = 0;
  const step = () => {
    clear(quizBox);
    delete quizBox.dataset.answered;
    if (i >= qs.length) {
      ctx.store.update('quizStats', {}, (st) => ({ ...st, pinyin: { ...(st.pinyin || {}), [quiz.id]: score } }));
      quizBox.append(h('h2.section', 'Pinyin quiz'), h('p.score', h('strong', String(score)), ` of ${qs.length} correct`),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => runPinyinQuiz(ctx, quizBox, P, quiz) } }, 'Again'),
          h('button.btn', { type: 'button', on: { click: () => drawQuizStart(ctx, quizBox, P) } }, 'Another set')));
      return;
    }
    const q = qs[i];
    const sound = q.tts || q.q;
    const feedback = h('div.feedback');
    const cue = listen
      ? h('div.actions.center.listen-cue', h('button.btn.big.primary.listen#py-play', { type: 'button', on: { click: () => say(sound, 1.0) } }, ico('play'), 'Listen'),
        h('button.btn.icon.slow', { type: 'button', title: 'Slow (0.7×)', 'aria-label': 'Play slowly', on: { click: () => say(sound, 0.7) } }, '0.7×'))
      : cueSize(h('div.quiz-q' + ([...q.q].length > 1 ? '.is-word' : ''), targetText(q.q, 'kana-big' + ([...q.q].length > 1 ? ' is-word' : '')),
        h('button.btn.icon', { type: 'button', 'aria-label': 'Play', on: { click: () => say(sound) } }, ico('play'))), q.q);
    const answer = (o, btn) => {
      if (quizBox.dataset.answered) return;
      quizBox.dataset.answered = '1';
      const ok = o === q.a;
      if (ok) score += 1;
      btn.classList.add(ok ? 'right' : 'wrong');
      quizBox.querySelectorAll('.opt').forEach((b) => { if (b.dataset.value === q.a) b.classList.add('right'); });
      add(feedback,
        h('p' + (ok ? '.ok' : '.bad'), ok ? 'Correct' : 'Answer: ' + q.a),
        h('p.quiz-reveal', targetText(q.q, 'quiz-reveal-q'), q.sub ? h('span.small', ' · ' + q.sub) : null),
        h('button.btn.primary.big.wide#quiz-next', { type: 'button', on: { click: () => { i += 1; step(); } } }, i + 1 < qs.length ? 'Next' : 'See the score'));
      say(sound);
    };
    quizBox.append(
      h('div.sess-head', h('span', `${quiz.label} · ${i + 1}/${qs.length}`), h('span', `correct: ${score}`)),
      cue,
      quiz.hint ? h('p.prompt', quiz.hint) : null,
      h('div.opts', quizOptions(q, pool).map((o) => h('button.btn.opt', {
        type: 'button', 'data-value': o, on: { click: (e) => answer(o, e.currentTarget) },
      }, o))),
      feedback);
    if (listen) say(sound, 1.0);
  };
  step();
}
