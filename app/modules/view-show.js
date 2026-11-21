// Show tab: full-screen cards for Japanese people.
// Personal data (allergy, hotel address) are PLACEHOLDERS the user fills in; stored only in this browser.
import { h, add, clear, showFullscreen, rubyEl, toast } from './ui.js';
import { rubyToJa } from './text.js';

export const ALLERGENS = [
  { id: 'tamago', ja: '卵', ruby: '卵[たまご]', en: 'egg' },
  { id: 'nyu', ja: '乳製品', ruby: '乳製品[にゅうせいひん]', en: 'dairy' },
  { id: 'komugi', ja: '小麦', ruby: '小麦[こむぎ]', en: 'wheat' },
  { id: 'soba', ja: 'そば', ruby: 'そば', en: 'buckwheat (soba)' },
  { id: 'rakkasei', ja: '落花生', ruby: '落花生[らっかせい]', en: 'peanut' },
  { id: 'nuts', ja: 'ナッツ類', ruby: 'ナッツ類[るい]', en: 'nuts' },
  { id: 'kurumi', ja: 'くるみ', ruby: 'くるみ', en: 'walnut' },
  { id: 'ebi', ja: 'えび', ruby: 'えび', en: 'shrimp' },
  { id: 'kani', ja: 'かに', ruby: 'かに', en: 'crab' },
  { id: 'sakana', ja: '魚', ruby: '魚[さかな]', en: 'fish' },
  { id: 'goma', ja: 'ごま', ruby: 'ごま', en: 'sesame' },
  { id: 'daizu', ja: '大豆', ruby: '大豆[だいず]', en: 'soy' },
];

/** Build the allergy card text. Returns null when nothing is selected. */
export function allergyText(card) {
  const chosen = ALLERGENS.filter((a) => card?.allergens?.includes(a.id));
  if (!chosen.length) return null;
  const who = card.who === 'me' ? '私[わたし]' : 'この子[こ]';
  const whoEn = card.who === 'me' ? 'I am' : 'This child is';
  const list = chosen.map((a) => a.ruby).join('・');
  const lines = [
    `${who}には${list}のアレルギーがあります。`,
    // with several allergens don't repeat the list — shorter and fits on screen (QA B3)
    `${chosen.length > 1 ? 'これら' : list}が入[はい]った料理[りょうり]は食[た]べられません。`,
  ];
  if (card.strict) lines.push('少量[しょうりょう]でも危険[きけん]です。');
  lines.push('入[はい]っているかどうか確認[かくにん]していただけますか。');
  const en = `${whoEn} allergic to: ${chosen.map((a) => a.en).join(', ')}. Cannot eat dishes containing them.` +
    (card.strict ? ' Even a small amount is dangerous.' : '') + ' Please check whether the dish contains them.';
  return { lines, en };
}

export function hotelText(card) {
  if (!card || !(card.name || card.address)) return null;
  const lines = ['このホテルまでお願[ねが]いします。'];
  if (card.name) lines.push(card.name);
  if (card.address) lines.push(card.address);
  if (card.phone) lines.push('☎ ' + card.phone);
  return { lines, en: 'Please take me to this hotel.' };
}

export const ZH_CARDS = [
  { id: 'zh.card.not-fluent', ruby: '我[wǒ]的[de]中文[Zhōng wén]不[bú]太[tài]好[hǎo]，请[qǐng]您[nín]看[kàn]一下[yí xià]。', romaji: 'Wǒ de Zhōngwén bú tài hǎo, qǐng nín kàn yíxià.', en: 'My Chinese is not very good. Please have a look.' },
  { id: 'zh.card.slowly', ruby: '请[qǐng]说[shuō]慢[màn]一点[yì diǎn]。', romaji: 'Qǐng shuō màn yìdiǎn.', en: 'Please speak a little more slowly.' },
  { id: 'zh.card.write', ruby: '请[qǐng]写[xiě]下来[xià lai]。', romaji: 'Qǐng xiě xiàlai.', en: 'Please write it down.' },
];

export function addressText(card) {
  if (!card || !(card.name || card.address)) return null;
  const lines = ['请[qǐng]带[dài]我[wǒ]去[qù]这个[zhè ge]地址[dì zhǐ]。'];
  if (card.name) lines.push(card.name);
  if (card.address) lines.push(card.address);
  if (card.phone) lines.push('☎ ' + card.phone);
  return { lines, en: 'Please take me to this address.' };
}

export function render(ctx, root) {
  if (ctx.lang.id === 'zh') { renderZh(ctx, root); return; }
  const cards = () => ctx.store.get('cards', {});
  const saveCard = (key, val) => ctx.store.update('cards', {}, (c) => ({ ...c, [key]: val }));

  root.append(h('header.top', h('h1', 'Show')),
    h('p.hint', 'Tap a card: it opens full screen in large type and keeps the screen on. Back closes it.'));

  // --- One-tap list: your filled-in cards first, then the ready-made ones ---
  const quick = h('section.block#show-cards');
  root.append(quick);
  const showAllergy = (gen) => showFullscreen({ lines: gen.lines.map((ruby) => ({ ruby })), caption: gen.en });
  const showHotel = (gen) => showFullscreen({ lines: gen.lines.map((t, i) => (i === 0 ? { ruby: t } : { text: t, small: i > 1 })), caption: gen.en });
  const showFree = (v) => showFullscreen({ lines: [{ text: v }], speakText: v });
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  function drawQuick() {
    clear(quick);
    const c = cards();
    const a = allergyText(c.allergy), ho = hotelText(c.hotel), free = (c.free || '').trim();
    const mineCard = (label, id, preview, onShow, formId) => (preview
      ? h('button.card.showcard.mine', { type: 'button', 'data-card': id, on: { click: onShow } },
        h('div.badge', label), h('div.jp', { lang: 'ja' }, preview))
      : h('button.card.todo-card', { type: 'button', 'data-card': id, on: { click: () => jumpTo(formId) } },
        h('strong', label), h('span.warn', 'Not filled in'), h('span.small', 'Fill it in below')));
    add(quick,
      h('h2.section', 'Cards'),
      mineCard('Allergy', 'allergy', a && rubyEl(a.lines[0], { furigana: false }), () => showAllergy(a), 'card-allergy'),
      mineCard('Hotel address (taxi)', 'hotel', ho && (c.hotel.name || c.hotel.address), () => showHotel(ho), 'card-hotel'),
      free ? mineCard('Your own text', 'free', free.length > 60 ? free.slice(0, 60) + '…' : free, () => showFree(free), 'card-free') : null,
      ctx.allItems().filter((x) => x.kind === 'card').map((it) => h('button.card.showcard', {
        type: 'button', 'data-id': it.id,
        on: { click: () => showFullscreen({ lines: [{ ruby: it.ruby }], caption: it.en, speakText: it.ja }) },
      }, h('div.jp', rubyEl(it.ruby, { furigana: false })), h('div.en', it.en))));
  }

  // --- Forms for the personal cards ---
  const mine = h('section.block', h('h2.section', 'Edit my cards'),
    h('p.hint', 'Stored only on this phone. Fill these in before the trip.'));
  root.append(mine);

  // Allergy
  const allergyBox = h('div.card.edit#card-allergy');
  mine.append(allergyBox);
  function drawAllergy() {
    clear(allergyBox);
    const c = cards().allergy || { who: 'child', allergens: [], strict: true };
    const gen = allergyText(c);
    allergyBox.append(
      h('div.card-head', h('strong', 'Allergy'), gen ? h('span.ok', 'Ready') : h('span.warn', 'NOT FILLED IN')),
      h('div.field-label', 'Who has the allergy?'),
      h('div.row',
        h('label', h('input', { type: 'radio', name: 'who', checked: c.who !== 'me', on: { change: () => { saveCard('allergy', { ...c, who: 'child' }); drawAllergy(); } } }), ' my child'),
        h('label', h('input', { type: 'radio', name: 'who', checked: c.who === 'me', on: { change: () => { saveCard('allergy', { ...c, who: 'me' }); drawAllergy(); } } }), ' me')),
      h('div.field-label', 'Allergic to'),
      h('div.checks', ALLERGENS.map((a) => h('label.check',
        h('input', { type: 'checkbox', checked: c.allergens.includes(a.id), on: { change: (e) => {
          const set = new Set(c.allergens);
          if (e.target.checked) set.add(a.id); else set.delete(a.id);
          saveCard('allergy', { ...c, allergens: [...set] });
          drawAllergy();
        } } }),
        ' ', h('span', { lang: 'ja' }, a.ja), ' ', h('small', a.en)))),
      h('label.check', h('input', { type: 'checkbox', checked: !!c.strict, on: { change: (e) => { saveCard('allergy', { ...c, strict: e.target.checked }); drawAllergy(); } } }), ' even a small amount is dangerous'),
      gen ? h('div.preview', gen.lines.map((l) => h('p', rubyEl(l, { furigana: true })))) : h('p.hint', 'Tick the allergens — the Japanese text is built automatically.'),
      h('div.actions',
        h('button.btn.primary', { type: 'button', disabled: !gen, on: { click: () => gen && showAllergy(gen) } }, 'Show full screen')),
    );
    drawQuick();
  }
  drawAllergy();

  // Hotel address
  const hotelBox = h('div.card.edit#card-hotel');
  mine.append(hotelBox);
  function drawHotel() {
    clear(hotelBox);
    const c = cards().hotel || {};
    const gen = hotelText(c);
    const field = (key, label, ph, multiline) => {
      const attrs = { placeholder: ph, value: c[key] || '', lang: 'ja', on: { change: (e) => { saveCard('hotel', { ...cards().hotel, [key]: e.target.value.trim() }); drawHotel(); } } };
      return h('label.field', h('span', label), multiline ? h('textarea', { rows: 3, ...attrs }) : h('input', { type: 'text', ...attrs }));
    };
    hotelBox.append(
      h('div.card-head', h('strong', 'Hotel address (for taxis)'), gen ? h('span.ok', 'Ready') : h('span.warn', 'NOT FILLED IN')),
      h('p.hint', 'Copy the name and address IN JAPANESE from your booking confirmation or the hotel website (Google Maps → hotel page).'),
      field('name', 'Hotel name (in Japanese)', 'e.g. 〇〇ホテル新宿'),
      field('address', 'Address (in Japanese)', '〒000-0000 東京都…', true),
      field('phone', 'Hotel phone (optional)', '03-0000-0000'),
      h('div.actions',
        h('button.btn.primary', { type: 'button', disabled: !gen, on: { click: () => gen && showHotel(gen) } }, 'Show full screen')),
    );
    drawQuick();
  }
  drawHotel();

  // Free text
  const free = cards().free || '';
  const ta = h('textarea#free-text', { rows: 3, lang: 'ja', placeholder: 'Paste Japanese text (e.g. from Google Translate)', value: free });
  ta.setAttribute('aria-label', 'Japanese text to show');
  ta.addEventListener('change', () => { saveCard('free', ta.value.trim()); drawQuick(); });
  mine.append(h('div.card.edit#card-free',
    h('div.card-head', h('strong', 'Your own text')),
    h('p.hint', 'Paste a translation from Google Translate and show it large.'),
    ta,
    h('div.actions',
      h('button.btn.primary', { type: 'button', on: { click: () => {
        const v = ta.value.trim();
        saveCard('free', v);
        drawQuick();
        if (!v) return toast('Paste some text first');
        showFree(v);
      } } }, 'Show full screen'),
      h('button.btn', { type: 'button', on: { click: async () => {
        try { ta.value = await navigator.clipboard.readText(); saveCard('free', ta.value.trim()); drawQuick(); } catch { toast('No clipboard access — long-press to paste'); }
      } } }, 'Paste from clipboard')),
  ));

  drawQuick();
}

function renderZh(ctx, root) {
  const tag = ctx.lang.tag;
  const cards = () => ctx.store.get('cards', {});
  const saveCard = (key, val) => ctx.store.update('cards', {}, (c) => ({ ...c, [key]: val }));
  const showLines = (gen) => showFullscreen({ lines: gen.lines.map((t, i) => (i === 0 ? { ruby: t } : { text: t, small: i > 1 })), caption: gen.en });
  const showFree = (v) => showFullscreen({ lines: [{ text: v }], speakText: v });
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  root.append(h('header.top', h('h1', 'Show')),
    h('p.hint', `Cards to show to ${ctx.lang.speaker}. Tap one: it opens full screen in large type and keeps the screen on. Back closes it.`));
  const quick = h('section.block#show-cards');
  root.append(quick);
  function drawQuick() {
    clear(quick);
    const c = cards();
    const addr = addressText(c.address), free = (c.free || '').trim();
    add(quick,
      h('h2.section', 'Cards'),
      ZH_CARDS.map((it) => h('button.card.showcard', {
        type: 'button', 'data-id': it.id,
        on: { click: () => showFullscreen({ lines: [{ ruby: it.ruby }], caption: it.en, speakText: rubyToJa(it.ruby) }) },
      }, h('div.jp', rubyEl(it.ruby, { furigana: false })), h('div.romaji', it.romaji), h('div.en', it.en))),
      addr
        ? h('button.card.showcard.mine', { type: 'button', 'data-card': 'address', on: { click: () => showLines(addr) } },
          h('div.badge', 'Address (taxi)'), h('div.jp', { lang: tag }, c.address.name || c.address.address))
        : h('button.card.todo-card', { type: 'button', 'data-card': 'address', on: { click: () => jumpTo('card-address') } },
          h('strong', 'Address (taxi)'), h('span.warn', 'Not filled in'), h('span.small', 'Fill it in below')),
      free ? h('button.card.showcard.mine', { type: 'button', 'data-card': 'free', on: { click: () => showFree(free) } },
        h('div.badge', 'Your own text'), h('div.jp', { lang: tag }, free.length > 60 ? free.slice(0, 60) + '…' : free)) : null);
  }

  const mine = h('section.block', h('h2.section', 'Edit my cards'), h('p.hint', 'Stored only on this phone.'));
  root.append(mine);
  const addressBox = h('div.card.edit#card-address');
  mine.append(addressBox);
  function drawAddress() {
    clear(addressBox);
    const c = cards().address || {};
    const gen = addressText(c);
    const field = (key, label, ph, multiline) => {
      const attrs = { placeholder: ph, value: c[key] || '', lang: tag, on: { change: (e) => { saveCard('address', { ...cards().address, [key]: e.target.value.trim() }); drawAddress(); } } };
      return h('label.field', h('span', label), multiline ? h('textarea', { rows: 3, ...attrs }) : h('input', { type: 'text', ...attrs }));
    };
    addressBox.append(
      h('div.card-head', h('strong', 'Address (for taxis)'), gen ? h('span.ok', 'Ready') : h('span.warn', 'NOT FILLED IN')),
      h('p.hint', 'Copy the name and address IN CHINESE from a booking or a map app.'),
      field('name', 'Place name (in Chinese)', '例如：北京饭店'),
      field('address', 'Address (in Chinese)', '北京市…', true),
      field('phone', 'Phone (optional)', '010-0000-0000'),
      h('div.actions', h('button.btn.primary', { type: 'button', disabled: !gen, on: { click: () => gen && showLines(gen) } }, 'Show full screen')));
    drawQuick();
  }
  drawAddress();

  const ta = h('textarea#free-text', { rows: 3, lang: tag, placeholder: 'Paste Chinese text (e.g. from Google Translate)', value: cards().free || '' });
  ta.setAttribute('aria-label', 'Chinese text to show');
  ta.addEventListener('change', () => { saveCard('free', ta.value.trim()); drawQuick(); });
  mine.append(h('div.card.edit#card-free',
    h('div.card-head', h('strong', 'Your own text')),
    h('p.hint', 'Paste a translation from Google Translate and show it large.'),
    ta,
    h('div.actions',
      h('button.btn.primary', { type: 'button', on: { click: () => {
        const v = ta.value.trim();
        saveCard('free', v);
        drawQuick();
        if (!v) { toast('Paste some text first'); return; }
        showFree(v);
      } } }, 'Show full screen'),
      h('button.btn', { type: 'button', on: { click: async () => {
        try { ta.value = await navigator.clipboard.readText(); saveCard('free', ta.value.trim()); drawQuick(); } catch { toast('No clipboard access — long-press to paste'); }
      } } }, 'Paste from clipboard'))));
  drawQuick();
}
