// Measures index build time and query latency of dict-search.mjs over the full dictionary, and
// prints the top results for a few queries as a sanity check.
// Usage: node dictionary/tools/bench-search.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { normalize } from '../../app/modules/text.js';
import { createDictIndex } from './dict-search.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const t0 = performance.now();
const txt = readFileSync(join(HERE, '..', 'out', 'dict.json'), 'utf8');
const t1 = performance.now();
const dict = JSON.parse(txt);
const t2 = performance.now();
const idx = createDictIndex(dict.fields, dict.rows, normalize);
const t3 = performance.now();

const QUERIES = ['k', 'ko', 'kohi', 'kōhī', 'coffee', 'milk', 'ticket', 'eki', 'えき', 'コーヒー', '駅', '牛乳', 'hot', 'a', 'to', 'ice cream',
  'receipt', 'toire', 'ぎゅうにゅう', 'chopsticks', 'pan', 'bread', 'yasui', 'cheap', '安い', 'ookii', 'big', 'naru', 'suru', 'wa'];
const times = [];
for (const q of QUERIES) {
  idx.search(q); // warm-up
  const runs = 20;
  const s = performance.now();
  for (let r = 0; r < runs; r++) idx.search(q);
  times.push({ q, ms: (performance.now() - s) / runs });
}
times.sort((a, b) => b.ms - a.ms);
const avg = times.reduce((s, x) => s + x.ms, 0) / times.length;
console.log(`entries ${idx.size}; read ${(t1 - t0).toFixed(1)} ms, JSON.parse ${(t2 - t1).toFixed(1)} ms, index build ${(t3 - t2).toFixed(1)} ms`);
console.log(`query: avg ${avg.toFixed(2)} ms, worst ${times[0].ms.toFixed(2)} ms ("${times[0].q}"); phone estimate x5: avg ${(avg * 5).toFixed(1)} ms, worst ${(times[0].ms * 5).toFixed(1)} ms`);
console.log('slowest:', times.slice(0, 5).map((x) => `${x.q}=${x.ms.toFixed(2)}`).join(' '));
const F = idx.F;
for (const q of ['kohi', 'milk', 'eki', '駅', 'pan', 'naru', 'hot', 'receipt', 'wa', 'cheap']) {
  console.log(`\n${q}:`, idx.search(q, 5).map(({ row, tier }) => `${row[F.ja]}(${row[F.romaji]}) #${row[F.rank]} t${tier} ${row[F.en].slice(0, 30)}`).join(' | '));
}

// incremental: core first, then the rest tier in 1000-row chunks
{
  const core = JSON.parse(readFileSync(join(HERE, '..', 'out', 'dict-core.json'), 'utf8'));
  const rest = JSON.parse(readFileSync(join(HERE, '..', 'out', 'dict-rest.json'), 'utf8'));
  const a = performance.now();
  const ix = createDictIndex(core.fields, core.rows, normalize);
  const b = performance.now();
  let worst = 0;
  for (let i = 0; i < rest.rows.length; i += 1000) { const c = performance.now(); ix.add(rest.rows.slice(i, i + 1000)); worst = Math.max(worst, performance.now() - c); }
  const c = performance.now();
  const sameTop = ['kohi', 'milk', '駅', 'hot'].every((q) => JSON.stringify(ix.search(q, 10)) === JSON.stringify(idx.search(q, 10)));
  console.log(`\nincremental: core index ${(b - a).toFixed(1)} ms (x5 ${((b - a) * 5).toFixed(0)} ms); rest in ${Math.ceil(rest.rows.length / 1000)} chunks, worst chunk ${worst.toFixed(1)} ms (x5 ${(worst * 5).toFixed(0)} ms), total ${(c - a).toFixed(0)} ms; same results as one-shot: ${sameTop}`);
}
