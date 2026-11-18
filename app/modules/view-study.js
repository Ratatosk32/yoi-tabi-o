// Study tab: today's lesson, SRS (Leitner), kana (tables + quiz), price and time trainers.
import { h, clear, rubyEl, jaText, speakButtons, speakItem, chip, shuffle, toast, ico } from './ui.js';
import { buildSession, grade, todayStr, studyWeek, stats, MODES } from './srs.js';
import * as N from './numbers.js';
import * as tts from './tts.js';
import { replyBlock } from './view-phrases.js';

const SUBS = [
  { id: 'today', label: 'Today' },
  { id: 'cards', label: 'Cards' },
  { id: 'kana', label: 'Kana' },
  { id: 'numbers', label: 'Prices' },
  { id: 'time', label: 'Time & counting' },
];

const WEEK_FOCUS = {
  1: 'Week 1: hiragana and katakana (with yōon, っ, ー), polite basics, numbers up to 10,000 and 万, konbini. Listening: konbini till phrases.',
  2: 'Week 2: patterns, restaurants, transport, time and dates, counters 枚/本/個. Listening: restaurant staff. Kanji: signs and stations (5 a day).',
  3: 'Week 3: shopping (cameras, watches, tax-free), hotel, child and emergencies. Fill in the Allergy and Hotel address cards. Two dress rehearsals in Listening.',
};

let session = null; // current SRS session (lives while the tab is open)

export function render(ctx, root, params) {
  const sub = SUBS.find((s) => s.id === params[0]) ? params[0] : 'today';
  root.append(
    h('header.top', h('h1', 'Study')),
    h('div.chips.subnav', SUBS.map((s) => chip(s.label, s.id === sub, () => { session = null; ctx.go('#/study/' + s.id); }))),
  );
  const box = h('div.study#study-box');
  root.append(box);
  ({ today: renderToday, cards: renderCustom, kana: renderKana, numbers: renderNumbers, time: renderTime })[sub](ctx, box);
}

// ---------- shared selections ----------
function uniqueByJa(items) {
  const seen = new Set();
  return items.filter((it) => (seen.has(it.ja) ? false : (seen.add(it.ja), true)));
}
function weekFilter(week) {
  return (it) => (it.tags || []).some((t) => /^w\d$/.test(t) && Number(t.slice(1)) <= week);
}
function trainable(ctx) {
  return uniqueByJa(ctx.allItems().filter((it) => it.kind !== 'card'));
}

function reviewConfig(ctx, week) {
  const s = ctx.settings();
  return {
    title: 'Review',
    items: trainable(ctx).filter((it) => it.kind === 'say' || it.kind === 'pattern'),
    modes: ['ja2en', 'en2ja'],
    newLimit: s.newPerDay,
    filter: weekFilter(week),
  };
}
function listenConfig(ctx, week) {
  const s = ctx.settings();
  return {
    title: 'Listening',
    items: trainable(ctx),
    modes: ['audio'],
    newLimit: Math.ceil(s.newPerDay / 2),
    filter: (it) => weekFilter(week)(it) && (it.kind === 'hear' || it.kind === 'say'),
  };
}

function preview(ctx, cfg) {
  const state = ctx.store.get('srs', {});
  const q = buildSession({ ...cfg, state, today: todayStr() });
  return { due: q.filter((x) => !x.isNew).length, fresh: q.filter((x) => x.isNew).length, queue: q };
}

// ---------- Today ----------
function renderToday(ctx, box) {
  if (session) return renderSession(ctx, box);
  const s = ctx.settings();
  const { day, week } = studyWeek(s.startDate || todayStr());
  const rev = preview(ctx, reviewConfig(ctx, week));
  const lis = preview(ctx, listenConfig(ctx, week));
  const st = stats(ctx.store.get('srs', {}));
  const lastBackup = s.lastBackup ? new Date(s.lastBackup) : null;
  const needBackup = st.total >= 10 && (!lastBackup || (Date.now() - lastBackup.getTime()) > 7 * 86400000);
  if (needBackup) {
    box.append(h('div.card.notice#backup-reminder',
      h('strong', 'Back up your progress'),
      h('p.small', lastBackup ? `Last backup: ${lastBackup.toLocaleDateString('en-US')}.` : 'No backup yet.',
        ' Progress lives only in this browser and can be lost (especially on iPhone).'),
      h('button.btn.primary', { type: 'button', on: { click: () => ctx.go('#/tools') } }, 'Go to backup')));
  }
  box.append(
    h('div.card.today',
      h('div.dayline', h('strong', `Day ${day}`), h('span', ` · week ${week} of 3`)),
      h('p.small', WEEK_FOCUS[week]),
      h('p.small', 'A 20–30 minute plan: review 5–10 min · listening 5 min · prices 3–5 min · topic of the day 5–10 min.')),
    h('div.tiles',
      tile('Review', `due ${rev.due} · new ${rev.fresh}`, 'JA→EN and EN→JA out loud', () => startSession(ctx, box, rev.queue, 'Review'), 'start-review'),
      tile('Listening', `due ${lis.due} · new ${lis.fresh}`, 'Sound first, then meaning', () => startSession(ctx, box, lis.queue, 'Listening'), 'start-listen'),
      tile('Prices', '10 drills', 'Hear a price → type digits', () => ctx.go('#/study/numbers'), 'go-numbers'),
      tile('Kana', 'tables and quiz', 'Week 1 essentials', () => ctx.go('#/study/kana'), 'go-kana'),
    ),
    h('p.small.muted', `Cards in progress: ${st.total}. Boxes 1–5: ${st.boxes.join(' / ')}.`),
  );
}

function tile(title, line1, line2, onClick, id) {
  return h('button.tile', { type: 'button', id, on: { click: onClick } }, h('strong', title), h('span', line1), h('small', line2));
}

function startSession(ctx, box, queue, title) {
  if (!queue.length) { toast('All done for today! You can review favorites in Phrases.'); return; }
  session = { title, queue: queue.slice(), idx: 0, revealed: false, counts: { again: 0, hard: 0, good: 0 }, requeued: new Set() };
  clear(box);
  renderSession(ctx, box);
}

// ---------- Session ----------
function renderSession(ctx, box) {
  clear(box);
  const s = ctx.settings();
  if (session.idx >= session.queue.length) {
    const c = session.counts;
    box.append(h('div.card.done',
      h('h2', `${session.title}: done`),
      h('p', `Know: ${c.good} · hard: ${c.hard} · forgot: ${c.again}`),
      h('button.btn.primary', { type: 'button', on: { click: () => { session = null; clear(box); renderToday(ctx, box); } } }, 'Back to today')));
    return;
  }
  const cur = session.queue[session.idx];
  const it = cur.item;
  const total = session.queue.length;
  const boxNo = (ctx.store.get('srs', {})[cur.key] || {}).box || 0;
  const head = h('div',
    h('div.sess-head',
      h('span', `${session.title} · ${session.idx + 1}/${total}`),
      h('span.small', (cur.isNew ? 'new · ' : '') + MODES[cur.mode], ' ',
        h('span.leitner', { title: boxNo ? `Box ${boxNo} of 5` : 'New card', 'aria-label': boxNo ? `Box ${boxNo} of 5` : 'New card' },
          [1, 2, 3, 4, 5].map((i) => h('i' + (i <= boxNo ? '.on' : ''))))),
      h('button.btn.small', { type: 'button', on: { click: () => { session = null; clear(box); renderToday(ctx, box); } } }, 'Exit')),
    h('div.progress', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(session.idx) },
      h('span', { style: { width: `${Math.round((session.idx / total) * 100)}%` } })));
  const card = h('div.card.flash', { 'data-mode': cur.mode, 'data-id': it.id });
  const jp = () => h('div.jp.center', rubyEl(it.ruby, { furigana: s.furigana }));

  if (cur.mode === 'ja2en') {
    card.append(jp(), h('div.center', speakButtons(it)), h('p.prompt', 'What does it mean?'));
  } else if (cur.mode === 'en2ja') {
    card.append(h('div.en.big.center', it.en), h('p.prompt', 'Say it in Japanese out loud, then reveal the answer.'));
  } else {
    card.append(h('div.center', h('button.btn.big.primary', { type: 'button', on: { click: () => speakItem(it, 1.0) } }, ico('play'), 'Listen'),
      h('button.btn', { type: 'button', on: { click: () => speakItem(it, 0.7) } }, '0.7×')),
    h('p.prompt', it.kind === 'hear' ? 'What did they say? How will you reply?' : 'What does it mean?'));
  }

  const back = h('div.back');
  if (session.revealed) {
    if (cur.mode !== 'ja2en') back.append(jp(), h('div.center', speakButtons(it)));
    back.append(h('div.romaji.center', it.romaji));
    if (cur.mode !== 'en2ja') back.append(h('div.en.center', it.en));
    if (it.note) back.append(h('div.note', it.note));
    const rb = replyBlock(ctx, it);
    if (rb) back.append(rb);
  }
  card.append(back);

  const actions = session.revealed
    ? h('div.grade',
      h('button.btn.again', { type: 'button', on: { click: () => answer(ctx, box, 'again') } }, 'Forgot'),
      h('button.btn.hard', { type: 'button', on: { click: () => answer(ctx, box, 'hard') } }, 'Hard'),
      h('button.btn.good', { type: 'button', on: { click: () => answer(ctx, box, 'good') } }, 'Know'))
    : h('div.grade', h('button.btn.primary.wide#reveal', { type: 'button', on: { click: () => {
      session.revealed = true;
      renderSession(ctx, box);
      if (cur.mode === 'en2ja') speakItem(it, 1.0);
    } } }, 'Show answer'));

  box.append(head, card, actions);
  if (cur.mode === 'audio' && !session.revealed && !session.spoken?.has(cur.key + session.idx)) {
    session.spoken = session.spoken || new Set();
    session.spoken.add(cur.key + session.idx);
    speakItem(it, 1.0); // after the user's click — user activation is present
  }
}

function answer(ctx, box, result) {
  const cur = session.queue[session.idx];
  const today = todayStr();
  ctx.store.update('srs', {}, (st) => ({ ...st, [cur.key]: grade(st[cur.key], result, today) }));
  session.counts[result] += 1;
  if (result === 'again' && !session.requeued.has(cur.key)) {
    session.requeued.add(cur.key);
    session.queue.push({ ...cur, isNew: false });
  }
  session.idx += 1;
  session.revealed = false;
  renderSession(ctx, box);
}

// ---------- Custom training ----------
function renderCustom(ctx, box) {
  if (session) return renderSession(ctx, box);
  const cats = ctx.data.categories.filter((c) => c.id !== 'cards');
  let cat = 'all', mode = 'ja2en', onlyFav = false;
  const form = h('div.card');
  function draw() {
    clear(form);
    form.append(
      h('h2.section', 'Custom training'),
      h('p.small', 'Ignores the week plan: any categories and modes. Progress is shared with Today.'),
      h('div.small', 'Category'),
      h('div.chips', chip('All', cat === 'all', () => { cat = 'all'; draw(); }), chip('Staff will say', cat === 'hear', () => { cat = 'hear'; draw(); }),
        cats.map((c) => chip(c.en, cat === c.id, () => { cat = c.id; draw(); }))),
      h('div.small', 'Mode'),
      h('div.chips', Object.entries(MODES).map(([k, v]) => chip(v, mode === k, () => { mode = k; draw(); }))),
      h('label.check', h('input', { type: 'checkbox', checked: onlyFav, on: { change: (e) => { onlyFav = e.target.checked; draw(); } } }), ' favorites only'),
    );
    const favs = new Set(ctx.store.get('favs', []));
    const filter = (it) => (cat === 'all' || (cat === 'hear' ? it.kind === 'hear' : it.cat === cat)) && (!onlyFav || favs.has(it.id));
    const q = buildSession({ items: trainable(ctx), state: ctx.store.get('srs', {}), modes: [mode], newLimit: 20, filter });
    const all = trainable(ctx).filter(filter).filter((it) => (mode === 'audio' ? true : it.kind !== 'hear'));
    form.append(h('div.actions.wrap',
      h('button.btn.primary', { type: 'button', on: { click: () => startSession(ctx, box, q, 'Training') } }, `Start (${q.length})`),
      h('button.btn', { type: 'button', on: { click: () => {
        const queue = shuffle(all).slice(0, 20).map((it) => ({ key: `${it.id}|${mode}`, id: it.id, mode, item: it, isNew: false }));
        startSession(ctx, box, queue, 'Shuffle');
      } } }, 'Shuffle 20 (ignore dates)')));
  }
  box.append(form);
  draw();
}

// ---------- Kana ----------
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
    tables.append(
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

const KANA_SETS = {
  hira: { label: 'Hiragana', pick: (K) => cells(K.gojuon).map((c) => ({ q: c.h, a: c.r })) },
  kata: { label: 'Katakana', pick: (K) => cells(K.gojuon).map((c) => ({ q: c.k, a: c.r })) },
  dakuyoon: { label: 'Dakuten + yōon', pick: (K) => [...cells(K.dakuten), ...cells(K.yoon)].flatMap((c) => [{ q: c.h, a: c.r }, { q: c.k, a: c.r }]) },
  words: { label: 'Katakana words', pick: (K) => K.words.map((w) => ({ q: w.k, a: w.en, sub: w.r })) },
};
function cells(rows) { return rows.flat().filter(Boolean); }

function drawQuizStart(ctx, quizBox, K) {
  clear(quizBox);
  const best = ctx.store.get('quizStats', {}).kana || {};
  quizBox.append(h('h2.section', 'Kana quiz'), h('p.small', '10 questions, 4 options.'),
    h('div.chips', Object.entries(KANA_SETS).map(([k, v]) => chip(`${v.label}${best[k] != null ? ` · ${best[k]}/10` : ''}`, false, () => runQuiz(ctx, quizBox, K, k), { 'data-set': k }))));
}

function runQuiz(ctx, quizBox, K, setKey) {
  const pool = KANA_SETS[setKey].pick(K);
  const qs = shuffle(pool).slice(0, 10);
  let i = 0, score = 0;
  const step = () => {
    clear(quizBox);
    if (i >= qs.length) {
      ctx.store.update('quizStats', {}, (st) => ({ ...st, kana: { ...(st.kana || {}), [setKey]: score } }));
      quizBox.append(h('h2.section', `Score: ${score}/10`),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => runQuiz(ctx, quizBox, K, setKey) } }, 'Again'),
          h('button.btn', { type: 'button', on: { click: () => drawQuizStart(ctx, quizBox, K) } }, 'Another set')));
      return;
    }
    const q = qs[i];
    const answers = [...new Set(pool.map((p) => p.a))].filter((a) => a !== q.a);
    const opts = shuffle([q.a, ...shuffle(answers).slice(0, 3)]);
    const feedback = h('div.feedback');
    quizBox.append(
      h('div.sess-head', h('span', `${KANA_SETS[setKey].label} · ${i + 1}/10`), h('span', `correct: ${score}`)),
      h('div.quiz-q', jaText(q.q, 'kana-big'), h('button.btn.icon', { type: 'button', 'aria-label': 'Play', on: { click: () => tts.speak(q.q, 0.9) } }, ico('play'))),
      h('div.opts', opts.map((o) => h('button.btn.opt', { type: 'button', on: { click: (e) => {
        if (quizBox.dataset.answered) return;
        quizBox.dataset.answered = '1';
        const ok = o === q.a;
        if (ok) score += 1;
        e.currentTarget.classList.add(ok ? 'right' : 'wrong');
        quizBox.querySelectorAll('.opt').forEach((b) => { if (b.textContent === q.a) b.classList.add('right'); });
        feedback.append(h('p', ok ? 'Correct!' : 'Answer: ' + q.a, q.sub ? ` (${q.sub})` : ''));
        tts.speak(q.q, 0.9);
        feedback.append(h('button.btn.primary', { type: 'button', on: { click: () => { delete quizBox.dataset.answered; i += 1; step(); } } }, 'Next'));
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
      clear(fb).append(
        h('p', ok === true ? 'Correct!' : ok === false ? 'Wrong.' : '', ' ', h('strong', `¥${n.toLocaleString('en-US')}`), ' = ', jaText(N.yenMixed(n))),
        h('p', jaText(r.kana), ' — ', h('span.romaji', r.romaji)),
        h('div.actions', h('button.btn', { type: 'button', on: { click: () => tts.speak(`${n}円`, 0.8) } }, ico('play'), 'again'),
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
      card.append(h('div.center',
        h('button.btn.big.primary#num-play', { type: 'button', on: { click: () => tts.speak(`${n}円`, 1.0) } }, ico('play'), 'Listen to the price'),
        h('button.btn', { type: 'button', on: { click: () => tts.speak(`${n}円`, 0.7) } }, '0.7×')),
      input, h('div.actions', h('button.btn.primary#num-check', { type: 'button', on: { click: check } }, 'Check'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Give up')));
    } else if (numState.mode === 'mixed') {
      card.append(h('div.center', jaText(N.yenMixed(n), 'price-big')), h('p.prompt', 'What is it in digits?'),
        input, h('div.actions', h('button.btn.primary', { type: 'button', on: { click: check } }, 'Check'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Give up')));
    } else {
      card.append(h('div.center', h('div.price-big', `¥${n.toLocaleString('en-US')}`)), h('p.prompt', 'Say it out loud in Japanese, then check yourself.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { reveal(null); tts.speak(`${n}円`, 1.0); } } }, 'Check')));
    }
    card.append(fb);
  }
  box.append(
    h('div.chips', Object.entries(N.PRICE_RANGES).map(([k, v]) => chip(v.label, numState.range === k, () => { numState.range = k; numState.n = N.randomPrice(k); ctx.rerender(); }))), // B4
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
    const reveal = (ok) => clear(fb).append(
      h('p', ok === true ? 'Correct! ' : ok === false ? 'Wrong. ' : '', h('strong', label), ' = ', jaText(speakTime(t))),
      h('p', jaText(r.kana), ' — ', h('span.romaji', r.romaji)),
      h('div.actions', h('button.btn.primary', { type: 'button', on: { click: next } }, 'Next')));
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
      card.append(h('div.center', h('button.btn.big.primary', { type: 'button', on: { click: () => tts.speak(speakTime(t), 1.0) } }, ico('play'), 'Listen to the time'),
        h('button.btn', { type: 'button', on: { click: () => tts.speak(speakTime(t), 0.7) } }, '0.7×')),
      input, h('div.actions', h('button.btn.primary', { type: 'button', on: { click: check } }, 'Check'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Give up')));
    } else {
      card.append(h('div.center', h('div.price-big', label)), h('p.prompt', 'Say it in Japanese, then check.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { reveal(null); tts.speak(speakTime(t), 1.0); } } }, 'Check')));
    }
    card.append(fb);
  }
  if (!timeState.t) timeState.t = N.randomTime();

  const counters = h('div.card',
    h('h2.section', 'Counters'),
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
