// Screenshots of mockup.html: every screen x 2 phone sizes x 2 themes -> design/shots/
// Run: node design/tools/shots.mjs [screen ...]
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureWebSocket, launch } from './chrome.mjs';
ensureWebSocket(import.meta.url);

const design = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(design, 'shots');
mkdirSync(out, { recursive: true });
const ALL = ['phrases', 'phrase-open', 'show', 'show-list', 'study', 'kana', 'quiz', 'flash', 'price', 'kanji', 'tools', 'states', 'phrases-flat'];
const screens = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const SIZES = [[412, 915, 'Pixel'], [430, 932, 'iPhone 16 Plus']];
const base = pathToFileURL(join(design, 'mockup.html')).href;

const chrome = await launch();
try {
  for (const s of screens) for (const [w, h] of SIZES) for (const theme of ['light', 'dark']) {
    const file = join(out, `${s}-${w}x${h}-${theme}.png`);
    await chrome.shoot(`${base}?s=${s}&theme=${theme}`, file, { width: w, height: h, dark: theme === 'dark' });
    console.log(file);
  }
  if (screens.includes('show')) {   // the "show" card with the phone held sideways
    const file = join(out, 'show-landscape-915x412-light.png');
    await chrome.shoot(`${base}?s=show&theme=light`, file, { width: 915, height: 412 });
    console.log(file);
  }
} finally { await chrome.close(); }
