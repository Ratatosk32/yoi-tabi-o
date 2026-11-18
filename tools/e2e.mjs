// E2E-проверка в headless Chrome через Chrome DevTools Protocol (без puppeteer).
// Запуск: node --experimental-websocket tools/e2e.mjs
// Проверяет на 412x915 (UA Pixel) и 430x932 (UA iPhone): все вкладки рисуются, нет исключений,
// нет горизонтальной прокрутки, поиск, SRS, квиз, карточки; SW ставится; после ОСТАНОВКИ сервера
// приложение перезагружается офлайн. Скриншоты → tools/out/.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
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

  let server = await startServer(PORT, { quiet: true });
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
    } catch { /* chrome ещё стартует */ }
  }
  if (!target) throw new Error('Chrome не запустился');
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
    while (Date.now() - t0 < timeout) { try { if (await evaluate(expr)) return true; } catch { /* страница грузится */ } await sleep(100); }
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
    await evaluate('localStorage.clear()'); // каждый вьюпорт — с чистого состояния
    await cdp.send('Page.reload');
    await sleep(300);
    check(`${vp.name}: приложение загрузилось`, await waitFor("document.documentElement.dataset.ready === '1'"));
    check(`${vp.name}: платформа определена как ${vp.platform}`, (await evaluate('document.documentElement.dataset.platform')) === vp.platform);
    check(`${vp.name}: фразы отрисованы`, await waitFor("document.querySelectorAll('.phrase').length > 5"));
    check(`${vp.name}: нет горизонтальной прокрутки (фразы)`, await noHScroll());
    await shot(`${vp.name}-1-phrases`);

    for (const q of ['ふくろ', 'пакет', 'fukuro']) {
      await evaluate(`(() => { const i = document.querySelector('#phrase-search'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')); })()`);
      check(`${vp.name}: поиск «${q}» находит «Пакет не нужен»`, await waitFor(`!!document.querySelector('[data-id="konbini.bag-none"]') && document.querySelector('#phrase-list h2').textContent.startsWith('Найдено')`, 3000));
    }
    await shot(`${vp.name}-2-search`);
    // Озвучка без голосов не должна бросать исключения
    await evaluate("document.querySelector('.phrase .speak .btn')?.click()");
    await sleep(300);
    // избранное
    await evaluate(`(() => { const i = document.querySelector('#phrase-search'); i.value=''; i.dispatchEvent(new Event('input')); })()`);
    await sleep(250);
    await click('.phrase .fav');
    check(`${vp.name}: избранное сохраняется`, await waitFor("JSON.parse(localStorage.getItem('jt.favs') || '[]').length > 0"));

    // Учёба
    await navigate(BASE + '#/study/today');
    check(`${vp.name}: «Сегодня» — плитки`, await waitFor("document.querySelectorAll('.tile').length === 4"));
    await shot(`${vp.name}-3-study-today`);
    await click('#start-review');
    check(`${vp.name}: SRS-карточка показана`, await waitFor("!!document.querySelector('.flash')"));
    await click('#reveal');
    check(`${vp.name}: ответ открыт`, await waitFor("!!document.querySelector('.grade .good')"));
    await shot(`${vp.name}-4-study-card`);
    await click('.grade .good');
    check(`${vp.name}: оценка записана в SRS`, await waitFor("Object.keys(JSON.parse(localStorage.getItem('jt.srs') || '{}')).length > 0"));
    check(`${vp.name}: нет горизонтальной прокрутки (учёба)`, await noHScroll());

    await navigate(BASE + '#/study/kana');
    check(`${vp.name}: таблица каны`, await waitFor("document.querySelectorAll('.kana').length >= 46 + 25"));
    await click('[data-set="hira"]');
    check(`${vp.name}: квиз каны — 4 варианта`, await waitFor("document.querySelectorAll('.opt').length === 4"));
    await click('.opt');
    check(`${vp.name}: квиз — обратная связь`, await waitFor("!!document.querySelector('.opt.right')"));
    await shot(`${vp.name}-5-kana`);

    await navigate(BASE + '#/study/numbers');
    check(`${vp.name}: тренажёр цен`, await waitFor("!!document.querySelector('#num-play')"));
    const n = await evaluate("(() => { const st = document.querySelector('#num-card'); return st ? 1 : 0; })()");
    // вводим заведомо верный ответ из состояния модуля нельзя — вводим число и проверяем, что появилась обратная связь
    await evaluate("(() => { const i = document.querySelector('#num-answer'); i.value = '12800'; document.querySelector('#num-check').click(); })()");
    check(`${vp.name}: проверка цены даёт ответ с каной`, n === 1 && await waitFor("/えん/.test(document.querySelector('#num-feedback').textContent)"));
    await shot(`${vp.name}-6-numbers`);

    await navigate(BASE + '#/study/time');
    check(`${vp.name}: время и счёт`, await waitFor("document.querySelectorAll('.cnt').length > 30"));
    check(`${vp.name}: нет горизонтальной прокрутки (время)`, await noHScroll());

    // Показать
    await navigate(BASE + '#/show');
    check(`${vp.name}: карточка аллергии — «НЕ ЗАПОЛНЕНО»`, await waitFor("/НЕ ЗАПОЛНЕНО/.test(document.querySelector('#card-allergy').textContent)"));
    await evaluate("document.querySelector('#card-allergy .checks input').click()");
    check(`${vp.name}: аллергия → японский текст`, await waitFor("/アレルギーがあります/.test(document.querySelector('#card-allergy .preview')?.textContent || '')"));
    await shot(`${vp.name}-7-show`);
    await evaluate("[...document.querySelectorAll('#card-allergy .btn.primary')].pop().click()");
    check(`${vp.name}: полноэкранная карточка`, await waitFor("!!document.querySelector('#fs .fs-line')"));
    await shot(`${vp.name}-8-fullscreen`);
    await click('#fs .btn.primary');
    check(`${vp.name}: карточка закрывается`, await waitFor("!document.querySelector('#fs')"));
    check(`${vp.name}: личные данные не выдуманы (отель пуст)`, await evaluate("/НЕ ЗАПОЛНЕНО/.test(document.querySelector('#card-hotel').textContent)"));

    // Кандзи
    await navigate(BASE + '#/kanji');
    check(`${vp.name}: шпаргалка кандзи`, await waitFor("document.querySelectorAll('.kcell').length >= 60"));
    check(`${vp.name}: нет горизонтальной прокрутки (кандзи)`, await noHScroll());
    await shot(`${vp.name}-9-kanji`);

    // Инструменты
    await navigate(BASE + '#/tools');
    check(`${vp.name}: инструменты`, await waitFor("!!document.querySelector('#lens-btn')"));
    const lensHref = await evaluate("document.querySelector('#lens-btn').getAttribute('href')");
    check(`${vp.name}: Lens-ссылка для платформы`, vp.platform === 'ios' ? lensHref.startsWith('google://') : lensHref.startsWith('intent://'), lensHref.slice(0, 60));
    check(`${vp.name}: нет горизонтальной прокрутки (инструменты)`, await noHScroll());
    await shot(`${vp.name}-10-tools`);

    // diag
    await navigate(BASE + 'diag.html');
    check(`${vp.name}: diag.html — таблица Pixel/iPhone`, await waitFor("document.querySelectorAll('#checks tbody tr').length >= 10 && document.querySelectorAll('#checks .yn').length > 0"));
    await shot(`${vp.name}-11-diag`);

    const newErr = errors.slice(e0);
    check(`${vp.name}: нет исключений и console.error`, newErr.length === 0, newErr.join(' | '));
  }

  for (const vp of VIEWPORTS) await runViewport(vp);

  // ---------- Service Worker и офлайн ----------
  console.log('\n=== Service Worker / офлайн ===');
  await navigate(BASE + '#/phrases');
  await waitFor("document.documentElement.dataset.ready === '1'");
  check('SW активен и контролирует страницу', await waitFor('navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller)', 10000) ||
    (await navigate(BASE + '#/phrases'), await waitFor('!!navigator.serviceWorker.controller', 5000)));
  const cacheInfo = await evaluate("caches.keys().then(async (k) => { const c = await caches.open(k[0]); return { keys: k, n: (await c.keys()).length }; })");
  check('кеш jt-* заполнен', cacheInfo.keys.some((k) => k.startsWith('jt-')) && cacheInfo.n >= 25, JSON.stringify(cacheInfo));

  await new Promise((r) => server.close(r));
  server = null;
  const reachable = await fetch(BASE).then(() => true, () => false);
  check('сервер действительно остановлен', !reachable);

  for (const vp of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: vp.ua, platform: vp.navPlatform });
    await navigate(BASE + '#/phrases');
    await cdp.send('Page.reload', { ignoreCache: false });
    await sleep(300);
    check(`офлайн ${vp.name}: перезагрузка — приложение и данные`, await waitFor("document.documentElement.dataset.ready === '1' && document.querySelectorAll('.phrase').length > 5", 8000));
    await navigate(BASE + '#/kanji');
    check(`офлайн ${vp.name}: кандзи`, await waitFor("document.querySelectorAll('.kcell').length >= 60"));
    await navigate(BASE + '#/study/kana');
    check(`офлайн ${vp.name}: кана`, await waitFor("document.querySelectorAll('.kana').length >= 71"));
    await shot(`offline-${vp.name}`);
  }
  await navigate(BASE + 'diag.html');
  check('офлайн: diag.html открывается', await waitFor("!!document.querySelector('#checks')"));

  cdp.close();
  chrome.kill();
  const failed = results.filter((r) => !r.ok);
  writeFileSync(join(OUT, 'e2e-results.json'), JSON.stringify({ when: new Date().toISOString(), results }, null, 1));
  console.log(`\nИтого: ${results.length - failed.length}/${results.length} PASS${failed.length ? `, FAIL: ${failed.length}` : ''}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
