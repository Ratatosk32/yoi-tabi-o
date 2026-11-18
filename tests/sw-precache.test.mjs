import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
const precache = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]).filter((p) => p !== './');
// Pages serves /index.html as / and /diag.html as /diag (308 redirects): the SW caches the final URLs.
const ALIAS = { diag: 'diag.html' };
const precacheFiles = [...precache.map((p) => ALIAS[p] || p), 'index.html'];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [relative(APP, p).replace(/\\/g, '/')];
  });
}

test('SW: every PRECACHE file exists', () => {
  assert.ok(precache.length >= 30, 'files precached: ' + precache.length);
  for (const p of precacheFiles) assert.ok(existsSync(join(APP, p)), 'missing file ' + p);
});

test('SW: every app resource is in PRECACHE (nothing missing offline)', () => {
  const need = walk(APP).filter((p) => /\.(html|js|css|json|woff2|png|svg|webmanifest)$/.test(p) && p !== 'sw.js');
  const missing = need.filter((p) => !precacheFiles.includes(p));
  assert.deepEqual(missing, []);
});

test('SW: no precached URL that Cloudflare Pages redirects', () => {
  assert.ok(!precache.some((p) => p.endsWith('.html')), 'precache must use / and /diag, not *.html');
});

test('index.html loads the design styles and not the removed styles.css', () => {
  const html = readFileSync(join(APP, 'index.html'), 'utf8');
  for (const css of ['fonts/fonts.css', 'tokens.css', 'components.css']) assert.ok(html.includes(`href="${css}"`), css);
  assert.ok(!html.includes('styles.css'));
  assert.ok(/name="color-scheme" content="light dark"/.test(html));
  assert.equal((html.match(/name="theme-color"/g) || []).length, 2);
});
