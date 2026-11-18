// Leitner SRS: 5 коробок, интервалы 0/1/2/4/7 дней (PLAN.md 3.4).
// Состояние: { "<id>|<mode>": { box, due: "YYYY-MM-DD", seen, lapses } }.
// Чистые функции, без DOM и хранилища — тестируются в Node.

export const INTERVALS = [0, 1, 2, 4, 7]; // индекс = box-1
export const MODES = {
  ja2ru: 'Японский → русский',
  ru2ja: 'Русский → японский (вслух)',
  audio: 'Аудио → смысл',
};

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

/** Допустимые режимы для элемента: «слышать» тренируется только на слух. */
export function modesFor(item) {
  if (item.kind === 'hear') return ['audio'];
  if (item.kind === 'card') return [];
  return ['ja2ru', 'ru2ja', 'audio'];
}

/**
 * Оценка: 'again' → коробка 1 (повтор сегодня), 'hard' → коробка не меняется,
 * 'good' → +1 (максимум 5). Возвращает НОВЫЙ объект состояния карточки.
 */
export function grade(prev, result, today = todayStr()) {
  const cur = prev || { box: 1, due: today, seen: 0, lapses: 0 };
  let box = cur.box;
  let lapses = cur.lapses || 0;
  if (result === 'again') { box = 1; lapses += 1; }
  else if (result === 'good') box = Math.min(5, box + 1);
  else if (result !== 'hard') throw new Error('unknown grade ' + result);
  // «С трудом» в коробке 1 → завтра (иначе карточка зацикливается в тот же день)
  const interval = result === 'hard' && box === 1 ? 1 : INTERVALS[box - 1];
  return { box, due: addDays(today, interval), seen: (cur.seen || 0) + 1, lapses };
}

/**
 * Собрать сессию: сначала просроченные/должные (по дате), затем новые до newLimit.
 * items: элементы контента; modes: какие режимы тренировать; filter: (item) => bool.
 * Возвращает массив { key, id, mode, item, isNew }.
 */
export function buildSession({ items, state, modes, today = todayStr(), newLimit = 12, maxReviews = 200, filter = () => true }) {
  const due = [], fresh = [];
  for (const item of items) {
    if (!filter(item)) continue;
    for (const mode of modesFor(item)) {
      if (!modes.includes(mode)) continue;
      const key = keyOf(item.id, mode);
      const st = state[key];
      if (!st) fresh.push({ key, id: item.id, mode, item, isNew: true });
      else if (st.due <= today) due.push({ key, id: item.id, mode, item, isNew: false, due: st.due, box: st.box });
    }
  }
  due.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box));
  return [...due.slice(0, maxReviews), ...fresh.slice(0, newLimit)];
}

export function stats(state, today = todayStr()) {
  const s = { total: 0, due: 0, boxes: [0, 0, 0, 0, 0] };
  for (const v of Object.values(state)) {
    s.total += 1;
    if (v.due <= today) s.due += 1;
    s.boxes[(v.box || 1) - 1] += 1;
  }
  return s;
}

/** Неделя учёбы по дате старта: 1, 2, 3 (и дальше — 3). */
export function studyWeek(startDate, today = todayStr()) {
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  const days = Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
  return { day: days + 1, week: Math.min(3, Math.max(1, Math.floor(days / 7) + 1)) };
}
