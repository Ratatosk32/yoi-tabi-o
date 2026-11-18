// Вкладка «Кандзи»: шпаргалка знаков, вывесок, ценников и меню.
import { h, clear, rubyEl, chip, speakItem } from './ui.js';
import { search } from './text.js';

export function render(ctx, root) {
  const { groups, items } = ctx.data.kanji;
  let group = 'all';
  let query = '';
  const grid = h('div.kgrid#kanji-grid');
  const chips = h('div.chips');
  const input = h('input.search', { type: 'search', placeholder: 'Поиск: выход, chūko, 中古…', 'aria-label': 'Поиск кандзи' });

  function draw() {
    clear(chips);
    chips.append(chip('Все', group === 'all' && !query, () => { group = 'all'; query = ''; input.value = ''; draw(); }));
    for (const g of groups) chips.append(chip(g.ru, group === g.id && !query, () => { group = g.id; query = ''; input.value = ''; draw(); }));
    clear(grid);
    const arr = query ? search(items, query) : items.filter((it) => group === 'all' || it.group === group);
    let lastGroup = null;
    for (const it of arr) {
      if (!query && group === 'all' && it.group !== lastGroup) {
        grid.append(h('h2.section.span', groups.find((g) => g.id === it.group).ru));
        lastGroup = it.group;
      }
      grid.append(h('button.kcell', {
        type: 'button', 'data-id': it.id, title: 'Нажмите, чтобы услышать',
        on: { click: () => speakItem({ ja: it.kana }) },
      },
      h('div.kja', rubyEl(it.ruby, { furigana: false, cls: 'ja big' })),
      h('div.kkana', { lang: 'ja' }, it.kana),
      h('div.romaji', it.romaji),
      h('div.ru', it.ru),
      it.note ? h('div.note', it.note) : null));
    }
    if (!arr.length) grid.append(h('p.empty', 'Ничего не найдено.'));
  }
  let t = null;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { query = input.value.trim(); draw(); }, 120); });
  root.append(h('header.top', h('h1', 'Кандзи')), h('p.hint', 'Узнавать, а не писать. Нажмите на знак — прозвучит чтение. Незнакомая вывеска → Lens во вкладке «Инструменты».'), input, chips, grid);
  draw();
}
