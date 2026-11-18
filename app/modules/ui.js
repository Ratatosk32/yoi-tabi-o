// Shared UI helpers: DOM creation, furigana, speak buttons, full-screen card, toasts.
import { parseRuby, ttsText } from './text.js';
import * as tts from './tts.js';

/** h('div.cls#id', {attrs, on:{click}}, ...children) */
export function h(sel, props, ...children) {
  const [tagPart, ...rest] = sel.split(/(?=[.#])/);
  const el = document.createElement(tagPart || 'div');
  for (const r of rest) {
    if (r[0] === '.') el.classList.add(r.slice(1));
    else if (r[0] === '#') el.id = r.slice(1);
  }
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
      else if (k === 'class') el.className += ' ' + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

/** el.append() that skips null/false and flattens arrays (the native append prints the word "null"). */
export function add(el, ...children) { append(el, children); return el; }

export function clear(el) { while (el.firstChild) el.firstChild.remove(); return el; }

/** Japanese text with furigana (<ruby>), always lang="ja". */
export function rubyEl(ruby, { furigana = true, cls = 'ja' } = {}) {
  const span = h('span', { class: cls, lang: 'ja' });
  for (const seg of parseRuby(ruby || '')) {
    if (seg.text != null) span.append(seg.text);
    else if (furigana) span.append(h('ruby', seg.base, h('rp', '('), h('rt', seg.rt), h('rp', ')')));
    else span.append(seg.base);
  }
  return span;
}

export function jaText(text, cls = 'ja') { return h('span', { class: cls, lang: 'ja' }, text); }

/** Design icon mask (uses currentColor; never turns into an emoji on iOS). */
export function ico(name) { return h('span.ico.ico-' + name, { 'aria-hidden': 'true' }); }

/** ▶ 1.0× and 0.7× buttons for an item with ja/tts. While speaking the button gets .is-speaking. */
export function speakButtons(item, { text } = {}) {
  const say = (rate) => (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    document.querySelectorAll('.btn.is-speaking').forEach((b) => b.classList.remove('is-speaking'));
    btn.classList.add('is-speaking');
    speakItem(item, rate, text).finally(() => btn.classList.remove('is-speaking'));
  };
  return h('span.speak',
    h('button.btn.icon', { type: 'button', title: 'Play', 'aria-label': 'Play', on: { click: say(1.0) } }, ico('play')),
    h('button.btn.icon.slow', { type: 'button', title: 'Slow (0.7×)', 'aria-label': 'Play slowly', on: { click: say(0.7) } }, '0.7×'),
  );
}

export function speakItem(item, rate = 1.0, text) {
  const t = text || ttsText(item);
  return tts.speak(t, rate).then((r) => {
    if (r === 'unsupported') toast('Speech is not available in this browser');
    else if (r.startsWith('error') && !/interrupted|canceled|not-allowed/.test(r)) toast('Could not speak: ' + r.slice(6) + '. Check the Japanese voice in Tools.');
    return r;
  });
}

let toastTimer = null;
export function toast(msg, ms = 2600) {
  let el = document.getElementById('toast');
  if (!el) { el = h('div#toast', { role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- Full-screen "show to a Japanese person" card ----------
let wakeLock = null;
async function lockScreen() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch { wakeLock = null; }
}
function unlockScreen() { try { wakeLock?.release(); } catch { /* ignore */ } wakeLock = null; }

/**
 * Show text large. lines: [{ ruby | text, small?: bool }]; caption — an English line for yourself.
 */
export function showFullscreen({ lines, caption, speakText }) {
  closeFullscreen();
  const textLen = lines.reduce((n, l) => n + (l.text || l.ruby || '').replace(/\[[^\]]*\]/g, '').length, 0);
  // --fs-n: percent of the short screen side (table from design/DESIGN.md §5)
  const size = textLen <= 8 ? 20 : textLen <= 20 ? 13.5 : textLen <= 40 ? 11 : textLen <= 80 ? 8 : 6;
  const body = h('div.fs-body', { style: { '--fs-n': String(size) } },
    lines.map((l) => h('p.fs-line' + (l.small ? '.small' : ''),
      l.ruby ? rubyEl(l.ruby, { furigana: false, cls: 'fs-ja' }) : jaText(l.text, 'fs-ja'))));
  const ov = h('div#fs.fs', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Card to show' },
    body,
    caption ? h('p.fs-caption', caption) : null,
    h('div.fs-bar',
      speakText ? h('button.btn', { type: 'button', on: { click: () => speakItem({ ja: speakText }, 1.0) } }, ico('play'), 'Play') : null,
      h('button.btn', { type: 'button', on: { click: () => ov.classList.toggle('rot') } }, ico('rotate'), 'Rotate'),
      h('button.btn.primary', { type: 'button', on: { click: () => closeFullscreen() } }, ico('close'), 'Close'),
    ),
  );
  document.body.append(ov);
  document.body.classList.add('noscroll');
  lockScreen();
  fitFullscreen(ov, size);
  fsResize = () => fitFullscreen(ov, size);
  window.addEventListener('resize', fsResize);
  // Esc always closes, not only before the first other key (QA B15)
  fsKey = (e) => { if (e.key === 'Escape') closeFullscreen(); };
  document.addEventListener('keydown', fsKey);
  history.pushState({ fs: true }, '');
  return ov;
}

let fsKey = null, fsResize = null;

/** Shrink --fs-n until all text (and the caption) fits above the button bar (QA B3, B16). */
export function fitFullscreen(ov, start) {
  const body = ov.querySelector('.fs-body');
  const bar = ov.querySelector('.fs-bar');
  const cap = ov.querySelector('.fs-caption');
  let n = start;
  const fits = () => {
    const barTop = bar.getBoundingClientRect().top;
    const limit = barTop > window.innerHeight / 2 ? barTop : window.innerHeight; // in landscape the bar is at the side
    const bottom = (cap || body).getBoundingClientRect().bottom;
    return body.scrollHeight <= body.clientHeight + 1 && bottom <= limit + 1;
  };
  body.style.setProperty('--fs-n', String(n));
  for (let i = 0; i < 60 && n > 3 && !fits(); i++) {
    n = Math.round((n - 0.5) * 10) / 10;
    body.style.setProperty('--fs-n', String(n));
  }
  ov.dataset.fsN = String(n);
  return n;
}

export function closeFullscreen(fromPop = false) {
  const ov = document.getElementById('fs');
  if (!ov) return;
  if (fsKey) document.removeEventListener('keydown', fsKey);
  if (fsResize) window.removeEventListener('resize', fsResize);
  fsKey = fsResize = null;
  ov.remove();
  document.body.classList.remove('noscroll');
  unlockScreen();
  if (!fromPop && history.state && history.state.fs) history.back();
}

// Android "Back" closes the card instead of leaving the page
window.addEventListener('popstate', () => {
  if (document.getElementById('sheet')) closeSheet(true);
  else if (document.getElementById('fs')) closeFullscreen(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.getElementById('fs')) lockScreen();
});

export function chip(label, active, onClick, extra = {}) {
  return h('button.chip' + (active ? '.on' : ''), { type: 'button', 'aria-pressed': active ? 'true' : 'false', on: { click: onClick }, ...extra }, label);
}

// ---------- Bottom sheet: pick one option from a grid (categories, groups). Nothing scrolls sideways. ----------
let sheetKey = null;

/** options: [{ id, label, icon?, count? }]. attr: data attribute put on each option (for tests and deep styling). */
export function openSheet({ title, options, current, onPick, attr = 'data-opt' }) {
  closeSheet();
  const opener = document.activeElement;
  const tiles = options.map((o) => h('button.opt-tile' + (o.id === current ? '.on' : ''), {
    type: 'button', [attr]: o.id, 'aria-pressed': o.id === current ? 'true' : 'false',
    on: { click: () => { closeSheet(); onPick(o.id); } },
  },
  o.icon ? h('span.ci', { lang: 'ja', 'aria-hidden': 'true' }, o.icon) : null,
  h('span.opt-label', o.label),
  o.count != null ? h('span.opt-count', String(o.count)) : null));
  const wrap = h('div#sheet.sheet-wrap', { on: { click: (e) => { if (e.target === wrap) closeSheet(); } } },
    h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div.sheet-head', h('h2', title),
        h('button.btn.icon.sheet-close', { type: 'button', 'aria-label': 'Close', on: { click: () => closeSheet() } }, ico('close'))),
      h('div.sheet-grid', tiles)));
  wrap.opener = opener;
  document.body.append(wrap);
  document.body.classList.add('noscroll');
  sheetKey = (e) => { if (e.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', sheetKey);
  history.pushState({ sheet: true }, '');
  (wrap.querySelector('.opt-tile.on') || tiles[0])?.focus({ preventScroll: true });
  return wrap;
}

export function closeSheet(fromPop = false) {
  const wrap = document.getElementById('sheet');
  if (!wrap) return;
  if (sheetKey) document.removeEventListener('keydown', sheetKey);
  sheetKey = null;
  wrap.remove();
  if (!document.getElementById('fs')) document.body.classList.remove('noscroll');
  if (wrap.opener?.isConnected) wrap.opener.focus({ preventScroll: true });
  if (!fromPop && history.state && history.state.sheet) history.back();
}

/** The button that opens a picker sheet: icon, current value, count, chevron. */
export function pickerButton({ id, icon, label, count, onClick, title }) {
  return h('button.btn.picker', { type: 'button', id, 'aria-haspopup': 'dialog', 'aria-label': `${title}: ${label}. Change`, on: { click: onClick } },
    icon ? h('span.ci', { lang: 'ja', 'aria-hidden': 'true' }, icon) : null,
    h('span.picker-label', label),
    count != null ? h('span.picker-count', String(count)) : null,
    ico('chevron'));
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Romaji line (CURRICULUM §3.6): mode 'show' → small romaji; 'tap' → a "Show romaji" button that reveals it.
 * Search by romaji works either way.
 */
export function romajiEl(text, mode = 'show', cls = 'romaji') {
  if (!text) return null;
  if (mode !== 'tap') return h('div.' + cls, text);
  const btn = h('button.romaji-tap', {
    type: 'button', 'aria-label': 'Show romaji',
    on: { click: (e) => { e.stopPropagation(); btn.replaceWith(h('div.' + cls, text)); } },
  }, 'Show romaji');
  return btn;
}
