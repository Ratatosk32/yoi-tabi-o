// Audits everyday travel words against the built dictionary.
// Usage: node dictionary/tools/check-travel.mjs [path/to/JMdict_e.gz]
//   Without the XML path it only reports presence/rank; with it, missing words are looked up in the
//   full JMdict to tell "not marked common" from "not in JMdict".
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRAVEL_WORDS } from './travel-words.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const dict = JSON.parse(readFileSync(join(HERE, '..', 'out', 'dict.json'), 'utf8'));
const F = Object.fromEntries(dict.fields.map((f, i) => [f, i]));
const rows = dict.rows;

function find(w, r) {
  return rows.filter((e) => e[F.ja] === w || (e[F.alt] && e[F.alt].split(',').includes(w)) || (w === r && e[F.kana] === r))
    .sort((a, b) => a[F.rank] - b[F.rank]);
}

let full = null;
if (process.argv[2]) {
  let buf = readFileSync(process.argv[2]);
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  const xml = buf.toString('utf8');
  full = new Map();
  for (const [, body] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = /<ent_seq>(\d+)/.exec(body)[1];
    for (const [, t] of body.matchAll(/<(?:keb|reb)>([^<]*)<\/(?:keb|reb)>/g)) {
      if (!full.has(t)) full.set(t, []);
      full.get(t).push({ id, gloss: /<gloss>([^<]*)<\/gloss>/.exec(body)?.[1] || '' });
    }
  }
}

const out = { core: [], rest: [], missing: [] };
for (const [w, r, en] of TRAVEL_WORDS) {
  const hit = find(w, r);
  if (hit.length) {
    const e = hit[0];
    (e[F.core] ? out.core : out.rest).push({ w, r, en, id: e[F.id], ja: e[F.ja], rank: e[F.rank], gloss: e[F.en] });
  } else {
    const fx = full?.get(w) || [];
    out.missing.push({ w, r, en, inFullJMdict: fx.slice(0, 3) });
  }
}
console.log(`travel words: ${TRAVEL_WORDS.length}; in core: ${out.core.length}; in rest tier: ${out.rest.length}; missing: ${out.missing.length}`);
console.log('\n-- present but outside the core tier --');
for (const x of out.rest.sort((a, b) => a.rank - b.rank)) console.log(`${x.w}\t${x.id}\trank ${x.rank}\t${x.gloss}`);
console.log('\n-- missing from the dictionary --');
for (const x of out.missing) console.log(`${x.w}\t(${x.en})\t${full ? (x.inFullJMdict.length ? 'in full JMdict, not "common": ' + x.inFullJMdict.map((h) => h.id + ' ' + h.gloss).join(' | ') : 'not in JMdict under this spelling') : ''}`);
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
