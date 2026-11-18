// Ship the linguist's curriculum into the app: curriculum/data/curriculum.json → app/data/curriculum.json.
// The source of truth stays in curriculum/src (built by curriculum/tools/build.mjs); this step only
// checks the structure, normalises and writes a compact copy for the app. Full checks: node tools/validate.mjs
// Run: node tools/build-curriculum.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'curriculum', 'data', 'curriculum.json');
const OUT = join(ROOT, 'app', 'data', 'curriculum.json');

// Data format version of app/data/curriculum.json (bump when the shape changes).
export const CURRICULUM_FORMAT = 1;
const ITEM_FIELDS = ['id', 'cat', 'kind', 'en', 'ja', 'ruby', 'kana', 'romaji', 'tts', 'note', 'pattern', 'replyTo', 'replies', 'tags', 'lesson', 'level', 'order', 'src'];

export function buildCurriculum(src) {
  const fail = (m) => { throw new Error('curriculum: ' + m); };
  for (const k of ['categories', 'units', 'lessons', 'items']) if (!Array.isArray(src[k])) fail(`missing array ${k}`);
  // keep a stable field order and drop anything unknown
  const items = src.items.map((it) => {
    const o = {};
    for (const f of ITEM_FIELDS) if (it[f] !== undefined && it[f] !== null && !(Array.isArray(it[f]) && !it[f].length && f !== 'tags')) o[f] = it[f];
    return o;
  }).sort((a, b) => a.order - b.order);
  const ids = new Set(items.map((i) => i.id));
  if (ids.size !== items.length) fail('duplicate item ids');
  for (const l of src.lessons) for (const id of l.ids) if (!ids.has(id)) fail(`lesson ${l.code} lists unknown id ${id}`);
  return {
    format: CURRICULUM_FORMAT,
    version: src.version,
    generated: src.generated,
    source: 'curriculum/data/curriculum.json',
    categories: src.categories,
    units: src.units,
    lessons: src.lessons,
    items,
  };
}

if (process.argv[1] && import.meta.url === new URL('file:///' + process.argv[1].replace(/\\/g, '/').replace(/^\//, '')).href) {
  const out = buildCurriculum(JSON.parse(readFileSync(SRC, 'utf8')));
  writeFileSync(OUT, JSON.stringify(out) + '\n', 'utf8');
  const byPath = out.items.reduce((a, it) => ((a[it.tags[0]] = (a[it.tags[0]] || 0) + 1), a), {});
  console.log(`curriculum: ${out.items.length} items, ${out.lessons.length} lessons, ${out.units.length} units ${JSON.stringify(byPath)} → ${OUT}`);
}
