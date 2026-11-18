// Repository rule: English only. Fails if any git-tracked text file contains Cyrillic (U+0400–U+04FF).
// Run: node tools/check-no-cyrillic.mjs [--list]   (exit code 1 on hits, prints file:line)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.zip']);
const CYRILLIC = new RegExp('[\\u0400-\\u04FF]', 'u');

const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
const hits = [];
const perFile = new Map();
for (const f of files) {
  if (BINARY.has(extname(f).toLowerCase())) continue;
  let text;
  try { text = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => {
    if (CYRILLIC.test(line)) {
      hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
      perFile.set(f, (perFile.get(f) || 0) + 1);
    }
  });
}

if (process.argv.includes('--list')) {
  for (const [f, n] of [...perFile].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(5), f);
} else {
  const all = process.argv.includes('--all');
  for (const h of all ? hits : hits.slice(0, 200)) console.log(h);
  if (!all && hits.length > 200) console.log(`… and ${hits.length - 200} more`);
}
console.log(hits.length ? `Cyrillic found: ${hits.length} lines in ${perFile.size} files` : `OK: no Cyrillic in ${files.length} tracked files`);
process.exit(hits.length ? 1 : 0);
