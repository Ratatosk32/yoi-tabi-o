// Оболочка приложения: данные, роутер вкладок, настройки, Service Worker.
import { createStore } from './modules/store.js';
import { completeItem } from './modules/text.js';
import { todayStr } from './modules/srs.js';
import * as tts from './modules/tts.js';
import { DEFAULT_LENS, PLATFORM } from './modules/launchers.js';
import { h, clear, toast } from './modules/ui.js';
import * as phrasesView from './modules/view-phrases.js';
import * as studyView from './modules/view-study.js';
import * as showView from './modules/view-show.js';
import * as kanjiView from './modules/view-kanji.js';
import * as toolsView from './modules/view-tools.js';

export const APP_VERSION = '1.0.0';

const TABS = [
  { id: 'phrases', label: 'Фразы', glyph: '話', view: phrasesView },
  { id: 'study', label: 'Учёба', glyph: '学', view: studyView },
  { id: 'show', label: 'Показать', glyph: '見', view: showView },
  { id: 'kanji', label: 'Кандзи', glyph: '字', view: kanjiView },
  { id: 'tools', label: 'Инструменты', glyph: '具', view: toolsView },
];

const DEFAULT_SETTINGS = {
  furigana: true,
  lensVariant: DEFAULT_LENS,
  newPerDay: 12,
  startDate: null,
  phrasesCat: 'basics',
  lastBackup: null,
};

const store = createStore();

const ctx = {
  store,
  data: null,
  settings() { return { ...DEFAULT_SETTINGS, ...store.get('settings', {}) }; },
  setSetting(k, v) { store.update('settings', {}, (s) => ({ ...s, [k]: v })); },
  go(hash) { if (location.hash !== hash) location.hash = hash; else route(); },
  rerender() { route(); },
  allItems() {
    // базовые + пользовательские фразы (пользовательские с тем же id перекрывают базовые)
    const user = (store.get('userItems', []) || []).map(completeItem);
    if (!user.length) return this.data.items;
    const ids = new Set(user.map((u) => u.id));
    return [...this.data.items.filter((it) => !ids.has(it.id)), ...user];
  },
};

async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

async function loadData() {
  const [ph, kana, kanji] = await Promise.all([
    loadJson('data/phrases.json'), loadJson('data/kana.json'), loadJson('data/kanji.json'),
  ]);
  const items = ph.items.map(completeItem);
  return {
    version: ph.version,
    categories: ph.categories,
    catById: Object.fromEntries(ph.categories.map((c) => [c.id, c])),
    items,
    byId: Object.fromEntries(items.map((it) => [it.id, it])),
    kana,
    kanji,
  };
}

// ---------- Роутер ----------
function parseHash() {
  const parts = (location.hash || '#/phrases').replace(/^#\/?/, '').split('/').filter(Boolean);
  const tab = TABS.find((t) => t.id === parts[0]) ? parts[0] : 'phrases';
  return { tab, params: parts.slice(1).map(decodeURIComponent) };
}

function route() {
  if (!ctx.data) return;
  const { tab, params } = parseHash();
  document.querySelectorAll('.tabbar button').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  const view = document.getElementById('view');
  clear(view);
  view.dataset.tab = tab;
  try {
    TABS.find((t) => t.id === tab).view.render(ctx, view, params);
  } catch (e) {
    console.error(e);
    view.append(h('div.card.error', 'Ошибка отрисовки: ' + e.message));
  }
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}

function buildShell() {
  const app = document.getElementById('app');
  clear(app);
  app.append(
    h('main#view', { tabindex: '-1' }),
    h('nav.tabbar', { 'aria-label': 'Разделы' },
      TABS.map((t) => h('button', {
        type: 'button', 'data-tab': t.id,
        on: { click: () => ctx.go('#/' + t.id) },
      }, h('span.glyph', { lang: 'ja', 'aria-hidden': 'true' }, t.glyph), h('span.lbl', t.label)))),
  );
}

// ---------- Service Worker ----------
let swReg = null;
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register('./sw.js');
    const offerUpdate = (worker) => {
      if (!worker || !navigator.serviceWorker.controller) return; // первая установка — без баннера
      showUpdateBanner(worker);
    };
    if (swReg.waiting) offerUpdate(swReg.waiting);
    swReg.addEventListener('updatefound', () => {
      const nw = swReg.installing;
      nw?.addEventListener('statechange', () => { if (nw.state === 'installed') offerUpdate(nw); });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !window.__updateRequested) return;
      reloading = true;
      location.reload();
    });
  } catch (e) {
    console.warn('SW registration failed', e);
  }
}

function showUpdateBanner(worker) {
  if (document.getElementById('update')) return;
  const bar = h('div#update.banner', { role: 'status' },
    h('span', 'Доступна новая версия приложения.'),
    h('button.btn.primary', { type: 'button', on: { click: () => { window.__updateRequested = true; worker.postMessage('skipWaiting'); } } }, 'Обновить'),
    h('button.btn', { type: 'button', on: { click: () => bar.remove() } }, 'Позже'),
  );
  document.body.append(bar);
}

export function swInfo() {
  return { supported: 'serviceWorker' in navigator, controlled: !!navigator.serviceWorker?.controller, reg: swReg };
}

// ---------- Старт ----------
async function start() {
  document.documentElement.dataset.platform = PLATFORM;
  buildShell();
  const s = ctx.settings();
  if (!s.startDate) ctx.setSetting('startDate', todayStr());
  try {
    ctx.data = await loadData();
  } catch (e) {
    document.getElementById('view').append(h('div.card.error',
      h('p', 'Не удалось загрузить данные: ' + e.message),
      h('p', 'Откройте приложение один раз с интернетом, чтобы оно сохранилось для офлайна.')));
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  document.documentElement.dataset.ready = '1';
  tts.init().then((st) => {
    ctx.ttsStatus = st;
    if (st.supported && !st.hasJapanese && !sessionStorageGet('ttsWarned')) {
      sessionStorageSet('ttsWarned', '1');
      toast('Японский голос не найден — см. «Инструменты» → Озвучка', 4000);
    }
  });
  registerSW();
  try { if (navigator.storage?.persist) ctx.persisted = await navigator.storage.persist(); } catch { /* ignore */ }
}

function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } }

ctx.swInfo = swInfo;
window.__app = ctx; // для отладки и e2e-тестов
start();
