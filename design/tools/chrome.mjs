// Shared helper: drive a local headless Chrome/Edge over the DevTools protocol.
// No npm dependencies. Node 20 needs --experimental-websocket; the scripts re-launch
// themselves with the flag when the global WebSocket is missing (see ensureWebSocket).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);

export function ensureWebSocket(scriptUrl) {
  if (typeof WebSocket !== 'undefined') return;
  const r = spawnSync(process.execPath, ['--experimental-websocket', fileURLToPath(scriptUrl), ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
  const exe = CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new Error('Chrome not found; set CHROME_PATH');
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = mkdtempSync(join(tmpdir(), 'jt-shot-'));
  const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--allow-file-access-from-files', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    await sleep(100);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!target) { proc.kill(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const waiters = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method) for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].method === m.method) waiters.splice(i, 1)[0].res(m.params);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { pending.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const once = (method) => new Promise((res) => waiters.push({ method, res }));
  await send('Page.enable');

  /** Screenshot `url` in a phone-sized, touch, DPR-`scale` viewport. */
  async function shoot(url, out, { width, height, scale = 2, mobile = true, dark = false, transparent = false } = {}) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
    await send('Emulation.setDefaultBackgroundColorOverride', transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url });
    await loaded;
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 350)))', awaitPromise: true });
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(out, Buffer.from(data, 'base64'));
  }
  async function close() {
    try { await send('Browser.close'); } catch { /* already gone */ }
    await sleep(300); proc.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* temp dir, best effort */ }
  }
  return { shoot, close };
}
