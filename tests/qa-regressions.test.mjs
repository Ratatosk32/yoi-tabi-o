// Регрессионные тесты на баги из qa/REPORT.md (B1–B16 и заметки).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../app/modules/store.js';
import { grade, buildSession, stats, studyWeek } from '../app/modules/srs.js';
import { normalize, search, ttsText } from '../app/modules/text.js';
import * as N from '../app/modules/numbers.js';
import { translateAppUrl, LENS_VARIANTS_BY_PLATFORM } from '../app/modules/launchers.js';

function mem() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
const dump = (data) => JSON.stringify({ app: 'japan-trip', format: 1, data });

test('B1: восстановление копии с пустыми favs/history не стирает текущие', () => {
  const s = createStore(mem());
  s.set('favs', ['a', 'b']);
  s.set('history', ['x']);
  s.importAll(dump({ favs: [], history: [] }), 'merge');
  assert.deepEqual(s.get('favs'), ['a', 'b']);
  assert.deepEqual(s.get('history'), ['x']);
  // объекты с id сливаются по id, примитивы — объединением
  s.set('userItems', [{ id: 'u.1', ja: 'あ' }]);
  s.importAll(dump({ userItems: [{ id: 'u.1', ja: 'い' }, { id: 'u.2', ja: 'う' }] }), 'merge');
  assert.deepEqual(s.get('userItems').map((x) => x.ja), ['い', 'う']);
});

test('B2: в одной сессии фраза встречается один раз (режимы не выдают друг друга)', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: 'p' + i, kind: 'say' }));
  const q = buildSession({ items, state: {}, modes: ['ja2en', 'en2ja'], today: '2026-11-20', newLimit: 12 });
  const ids = q.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'дубли: ' + ids);
  assert.equal(q.length, 12, '12 новых = 12 разных фраз');
  // RU→JA для новой фразы — только после того, как JA→RU дошла до коробки 2+
  assert.ok(q.every((x) => x.mode === 'ja2en'));
  const st = { 'p0|ja2en': { box: 2, due: '2026-11-25' } };
  const q2 = buildSession({ items: items.slice(0, 1), state: st, modes: ['ja2en', 'en2ja'], today: '2026-11-20', newLimit: 5 });
  assert.deepEqual(q2.map((x) => x.key), ['p0|en2ja']);
  // обе должные в один день → в сессии только одна
  const st3 = { 'p0|ja2en': { box: 3, due: '2026-11-19' }, 'p0|en2ja': { box: 2, due: '2026-11-19' } };
  assert.equal(buildSession({ items: items.slice(0, 1), state: st3, modes: ['ja2en', 'en2ja'], today: '2026-11-20' }).length, 1);
});

test('B6: импорт с неверными типами не ломается и не портит данные', () => {
  const s = createStore(mem());
  s.set('favs', ['a']);
  assert.throws(() => s.importAll(dump(null)), /копи|backup/i);
  assert.throws(() => s.importAll('not json'), /копи|backup/i);
  const changed = s.importAll(dump({ favs: 'oops', srs: [1, 2], settings: { furigana: false } }), 'merge');
  assert.deepEqual(s.get('favs'), ['a']);
  assert.ok(!changed.includes('favs') && !changed.includes('srs') && changed.includes('settings'));
});

test('B7/B8: grade и stats устойчивы к мусору в коробке', () => {
  assert.equal(grade({ box: null, due: '2026-11-20' }, 'good', '2026-11-20').due, '2026-11-21');
  assert.equal(grade({ box: '3', due: '2026-11-20' }, 'good', '2026-11-20').box, 4);
  assert.equal(grade({ box: 9 }, 'good', '2026-11-20').box, 5);
  const st = stats({ a: { box: 7, due: '2026-11-20' }, b: { box: 'x', due: '2026-11-20' } }, '2026-11-20');
  assert.equal(st.boxes.length, 5);
  assert.equal(st.boxes.reduce((x, y) => x + y, 0), 2);
});

test('B9: дата старта в будущем — день 1, неделя 1', () => {
  assert.deepEqual(studyWeek('2026-11-25', '2026-11-18'), { day: 1, week: 1 });
});

test('B10: поиск без макронов с удвоенными гласными (kohii, koohii, takushii, raamen)', () => {
  const items = [{ id: 'c', ja: 'コーヒー', kana: 'コーヒー', romaji: 'kōhī' }, { id: 't', ja: 'タクシー', kana: 'タクシー', romaji: 'takushī' }, { id: 'r', ja: 'ラーメン', kana: 'ラーメン', romaji: 'rāmen' }];
  for (const [q, id] of [['kohii', 'c'], ['koohii', 'c'], ['kohi', 'c'], ['takushii', 't'], ['raamen', 'r'], ['ramen', 'r']]) {
    assert.ok(search(items, q).some((x) => x.id === id), q);
  }
  assert.equal(normalize('kōhī'), normalize('koohii'));
});

test('B12: dateReading отвергает несуществующие даты', () => {
  assert.throws(() => N.dateReading(2, 30));
  assert.throws(() => N.dateReading(4, 31));
  assert.doesNotThrow(() => N.dateReading(2, 29));
  assert.doesNotThrow(() => N.dateReading(12, 31));
});

test('B13: parseDigits понимает 万 и 千', () => {
  assert.equal(N.parseDigits('12万8千'), 128000);
  assert.equal(N.parseDigits('12万8千円'), 128000);
  assert.equal(N.parseDigits('12万5,500円'), 125500);
  assert.equal(N.parseDigits('3千'), 3000);
  assert.equal(N.parseDigits('25万'), 250000);
});

test('B14: на десктопе нет Android intent:// ссылок', () => {
  assert.ok(translateAppUrl('test', 'ru', 'ja', 'other').startsWith('https://'));
  for (const v of Object.values(LENS_VARIANTS_BY_PLATFORM.other)) assert.ok(v.url().startsWith('https://'));
});

test('Заметка QA: yenMixed(1000) пишется как на ценнике', () => {
  assert.equal(N.yenMixed(1000), '1,000円');
  assert.equal(N.yenMixed(3000), '3,000円');
  assert.equal(N.yenMixed(980), '980円');
  assert.equal(N.yenMixed(128000), '12万8千円');
});

test('Заметка QA: 〇〇 в озвучке читается まるまる, фраза не обрывается', () => {
  assert.equal(ttsText({ ja: '次は〇〇、〇〇です' }), '次はまるまる、まるまるです');
  assert.equal(ttsText({ ja: 'この電車は〇〇に行きますか' }), 'この電車はまるまるに行きますか');
  assert.equal(ttsText({ ja: 'お部屋は〇階です' }), 'お部屋はまる階です');
});
