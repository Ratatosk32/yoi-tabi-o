import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, buildSession, addDays, studyWeek, stats, modesFor, keyOf } from '../app/modules/srs.js';
import { createStore } from '../app/modules/store.js';

test('Leitner: intervals and boxes', () => {
  const d = '2026-11-20';
  let s = grade(undefined, 'good', d);
  assert.deepEqual(s, { box: 2, due: '2026-11-21', seen: 1, lapses: 0 });
  s = grade(s, 'good', '2026-11-21');
  assert.equal(s.box, 3); assert.equal(s.due, '2026-11-23');
  s = grade(s, 'good', '2026-11-23'); assert.equal(s.box, 4); assert.equal(s.due, '2026-11-27');
  s = grade(s, 'good', '2026-11-27'); assert.equal(s.box, 5); assert.equal(s.due, '2026-12-04');
  s = grade(s, 'good', '2026-12-04'); assert.equal(s.box, 5); assert.equal(s.due, '2026-12-11');
  s = grade(s, 'again', '2026-12-11'); assert.equal(s.box, 1); assert.equal(s.due, '2026-12-11'); assert.equal(s.lapses, 1);
  s = grade(s, 'hard', '2026-12-11'); assert.equal(s.box, 1); assert.equal(s.due, '2026-12-12');
  assert.throws(() => grade(s, 'bogus'));
});

test('addDays across month/year boundaries', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('buildSession: due before new, new limit, modes by kind', () => {
  const items = [
    { id: 'a', kind: 'say' }, { id: 'b', kind: 'say' }, { id: 'c', kind: 'hear' }, { id: 'd', kind: 'card' },
  ];
  assert.deepEqual(modesFor(items[2]), ['audio']);
  assert.deepEqual(modesFor(items[3]), []);
  const state = { [keyOf('b', 'ja2en')]: { box: 2, due: '2026-11-19' } };
  const q = buildSession({ items, state, modes: ['ja2en', 'audio'], today: '2026-11-20', newLimit: 2 });
  assert.equal(q[0].key, 'b|ja2en');
  assert.equal(q[0].isNew, false);
  assert.equal(q.filter((x) => x.isNew).length, 2);
  assert.ok(!q.some((x) => x.id === 'd'));
  // not due (due in the future) are excluded
  const q2 = buildSession({ items, state: { 'a|ja2en': { box: 3, due: '2026-12-01' } }, modes: ['ja2en'], today: '2026-11-20', newLimit: 0 });
  assert.equal(q2.length, 0);
});

test('studyWeek and stats', () => {
  assert.deepEqual(studyWeek('2026-11-18', '2026-11-18'), { day: 1, week: 1 });
  assert.deepEqual(studyWeek('2026-11-18', '2026-11-25'), { day: 8, week: 2 });
  assert.deepEqual(studyWeek('2026-11-18', '2026-12-20'), { day: 33, week: 3 });
  const st = stats({ x: { box: 1, due: '2026-11-18' }, y: { box: 5, due: '2026-12-30' } }, '2026-11-20');
  assert.deepEqual(st, { total: 2, due: 1, boxes: [1, 0, 0, 0, 1] });
});

function memBackend() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

test('store: get/set/update, corrupted data', () => {
  const be = memBackend();
  const s = createStore(be);
  assert.deepEqual(s.get('favs', []), []);
  s.update('favs', [], (a) => [...a, 'x']);
  assert.deepEqual(createStore(be).get('favs', []), ['x']);
  be.setItem('jt.srs', '{oops');
  assert.deepEqual(createStore(be).get('srs', {}), {});
});

test('store: export/import with merge', () => {
  const a = createStore(memBackend());
  a.set('srs', { 'k|ja2en': { box: 2, due: '2026-11-20' } });
  a.set('favs', ['p1']);
  a.set('cards', { hotel: { name: 'テスト' } });
  const dump = JSON.stringify(a.exportAll());
  const b = createStore(memBackend());
  b.set('favs', ['p2']);
  b.set('srs', { 'z|audio': { box: 1, due: '2026-11-19' } });
  const changed = b.importAll(dump, 'merge');
  assert.ok(changed.includes('srs'));
  assert.deepEqual(b.get('favs').sort(), ['p1', 'p2']);
  assert.ok(b.get('srs')['k|ja2en'] && b.get('srs')['z|audio']);
  assert.equal(b.get('cards').hotel.name, 'テスト');
  assert.throws(() => b.importAll('{"app":"other","data":{}}'));
});
