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
/** Коробка 1..5 из любого значения (null, "3", 7 → 1, 3, 5). */
export function normBox(b) {
  const n = Math.trunc(Number(b));
  return Number.isFinite(n) && n >= 1 ? Math.min(5, n) : 1;
}

export function grade(prev, result, today = todayStr()) {
  const cur = prev || { box: 1, due: today, seen: 0, lapses: 0 };
  let box = normBox(cur.box);
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
  // Не больше одной карточки на фразу за сессию (иначе первый режим подсказывает второй — B2).
  // Новый «обратный» режим открывается, только когда предыдущий режим фразы дошёл до коробки 2+.
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
    if (v.due <= today) s.due += 1;
    s.boxes[normBox(v && v.box) - 1] += 1;
  }
  return s;
}

/** Неделя учёбы по дате старта: 1, 2, 3 (и дальше — 3). */
export function studyWeek(startDate, today = todayStr()) {
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  // дата старта в будущем → день 1 (B9)
  const days = Math.max(0, Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000));
  return { day: days + 1, week: Math.min(3, Math.max(1, Math.floor(days / 7) + 1)) };
}
