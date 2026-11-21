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
import { dictFor } from './modules/dict.js';
import * as L from './modules/lang.js';
import { loadLangData } from './modules/loader.js';
import { appVersion, consumeUpdatedFlag } from './modules/updates.js';
import { takeDailySnapshot, idbKV } from './modules/snapshots.js';

export const APP_VERSION = '1.0.0';

const TABS = [
  { id: 'phrases', label: 'Phrases', glyph: '話', view: phrasesView },
  { id: 'study', label: 'Study', glyph: '学', view: studyView },
  { id: 'show', label: 'Show', glyph: '見', view: showView },
  { id: 'kanji', label: 'Words', glyph: '語', view: kanjiView }, // Signs + Dictionary (route id kept for links and tests)
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

const GLOBAL_SETTINGS = ['lensVariant', 'lastBackup'];

const rootStore = createStore();

const ctx = {
  rootStore,
  store: rootStore,
  lang: L.current(),
  data: null,
  dataByLang: {},
  settings() {
    const global = rootStore.get('settings', {}) || {};
    const own = this.store.get('settings', {}) || {};
    const shared = Object.fromEntries(GLOBAL_SETTINGS.filter((k) => k in global).map((k) => [k, global[k]]));
    return { ...DEFAULT_SETTINGS, ...own, ...shared };
  },
  setSetting(k, v) {
    const target = GLOBAL_SETTINGS.includes(k) ? rootStore : this.store;
    target.update('settings', {}, (s) => ({ ...s, [k]: v }));
  },
  switchLang(id) { return switchLang(id); },
  go(hash) { if (location.hash !== hash) location.hash = hash; else route(); },
  rerender() { route(); },
  allItems() {
    // built-in + user phrases (a user phrase with the same id overrides the built-in one)
    const user = (this.store.get('userItems', []) || []).map(completeItem);
    if (!user.length) return this.data.items;
    const ids = new Set(user.map((u) => u.id));
    return [...this.data.items.filter((it) => !ids.has(it.id)), ...user];
  },
};

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
  if (header) header.append(langSwitch(), themeToggle());
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

function langSwitch() {
  return h('div.lang-switch', { role: 'group', 'aria-label': 'Course language' },
    L.LANG_IDS.map((id) => {
      const lang = L.LANGS[id];
      const on = id === ctx.lang.id;
      return h('button.lang-opt' + (on ? '.on' : ''), {
        type: 'button', lang: lang.tag, 'data-lang': id, 'aria-pressed': on ? 'true' : 'false', title: `${lang.name} course`,
        on: { click: () => { if (!on) switchLang(id); } },
      }, h('span.lang-full', lang.label), h('span.lang-short', { 'aria-hidden': 'true' }, lang.short));
    }));
}

function applyLangToDocument() {
  const el = document.documentElement;
  el.lang = ctx.lang.id === 'ja' ? 'en' : ctx.lang.tag;
  el.dataset.lang = ctx.lang.id;
}

function activate(id, data) {
  ctx.lang = L.setActive(id);
  L.saveLang(id);
  ctx.store = rootStore.lang(id);
  ctx.data = data;
  if (!ctx.settings().startDate) ctx.setSetting('startDate', todayStr());
  applyLangToDocument();
}

function showLangLoading(lang) {
  clear(document.getElementById('view')).append(h('p.loading#lang-loading', { role: 'status' }, `Loading the ${lang.name} course…`));
}

function showLangError(lang, e, fallback) {
  console.warn(e);
  const view = clear(document.getElementById('view'));
  view.append(h('div.card.error#lang-error', { role: 'alert' },
    h('p', h('strong', `The ${lang.name} course could not be downloaded.`)),
    h('p.small', navigator.onLine === false
      ? 'You are offline and it is not saved on this device yet. Connect once and tap Retry.'
      : 'Check the connection and tap Retry. After one download it works offline.'),
    h('p.small.muted', String(e?.message || e)),
    h('div.actions.wrap',
      h('button.btn.primary#lang-retry', { type: 'button', on: { click: () => switchLang(lang.id, { force: true }) } }, 'Retry'),
      fallback ? h('button.btn#lang-back', { type: 'button', on: { click: fallback.go } }, fallback.label) : null)));
}

let switching = null;
async function switchLang(id, { force = false } = {}) {
  if (!L.isLang(id) || (!force && id === ctx.lang.id && ctx.data)) return;
  const lang = L.LANGS[id];
  const previous = ctx.data ? ctx.lang : null;
  const token = {};
  switching = token;
  if (!ctx.dataByLang[id]) showLangLoading(lang);
  let data;
  try {
    data = ctx.dataByLang[id] || await loadLangData(id);
  } catch (e) {
    if (switching !== token) return;
    const fallback = previous ? { label: `Stay with ${previous.name}`, go: () => route() } : { label: 'Use Japanese', go: () => switchLang('ja') };
    showLangError(lang, e, fallback);
    return;
  }
  if (switching !== token) return;
  ctx.dataByLang[id] = data;
  activate(id, data);
  if (id !== 'ja') globalThis.navigator?.serviceWorker?.ready.then((reg) => reg.active?.postMessage('cacheZh')).catch(() => {});
  warnIfNoVoice();
  scheduleDictLoad();
  const { tab } = parseHash();
  const hash = '#/' + tab;
  if (location.hash !== hash) location.hash = hash; else route();
}

function warnIfNoVoice() {
  if (!ctx.ttsStatus?.supported) return;
  const zh = ctx.lang.id === 'zh';
  const has = zh ? ctx.ttsStatus.hasChinese : ctx.ttsStatus.hasJapanese;
  const key = 'ttsWarned.' + ctx.lang.id;
  if (has || sessionStorageGet(key)) return;
  sessionStorageSet(key, '1');
  toast(`No ${ctx.lang.name} voice found — see Tools → Speech`, 4000);
}

function scheduleDictLoad() {
  const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));
  const d = dictFor(ctx.lang.id);
  idle(() => d.load().catch(() => {}));
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
function showLoading() {
  clear(document.getElementById('view')).append(h('p.loading', { role: 'status' }, 'Loading…'));
}

/** A failed start always ends here: what happened, what to do, and a Retry button. */
function showLoadError(e) {
  console.error(e);
  clearTimeout(window.__bootTimer);
  const view = clear(document.getElementById('view'));
  view.append(h('div.card.error#load-error', { role: 'alert' },
    h('p', h('strong', 'The app could not load its data.')),
    h('p.small', navigator.onLine === false
      ? 'You are offline and the phrases are not saved on this device yet. Connect once and tap Retry.'
      : 'Check the connection and tap Retry. Open the app once while online so it is saved for offline use.'),
    h('p.small.muted', String(e?.message || e)),
    h('div.actions.wrap',
      h('button.btn.primary#retry-load', { type: 'button', on: { click: () => boot() } }, 'Retry'),
      h('button.btn', { type: 'button', on: { click: () => location.reload() } }, 'Reload the app'))));
}

let booted = false;
async function boot() {
  const id = L.savedLang();
  const lang = L.LANGS[id];
  if (id === 'ja') showLoading(); else showLangLoading(lang);
  let data;
  try {
    data = ctx.dataByLang[id] || await loadLangData(id);
  } catch (e) {
    clearTimeout(window.__bootTimer);
    if (id === 'ja') showLoadError(e);
    else showLangError(lang, e, { label: 'Use Japanese', go: () => { L.saveLang('ja'); boot(); } });
    return;
  }
  ctx.dataByLang[id] = data;
  activate(id, data);
  clearTimeout(window.__bootTimer);
  if (!booted) {
    booted = true;
    window.addEventListener('hashchange', route);
    tts.init().then((st) => { ctx.ttsStatus = st; warnIfNoVoice(); });
  }
  route();
  document.documentElement.dataset.ready = '1';
  if (consumeUpdatedFlag()) appVersion().then((v) => toast(v ? `Updated to ${v}` : 'Updated'));
  scheduleDictLoad();
}

async function start() {
  document.documentElement.dataset.platform = PLATFORM;
  try {
    buildShell();
    rootStore.migrate(); // data saved by older versions (SRS mode keys, user phrases ru → en)
  } catch (e) {
    // e.g. storage blocked: the shell is up, so say what happened instead of hanging on "Loading…"
    showLoadError(e);
    return;
  }
  await boot();
  registerSW();
  // Ask the browser to keep our data (progress lives in localStorage) on the first real interaction
  const askPersist = () => { removeEventListener('pointerdown', askPersist, true); removeEventListener('keydown', askPersist, true); requestPersist(); };
  addEventListener('pointerdown', askPersist, true);
  addEventListener('keydown', askPersist, true);
  // Daily local snapshot (IndexedDB, last 3 days): 'Restore yesterday's state' in Tools
  setTimeout(() => takeDailySnapshot(rootStore, idbKV(), todayStr()).catch(() => { /* no IndexedDB */ }), 1000);
}

export async function requestPersist() {
  try { if (navigator.storage?.persist) ctx.persisted = await navigator.storage.persist(); } catch { /* ignore */ }
  return ctx.persisted;
}

function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } }

ctx.swInfo = swInfo;
ctx.requestPersist = requestPersist;
window.__app = ctx; // for debugging and e2e tests
start();
