import { h, add, clear, jaText, chip, toast, ico } from './ui.js';
import * as tts from './tts.js';
import * as Z from './numbers-zh.js';

const priceState = { range: 'snack', mode: 'audio', fen: null, ok: 0, total: 0 };
const timeState = { mode: 'audio', t: null, ok: 0, total: 0 };

const play = (text, rate) => tts.speak(text, rate);

function playButtons(text, id, label) {
  return h('div.actions.center',
    h(`button.btn.big.primary#${id}`, { type: 'button', on: { click: () => play(text, 1.0) } }, ico('play'), label),
    h('button.btn.icon.slow', { type: 'button', title: 'Slow (0.7×)', 'aria-label': 'Play slowly', on: { click: () => play(text, 0.7) } }, '0.7×'));
}

function answerBlock(big, reading, extra, onNext) {
  return [
    h('div.answer', h('strong.price-big', big), jaText(reading.hanzi, 'ja answer-ja')),
    h('div.romaji', reading.pinyin),
    extra,
    h('div.actions', h('button.btn', { type: 'button', on: { click: () => play(reading.hanzi, 0.8) } }, ico('play'), 'Play again'),
      h('button.btn.primary#num-next', { type: 'button', on: { click: onNext } }, 'Next')),
  ];
}

function trainerCard({ state, inputAttrs, parse, isRight, invalidHint, draw }) {
  const input = h('input.num-input#num-answer', { type: 'text', autocomplete: 'off', ...inputAttrs });
  const fb = h('div.feedback#num-feedback');
  let answered = false;
  const reveal = (ok) => add(clear(fb), ok == null ? null : h('p' + (ok ? '.ok' : '.bad'), ok ? 'Correct' : 'Not quite'), ...draw.answer());
  const check = () => {
    if (answered) return;
    const v = parse(input.value);
    if (v == null || Number.isNaN(v)) { toast(invalidHint); return; }
    answered = true;
    const ok = isRight(v);
    state.total += 1; if (ok) state.ok += 1;
    reveal(ok);
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (answered) draw.next(); else check(); } });
  const checkRow = h('div.actions', h('button.btn.primary#num-check', { type: 'button', on: { click: check } }, 'Check'),
    h('button.btn', { type: 'button', on: { click: () => reveal(null) } }, 'Show answer'));
  return { input, fb, checkRow, reveal };
}

export function renderPricesZh(ctx, box) {
  const card = h('div.card#num-card');
  const next = () => { priceState.fen = Z.randomPriceZh(priceState.range); draw(); };
  function draw() {
    clear(card);
    const fen = priceState.fen;
    const r = Z.priceReading(fen);
    const big = Z.formatYuan(fen);
    const extra = h('p.small.price-forms', 'Full: ', jaText(r.full.hanzi), ` (${r.full.pinyin}) · written: `, jaText(r.written.hanzi));
    const t = trainerCard({
      state: priceState, inputAttrs: { inputmode: 'decimal', placeholder: 'Digits, e.g. 3.50', 'aria-label': 'Answer in digits' },
      parse: Z.parseYuan, isRight: (v) => v === fen, invalidHint: 'Type the amount in digits, e.g. 3.50',
      draw: { answer: () => answerBlock(big, r, extra, next), next },
    });
    card.append(h('div.sess-head', h('span', `Correct ${priceState.ok} of ${priceState.total}`), h('span.small', Z.PRICE_RANGES_ZH[priceState.range].label)));
    if (priceState.mode === 'audio') card.append(playButtons(r.hanzi, 'num-play', 'Listen to the price'), t.input, t.checkRow);
    else if (priceState.mode === 'read') card.append(h('div.center', jaText(r.hanzi, 'price-big')), h('p.prompt', 'What is it in digits?'), t.input, t.checkRow);
    else {
      card.append(h('div.center', h('div.price-big', big)), h('p.prompt', 'Say it out loud in Chinese, then check yourself.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { t.reveal(null); play(r.hanzi, 1.0); } } }, 'Show answer')));
    }
    card.append(t.fb);
  }
  box.append(
    h('div.small.chips-label', 'Price range'),
    h('div.chips', Object.entries(Z.PRICE_RANGES_ZH).map(([k, v]) => chip(v.label, priceState.range === k, () => { priceState.range = k; priceState.fen = Z.randomPriceZh(k); ctx.rerender(); }, { 'data-range': k }))),
    h('div.small.chips-label', 'Exercise'),
    h('div.chips', [['audio', 'Listen → digits'], ['read', '三块五 → digits'], ['say', 'Digits → say it']].map(([k, v]) => chip(v, priceState.mode === k, () => { priceState.mode = k; ctx.rerender(); }))),
    card,
    h('p.small.muted', 'Spoken prices use 块 kuài (yuan), 毛 máo (0.1) and 分 fēn (0.01); the last unit is usually dropped: ¥3.50 = 三块五. ',
      'Written: 元 yuán and 角 jiǎo. 2 before a unit is 两 liǎng: 两块, 两百, 两千, 两万. A gap of zeros is read as one 零: ¥1,050 = 一千零五十.'),
  );
  if (priceState.fen == null) priceState.fen = Z.randomPriceZh(priceState.range);
  draw();
}

function parseClock(s) {
  const t = String(s).normalize('NFKC').trim().replace(/[.\s点]/g, ':').replace(/分/g, '').replace(/:+/g, ':');
  const m = t.match(/^(\d{1,2}):?(\d{2})?$/);
  return m ? { h: Number(m[1]), m: m[2] ? Number(m[2]) : 0 } : null;
}

export function renderTimeZh(ctx, box) {
  const card = h('div.card#time-card');
  const next = () => { timeState.t = Z.randomTimeZh(); draw(); };
  function draw() {
    clear(card);
    const { h: hour, m: minute } = timeState.t;
    const r = Z.timeReading(hour, minute);
    const label = `${hour}:${String(minute).padStart(2, '0')}`;
    const extra = r.alt.length ? h('p.small.price-forms', 'Also: ', r.alt.map((a, i) => [i ? ', ' : '', jaText(a.hanzi), ` (${a.pinyin})`])) : null;
    const t = trainerCard({
      state: timeState, inputAttrs: { inputmode: 'numeric', placeholder: 'e.g. 2:30', 'aria-label': 'Time' },
      parse: parseClock, isRight: (v) => v.h === hour && v.m === minute, invalidHint: 'Format: 2:30',
      draw: { answer: () => answerBlock(label, r, extra, next), next },
    });
    card.append(h('div.sess-head', h('span', `Correct ${timeState.ok} of ${timeState.total}`)));
    if (timeState.mode === 'audio') card.append(playButtons(r.hanzi, 'time-play', 'Listen to the time'), t.input, t.checkRow);
    else {
      card.append(h('div.center', h('div.price-big', label)), h('p.prompt', 'Say it in Chinese, then check.'),
        h('div.actions', h('button.btn.primary', { type: 'button', on: { click: () => { t.reveal(null); play(r.hanzi, 1.0); } } }, 'Show answer')));
    }
    card.append(t.fb);
  }
  if (!timeState.t) timeState.t = Z.randomTimeZh();
  const weekdays = h('div.card',
    h('h2.section', 'Days of the week'),
    h('p.small', '星期 xīngqī + a number; Sunday is 星期天 or 星期日. Tap to hear it.'),
    h('div.ctable', Z.WEEKDAYS_ZH.map((w) => h('button.cnt', { type: 'button', on: { click: () => play(w.hanzi, 0.9) } },
      jaText(w.hanzi), h('small', `${w.pinyin} — ${w.en}`)))));
  box.append(
    h('div.chips', [['audio', 'Listen → time'], ['say', 'Time → say it']].map(([k, v]) => chip(v, timeState.mode === k, () => { timeState.mode = k; ctx.rerender(); }))),
    card,
    h('p.small.muted', 'X点 diǎn = X o’clock, 半 bàn = half past, 一刻 yí kè = quarter past, minutes 1–9 take 零: 两点零五分. 2 o’clock is 两点, not 二点.'),
    weekdays,
  );
  draw();
}
