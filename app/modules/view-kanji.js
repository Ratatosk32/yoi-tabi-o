// Kanji tab: cheat sheet for signs, price tags and menus.
import { h, clear, rubyEl, speakItem, openSheet, pickerButton } from './ui.js';
import { search } from './text.js';

export function render(ctx, root) {
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
    bar.append(pickerButton({
      id: 'kanji-picker', title: 'Group', label: name(group), count: inGroup(group).length,
      onClick: () => openSheet({
        title: 'Kanji group', current: query ? null : group, attr: 'data-group', onPick: setGroup,
        options: ['all', ...groups.map((g) => g.id)].map((id) => ({ id, label: name(id), count: inGroup(id).length })),
      }),
    }));
    bar.classList.toggle('is-off', !!query);
    clear(grid);
    const arr = query ? search(items, query) : items.filter((it) => group === 'all' || it.group === group);
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
    if (query) grid.prepend(h('h2.section.span', `Found: ${arr.length}`));
    if (!arr.length) grid.append(h('div.empty.span', h('p', `Nothing found for “${query}”.`), h('p.small', 'Try English, romaji or the kanji itself.'),
      h('button.btn', { type: 'button', on: { click: () => { query = ''; input.value = ''; draw(); input.focus(); } } }, 'Clear search')));
  }
  let t = null;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { query = input.value.trim(); draw(); }, 120); });
  root.append(h('header.top', h('h1', 'Kanji')), h('p.hint', 'Recognise, don’t write. Tap a sign to hear its reading. Unknown sign? Use Camera on the Tools tab.'), input, bar, grid);
  draw();
}
