// Words tab: Signs (cheat sheet for signs, price tags and menus) and Dictionary (JMdict).
import { h, clear, rubyEl, speakItem, openSheet, pickerButton, chip } from './ui.js';
import { renderDictionary } from './view-dict.js';
import { search } from './text.js';

export function render(ctx, root, params = []) {
  const sub = params[0] === 'dict' ? 'dict' : 'signs';
  // two equal segments (no sideways scrolling)
  root.append(h('header.top', h('h1', 'Words')),
    h('div.chips.subnav.seg', { 'aria-label': 'Words sections' },
      chip('Signs', sub === 'signs', () => ctx.go('#/kanji'), { 'data-sub': 'signs' }),
      chip('Dictionary', sub === 'dict', () => ctx.go('#/kanji/dict'), { 'data-sub': 'dict' })));
  if (sub === 'dict') {
    const box = h('div#dict-box');
    root.append(box);
    renderDictionary(ctx, box, params[1] || '');
    return;
  }
  const { groups, items } = ctx.data.kanji;
  let group = 'all';
  let query = '';
  const grid = h('div.kgrid#kanji-grid');
  const bar = h('div.chips.toolbar');
  const input = h('input.search', { type: 'search', placeholder: 'Search: exit, chūko, 中古…', 'aria-label': 'Search kanji' });

  function draw() {
    clear(bar);
    const inGroup = (id) => (id === 'all' ? items : items.filter((it) => it.group === id));
    const name = (id) => (id === 'all' ? 'All groups' : groups.find((g) => g.id === id).en);
    const setGroup = (id) => { group = id; query = ''; input.value = ''; draw(); window.scrollTo(0, 0); };
    // long groups (food has ~100 entries): search works inside the selected group
    input.placeholder = group === 'all' ? 'Search: exit, chūko, 中古…' : `Search in ${name(group)}…`;
    bar.append(pickerButton({
      id: 'kanji-picker', title: 'Group', label: name(group), count: inGroup(group).length,
      onClick: () => openSheet({
        title: 'Kanji group', current: query ? null : group, attr: 'data-group', onPick: setGroup,
        options: ['all', ...groups.map((g) => g.id)].map((id) => ({ id, label: name(id), count: inGroup(id).length })),
      }),
    }));
    bar.classList.toggle('is-off', !!query);
    clear(grid);
    const arr = query ? search(inGroup(group), query) : inGroup(group);
    let lastGroup = null;
    for (const it of arr) {
      if (!query && group === 'all' && it.group !== lastGroup) {
        grid.append(h('h2.section.span', groups.find((g) => g.id === it.group).en));
        lastGroup = it.group;
      }
      grid.append(h('button.kcell', {
        type: 'button', 'data-id': it.id, title: 'Tap to hear it',
        on: { click: () => speakItem({ ja: it.kana }) },
      },
      h('div.kja', rubyEl(it.ruby, { furigana: false, cls: 'ja big' })),
      h('div.kkana', { lang: 'ja' }, it.kana),
      h('div.romaji', it.romaji),
      h('div.en', it.en),
      it.note ? h('div.note', it.note) : null));
    }
    if (query) {
      grid.prepend(h('div.span.found-line', h('h2.section', group === 'all' ? `Found: ${arr.length}` : `Found: ${arr.length} in ${name(group)}`),
        group === 'all' ? null : h('button.btn.small#kanji-search-all', { type: 'button', on: { click: () => { const q = query; group = 'all'; input.value = q; query = q; draw(); } } }, 'Search all groups')));
    }
    if (!arr.length) grid.append(h('div.empty.span', h('p', `Nothing found for “${query}”.`), h('p.small', 'Try English, romaji or the kanji itself.'),
      h('button.btn', { type: 'button', on: { click: () => { query = ''; input.value = ''; draw(); input.focus(); } } }, 'Clear search')));
  }
  let t = null;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { query = input.value.trim(); draw(); }, 120); });
  root.append(h('p.hint', 'Recognise, don’t write. Tap a sign to hear its reading. Unknown sign? Use Camera on the Tools tab.'), input, bar, grid);
  draw();
}
