// Render the icon SVGs to PNG with headless Chrome. Run: node design/tools/render-icons.mjs
import { writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureWebSocket, launch } from './chrome.mjs';
ensureWebSocket(import.meta.url);

const icons = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const JOBS = [            // [source, px, output, transparent corners]
  ['icon.svg', 192, 'icon-192.png', true],
  ['icon.svg', 512, 'icon-512.png', true],
  ['icon-maskable.svg', 512, 'icon-maskable-512.png', false],
  ['icon-square.svg', 180, 'apple-touch-icon.png', false],
  ['icon.svg', 32, 'favicon-32.png', true],
];
const chrome = await launch();
try {
  for (const [svg, size, png, transparent] of JOBS) {
    const html = join(icons, `_render-${png}.html`);
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:${transparent ? 'transparent' : '#f5f1e7'}}img{display:block;width:${size}px;height:${size}px}</style><img src="${svg}">`);
    await chrome.shoot(pathToFileURL(html).href, join(icons, png), { width: size, height: size, scale: 1, mobile: false, transparent });
    rmSync(html);
    console.log(png);
  }
} finally { await chrome.close(); }
