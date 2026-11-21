// E2E check in headless Chrome via the Chrome DevTools Protocol (no puppeteer).
// Run: node --experimental-websocket tools/e2e.mjs
// At 412x915 (Pixel UA) and 430x932 (iPhone UA): every tab renders, no exceptions,
// no horizontal scroll, search, SRS, quiz, cards; the SW installs; after the server is STOPPED
// the app reloads offline. Screenshots → tools/out/.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools', 'out');
const PORT = 8799, DEBUG_PORT = 9339;
const BASE = `http://localhost:${PORT}/`;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: 'pixel-412x915', width: 412, height: 915, dpr: 2.625, platform: 'android',
    ua: 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', navPlatform: 'Linux armv8l' },
  { name: 'iphone-430x932', width: 430, height: 932, dpr: 3, platform: 'ios',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', navPlatform: 'iPhone' },
];

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// ---------- CDP ----------
async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) listeners.forEach((fn) => fn(msg));
  };
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); }),
    on: (fn) => listeners.push(fn),
    close: () => ws.close(),
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const profile = join(OUT, 'profile');
  rmSync(profile, { recursive: true, force: true });

  const overrides = new Map(); // served instead of files: a newer sw.js for the update test
  const ZH_FILES = ['curriculum.json', 'pinyin.json', 'hanzi.json', 'dict-core.json', 'dict-rest.json'];
  const zhFixture = ZH_FILES.filter((f) => !existsSync(join(ROOT, 'app', 'data', 'zh', f)));
  for (const f of zhFixture) overrides.set('/data/zh/' + f, readFileSync(join(ROOT, 'tests', 'fixtures', 'zh', f)));
  if (zhFixture.length) console.log('zh data not delivered yet, serving the test fixture for: ' + zhFixture.join(', '));
  const zhRequests = [];
  let server = await startServer(PORT, { quiet: true, overrides, onRequest: (path) => { if (path.startsWith('/data/zh/')) zhRequests.push(path); } });
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* chrome still starting */ }
  }
  if (!target) throw new Error('Chrome did not start');
  const cdp = await cdpConnect(target.webSocketDebuggerUrl);
  const errors = [];
  cdp.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon|\.map\b/.test(m.params.entry.url || '')) errors.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  const evaluate = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const waitFor = async (expr, timeout = 8000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { try { if (await evaluate(expr)) return true; } catch { /* page loading */ } await sleep(100); }
    return false;
  };
  const navigate = async (url) => { await cdp.send('Page.navigate', { url }); await sleep(300); };
  const shot = async (name) => {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, name + '.png'), Buffer.from(data, 'base64'));
  };
  const click = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  const noHScroll = () => evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1');

  async function runViewport(vp) {
    console.log(`\n=== ${vp.name} ===`);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: vp.ua, platform: vp.navPlatform });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const e0 = errors.length;

    await navigate(BASE + '#/phrases');
    await waitFor("document.documentElement.dataset.ready === '1'");
    await evaluate('localStorage.clear()'); // each viewport starts from a clean state
    await cdp.send('Page.reload');
    await sleep(300);
    check(`${vp.name}: app loaded`, await waitFor("document.documentElement.dataset.ready === '1'"));
    check(`${vp.name}: platform detected as ${vp.platform}`, (await evaluate('document.documentElement.dataset.platform')) === vp.platform);
    check(`${vp.name}: phrases rendered`, await waitFor("document.querySelectorAll('.phrase').length > 5"));
    check(`${vp.name}: no horizontal scroll (phrases)`, await noHScroll());
    await shot(`${vp.name}-1-phrases`);

    for (const q of ['ふくろ', 'bag', 'fukuro']) {
      await evaluate(`(() => { const i = document.querySelector('#phrase-search'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')); })()`);
      check(`${vp.name}: search "${q}" finds "I don’t need a bag"`, await waitFor(`!!document.querySelector('[data-id="konbini.bag-none"]') && document.querySelector('#phrase-list h2').textContent.startsWith('Found')`, 3000));
    }
    check(`${vp.name}: the reply shows "Reply to: 袋はご利用ですか"`, await evaluate(`/袋はご利用ですか/.test(document.querySelector('[data-id="konbini.bag-none"] .reply-to')?.textContent || '')`));
    await shot(`${vp.name}-2-search`);
    await click('#cat-picker'); // categories live in a bottom sheet (no sideways-scrolling chip row)
    await waitFor(`!!document.querySelector('#sheet [data-cat="hear"]')`, 3000);
    await click('#sheet [data-cat="hear"]');
    check(`${vp.name}: staff phrases show "How to reply"`, await waitFor(`document.querySelectorAll('.phrase.hear .replies .reply').length >= 20`, 3000));
    await shot(`${vp.name}-2b-hear-replies`);
    // Speech without voices must not throw
    await evaluate("document.querySelector('.phrase .speak .btn')?.click()");
    await sleep(300);
    // favorites
    await evaluate(`(() => { const i = document.querySelector('#phrase-search'); i.value=''; i.dispatchEvent(new Event('input')); })()`);
    await sleep(250);
    await click('.phrase .fav');
    check(`${vp.name}: favorite is saved`, await waitFor("JSON.parse(localStorage.getItem('jt.favs') || '[]').length > 0"));

    // Study
    await navigate(BASE + '#/study/today');
    check(`${vp.name}: Today tiles`, await waitFor("document.querySelectorAll('.tile').length === 4"));
    await shot(`${vp.name}-3-study-today`);
    // Morning session on a fresh profile: no reviews → pretest of U01-L01 (audio first, no text before the answer)
    await click('#start-morning');
    check(`${vp.name}: morning starts with a pretest card (audio, no Japanese text before the answer)`,
      await waitFor("!!document.querySelector('.flash[data-mode=\"audio\"]') && !document.querySelector('.flash .jp')"));
    // Every retrieval card: "I know it" and "Show answer" side by side, large targets
    check(`${vp.name}: pretest card has I know it + Show answer side by side (one row, >= 48 px)`, await evaluate(`(() => {
      const k = document.querySelector('#know-it'), r = document.querySelector('#reveal');
      if (!k || !r) return false;
      const a = k.getBoundingClientRect(), b = r.getBoundingClientRect();
      return Math.abs(a.top - b.top) < 2 && a.height >= 48 && b.height >= 48 && a.right <= b.left + 1;
    })()`));
    await click('#know-it');
    check(`${vp.name}: I know it shows the answer briefly with Forgot / Hard / Knew`, await waitFor("!!document.querySelector('.flash .back .jp') && document.querySelectorAll('.grade .btn').length === 3 && !!document.querySelector('.grade .good.preselected')"));
    await shot(`${vp.name}-4-study-card`);
    check(`${vp.name}: I know it counts as Knew: next card, item in box 3 (the lesson skips it)`, await waitFor("document.querySelector('.sess-head').textContent.includes(' 2/5') && Object.values(JSON.parse(localStorage.getItem('jt.srs') || '{}')).some((v) => v.box === 3)", 5000));
    await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))");
    check(`${vp.name}: key 1 = Show answer; pretest gets the same three grades`, await waitFor("!!document.querySelector('.flash .back .jp') && document.querySelectorAll('.grade .btn').length === 3 && /Knew/.test(document.querySelector('.grade .good').textContent)"));
    await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))");
    check(`${vp.name}: key 2 = Hard (next card; not marked known)`, await waitFor("document.querySelector('.sess-head').textContent.includes(' 3/5') && !!document.querySelector('#know-it') && Object.keys(JSON.parse(localStorage.getItem('jt.srs') || '{}')).length === 1"));
    check(`${vp.name}: lesson U01-L01 marked as started today`, await waitFor("!!(JSON.parse(localStorage.getItem('jt.lessons') || '{}').started || {})['U01-L01']"));
    check(`${vp.name}: no horizontal scroll (study)`, await noHScroll());

    // Lessons: units → 79 lessons, the second core lesson locked on a fresh profile
    await navigate(BASE + '#/study/lessons');
    check(`${vp.name}: lessons list (80 rows, U01-L02 locked, U08 open)`, await waitFor(
      "document.querySelectorAll('.lesson-row').length === 80 && document.querySelector('[data-lesson=\"U01-L02\"]').classList.contains('locked') && !document.querySelector('[data-lesson=\"U08-L05\"]').classList.contains('locked')"));
    check(`${vp.name}: no horizontal scroll (lessons)`, await noHScroll());
    await shot(`${vp.name}-4b-lessons`);
    await click('[data-lesson="U01-L01"]');
    check(`${vp.name}: lesson page with Learn / Review / Quiz / Test out`, await waitFor("!!document.querySelector('#lesson-learn') && !!document.querySelector('#lesson-quiz') && !!document.querySelector('#lesson-testout') && document.querySelectorAll('.lesson-card ~ .list .phrase').length >= 10"));
    await shot(`${vp.name}-4c-lesson`);
    await click('#lesson-learn');
    check(`${vp.name}: learning starts EN → JA with three self-grades after the answer`, await waitFor("!!document.querySelector('.flash[data-mode=\"en2ja\"] .en.big')"));
    await click('#reveal');
    check(`${vp.name}: Forgot / Hard / Knew`, await waitFor("document.querySelectorAll('.grade .btn').length === 3 && /Knew/.test(document.querySelector('.grade .good').textContent)"));
    await click('.grade .good');
    await evaluate("window.__app.go('#/study/lesson/U01-L01')"); // same hash: re-render like the app's own End button
    await waitFor("!!document.querySelector('#lesson-quiz')");
    await click('#lesson-quiz');
    check(`${vp.name}: lesson quiz question`, await waitFor("!!document.querySelector('#lesson-quiz-card')"));
    await shot(`${vp.name}-4d-quiz`);
    await evaluate("window.__app.go('#/study/lesson/U01-L01')");
    await waitFor("!!document.querySelector('#lesson-testout')");
    await click('#lesson-testout');
    check(`${vp.name}: test-out card`, await waitFor("!!document.querySelector('#testout-card') && /Test out · 1\\/10/.test(document.querySelector('.sess-head').textContent)"));
    // Reply chain from a lesson with staff lines
    await navigate(BASE + '#/study/lesson/U01-L05');
    check(`${vp.name}: U01-L05 has a reply chain`, await waitFor("!!document.querySelector('#lesson-chain')"));
    await click('#lesson-chain');
    check(`${vp.name}: chain card: staff line, 3 s timer, reply options in Japanese`, await waitFor("!!document.querySelector('#chain-card .countdown') && document.querySelectorAll('#chain-card .opt').length >= 2"));
    await evaluate("document.querySelector('#chain-card .opt').click()");
    check(`${vp.name}: chain gives feedback and a Next button`, await waitFor("!!document.querySelector('#chain-next')"));
    await shot(`${vp.name}-4e-chain`);
    check(`${vp.name}: no horizontal scroll (chain)`, await noHScroll());
    // Scene sheet and the pre-flight run from Today
    await navigate(BASE + '#/study/today');
    await waitFor("!!document.querySelector('#pick-scene')");
    await click('#pick-scene');
    check(`${vp.name}: scene sheet`, await waitFor("document.querySelectorAll('#sheet [data-scene]').length >= 5"));
    await click('#sheet [data-scene="konbini"]');
    check(`${vp.name}: konbini scene chain starts`, await waitFor("!!document.querySelector('#chain-card')"));
    await evaluate("window.__app.go('#/study/today')");
    await waitFor("!!document.querySelector('#start-preflight')");
    await click('#start-preflight');
    check(`${vp.name}: pre-flight run (audio, all core)`, await waitFor("!!document.querySelector('.flash[data-mode=\"audio\"]') && /Pre-flight · 1\\/2\\d\\d/.test(document.querySelector('.sess-head').textContent)"));

    await navigate(BASE + '#/study/kana');
    check(`${vp.name}: kana table`, await waitFor("document.querySelectorAll('.kana').length >= 46 + 25"));
    await click('[data-set="hira"]');
    check(`${vp.name}: kana quiz — 4 options`, await waitFor("document.querySelectorAll('.opt').length === 4"));
    await click('.opt');
    check(`${vp.name}: quiz feedback`, await waitFor("!!document.querySelector('.opt.right')"));
    await shot(`${vp.name}-5-kana`);

    await navigate(BASE + '#/study/numbers');
    check(`${vp.name}: price trainer`, await waitFor("!!document.querySelector('#num-play')"));
    const n = await evaluate("(() => { const st = document.querySelector('#num-card'); return st ? 1 : 0; })()");
    // the correct answer lives in module state — type any number and check that feedback appears
    await evaluate("(() => { const i = document.querySelector('#num-answer'); i.value = '12800'; document.querySelector('#num-check').click(); })()");
    check(`${vp.name}: price check shows the kana reading`, n === 1 && await waitFor("/えん/.test(document.querySelector('#num-feedback').textContent)"));
    await shot(`${vp.name}-6-numbers`);
    // B5: a second Enter does not count the answer again (it moves to the next task)
    await navigate(BASE + '#/study/time');
    await waitFor("!!document.querySelector('#time-card input')");
    // the "of N" counter before and after two Enters must grow by exactly 1
    const twoEnters = (card, input, value) => evaluate(`(() => {
      const total = () => Number((document.querySelector('${card} .sess-head').textContent.match(/of (\\d+)/) || [])[1]);
      const before = total();
      const i = document.querySelector('${input}'); i.value = '${value}';
      const enter = () => document.querySelector('${input}').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      enter(); enter();
      return [before, total()]; })()`);
    const tc = await twoEnters('#time-card', '#time-card input', '9:30');
    await navigate(BASE + '#/study/numbers');
    await waitFor("!!document.querySelector('#num-answer')");
    const nc = await twoEnters('#num-card', '#num-answer', '100');
    check(`${vp.name}: B5 double Enter = one answer`, tc[1] === tc[0] + 1 && nc[1] === nc[0] + 1, JSON.stringify({ time: tc, numbers: nc }));

    await navigate(BASE + '#/study/time');
    check(`${vp.name}: time & counting`, await waitFor("document.querySelectorAll('.cnt').length > 30"));
    check(`${vp.name}: no horizontal scroll (time)`, await noHScroll());

    // Show
    await navigate(BASE + '#/show');
    check(`${vp.name}: allergy card says NOT FILLED IN`, await waitFor("/NOT FILLED IN/.test(document.querySelector('#card-allergy').textContent)"));
    await evaluate("document.querySelector('#card-allergy .checks input').click()");
    check(`${vp.name}: allergy → Japanese text`, await waitFor("/アレルギーがあります/.test(document.querySelector('#card-allergy .preview')?.textContent || '')"));
    await shot(`${vp.name}-7-show`);
    await evaluate("[...document.querySelectorAll('#card-allergy .btn.primary')].pop().click()");
    check(`${vp.name}: full-screen card`, await waitFor("!!document.querySelector('#fs .fs-line')"));
    await shot(`${vp.name}-8-fullscreen`);
    await click('#fs .btn.primary');
    check(`${vp.name}: card closes`, await waitFor("!document.querySelector('#fs')"));
    // B3/B16: all 12 allergens — text shrinks and fits above the button bar; Esc closes even after other keys (B15)
    await evaluate("document.querySelectorAll('#card-allergy .checks input').forEach((c) => { if (!c.checked) c.click(); })");
    await waitFor("document.querySelectorAll('#card-allergy .checks input:checked').length === 12");
    await evaluate("[...document.querySelectorAll('#card-allergy .btn.primary')].pop().click()");
    await waitFor("!!document.querySelector('#fs .fs-line')");
    const fit = await evaluate(`(() => { const ov = document.querySelector('#fs'); const lines = [...ov.querySelectorAll('.fs-line')];
      const bottom = Math.max(...lines.map((l) => l.getBoundingClientRect().bottom), ov.querySelector('.fs-caption')?.getBoundingClientRect().bottom || 0);
      return { bottom: Math.round(bottom), barTop: Math.round(ov.querySelector('.fs-bar').getBoundingClientRect().top), n: ov.dataset.fsN,
        last: lines[lines.length - 1].textContent }; })()`);
    check(`${vp.name}: B3 12-item allergy card fits`, fit.bottom <= fit.barTop + 1 && /確認していただけますか/.test(fit.last), JSON.stringify(fit));
    await shot(`${vp.name}-8b-allergy-12`);
    for (const key of ['a', 'Shift']) await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    check(`${vp.name}: B15 Esc closes the card after other keys`, await waitFor("!document.querySelector('#fs')", 2000));
    await evaluate("document.querySelectorAll('#card-allergy .checks input').forEach((c) => { if (c.checked) c.click(); })");
    check(`${vp.name}: no invented personal data (hotel empty)`, await evaluate("/NOT FILLED IN/.test(document.querySelector('#card-hotel').textContent)"));

    // Kanji
    await navigate(BASE + '#/kanji');
    check(`${vp.name}: kanji cheat sheet`, await waitFor("document.querySelectorAll('.kcell').length >= 60"));
    check(`${vp.name}: no horizontal scroll (kanji)`, await noHScroll());
    // Long groups stay usable: pick Food (98 entries) in the sheet and search inside it
    await click('#kanji-picker');
    await waitFor("!!document.querySelector('#sheet [data-group=\"food\"]')");
    await click('#sheet [data-group="food"]');
    check(`${vp.name}: kanji Food group has 90+ entries and a scoped search box`, await waitFor("document.querySelectorAll('.kcell').length >= 90 && /Search in/.test(document.querySelector('#view input.search').placeholder)"));
    await evaluate("(() => { const i = document.querySelector('#view input.search'); i.value = 'ramen'; i.dispatchEvent(new Event('input')); })()");
    check(`${vp.name}: search inside Food finds ramen, all results from Food, Search all groups offered`, await waitFor(
      "document.querySelectorAll('.kcell').length >= 1 && [...document.querySelectorAll('.kcell')].every((c) => window.__app.data.kanji.items.find((k) => k.id === c.dataset.id).group === 'food') && !!document.querySelector('#kanji-search-all')", 3000));
    await click('#kanji-search-all');
    check(`${vp.name}: Search all groups widens the search`, await waitFor("/^Found: \\d+$/.test(document.querySelector('.found-line h2').textContent)"));
    await shot(`${vp.name}-9-kanji`);
    check(`${vp.name}: Words tab (no 6th tab) with Signs / Dictionary segments`, await evaluate(
      "document.querySelectorAll('.tabbar button').length === 5 && /Words/.test(document.querySelector('.tabbar [data-tab=\"kanji\"], .tabbar button:nth-child(4)').textContent) && document.querySelectorAll('.subnav.seg [data-sub]').length === 2"));

    // Dictionary: four ways to type "coffee" all find コーヒー first
    await click('.subnav.seg [data-sub="dict"]');
    check(`${vp.name}: dictionary pane with search box and status line`, await waitFor("!!document.querySelector('#dict-search') && !!document.querySelector('#dict-status')"));
    check(`${vp.name}: dictionary fully loaded (22,667 words ready)`, await waitFor("document.querySelector('#dict-status').textContent === 'Dictionary: 22,667 words ready'", 20000),
      await evaluate("document.querySelector('#dict-status')?.textContent"));
    for (const q of ['coffee', 'kohii', 'コーヒー', '珈琲']) {
      await evaluate(`(() => { const i = document.querySelector('#dict-search'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')); })()`);
      check(`${vp.name}: dictionary "${q}" → コーヒー first`, await waitFor(
        `(() => { const r = document.querySelector('#dict-results .dict-entry'); return !!r && r.querySelector('.ja').textContent === 'コーヒー' && document.querySelector('#dict-search').value === ${JSON.stringify(q)}; })()`, 3000));
    }
    check(`${vp.name}: dictionary row: ja, romaji kōhī, gloss, part of speech, play / show / favorite`, await evaluate(
      "(() => { const r = document.querySelector('#dict-results .dict-entry'); return /kōhī/.test(r.querySelector('.romaji').textContent) && /coffee/.test(r.querySelector('.en').textContent) && /noun/.test(r.querySelector('.dict-meta').textContent) && r.querySelectorAll('.actions button').length === 3; })()"));
    await shot(`${vp.name}-9b-dictionary`);
    check(`${vp.name}: no horizontal scroll (dictionary)`, await noHScroll());
    await evaluate("document.querySelector('#dict-results .dict-entry .fav').click()");
    check(`${vp.name}: ★ saves the word to favorites`, await waitFor("JSON.parse(localStorage.getItem('jt.dictFavs') || '[]').some((x) => x.ja === 'コーヒー')"));
    await evaluate("document.querySelector('#dict-results .dict-entry .actions button[aria-label=\"Show full screen\"]').click()");
    check(`${vp.name}: show full screen opens the word`, await waitFor("!!document.querySelector('#fs') && /コーヒー/.test(document.querySelector('#fs').textContent)"));
    await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
    await waitFor("!document.querySelector('#fs')", 2000);
    // Phrases search shows dictionary matches under the phrases; favorites list the starred word
    await navigate(BASE + '#/phrases');
    await waitFor("!!document.querySelector('#phrase-search')");
    await evaluate("(() => { const i = document.querySelector('#phrase-search'); i.value = 'coffee'; i.dispatchEvent(new Event('input')); })()");
    check(`${vp.name}: Phrases search: Dictionary matches below the phrases`, await waitFor(
      "!!document.querySelector('#dict-matches') && document.querySelector('#dict-matches .dict-entry .ja').textContent === 'コーヒー' && !!document.querySelector('#dict-more')", 3000));
    await evaluate("(() => { const i = document.querySelector('#phrase-search'); i.value = ''; i.dispatchEvent(new Event('input')); })()");
    await waitFor("!document.querySelector('#dict-matches')", 2000);
    await click('.fav-filter');
    check(`${vp.name}: Favorites lists starred dictionary words`, await waitFor("!!document.querySelector('#dict-favs .dict-entry')"));
    await click('.fav-filter');
    // Credits (licence screen) from Tools and from the dictionary
    await navigate(BASE + '#/tools');
    await waitFor("!!document.querySelector('#open-credits')");
    await click('#open-credits');
    check(`${vp.name}: Credits: JMdict / EDRDG attribution with links, CC BY-SA 4.0, OFL fonts, WanaKana MIT`, await waitFor(
      "(() => { const t = document.querySelector('#view').textContent; const hrefs = [...document.querySelectorAll('#view a')].map((a) => a.href); return /property of the Electronic Dictionary Research and Development Group/.test(t) && /dictDate 2026-11-16/.test(t) && hrefs.includes('https://www.edrdg.org/edrdg/licence.html') && hrefs.includes('https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project') && hrefs.includes('https://creativecommons.org/licenses/by-sa/4.0/') && /SIL Open Font License/.test(t) && /Shippori Mincho/.test(t) && /Lora/.test(t) && /WanaKana/.test(t) && /MIT License/.test(t); })()"));
    check(`${vp.name}: no horizontal scroll (credits)`, await noHScroll());
    await shot(`${vp.name}-10b-credits`);

    // Tools
    await navigate(BASE + '#/tools');
    check(`${vp.name}: tools`, await waitFor("!!document.querySelector('#lens-btn')"));
    const lensHref = await evaluate("document.querySelector('#lens-btn').getAttribute('href')");
    check(`${vp.name}: Lens link for the platform`, vp.platform === 'ios' ? lensHref.startsWith('google://') : lensHref.startsWith('intent://'), lensHref.slice(0, 60));
    check(`${vp.name}: no horizontal scroll (tools)`, await noHScroll());
    await shot(`${vp.name}-10-tools`);

    // Backup: copy / share / paste first, the file only as a small link; storage status; help line; daily snapshots
    check(`${vp.name}: backup UI: Copy / Paste buttons, file download only a small link, help line, storage status`, await waitFor(`(() => {
      const b = document.querySelector('#backup'); if (!b) return false;
      return !!b.querySelector('#copy-backup.btn') && !!b.querySelector('#paste-backup.btn') && b.querySelector('#backup-btn')?.classList.contains('textlink')
        && /reinstalling the app icon on Android keeps it/.test(b.textContent) && /^Storage: (protected|may be cleared by the browser)/.test(b.querySelector('#storage-status').textContent);
    })()`, 4000), await evaluate("document.querySelector('#storage-status')?.textContent"));
    await evaluate(`(() => {
      window.__copied = null; window.__shared = null;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__shared = d; } });
      window.confirm = () => true;
      window.__app.store.set('favs', ['e2e-a', 'e2e-b']);
      window.__app.rerender();
    })()`);
    await waitFor("!!document.querySelector('#share-backup')");
    await evaluate("document.querySelector('#copy-backup').click()");
    check(`${vp.name}: Copy backup puts the whole backup text on the clipboard`, await waitFor(
      "!!window.__copied && JSON.parse(window.__copied).app === 'japan-trip' && JSON.parse(window.__copied).data.favs.includes('e2e-a') && /Backup copied/.test(document.querySelector('#toast')?.textContent)"));
    await evaluate("document.querySelector('#share-backup').click()");
    check(`${vp.name}: Share… sends the backup text (Telegram, Notes)`, await waitFor("!!window.__shared && (() => { const a = JSON.parse(window.__shared.text), b = JSON.parse(window.__copied); return a.app === 'japan-trip' && JSON.stringify(a.data.favs) === JSON.stringify(b.data.favs) && JSON.stringify(a.data.srs) === JSON.stringify(b.data.srs); })()"));
    await evaluate("window.__app.store.set('favs', [])");
    await evaluate("document.querySelector('#paste-backup').click()");
    check(`${vp.name}: Paste backup opens a text box`, await waitFor("!document.querySelector('#paste-panel').hidden"));
    await evaluate("(() => { document.querySelector('#backup-text').value = window.__copied; document.querySelector('#restore-text').click(); })()");
    check(`${vp.name}: restoring from pasted text brings the data back`, await waitFor(
      "(window.__app.store.get('favs', []) || []).includes('e2e-b') && /^Restored: /.test(document.querySelector('#toast')?.textContent)"));
    await evaluate("(() => { document.querySelector('#paste-backup').click(); document.querySelector('#backup-text').value = 'hello'; document.querySelector('#paste-backup').click(); document.querySelector('#restore-text').click(); })()");
    check(`${vp.name}: pasting something else is refused with a message`, await waitFor("/not a Japan Trip backup/.test(document.querySelector('#toast')?.textContent)"));
    // daily snapshot → change → "Restore yesterday's state"
    await evaluate(`import('./modules/snapshots.js').then(async (S) => {
      const kv = S.idbKV();
      for (const s of await S.listSnapshots(kv)) await kv.del(s.day);
      const d = new Date(); const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      await S.takeDailySnapshot(window.__app.store, kv, today);
      window.__app.store.set('favs', ['changed-after-snapshot']);
      window.__app.rerender();
    })`);
    check(`${vp.name}: one-tap "Restore yesterday's state" after a daily snapshot`, await waitFor("/Restore yesterday’s state/.test(document.querySelector('#restore-snapshot')?.textContent || '')", 4000));
    await evaluate("document.querySelector('#restore-snapshot').click()");
    check(`${vp.name}: snapshot restore puts the earlier progress back`, await waitFor(
      "JSON.stringify(window.__app.store.get('favs', [])) === JSON.stringify(['e2e-a', 'e2e-b'])"), await evaluate("JSON.stringify(window.__app.store.get('favs', []))"));
    check(`${vp.name}: no horizontal scroll (backup)`, await noHScroll());
    await evaluate("document.querySelector('#backup').scrollIntoView()");
    await shot(`${vp.name}-10c-backup`);
    await evaluate("window.__app.store.set('favs', [])");

    // My phrases: romaji → kana (wanakana), saving, search
    await evaluate(`(() => {
      const box = document.querySelector('#user-phrases');
      const [ru, ja, kana] = box.querySelectorAll('input');
      ru.value = 'Test phrase umbrella'; ja.value = '傘はありますか'; kana.value = 'kasa wa arimasu ka';
      kana.dispatchEvent(new Event('input'));
      document.querySelector('#add-phrase').click();
    })()`);
    const ui = await evaluate("JSON.parse(localStorage.getItem('jt.userItems') || '[]')[0] || {}");
    check(`${vp.name}: user phrase: romaji → kana, particle wa → は`, ui.kana === 'かさはありますか' && ui.romaji === 'kasa wa arimasu ka', JSON.stringify(ui));
    await navigate(BASE + '#/phrases');
    await evaluate(`(() => { const i = document.querySelector('#phrase-search'); i.value = 'umbrella'; i.dispatchEvent(new Event('input')); })()`);
    check(`${vp.name}: user phrase is found by search`, await waitFor("[...document.querySelectorAll('.phrase')].some((p) => p.dataset.id.startsWith('u.'))", 3000));

    // diag
    await navigate(BASE + 'diag.html');
    check(`${vp.name}: diag.html — Pixel/iPhone table`, await waitFor("document.querySelectorAll('#checks tbody tr').length >= 10 && document.querySelectorAll('#checks .yn').length > 0"));
    await shot(`${vp.name}-11-diag`);

    // ---------- Themes: toggle, screenshots of every tab in light and dark, tab bar covers nothing ----------
    await navigate(BASE + '#/phrases');
    await waitFor("document.documentElement.dataset.ready === '1'");
    await evaluate("localStorage.removeItem('theme'); document.documentElement.removeAttribute('data-theme')");
    await click('header.top .theme-toggle');
    const t1 = await evaluate("[document.documentElement.dataset.theme, localStorage.getItem('theme')]");
    await click('header.top .theme-toggle');
    const t2 = await evaluate("[document.documentElement.dataset.theme, localStorage.getItem('theme')]");
    check(`${vp.name}: theme toggle switches and remembers the theme`, t1[0] && t1[0] === t1[1] && t2[0] === t2[1] && t1[0] !== t2[0], JSON.stringify([t1, t2]));
    const metas = await evaluate("[document.documentElement.dataset.theme, ...[...document.querySelectorAll('meta[name=theme-color]')].map((m) => m.content)]");
    check(`${vp.name}: the toggle also recolours the system status bar (meta theme-color)`, metas.length === 3 && metas.slice(1).every((c) => c === (metas[0] === 'dark' ? '#171613' : '#f5f1e7')), JSON.stringify(metas));
    const mf = await evaluate("fetch('manifest.webmanifest').then((r) => r.json()).then((m) => [m.background_color, m.theme_color])");
    check(`${vp.name}: manifest bar colours are dark (Android navigation bar under the dark app)`, mf[0] === '#171613' && mf[1] === '#171613', JSON.stringify(mf));

    const TABS = [['phrases', '#/phrases'], ['hear', '#/phrases/hear'], ['study', '#/study/today'], ['lessons', '#/study/lessons'], ['lesson', '#/study/lesson/U01-L01'], ['morning', 'click:#/study/today|#start-morning'], ['quiz', 'click:#/study/lesson/U01-L01|#lesson-quiz'], ['chain', 'click:#/study/lesson/U01-L05|#lesson-chain'], ['session', null], ['kana', '#/study/kana'],
      ['numbers', '#/study/numbers'], ['time', '#/study/time'], ['show', '#/show'], ['kanji', '#/kanji'], ['tools', '#/tools']];
    for (const theme of ['light', 'dark']) {
      await evaluate(`localStorage.setItem('theme', '${theme}'); document.documentElement.dataset.theme = '${theme}'`);
      for (const [name, hash] of TABS) {
        if (hash && hash.startsWith('click:')) {
          const [route, sel] = hash.slice(6).split('|');
          await evaluate(`window.__app.go('${route}')`); await waitFor(`!!document.querySelector('${sel}')`); await click(sel); await sleep(300);
        } else if (hash) await navigate(BASE + hash);
        else { await navigate(BASE + '#/study/lesson/U01-L01'); await waitFor("!!document.querySelector('#lesson-review')"); await click('#lesson-review'); await click('#reveal'); }
        await waitFor("document.documentElement.dataset.ready === '1' && document.querySelector('#view').children.length > 1");
        if (name === 'phrases') await click('.phrase.is-collapsed .jp'); // open one phrase
        await sleep(150);
        const st = await evaluate(`(() => {
          const de = document.documentElement, cs = getComputedStyle(document.body);
          const tb = document.querySelector('.tabbar').getBoundingClientRect();
          // the bottom of the content (document coordinates) must stay above the tab bar when scrolled to the end
          const view = document.querySelector('#view');
          const last = [...view.querySelectorAll('*')].filter((e) => e.offsetParent && e.getBoundingClientRect().height > 0 && !(e.closest('details:not([open])') && !e.closest('summary')))
            .reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom + scrollY), 0);
          const docH = document.scrollingElement.scrollHeight;
          const lastBottom = last;
          const tbTop = docH - tb.height;
          const ctrls = [...view.querySelectorAll('button, a.btn, input:not([type=checkbox]):not([type=radio]):not([type=file]), select')].filter((e) => e.offsetParent);
          const tiny = ctrls.filter((e) => e.getBoundingClientRect().height < 30 && !e.closest('.reply-to, .linklike, details summary') && !e.classList.contains('linklike'));
          const serif = ctrls.filter((e) => /Times New Roman/i.test(getComputedStyle(e).fontFamily));
          return { theme: de.dataset.theme, bg: cs.backgroundColor, tbH: Math.round(tb.height), lastBottom: Math.round(lastBottom), tbTop: Math.round(tbTop),
            tiny: tiny.map((e) => e.className + ':' + Math.round(e.getBoundingClientRect().height)).slice(0, 5), serif: serif.length, hscroll: de.scrollWidth > innerWidth + 1 };
        })()`);
        const expectBg = theme === 'light' ? 'rgb(245, 241, 231)' : 'rgb(23, 22, 19)';
        const ok = st.theme === theme && st.bg === expectBg && st.lastBottom <= st.tbTop + 1 && !st.tiny.length && !st.serif && !st.hscroll;
        check(`${vp.name} ${theme} ${name}: theme, background, tab bar not overlapping, controls styled`, ok, ok ? '' : JSON.stringify(st));
        await shot(`theme-${vp.name}-${theme}-${name}`);
      }
      // full-screen card in each theme (always white)
      await navigate(BASE + '#/show');
      await waitFor("!!document.querySelector('.showcard')");
      await click('.showcard');
      const fsBg = await evaluate("getComputedStyle(document.querySelector('#fs')).backgroundColor");
      check(`${vp.name} ${theme}: show card is white in any theme`, fsBg === 'rgb(255, 255, 255)', fsBg);
      await shot(`theme-${vp.name}-${theme}-fullscreen`);
      await click('#fs .fs-bar .btn.primary');
      // Kana quiz, every set, all 10 questions: the cue text stays inside its box, the box stays above the options;
      // single kana in the practice square, yoon and words on one line (font >= 32 px)
      for (const set of ['hira', 'kata', 'dakuyoon', 'words']) {
        await evaluate("window.__app.go('#/study/kana')"); // same hash: re-render
        await waitFor(`!!document.querySelector('[data-set="${set}"]')`);
        await click(`[data-set="${set}"]`);
        await waitFor("!!document.querySelector('.kana-big')");
        const res = await evaluate(`(async () => {
          const bad = []; let words = 0, maxLines = 1;
          for (let i = 0; i < 10; i++) {
            const b = document.querySelector('.kana-big'), o = document.querySelector('.opts');
            if (!b || !o) { bad.push('no cue at ' + i); break; }
            const text = b.textContent, n = [...text].length, r = b.getBoundingClientRect();
            const rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect();
            const fs = parseFloat(getComputedStyle(b).fontSize);
            const lines = Math.round(t.height / (fs * 1.15)) || 1;
            if (n > 1) { words++; maxLines = Math.max(maxLines, lines); }
            if (t.left < r.left - 1 || t.right > r.right + 1 || t.top < r.top - 1 || t.bottom > r.bottom + 1) bad.push(text + ': text outside the box');
            if (r.bottom > o.getBoundingClientRect().top - 4) bad.push(text + ': box overlaps the options');
            if (b.classList.contains('is-word') !== (n > 1)) bad.push(text + ': grid only for single kana');
            if (n > 1 && fs < 32) bad.push(text + ': font ' + fs);
            if (n > 1 && lines > 1) bad.push(text + ': wraps (' + lines + ' lines at ' + fs + ' px)');
            if (document.documentElement.scrollWidth > innerWidth) bad.push(text + ': horizontal scroll');
            o.querySelector('.opt').click();
            await new Promise((ok) => setTimeout(ok, 30));
            document.querySelector('#quiz-next')?.click();
            await new Promise((ok) => setTimeout(ok, 30));
          }
          return { bad, words };
        })()`);
        check(`${vp.name} ${theme}: kana quiz ${set}: cue inside its box, above the options, words on one line`, res && !res.bad.length, JSON.stringify(res));
      }
      await evaluate("window.__app.go('#/study/kana')");
      await waitFor('!!document.querySelector(\'[data-set="words"]\')');
      await click('[data-set="words"]');
      await waitFor("!!document.querySelector('.kana-big.is-word')");
      // the quiz picks 10 random words: also check the longest one (8 kana) deterministically
      const longest = await evaluate(`(() => {
        const w = window.__app.data.kana.words.map((x) => x.k).sort((a, b) => [...b].length - [...a].length)[0];
        const b = document.querySelector('.kana-big.is-word'), q = b.parentElement;
        b.textContent = w; q.style.setProperty('--n', String([...w].length));
        const r = b.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect();
        const fs = parseFloat(getComputedStyle(b).fontSize);
        return { w, fs, inside: t.left >= r.left - 1 && t.right <= r.right + 1 && t.bottom <= r.bottom + 1, oneLine: t.height < fs * 1.6,
          above: r.bottom <= document.querySelector('.opts').getBoundingClientRect().top - 4 };
      })()`);
      check(`${vp.name} ${theme}: longest kana word fits on one line, >= 32 px, above the options`, longest.inside && longest.oneLine && longest.above && longest.fs >= 32, JSON.stringify(longest));
      await shot(`theme-${vp.name}-${theme}-kana-words`);
    }
    await evaluate("localStorage.removeItem('theme')");

    const newErr = errors.slice(e0);
    check(`${vp.name}: no exceptions or console.error`, newErr.length === 0, newErr.join(' | '));
  }


  // ---------- Chinese course: lazy download, own progress, generic views ----------
  let zhRuns = 0;
  async function runChinese(vp) {
    const firstRun = zhRuns++ === 0;
    console.log(`\n=== Chinese course (${vp.name}) ===`);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: vp.ua, platform: vp.navPlatform });
    const e0 = errors.length;
    await navigate(BASE + '#/phrases');
    await waitFor("document.documentElement.dataset.ready === '1'");
    if (firstRun) check('zh: no request for Chinese data before the switch (all Japanese runs so far)', zhRequests.length === 0, zhRequests.join(', '));
    const requestsBefore = zhRequests.length;
    await evaluate(`(() => {
      const s = window.__app.rootStore;
      s.set('favs', ['basics.hai', 'konbini.bag-none']);
      s.set('srs', { 'basics.hai|en2ja': { box: 3, due: '2026-12-01', seen: 2, lapses: 0 } });
      s.set('lessons', { started: { 'U01-L01': '2026-11-20' }, passed: {}, quiz: {}, badges: {} });
    })()`);
    const jaSnapshot = `JSON.stringify(Object.keys(localStorage).filter((k) => k.startsWith('jt.') && !k.startsWith('jt.zh.') && k !== 'jt.lang').sort().map((k) => {
      let v = localStorage.getItem(k);
      if (k === 'jt.settings') { const o = JSON.parse(v); delete o.lastBackup; v = JSON.stringify(o); }
      return [k, v];
    }))`;
    const jaBefore = await evaluate(jaSnapshot);
    check('zh: language switch in the header next to the theme toggle (日本語 / 中文 or JA / ZH)', await evaluate(`(() => {
      const sw = document.querySelector('header.top .lang-switch'), t = document.querySelector('header.top .theme-toggle');
      if (!sw || !t) return false;
      const a = sw.getBoundingClientRect(), b = t.getBoundingClientRect();
      return sw.nextElementSibling === t && a.right <= b.left + 1 && Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 4 && sw.querySelectorAll('button').length === 2
        && sw.querySelector('[data-lang="ja"]').getAttribute('aria-pressed') === 'true' && a.height >= 30;
    })()`));
    await shot(`zh-${vp.name}-0-switch-ja`);
    const titleOneLine = "(() => { const h = document.querySelector('header.top h1'); const r = document.createRange(); r.selectNodeContents(h); return r.getClientRects().length === 1 && h.getBoundingClientRect().height < parseFloat(getComputedStyle(h).fontSize) * 1.6; })()";
    check('ja: the Phrases title stays on one line next to Furigana, the switch and the theme toggle', await evaluate(titleOneLine));
    await click('.lang-switch [data-lang="zh"]');
    check('zh: switching downloads the course and shows Chinese phrases', await waitFor(
      "document.documentElement.lang === 'zh-CN' && document.documentElement.dataset.lang === 'zh' && document.querySelectorAll('.phrase[data-id^=\"zh.\"]').length > 3", 15000));
    if (firstRun) check('zh: the switch requests only data/zh/ files', zhRequests.length >= 3 && zhRequests.every((p) => /^\/data\/zh\/[a-z-]+\.json$/.test(p)), zhRequests.join(', '));
    else check('zh: switching again uses the course already in memory (no new download)', zhRequests.length === requestsBefore, zhRequests.slice(requestsBefore).join(', '));
    check('zh: every Chinese text node is lang="zh-CN" (none tagged ja)', await evaluate(`(() => {
      const ja = [...document.querySelectorAll('#view [lang="ja"]:not(.lang-opt)')];
      const zh = [...document.querySelectorAll('#view .phrase .ja')];
      return !ja.length && zh.length > 3 && zh.every((e) => e.lang === 'zh-CN');
    })()`));
    check('zh: SC system font stack, not Shippori Mincho', await evaluate(
      "(() => { const f = getComputedStyle(document.querySelector('.phrase .ja')).fontFamily; return /Noto Sans SC|PingFang SC/.test(f) && !/Shippori/.test(f); })()"),
      await evaluate("getComputedStyle(document.querySelector('.phrase .ja')).fontFamily"));
    check('zh: pinyin ruby has one syllable per character', await evaluate(`(() => {
      const rubies = [...document.querySelectorAll('.phrase .ja ruby')];
      return rubies.length > 3 && rubies.every((r) => [...r.firstChild.textContent].length === 1 && !/\\s/.test(r.querySelector('rt').textContent));
    })()`));
    check('zh: Pinyin toggle replaces Furigana; the switch shows ZH active', await evaluate(
      "/Pinyin/.test(document.querySelector('header.top label.toggle').textContent) && document.querySelector('.lang-switch [data-lang=\"zh\"]').getAttribute('aria-pressed') === 'true'"));
    check('zh: no horizontal scroll (phrases)', await noHScroll());
    check('zh: the Phrases title stays on one line', await evaluate(titleOneLine));
    await shot(`zh-${vp.name}-1-phrases`);
    for (const q of ['xuesheng', 'xue sheng', '学生', 'student']) {
      await evaluate(`(() => { const i = document.querySelector('#phrase-search'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')); })()`);
      check(`zh: phrase search "${q}" finds a phrase with 学生`, await waitFor("/^Found/.test(document.querySelector('#phrase-list h2')?.textContent || '') && [...document.querySelectorAll('#phrase-list > .phrase')].some((p) => /学生/.test(window.__app.data.byId[p.dataset.id]?.ja || ''))", 3000));
    }
    await evaluate(`(() => { const i = document.querySelector('#phrase-search'); i.value = ''; i.dispatchEvent(new Event('input')); })()`);
    await sleep(200);
    await click('.phrase .fav');
    check('zh: a Chinese favourite goes to jt.zh.favs, not jt.favs', await waitFor(
      "JSON.parse(localStorage.getItem('jt.zh.favs') || '[]').some((id) => id.startsWith('zh.')) && !JSON.parse(localStorage.getItem('jt.favs') || '[]').some((id) => id.startsWith('zh.'))"));

    await navigate(BASE + '#/kanji/dict/xuesheng');
    check('zh: dictionary (CC-CEDICT): "xuesheng" → 学生 first', await waitFor("document.querySelector('#dict-results .dict-entry .ja')?.textContent === '学生'", 20000),
      await evaluate("document.querySelector('#dict-status')?.textContent"));
    for (const q of ['lvcha', '学生', 'student']) {
      await evaluate(`(() => { const i = document.querySelector('#dict-search'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')); })()`);
      const want = q === 'lvcha' ? '绿茶' : '学生';
      check(`zh: dictionary "${q}" lists ${want} in the top 3`, await waitFor(`[...document.querySelectorAll('#dict-results .dict-entry .ja')].slice(0, 3).some((e) => e.textContent === '${want}')`, 5000));
    }
    check('zh: dictionary rows are lang="zh-CN" and show pinyin, credit says CC-CEDICT', await evaluate(
      "document.querySelector('#dict-results .dict-entry .ja').lang === 'zh-CN' && !!document.querySelector('#dict-results .dict-entry .romaji').textContent && /CC-CEDICT/.test(document.querySelector('.dict-credit').textContent) && !document.querySelector('#dict-results .kana-line')"));
    check('zh: no horizontal scroll (dictionary)', await noHScroll());
    await shot(`zh-${vp.name}-2-dictionary`);

    await navigate(BASE + '#/study/today');
    check('zh: Study tabs: the Kana tab is called Pinyin; no Trip section', await waitFor(
      "document.querySelector('.subnav [data-sub=\"kana\"]')?.textContent === 'Pinyin' && document.querySelectorAll('.tile').length === 4 && !document.querySelector('#start-preflight')"));
    await shot(`zh-${vp.name}-3-today`);
    await click('#start-morning');
    check('zh: the morning session shows a Chinese study card', await waitFor("!!document.querySelector('.flash[data-id^=\"zh.\"]')", 5000));
    await click('#reveal');
    check('zh: the answer is Chinese with pinyin ruby', await waitFor("!!document.querySelector('.flash .back .jp .ja[lang=\"zh-CN\"] rt')"));
    await shot(`zh-${vp.name}-4-card`);
    await click('.grade .good');
    check('zh: the grade is stored under jt.zh.*, never in the Japanese keys', await waitFor(
      "Object.keys(JSON.parse(localStorage.getItem('jt.zh.srs') || '{}')).some((k) => k.startsWith('zh.')) || Object.keys(JSON.parse(localStorage.getItem('jt.zh.learned') || '{}')).some((k) => k.startsWith('zh.'))"));
    await navigate(BASE + '#/study/lessons');
    check('zh: lessons list with Z.. codes', await waitFor("document.querySelectorAll('.lesson-row[data-lesson^=\"Z\"]').length >= 2"));
    check('zh: no horizontal scroll (lessons)', await noHScroll());

    await navigate(BASE + '#/study/kana');
    check('zh: Pinyin tab: tones and tables', await waitFor("document.querySelectorAll('.tone-row').length >= 4 && document.querySelectorAll('.py-table .kana').length >= 8"));
    await shot(`zh-${vp.name}-5-pinyin`);
    const quizSets = await evaluate("[...document.querySelectorAll('.quiz-sets [data-set]')].map((b) => b.dataset.set)");
    check('zh: pinyin quizzes offered', quizSets.length >= 1, quizSets.join(', '));
    const listenSet = await evaluate("(() => { const q = window.__app.data.pinyin.quizzes.find((x) => x.mode === 'listen'); return q ? q.id : null; })()");
    if (listenSet) {
      await click(`.quiz-sets [data-set="${listenSet}"]`);
      check('zh: listening quiz hides the answer and plays the sound, options from opts', await waitFor("!!document.querySelector('#py-play') && document.querySelectorAll('#pinyin-quiz .opt').length >= 2 && !document.querySelector('#pinyin-quiz .kana-big')"));
      await click('#pinyin-quiz .opt');
      check('zh: quiz feedback reveals the syllable', await waitFor("!!document.querySelector('#pinyin-quiz .opt.right') && !!document.querySelector('#pinyin-quiz .quiz-reveal')"));
      await shot(`zh-${vp.name}-5b-pinyin-quiz`);
    }
    check('zh: no horizontal scroll (pinyin)', await noHScroll());

    await navigate(BASE + '#/study/numbers');
    check('zh: price trainer in yuan', await waitFor("!!document.querySelector('#num-play') && /¥/.test(document.querySelector('#num-card .sess-head').textContent)"));
    await evaluate("(() => { const i = document.querySelector('#num-answer'); i.value = '3.5'; document.querySelector('#num-check').click(); })()");
    check('zh: price answer in 块 with pinyin', await waitFor("/块|毛|分/.test(document.querySelector('#num-feedback').textContent) && !!document.querySelector('#num-feedback .romaji')"));
    await shot(`zh-${vp.name}-6-prices`);
    await navigate(BASE + '#/study/time');
    check('zh: clock time trainer and weekdays', await waitFor("!!document.querySelector('#time-play') && document.querySelectorAll('.cnt').length === 7"));
    check('zh: no horizontal scroll (time)', await noHScroll());

    await navigate(BASE + '#/kanji');
    check('zh: Characters sheet (hanzi) without a kana line', await waitFor("document.querySelector('.subnav [data-sub=\"signs\"]')?.textContent === 'Characters' && document.querySelectorAll('.kcell').length >= 5 && !document.querySelector('.kcell .kkana')"));
    check('zh: no horizontal scroll (characters)', await noHScroll());
    await shot(`zh-${vp.name}-7-characters`);

    await navigate(BASE + '#/show');
    check('zh: Show: Chinese cards, no allergy card', await waitFor("document.querySelectorAll('.showcard').length >= 3 && !document.querySelector('#card-allergy') && !!document.querySelector('#card-address')"));
    await click('.showcard');
    check('zh: full-screen card in Chinese', await waitFor("!!document.querySelector('#fs .fs-ja[lang=\"zh-CN\"]')"));
    await shot(`zh-${vp.name}-8-show-card`);
    await click('#fs .btn.primary');
    await waitFor("!document.querySelector('#fs')");

    await navigate(BASE + '#/tools');
    check('zh: Tools: Translate to zh-CN, no Japan emergency numbers or maps', await waitFor(
      "!!document.querySelector('#translate') && /EN → ZH/.test(document.querySelector('#translate h2').textContent) && !document.querySelector('#emergency') && !document.querySelector('#maps')"));
    await evaluate("window.__opened = []; window.open = (u) => { window.__opened.push(u); }; document.querySelector('#tr-text').value = 'student'; document.querySelector('#translate .btn.primary').click()");
    check('zh: Translate link uses tl=zh-CN', await waitFor("(window.__opened || []).some((u) => /tl=zh-CN/.test(u))"), await evaluate("JSON.stringify(window.__opened)"));
    check('zh: backup line mentions both courses', await evaluate("/both courses/.test(document.querySelector('#backup-langs')?.textContent || '')"));
    check('zh: no horizontal scroll (tools)', await noHScroll());
    await shot(`zh-${vp.name}-9-tools`);
    await evaluate(`(() => {
      window.__copied = null;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } });
    })()`);
    await click('#copy-backup');
    check('zh: one backup holds both courses', await waitFor("!!window.__copied && (() => { const b = JSON.parse(window.__copied); return b.data.favs.includes('basics.hai') && b.langs.zh.favs.some((id) => id.startsWith('zh.')); })()"));
    await navigate(BASE + '#/tools/credits');
    check('zh: Credits list CC-CEDICT (MDBG, CC BY-SA 4.0) next to JMdict', await waitFor(
      "(() => { const t = document.querySelector('#view').textContent; const hrefs = [...document.querySelectorAll('#view a')].map((a) => a.href); return /CC-CEDICT/.test(t) && /MDBG/.test(t) && /JMdict/.test(t) && hrefs.some((h) => h.includes('mdbg.net')) && hrefs.includes('https://cc-cedict.org/wiki/'); })()"));

    for (const theme of ['light', 'dark']) {
      await evaluate(`localStorage.setItem('theme', '${theme}'); document.documentElement.dataset.theme = '${theme}'`);
      for (const [name, hash] of [['phrases', '#/phrases'], ['today', '#/study/today'], ['lessons', '#/study/lessons'], ['pinyin', '#/study/kana'], ['prices', '#/study/numbers'],
        ['time', '#/study/time'], ['characters', '#/kanji'], ['dictionary', '#/kanji/dict/xuesheng'], ['show', '#/show'], ['tools', '#/tools']]) {
        await navigate(BASE + hash);
        await waitFor("document.documentElement.dataset.ready === '1' && document.querySelector('#view').children.length > 1");
        if (name === 'phrases') await click('.phrase.is-collapsed .jp');
        if (name === 'dictionary') await waitFor("!!document.querySelector('#dict-results .dict-entry')", 5000);
        await sleep(150);
        const st = await evaluate(`(() => {
          const de = document.documentElement;
          const ctrls = [...document.querySelectorAll('#view button, #view a.btn, #view select')].filter((e) => e.offsetParent);
          const tiny = ctrls.filter((e) => e.getBoundingClientRect().height < 30 && !e.closest('.reply-to, .linklike, details summary') && !e.classList.contains('linklike'));
          return { theme: de.dataset.theme, lang: de.lang, hscroll: de.scrollWidth > innerWidth + 1, tiny: tiny.map((e) => e.className).slice(0, 4),
            jaTagged: document.querySelectorAll('#view [lang="ja"]:not(.lang-opt)').length };
        })()`);
        check(`zh ${vp.name} ${theme} ${name}: theme, lang zh-CN, no h-scroll, controls >= 30 px, nothing tagged ja`,
          st.theme === theme && st.lang === 'zh-CN' && !st.hscroll && !st.tiny.length && !st.jaTagged, JSON.stringify(st));
        await shot(`zh-theme-${vp.name}-${theme}-${name}`);
      }
    }
    await evaluate("localStorage.removeItem('theme'); document.documentElement.removeAttribute('data-theme')");

    await navigate(BASE + '#/phrases');
    await waitFor("!!document.querySelector('.lang-switch')");
    await click('.lang-switch [data-lang="ja"]');
    check('zh → ja: Japanese phrases are back, html lang en', await waitFor("document.documentElement.lang === 'en' && !!document.querySelector('.phrase[data-id=\"konbini.bag-none\"], .phrase[data-id^=\"basics.\"]') && document.querySelector('.phrase .ja').lang === 'ja'", 8000));
    const jaAfter = await evaluate(jaSnapshot);
    check('ja → zh → ja: Japanese progress is byte-for-byte untouched', jaAfter === jaBefore, jaAfter === jaBefore ? '' : `${jaBefore.slice(0, 200)} ≠ ${jaAfter.slice(0, 200)}`);
    check('zh → ja: the Japanese font is back (Shippori Mincho)', await evaluate("/Shippori/.test(getComputedStyle(document.querySelector('.phrase .ja')).fontFamily)"));
    await click('.lang-switch [data-lang="zh"]');
    check('ja → zh again: instant from memory, Chinese progress kept', await waitFor("document.documentElement.lang === 'zh-CN' && JSON.parse(localStorage.getItem('jt.zh.favs') || '[]').length > 0", 4000));
    await click('.lang-switch [data-lang="ja"]');
    await waitFor("document.documentElement.lang === 'en'");
    await waitFor("caches.keys().then(async (k) => { const z = k.find((x) => x.startsWith('zh-')); return !!z && (await (await caches.open(z)).keys()).length === 5; })", 15000);
    const zhCache = await evaluate("caches.keys().then(async (k) => { const z = k.find((x) => x.startsWith('zh-')); const shell = k.find((x) => x.startsWith('jt-')); return { z, files: z ? (await (await caches.open(z)).keys()).map((r) => new URL(r.url).pathname).sort() : [], inShell: shell ? (await (await caches.open(shell)).keys()).some((r) => r.url.includes('/data/zh/')) : null }; })");
    check('zh: the five zh files sit in their own zh-* cache, not in the shell cache', zhCache.files.length === 5 && zhCache.inShell === false, JSON.stringify(zhCache));
    await evaluate(`(() => {
      const root = window.__app.rootStore, zh = root.lang('zh');
      root.set('favs', []); root.remove('srs'); root.remove('lessons');
      for (const k of ['favs', 'srs', 'settings', 'cards', 'userItems', 'history', 'quizStats', 'lessons', 'learned', 'activity', 'dictFavs']) zh.remove(k);
      localStorage.removeItem('jt.lang');
    })()`);
    const newErr = errors.slice(e0);
    check('zh: no exceptions or console.error', newErr.length === 0, newErr.join(' | '));
  }

  if (process.env.E2E_ONLY !== 'zh') for (const vp of VIEWPORTS) await runViewport(vp);
  for (const vp of VIEWPORTS) await runChinese(vp);

  // ---------- Service Worker and offline ----------
  console.log('\n=== Service Worker / offline ===');
  await navigate(BASE + '#/phrases');
  await waitFor("document.documentElement.dataset.ready === '1'");
  check('SW active and controls the page', await waitFor('navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller)', 10000) ||
    (await navigate(BASE + '#/phrases'), await waitFor('!!navigator.serviceWorker.controller', 5000)));
  await waitFor("caches.open('dict-2026-11-16').then((c) => c.keys()).then((k) => k.length === 2)", 15000);
  const cacheInfo = await evaluate("caches.keys().then(async (k) => { const c = await caches.open(k.find((x) => x.startsWith('jt-'))); const shell = (await c.keys()).map((r) => r.url); const d = k.find((x) => x.startsWith('dict-')); const dict = d ? (await (await caches.open(d)).keys()).map((r) => new URL(r.url).pathname) : []; return { keys: k, n: shell.length, dictInShell: shell.some((u) => /dict-(core|rest)/.test(u)), dict }; })");
  check('jt-* cache filled', cacheInfo.keys.some((k) => k.startsWith('jt-')) && cacheInfo.n >= 25, JSON.stringify(cacheInfo));
  check('dictionary in its own cache dict-2026-11-16 (core + rest), not in the shell cache',
    cacheInfo.keys.includes('dict-2026-11-16') && cacheInfo.dict.length === 2 && !cacheInfo.dictInShell, JSON.stringify(cacheInfo));

  // ---------- Tools > Check for updates / Hard refresh (a newer sw.js is simulated on the local server) ----------
  console.log('\n=== Updates ===');
  const swSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'sw.js'), 'utf8');
  const curVer = swSrc.match(/const VERSION = '([^']+)'/)[1];
  const toastText = "document.querySelector('#toast')?.textContent || ''";
  await evaluate("localStorage.setItem('jt.e2eMarker', 'keep-me')");
  await navigate(BASE + '#/tools');
  check(`Tools shows the running version (App version ${curVer})`, await waitFor(`document.querySelector('#app-version')?.textContent === 'App version ${curVer}'`, 5000),
    await evaluate("document.querySelector('#app-version')?.textContent"));
  check('Check for updates is a big button at the top of the settings area', await evaluate(
    "(() => { const b = document.querySelector('#check-updates'), s = document.querySelector('#settings'); return !!b && b.getBoundingClientRect().height >= 48 && !!(b.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); })()"));
  await click('#check-updates');
  check(`no new version: "You're up to date (${curVer})"`, await waitFor(`(${toastText}) === "You're up to date (${curVer})"`, 8000), await evaluate(toastText));
  const newVer = curVer + '-e2e';
  overrides.set('/sw.js', swSrc.replace(`const VERSION = '${curVer}'`, `const VERSION = '${newVer}'`));
  await click('#check-updates');
  check(`new sw.js on the server: installed, page reloaded, App version ${newVer}`, await waitFor(
    `document.documentElement.dataset.ready === '1' && document.querySelector('#app-version')?.textContent === 'App version ${newVer}'`, 20000),
    await evaluate("document.querySelector('#app-version')?.textContent"));
  check(`after the reload: "Updated to ${newVer}"`, await waitFor(`(${toastText}) === 'Updated to ${newVer}'`, 5000), await evaluate(toastText));
  check('update keeps the data (localStorage) and the dictionary cache', await evaluate(
    `caches.keys().then((k) => localStorage.getItem('jt.e2eMarker') === 'keep-me' && k.includes('dict-2026-11-16') && k.includes('jt-${newVer}') && !k.includes('jt-${curVer}'))`));
  // Hard refresh: only jt-* caches go, the worker is re-registered, everything is precached again
  await evaluate("window.confirm = () => true; document.querySelector('#hard-refresh').click()");
  await sleep(1500);
  check('hard refresh reloads with a fresh worker and a refilled shell cache', await waitFor(
    `document.documentElement.dataset.ready === '1' && !!navigator.serviceWorker.controller && caches.open('jt-${newVer}').then((c) => c.keys()).then((k) => k.length >= 25)`, 20000));
  check('hard refresh keeps the Chinese course cache', await evaluate("caches.keys().then((k) => k.some((x) => x.startsWith('zh-')))"));
  check('hard refresh keeps localStorage and the dictionary cache', await evaluate(
    "caches.keys().then((k) => localStorage.getItem('jt.e2eMarker') === 'keep-me' && k.includes('dict-2026-11-16'))"));
  // back to the real sw.js (also exercises a second update)
  overrides.delete('/sw.js');
  await navigate(BASE + '#/tools');
  await waitFor("!!document.querySelector('#check-updates')");
  await click('#check-updates');
  check(`back to the real version ${curVer}`, await waitFor(`document.querySelector('#app-version')?.textContent === 'App version ${curVer}'`, 20000),
    await evaluate("document.querySelector('#app-version')?.textContent"));
  await evaluate("localStorage.removeItem('jt.e2eMarker')");
  await navigate(BASE + '#/phrases');
  await waitFor('!!navigator.serviceWorker.controller', 5000);

  await new Promise((r) => server.close(r));
  server = null;
  const reachable = await fetch(BASE).then(() => true, () => false);
  check('server really stopped', !reachable);

  for (const vp of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: vp.ua, platform: vp.navPlatform });
    await navigate(BASE + '#/phrases');
    await cdp.send('Page.reload', { ignoreCache: false });
    await sleep(300);
    check(`offline ${vp.name}: reload — app and data`, await waitFor("document.documentElement.dataset.ready === '1' && document.querySelectorAll('.phrase').length > 5", 8000));
    await navigate(BASE + '#/kanji');
    check(`offline ${vp.name}: kanji`, await waitFor("document.querySelectorAll('.kcell').length >= 60"));
    await navigate(BASE + '#/kanji/dict/kohii');
    check(`offline ${vp.name}: dictionary loads from its cache (22,667 words) and finds コーヒー`, await waitFor(
      "document.querySelector('#dict-status')?.textContent === 'Dictionary: 22,667 words ready' && document.querySelector('#dict-results .dict-entry .ja')?.textContent === 'コーヒー'", 20000),
      await evaluate("document.querySelector('#dict-status')?.textContent"));
    await navigate(BASE + '#/study/kana');
    check(`offline ${vp.name}: kana`, await waitFor("document.querySelectorAll('.kana').length >= 71"));
    await navigate(BASE + '#/tools');
    await waitFor("!!document.querySelector('#check-updates')");
    await click('#check-updates');
    check(`offline ${vp.name}: Check for updates says "No connection - try again online"`, await waitFor(
      "document.querySelector('#toast')?.textContent === 'No connection - try again online'", 8000), await evaluate("document.querySelector('#toast')?.textContent"));
    await shot(`offline-${vp.name}`);
  }
  await navigate(BASE + 'diag.html');
  check('offline: diag.html opens', await waitFor("!!document.querySelector('#checks')"));

  const zhBeforeOffline = zhRequests.length;
  await navigate(BASE + '#/phrases');
  await waitFor("document.documentElement.dataset.ready === '1'");
  await click('.lang-switch [data-lang="zh"]');
  check('offline: the Chinese course opens from its cache after the first download', await waitFor(
    "document.documentElement.lang === 'zh-CN' && document.querySelectorAll('.phrase[data-id^=\"zh.\"]').length > 3", 10000));
  await navigate(BASE + '#/kanji/dict/xuesheng');
  check('offline: Chinese dictionary from its cache finds 学生', await waitFor("document.querySelector('#dict-results .dict-entry .ja')?.textContent === '学生'", 20000));
  await cdp.send('Page.reload');
  check('offline: reload keeps the Chinese course', await waitFor("document.documentElement.dataset.ready === '1' && document.documentElement.lang === 'zh-CN' && !!document.querySelector('#dict-search')", 10000));
  await shot('offline-zh');
  check('offline: no request reached the (stopped) server for zh data', zhRequests.length === zhBeforeOffline);
  await evaluate("localStorage.removeItem('jt.lang')");

  cdp.close();
  chrome.kill();
  const failed = results.filter((r) => !r.ok);
  writeFileSync(join(OUT, 'e2e-results.json'), JSON.stringify({ when: new Date().toISOString(), results }, null, 1));
  console.log(`\nTotal: ${results.length - failed.length}/${results.length} PASS${failed.length ? `, FAIL: ${failed.length}` : ''}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
