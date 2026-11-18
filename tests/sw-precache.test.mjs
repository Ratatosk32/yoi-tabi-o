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
// Data built ahead of its UI: not loaded by the app yet, so not precached yet. Remove from this list
// (and add to PRECACHE in app/sw.js) in the same commit that wires the curriculum into the UI.
const NOT_YET_WIRED = []; // curriculum.json is wired in and precached since SW v8
// The dictionary (JMdict, 2.4 MB) is NOT in the shell precache: it has its own cache (cache-first),
// filled on the first load after the first paint, so a shell update never re-downloads it.
const DICT_DATA = ['data/dict-core.json', 'data/dict-rest.json'];

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
  const missing = need.filter((p) => !precacheFiles.includes(p) && !NOT_YET_WIRED.includes(p) && !DICT_DATA.includes(p));
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

test('files listed as not yet wired are really unused by the app (otherwise they must be precached)', () => {
  const code = walk(APP).filter((p) => /\.(js|html)$/.test(p) && !p.startsWith('vendor/')).map((p) => readFileSync(join(APP, p), 'utf8')).join('\n');
  for (const f of NOT_YET_WIRED) assert.ok(!code.includes(f.split('/').pop()), f + ' is referenced by the app but not precached');
});

test('SW: dictionary files live in their own versioned cache, cache-first, outside the shell precache', () => {
  for (const p of DICT_DATA) assert.ok(!precache.includes(p), p + ' must not block the shell precache');
  const core = JSON.parse(readFileSync(join(APP, 'data', 'dict-core.json'), 'utf8'));
  const dictDate = core.source.split('dictDate ')[1].slice(0, 10);
  assert.ok(sw.includes(`const DICT_CACHE = 'dict-${dictDate}';`), 'DICT_CACHE name follows the data dictDate ' + dictDate);
  const src = sw.split('const DICT_FILES = /')[1].split('/;')[0];
  const re = new RegExp(src);
  for (const p of DICT_DATA) assert.ok(re.test('/' + p), p + ' handled by the dictionary branch');
  assert.ok(!re.test('/data/phrases.json') && !re.test('/data/dict-core.json.bak'), 'only the dictionary files');
  const branch = sw.slice(sw.indexOf('if (DICT_FILES.test(url.pathname))'));
  assert.ok(branch.indexOf('caches.open(DICT_CACHE)') < branch.indexOf('cache.match(req') && branch.indexOf('cache.match(req') < branch.indexOf('fetch(req)'), 'cache-first');
  assert.ok(sw.indexOf('if (DICT_FILES.test(url.pathname))') < sw.indexOf("url.pathname.includes('/data/')"), 'the dictionary branch runs before the generic data branch');
  assert.ok(sw.includes("(k.startsWith('dict-') && k !== DICT_CACHE)"), 'old dictionary caches are removed on activate');
});
