import puppeteer from 'puppeteer-core';
import { createServer } from './serve.mjs';
const s = createServer('D:/japan-trip/app', 8766); await s.start();
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const vp of [{ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true }, { width: 430, height: 932, deviceScaleFactor: 3, isMobile: true }]) {
  const p = await b.newPage(); await p.setViewport(vp); p.on('console', (m) => console.log('console:', m.type(), m.text())); p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('response', (r) => r.status() >= 400 && console.log('http', r.status(), r.url()));
  await p.goto('http://127.0.0.1:8766/#/show'); await p.waitForFunction(() => document.documentElement.dataset.ready === '1');
  const out = [];
  for (let n = 1; n <= 12; n++) {
    await p.evaluate(() => { const c = [...document.querySelectorAll('#card-allergy .checks input')].find((x) => !x.checked); c && c.click(); });
    await new Promise((r) => setTimeout(r, 80));
    await p.evaluate(() => [...document.querySelectorAll('#card-allergy button')].find((b) => b.textContent === 'Show').click());
    await new Promise((r) => setTimeout(r, 120));
    out.push(await p.evaluate((n) => { const b = document.querySelector('#fs .fs-body'); const r = `${n}:${b.scrollHeight > b.clientHeight + 1 ? 'CLIP' : 'ok'}(${b.scrollHeight}/${b.clientHeight},${getComputedStyle(b).overflowY})`; document.querySelector('#fs .btn.primary').click(); return r; }, n));
    await new Promise((r) => setTimeout(r, 80));
  }
  console.log(vp.width, out.join(' '));
}
await b.close(); await s.stop();
