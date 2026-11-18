// UX-audit screenshots of the REAL app (app/ served by tools/serve.mjs) -> design/shots/ux/<label>/
// Run: node design/tools/ux-shots.mjs <label> [--all-sizes] [scene ...]
//   label        "before" | "after" | anything
//   --all-sizes  412x915 and 430x932, light and dark (default: 412x915 light + dark)
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureWebSocket, launch } from './chrome.mjs';
ensureWebSocket(import.meta.url);
const { startServer } = await import('../../tools/serve.mjs');

const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith('--')) || 'after';
const allSizes = args.includes('--all-sizes');
const only = args.filter((a) => !a.startsWith('--')).slice(1);
const out = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'shots', 'ux', label);
mkdirSync(out, { recursive: true });

const PORT = 8911;
const base = `http://127.0.0.1:${PORT}/`;
const P = 'const $ = (s) => document.querySelector(s); const $$ = (s) => [...document.querySelectorAll(s)]; const wait = (ms) => new Promise((r) => setTimeout(r, ms));';
const click = (sel) => `{ const el = $(${JSON.stringify(sel)}); if (!el) throw new Error('no ' + ${JSON.stringify(sel)}); el.click(); await wait(150); }`;

// [name, hash or path, script to run after load, full page?]
const SCENES = [
  ['phrases', '#/phrases/basics', '', false],
  ['phrases-open', '#/phrases/konbini', `${click('.phrase:nth-of-type(2) .jp')}`, false],
  ['phrases-hear', '#/phrases/hear', `${click('.phrase:nth-of-type(2) .jp')}`, false],
  ['phrases-search', '#/phrases', `const i = $('#phrase-search'); i.value = 'bag'; i.dispatchEvent(new Event('input')); await wait(300);`, false],
  ['phrases-search-none', '#/phrases', `const i = $('#phrase-search'); i.value = 'zzzz'; i.dispatchEvent(new Event('input')); await wait(300);`, false],
  ['phrases-fav-empty', '#/phrases/fav', '', false],
  ['phrases-picker', '#/phrases/basics', `const b = $('#cat-picker'); if (b) { b.click(); await wait(300); }`, false],
  ['kanji-picker', '#/kanji', `const b = $('#kanji-picker'); if (b) { b.click(); await wait(300); }`, false],
  ['show-filled', '#/show', `localStorage.setItem('jt.cards', JSON.stringify({ allergy: { who: 'child', allergens: ['tamago', 'komugi'], strict: true }, hotel: { name: '〇〇ホテル新宿', address: '〒000-0000 東京都…' } })); window.__app.rerender(); await wait(300);`, false],
  ['study-today', '#/study', '', true],
  ['study-card-front', '#/study', `${click('#start-review')}`, false],
  ['study-card-back', '#/study', `${click('#start-review')} ${click('#reveal')}`, false],
  ['study-listen', '#/study', `${click('#start-listen')}`, false],
  ['study-cards', '#/study/cards', '', true],
  ['study-kana', '#/study/kana', '', false],
  ['study-kana-full', '#/study/kana', '', true],
  ['study-quiz', '#/study/kana', `${click('#kana-quiz .chip')}`, false],
  ['study-quiz-answered', '#/study/kana', `${click('#kana-quiz .chip')} ${click('#kana-quiz .opt')}`, false],
  ['study-numbers', '#/study/numbers', '', false],
  ['study-numbers-answered', '#/study/numbers', `const i = $('#num-answer'); i.value = '1'; ${click('#num-check')}`, false],
  ['study-time', '#/study/time', '', true],
  ['show', '#/show', '', true],
  ['show-allergy', '#/show', `${click('#card-allergy .check input')} await wait(100); ${click('#card-allergy .check:nth-of-type(3) input')}`, false],
  ['show-fullscreen', '#/show', `${click('.showcard')}`, false],
  ['kanji', '#/kanji', '', false],
  ['tools', '#/tools', '', true],
  ['diag', 'diag', '', true],
];

const SIZES = allSizes ? [[412, 915], [430, 932]] : [[412, 915]];
const server = await startServer(PORT, { quiet: true });
const chrome = await launch();
let n = 0;
try {
  // Failed data load (before the service worker has cached anything): must show an error with Retry, not a spinner
  if (!only.length || only.includes('load-error')) {
    await chrome.send('Network.enable');
    await chrome.send('Network.setBlockedURLs', { urls: ['*data/phrases.json*'] });
    for (const [w, h] of SIZES) for (const dark of [false, true]) {
      const file = join(out, `load-error-${w}x${h}-${dark ? 'dark' : 'light'}.png`);
      await chrome.shoot(`${base}?n=${++n}#/phrases`, file, { width: w, height: h, dark, run: `${P} await wait(600);` });
      console.log(file);
    }
    await chrome.send('Network.setBlockedURLs', { urls: [] });
    await chrome.evaluate(`const rs = await navigator.serviceWorker?.getRegistrations() || []; for (const r of rs) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); localStorage.clear();`);
  }
  for (const [name, target, run, full] of SCENES) {
    if (only.length && !only.includes(name)) continue;
    for (const [w, h] of SIZES) for (const dark of [false, true]) {
      const url = target.startsWith('#') ? `${base}?n=${++n}${target}` : `${base}${target}?n=${++n}`;
      const file = join(out, `${name}-${w}x${h}-${dark ? 'dark' : 'light'}.png`);
      await chrome.shoot(url, file, { width: w, height: h, dark, full, run: `${P} await wait(250); ${run}` });
      console.log(file);
    }
  }
} finally { await chrome.close(); server.close(); }
process.exit(0);
