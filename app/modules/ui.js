// Общие UI-помощники: создание DOM, фуригана, кнопки озвучки, полноэкранная карточка, тосты.
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

export function clear(el) { while (el.firstChild) el.firstChild.remove(); return el; }

/** Японский текст с фуриганой (<ruby>), всегда lang="ja". */
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

/** Иконка-маска дизайна (красится в currentColor; не превращается в эмодзи на iOS). */
export function ico(name) { return h('span.ico.ico-' + name, { 'aria-hidden': 'true' }); }

/** Кнопки ▶ 1.0× и 0.7× для элемента с полями ja/tts. Пока звучит — кольцо .is-speaking. */
export function speakButtons(item, { text } = {}) {
  const say = (rate) => (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    document.querySelectorAll('.btn.is-speaking').forEach((b) => b.classList.remove('is-speaking'));
    btn.classList.add('is-speaking');
    speakItem(item, rate, text).finally(() => btn.classList.remove('is-speaking'));
  };
  return h('span.speak',
    h('button.btn.icon', { type: 'button', title: 'Произнести', 'aria-label': 'Произнести', on: { click: say(1.0) } }, ico('play')),
    h('button.btn.icon.slow', { type: 'button', title: 'Медленно (0.7×)', 'aria-label': 'Медленно', on: { click: say(0.7) } }, '0.7×'),
  );
}

export function speakItem(item, rate = 1.0, text) {
  const t = text || ttsText(item);
  return tts.speak(t, rate).then((r) => {
    if (r === 'unsupported') toast('Озвучка недоступна в этом браузере');
    else if (r.startsWith('error') && !r.includes('interrupted') && !r.includes('canceled')) toast('Не удалось озвучить: ' + r.slice(6) + '. Проверьте японский голос в «Инструментах».');
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

// ---------- Полноэкранная карточка «показать японцу» ----------
let wakeLock = null;
async function lockScreen() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch { wakeLock = null; }
}
function unlockScreen() { try { wakeLock?.release(); } catch { /* ignore */ } wakeLock = null; }

/**
 * Показать текст крупно. lines: [{ ruby | text, big?: bool }]; caption — русская подпись для себя.
 */
export function showFullscreen({ lines, caption, speakText }) {
  closeFullscreen();
  const textLen = lines.reduce((n, l) => n + (l.text || l.ruby || '').replace(/\[[^\]]*\]/g, '').length, 0);
  // --fs-n: процент от короткой стороны экрана (таблица из design/DESIGN.md §5)
  const size = textLen <= 8 ? 20 : textLen <= 20 ? 13.5 : textLen <= 40 ? 11 : textLen <= 80 ? 8 : 6;
  const body = h('div.fs-body', { style: { '--fs-n': String(size) } },
    lines.map((l) => h('p.fs-line' + (l.small ? '.small' : ''),
      l.ruby ? rubyEl(l.ruby, { furigana: false, cls: 'fs-ja' }) : jaText(l.text, 'fs-ja'))));
  const ov = h('div#fs.fs', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Карточка для показа' },
    body,
    caption ? h('p.fs-caption', caption) : null,
    h('div.fs-bar',
      speakText ? h('button.btn', { type: 'button', on: { click: () => speakItem({ ja: speakText }, 1.0) } }, ico('play'), 'Озвучить') : null,
      h('button.btn', { type: 'button', on: { click: () => ov.classList.toggle('rot') } }, ico('rotate'), 'Повернуть'),
      h('button.btn.primary', { type: 'button', on: { click: () => closeFullscreen() } }, ico('close'), 'Закрыть'),
    ),
  );
  document.body.append(ov);
  document.body.classList.add('noscroll');
  lockScreen();
  fitFullscreen(ov, size);
  fsResize = () => fitFullscreen(ov, size);
  window.addEventListener('resize', fsResize);
  // Esc закрывает всегда, а не только до первой другой клавиши (B15)
  fsKey = (e) => { if (e.key === 'Escape') closeFullscreen(); };
  document.addEventListener('keydown', fsKey);
  history.pushState({ fs: true }, '');
  return ov;
}

let fsKey = null, fsResize = null;

/** Уменьшать --fs-n, пока весь текст (и подпись) не поместится над панелью кнопок (B3, B16). */
export function fitFullscreen(ov, start) {
  const body = ov.querySelector('.fs-body');
  const bar = ov.querySelector('.fs-bar');
  const cap = ov.querySelector('.fs-caption');
  let n = start;
  const fits = () => {
    const barTop = bar.getBoundingClientRect().top;
    const limit = barTop > window.innerHeight / 2 ? barTop : window.innerHeight; // в альбомной панель сбоку
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

// «Назад» на Android закрывает карточку, а не уходит со страницы
window.addEventListener('popstate', () => { if (document.getElementById('fs')) closeFullscreen(true); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.getElementById('fs')) lockScreen();
});

export function chip(label, active, onClick, extra = {}) {
  return h('button.chip' + (active ? '.on' : ''), { type: 'button', 'aria-pressed': active ? 'true' : 'false', on: { click: onClick }, ...extra }, label);
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
