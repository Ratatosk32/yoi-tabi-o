import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const zh = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(zh, '..', '..');
const src = process.argv[2] || join(root, 'dictionary', 'zh', 'raw', 'hsk', 'complete.json');
const words = JSON.parse(readFileSync(src, 'utf8'));

const chars = new Set();
for (const f of readdirSync(join(zh, 'src')).filter((f) => /^hanzi-\d+.*\.mjs$/.test(f))) {
  const { HANZI } = await import(pathToFileURL(join(zh, 'src', f)).href);
  for (const r of HANZI) if (r[3] !== 'radical') chars.add(r[0]);
}

const best = (levels, prefix) => {
  const ns = levels.filter((l) => l.startsWith(prefix)).map((l) => +l.slice(prefix.length));
  return ns.length ? Math.min(...ns) : null;
};
const out = {};
for (const ch of [...chars].sort()) {
  let old = null, neu = null, radical = '';
  for (const w of words) {
    if (!w.simplified.includes(ch)) continue;
    const o = best(w.level, 'old-'), n = best(w.level, 'new-');
    if (o != null && (old == null || o < old)) old = o;
    if (n != null && (neu == null || n < neu)) neu = n;
    if (w.simplified === ch && w.radical) radical = w.radical;
  }
  out[ch] = [old ?? (neu != null ? Math.min(neu, 6) : 0), radical];
}
const body = Object.entries(out).map(([c, v]) => `  '${c}': [${v[0]}, '${v[1]}'],`).join('\n');
writeFileSync(join(zh, 'src', 'hanzi-hsk.mjs'), `export const HSK = {\n${body}\n};\n`, 'utf8');
console.log(`hsk levels for ${chars.size} characters`);
