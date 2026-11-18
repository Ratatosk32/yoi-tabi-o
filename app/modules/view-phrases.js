// Вкладка «Фразы»: категории, поиск по ru/ja/kana/romaji, избранное, озвучка, «показать».
import { h, clear, rubyEl, speakButtons, chip, showFullscreen, toast } from './ui.js';
import { search } from './text.js';

const SPECIAL = {
  fav: { ru: 'Избранное', icon: '★' },
  hear: { ru: 'Скажет персонал', icon: '聞' },
};

export function render(ctx, root, params) {
  const s = ctx.settings();
  let cat = params[0] || s.phrasesCat || 'basics';
  let query = '';
  const items = ctx.allItems();

  const list = h('div.list#phrase-list');
  const input = h('input.search#phrase-search', {
    type: 'search', placeholder: 'Поиск: пакет, fukuro, ふくろ…', autocomplete: 'off',
    'aria-label': 'Поиск фраз', enterkeyhint: 'search',
  });
  const chips = h('div.chips', { role: 'tablist', 'aria-label': 'Категории' });

  function favs() { return new Set(ctx.store.get('favs', [])); }

  function drawChips() {
    clear(chips);
    const add = (id, label, icon) => chips.append(chip([h('span.ci', { lang: 'ja' }, icon), ' ', label], !query && cat === id, () => {
      cat = id; query = ''; input.value = ''; ctx.setSetting('phrasesCat', id); draw();
    }, { 'data-cat': id }));
    add('fav', SPECIAL.fav.ru, SPECIAL.fav.icon);
    add('hear', SPECIAL.hear.ru, SPECIAL.hear.icon);
    for (const c of ctx.data.categories) add(c.id, c.ru, c.icon);
  }

  function current() {
    if (query) return search(items, query);
    if (cat === 'fav') { const f = favs(); return items.filter((it) => f.has(it.id)); }
    if (cat === 'hear') return items.filter((it) => it.kind === 'hear');
    return items.filter((it) => it.cat === cat);
  }

  function draw() {
    drawChips();
    clear(list);
    const arr = current();
    const title = query ? `Найдено: ${arr.length}` : (SPECIAL[cat]?.ru || ctx.data.catById[cat]?.ru || '');
    list.append(h('h2.section', title));
    if (cat === 'hear' && !query) list.append(h('p.hint', 'Это вы услышите от персонала. Тренируйте узнавание на слух: «Учёба» → «Слушание».'));
    if (!arr.length) {
      list.append(h('p.empty', query ? 'Ничего не найдено. Попробуйте по-русски, ромадзи или каной.' : cat === 'fav' ? 'Пока пусто. Нажмите ☆ у фразы, чтобы добавить.' : 'Пусто.'));
      return;
    }
    const f = favs();
    for (const it of arr) list.append(phraseCard(ctx, it, f.has(it.id), draw));
  }

  let t = null;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { query = input.value.trim(); draw(); }, 120);
  });

  root.append(
    h('header.top',
      h('h1', 'Фразы'),
      h('label.toggle',
        h('input', { type: 'checkbox', checked: s.furigana, on: { change: (e) => { ctx.setSetting('furigana', e.target.checked); draw(); } } }),
        h('span', 'фуригана')),
    ),
    input, chips, list,
  );
  draw();
}

export function phraseCard(ctx, it, isFav, onChange) {
  const s = ctx.settings();
  const favBtn = h('button.btn.icon.fav' + (isFav ? '.on' : ''), {
    type: 'button', title: isFav ? 'Убрать из избранного' : 'В избранное', 'aria-label': 'Избранное', 'aria-pressed': isFav ? 'true' : 'false',
    on: {
      click: (e) => {
        e.stopPropagation();
        ctx.store.update('favs', [], (arr) => {
          const set = new Set(arr);
          if (set.has(it.id)) set.delete(it.id); else set.add(it.id);
          return [...set];
        });
        onChange && onChange();
      },
    },
  }, isFav ? '★' : '☆');
  const showBtn = h('button.btn.icon', {
    type: 'button', title: 'Показать японцу', 'aria-label': 'Показать на весь экран',
    on: { click: (e) => { e.stopPropagation(); showFullscreen({ lines: [{ ruby: it.ruby }], caption: it.ru, speakText: it.tts || it.ja }); } },
  }, '⤢');

  return h('article.phrase' + (it.kind === 'hear' ? '.hear' : ''), { 'data-id': it.id },
    it.kind === 'hear' ? h('div.badge', 'Вы услышите') : it.kind === 'pattern' && it.pattern ? h('div.badge.pat', { lang: 'ja' }, it.pattern) : null,
    h('div.jp', rubyEl(it.ruby, { furigana: s.furigana })),
    h('div.romaji', it.romaji),
    h('div.ru', it.ru),
    it.note ? h('div.note', it.note) : null,
    h('div.actions', speakButtons(it), showBtn, favBtn),
  );
}

export function copyOrToast(text) {
  navigator.clipboard?.writeText(text).then(() => toast('Скопировано'), () => toast(text));
}
