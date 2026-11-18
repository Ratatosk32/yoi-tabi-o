import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalize } from '../app/modules/text.js';
import { createDictIndex } from '../app/modules/dict-search.js';
import { checkPair } from '../tools/build-dict-app.mjs';
import { createStore } from '../app/modules/store.js';

const root = (p) => fileURLToPath(new URL('../' + p, import.meta.url));
const read = (p) => readFileSync(root(p), 'utf8');
const core = JSON.parse(read('app/data/dict-core.json'));
const rest = JSON.parse(read('app/data/dict-rest.json'));

function fullIndex() {
  const idx = createDictIndex(core.fields, core.rows, normalize);
  for (let i = 0; i < rest.rows.length; i += 500) idx.add(rest.rows.slice(i, i + 500));
  return idx;
}
const idx = fullIndex();
const top = (q, n = 1) => idx.search(q, n).map(({ row }) => row[idx.F.ja]);

test('app/data/dict-*.json and app/modules/dict-search.js are the current build of dictionary/ (run tools/build-dict-app.mjs)', () => {
  assert.equal(read('app/data/dict-core.json'), read('dictionary/out/dict-core.json'));
  assert.equal(read('app/data/dict-rest.json'), read('dictionary/out/dict-rest.json'));
  assert.ok(read('app/modules/dict-search.js').endsWith(read('dictionary/tools/dict-search.mjs')));
  const { dictDate } = checkPair(core, rest);
  assert.match(dictDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(core.count, 4000);
  assert.equal(core.total, 22667);
  assert.equal(core.count + rest.count, 22667);
});

test('build step refuses a broken pair', () => {
  assert.throws(() => checkPair({ ...core, part: 'rest' }, rest), /part/);
  assert.throws(() => checkPair(core, { ...rest, count: rest.count + 1 }), /count/);
  assert.throws(() => checkPair({ ...core, attribution: '' }, rest), /attribution/);
});

test('index: the whole dictionary indexed in 500-row chunks', () => {
  assert.equal(idx.size, 22667);
});

test('search: coffee / kohii / kōhī / koohii / コーヒー / こーひー / 珈琲 all find コーヒー first', () => {
  for (const q of ['coffee', 'kohii', 'kōhī', 'koohii', 'kohi', 'コーヒー', 'こーひー', '珈琲', 'Coffee ']) {
    assert.equal(top(q)[0], 'コーヒー', q);
  }
});

test('search: kanji, kana, romaji, English word prefix, Japanese substring', () => {
  assert.equal(top('駅')[0], '駅');
  assert.equal(top('えき')[0], '駅');
  assert.equal(top('eki')[0], '駅');
  assert.equal(top('rice')[0], '米');
  assert.ok(top('rice', 5).includes('ご飯'), 'rice → ご飯 in the top 5 (head match: cooked rice)');
  assert.ok(top('station', 3).includes('駅'), 'station → 駅 in the top 3 (railway station)');
  assert.ok(top('water', 5).includes('お湯'), 'water → お湯 in the top 5 (hot water)');
  assert.deepEqual(top('rice', 3), ['米', '飯', '新米'], 'core exact, then core head matches, then rarer exact matches');
  assert.ok(top('cooked rice', 3).includes('ご飯'));
  assert.equal(top('toire')[0], 'トイレ');
  assert.ok(idx.search('切符', 5).some(({ row }) => row[idx.F.ja] === '切符'));
  assert.ok(idx.search('ticket', 10).some(({ row }) => row[idx.F.ja] === '切符'));
  assert.deepEqual(idx.search('', 5), []);
  assert.deepEqual(idx.search('zzqxw', 5), []);
});

test('search: results ranked by match tier, then rank (core first)', () => {
  for (const q of ['water', 'mizu', 'station', 'eat', 'taberu', '水']) {
    const res = idx.search(q, 40);
    assert.ok(res.length > 0, q);
    for (let i = 1; i < res.length; i++) {
      const a = res[i - 1], b = res[i];
      assert.ok(a.tier < b.tier || (a.tier === b.tier && a.row[idx.F.rank] < b.row[idx.F.rank]), `${q}: order at ${i}`);
    }
    // within the best tier, core words come before the rest
    const best = res.filter((r) => r.tier === res[0].tier);
    const firstRest = best.findIndex((r) => !r.row[idx.F.core]);
    if (firstRest >= 0) assert.ok(best.slice(firstRest).every((r) => !r.row[idx.F.core]), q);
  }
});

test('chunked index = one-shot index (same results)', () => {
  const one = createDictIndex(core.fields, [...core.rows, ...rest.rows], normalize);
  for (const q of ['coffee', 'kippu', 'ありがとう', '水', 'go']) {
    assert.deepEqual(one.search(q, 30).map((r) => r.row[0]), idx.search(q, 30).map((r) => r.row[0]), q);
  }
});

test('loader: core first, then the rest in chunks; progress text; search during and after loading', async () => {
  const files = { 'data/dict-core.json': core, 'data/dict-rest.json': rest };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => ({ ok: true, status: 200, json: async () => files[url] });
  try {
    const D = await import('../app/modules/dict.js?t=' + Date.now());
    assert.equal(D.progressText({ status: 'idle', loaded: 0, total: 0 }), 'Dictionary: loading…');
    const seen = [];
    D.onChange((s) => seen.push(`${s.status}:${s.loaded}`));
    await D.load();
    assert.equal(seen[0], 'loading:0');
    assert.equal(seen[1], 'core:4000');
    assert.ok(seen.includes('core:4500'), 'rest added in 500-row chunks');
    assert.equal(seen.at(-1), 'ready:22667');
    assert.equal(D.progressText({ status: 'core', loaded: 4000, total: 22667 }), 'Dictionary: 4,000 / 22,667 words ready');
    assert.equal(D.progressText(), 'Dictionary: 22,667 words ready');
    assert.equal(D.status().dictDate, '2026-11-16');
    const [hit] = D.search('coffee', 1);
    assert.equal(hit.ja, 'コーヒー');
    assert.equal(hit.kana, 'コーヒー');
    assert.equal(hit.romaji, 'kōhī');
    assert.equal(hit.core, 1);
    assert.equal(hit.alt, '珈琲');
    assert.match(hit.en, /coffee/);
    assert.equal(D.load(), D.load(), 'idempotent');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('store: dictionary favorites survive export / import; malformed ones are skipped', () => {
  const s = createStore({ getItem: () => null, setItem() {}, removeItem() {} });
  s.set('dictFavs', [{ id: 1049180, ja: 'コーヒー', kana: 'コーヒー', romaji: 'kōhī', en: 'coffee', pos: 'n' }]);
  const backup = s.exportAll();
  assert.equal(backup.data.dictFavs.length, 1);
  const t = createStore({ getItem: () => null, setItem() {}, removeItem() {} });
  assert.deepEqual(t.importAll(backup), ['dictFavs']);
  assert.equal(t.get('dictFavs')[0].ja, 'コーヒー');
  const u = createStore({ getItem: () => null, setItem() {}, removeItem() {} });
  assert.deepEqual(u.importAll({ app: 'japan-trip', format: 2, data: { dictFavs: ['コーヒー'] } }), []);
});
