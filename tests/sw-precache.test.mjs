import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
const precache = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]).filter((p) => p !== './');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [relative(APP, p).replace(/\\/g, '/')];
  });
}

test('SW: каждый файл из PRECACHE существует', () => {
  assert.ok(precache.length >= 30, 'файлов в прекеше: ' + precache.length);
  for (const p of precache) assert.ok(existsSync(join(APP, p)), 'нет файла ' + p);
});

test('SW: все ресурсы приложения есть в PRECACHE (офлайн ничего не потеряет)', () => {
  const need = walk(APP).filter((p) => /\.(html|js|css|json|woff2|png|svg|webmanifest)$/.test(p) && p !== 'sw.js');
  const missing = need.filter((p) => !precache.includes(p));
  assert.deepEqual(missing, []);
});

test('index.html подключает стили дизайна и не ссылается на удалённый styles.css', () => {
  const html = readFileSync(join(APP, 'index.html'), 'utf8');
  for (const css of ['fonts/fonts.css', 'tokens.css', 'components.css']) assert.ok(html.includes(`href="${css}"`), css);
  assert.ok(!html.includes('styles.css'));
  assert.ok(/name="color-scheme" content="light dark"/.test(html));
  assert.equal((html.match(/name="theme-color"/g) || []).length, 2);
});
