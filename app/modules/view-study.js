// Вкладка «Учёба»: урок дня, SRS (Leitner), кана (таблицы + квиз), тренажёры цен и времени.
import { h, clear, rubyEl, jaText, speakButtons, speakItem, chip, shuffle, toast, ico } from './ui.js';
import { buildSession, grade, todayStr, studyWeek, stats, MODES } from './srs.js';
import * as N from './numbers.js';
import * as tts from './tts.js';
import { replyBlock } from './view-phrases.js';

const SUBS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'cards', label: 'Карточки' },
  { id: 'kana', label: 'Кана' },
  { id: 'numbers', label: 'Цены' },
  { id: 'time', label: 'Время и счёт' },
];

const WEEK_FOCUS = {
  1: 'Неделя 1: хирагана и катакана (с ёон, っ, ー), вежливые формулы, числа до 10 000 и 万, конбини. Слушание: фразы кассы конбини.',
  2: 'Неделя 2: шаблоны, ресторан, транспорт, время и даты, счётные 枚/本/個. Слушание: персонал ресторана. Кандзи: знаки и станция (по 5 в день).',
  3: 'Неделя 3: покупки (фото, часы, tax-free), отель, ребёнок и экстренное. Заполните карточки «Аллергия» и «Адрес отеля». Две «генеральные репетиции» в режиме «Слушание».',
};

let session = null; // текущая SRS-сессия (живёт, пока открыт раздел)

export function render(ctx, root, params) {
  const sub = SUBS.find((s) => s.id === params[0]) ? params[0] : 'today';
  root.append(
    h('header.top', h('h1', 'Учёба')),
    h('div.chips.subnav', SUBS.map((s) => chip(s.label, s.id === sub, () => { session = null; ctx.go('#/study/' + s.id); }))),
  );
  const box = h('div.study#study-box');
  root.append(box);
  ({ today: renderToday, cards: renderCustom, kana: renderKana, numbers: renderNumbers, time: renderTime })[sub](ctx, box);
}

// ---------- общие выборки ----------
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
    title: 'Повторение',
    items: trainable(ctx).filter((it) => it.kind === 'say' || it.kind === 'pattern'),
    modes: ['ja2ru', 'ru2ja'],
    newLimit: s.newPerDay,
    filter: weekFilter(week),
  };
}
function listenConfig(ctx, week) {
  const s = ctx.settings();
  return {
    title: 'Слушание',
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

// ---------- Сегодня ----------
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
      h('strong', 'Сделайте резервную копию прогресса'),
      h('p.small', lastBackup ? `Последняя копия: ${lastBackup.toLocaleDateString('ru-RU')}.` : 'Копии ещё нет.',
        ' Прогресс хранится только в этом браузере и может пропасть (особенно на iPhone).'),
      h('button.btn.primary', { type: 'button', on: { click: () => ctx.go('#/tools') } }, 'Перейти к копии')));
  }
  box.append(
    h('div.card.today',
      h('div.dayline', h('strong', `День ${day}`), h('span', ` · неделя ${week} из 3`)),
      h('p.small', WEEK_FOCUS[week]),
      h('p.small', 'План на 20–30 минут: повторение 5–10 мин · слушание 5 мин · цены 3–5 мин · тема дня 5–10 мин.')),
    h('div.tiles',
      tile('Повторение', `к повторению ${rev.due} · новых ${rev.fresh}`, 'JA→RU и RU→JA вслух', () => startSession(ctx, box, rev.queue, 'Повторение'), 'start-review'),
      tile('Слушание', `к повторению ${lis.due} · новых ${lis.fresh}`, 'Сначала звук, потом смысл', () => startSession(ctx, box, lis.queue, 'Слушание'), 'start-listen'),
      tile('Цены', '10 заданий', 'Цена на слух → цифры', () => ctx.go('#/study/numbers'), 'go-numbers'),
      tile('Кана', 'таблицы и квиз', 'Неделя 1: главное', () => ctx.go('#/study/kana'), 'go-kana'),
    ),
    h('p.small.muted', `Всего карточек в работе: ${st.total}. Коробки 1–5: ${st.boxes.join(' / ')}.`),
  );
}

function tile(title, line1, line2, onClick, id) {
  return h('button.tile', { type: 'button', id, on: { click: onClick } }, h('strong', title), h('span', line1), h('small', line2));
}

function startSession(ctx, box, queue, title) {
  if (!queue.length) { toast('На сегодня всё! Можно повторить избранное во «Фразах».'); return; }
  session = { title, queue: queue.slice(), idx: 0, revealed: false, counts: { again: 0, hard: 0, good: 0 }, requeued: new Set() };
  clear(box);
  renderSession(ctx, box);
}

// ---------- Сессия ----------
function renderSession(ctx, box) {
  clear(box);
  const s = ctx.settings();
  if (session.idx >= session.queue.length) {
    const c = session.counts;
    box.append(h('div.card.done',
      h('h2', `${session.title}: готово`),
      h('p', `Знаю: ${c.good} · с трудом: ${c.hard} · не помню: ${c.again}`),
      h('button.btn.primary', { type: 'button', on: { click: () => { session = null; clear(box); renderToday(ctx, box); } } }, 'К плану дня')));
    return;
  }
  const cur = session.queue[session.idx];
  const it = cur.item;
  const total = session.queue.length;
  const boxNo = (ctx.store.get('srs', {})[cur.key] || {}).box || 0;
  const head = h('div',
    h('div.sess-head',
      h('span', `${session.title} · ${session.idx + 1}/${total}`),
      h('span.small', (cur.isNew ? 'новая · ' : '') + MODES[cur.mode], ' ',
        h('span.leitner', { title: boxNo ? `Коробка ${boxNo} из 5` : 'Новая карточка', 'aria-label': boxNo ? `Коробка ${boxNo} из 5` : 'Новая карточка' },
          [1, 2, 3, 4, 5].map((i) => h('i' + (i <= boxNo ? '.on' : ''))))),
      h('button.btn.small', { type: 'button', on: { click: () => { session = null; clear(box); renderToday(ctx, box); } } }, 'Выйти')),
    h('div.progress', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(session.idx) },
      h('span', { style: { width: `${Math.round((session.idx / total) * 100)}%` } })));
  const card = h('div.card.flash', { 'data-mode': cur.mode, 'data-id': it.id });
  const jp = () => h('div.jp.center', rubyEl(it.ruby, { furigana: s.furigana }));

  if (cur.mode === 'ja2ru') {
    card.append(jp(), h('div.center', speakButtons(it)), h('p.prompt', 'Что это значит?'));
  } else if (cur.mode === 'ru2ja') {
    card.append(h('div.ru.big.center', it.ru), h('p.prompt', 'Скажите по-японски вслух, затем откройте ответ.'));
  } else {
    card.append(h('div.center', h('button.btn.big.primary', { type: 'button', on: { click: () => speakItem(it, 1.0) } }, ico('play'), 'Слушать'),
      h('button.btn', { type: 'button', on: { click: () => speakItem(it, 0.7) } }, '0.7×')),
    h('p.prompt', it.kind === 'hear' ? 'Что вам сказали? Что ответите?' : 'Что это значит?'));
  }

  const back = h('div.back');
  if (session.revealed) {
    if (cur.mode !== 'ja2ru') back.append(jp(), h('div.center', speakButtons(it)));
    back.append(h('div.romaji.center', it.romaji));
    if (cur.mode !== 'ru2ja') back.append(h('div.ru.center', it.ru));
    if (it.note) back.append(h('div.note', it.note));
    const rb = replyBlock(ctx, it);
    if (rb) back.append(rb);
  }
  card.append(back);

  const actions = session.revealed
    ? h('div.grade',
      h('button.btn.again', { type: 'button', on: { click: () => answer(ctx, box, 'again') } }, 'Не помню'),
      h('button.btn.hard', { type: 'button', on: { click: () => answer(ctx, box, 'hard') } }, 'С трудом'),
      h('button.btn.good', { type: 'button', on: { click: () => answer(ctx, box, 'good') } }, 'Знаю'))
    : h('div.grade', h('button.btn.primary.wide#reveal', { type: 'button', on: { click: () => {
      session.revealed = true;
      renderSession(ctx, box);
      if (cur.mode === 'ru2ja') speakItem(it, 1.0);
    } } }, 'Показать ответ'));

  box.append(head, card, actions);
  if (cur.mode === 'audio' && !session.revealed && !session.spoken?.has(cur.key + session.idx)) {
    session.spoken = session.spoken || new Set();
    session.spoken.add(cur.key + session.idx);
    speakItem(it, 1.0); // после клика пользователя — user activation уже есть
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

// ---------- Свои карточки ----------
function renderCustom(ctx, box) {
  if (session) return renderSession(ctx, box);
  const cats = ctx.data.categories.filter((c) => c.id !== 'cards');
  let cat = 'all', mode = 'ja2ru', onlyFav = false;
  const form = h('div.card');
  function draw() {
    clear(form);
    form.append(
      h('h2.section', 'Своя тренировка'),
      h('p.small', 'Без учёта недели: любые категории и режимы. Прогресс общий с «Сегодня».'),
      h('div.small', 'Категория'),
      h('div.chips', chip('Все', cat === 'all', () => { cat = 'all'; draw(); }), chip('Скажет персонал', cat === 'hear', () => { cat = 'hear'; draw(); }),
        cats.map((c) => chip(c.ru, cat === c.id, () => { cat = c.id; draw(); }))),
      h('div.small', 'Режим'),
      h('div.chips', Object.entries(MODES).map(([k, v]) => chip(v, mode === k, () => { mode = k; draw(); }))),
      h('label.check', h('input', { type: 'checkbox', checked: onlyFav, on: { change: (e) => { onlyFav = e.target.checked; draw(); } } }), ' только избранное'),
    );
    const favs = new Set(ctx.store.get('favs', []));
    const filter = (it) => (cat === 'all' || (cat === 'hear' ? it.kind === 'hear' : it.cat === cat)) && (!onlyFav || favs.has(it.id));
    const q = buildSession({ items: trainable(ctx), state: ctx.store.get('srs', {}), modes: [mode], newLimit: 20, filter });
    const all = trainable(ctx).filter(filter).filter((it) => (mode === 'audio' ? true : it.kind !== 'hear'));
    form.append(h('div.actions.wrap',
      h('button.btn.primary', { type: 'button', on: { click: () => startSession(ctx, box, q, 'Тренировка') } }, `Начать (${q.length})`),
      h('button.btn', { type: 'button', on: { click: () => {
        const queue = shuffle(all).slice(0, 20).map((it) => ({ key: `${it.id}|${mode}`, id: it.id, mode, item: it, isNew: false }));
        startSession(ctx, box, queue, 'Вразброс');
      } } }, 'Вразброс 20 (без учёта дат)')));
  }
  box.append(form);
  draw();
}

// ---------- Кана ----------
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
      h('div.chips', chip('Хирагана', kanaScript === 'h', () => { kanaScript = 'h'; drawTables(); }), chip('Катакана', kanaScript === 'k', () => { kanaScript = 'k'; drawTables(); })),
      table('Годзюон', K.gojuon, 5),
      table('Дакутэн и хандакутэн', K.dakuten, 5),
      table('Ёон (сочетания)', K.yoon, 3),
      kanaScript === 'k' ? table('Расширенная катакана (заимствования)', K.extended, 4) : null,
      h('div.notes', K.notes.map((n) => h('p.small', h('strong', { lang: 'ja' }, n.mark), ' — ', n.ru))),
    );
  }
  drawTables();
  drawQuizStart(ctx, quizBox, K);
  box.append(quizBox, tables);
}

const KANA_SETS = {
  hira: { label: 'Хирагана', pick: (K) => cells(K.gojuon).map((c) => ({ q: c.h, a: c.r })) },
  kata: { label: 'Катакана', pick: (K) => cells(K.gojuon).map((c) => ({ q: c.k, a: c.r })) },
  dakuyoon: { label: 'Дакутэн + ёон', pick: (K) => [...cells(K.dakuten), ...cells(K.yoon)].flatMap((c) => [{ q: c.h, a: c.r }, { q: c.k, a: c.r }]) },
  words: { label: 'Слова катаканой', pick: (K) => K.words.map((w) => ({ q: w.k, a: w.ru, sub: w.r })) },
};
function cells(rows) { return rows.flat().filter(Boolean); }

function drawQuizStart(ctx, quizBox, K) {
  clear(quizBox);
  const best = ctx.store.get('quizStats', {}).kana || {};
  quizBox.append(h('h2.section', 'Квиз по кане'), h('p.small', '10 вопросов, 4 варианта.'),
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
      quizBox.append(h('h2.section', `Результат: ${score}/10`),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => runQuiz(ctx, quizBox, K, setKey) } }, 'Ещё раз'),
          h('button.btn', { type: 'button', on: { click: () => drawQuizStart(ctx, quizBox, K) } }, 'Другой набор')));
      return;
    }
    const q = qs[i];
    const answers = [...new Set(pool.map((p) => p.a))].filter((a) => a !== q.a);
    const opts = shuffle([q.a, ...shuffle(answers).slice(0, 3)]);
    const feedback = h('div.feedback');
    quizBox.append(
      h('div.sess-head', h('span', `${KANA_SETS[setKey].label} · ${i + 1}/10`), h('span', `верно: ${score}`)),
      h('div.quiz-q', jaText(q.q, 'kana-big'), h('button.btn.icon', { type: 'button', 'aria-label': 'Произнести', on: { click: () => tts.speak(q.q, 0.9) } }, ico('play'))),
      h('div.opts', opts.map((o) => h('button.btn.opt', { type: 'button', on: { click: (e) => {
        if (quizBox.dataset.answered) return;
        quizBox.dataset.answered = '1';
        const ok = o === q.a;
        if (ok) score += 1;
        e.currentTarget.classList.add(ok ? 'right' : 'wrong');
        quizBox.querySelectorAll('.opt').forEach((b) => { if (b.textContent === q.a) b.classList.add('right'); });
        feedback.append(h('p', ok ? 'Верно!' : 'Правильно: ' + q.a, q.sub ? ` (${q.sub})` : ''));
        tts.speak(q.q, 0.9);
        feedback.append(h('button.btn.primary', { type: 'button', on: { click: () => { delete quizBox.dataset.answered; i += 1; step(); } } }, 'Дальше'));
      } } }, o))),
      feedback,
    );
  };
  step();
}

// ---------- Цены ----------
const numState = { range: 'konbini', mode: 'audio', n: null, ok: 0, total: 0 };
function renderNumbers(ctx, box) {
  const card = h('div.card#num-card');
  function next() { numState.n = N.randomPrice(numState.range); draw(); }
  function draw() {
    clear(card);
    const n = numState.n;
    const r = N.yenReading(n);
    const input = h('input.num-input#num-answer', { type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Цифрами, например 12800', 'aria-label': 'Ответ цифрами' });
    const fb = h('div.feedback#num-feedback');
    const reveal = (ok) => {
      clear(fb).append(
        h('p', ok === true ? 'Верно!' : ok === false ? 'Неверно.' : '', ' ', h('strong', `¥${n.toLocaleString('ru-RU')}`), ' = ', jaText(N.yenMixed(n))),
        h('p', jaText(r.kana), ' — ', h('span.romaji', r.romaji)),
        h('div.actions', h('button.btn', { type: 'button', on: { click: () => tts.speak(`${n}円`, 0.8) } }, ico('play'), 'ещё раз'),
          h('button.btn.primary#num-next', { type: 'button', on: { click: next } }, 'Следующее')));
    };
    const check = () => {
      const v = N.parseDigits(input.value);
      if (Number.isNaN(v)) { toast('Введите число цифрами'); return; }
      const ok = v === n;
      numState.total += 1; if (ok) numState.ok += 1;
      reveal(ok);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    card.append(h('div.sess-head', h('span', `Верно ${numState.ok} из ${numState.total}`), h('span.small', N.PRICE_RANGES[numState.range].label)));
    if (numState.mode === 'audio') {
      card.append(h('div.center',
        h('button.btn.big.primary#num-play', { type: 'button', on: { click: () => tts.speak(`${n}円`, 1.0) } }, ico('play'), 'Слушать цену'),
        h('button.btn', { type: 'button', on: { click: () => tts.speak(`${n}円`, 0.7) } }, '0.7×')),
      input, h('div.actions', h('button.btn.primary#num-check', { type: 'button', on: { click: check } }, 'Проверить'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Сдаюсь')));
    } else if (numState.mode === 'mixed') {
      card.append(h('div.center', jaText(N.yenMixed(n), 'price-big')), h('p.prompt', 'Сколько это цифрами?'),
        input, h('div.actions', h('button.btn.primary', { type: 'button', on: { click: check } }, 'Проверить'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Сдаюсь')));
    } else {
      card.append(h('div.center', h('div.price-big', `¥${n.toLocaleString('ru-RU')}`)), h('p.prompt', 'Назовите вслух по-японски, затем проверьте себя.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { reveal(null); tts.speak(`${n}円`, 1.0); } } }, 'Проверить')));
    }
    card.append(fb);
  }
  box.append(
    h('div.chips', Object.entries(N.PRICE_RANGES).map(([k, v]) => chip(v.label, numState.range === k, () => { numState.range = k; ctx.rerender(); }))),
    h('div.chips', [['audio', 'На слух → цифры'], ['mixed', '12万8千円 → цифры'], ['say', 'Цифры → сказать']].map(([k, v]) => chip(v, numState.mode === k, () => { numState.mode = k; ctx.rerender(); }))),
    card,
    h('p.small.muted', 'Подсказка: 万 = 10 000. 128 000 = 12万8千 = じゅうにまん はっせん. Звуковые изменения: 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん.'),
  );
  if (numState.n == null) numState.n = N.randomPrice(numState.range);
  draw();
}

// ---------- Время, даты, счёт ----------
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
    const input = h('input.num-input', { type: 'text', inputmode: 'numeric', placeholder: 'например 9:30', 'aria-label': 'Время' });
    const reveal = (ok) => clear(fb).append(
      h('p', ok === true ? 'Верно! ' : ok === false ? 'Неверно. ' : '', h('strong', label), ' = ', jaText(speakTime(t))),
      h('p', jaText(r.kana), ' — ', h('span.romaji', r.romaji)),
      h('div.actions', h('button.btn.primary', { type: 'button', on: { click: next } }, 'Следующее')));
    const check = () => {
      const v = parseTime(input.value);
      if (!v) { toast('Формат: 9:30'); return; }
      const ok = v.h === t.h && v.m === t.m;
      timeState.total += 1; if (ok) timeState.ok += 1;
      reveal(ok);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    card.append(h('div.sess-head', h('span', `Верно ${timeState.ok} из ${timeState.total}`)));
    if (timeState.mode === 'audio') {
      card.append(h('div.center', h('button.btn.big.primary', { type: 'button', on: { click: () => tts.speak(speakTime(t), 1.0) } }, ico('play'), 'Слушать время'),
        h('button.btn', { type: 'button', on: { click: () => tts.speak(speakTime(t), 0.7) } }, '0.7×')),
      input, h('div.actions', h('button.btn.primary', { type: 'button', on: { click: check } }, 'Проверить'), h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Сдаюсь')));
    } else {
      card.append(h('div.center', h('div.price-big', label)), h('p.prompt', 'Скажите по-японски, затем проверьте.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { reveal(null); tts.speak(speakTime(t), 1.0); } } }, 'Проверить')));
    }
    card.append(fb);
  }
  if (!timeState.t) timeState.t = N.randomTime();

  const counters = h('div.card',
    h('h2.section', 'Счётные суффиксы'),
    Object.entries(N.COUNTERS).map(([k, c]) => h('details.more',
      h('summary', c.label),
      h('div.ctable', c.items.map(([kana, romaji], i) => h('button.cnt', { type: 'button', on: { click: () => tts.speak(kana, 0.9) } },
        h('b', String(i + 1)), jaText(kana), h('small', romaji)))))));

  const year = new Date().getFullYear();
  const month = 12;
  const days = h('details.more',
    h('summary', 'Даты декабря (с днями недели)'),
    h('div.ctable', Array.from({ length: 31 }, (_, i) => {
      const d = i + 1, r = N.dateReading(month, d), wd = N.WEEKDAYS[new Date(year, month - 1, d).getDay()];
      return h('button.cnt', { type: 'button', on: { click: () => tts.speak(r.kana, 0.9) } }, h('b', `${d} ${wd.short}`), jaText(r.kana), h('small', r.romaji));
    })));
  const weekdays = h('details.more', h('summary', 'Дни недели'),
    h('div.ctable', N.WEEKDAYS.map((w) => h('button.cnt', { type: 'button', on: { click: () => tts.speak(w.kana, 0.9) } }, h('b', { lang: 'ja' }, w.ja), jaText(w.kana), h('small', `${w.romaji} — ${w.ru}`)))));

  box.append(
    h('div.chips', [['audio', 'На слух → время'], ['say', 'Время → сказать']].map(([k, v]) => chip(v, timeState.mode === k, () => { timeState.mode = k; ctx.rerender(); }))),
    card, counters, h('div.card', h('h2.section', 'Даты'), days, weekdays),
  );
  draw();
}
