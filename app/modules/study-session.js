// Card session engine (CURRICULUM §3.1): cue → attempt (say it / think it) → answer with furigana and audio →
// three self-grades (Forgot / Hard / Knew). Used by Today, lessons, situation runs and the pre-flight run.
import { h, clear, rubyEl, speakButtons, speakItem, ico, romajiEl, toast } from './ui.js';
import { grade, todayStr, MODES, studyWeek, addDays, INTERVALS } from './srs.js';
import { romajiMode } from './curriculum.js';
import { replyBlock } from './view-phrases.js';
import * as L from './lang.js';

const PROMPTS = {
  en2ja: () => `Say it in ${L.current().name} out loud, then show the answer.`,
  ja2en: () => 'What does it mean? Think, then show the answer.',
  audio: () => 'Listen. What does it mean? Then show the answer.',
  hear: () => 'What did they say? How will you reply?',
};

/** Shared bookkeeping after any SRS grade: first-learned date and today's activity (streak). */
export function noteActivity(ctx, id, wasNew) {
  const today = todayStr();
  if (wasNew) ctx.store.update('learned', {}, (m) => (m[id] ? m : { ...m, [id]: today }));
  ctx.store.update('activity', [], (a) => (a.includes(today) ? a : [...a.slice(-120), today]));
}

export function currentRomajiMode(ctx) {
  const s = ctx.settings();
  return romajiMode(s.romaji || 'auto', studyWeek(s.startDate || todayStr()).week);
}

/**
 * Run a session in `box`.
 * opts: title, queue [{ key, id, mode, item, isNew }], onDone(counts), onExit(),
 *       kind: 'srs' (default) | 'pretest' (Knew → box 3, the lesson skips it; Hard / Forgot → the lesson teaches it)
 *             | 'trip' (no SRS; misses → favorites)
 * Every card: before the answer "I know it" (3) and "Show answer" (1, Enter, Space); after it Forgot / Hard / Knew (1 / 2 / 3).
 */
export function runSession(ctx, box, opts) {
  const ses = { ...opts, queue: opts.queue.slice(), idx: 0, revealed: false, counts: { again: 0, hard: 0, good: 0 }, requeued: new Set(), spoken: new Set() };
  ses.kind = ses.kind || 'srs';
  const draw = () => renderCard(ctx, box, ses, draw);
  bindKeys(box);
  if (!ses.queue.length) { toast('Nothing to study here right now.'); opts.onDone?.(ses.counts); return; }
  draw();
}

function renderCard(ctx, box, ses, draw) {
  clear(box);
  if (ses.idx >= ses.queue.length) { ses.onDone?.(ses.counts); return; }
  const cur = ses.queue[ses.idx];
  const it = cur.item;
  const total = ses.queue.length;
  const boxNo = (ctx.store.get('srs', {})[cur.key] || {}).box || 0;
  const label = ses.kind === 'pretest' ? 'guess from the sound' : ses.kind === 'trip' ? 'listening run' : (cur.isNew ? 'new · ' : '') + MODES[cur.mode];
  const head = h('div',
    h('div.sess-head',
      h('span', `${ses.title} · ${ses.idx + 1}/${total}`),
      h('span.small', label, ' ',
        ses.kind === 'srs' && boxNo ? h('span.leitner', `· level ${boxNo}/5`) : null),
      h('button.btn.small', { type: 'button', 'aria-label': 'End the session', on: { click: () => (ses.onExit ? ses.onExit() : ses.onDone?.(ses.counts)) } }, 'End')),
    h('div.progress', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(ses.idx) },
      h('span', { style: { width: `${Math.round((ses.idx / total) * 100)}%` } })));

  const card = h('div.card.flash', { 'data-mode': cur.mode, 'data-id': it.id, 'data-kind': it.kind });
  const jp = () => h('div.jp.center', rubyEl(it.ruby, { furigana: true })); // furigana always in study modes

  // Cue: no Japanese text before an audio answer; hear items are audio only.
  if (cur.mode === 'ja2en') {
    card.append(jp(), h('div.actions.center', h('button.btn.icon', { type: 'button', 'aria-label': 'Play', on: { click: () => speakItem(it, 1.0) } }, ico('play'))),
      h('p.prompt', PROMPTS.ja2en()));
  } else if (cur.mode === 'en2ja') {
    card.append(h('div.en.big.center', it.en), h('p.prompt', PROMPTS.en2ja()));
  } else {
    card.append(h('div.actions.center', h('button.btn.big.primary.listen', { type: 'button', on: { click: () => speakItem(it, 1.0) } }, ico('play'), 'Listen')),
      h('p.prompt', it.kind === 'hear' ? PROMPTS.hear() : PROMPTS.audio()));
  }

  const back = h('div.back');
  if (ses.revealed) {
    if (cur.mode !== 'ja2en') back.append(jp());
    back.append(h('div.center', speakButtons(it))); // 0.7× appears only with the answer, as a hint
    if (!L.isZh()) back.append(h('div.center', romajiEl(it.romaji, currentRomajiMode(ctx))));
    if (cur.mode !== 'en2ja') back.append(h('div.en.center', it.en));
    if (it.note) back.append(h('div.note', it.note));
    const rb = replyBlock(ctx, it);
    if (rb) back.append(rb);
  }
  card.append(back);

  const reveal = (early) => {
    ses.revealed = true;
    ses.early = early;
    draw();
    if (cur.mode === 'en2ja') speakItem(it, 1.0);
    if (early) { // "I know it": a short look at the answer, then it counts as Knew unless corrected
      const at = ses.idx;
      clearTimeout(ses.timer);
      ses.timer = setTimeout(() => { if (ses.idx === at && ses.revealed && box.isConnected) answer(ctx, ses, 'good', draw); }, KNOW_IT_MS);
    }
  };
  const actions = ses.revealed
    ? gradeButtons((r) => { clearTimeout(ses.timer); answer(ctx, ses, r, draw); }, { early: ses.early })
    : revealButtons(() => reveal(false), () => reveal(true));
  box.append(head, card, actions);

  if (cur.mode === 'audio' && !ses.revealed && !ses.spoken.has(ses.idx)) {
    ses.spoken.add(ses.idx);
    speakItem(it, 1.0); // after the user's tap — user activation is present
  }
}

function answer(ctx, ses, result, draw) {
  const cur = ses.queue[ses.idx];
  const today = todayStr();
  if (ses.kind === 'pretest') {
    // R8: known already → box 3 (the lesson skips it, light review in 2 days); Hard / Forgot → the lesson teaches it
    if (result === 'good') {
      ctx.store.update('srs', {}, (st) => ({ ...st, [cur.key]: { box: 3, due: addDays(today, INTERVALS[2]), seen: 1, lapses: 0 } }));
      noteActivity(ctx, cur.id, true);
    }
    ses.counts[result] += 1;
  } else if (ses.kind === 'trip') {
    if (result === 'again') ctx.store.update('favs', [], (f) => (f.includes(cur.id) ? f : [...f, cur.id])); // "Trip favorites"
    ses.counts[result] += 1;
    noteActivity(ctx, cur.id, false);
  } else {
    const prev = ctx.store.get('srs', {})[cur.key];
    ctx.store.update('srs', {}, (st) => ({ ...st, [cur.key]: grade(st[cur.key], result, today) }));
    noteActivity(ctx, cur.id, !prev);
    ses.counts[result] += 1;
    if (result === 'again' && !ses.requeued.has(cur.key)) {
      ses.requeued.add(cur.key);
      ses.queue.push({ ...cur, isNew: false });
    }
  }
  ses.idx += 1;
  ses.revealed = false;
  ses.early = false;
  draw();
}

export const KNOW_IT_MS = 1800;

/** Before the answer: "I know it" and "Show answer", side by side, large one-handed targets. */
export function revealButtons(onShow, onKnow) {
  return h('div.grade.two.reveal-row',
    h('button.btn.good.big#know-it', { type: 'button', 'data-key': '3', on: { click: onKnow } }, 'I know it'),
    h('button.btn.primary.big#reveal', { type: 'button', 'data-key': '1', on: { click: onShow } }, 'Show answer'));
}

/** After the answer: Forgot / Hard / Knew. early = came from "I know it" (Knew is pre-selected and applies by itself). */
export function gradeButtons(onGrade, { early = false } = {}) {
  const el = h('div.grade' + (early ? '.early' : ''),
    h('button.btn.again.big', { type: 'button', 'data-key': '1', on: { click: () => onGrade('again') } }, 'Forgot'),
    h('button.btn.hard.big', { type: 'button', 'data-key': '2', on: { click: () => onGrade('hard') } }, 'Hard'),
    h('button.btn.good.big' + (early ? '.preselected' : ''), { type: 'button', 'data-key': '3', on: { click: () => onGrade('good') } }, 'Knew'));
  return early ? h('div', el, h('p.small.center.early-note', 'Counts as Knew in a moment. Tap Forgot or Hard if you were wrong.')) : el;
}

/** Keys 1 / 2 / 3 (and Enter / Space = Show answer) press the matching button in this box. */
export function bindKeys(box) {
  if (box.__keys) return;
  box.__keys = true;
  const onKey = (e) => {
    if (!box.isConnected) { document.removeEventListener('keydown', onKey); box.__keys = false; return; }
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey || document.getElementById('fs') || document.getElementById('sheet')) return;
    let key = e.key;
    if ((key === 'Enter' || key === ' ') && box.querySelector('#reveal')) key = '1';
    if (!/^[123]$/.test(key)) return;
    const btn = box.querySelector(`button[data-key="${key}"]`);
    if (btn) { e.preventDefault(); btn.click(); }
  };
  document.addEventListener('keydown', onKey);
}

/** A small summary card after a session. */
export function doneCard(title, counts, ...more) {
  return h('div.card.done',
    h('h2', title),
    h('p', `Knew ${counts.good} · hard ${counts.hard} · forgot ${counts.again}`),
    ...more);
}
