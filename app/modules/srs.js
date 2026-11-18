// Leitner SRS: 5 boxes, intervals 0/1/2/4/7 days (PLAN.md 3.4).
// State: { "<id>|<mode>": { box, due: "YYYY-MM-DD", seen, lapses } }.
// Pure functions, no DOM or storage — tested in Node.

export const INTERVALS = [0, 1, 2, 4, 7]; // index = box - 1
export const MODES = {
  ja2en: 'Japanese → English',
  en2ja: 'English → Japanese (say it)',
  audio: 'Audio → meaning',
};

/** Mode keys used before the English version (progress keys are migrated on load / import). */
export const LEGACY_MODES = { ja2ru: 'ja2en', ru2ja: 'en2ja' };

/** Rename legacy SRS keys ("id|ja2ru" → "id|ja2en"). Returns a new object. */
export function migrateSrsKeys(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return state;
  const out = {};
  for (const [k, v] of Object.entries(state)) {
    const [id, mode] = k.split('|');
    const key = LEGACY_MODES[mode] ? `${id}|${LEGACY_MODES[mode]}` : k;
    if (!(key in out) || (v && out[key] && v.due > out[key].due)) out[key] = v;
  }
  return out;
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayStr(dt);
}

export const keyOf = (id, mode) => `${id}|${mode}`;

/** Allowed modes for an item: "hear" items are trained by ear only. */
export function modesFor(item) {
  if (item.kind === 'hear') return ['audio'];
  if (item.kind === 'card') return [];
  return ['ja2en', 'en2ja', 'audio'];
}

/** Box 1..5 from any value (null, "3", 7 → 1, 3, 5). */
export function normBox(b) {
  const n = Math.trunc(Number(b));
  return Number.isFinite(n) && n >= 1 ? Math.min(5, n) : 1;
}

/**
 * Grade: 'again' → box 1 (review today), 'hard' → box unchanged,
 * 'good' → +1 (max 5). Returns a NEW card state object.
 */
export function grade(prev, result, today = todayStr()) {
  const cur = prev || { box: 1, due: today, seen: 0, lapses: 0 };
  let box = normBox(cur.box);
  let lapses = cur.lapses || 0;
  if (result === 'again') { box = 1; lapses += 1; }
  else if (result === 'good') box = Math.min(5, box + 1);
  else if (result !== 'hard') throw new Error('unknown grade ' + result);
  // "Hard" in box 1 → tomorrow (otherwise the card loops on the same day)
  const interval = result === 'hard' && box === 1 ? 1 : INTERVALS[box - 1];
  return { box, due: addDays(today, interval), seen: (cur.seen || 0) + 1, lapses };
}

/**
 * Build a session: overdue/due cards first (by date), then new ones up to newLimit.
 * At most one card per phrase per session (otherwise one mode gives away the other — QA B2);
 * a new "reverse" mode opens only after the phrase's previous mode reached box 2+.
 * Returns [{ key, id, mode, item, isNew }].
 */
export function buildSession({ items, state, modes, today = todayStr(), newLimit = 12, maxReviews = 200, filter = () => true }) {
  const due = [], fresh = [];
  for (const item of items) {
    if (!filter(item)) continue;
    const itemModes = modesFor(item).filter((m) => modes.includes(m));
    let dueCard = null, freshCard = null;
    itemModes.forEach((mode, i) => {
      const key = keyOf(item.id, mode);
      const st = state[key];
      if (st) {
        if (st.due <= today && (!dueCard || st.due < dueCard.due)) dueCard = { key, id: item.id, mode, item, isNew: false, due: st.due, box: normBox(st.box) };
      } else if (!freshCard) {
        const prev = i > 0 ? state[keyOf(item.id, itemModes[i - 1])] : null;
        if (i === 0 || (prev && normBox(prev.box) >= 2)) freshCard = { key, id: item.id, mode, item, isNew: true };
      }
    });
    if (dueCard) due.push(dueCard);
    else if (freshCard) fresh.push(freshCard);
  }
  due.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box));
  return [...due.slice(0, maxReviews), ...fresh.slice(0, newLimit)];
}

export function stats(state, today = todayStr()) {
  const s = { total: 0, due: 0, boxes: [0, 0, 0, 0, 0] };
  for (const v of Object.values(state)) {
    s.total += 1;
    if (v && v.due <= today) s.due += 1;
    s.boxes[normBox(v && v.box) - 1] += 1;
  }
  return s;
}

/** Study week from the start date: 1, 2, 3 (and 3 afterwards). A future start date → day 1 (QA B9). */
export function studyWeek(startDate, today = todayStr()) {
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  const days = Math.max(0, Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000));
  return { day: days + 1, week: Math.min(3, Math.max(1, Math.floor(days / 7) + 1)) };
}
