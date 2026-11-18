// Kanji tab: cheat sheet for signs, price tags and menus.
import { h, clear, rubyEl, chip, speakItem } from './ui.js';
import { search } from './text.js';

export function render(ctx, root) {
  const { groups, items } = ctx.data.kanji;
  let group = 'all';
  let query = '';
  const grid = h('div.kgrid#kanji-grid');
  const chips = h('div.chips');
  const input = h('input.search', { type: 'search', placeholder: 'Search: exit, chūko, 中古…', 'aria-label': 'Search kanji' });

  function draw() {
    clear(chips);
    chips.append(chip('All', group === 'all' && !query, () => { group = 'all'; query = ''; input.value = ''; draw(); }));
    for (const g of groups) chips.append(chip(g.en, group === g.id && !query, () => { group = g.id; query = ''; input.value = ''; draw(); }));
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
    if (!arr.length) grid.append(h('p.empty', 'Nothing found.'));
  }
  let t = null;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { query = input.value.trim(); draw(); }, 120); });
  root.append(h('header.top', h('h1', 'Kanji')), h('p.hint', 'Recognise, don’t write. Tap a sign to hear its reading. An unknown sign → Lens on the Tools tab.'), input, chips, grid);
  draw();
}
