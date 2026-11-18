// Phrases tab: categories, search in en/ja/kana/romaji, favourites, speech, "show".
import { h, clear, rubyEl, speakButtons, speakItem, showFullscreen, toast, ico, openSheet, pickerButton } from './ui.js';
import { search } from './text.js';

const SPECIAL = {
  fav: { en: 'Favorites', icon: '★' },
  hear: { en: 'Staff will say', icon: '聞' },
};

export function render(ctx, root, params) {
  const s = ctx.settings();
  let cat = params[0] || s.phrasesCat || 'basics';
  let query = '';
  const items = ctx.allItems();

  const list = h('div.list#phrase-list');
  const input = h('input.search#phrase-search', {
    type: 'search', placeholder: 'Search: bag, fukuro, ふくろ…', autocomplete: 'off',
    'aria-label': 'Search phrases', enterkeyhint: 'search',
  });
  const bar = h('div.chips.toolbar', { 'aria-label': 'Category' });
  let lastCat = cat === 'fav' ? 'basics' : cat; // where the favorites toggle returns to

  function favs() { return new Set(ctx.store.get('favs', [])); }

  const inCat = (id) => (id === 'fav' ? items.filter((it) => favs().has(it.id)) : id === 'hear' ? items.filter((it) => it.kind === 'hear') : items.filter((it) => it.cat === id));
  const catName = (id) => SPECIAL[id]?.en || ctx.data.catById[id]?.en || '';
  const catIcon = (id) => SPECIAL[id]?.icon || ctx.data.catById[id]?.icon || '';
  function setCat(id) {
    if (id !== 'fav') lastCat = id;
    cat = id; query = ''; input.value = '';
    ctx.setSetting('phrasesCat', id);
    draw();
    window.scrollTo(0, 0);
  }
  function openPicker() {
    const ids = ['hear', ...ctx.data.categories.map((c) => c.id), 'fav'];
    openSheet({
      title: 'Category', current: query ? null : cat, attr: 'data-cat', onPick: setCat,
      options: ids.map((id) => ({ id, label: catName(id), icon: catIcon(id), count: inCat(id).length })),
    });
  }
  // One row, nothing scrolls sideways: the category button opens a sheet, the star toggles favorites
  function drawBar() {
    clear(bar);
    const favOn = !query && cat === 'fav';
    const shown = cat === 'fav' ? lastCat : cat;
    bar.append(
      pickerButton({ id: 'cat-picker', title: 'Category', icon: catIcon(shown), label: catName(shown), count: inCat(shown).length, onClick: openPicker }),
      h('button.btn.fav-filter' + (favOn ? '.on' : ''), {
        type: 'button', 'data-cat': 'fav', 'aria-pressed': favOn ? 'true' : 'false', title: 'Favorites',
        on: { click: () => setCat(favOn ? lastCat : 'fav') },
      }, ico(favOn ? 'star-fill' : 'star'), 'Favorites'));
    bar.classList.toggle('is-off', !!query || favOn); // the category is not what the list shows right now
  }

  function current() {
    if (query) return search(items, query);
    if (cat === 'fav') { const f = favs(); return items.filter((it) => f.has(it.id)); }
    if (cat === 'hear') return items.filter((it) => it.kind === 'hear');
    return items.filter((it) => it.cat === cat);
  }

  function draw() {
    drawBar();
    clear(list);
    const arr = current();
    // The category name is on the picker button; a heading is only needed for what the button does not say
    if (query) list.append(h('h2.section', `Found: ${arr.length}`));
    else if (cat === 'fav') list.append(h('h2.section', arr.length ? `Favorites · ${arr.length}` : 'Favorites'));
    if (cat === 'hear' && !query) list.append(h('p.hint', 'Staff will say these to you. Train your ear: Study → Listening.'));
    if (!arr.length) {
      if (query) {
        list.append(h('div.empty', h('p', `Nothing found for “${query}”.`), h('p.small', 'Try English, romaji or kana.'),
          h('button.btn', { type: 'button', on: { click: () => { query = ''; input.value = ''; draw(); input.focus(); } } }, 'Clear search')));
      } else if (cat === 'fav') {
        list.append(h('div.empty', h('p', 'No favorites yet.'), h('p.small', 'Tap the star next to a phrase to keep it here.'),
          h('button.btn', { type: 'button', on: { click: () => setCat(lastCat) } }, 'Browse phrases')));
      } else list.append(h('div.empty', h('p', 'No phrases in this category.')));
      return;
    }
    const f = favs();
    const favView = cat === 'fav' && !query;
    arr.forEach((it, i) => {
      const card = phraseCard(ctx, it, f.has(it.id), favView ? draw : null);
      if (arr.length === 1 && i === 0) card.setOpen(true);
      list.append(card);
    });
  }

  let t = null;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { query = input.value.trim(); draw(); }, 120);
  });
  // Enter hides the on-screen keyboard so the results are visible
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });

  root.append(
    h('header.top',
      h('h1', 'Phrases'),
      h('label.toggle',
        h('input', { type: 'checkbox', checked: s.furigana, on: { change: (e) => { ctx.setSetting('furigana', e.target.checked); draw(); } } }),
        h('span', 'Furigana')),
    ),
    input, bar, list,
  );
  draw();
}

export function phraseCard(ctx, it, isFav, onChange, { collapsed = true } = {}) {
  const s = ctx.settings();
  const favBtn = h('button.btn.icon.fav' + (isFav ? '.on' : ''), {
    type: 'button', title: isFav ? 'Remove from favorites' : 'Add to favorites', 'aria-label': 'Favorite', 'aria-pressed': isFav ? 'true' : 'false',
    on: {
      click: (e) => {
        e.stopPropagation();
        ctx.store.update('favs', [], (arr) => {
          const set = new Set(arr);
          if (set.has(it.id)) set.delete(it.id); else set.add(it.id);
          return [...set];
        });
        const on = ctx.store.get('favs', []).includes(it.id);
        favBtn.classList.toggle('on', on);
        favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        favBtn.title = on ? 'Remove from favorites' : 'Add to favorites';
        favBtn.replaceChildren(ico(on ? 'star-fill' : 'star'));
        onChange && onChange();
      },
    },
  }, ico(isFav ? 'star-fill' : 'star'));
  const showBtn = h('button.btn.icon', {
    type: 'button', title: 'Show to a Japanese person', 'aria-label': 'Show full screen',
    on: { click: (e) => { e.stopPropagation(); showFullscreen({ lines: [{ ruby: it.ruby }], caption: it.en, speakText: it.tts || it.ja }); } },
  }, ico('show'));

  const reply = replyBlock(ctx, it);
  const hasMore = !!(it.note || reply);
  const text = h('div.phrase-text',
    it.kind === 'hear' ? h('div.badge', 'You will hear') : it.kind === 'pattern' && it.pattern ? h('div.badge.pat', { lang: 'ja' }, it.pattern) : null,
    h('div.jp', rubyEl(it.ruby, { furigana: s.furigana })),
    h('div.romaji', it.romaji),
    h('div.en', it.en, collapsed && hasMore
      ? h('span.more-hint', { 'aria-hidden': 'true' }, it.kind === 'hear' && reply ? 'replies' : reply ? 'reply to' : 'note', ico('chevron'))
      : null));
  const art = h('article.phrase' + (it.kind === 'hear' ? '.hear' : '') + (collapsed ? '.is-collapsed' : '') + (hasMore ? '.has-more' : ''), { 'data-id': it.id },
    // The four actions are always visible (no extra tap): play, slow, show full screen, favorite
    h('div.phrase-head', text, h('div.actions', speakButtons(it), showBtn, favBtn)),
    hasMore ? h('div.phrase-more', it.note ? h('div.note', it.note) : null, reply) : null);
  if (collapsed) {
    // Tapping the text opens the phrase as a sheet (large Japanese, note, reply links); the others collapse
    text.tabIndex = 0;
    text.setAttribute('role', 'button');
    text.setAttribute('aria-expanded', 'false');
    const setOpen = (el, open) => {
      el.classList.toggle('open', open);
      el.classList.toggle('is-collapsed', !open);
      el.querySelector('.phrase-text')?.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    art.setOpen = (open) => setOpen(art, open);
    const toggle = () => {
      const willOpen = !art.classList.contains('open');
      art.parentElement?.querySelectorAll('.phrase.open').forEach((p) => setOpen(p, false));
      setOpen(art, willOpen);
    };
    text.addEventListener('click', toggle);
    text.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }
  return art;
}

/** "How to reply" under a staff phrase and "Reply to: …" under a reply phrase. */
export function replyBlock(ctx, it) {
  const byId = ctx.data.byId;
  const s = ctx.settings();
  if (it.kind === 'hear' && it.replies?.length) {
    return h('div.replies', { 'data-for': it.id },
      h('div.replies-title', 'How to reply'),
      it.replies.map((rid) => byId[rid]).filter(Boolean).map((r) => h('div.reply', { 'data-id': r.id },
        h('div.reply-text',
          h('span.jp', rubyEl(r.ruby, { furigana: s.furigana })),
          h('span.romaji', r.romaji),
          h('span.en', r.en)),
        speakButtons(r))));
  }
  if (it.replyTo?.length) {
    const qs = it.replyTo.map((qid) => byId[qid]).filter(Boolean);
    return h('div.reply-to', h('span.reply-to-label', 'Reply to'),
      qs.map((q) => h('button.linklike', { type: 'button', title: q.en, 'aria-label': `Play: ${q.en}`, on: { click: (e) => { e.stopPropagation(); speakItem(q, 1.0); } } },
        ico('play'), h('span', { lang: 'ja' }, q.ja))));
  }
  return null;
}

export function copyOrToast(text) {
  navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => toast(text));
}
