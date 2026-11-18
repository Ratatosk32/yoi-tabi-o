// Вкладка «Инструменты»: Lens, Google Переводчик, карты, экстренные номера, озвучка, настройки, резервная копия.
import { h, clear, toast, downloadJson } from './ui.js';
import * as L from './launchers.js';
import * as tts from './tts.js';
import { stats } from './srs.js';

export function render(ctx, root) {
  const s = ctx.settings();

  // --- Камера / Lens ---
  const variant = L.lensVariant(s.lensVariant);
  const fallbacks = L.CAMERA_FALLBACKS[L.PLATFORM] || L.CAMERA_FALLBACKS.other;
  root.append(
    h('header.top', h('h1', 'Инструменты')),
    h('section.block',
      h('h2.section', 'Камера: прочитать надпись'),
      h('a.btn.big.primary#lens-btn', { href: variant.url(), rel: 'noopener', 'data-platform': L.PLATFORM }, 'Открыть Google Lens'),
      h('details.more', { open: L.PLATFORM === 'ios' },
        h('summary', L.PLATFORM === 'ios' ? 'На iPhone надёжнее так' : 'Если кнопка не открыла камеру'),
        h('ul',
          fallbacks.map((t) => h('li', t)),
          h('li', 'Другой способ запуска Lens можно выбрать ниже в «Настройках» (проверьте на странице диагностики).'))),
    ),
  );

  // --- Переводчик ---
  const hist = ctx.store.get('history', []);
  const ta = h('textarea#tr-text', { rows: 3, placeholder: 'Текст по-русски…', 'aria-label': 'Текст для перевода' });
  const remember = (t) => ctx.store.update('history', [], (arr) => [t, ...arr.filter((x) => x !== t)].slice(0, 20));
  const need = () => { const t = ta.value.trim(); if (!t) { toast('Введите текст'); return null; } remember(t); return t; };
  const histBox = h('div.history');
  const drawHist = () => {
    clear(histBox);
    const arr = ctx.store.get('history', []);
    if (!arr.length) return;
    histBox.append(h('div.small', 'Недавние:'));
    for (const t of arr.slice(0, 8)) histBox.append(h('button.chip', { type: 'button', on: { click: () => { ta.value = t; } } }, t.length > 40 ? t.slice(0, 40) + '…' : t));
  };
  root.append(h('section.block',
    h('h2.section', 'Перевод RU → JA'),
    h('p.hint', 'Перевод делает Google Переводчик (скачайте офлайн-пакет японского). Ответ скопируйте и вставьте в «Показать → Свой текст».'),
    ta,
    h('div.actions.wrap',
      h('button.btn.primary', { type: 'button', on: { click: () => { const t = need(); if (t) L.open(L.translateUrl(t)); drawHist(); } } }, 'Открыть в Переводчике'),
      h('button.btn', { type: 'button', on: { click: async () => { const t = need(); if (!t) return; const r = await L.shareText(t); if (r === 'unsupported') toast('«Поделиться» недоступно в этом браузере'); drawHist(); } } }, 'Поделиться…'),
      h('button.btn', { type: 'button', on: { click: () => { const t = need(); if (t) L.open(L.translateAppUrl(t)); drawHist(); } } }, 'В приложении Переводчика'),
    ),
    histBox,
  ));
  drawHist();

  // --- Карты ---
  const q = h('input#maps-q', { type: 'text', placeholder: 'Станция, адрес или место', 'aria-label': 'Место' });
  root.append(h('section.block',
    h('h2.section', 'Карты'),
    q,
    h('div.actions.wrap',
      h('button.btn', { type: 'button', on: { click: () => L.open(L.mapsSearchUrl(q.value.trim())) } }, 'Найти на карте'),
      h('button.btn', { type: 'button', on: { click: () => L.open(L.mapsTransitUrl(q.value.trim())) } }, 'Маршрут на транспорте')),
  ));

  // --- Экстренные номера ---
  root.append(h('section.block',
    h('h2.section', 'Экстренные номера'),
    h('div.actions.wrap',
      h('a.btn.danger', { href: 'tel:110' }, '110 Полиция'),
      h('a.btn.danger', { href: 'tel:119' }, '119 Скорая / пожарные'),
      h('a.btn', { href: 'tel:05038162787' }, 'Japan Visitor Hotline 050-3816-2787')),
    h('p.hint', 'Hotline JNTO: 24/7, английский, китайский, корейский. Фразы — в категории «Ребёнок, здоровье, экстренное».'),
  ));

  // --- Озвучка ---
  const ttsBox = h('section.block#tts-box', h('h2.section', 'Озвучка (японский голос)'));
  root.append(ttsBox);
  const drawTts = (st) => {
    clear(ttsBox).append(h('h2.section', 'Озвучка (японский голос)'));
    if (!st.supported) ttsBox.append(h('p.warn', 'Этот браузер не поддерживает озвучку.'));
    else if (st.hasJapanese) ttsBox.append(h('p.ok', 'Японский голос найден: ' + st.jaVoiceName));
    else ttsBox.append(h('p.warn', `Японский голос не найден (голосов в системе: ${st.voiceCount}). Озвучка может молчать офлайн.`),
      L.PLATFORM === 'ios'
        ? h('ol.small',
          h('li', 'Настройки iPhone → Универсальный доступ → Устный контент → Голоса → Японский.'),
          h('li', 'Скачайте голос (например, Kyoko или Otoya; улучшенное качество — больше размер).'),
          h('li', 'Закройте и снова откройте приложение с домашнего экрана, проверьте в авиарежиме.'))
        : h('ol.small',
          h('li', 'Настройки Android → Система → Языки → Синтез речи (Text-to-speech).'),
          h('li', 'Движок: Speech Services by Google → значок шестерёнки → Install voice data → Японский (日本語).'),
          h('li', 'Перезапустите приложение и проверьте в авиарежиме.')));
    ttsBox.append(h('div.actions.wrap',
      h('button.btn', { type: 'button', on: { click: () => tts.speak('袋はご利用ですか', 1.0) } }, '▶ Тест: 袋はご利用ですか'),
      h('button.btn', { type: 'button', on: { click: () => tts.speak('12800円', 1.0) } }, '▶ Тест: 12800円'),
      h('a.btn', { href: 'diag.html' }, 'Диагностика')));
  };
  drawTts(tts.status());
  tts.init().then(drawTts);

  // --- Настройки ---
  const lensSel = h('select#lens-variant', { on: { change: (e) => { ctx.setSetting('lensVariant', e.target.value); ctx.rerender(); } } },
    Object.entries(L.LENS_VARIANTS).map(([k, v]) => h('option', { value: k }, v.label)));
  lensSel.value = s.lensVariant;
  const newSel = h('input', { type: 'number', min: 3, max: 40, value: String(s.newPerDay), on: { change: (e) => ctx.setSetting('newPerDay', Math.max(3, Math.min(40, Number(e.target.value) || 12))) } });
  const startIn = h('input', { type: 'date', value: s.startDate || '', on: { change: (e) => e.target.value && ctx.setSetting('startDate', e.target.value) } });
  root.append(h('section.block',
    h('h2.section', 'Настройки'),
    h('label.field', h('span', 'Способ запуска Lens'), lensSel),
    h('label.field', h('span', 'Новых карточек в день'), newSel),
    h('label.field', h('span', 'Дата начала занятий (для плана по неделям)'), startIn),
    h('label.toggle', h('input', { type: 'checkbox', checked: s.furigana, on: { change: (e) => ctx.setSetting('furigana', e.target.checked) } }), h('span', 'Показывать фуригану')),
  ));

  // --- Резервная копия ---
  const st = stats(ctx.store.get('srs', {}));
  const imp = h('input', { type: 'file', accept: 'application/json,.json', on: { change: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const changed = ctx.store.importAll(await f.text(), 'merge');
      toast('Импортировано: ' + changed.join(', '));
    } catch (err) { toast('Ошибка импорта: ' + err.message, 4000); }
  } } });
  const last = s.lastBackup ? new Date(s.lastBackup).toLocaleDateString('ru-RU') : 'ещё не делали';
  root.append(h('section.block#backup',
    h('h2.section', 'Прогресс и резервная копия'),
    h('p.small', `Карточек в работе: ${st.total}, к повторению сегодня: ${st.due}. По коробкам: ${st.boxes.join(' / ')}.`),
    h('p.small', 'Всё хранится только в этом браузере: прогресс, избранное, карточки «Аллергия» и «Адрес отеля». ' +
      (L.PLATFORM === 'ios' ? 'На iPhone Safari может удалить данные сайта, если его не открывали 7 дней; приложение на домашнем экране защищено лучше, но копия всё равно нужна. ' : '') +
      `Последняя копия: ${last}.`),
    h('div.actions.wrap',
      h('button.btn.primary#backup-btn', { type: 'button', on: { click: () => {
        downloadJson(ctx.store.exportAll(), `japan-trip-backup-${new Date().toISOString().slice(0, 10)}.json`);
        ctx.setSetting('lastBackup', new Date().toISOString());
        toast('Файл копии сохранён в «Загрузки» / «Файлы»');
      } } }, 'Скачать копию (JSON)'),
      h('label.btn', 'Восстановить из файла', h('span.visually-hidden', imp))),
  ));

  // --- О приложении ---
  const sw = ctx.swInfo ? ctx.swInfo() : {};
  root.append(h('section.block.about',
    h('h2.section', 'О приложении'),
    h('p.small', `Данные v${ctx.data.version}. Офлайн-режим: ${sw.controlled ? 'включён' : sw.supported ? 'включится после перезапуска' : 'не поддерживается'}.` +
      (ctx.persisted === true ? ' Хранилище закреплено.' : '')),
    h('p.small', 'Фраз: ' + ctx.data.items.length + ', кандзи: ' + ctx.data.kanji.items.length + '.'),
  ));
}
