// Tools tab: Lens, Google Translate, maps, emergency numbers, speech, settings, backup.
import { h, clear, toast, downloadJson, ico } from './ui.js';
import * as L from './launchers.js';
import * as tts from './tts.js';
import { stats } from './srs.js';
import { kanaToHepburn } from './text.js';

export function render(ctx, root) {
  const s = ctx.settings();

  // --- Camera / Lens ---
  const variant = L.lensVariant(s.lensVariant);
  const fallbacks = L.CAMERA_FALLBACKS[L.PLATFORM] || L.CAMERA_FALLBACKS.other;
  root.append(
    h('header.top', h('h1', 'Tools')),
    h('section.block',
      h('h2.section', 'Camera: read a sign'),
      h('a.btn.big.primary#lens-btn', { href: variant.url(), rel: 'noopener', 'data-platform': L.PLATFORM }, ico('camera'), 'Open Google Lens'),
      h('details.more', { open: L.PLATFORM === 'ios' },
        h('summary', L.PLATFORM === 'ios' ? 'More reliable on iPhone' : 'If the button didn’t open the camera'),
        h('ul',
          fallbacks.map((t) => h('li', t)),
          h('li', 'You can pick another way to launch Lens in Settings below (test it on the diagnostics page).'))),
    ),
  );

  // --- Translator ---
  const hist = ctx.store.get('history', []);
  const ta = h('textarea#tr-text', { rows: 3, placeholder: 'Text in English…', 'aria-label': 'Text to translate' });
  const remember = (t) => ctx.store.update('history', [], (arr) => [t, ...arr.filter((x) => x !== t)].slice(0, 20));
  const need = () => { const t = ta.value.trim(); if (!t) { toast('Type some text'); return null; } remember(t); return t; };
  const histBox = h('div.history');
  const drawHist = () => {
    clear(histBox);
    const arr = ctx.store.get('history', []);
    if (!arr.length) return;
    histBox.append(h('div.small', 'Recent:'));
    for (const t of arr.slice(0, 8)) histBox.append(h('button.chip', { type: 'button', on: { click: () => { ta.value = t; } } }, t.length > 40 ? t.slice(0, 40) + '…' : t));
  };
  root.append(h('section.block',
    h('h2.section', 'Translate EN → JA'),
    h('p.hint', 'Google Translate does the translation (download the offline Japanese pack). Copy the result and paste it into Show → Your own text.'),
    ta,
    h('div.actions.wrap',
      h('button.btn.primary', { type: 'button', on: { click: () => { const t = need(); if (t) L.open(L.translateUrl(t, 'en', 'ja')); drawHist(); } } }, 'Open in Translate'),
      h('button.btn', { type: 'button', on: { click: async () => { const t = need(); if (!t) return; const r = await L.shareText(t); if (r === 'unsupported') toast('Share is not available in this browser'); drawHist(); } } }, ico('share'), 'Share…'),
      h('button.btn', { type: 'button', on: { click: () => { const t = need(); if (t) L.open(L.translateAppUrl(t, 'en', 'ja')); drawHist(); } } }, 'In the Translate app'),
    ),
    histBox,
  ));
  drawHist();

  // --- Maps ---
  const q = h('input#maps-q', { type: 'text', placeholder: 'Station, address or place', 'aria-label': 'Place' });
  root.append(h('section.block',
    h('h2.section', 'Maps'),
    q,
    h('div.actions.wrap',
      h('button.btn', { type: 'button', on: { click: () => L.open(L.mapsSearchUrl(q.value.trim())) } }, ico('map'), 'Find on map'),
      h('button.btn', { type: 'button', on: { click: () => L.open(L.mapsTransitUrl(q.value.trim())) } }, 'Transit directions')),
  ));

  // --- Emergency numbers ---
  root.append(h('section.block',
    h('h2.section', 'Emergency numbers'),
    h('div.tels',
      h('a.tel', { href: 'tel:110' }, h('b', '110'), h('span', 'Police')),
      h('a.tel', { href: 'tel:119' }, h('b', '119'), h('span', 'Ambulance / fire')),
      h('a.tel', { href: 'tel:05038162787' }, h('b.long', '050-3816-2787'), h('span', 'Japan Visitor Hotline'), h('small', 'JNTO, 24/7, English'))),
    h('p.hint', 'JNTO hotline: 24/7 in English, Chinese and Korean. Phrases are in “Child, health, emergencies”.'),
  ));

  // --- Speech ---
  const ttsBox = h('section.block#tts-box', h('h2.section', 'Speech (Japanese voice)'));
  root.append(ttsBox);
  const drawTts = (st) => {
    clear(ttsBox).append(h('h2.section', 'Speech (Japanese voice)'));
    if (!st.supported) ttsBox.append(h('p.warn', 'This browser does not support speech.'));
    else if (st.hasJapanese) ttsBox.append(h('p.ok', 'Japanese voice found: ' + st.jaVoiceName));
    else ttsBox.append(h('p.warn', `No Japanese voice found (voices on this device: ${st.voiceCount}). Speech may be silent offline.`),
      L.PLATFORM === 'ios'
        ? h('ol.small',
          h('li', 'iPhone Settings → Accessibility → Spoken Content → Voices → Japanese.'),
          h('li', 'Download a voice (e.g. Kyoko or Otoya; Enhanced quality is a bigger download).'),
          h('li', 'Close and reopen the app from the home screen, then test in airplane mode.'))
        : h('ol.small',
          h('li', 'Android Settings → System → Languages → Text-to-speech output.'),
          h('li', 'Engine: Speech Services by Google → gear icon → Install voice data → Japanese (日本語).'),
          h('li', 'Restart the app and test in airplane mode.')));
    ttsBox.append(h('div.actions.wrap',
      h('button.btn', { type: 'button', on: { click: () => tts.speak('袋はご利用ですか', 1.0) } }, ico('play'), 'Test: 袋はご利用ですか'),
      h('button.btn', { type: 'button', on: { click: () => tts.speak('12800円', 1.0) } }, ico('play'), 'Test: 12800円'),
      h('a.btn', { href: 'diag.html' }, 'Diagnostics')));
  };
  drawTts(tts.status());
  tts.init().then(drawTts);

  // --- Settings ---
  const lensSel = h('select#lens-variant', { on: { change: (e) => { ctx.setSetting('lensVariant', e.target.value); ctx.rerender(); } } },
    Object.entries(L.LENS_VARIANTS).map(([k, v]) => h('option', { value: k }, v.label)));
  lensSel.value = s.lensVariant;
  const newSel = h('input', { type: 'number', min: 3, max: 40, value: String(s.newPerDay), on: { change: (e) => ctx.setSetting('newPerDay', Math.max(3, Math.min(40, Number(e.target.value) || 12))) } });
  const startIn = h('input', { type: 'date', value: s.startDate || '', on: { change: (e) => e.target.value && ctx.setSetting('startDate', e.target.value) } });
  root.append(h('section.block',
    h('h2.section', 'Settings'),
    h('label.field', h('span', 'How to launch Lens'), lensSel),
    h('label.field', h('span', 'New cards per day'), newSel),
    h('label.field', h('span', 'Study start date (for the weekly plan)'), startIn),
    h('label.toggle', h('input', { type: 'checkbox', checked: s.furigana, on: { change: (e) => ctx.setSetting('furigana', e.target.checked) } }), h('span', 'Show furigana')),
  ));

  // --- My phrases ---
  root.append(userPhrases(ctx));

  // --- Backup ---
  const st = stats(ctx.store.get('srs', {}));
  const imp = h('input', { type: 'file', accept: 'application/json,.json', on: { change: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const changed = ctx.store.importAll(await f.text(), 'merge');
      toast('Imported: ' + changed.join(', '));
    } catch (err) { toast('Import failed: ' + err.message, 4000); }
  } } });
  const last = s.lastBackup ? new Date(s.lastBackup).toLocaleDateString('en-US') : 'never';
  root.append(h('section.block#backup',
    h('h2.section', 'Progress & backup'),
    h('p.small', `Cards in progress: ${st.total}, due today: ${st.due}. By box: ${st.boxes.join(' / ')}.`),
    h('p.small', 'Everything is stored only in this browser: progress, favorites, the Allergy and Hotel address cards. ' +
      (L.PLATFORM === 'ios' ? 'On iPhone, Safari may delete site data after 7 days without a visit; the home-screen app is safer, but keep a backup anyway. ' : '') +
      `Last backup: ${last}.`),
    h('div.actions.wrap',
      h('button.btn.primary#backup-btn', { type: 'button', on: { click: () => {
        downloadJson(ctx.store.exportAll(), `japan-trip-backup-${new Date().toISOString().slice(0, 10)}.json`);
        ctx.setSetting('lastBackup', new Date().toISOString());
        toast('Backup saved to Downloads / Files');
      } } }, 'Download backup (JSON)'),
      h('label.btn', 'Restore from file', h('span.visually-hidden', imp))),
  ));

  // --- About ---
  const sw = ctx.swInfo ? ctx.swInfo() : {};
  root.append(h('section.block.about',
    h('h2.section', 'About'),
    h('p.small', `Data v${ctx.data.version}. Offline mode: ${sw.controlled ? 'on' : sw.supported ? 'on after a restart' : 'not supported'}.` +
      (ctx.persisted === true ? ' Storage is persistent.' : '')),
    h('p.small', 'Phrases: ' + ctx.data.items.length + ', kanji: ' + ctx.data.kanji.items.length + '.'),
  ));
}

// ---------- My phrases (adding your own phrases; PLAN.md 3.5) ----------
/**
 * Reading for a user phrase. Kana → Hepburn romaji (with macrons).
 * Romaji → kana via wanakana; standalone particle words wa / o / e → は / を / へ,
 * and the romaji is kept as typed (with spaces).
 */
export function readingFrom(input) {
  const s = String(input || '').trim();
  if (!s) return { kana: '', romaji: '' };
  const wk = globalThis.wanakana;
  if (/[a-z]/i.test(s) && wk) {
    const PARTICLE = { wa: 'ha', o: 'wo', e: 'he' };
    const tokens = s.toLowerCase().split(/\s+/);
    const kana = tokens.map((t, i) => (i > 0 && PARTICLE[t] ? PARTICLE[t] : t)).map((t) => wk.toHiragana(t)).join('');
    return { kana, romaji: tokens.join(' ') };
  }
  return { kana: s.replace(/\s+/g, ''), romaji: kanaToHepburn(s.replace(/\s+/g, '')) };
}

function userPhrases(ctx) {
  const box = h('section.block#user-phrases');
  const draw = () => {
    clear(box);
    const list = ctx.store.get('userItems', []);
    const cats = ctx.data.categories.filter((c) => c.id !== 'cards');
    const en = h('input', { type: 'text', placeholder: 'In English', 'aria-label': 'Translation' });
    const ja = h('input', { type: 'text', lang: 'ja', placeholder: 'In Japanese (as written)', 'aria-label': 'Japanese text' });
    const kana = h('input', { type: 'text', lang: 'ja', placeholder: 'Reading in kana or romaji: kasa wa arimasu ka', 'aria-label': 'Reading' });
    const preview = h('div.small#user-reading');
    const cat = h('select', { 'aria-label': 'Category' }, cats.map((c) => h('option', { value: c.id }, c.en)));
    const kind = h('select', { 'aria-label': 'Type' }, h('option', { value: 'say' }, 'I say it'), h('option', { value: 'hear' }, 'Staff will say it'));
    const upd = () => {
      const r = readingFrom(kana.value);
      preview.textContent = r.kana ? `${r.kana} — ${r.romaji}` : 'Romaji: words separated by spaces; particles wa / o / e become は / を / へ.';
    };
    upd();
    kana.addEventListener('input', upd);
    box.append(
      h('h2.section', 'My phrases'),
      h('p.small', 'Your phrases appear in Phrases, in search and in Study cards. They are included in the backup.'),
      en, h('div', { style: { height: '8px' } }), ja, h('div', { style: { height: '8px' } }), kana, preview,
      h('div.actions.wrap', cat, kind),
      h('div.actions', h('button.btn.primary#add-phrase', { type: 'button', on: { click: () => {
        const r = en.value.trim(), j = ja.value.trim();
        const rd = readingFrom(kana.value);
        const k = rd.kana || j;
        if (!r || !j) { toast('Both English and Japanese text are required'); return; }
        const hasKanji = /[㐀-鿿]/.test(j);
        const item = {
          id: 'u.' + Date.now().toString(36), cat: cat.value, kind: kind.value, en: r, ja: j, kana: k,
          ruby: hasKanji && k !== j ? `{${j}|${k}}` : j,
          romaji: rd.romaji || kanaToHepburn(k), tags: ['w1', 'user'],
        };
        ctx.store.update('userItems', [], (arr) => [...arr, item]);
        toast('Added');
        draw();
      } } }, 'Add')),
      list.length ? h('div', list.map((it) => h('div.card.userrow',
        h('div', { lang: 'ja' }, it.ja), h('div.small', `${it.romaji} — ${it.en}`),
        h('button.btn.small', { type: 'button', on: { click: () => { ctx.store.update('userItems', [], (arr) => arr.filter((x) => x.id !== it.id)); draw(); } } }, 'Delete')))) : null,
    );
  };
  draw();
  return box;
}
