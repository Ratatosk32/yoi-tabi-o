// Вкладка «Показать»: карточки для японца на весь экран.
// Личные данные (аллергия, адрес отеля) — ЗАГЛУШКИ, пользователь заполняет сам; хранятся только в этом браузере.
import { h, clear, showFullscreen, rubyEl, toast } from './ui.js';

export const ALLERGENS = [
  { id: 'tamago', ja: '卵', ruby: '卵[たまご]', ru: 'яйца' },
  { id: 'nyu', ja: '乳製品', ruby: '乳製品[にゅうせいひん]', ru: 'молочное' },
  { id: 'komugi', ja: '小麦', ruby: '小麦[こむぎ]', ru: 'пшеница' },
  { id: 'soba', ja: 'そば', ruby: 'そば', ru: 'гречиха (соба)' },
  { id: 'rakkasei', ja: '落花生', ruby: '落花生[らっかせい]', ru: 'арахис' },
  { id: 'nuts', ja: 'ナッツ類', ruby: 'ナッツ類[るい]', ru: 'орехи' },
  { id: 'kurumi', ja: 'くるみ', ruby: 'くるみ', ru: 'грецкий орех' },
  { id: 'ebi', ja: 'えび', ruby: 'えび', ru: 'креветки' },
  { id: 'kani', ja: 'かに', ruby: 'かに', ru: 'краб' },
  { id: 'sakana', ja: '魚', ruby: '魚[さかな]', ru: 'рыба' },
  { id: 'goma', ja: 'ごま', ruby: 'ごま', ru: 'кунжут' },
  { id: 'daizu', ja: '大豆', ruby: '大豆[だいず]', ru: 'соя' },
];

/** Сгенерировать текст карточки аллергии. Возвращает null, если не заполнено. */
export function allergyText(card) {
  const chosen = ALLERGENS.filter((a) => card?.allergens?.includes(a.id));
  if (!chosen.length) return null;
  const who = card.who === 'me' ? '私[わたし]' : 'この子[こ]';
  const whoRu = card.who === 'me' ? 'У меня' : 'У этого ребёнка';
  const list = chosen.map((a) => a.ruby).join('・');
  const lines = [
    `${who}には${list}のアレルギーがあります。`,
    `${list}が入[はい]った料理[りょうり]は食[た]べられません。`,
  ];
  if (card.strict) lines.push('少量[しょうりょう]でも危険[きけん]です。');
  lines.push('入[はい]っているかどうか確認[かくにん]していただけますか。');
  const ru = `${whoRu} аллергия: ${chosen.map((a) => a.ru).join(', ')}. Блюда с этим есть нельзя.` +
    (card.strict ? ' Опасно даже в малом количестве.' : '') + ' Проверьте, пожалуйста, есть ли это в блюде.';
  return { lines, ru };
}

export function hotelText(card) {
  if (!card || !(card.name || card.address)) return null;
  const lines = ['このホテルまでお願[ねが]いします。'];
  if (card.name) lines.push(card.name);
  if (card.address) lines.push(card.address);
  if (card.phone) lines.push('☎ ' + card.phone);
  return { lines, ru: 'Отвезите, пожалуйста, в этот отель.' };
}

export function render(ctx, root) {
  const cards = () => ctx.store.get('cards', {});
  const saveCard = (key, val) => ctx.store.update('cards', {}, (c) => ({ ...c, [key]: val }));

  root.append(h('header.top', h('h1', 'Показать японцу')),
    h('p.hint', 'Карточка открывается на весь экран, экран не гаснет. «Назад» закрывает карточку.'));

  // --- Мои карточки ---
  const mine = h('section.block', h('h2.section', 'Мои карточки'));
  root.append(mine);

  // Аллергия
  const allergyBox = h('div.card.edit#card-allergy');
  mine.append(allergyBox);
  function drawAllergy() {
    clear(allergyBox);
    const c = cards().allergy || { who: 'child', allergens: [], strict: true };
    const gen = allergyText(c);
    allergyBox.append(
      h('div.card-head', h('strong', 'Аллергия'), gen ? null : h('span.warn', 'НЕ ЗАПОЛНЕНО')),
      h('div.row',
        h('label', h('input', { type: 'radio', name: 'who', checked: c.who !== 'me', on: { change: () => { saveCard('allergy', { ...c, who: 'child' }); drawAllergy(); } } }), ' у ребёнка'),
        h('label', h('input', { type: 'radio', name: 'who', checked: c.who === 'me', on: { change: () => { saveCard('allergy', { ...c, who: 'me' }); drawAllergy(); } } }), ' у меня')),
      h('div.checks', ALLERGENS.map((a) => h('label.check',
        h('input', { type: 'checkbox', checked: c.allergens.includes(a.id), on: { change: (e) => {
          const set = new Set(c.allergens);
          if (e.target.checked) set.add(a.id); else set.delete(a.id);
          saveCard('allergy', { ...c, allergens: [...set] });
          drawAllergy();
        } } }),
        ' ', h('span', { lang: 'ja' }, a.ja), ' ', h('small', a.ru)))),
      h('label.check', h('input', { type: 'checkbox', checked: !!c.strict, on: { change: (e) => { saveCard('allergy', { ...c, strict: e.target.checked }); drawAllergy(); } } }), ' опасно даже в малом количестве'),
      gen ? h('div.preview', gen.lines.map((l) => h('p', rubyEl(l, { furigana: true })))) : h('p.hint', 'Отметьте аллергены — японский текст соберётся автоматически.'),
      h('div.actions',
        h('button.btn.primary', { type: 'button', disabled: !gen, on: { click: () => gen && showFullscreen({ lines: gen.lines.map((ruby) => ({ ruby })), caption: gen.ru }) } }, 'Показать')),
    );
  }
  drawAllergy();

  // Адрес отеля
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
      h('div.card-head', h('strong', 'Адрес отеля (для такси)'), gen ? null : h('span.warn', 'НЕ ЗАПОЛНЕНО')),
      h('p.hint', 'Скопируйте название и адрес ПО-ЯПОНСКИ из подтверждения брони или с сайта отеля (Google Maps → карточка отеля).'),
      field('name', 'Название отеля (по-японски)', 'например: 〇〇ホテル新宿'),
      field('address', 'Адрес (по-японски)', '〒000-0000 東京都…', true),
      field('phone', 'Телефон отеля', '03-0000-0000'),
      h('div.actions',
        h('button.btn.primary', { type: 'button', disabled: !gen, on: { click: () => gen && showFullscreen({ lines: gen.lines.map((t, i) => (i === 0 ? { ruby: t } : { text: t, small: i > 1 })), caption: gen.ru }) } }, 'Показать')),
    );
  }
  drawHotel();

  // Свободный текст
  const free = cards().free || '';
  const ta = h('textarea#free-text', { rows: 3, lang: 'ja', placeholder: 'Вставьте японский текст (например, из Google Переводчика)', value: free });
  mine.append(h('div.card.edit',
    h('div.card-head', h('strong', 'Свой текст')),
    ta,
    h('div.actions',
      h('button.btn.primary', { type: 'button', on: { click: () => {
        const v = ta.value.trim();
        saveCard('free', v);
        if (!v) return toast('Сначала вставьте текст');
        showFullscreen({ lines: [{ text: v }], speakText: v });
      } } }, 'Показать'),
      h('button.btn', { type: 'button', on: { click: async () => {
        try { ta.value = await navigator.clipboard.readText(); saveCard('free', ta.value.trim()); } catch { toast('Нет доступа к буферу — вставьте долгим нажатием'); }
      } } }, 'Вставить из буфера')),
  ));

  // --- Готовые карточки ---
  const ready = h('section.block', h('h2.section', 'Готовые карточки'));
  for (const it of ctx.allItems().filter((x) => x.kind === 'card')) {
    ready.append(h('button.card.showcard', { type: 'button', 'data-id': it.id, on: { click: () => showFullscreen({ lines: [{ ruby: it.ruby }], caption: it.ru, speakText: it.ja }) } },
      h('div.jp', rubyEl(it.ruby, { furigana: false })),
      h('div.ru', it.ru)));
  }
  root.append(ready);
}
