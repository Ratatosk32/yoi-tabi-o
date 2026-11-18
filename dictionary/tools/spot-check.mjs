// Prints a reproducible random sample of entries for manual review (50 core + 50 rest by default).
// Usage: node dictionary/tools/spot-check.mjs [seed] [nCore] [nRest]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [seed = 20261118, nCore = 50, nRest = 50] = process.argv.slice(2).map(Number);
const d = JSON.parse(readFileSync(join(HERE, '..', 'out', 'dict.json'), 'utf8'));
let x = seed >>> 0;
const rnd = () => ((x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 2 ** 32);
const pick = (rows, k) => { const a = rows.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
const core = d.rows.filter((r) => r[8] === 1), rest = d.rows.filter((r) => r[8] === 0);
for (const r of [...pick(core, nCore), ...pick(rest, nRest)].sort((a, b) => a[7] - b[7])) console.log(r.join(' | '));
