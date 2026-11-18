// App shell: data, tab router, settings, Service Worker.
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
  { id: 'phrases', label: 'Phrases', glyph: '話', view: phrasesView },
  { id: 'study', label: 'Study', glyph: '学', view: studyView },
  { id: 'show', label: 'Show', glyph: '見', view: showView },
  { id: 'kanji', label: 'Kanji', glyph: '字', view: kanjiView },
  { id: 'tools', label: 'Tools', glyph: '具', view: toolsView },
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
    // built-in + user phrases (a user phrase with the same id overrides the built-in one)
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

// ---------- Router ----------
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
    view.append(h('div.card.error', 'Render error: ' + e.message));
  }
  const header = view.querySelector('header.top');
  if (header) header.append(themeToggle());
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}

// ---------- Theme: follows the system by default; manual choice = data-theme on <html> + localStorage ----------
export function currentTheme() {
  const el = document.documentElement;
  if (el.dataset.theme === 'light' || el.dataset.theme === 'dark') return el.dataset.theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch { /* private mode */ }
  document.querySelectorAll('meta[name=theme-color]').forEach((m) => { m.content = theme === 'dark' ? '#171613' : '#f5f1e7'; });
}

function themeToggle() {
  const label = () => (currentTheme() === 'dark' ? 'Light theme' : 'Dark theme');
  const btn = h('button.theme-toggle', {
    type: 'button', 'aria-label': label(), title: label(),
    on: { click: () => { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); btn.setAttribute('aria-label', label()); btn.title = label(); } },
  });
  return btn;
}

function buildShell() {
  const app = document.getElementById('app');
  clear(app);
  app.append(
    h('main#view', { tabindex: '-1' }),
    h('nav.tabbar', { 'aria-label': 'Sections' },
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
      if (!worker || !navigator.serviceWorker.controller) return; // first install — no banner
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
    h('span', 'A new version of the app is available.'),
    h('button.btn.primary', { type: 'button', on: { click: () => { window.__updateRequested = true; worker.postMessage('skipWaiting'); } } }, 'Update'),
    h('button.btn', { type: 'button', on: { click: () => bar.remove() } }, 'Later'),
  );
  document.body.append(bar);
}

export function swInfo() {
  return { supported: 'serviceWorker' in navigator, controlled: !!navigator.serviceWorker?.controller, reg: swReg };
}

// ---------- Start ----------
async function start() {
  document.documentElement.dataset.platform = PLATFORM;
  buildShell();
  const s = ctx.settings();
  store.migrate(); // data saved by older versions (SRS mode keys, user phrases ru → en)
  if (!s.startDate) ctx.setSetting('startDate', todayStr());
  try {
    ctx.data = await loadData();
  } catch (e) {
    document.getElementById('view').append(h('div.card.error',
      h('p', 'Could not load data: ' + e.message),
      h('p', 'Open the app once while online so it is saved for offline use.')));
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  document.documentElement.dataset.ready = '1';
  tts.init().then((st) => {
    ctx.ttsStatus = st;
    if (st.supported && !st.hasJapanese && !sessionStorageGet('ttsWarned')) {
      sessionStorageSet('ttsWarned', '1');
      toast('No Japanese voice found — see Tools → Speech', 4000);
    }
  });
  registerSW();
  try { if (navigator.storage?.persist) ctx.persisted = await navigator.storage.persist(); } catch { /* ignore */ }
}

function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } }

ctx.swInfo = swInfo;
window.__app = ctx; // for debugging and e2e tests
start();
