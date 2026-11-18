// Dictionary UI (JMdict): search box, download status, ranked results, and the "Dictionary matches"
// block for the Phrases search. Rows reuse the phrase-row layout (text left, actions right).
import { h, clear, speakItem, ico, showFullscreen, toast } from './ui.js';
import * as D from './dict.js';

const POS = {
  n: 'noun', v1: 'verb', v5: 'verb', vk: 'verb', vs: 'suru verb', 'adj-i': 'i-adj', 'adj-na': 'na-adj', adj: 'adj',
  adv: 'adverb', pron: 'pronoun', prt: 'particle', conj: 'conjunction', int: 'interjection', exp: 'expression',
  ctr: 'counter', num: 'number', pref: 'prefix', suf: 'suffix', aux: 'auxiliary',
};
const posText = (pos) => (pos || '').split(',').map((p) => POS[p.trim()] || p.trim()).filter((x, i, a) => x && a.indexOf(x) === i).join(', ');

export function isDictFav(ctx, id) { return (ctx.store.get('dictFavs', []) || []).some((x) => x.id === id); }

export function toggleDictFav(ctx, e) {
  let on = false;
  ctx.store.update('dictFavs', [], (arr) => {
    if (arr.some((x) => x.id === e.id)) return arr.filter((x) => x.id !== e.id);
    on = true;
    return [...arr, { id: e.id, ja: e.ja, kana: e.kana, romaji: e.romaji, en: e.en, pos: e.pos || '' }];
  });
  return on;
}

/** One dictionary entry: headword, reading, romaji, glosses, part of speech; play / show / favorite. */
export function dictRow(ctx, e) {
  const say = () => speakItem({ ja: e.ja, tts: e.kana }, 1.0); // the kana reading avoids TTS kanji misreadings
  const fav = isDictFav(ctx, e.id);
  const favBtn = h('button.btn.icon.fav' + (fav ? '.on' : ''), {
    type: 'button', 'aria-label': 'Favorite', 'aria-pressed': fav ? 'true' : 'false', title: fav ? 'Remove from favorites' : 'Add to favorites',
    on: { click: (ev) => {
      ev.stopPropagation();
      const on = toggleDictFav(ctx, e);
      favBtn.classList.toggle('on', on);
      favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      favBtn.replaceChildren(ico(on ? 'star-fill' : 'star'));
      toast(on ? 'Added to favorites' : 'Removed from favorites', 1500);
    } },
  }, ico(fav ? 'star-fill' : 'star'));
  return h('article.phrase.dict-entry', { 'data-dict-id': String(e.id) },
    h('div.phrase-head',
      h('div.phrase-text',
        h('div.jp', h('span.ja', { lang: 'ja' }, e.ja)),
        e.kana !== e.ja ? h('div.kana-line', { lang: 'ja' }, e.kana) : null,
        h('div.romaji', e.romaji),
        h('div.en', e.en),
        h('div.dict-meta', posText(e.pos), e.core ? null : ' · less common')),
      h('div.actions',
        h('button.btn.icon', { type: 'button', 'aria-label': 'Play', title: 'Play', on: { click: (ev) => { ev.stopPropagation(); say(); } } }, ico('play')),
        h('button.btn.icon', { type: 'button', 'aria-label': 'Show full screen', title: 'Show to a Japanese person', on: { click: (ev) => {
          ev.stopPropagation();
          showFullscreen({ lines: [{ text: e.ja }, ...(e.kana !== e.ja ? [{ text: e.kana, small: true }] : [])], caption: e.en, speakText: e.kana });
        } } }, ico('show')),
        favBtn)));
}

/** Download status line that updates itself. */
export function statusLine() {
  const el = h('p.small.dict-status#dict-status', { role: 'status' }, D.progressText());
  const off = D.onChange((s) => { if (!el.isConnected) { off(); return; } el.textContent = D.progressText(s); el.dataset.state = s.status; });
  el.dataset.state = D.status().status;
  return el;
}

/** The Dictionary pane of the Words tab. */
export function renderDictionary(ctx, box, initial = '') {
  const input = h('input.search#dict-search', {
    type: 'search', placeholder: 'English, kana, romaji or kanji: coffee, kōhī, コーヒー', 'aria-label': 'Search the dictionary', enterkeyhint: 'search', value: initial,
  });
  const list = h('div.list#dict-results');
  let q = initial;
  const draw = () => {
    clear(list);
    const s = D.status();
    if (!q) {
      list.append(h('div.empty', h('p', 'Look up any word.'), h('p.small', 'Results are ranked: everyday and travel words first. Tap ▶ to hear it, ★ to keep it with your favorite phrases.')));
      return;
    }
    if (s.status === 'idle' || (s.status === 'loading' && !s.loaded)) { list.append(h('p.loading', { role: 'status' }, 'Loading the dictionary…')); return; }
    const res = D.search(q, 40);
    list.append(h('h2.section', `Found: ${res.length}${res.length === 40 ? '+' : ''}`));
    if (!res.length) {
      list.append(h('div.empty', h('p', `No dictionary entry for “${q}”.`),
        h('p.small', s.status === 'ready' ? 'Try another spelling, English or kana.' : 'The full dictionary is still loading; try again in a moment.')));
      return;
    }
    res.forEach((e) => list.append(dictRow(ctx, e)));
  };
  let t = null;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { q = input.value.trim(); draw(); }, 120); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  // results appear (or get fuller) as the dictionary loads
  const off = D.onChange(() => { if (!box.isConnected) { off(); return; } if (q) draw(); });
  box.append(input, statusLine(), list,
    h('p.small.dict-credit', 'Dictionary data: JMdict © EDRDG, CC BY-SA 4.0. ',
      h('button.linklike#dict-credits', { type: 'button', on: { click: () => ctx.go('#/tools/credits') } }, 'Credits')));
  draw();
  D.load().catch(() => { /* status line shows the error; the SW caches the files once online */ });
}

/** "Dictionary matches" under the Phrases search (null when there is nothing to show). */
export function dictMatches(ctx, query, limit = 5) {
  if (!query || D.status().status === 'idle') return null;
  const res = D.search(query, limit);
  if (!res.length) return null;
  return h('section.dict-matches#dict-matches',
    h('h2.section', 'Dictionary matches'),
    res.map((e) => dictRow(ctx, e)),
    h('button.btn.wide#dict-more', { type: 'button', on: { click: () => ctx.go('#/kanji/dict/' + encodeURIComponent(query)) } }, 'More in the dictionary'));
}

/** Favorites list section for dictionary words. */
export function dictFavsSection(ctx) {
  const favs = ctx.store.get('dictFavs', []) || [];
  if (!favs.length) return null;
  return h('section.dict-matches#dict-favs', h('h2.section', `Dictionary words · ${favs.length}`), favs.map((e) => dictRow(ctx, e)));
}
