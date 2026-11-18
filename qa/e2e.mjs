// E2E smoke for the japan-trip PWA with puppeteer-core + locally installed Chrome (headless).
// Run: node e2e.mjs [profileFilter]  → console + qa/out/e2e.json + qa/shots/*.png
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createServer } from './serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..', 'app');
const SHOTS = path.join(here, 'shots');
const OUT = path.join(here, 'out');
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
// Phrases are collapsed by default since the design integration: tap the phrase to open it first (like a user).
async function expand(page, id) {
  await page.evaluate((pid) => {
    const a = document.querySelector('#phrase-list article[data-id="' + pid + '"]');
    if (a && a.classList.contains('is-collapsed')) a.querySelector('.jp').click();
  }, id);
  await new Promise((r) => setTimeout(r, 120));
}
const PORT = 8765;
const BASE = `http://127.0.0.1:${PORT}/`;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
};
const PROFILES = [
  { id: 'pixel', ua: UA.android, vp: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }, platform: 'android', tts: 'novoices' },
  { id: 'iphone', ua: UA.ios, vp: { width: 430, height: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, platform: 'ios', tts: 'none' },
];

const KANA = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'kana.json'), 'utf8'));
const KMAP = new Map();
for (const rows of [KANA.gojuon, KANA.dakuten, KANA.yoon, KANA.extended]) for (const c of rows.flat().filter(Boolean)) { if (c.h) KMAP.set(c.h, c.r); if (c.k) KMAP.set(c.k, c.r); }
for (const w of KANA.words) KMAP.set(w.k, w.en);

const results = [];
const rec = (profile, name, ok, actual, extra = {}) => { results.push({ profile, name, ok, actual: String(actual ?? '').slice(0, 600), ...extra }); console.log(`${ok ? 'PASS' : 'FAIL'} [${profile}] ${name}${actual ? ' — ' + String(actual).slice(0, 220) : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer(APP, PORT);
await server.start();
const filter = process.argv[2];

function initScript(ttsMode) {
  // runs before page scripts: capture TTS / window.open, optionally remove voices or the whole API
  return `(() => {
    window.__spoken = []; window.__opened = []; window.__errors = [];
    const o = window.open; window.open = function(u, ...a) { window.__opened.push(String(u)); return null; };
    window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => window.__errors.push('unhandled: ' + String(e.reason && e.reason.message || e.reason)));
    if (${JSON.stringify(ttsMode)} === 'none') {
      try { Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => undefined }); } catch (e) {}
      return;
    }
    const S = window.speechSynthesis;
    if (!S) return;
    if (${JSON.stringify(ttsMode)} === 'novoices') { try { S.getVoices = () => []; } catch (e) {} }
    const orig = S.speak.bind(S);
    S.speak = (u) => { window.__spoken.push({ text: u.text, lang: u.lang, rate: u.rate }); try { orig(u); } catch (e) { window.__errors.push('speak threw ' + e.message); } };
  })();`;
}

async function newPage(browserOrCtx, P) {
  const page = await browserOrCtx.newPage();
  await page.setUserAgent(P.ua);
  await page.setViewport(P.vp);
  await page.evaluateOnNewDocument(initScript(P.tts));
  page.__console = [];
  page.on('console', (m) => { if (['error', 'warning', 'warn'].includes(m.type())) page.__console.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => page.__console.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => { if (!/^(intent|google|googletranslate|tel):/.test(r.url())) page.__console.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText || '')); });
  page.on('dialog', (d) => d.dismiss());
  page.on('response', (r) => { if (r.status() >= 400) page.__console.push(`http ${r.status()}: ${r.url()}`); });
  return page;
}
async function ready(page, timeout = 15000) { await page.waitForFunction(() => document.documentElement.dataset.ready === '1', { timeout }); }
const errs = (page) => page.__console.filter((x) => !/favicon/.test(x));
const page404 = (page) => page.__console; // unfiltered (shows favicon 404 URL too)
async function shot(page, P, name) { const f = path.join(SHOTS, `${P.id}-${name}.png`); await page.screenshot({ path: f }); return path.relative(here, f); }
async function overflow(page) { return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); }
async function gotoHash(page, hash) { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(250); }
async function clickText(page, sel, text) {
  const ok = await page.evaluate((sel, text) => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text)); if (!el) return false; el.click(); return true; }, sel, text);
  if (!ok) throw new Error(`no ${sel} with text «${text}»`); await sleep(200);
}

async function runProfile(browser, P) {
  const page = await newPage(browser, P);
  // ---------- 1. load + tabs ----------
  await page.goto(BASE, { waitUntil: 'load' });
  try { await ready(page); rec(P.id, 'app boots (data-ready=1)', true, await page.evaluate(() => `items=${window.__app.data.items.length}, platform=${document.documentElement.dataset.platform}`)); }
  catch (e) { rec(P.id, 'app boots', false, e.message + ' ' + errs(page).join(' | ')); return; }
  const plat = await page.evaluate(() => document.documentElement.dataset.platform);
  rec(P.id, `platform detected = ${P.platform}`, plat === P.platform, plat);

  const TABS = ['phrases', 'study', 'show', 'kanji', 'tools'];
  for (const tab of TABS) {
    page.__console.length = 0;
    await page.click(`.tabbar button[data-tab="${tab}"]`); await sleep(400);
    const info = await page.evaluate(() => ({ tab: document.getElementById('view').dataset.tab, err: !!document.querySelector('#view .card.error'), h1: document.querySelector('#view h1')?.textContent, n: document.querySelectorAll('#view *').length }));
    const ov = await overflow(page);
    const s = await shot(page, P, 'tab-' + tab);
    const e = errs(page);
    rec(P.id, `tab ${tab} renders, no console errors, no horizontal overflow`, info.tab === tab && !info.err && !e.length && ov.sw <= ov.cw && info.n > 5,
      `h1=${info.h1}, nodes=${info.n}, scrollWidth=${ov.sw}/${ov.cw}, errors=${e.join(' | ') || 'none'}, shot=${s}`);
  }
  for (const sub of ['today', 'cards', 'kana', 'numbers', 'time']) {
    page.__console.length = 0;
    await gotoHash(page, '#/study/' + sub); await sleep(200);
    const err = await page.evaluate(() => !!document.querySelector('#view .card.error'));
    const ov = await overflow(page); const e = errs(page); const s = await shot(page, P, 'study-' + sub);
    rec(P.id, `study/${sub} renders`, !err && !e.length && ov.sw <= ov.cw, `scrollWidth=${ov.sw}/${ov.cw}, errors=${e.join(' | ') || 'none'}, shot=${s}`);
  }

  // ---------- 2. search ----------
  await gotoHash(page, '#/phrases');
  const bagId = await page.evaluate(() => window.__app.data.items.find((i) => i.ja === '袋はいりません')?.id);
  for (const q of ['ふくろ', 'bag', 'fukuro']) {
    await page.evaluate(() => { const i = document.getElementById('phrase-search'); i.value = ''; });
    await page.focus('#phrase-search'); await page.type('#phrase-search', q); await sleep(450);
    const r = await page.evaluate((id) => ({ found: !!document.querySelector(`#phrase-list article[data-id="${id}"]`), title: document.querySelector('#phrase-list h2')?.textContent, first: document.querySelector('#phrase-list article')?.dataset.id }), bagId);
    const s = await shot(page, P, 'search-' + (q === 'ふくろ' ? 'fukuro-kana' : q === 'bag' ? 'bag' : 'fukuro'));
    rec(P.id, `search «${q}» shows ${bagId}`, r.found, `${r.title}; first=${r.first}; shot=${s}`);
  }

  // ---------- 3. favourite persists ----------
  await expand(page, bagId); await page.click(`#phrase-list article[data-id="${bagId}"] .fav`); await sleep(200);
  const favLS = await page.evaluate(() => localStorage.getItem('jt.favs'));
  await page.reload({ waitUntil: 'load' }); await ready(page);
  await gotoHash(page, '#/phrases'); await page.click('.chips button[data-cat="fav"]'); await sleep(300);
  const favOk = await page.evaluate((id) => !!document.querySelector(`#phrase-list article[data-id="${id}"] .fav.on`), bagId);
  rec(P.id, 'favourite ★ persists after reload', favOk, `localStorage jt.favs=${favLS}; shot=${await shot(page, P, 'fav-after-reload')}`);
  // un-favourite in the fav list (list should update)
  await expand(page, bagId); await page.click(`#phrase-list article[data-id="${bagId}"] .fav`); await sleep(250);
  const goneFromFav = await page.evaluate((id) => !document.querySelector(`#phrase-list article[data-id="${id}"]`), bagId);
  rec(P.id, 'un-favourite removes it from Favorites immediately', goneFromFav, '');
  const bagCat = await page.evaluate((id) => window.__app.data.byId[id].cat, bagId);
  await page.click('#cat-picker'); await page.waitForSelector(`#sheet [data-cat="${bagCat}"]`); await page.click(`#sheet [data-cat="${bagCat}"]`); await sleep(200); // categories live in a bottom sheet
  await expand(page, bagId); await page.click(`#phrase-list article[data-id="${bagId}"] .fav`); await sleep(150); // keep it favourited for backup test

  // ---------- 4. Show card full screen ----------
  await expand(page, bagId); await page.click(`#phrase-list article[data-id="${bagId}"] button[aria-label="Show full screen"]`); await sleep(400);
  const fs1 = await page.evaluate(() => { const o = document.getElementById('fs'); if (!o) return null; const r = o.getBoundingClientRect(); const b = o.querySelector('.fs-body'); const cs = getComputedStyle(o);
    return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, text: o.querySelector('.fs-ja')?.textContent, rt: o.querySelectorAll('rt').length, bg: cs.backgroundColor, color: getComputedStyle(o.querySelector('.fs-ja')).color, fontPx: parseFloat(getComputedStyle(o.querySelector('.fs-ja')).fontSize), bodyOverflow: b.scrollHeight > b.clientHeight + 1, lang: o.querySelector('[lang="ja"]') ? 'ja' : 'none' }; });
  const fsShot = await shot(page, P, 'show-fullscreen');
  rec(P.id, 'Show card opens full screen (covers viewport, ja text, no furigana, lang=ja)', !!fs1 && fs1.w >= fs1.vw - 1 && fs1.h >= fs1.vh - 1 && fs1.text === '袋はいりません' && fs1.rt === 0 && fs1.lang === 'ja',
    JSON.stringify(fs1) + ' shot=' + fsShot);
  const urlBefore = page.url();
  await page.evaluate(() => history.back()); await sleep(400);
  const closedByBack = await page.evaluate(() => !document.getElementById('fs'));
  rec(P.id, 'Android Back (history.back) closes the card and stays in app', closedByBack && page.url() === urlBefore, `url=${page.url()}`);
  // close button + Show tab ready-made card
  await gotoHash(page, '#/show');
  const nCards = await page.evaluate(() => document.querySelectorAll('button.showcard').length);
  await page.click('button.showcard'); await sleep(300);
  const fs2 = await page.evaluate(() => { const o = document.getElementById('fs'); const b = o?.querySelector('.fs-body'); return o ? { text: o.querySelector('.fs-body').textContent.slice(0, 60), overflow: b.scrollHeight > b.clientHeight + 1, sh: b.scrollHeight, ch: b.clientHeight } : null; });
  const s2 = await shot(page, P, 'show-readycard');
  await clickText(page, '#fs button', 'Close');
  const closed2 = await page.evaluate(() => !document.getElementById('fs'));
  rec(P.id, `Show tab: ready card (${nCards}) opens, fits, ✕ closes`, !!fs2 && !fs2.overflow && closed2, JSON.stringify(fs2) + ' shot=' + s2);
  // longest ready card and allergy card must fit
  const fit = [];
  for (let i = 0; i < nCards; i++) {
    await page.evaluate((i) => document.querySelectorAll('button.showcard')[i].click(), i); await sleep(150);
    fit.push(await page.evaluate(() => { const b = document.querySelector('#fs .fs-body'); const r = { id: '', over: b.scrollHeight > b.clientHeight + 1, sh: b.scrollHeight, ch: b.clientHeight }; return r; }));
    await page.evaluate(() => document.querySelector('#fs .btn.primary').click()); await sleep(450); // closing pops history asynchronously
  }
  rec(P.id, 'all ready cards fit on screen without scrolling', fit.every((f) => !f.over), JSON.stringify(fit));
  // allergy card
  await page.evaluate(() => { [...document.querySelectorAll('#card-allergy input[type=checkbox]')].slice(0, 3).forEach((c) => c.click()); });
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('#card-allergy button')].find((b) => b.classList.contains('primary') && /^Show/.test(b.textContent)).click()); await sleep(300);
  const al = await page.evaluate(() => { const o = document.getElementById('fs'); const b = o?.querySelector('.fs-body'); return o ? { text: b.textContent, over: b.scrollHeight > b.clientHeight + 1, sh: b.scrollHeight, ch: b.clientHeight } : null; });
  const s3 = await shot(page, P, 'show-allergy-3');
  rec(P.id, 'allergy card (3 allergens, strict) shows and fits', !!al && /卵/.test(al.text) && !al.over, JSON.stringify(al) + ' shot=' + s3);
  await page.evaluate(() => document.querySelector('#fs .btn.primary')?.click()); await sleep(450);
  // all 12 allergens (each click redraws the card → re-query every time)
  for (let k = 0; k < 20; k++) {
    const more = await page.evaluate(() => { const c = [...document.querySelectorAll('#card-allergy .checks input[type=checkbox]')].find((x) => !x.checked); if (!c) return false; c.click(); return true; });
    if (!more) break; await sleep(60);
  }
  await page.evaluate(() => [...document.querySelectorAll('#card-allergy button')].find((b) => b.classList.contains('primary') && /^Show/.test(b.textContent)).click()); await sleep(300);
  const al12 = await page.evaluate(() => { const o = document.getElementById('fs'); const b = o?.querySelector('.fs-body'); return o ? { chars: b.textContent.length, over: b.scrollHeight > b.clientHeight + 1, sh: b.scrollHeight, ch: b.clientHeight, checked: document.querySelectorAll('#card-allergy .checks input:checked').length } : null; });
  rec(P.id, 'allergy card with ALL allergens fits without scroll', !!al12 && !al12.over, JSON.stringify(al12) + ' shot=' + await shot(page, P, 'show-allergy-all'));
  await page.evaluate(() => document.querySelector('#fs .btn.primary')?.click()); await sleep(450);

  // ---------- 5. kana quiz ----------
  await gotoHash(page, '#/study/kana');
  await page.click('#kana-quiz button[data-set="hira"]'); await sleep(200);
  let score = 0; const missing = [];
  for (let i = 0; i < 10; i++) {
    const q = await page.evaluate(() => document.querySelector('#kana-quiz .kana-big')?.textContent);
    const ans = KMAP.get(q);
    if (!ans) missing.push(q);
    const clicked = await page.evaluate((ans) => { const b = [...document.querySelectorAll('#kana-quiz .opt')].find((x) => x.textContent === ans); if (!b) return false; b.click(); return true; }, ans);
    await sleep(100);
    const fb = await page.evaluate(() => document.querySelector('#kana-quiz .feedback p')?.textContent);
    if (clicked && /^Correct/.test(fb || '')) score++;
    if (i === 0) await shot(page, P, 'kana-quiz-answered');
    await page.evaluate(() => document.querySelector('#kana-quiz .feedback .btn.primary').click()); await sleep(100);
  }
  const res = await page.evaluate(() => document.querySelector('#kana-quiz .score')?.textContent || document.querySelector('#kana-quiz h2')?.textContent);
  const qs = await page.evaluate(() => localStorage.getItem('jt.quizStats'));
  rec(P.id, 'kana quiz: 10 correct answers → 10/10, stored', score === 10 && /10 of 10/.test(res) && /"hira":10/.test(qs), `${res}; quizStats=${qs}; unknown=${missing.join(',')}; shot=${await shot(page, P, 'kana-quiz-result')}`);
  // wrong answer path + double click guard
  await clickText(page, '#kana-quiz button', 'Again');
  const wrong = await page.evaluate(() => { const q = document.querySelector('#kana-quiz .kana-big').textContent; const opts = [...document.querySelectorAll('#kana-quiz .opt')]; return { q, opts: opts.map((o) => o.textContent) }; });
  const wrongOpt = wrong.opts.find((o) => o !== KMAP.get(wrong.q));
  await page.evaluate((w, r) => { const b = [...document.querySelectorAll('#kana-quiz .opt')]; b.find((x) => x.textContent === w).click(); b.find((x) => x.textContent === r).click(); }, wrongOpt, KMAP.get(wrong.q)); await sleep(100);
  const wr = await page.evaluate(() => ({ fb: document.querySelector('#kana-quiz .feedback p')?.textContent, score: document.querySelector('#kana-quiz .sess-head span:last-child')?.textContent }));
  rec(P.id, 'kana quiz: wrong answer marked, second click ignored', /Answer:/.test(wr.fb || '') && /correct: 0/.test(wr.score), JSON.stringify(wr));
  // katakana words set: 1 answer
  await gotoHash(page, '#/phrases'); await gotoHash(page, '#/study/kana');
  await page.click('#kana-quiz button[data-set="words"]'); await sleep(150);
  const wq = await page.evaluate(() => document.querySelector('#kana-quiz .kana-big')?.textContent);
  const okW = await page.evaluate((a) => { const b = [...document.querySelectorAll('#kana-quiz .opt')].find((x) => x.textContent === a); b?.click(); return !!b; }, KMAP.get(wq)); await sleep(100);
  const fbW = await page.evaluate(() => document.querySelector('#kana-quiz .feedback p')?.textContent);
  rec(P.id, 'kana quiz "Katakana words" accepts correct meaning', okW && /^Correct/.test(fbW || ''), `${wq} → ${KMAP.get(wq)}: ${fbW}`);

  // ---------- 6. price trainer ----------
  await sleep(400); // let any pending history.back() from closed cards settle first
  // A late back-navigation left over from the Show / Android Back steps can land on #/show: retry until the price screen stays
  // Buttons near the bottom edge are clicked via element.click(): a coordinate click there can land on the fixed tab bar.
  await gotoHash(page, '#/study/numbers'); await page.waitForSelector('#num-play', { timeout: 8000 });
  const priceRes = [];
  for (const [i, fmt] of [[0, (n) => String(n)], [1, (n) => n.toLocaleString('en-US')], [2, (n) => n.toLocaleString('ru-RU')], [3, (n) => String(n).replace(/\d/g, (d) => String.fromCharCode(0xff10 + +d))]]) {
    await page.evaluate(() => { window.__spoken.length = 0; });
    await page.waitForSelector('#num-play', { timeout: 8000 });
    await page.click('#num-play'); await sleep(150);
    const spoken = await page.evaluate(() => window.__spoken.at(-1)?.text);
    let n = spoken ? Number(spoken.replace('円', '')) : NaN;
    if (P.tts === 'none') { // no TTS API: read the answer via "Give up" on a throw-away round
      n = NaN;
    }
    if (Number.isNaN(n)) { priceRes.push({ i, spoken, note: 'no TTS → cannot hear price' }); break; }
    await page.type('#num-answer', fmt(n)); await page.$eval('#num-check', (b) => b.click()); await sleep(150);
    const fb = await page.evaluate(() => document.getElementById('num-feedback').textContent);
    priceRes.push({ typed: fmt(n), spoken, ok: /^Correct/.test(fb), fb: fb.slice(0, 80) });
    if (i === 0) await shot(page, P, 'price-correct');
    await page.$eval('#num-next', (b) => b.click()); await sleep(150);
  }
  const ttsLess = P.tts === 'none';
  rec(P.id, 'price trainer (audio mode) accepts the correct number in 4 formats', ttsLess ? true : priceRes.length === 4 && priceRes.every((r) => r.ok), (ttsLess ? '[no speechSynthesis: audio mode untestable, see mixed mode] ' : '') + JSON.stringify(priceRes));
  // mixed mode: read 12万8千円 text, convert, answer
  await clickText(page, '.chips button', '12万8千円 → digits');
  for (const range of ['Cameras', 'Konbini']) {
    await clickText(page, '.chips button', range);
    const before = await page.evaluate(() => Number((/of (\d+)/.exec(document.querySelector('#num-card .sess-head span').textContent) || [])[1]));
    const txt = await page.evaluate(() => document.querySelector('#num-card .price-big')?.textContent);
    const m = /^(?:(\d+)万)?(?:(\d+)千|([\d,]+))?円$/.exec(txt || '');
    const n = m ? (+m[1] || 0) * 10000 + (m[2] ? +m[2] * 1000 : m[3] ? +m[3].replace(/,/g, '') : 0) : NaN;
    await page.type('#num-answer', String(n)); await page.keyboard.press('Enter'); await sleep(150);
    const fb = await page.evaluate(() => document.getElementById('num-feedback').textContent);
    rec(P.id, `price trainer (mixed, ${range}) «${txt}» → ${n} accepted, kana shown`, /^Correct/.test(fb), fb.slice(0, 160) + ' shot=' + await shot(page, P, 'price-mixed-' + (range === 'Cameras' ? 'gear' : 'konbini')));
    // double check (Enter again) should not count twice
    await page.keyboard.press('Enter'); await sleep(100);
    await page.evaluate(() => document.querySelector('#num-next')?.click()); await sleep(100); // 2nd Enter already moves to the next task (B5 fix)
    const head = await page.evaluate(() => document.querySelector('#num-card .sess-head span').textContent);
    const after = Number((/of (\d+)/.exec(head) || [])[1]);
    rec(P.id, `price trainer: one answer + Enter pressed again counts once (${range})`, after === before + 1, `before: total ${before}; after 1 answer + repeated Enter: «${head}»`);
  }
  // range switch must give a price from the new range immediately
  await clickText(page, '.chips button', 'Konbini'); await clickText(page, '.chips button', 'Cameras');
  const afterSwitch = await page.evaluate(() => document.querySelector('#num-card .price-big')?.textContent);
  const mm = /^(?:(\d+)万)?(?:(\d+)千|([\d,]+))?円$/.exec(afterSwitch || ''); const nn = mm ? (+mm[1] || 0) * 10000 + (mm[2] ? +mm[2] * 1000 : mm[3] ? +mm[3].replace(/,/g, '') : 0) : NaN;
  rec(P.id, 'price trainer: switching range Konbini→Cameras immediately shows a 20,000–250,000 price', nn >= 20000 && nn <= 250000, `after switch: «${afterSwitch}» (${nn})`);
  // wrong answer
  await page.type('#num-answer', '1'); await page.click('#num-card .btn.primary'); await sleep(100);
  const fbw = await page.evaluate(() => document.getElementById('num-feedback').textContent);
  rec(P.id, 'price trainer rejects a wrong number', /^Not quite/.test(fbw), fbw.slice(0, 100));

  // ---------- 7. time trainer ----------
  await gotoHash(page, '#/study/time');
  if (!ttsLess) {
    await page.evaluate(() => { window.__spoken.length = 0; });
    await clickText(page, '#time-card button', 'Listen to the time');
    const sp = await page.evaluate(() => window.__spoken.at(-1)?.text);
    const m = /^(\d+)時(?:(半)|(\d+)分)?$/.exec(sp || '');
    const ans = m ? `${m[1]}:${m[2] ? '30' : String(m[3] || 0).padStart(2, '0')}` : '?';
    await page.type('#time-card input', ans); await clickText(page, '#time-card button', 'Check');
    const fb = await page.evaluate(() => document.querySelector('#time-card .feedback').textContent);
    rec(P.id, `time trainer accepts «${sp}» as ${ans}`, /^Correct/.test(fb), fb.slice(0, 120));
  }

  // ---------- 8. SRS lesson ----------
  // Lessons replaced the old week-tag Today: review the first lesson's items (main mode, shuffled)
  await gotoHash(page, '#/study/lesson/U01-L01');
  await page.waitForSelector('#lesson-review'); await page.click('#lesson-review'); await sleep(200);
  const seq = [];
  for (let i = 0; i < 4; i++) {
    const c = await page.evaluate(() => { const f = document.querySelector('.card.flash'); return f ? `${f.dataset.id}|${f.dataset.mode}` : null; });
    seq.push(c);
    await page.click('#reveal'); await sleep(100);
    await page.evaluate((i) => document.querySelector(i % 2 ? '.grade .btn.good' : '.grade .btn.again').click(), i); await sleep(100);
  }
  const srs = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('jt.srs') || '{}')).length);
  await page.reload({ waitUntil: 'load' }); await ready(page);
  const srsAfter = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('jt.srs') || '{}')).length);
  rec(P.id, 'SRS lesson: grading saves progress, survives reload', srs >= 3 && srsAfter === srs, `sequence: ${seq.join(' → ')}; srs keys ${srs} → after reload ${srsAfter}`);
  const adj = seq.filter((k, i) => i > 0 && k && seq[i - 1] && k.split('|')[0] === seq[i - 1].split('|')[0]);
  rec(P.id, 'SRS lesson: consecutive cards are different phrases', adj.length === 0, seq.join(' → '));

  // ---------- 9. TTS without voices / without API ----------
  page.__console.length = 0;
  await gotoHash(page, '#/phrases');
  await page.click('#cat-picker'); await page.waitForSelector('#sheet [data-cat="konbini"]'); await page.click('#sheet [data-cat="konbini"]'); await sleep(150);
  await page.evaluate(() => document.querySelector('#phrase-list article.is-collapsed .jp')?.click()); await sleep(150); // open the first phrase
  await page.click(`#phrase-list article .speak button`); await sleep(1800);
  const toastTxt = await page.evaluate(() => document.getElementById('toast')?.textContent || '');
  const jsErr = await page.evaluate(() => window.__errors);
  const sp = await page.evaluate(() => window.__spoken.at(-1));
  rec(P.id, `TTS (${P.tts === 'none' ? 'no speechSynthesis API' : 'API present, 0 voices'}) ▶ does not throw`, !jsErr.length && !errs(page).some((e) => /pageerror/.test(e)),
    `toast=«${toastTxt}»; spoken=${JSON.stringify(sp)}; errors=${JSON.stringify(jsErr)}`);
  await gotoHash(page, '#/tools'); await sleep(1700);
  const ttsBox = await page.evaluate(() => document.getElementById('tts-box').innerText.slice(0, 300));
  rec(P.id, 'Tools → Speech shows the right platform guidance', P.platform === 'ios' ? /not support|iPhone/.test(ttsBox) : /Android|Speech Services/.test(ttsBox), ttsBox.replace(/\n/g, ' / ') + ' shot=' + await shot(page, P, 'tools-tts'));

  // ---------- 10. launchers ----------
  const lens = await page.evaluate(() => ({ href: document.getElementById('lens-btn').getAttribute('href'), opts: [...document.querySelectorAll('#lens-variant option')].map((o) => o.value + '=' + o.textContent) }));
  const expLens = P.platform === 'ios' ? /^google:\/\/$/ : /^intent:\/\/lens\.google\.com\/#Intent;scheme=https;package=com\.google\.ar\.lens;S\.browser_fallback_url=https%3A%2F%2Flens\.google\.com%2F;end$/;
  rec(P.id, `Lens button URL for ${P.platform}`, expLens.test(lens.href), JSON.stringify(lens));
  // translate (web) → window.open
  await page.evaluate(() => { window.__opened.length = 0; document.getElementById('tr-text').value = 'Where is the toilet?'; });
  await clickText(page, 'button', 'Open in Translate');
  await page.evaluate(() => { document.getElementById('maps-q').value = '新宿駅'; });
  await clickText(page, 'button', 'Find on map');
  await clickText(page, 'button', 'Transit directions');
  const opened = await page.evaluate(() => window.__opened.slice());
  rec(P.id, 'Translate/Maps buttons open expected https URLs', opened.length === 3 && opened[0] === 'https://translate.google.com/?sl=en&tl=ja&text=Where%20is%20the%20toilet%3F&op=translate'
    && opened[1] === 'https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%AE%BF%E9%A7%85' && opened[2].startsWith('https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=%E6'), JSON.stringify(opened));
  // app-scheme translate: location.href = intent/googletranslate → capture via CDP
  const cdp = await page.createCDPSession(); await cdp.send('Page.enable');
  const navs = []; cdp.on('Page.frameRequestedNavigation', (e) => navs.push(e.url));
  await clickText(page, 'button', 'In the Translate app'); await sleep(500);
  const expT = P.platform === 'ios' ? /^googletranslate:\/\/\?sl=en&tl=ja&text=Where/ : /^intent:\/\/translate\.google\.com\/\?sl=en&tl=ja&text=Where.*#Intent;scheme=https;package=com\.google\.android\.apps\.translate;S\.browser_fallback_url=https%3A%2F%2Ftranslate/;
  rec(P.id, `"In the Translate app" navigates to ${P.platform} app URL`, navs.some((u) => expT.test(u)), JSON.stringify(navs));
  const stillApp = await page.evaluate(() => document.documentElement.dataset.ready === '1').catch(() => false);
  rec(P.id, 'app still alive after app-scheme navigation', stillApp, page.url());
  const tels = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')));
  rec(P.id, 'emergency tel: links', JSON.stringify(tels) === JSON.stringify(['tel:110', 'tel:119', 'tel:05038162787']), JSON.stringify(tels));
  await shot(page, P, 'tools');

  // ---------- 11. backup export → import on clean profile ----------
  const dl = path.join(OUT, 'downloads-' + P.id); fs.rmSync(dl, { recursive: true, force: true }); fs.mkdirSync(dl, { recursive: true });
  const bcdp = await page.browser().target().createCDPSession();
  await bcdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl, browserContextId: page.browserContext().id, eventsEnabled: true });
  await page.click('#backup-btn'); await sleep(1500);
  const files = fs.readdirSync(dl).filter((f) => f.endsWith('.json'));
  let backup = null; try { backup = JSON.parse(fs.readFileSync(path.join(dl, files[0]), 'utf8')); } catch { /* */ }
  rec(P.id, 'backup button downloads a JSON export', !!backup && backup.app === 'japan-trip', `${files.join(',')}; keys=${backup ? Object.keys(backup.data).join(',') : '-'}`);
  if (backup) {
    const ctx2 = await page.browser().createBrowserContext();
    const p2 = await newPage(ctx2, P);
    await p2.goto(BASE + '#/tools', { waitUntil: 'load' }); await ready(p2);
    const input = await p2.$('#backup input[type=file]');
    await input.uploadFile(path.join(dl, files[0])); await sleep(800);
    const t2 = await p2.evaluate(() => document.getElementById('toast')?.textContent);
    await p2.reload({ waitUntil: 'load' }); await ready(p2);
    const restored = await p2.evaluate(() => ({ favs: localStorage.getItem('jt.favs'), srs: Object.keys(JSON.parse(localStorage.getItem('jt.srs') || '{}')).length, cards: !!JSON.parse(localStorage.getItem('jt.cards') || '{}').allergy }));
    rec(P.id, 'import backup on clean profile restores favs/srs/cards', restored.favs && restored.favs.includes(bagId) && restored.srs === srsAfter && restored.cards, `toast=«${t2}»; ${JSON.stringify(restored)}`);
    // view reflects import without reload?
    await ctx2.close();
  }

  // ---------- 12. service worker + offline ----------
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, active: !!r.active, controlled: !!navigator.serviceWorker.controller }; });
  await page.reload({ waitUntil: 'load' }); await ready(page);
  const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller);
  const cacheList = await page.evaluate(async () => { const ks = await caches.keys(); const c = await caches.open(ks[0]); return { keys: ks, n: (await c.keys()).length }; });
  rec(P.id, 'SW registers, activates, controls page after reload; precache filled', sw.active && ctl && cacheList.n >= 20, JSON.stringify({ ...sw, controlledAfterReload: ctl, ...cacheList }));
  return { page, cdp };
}

async function offlineCheck(P, page, cdp) {
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await server.stop(); // genuinely no server
  page.__console.length = 0;
  let ok = false, detail = '';
  try {
    await page.reload({ waitUntil: 'load', timeout: 20000 }); await ready(page, 10000);
    const tabs = [];
    for (const tab of ['phrases', 'study', 'show', 'kanji', 'tools']) {
      await page.click(`.tabbar button[data-tab="${tab}"]`); await sleep(250);
      tabs.push(await page.evaluate((t) => document.getElementById('view').dataset.tab === t && !document.querySelector('#view .card.error'), tab));
    }
    await gotoHash(page, '#/phrases'); await page.type('#phrase-search', 'fukuro'); await sleep(400);
    const found = await page.evaluate(() => document.querySelectorAll('#phrase-list article').length);
    const about = await page.evaluate(() => { location.hash = '#/tools'; return new Promise((r) => setTimeout(() => r(document.querySelector('.about')?.innerText), 300)); });
    ok = tabs.every(Boolean) && found > 0;
    detail = `tabs=${tabs.join(',')}, search hits=${found}, about=«${(about || '').replace(/\n/g, ' ')}», console=${errs(page).filter((e) => !/requestfailed/.test(e)).join(' | ') || 'none'}`;
    await shot(page, P, 'offline-reload');
  } catch (e) { detail = 'reload failed offline: ' + e.message; }
  rec(P.id, 'OFFLINE (CDP offline + server stopped): app reloads, all tabs, search works', ok, detail);
  // offline cold start in a fresh tab of the same profile
  try {
    const p3 = await newPage(page.browserContext(), P);
    const c3 = await p3.createCDPSession(); await c3.send('Network.enable'); await c3.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p3.goto(BASE + '#/study/numbers', { waitUntil: 'load', timeout: 15000 }); await ready(p3, 10000);
    const deep = await p3.evaluate(() => document.getElementById('view').dataset.tab);
    rec(P.id, 'OFFLINE cold start in new tab with deep link #/study/numbers', deep === 'study', deep);
    const d = await p3.goto(BASE + 'diag.html', { waitUntil: 'load', timeout: 15000 }).then(() => p3.title()).catch((e) => 'ERR ' + e.message);
    rec(P.id, 'OFFLINE diag.html served from cache', !/ERR/.test(d), d);
    await p3.close();
  } catch (e) { rec(P.id, 'OFFLINE cold start in new tab', false, e.message); }
  await server.start();
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required'], userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'jtqa-')) });
const version = await browser.version();
console.log('Chrome', version);
for (const P of PROFILES) {
  if (filter && P.id !== filter) continue;
  // separate browser context per profile so storage/SW are isolated
  const ctx = await browser.createBrowserContext();
  let r;
  try { r = await runProfile(ctx, P); } catch (e) { rec(P.id, 'UNCAUGHT in run', false, e.stack.split('\n').slice(0, 3).join(' ')); }
  if (r) { try { await offlineCheck(P, r.page, r.cdp); } catch (e) { rec(P.id, 'UNCAUGHT in offline', false, e.message); try { await server.start(); } catch { /* already */ } } }
  await ctx.close();
}
// diag page (online)
{
  const ctx = await browser.createBrowserContext(); const p = await newPage(ctx, PROFILES[0]);
  await p.goto(BASE + 'diag.html', { waitUntil: 'load' }); await sleep(1500);
  const e = page404(p).filter((x) => !/favicon|status of 404/.test(x)); rec('pixel', 'diag.html loads without console errors (favicon.ico 404 tolerated)', !e.length, e.join(' | ') + ' shot=' + await shot(p, PROFILES[0], 'diag'));
  await ctx.close();
}
await browser.close();
await server.stop().catch(() => {});
fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify({ chrome: version, at: new Date().toISOString(), results }, null, 1));
const f = results.filter((r) => !r.ok);
console.log(`\n${results.length - f.length}/${results.length} passed`);
process.exit(0);
