// Black-box unit checks of the app's pure modules (srs, store, text, tts, launchers).
// Run: node unit.mjs   → console + qa/out/unit.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..', 'app');
const mod = (name, q = '') => import(pathToFileURL(path.join(APP, 'modules', name)).href + q);

const results = [];
async function t(area, name, fn) {
  try { const actual = await fn(); results.push({ area, name, ok: true, actual: actual === undefined ? '' : actual }); }
  catch (e) { results.push({ area, name, ok: false, actual: e.message.split('\n').slice(0, 6).join(' ') }); }
}

// ======================= SRS =======================
const S = await mod('srs.js');
const D0 = '2026-11-18';
await t('srs', 'INTERVALS = 0/1/2/4/7', () => { assert.deepEqual(S.INTERVALS, [0, 1, 2, 4, 7]); return S.INTERVALS.join('/'); });
await t('srs', 'new card "good" → box 2, due +1', () => { const g = S.grade(undefined, 'good', D0); assert.deepEqual(g, { box: 2, due: '2026-11-19', seen: 1, lapses: 0 }); return JSON.stringify(g); });
await t('srs', 'good ×6 → boxes 2,3,4,5,5,5; intervals 1,2,4,7,7,7', () => {
  let st, day = D0; const trail = [];
  for (let i = 0; i < 6; i++) { st = S.grade(st, 'good', day); trail.push(`b${st.box}:${st.due}`); day = st.due; }
  assert.deepEqual(trail, ['b2:2026-11-19', 'b3:2026-11-21', 'b4:2026-11-25', 'b5:2026-12-02', 'b5:2026-12-09', 'b5:2026-12-16']);
  return trail.join(' ');
});
await t('srs', 'again from box 4 → box 1, due today, lapses+1', () => { const g = S.grade({ box: 4, due: D0, seen: 5, lapses: 0 }, 'again', D0); assert.deepEqual(g, { box: 1, due: D0, seen: 6, lapses: 1 }); return JSON.stringify(g); });
await t('srs', 'hard at box 1 → stays 1, due tomorrow', () => { const g = S.grade(undefined, 'hard', D0); assert.equal(g.box, 1); assert.equal(g.due, '2026-11-19'); return JSON.stringify(g); });
await t('srs', 'hard at box 3 → stays 3, due +2', () => { const g = S.grade({ box: 3, due: D0 }, 'hard', D0); assert.equal(g.box, 3); assert.equal(g.due, '2026-11-20'); return JSON.stringify(g); });
await t('srs', 'unknown grade throws', () => { assert.throws(() => S.grade(undefined, 'easy', D0)); return 'throws'; });
await t('srs', 'addDays across month/year/leap', () => {
  const r = [S.addDays('2026-11-30', 1), S.addDays('2026-12-31', 1), S.addDays('2028-02-28', 1), S.addDays('2026-02-28', 1), S.addDays('2026-12-26', 7), S.addDays('2026-01-01', -1)];
  assert.deepEqual(r, ['2026-12-01', '2027-01-01', '2028-02-29', '2026-03-01', '2027-01-02', '2025-12-31']); return r.join(' ');
});
await t('srs', 'robustness: imported box 0 / 6 / "3" → valid due date', () => {
  const r = [0, 6, '3', undefined, null].map((b) => { try { return S.grade({ box: b, due: D0 }, 'good', D0); } catch (e) { return { err: e.message }; } });
  const bad = r.filter((x) => x.err || !/^\d{4}-\d\d-\d\d$/.test(x.due) || !(x.box >= 1 && x.box <= 5));
  assert.equal(bad.length, 0, 'invalid results: ' + JSON.stringify(r));
  return JSON.stringify(r);
});
await t('srs', 'stats: due counts ≤ today, boxes histogram', () => {
  const st = { a: { box: 1, due: '2026-11-17' }, b: { box: 3, due: D0 }, c: { box: 5, due: '2026-11-25' } };
  const s = S.stats(st, D0); assert.deepEqual(s, { total: 3, due: 2, boxes: [1, 0, 1, 0, 1] }); return JSON.stringify(s);
});
await t('srs', 'stats with out-of-range box (imported) keeps 5 numeric bins', () => {
  const s = S.stats({ a: { box: 7, due: D0 } }, D0); assert.equal(s.boxes.length, 5); assert.ok(s.boxes.every(Number.isFinite)); return JSON.stringify(s);
});
await t('srs', 'modesFor: hear → audio only; card → none; say → 3', () => {
  const r = [S.modesFor({ kind: 'hear' }), S.modesFor({ kind: 'card' }), S.modesFor({ kind: 'say' })];
  assert.deepEqual(r, [['audio'], [], ['ja2en', 'en2ja', 'audio']]); return JSON.stringify(r);
});
const ITEMS = Array.from({ length: 10 }, (_, i) => ({ id: 'p' + i, kind: i === 9 ? 'hear' : 'say', tags: ['w1'] }));
await t('srs', 'buildSession: overdue first (oldest first), then new ≤ newLimit', () => {
  const state = { 'p0|ja2en': { box: 2, due: '2026-11-17' }, 'p1|ja2en': { box: 1, due: '2026-11-10' }, 'p2|ja2en': { box: 1, due: '2026-11-20' } };
  const q = S.buildSession({ items: ITEMS, state, modes: ['ja2en'], today: D0, newLimit: 3 });
  const keys = q.map((x) => x.key);
  assert.deepEqual(keys.slice(0, 2), ['p1|ja2en', 'p0|ja2en']); assert.equal(q.filter((x) => x.isNew).length, 3); assert.ok(!keys.includes('p2|ja2en'));
  return keys.join(',');
});
await t('srs', 'buildSession: hear item only in audio mode', () => {
  const q = S.buildSession({ items: ITEMS, state: {}, modes: ['ja2en', 'en2ja'], today: D0, newLimit: 100 });
  assert.ok(!q.some((x) => x.id === 'p9')); return `${q.length} cards, no p9`;
});
await t('srs', 'buildSession (review = ja2en+en2ja): same phrase not shown in both modes back-to-back', () => {
  const q = S.buildSession({ items: ITEMS, state: {}, modes: ['ja2en', 'en2ja'], today: D0, newLimit: 12 });
  const seq = q.map((x) => x.key);
  const adj = seq.filter((k, i) => i > 0 && q[i - 1].id === q[i].id);
  assert.equal(adj.length, 0, `adjacent same-phrase pairs: ${adj.length}; order: ${seq.slice(0, 6).join(', ')}…`);
  return seq.join(',');
});
await t('srs', 'buildSession: newLimit counts cards (id×mode), not phrases', () => {
  const q = S.buildSession({ items: ITEMS, state: {}, modes: ['ja2en', 'en2ja'], today: D0, newLimit: 12 });
  return `newLimit=12 → ${q.length} cards from ${new Set(q.map((x) => x.id)).size} phrases`;
});
await t('srs', 'studyWeek: day1/week1, day8/week2, day15/week3, day31/week3', () => {
  const r = [D0, '2026-11-25', '2026-12-02', '2026-12-18'].map((d) => S.studyWeek(D0, d));
  assert.deepEqual(r.map((x) => [x.day, x.week]), [[1, 1], [8, 2], [15, 3], [31, 3]]); return JSON.stringify(r);
});
await t('srs', 'studyWeek with start date in the future → day ≥ 1', () => {
  const r = S.studyWeek('2026-11-25', D0); assert.ok(r.day >= 1, 'day=' + r.day); return JSON.stringify(r);
});
await t('srs', 'studyWeek across DST end (Europe, 2026-10-25)', () => {
  const r = S.studyWeek('2026-10-20', '2026-10-27'); assert.deepEqual(r, { day: 8, week: 2 }); return JSON.stringify(r);
});

// timezone probes (child processes with TZ set)
const TZS = ['Europe/Berlin', 'Asia/Tokyo', 'America/Los_Angeles', 'America/Santiago', 'Pacific/Kiritimati', 'UTC'];
const probe = path.join(here, 'tz-probe.mjs');
for (const tz of TZS) {
  await t('srs-tz', `TZ=${tz}: todayStr/addDays/day boundary`, () => {
    const out = execFileSync(process.execPath, [probe, pathToFileURL(path.join(APP, 'modules', 'srs.js')).href], { env: { ...process.env, TZ: tz }, encoding: 'utf8' });
    const r = JSON.parse(out);
    assert.equal(r.tzSeen, tz === 'UTC' ? r.tzSeen : tz, 'node did not honour TZ: ' + r.tzSeen);
    assert.deepEqual(r.fails, [], JSON.stringify(r.fails));
    return `${r.tzSeen}: ${r.checks} checks ok; 2026-11-18T15:30Z → ${r.utc1530}`;
  });
}

// ======================= STORE =======================
const ST = await mod('store.js');
function memBE(init = {}) { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }
const SAMPLE = {
  favs: ['konbini.bag.none', 'basics.thanks'],
  srs: { 'konbini.bag.none|ja2en': { box: 3, due: '2026-11-25', seen: 4, lapses: 1 } },
  settings: { furigana: false, startDate: '2026-11-18', newPerDay: 15 },
  cards: { allergy: { who: 'child', allergens: ['tamago'], strict: true }, hotel: { name: 'ホテル', address: '東京都新宿区' }, free: 'テスト' },
  userItems: [{ id: 'u.x1', en: 'Umbrella', ja: '傘', kana: 'かさ', romaji: 'kasa' }],
  history: ['Где туалет?'],
  quizStats: { kana: { hira: 9 } },
};
await t('store', 'no localStorage (Node) → in-memory fallback works', () => { const s = ST.createStore(); s.set('favs', ['a']); assert.deepEqual(s.get('favs', []), ['a']); return 'ok'; });
await t('store', 'localStorage getter throws (Safari blocked storage) → fallback', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try { const s = ST.createStore(); s.set('x', 1); assert.equal(s.get('x'), 1); } finally { if (desc) Object.defineProperty(globalThis, 'localStorage', desc); else delete globalThis.localStorage; }
  return 'ok';
});
await t('store', 'setItem throws (quota) → set() returns false, value kept in session cache', () => {
  const be = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
  const s = ST.createStore(be); const r = s.set('favs', ['a']); assert.equal(r, false); assert.deepEqual(s.get('favs'), ['a']); return 'set→false';
});
await t('store', 'corrupted JSON → fallback, no throw', () => {
  const s = ST.createStore(memBE({ 'jt.srs': '{bad json', 'jt.favs': 'undefined' })); assert.deepEqual(s.get('srs', {}), {}); assert.deepEqual(s.get('favs', []), []); return 'fallbacks';
});
await t('store', 'export → JSON → import(replace) on clean profile: deep-equal round-trip', () => {
  const a = ST.createStore(memBE()); for (const [k, v] of Object.entries(SAMPLE)) a.set(k, v);
  const json = JSON.stringify(a.exportAll());
  const b = ST.createStore(memBE()); const changed = b.importAll(json, 'replace');
  for (const k of Object.keys(SAMPLE)) assert.deepEqual(b.get(k), SAMPLE[k], k);
  const exp = JSON.parse(json); assert.equal(exp.app, 'japan-trip'); assert.equal(exp.format, 2);
  return 'changed: ' + changed.join(',');
});
await t('store', 'export → import(merge) on clean profile: deep-equal round-trip', () => {
  const a = ST.createStore(memBE()); for (const [k, v] of Object.entries(SAMPLE)) a.set(k, v);
  const b = ST.createStore(memBE()); b.importAll(JSON.stringify(a.exportAll()), 'merge');
  for (const k of Object.keys(SAMPLE)) assert.deepEqual(b.get(k), SAMPLE[k], k); return 'ok';
});
await t('store', 'persisted: new store instance on same backend sees imported data', () => {
  const be = memBE(); const a = ST.createStore(be); a.importAll({ app: 'japan-trip', format: 1, data: SAMPLE });
  const c = ST.createStore(be); assert.deepEqual(c.get('srs'), SAMPLE.srs); return [...be.m.keys()].join(',');
});
await t('store', 'merge favs: local [a,b] + backup [c] → [a,b,c]', () => {
  const s = ST.createStore(memBE()); s.set('favs', ['a', 'b']); s.importAll({ app: 'japan-trip', data: { favs: ['c'] } }, 'merge');
  assert.deepEqual(s.get('favs'), ['a', 'b', 'c']); return JSON.stringify(s.get('favs'));
});
await t('store', 'merge favs: local [a,b] + backup with EMPTY favs [] → keeps [a,b]', () => {
  const s = ST.createStore(memBE()); s.set('favs', ['a', 'b']); s.importAll({ app: 'japan-trip', data: { favs: [] } }, 'merge');
  assert.deepEqual(s.get('favs'), ['a', 'b'], 'got ' + JSON.stringify(s.get('favs'))); return JSON.stringify(s.get('favs'));
});
await t('store', 'merge history: local strings + backup [] → local kept', () => {
  const s = ST.createStore(memBE()); s.set('history', ['x', 'y']); s.importAll({ app: 'japan-trip', data: { history: [] } }, 'merge');
  assert.deepEqual(s.get('history'), ['x', 'y'], 'got ' + JSON.stringify(s.get('history'))); return JSON.stringify(s.get('history'));
});
await t('store', 'merge userItems by id (incoming wins), keeps local-only', () => {
  const s = ST.createStore(memBE()); s.set('userItems', [{ id: 'u.1', en: 'old' }, { id: 'u.2', en: 'local' }]);
  s.importAll({ app: 'japan-trip', data: { userItems: [{ id: 'u.1', ru: 'new' }, { id: 'u.3', en: 'b' }] } }, 'merge');
  assert.deepEqual(s.get('userItems').map((x) => x.id + ':' + x.en), ['u.1:new', 'u.2:local', 'u.3:b']); return 'ok';
});
await t('store', 'merge srs: older backup overwrites newer local progress for same key', () => {
  const s = ST.createStore(memBE()); s.set('srs', { k: { box: 5, due: '2026-12-01', seen: 9 } });
  s.importAll({ app: 'japan-trip', data: { srs: { k: { box: 1, due: '2026-11-10', seen: 1 } } } }, 'merge');
  return 'after merge: ' + JSON.stringify(s.get('srs').k) + ' (incoming always wins)';
});
await t('store', 'import rejects: non-JSON, foreign app, data:null — with readable message', () => {
  const s = ST.createStore(memBE()); const msgs = [];
  for (const bad of ['not json', '{"app":"other","data":{}}', '{"app":"japan-trip","data":null}', '[]', 'null']) {
    try { s.importAll(bad); msgs.push(bad + ' → ACCEPTED'); } catch (e) { msgs.push(`${bad} → ${e.constructor.name}: ${e.message}`); }
  }
  const accepted = msgs.filter((m) => m.includes('ACCEPTED'));
  assert.equal(accepted.length, 0);
  const technical = msgs.filter((m) => /TypeError|Cannot use 'in'|Cannot read/.test(m));
  assert.equal(technical.length, 0, 'technical messages shown to user: ' + technical.join(' | '));
  return msgs.join(' | ');
});
await t('store', 'import validates types (srs:"garbage", favs:{} ) → rejected or ignored', () => {
  const s = ST.createStore(memBE());
  let threw = false; try { s.importAll({ app: 'japan-trip', data: { srs: 'garbage', favs: { a: 1 } } }, 'replace'); } catch { threw = true; }
  const after = { srs: s.get('srs', {}), favs: s.get('favs', []) };
  assert.ok(threw || (typeof after.srs === 'object' && Array.isArray(after.favs)), 'stored invalid types: ' + JSON.stringify(after));
  return JSON.stringify(after);
});
await t('store', 'get() returns cached reference (mutation leaks without set)', () => {
  const s = ST.createStore(memBE()); s.set('favs', ['a']); s.get('favs').push('LEAK');
  const s2view = s.get('favs'); return `in-memory: ${JSON.stringify(s2view)} (not persisted) — callers must use update()`;
});
await t('store', 'exportAll only known keys, prefix jt.', () => {
  const be = memBE({ 'jt.favs': '["a"]', 'other': '1', 'jt.unknown': '1' }); const s = ST.createStore(be);
  const e = s.exportAll(); assert.deepEqual(Object.keys(e.data), ['favs']); return JSON.stringify(e.data);
});

// ======================= TEXT =======================
const TX = await mod('text.js');
const PH = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'phrases.json'), 'utf8'));
const items = PH.items.map(TX.completeItem);
const KJ = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'kanji.json'), 'utf8'));
const bagId = items.find((it) => it.ja === '袋はいりません')?.id;
await t('text', 'phrase 袋はいりません exists', () => { assert.ok(bagId); return bagId; });
for (const q of ['ふくろ', 'bag', 'fukuro', 'Bag', 'BAG', 'フクロ', 'ﾌｸﾛ', 'FUKURO', 'fukuro wa', "don't need a bag", '袋', 'bag?']) {
  await t('text-search', `search «${q}» finds 袋はいりません`, () => {
    const r = TX.search(items, q); const pos = r.findIndex((x) => x.id === bagId);
    assert.ok(pos >= 0, `not found among ${r.length}`); return `rank ${pos + 1}/${r.length}`;
  });
}
await t('text', 'normalize ё/е, case, NFKC, macrons, katakana', () => {
  const pairs = [['BAG', 'bag'], ['My Bag', 'mybag'], ['kōhī', 'kohi'], ['Tōkyō', 'tokyo'], ['arigatou', 'arigato'], ['コーヒー', 'こひ'], ['ﾊﾟｽ', 'ぱす'], ["kin'en", 'kinen'], ['chūko', 'chuko'], ['ＡＴＭ', 'atm']];
  const bad = pairs.filter(([a, b]) => TX.normalize(a) !== b).map(([a, b]) => `${a}→${TX.normalize(a)} (exp ${b})`);
  assert.equal(bad.length, 0, bad.join('; ')); return 'all ' + pairs.length;
});
await t('text', 'long-vowel spellings equivalent: kōhī ≡ kohii ≡ koohii ≡ kouhii', () => {
  const variants = ['kōhī', 'kohi', 'kohii', 'koohii', 'kouhii'].map((v) => [v, TX.normalize(v)]);
  const set = new Set(variants.map((x) => x[1]));
  assert.equal(set.size, 1, JSON.stringify(variants)); return JSON.stringify(variants);
});
await t('text', 'long-vowel spellings: takushī ≡ takushii, rāmen ≡ raamen, ē ≡ ee', () => {
  const v = [['takushī', 'takushii'], ['rāmen', 'raamen'], ['ēgo', 'eego'], ['ōkii', 'ookii']].map(([a, b]) => [a, TX.normalize(a), b, TX.normalize(b)]);
  const bad = v.filter((x) => x[1] !== x[3]); assert.equal(bad.length, 0, JSON.stringify(bad)); return 'ok';
});
await t('text-search', 'search in real data with ё/е both ways (ещё / еще)', () => {
  const withYo = items.filter((it) => /ё/i.test(it.ru)); if (!withYo.length) return 'no ё in data';
  const w = withYo[0].ru.split(/\s+/).find((x) => /ё/i.test(x)).replace(/[^а-яё]/gi, '');
  const r1 = TX.search(items, w), r2 = TX.search(items, w.replace(/ё/g, 'е').replace(/Ё/g, 'Е'));
  assert.ok(r1.some((x) => x.id === withYo[0].id) && r2.some((x) => x.id === withYo[0].id)); return `«${w}»: ${r1.length}/${r2.length}`;
});
await t('text-search', 'search macron-less romaji in real data (arigato, gozaimasu)', () => {
  const r = TX.search(items, 'arigato'); assert.ok(r.some((x) => /ありがとう/.test(x.ja))); return `${r.length} hits`;
});
await t('text-search', 'search romaji with doubled vowel (arigatou / koohii-type input) in real data', () => {
  const r = TX.search(items, 'arigatou'); assert.ok(r.some((x) => /ありがとう/.test(x.ja))); return `${r.length} hits`;
});
await t('text-search', 'kanji search (real kanji.json): chuko / 中古 / б/у', () => {
  const k = KJ.items.map(TX.completeItem); const r = ['chuko', '中古', 'ちゅうこ', 'exit'].map((q) => [q, TX.search(k, q).length]);
  assert.ok(r.every(([, n]) => n > 0), JSON.stringify(r)); return JSON.stringify(r);
});
await t('text-search', 'empty / whitespace query → []', () => { assert.deepEqual(TX.search(items, '   '), []); assert.deepEqual(TX.search(items, ''), []); return 'ok'; });
await t('text', 'parseRuby / rubyToJa / rubyToKana', () => {
  const cases = [['袋[ふくろ]はいりません', '袋はいりません', 'ふくろはいりません'], ['{Wi-Fi|ワイファイ}のパスワード', 'Wi-Fiのパスワード', 'ワイファイのパスワード'],
    ['温[あたた]めてください', '温めてください', 'あたためてください'], ['〇〇駅[えき]はどこですか', '〇〇駅はどこですか', '〇〇えきはどこですか'], ['人々[ひとびと]', '人々', 'ひとびと']];
  const bad = cases.filter(([r, ja, kana]) => TX.rubyToJa(r) !== ja || TX.rubyToKana(r) !== kana);
  assert.equal(bad.length, 0, JSON.stringify(bad)); return cases.length + ' ok';
});
await t('text', 'ttsText strips 〇〇 placeholders', () => {
  const r = ['〇〇駅はどこですか', 'この電車は〇〇に行きますか', '次は〇〇、〇〇です'].map((ja) => TX.ttsText({ ja }));
  assert.ok(r.every((s) => !s.includes('〇'))); return r.join(' | ');
});
await t('text', 'kanaToHepburn (PLAN 1.6 conventions)', () => {
  const cases = [['きって', 'kitte'], ['まっちゃ', 'matcha'], ['きんえん', "kin'en"], ['コーヒー', 'kōhī'], ['とうきょう', 'tōkyō'], ['おおきい', 'ōkii'], ['せんえん', "sen'en"],
    ['いいえ', 'iie'], ['えいご', 'eigo'], ['しんぶん', 'shinbun'], ['ほんや', "hon'ya"], ['ちょっと', 'chotto'], ['ティッシュ', 'tisshu'], ['ふくろはいりません', 'fukurohairimasen'],
    ['ラストオーダー', 'rasutoōdā'], ['じゅうにまんはっせんえん', "jūnimanhassen'en"], ['いっぽん', 'ippon'], ['ここのか', 'kokonoka']];
  const bad = cases.filter(([k, r]) => TX.kanaToHepburn(k) !== r).map(([k, r]) => `${k}→${TX.kanaToHepburn(k)} (exp ${r})`);
  assert.equal(bad.length, 0, bad.join('; ')); return cases.length + ' ok';
});
// oracle cross-check of romaji conversion on every number reading 1..10000
const OR = await import('./oracle-numbers.mjs');
await t('text', 'kanaToHepburn vs QA oracle on number kana 1..10000', () => {
  let bad = []; for (let n = 1; n <= 10000; n++) { const k = OR.readInt(n).kana; const a = TX.kanaToHepburn(k).replace(/'/g, ''), o = OR.kanaToRomaji(k).replace(/'/g, ''); if (a !== o) bad.push(`${n}:${a}/${o}`); }
  assert.equal(bad.length, 0, bad.slice(0, 5).join(' ')); return '10000 ok';
});

// ======================= TTS =======================
await t('tts', 'Node: no speechSynthesis → speak() resolves "unsupported", status() sane', async () => {
  delete globalThis.speechSynthesis; const T = await mod('tts.js', '?a');
  const r = await T.speak('テスト'); const st = await T.init();
  assert.equal(r, 'unsupported'); assert.equal(st.supported, false); return r + ' ' + JSON.stringify(st);
});
function mockSynth({ voices = [], behaviour = 'error', throwOnSpeak = false } = {}) {
  const listeners = {};
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  globalThis.speechSynthesis = {
    speaking: false, pending: false, paused: false, spoken: [],
    getVoices: () => voices, cancel() {}, resume() {}, addEventListener: (e, f) => { listeners[e] = f; },
    speak(u) { if (throwOnSpeak) throw new Error('boom'); this.spoken.push(u); if (behaviour === 'error') setTimeout(() => u.onerror({ error: 'synthesis-failed' }), 5); else if (behaviour === 'end') setTimeout(() => u.onend(), 5); },
  };
  return globalThis.speechSynthesis;
}
await t('tts', 'zero voices: init() resolves ≤1.6s, hasJapanese=false, speak resolves error (no throw)', async () => {
  const s = mockSynth({ voices: [], behaviour: 'error' }); const T = await mod('tts.js', '?b');
  const t0 = Date.now(); const st = await T.init(); const dt = Date.now() - t0;
  const r = await T.speak('袋はご利用ですか', 0.7);
  assert.equal(st.hasJapanese, false); assert.ok(dt < 1700); assert.equal(s.spoken[0].lang, 'ja-JP'); assert.equal(s.spoken[0].rate, 0.7);
  return `init ${dt}ms, speak → ${r}, utter.lang=${s.spoken[0].lang}`;
});
await t('tts', 'Android-style voice lang "ja_JP" detected as Japanese', async () => {
  mockSynth({ voices: [{ name: 'Google 日本語', lang: 'ja_JP', localService: false }, { name: 'ru', lang: 'ru-RU', localService: true }], behaviour: 'end' });
  const T = await mod('tts.js', '?c'); const st = await T.init(); const r = await T.speak('テスト');
  assert.equal(st.hasJapanese, true); return st.jaVoiceName + ' → ' + r;
});
await t('tts', 'speak() throwing inside engine → resolves "error:…", never rejects', async () => {
  mockSynth({ voices: [], throwOnSpeak: true }); const T = await mod('tts.js', '?d'); const r = await T.speak('テスト'); assert.match(r, /^error:/); return r;
});
await t('tts', 'engine fires neither onend nor onerror → speak() promise settles (timeout)?', async () => {
  mockSynth({ voices: [], behaviour: 'silent' }); const T = await mod('tts.js', '?e');
  const r = await Promise.race([T.speak('テスト'), new Promise((res) => setTimeout(() => res('PENDING after 3s'), 3000))]);
  return r + ' (UI does not await it, so harmless)';
});
await t('tts', 'empty text → "unsupported" (no utterance)', async () => { const s = mockSynth({}); const T = await mod('tts.js', '?f'); const r = await T.speak(''); assert.equal(s.spoken.length, 0); return r; });
delete globalThis.speechSynthesis; delete globalThis.SpeechSynthesisUtterance;

// ======================= LAUNCHERS =======================
const UA = {
  pixel: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
};
const L0 = await mod('launchers.js', '?p');
await t('launchers', 'detectPlatform', () => {
  const r = [L0.detectPlatform({ userAgent: UA.pixel }), L0.detectPlatform({ userAgent: UA.iphone }), L0.detectPlatform({ userAgent: UA.desktop }),
    L0.detectPlatform({ userAgent: UA.ipadDesktop, platform: 'MacIntel', maxTouchPoints: 5 }), L0.detectPlatform({ userAgent: UA.ipadDesktop, platform: 'MacIntel', maxTouchPoints: 0 }), L0.detectPlatform(undefined)];
  assert.deepEqual(r, ['android', 'ios', 'other', 'ios', 'other', 'other']); return r.join(',');
});
const nav = (ua, extra = {}) => Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: ua, ...extra } });
const navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const launchers = {};
for (const [k, ua] of Object.entries({ android: UA.pixel, ios: UA.iphone, other: UA.desktop })) {
  nav(ua); const L = await mod('launchers.js', '?' + k);
  launchers[k] = { PLATFORM: L.PLATFORM, DEFAULT_LENS: L.DEFAULT_LENS, lens: Object.fromEntries(Object.entries(L.LENS_VARIANTS).map(([kk, v]) => [kk, v.url()])), lensDefaultUrl: L.lensVariant('nonexistent').url(),
    translateApp: L.translateAppUrl('Где туалет? & 100%'), translateWeb: L.translateUrl('Где туалет? & 100%'), maps: L.mapsSearchUrl('新宿駅'), transit: L.mapsTransitUrl('Shinjuku Station') };
}
if (navDesc) Object.defineProperty(globalThis, 'navigator', navDesc); else delete globalThis.navigator;
await t('launchers', 'Android: Lens intent with package + fallback; Translate intent', () => {
  const a = launchers.android; assert.equal(a.PLATFORM, 'android'); assert.equal(a.DEFAULT_LENS, 'lensApp');
  assert.match(a.lens.lensApp, /^intent:\/\/lens\.google\.com\/#Intent;scheme=https;package=com\.google\.ar\.lens;S\.browser_fallback_url=https%3A%2F%2Flens\.google\.com%2F;end$/);
  assert.match(a.lens.googleApp, /package=com\.google\.android\.googlequicksearchbox/);
  assert.match(a.translateApp, /^intent:\/\/translate\.google\.com\/\?sl=ru&tl=ja&text=[^#]*#Intent;scheme=https;package=com\.google\.android\.apps\.translate;S\.browser_fallback_url=([^;]+);end$/);
  const fb = decodeURIComponent(/S\.browser_fallback_url=([^;]+);end/.exec(a.translateApp)[1]);
  assert.equal(new URL(fb).searchParams.get('text'), 'Где туалет? & 100%');
  return JSON.stringify(a);
});
await t('launchers', 'iOS: no intent:// anywhere; google:// + googletranslate://', () => {
  const a = launchers.ios; assert.equal(a.PLATFORM, 'ios'); assert.equal(a.DEFAULT_LENS, 'googleApp');
  const all = JSON.stringify(a); assert.ok(!all.includes('intent://'), 'intent on iOS');
  assert.equal(a.lens.googleApp, 'google://'); assert.match(a.translateApp, /^googletranslate:\/\/\?sl=ru&tl=ja&text=/);
  return JSON.stringify(a);
});
await t('launchers', 'desktop/other: web Lens only; unknown variant falls back', () => {
  const a = launchers.other; assert.deepEqual(Object.keys(a.lens), ['web']); assert.equal(a.lensDefaultUrl, 'https://lens.google.com/'); return JSON.stringify(a);
});
await t('launchers', 'web Translate / Maps URLs correctly encoded', () => {
  const a = launchers.android; const u = new URL(a.translateWeb);
  assert.equal(u.searchParams.get('text'), 'Где туалет? & 100%'); assert.equal(u.searchParams.get('op'), 'translate');
  assert.equal(new URL(a.maps).searchParams.get('query'), '新宿駅'); assert.equal(new URL(a.transit).searchParams.get('travelmode'), 'transit');
  return a.maps + ' ' + a.transit;
});
await t('launchers', 'translateAppUrl: Android intent - which platform when ctx is "other" (desktop)?', () => launchers.other.translateApp.slice(0, 60) + '…');

// ======================= report =======================
fs.mkdirSync(path.join(here, 'out'), { recursive: true });
fs.writeFileSync(path.join(here, 'out', 'unit.json'), JSON.stringify(results, null, 1));
const fails = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} [${r.area}] ${r.name}${r.ok ? '' : '\n      → ' + r.actual}`);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(0);
