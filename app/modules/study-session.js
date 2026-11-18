// Card session engine (CURRICULUM §3.1): cue → attempt (say it / think it) → answer with furigana and audio →
// three self-grades (Forgot / Hard / Knew). Used by Today, lessons, situation runs and the pre-flight run.
import { h, clear, rubyEl, speakButtons, speakItem, ico, romajiEl, toast } from './ui.js';
import { grade, todayStr, MODES, studyWeek } from './srs.js';
import { romajiMode } from './curriculum.js';
import { replyBlock } from './view-phrases.js';

const PROMPTS = {
  en2ja: 'Say it in Japanese out loud, then show the answer.',
  ja2en: 'What does it mean? Think, then show the answer.',
  audio: 'Listen. What does it mean? Then show the answer.',
  hear: 'What did they say? How will you reply?',
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
 *       kind: 'srs' (default) | 'pretest' (Got it / Not yet; a correct guess goes to box 2) | 'trip' (no SRS; misses → favorites)
 */
export function runSession(ctx, box, opts) {
  const ses = { ...opts, queue: opts.queue.slice(), idx: 0, revealed: false, counts: { again: 0, hard: 0, good: 0 }, requeued: new Set(), spoken: new Set() };
  ses.kind = ses.kind || 'srs';
  const draw = () => renderCard(ctx, box, ses, draw);
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
        ses.kind === 'srs' ? h('span.leitner', { title: boxNo ? `Box ${boxNo} of 5` : 'New card', 'aria-label': boxNo ? `Box ${boxNo} of 5` : 'New card' },
          [1, 2, 3, 4, 5].map((i) => h('i' + (i <= boxNo ? '.on' : '')))) : null),
      h('button.btn.small', { type: 'button', 'aria-label': 'End the session', on: { click: () => (ses.onExit ? ses.onExit() : ses.onDone?.(ses.counts)) } }, 'End')),
    h('div.progress', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(ses.idx) },
      h('span', { style: { width: `${Math.round((ses.idx / total) * 100)}%` } })));

  const card = h('div.card.flash', { 'data-mode': cur.mode, 'data-id': it.id, 'data-kind': it.kind });
  const jp = () => h('div.jp.center', rubyEl(it.ruby, { furigana: true })); // furigana always in study modes

  // Cue: no Japanese text before an audio answer; hear items are audio only.
  if (cur.mode === 'ja2en') {
    card.append(jp(), h('div.actions.center', h('button.btn.icon', { type: 'button', 'aria-label': 'Play', on: { click: () => speakItem(it, 1.0) } }, ico('play'))),
      h('p.prompt', PROMPTS.ja2en));
  } else if (cur.mode === 'en2ja') {
    card.append(h('div.en.big.center', it.en), h('p.prompt', PROMPTS.en2ja));
  } else {
    card.append(h('div.actions.center', h('button.btn.big.primary.listen', { type: 'button', on: { click: () => speakItem(it, 1.0) } }, ico('play'), 'Listen')),
      h('p.prompt', it.kind === 'hear' ? PROMPTS.hear : PROMPTS.audio));
  }

  const back = h('div.back');
  if (ses.revealed) {
    if (cur.mode !== 'ja2en') back.append(jp());
    back.append(h('div.center', speakButtons(it))); // 0.7× appears only with the answer, as a hint
    back.append(h('div.center', romajiEl(it.romaji, currentRomajiMode(ctx))));
    if (cur.mode !== 'en2ja') back.append(h('div.en.center', it.en));
    if (it.note) back.append(h('div.note', it.note));
    const rb = replyBlock(ctx, it);
    if (rb) back.append(rb);
  }
  card.append(back);

  let actions;
  if (!ses.revealed) {
    actions = h('div.grade', h('button.btn.primary.wide.big#reveal', { type: 'button', on: { click: () => {
      ses.revealed = true;
      draw();
      if (cur.mode === 'en2ja') speakItem(it, 1.0);
    } } }, 'Show answer'));
  } else if (ses.kind === 'pretest') {
    actions = h('div.grade.two',
      h('button.btn.again', { type: 'button', on: { click: () => answer(ctx, ses, 'miss', draw) } }, 'Not yet'),
      h('button.btn.good', { type: 'button', on: { click: () => answer(ctx, ses, 'got', draw) } }, 'Got it'));
  } else {
    actions = h('div.grade',
      h('button.btn.again', { type: 'button', on: { click: () => answer(ctx, ses, 'again', draw) } }, 'Forgot'),
      h('button.btn.hard', { type: 'button', on: { click: () => answer(ctx, ses, 'hard', draw) } }, 'Hard'),
      h('button.btn.good', { type: 'button', on: { click: () => answer(ctx, ses, 'good', draw) } }, 'Knew'));
  }
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
    // R8: a correct guess goes straight to box 2; a miss stays new and is learned in the lesson
    if (result === 'got') {
      ctx.store.update('srs', {}, (st) => ({ ...st, [cur.key]: grade(st[cur.key], 'good', today) }));
      noteActivity(ctx, cur.id, true);
      ses.counts.good += 1;
    } else ses.counts.again += 1;
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
  draw();
}

/** A small summary card after a session. */
export function doneCard(title, counts, ...more) {
  return h('div.card.done',
    h('h2', title),
    h('p', `Knew ${counts.good} · hard ${counts.hard} · forgot ${counts.again}`),
    ...more);
}
