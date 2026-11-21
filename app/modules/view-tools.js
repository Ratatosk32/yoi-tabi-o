// Tools tab: Lens, Google Translate, maps, emergency numbers, speech, settings, backup.
import { h, add, clear, toast, downloadJson, ico } from './ui.js';
import * as L from './launchers.js';
import * as tts from './tts.js';
import { stats, todayStr } from './srs.js';
import { KEYS } from './store.js';
import * as S from './snapshots.js';
import { kanaToHepburn } from './text.js';
import { dictFor } from './dict.js';
import * as Lang from './lang.js';
import { pinyinNumbersToMarks, pinyinSearchKey } from './text.js';
import * as U from './updates.js';

export function render(ctx, root, params = []) {
  if (params[0] === 'credits') { renderCredits(ctx, root); return; }
  const s = ctx.settings();
  const zh = ctx.lang.id === 'zh';
  const W = ctx.lang.words;
  const langName = ctx.lang.name;
  const D = dictFor(ctx.lang.id);

  // --- Camera / Lens ---
  const variant = L.lensVariant(s.lensVariant);
  const fallbacks = L.cameraFallbacks(L.PLATFORM, langName);
  // This page is long: a row of jump links keeps every section (emergency numbers first) one tap away
  const JUMPS = [['emergency', 'Emergency'], ['lens', 'Camera'], ['translate', 'Translate'], ['maps', 'Maps'], ['tts-box', 'Speech'],
    ['settings', 'Settings'], ['user-phrases', 'My phrases'], ['backup', 'Backup']].filter(([id]) => !zh || (id !== 'emergency' && id !== 'maps'));
  root.append(
    h('header.top', h('h1', 'Tools')),
    h('nav.chips.jump', { 'aria-label': 'On this page' }, JUMPS.map(([id, label]) => h('button.chip', {
      type: 'button', 'data-jump': id,
      on: { click: () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    }, label))),
    h('section.block#lens',
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
    histBox.append(h('div.small.chips-label', 'Recent'));
    for (const t of arr.slice(0, 8)) histBox.append(h('button.chip', { type: 'button', on: { click: () => { ta.value = t; } } }, t.length > 40 ? t.slice(0, 40) + '…' : t));
  };
  root.append(h('section.block#translate',
    h('h2.section', `Translate EN → ${ctx.lang.short}`),
    h('p.hint', `Google Translate does the translation (download the offline ${langName} pack). Copy the result and paste it into Show → Your own text.`),
    ta,
    h('div.actions.wrap',
      h('button.btn.primary', { type: 'button', on: { click: () => { const t = need(); if (t) L.open(L.translateUrl(t, 'en', W.translateTo)); drawHist(); } } }, 'Open in Translate'),
      h('button.btn', { type: 'button', on: { click: async () => { const t = need(); if (!t) return; const r = await L.shareText(t); if (r === 'unsupported') toast('Share is not available in this browser'); drawHist(); } } }, ico('share'), 'Share…'),
      h('button.btn', { type: 'button', on: { click: () => { const t = need(); if (t) L.open(L.translateAppUrl(t, 'en', W.translateTo)); drawHist(); } } }, 'In the Translate app'),
    ),
    histBox,
  ));
  drawHist();

  const q = h('input#maps-q', { type: 'text', placeholder: 'Station, address or place', 'aria-label': 'Place' });
  if (!zh) root.append(h('section.block#maps',
    h('h2.section', 'Maps'),
    q,
    h('div.actions.wrap',
      h('button.btn', { type: 'button', on: { click: () => L.open(L.mapsSearchUrl(q.value.trim())) } }, ico('map'), 'Find on map'),
      h('button.btn', { type: 'button', on: { click: () => L.open(L.mapsTransitUrl(q.value.trim())) } }, 'Transit directions')),
  ));

  if (!zh) root.append(h('section.block#emergency',
    h('h2.section', 'Emergency numbers'),
    h('div.tels',
      h('a.tel', { href: 'tel:110' }, h('b', '110'), h('span', 'Police'), ico('phone')),
      h('a.tel', { href: 'tel:119' }, h('b', '119'), h('span', 'Ambulance / fire'), ico('phone')),
      h('a.tel.stack', { href: 'tel:05038162787' }, h('b.long', '050-3816-2787'),
        h('span', 'Japan Visitor Hotline', h('small', 'JNTO · 24/7 · English, Chinese, Korean')), ico('phone'))),
    h('p.hint', 'Tap a number to call. Emergency phrases are in Phrases → “Child, health, emergencies”.'),
  ));

  const ttsBox = h('section.block#tts-box');
  root.append(ttsBox);
  const drawTts = (st) => {
    const has = zh ? st.hasChinese : st.hasJapanese;
    const voiceName = zh ? st.zhVoiceName : st.jaVoiceName;
    const androidPack = zh ? 'Chinese (Mandarin, China)' : 'Japanese (日本語)';
    const iosVoices = zh ? 'Chinese (China mainland), e.g. Tingting or Lili' : 'Japanese';
    clear(ttsBox).append(h('h2.section', `Speech (${langName} voice)`));
    if (!st.supported) ttsBox.append(h('p.warn', 'This browser does not support speech.'));
    else if (has) ttsBox.append(h('p.ok', `${langName} voice found: ` + voiceName));
    else ttsBox.append(h('p.warn', `No ${langName} voice found (voices on this device: ${st.voiceCount}). Speech may be silent offline.`),
      L.PLATFORM === 'ios'
        ? h('ol.small',
          h('li', `iPhone Settings → Accessibility → Spoken Content → Voices → ${iosVoices}.`),
          h('li', zh ? 'Download a voice (Enhanced quality is a bigger download).' : 'Download a voice (e.g. Kyoko or Otoya; Enhanced quality is a bigger download).'),
          h('li', 'Close and reopen the app from the home screen, then test in airplane mode.'))
        : h('ol.small',
          h('li', 'Android Settings → System → Languages → Text-to-speech output.'),
          h('li', `Engine: Speech Services by Google → gear icon → Install voice data → ${androidPack}.`),
          h('li', 'Restart the app and test in airplane mode.')));
    const samples = zh ? ['你好，我是学生。', '三块五'] : ['袋はご利用ですか', '12800円'];
    ttsBox.append(h('div.actions.wrap',
      samples.map((t) => h('button.btn', { type: 'button', on: { click: () => tts.speak(t, 1.0) } }, ico('play'), 'Test: ', h('span', { lang: ctx.lang.tag }, t))),
      h('a.btn', { href: 'diag.html' }, 'Diagnostics')));
  };
  drawTts(tts.status());
  tts.init().then(drawTts);

  // --- Settings ---
  const lensSel = h('select#lens-variant', { on: { change: (e) => { ctx.setSetting('lensVariant', e.target.value); ctx.rerender(); } } },
    Object.entries(L.LENS_VARIANTS).map(([k, v]) => h('option', { value: k }, v.label)));
  lensSel.value = s.lensVariant;
  const romajiSel = h('select#romaji-mode', { on: { change: (e) => ctx.setSetting('romaji', e.target.value) } },
    [['auto', 'Week 1 shown, then tap to show'], ['show', 'Always shown'], ['hide', 'Hidden, tap to show']].map(([v, l]) => h('option', { value: v }, l)));
  romajiSel.value = s.romaji || 'auto';
  const tripIn = h('input#trip-date', { type: 'date', value: s.tripDate || '', on: { change: (e) => ctx.setSetting('tripDate', e.target.value || null) } });
  const startIn = h('input', { type: 'date', value: s.startDate || '', on: { change: (e) => e.target.value && ctx.setSetting('startDate', e.target.value) } });
  root.append(updatesBlock());
  root.append(h('section.block#settings',
    h('h2.section', 'Settings'),
    h('label.field', h('span', 'How to launch Lens'), lensSel),
    h('label.field', h('span', W.Reading), romajiSel),
    zh ? null : h('label.field', h('span', 'Flight date (pre-flight run on the last 3 days)'), tripIn),
    h('label.field', h('span', zh ? 'Study start date (Chinese course)' : 'Study start date (for the weekly plan)'), startIn),
    h('label.toggle', h('input', { type: 'checkbox', checked: s.furigana, on: { change: (e) => ctx.setSetting('furigana', e.target.checked) } }), h('span', W.rubyLong)),
  ));

  // --- My phrases ---
  root.append(zh ? userPhrasesZh(ctx) : userPhrases(ctx));

  // --- Backup ---
  const st = stats(ctx.store.get('srs', {}));
  const backupStore = ctx.rootStore || ctx.store;
  const perLang = Lang.LANG_IDS.map((id) => `${Lang.LANGS[id].name} ${stats(backupStore.lang(id).get('srs', {}) || {}).total}`).join(', ');
  const imp = h('input', { type: 'file', accept: 'application/json,.json', on: { change: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const changed = backupStore.importAll(await f.text(), 'merge');
      toast('Imported: ' + changed.join(', '));
    } catch (err) { toast('Import failed: ' + err.message, 4000); }
  } } });
  const last = s.lastBackup ? new Date(s.lastBackup).toLocaleDateString('en-US') : 'never';
  const backupText = () => JSON.stringify(backupStore.exportAll());
  const backedUp = (msg) => { ctx.setSetting('lastBackup', new Date().toISOString()); toast(msg); };
  // Paste: a text box (works everywhere; reading the clipboard directly needs a permission prompt)
  const pasteBox = h('textarea#backup-text', { rows: '4', placeholder: 'Paste a backup here (it starts with {"app":"japan-trip"…)', 'aria-label': 'Backup text', spellcheck: 'false' });
  const pastePanel = h('div.paste-panel#paste-panel', { hidden: true }, pasteBox,
    h('button.btn.primary.wide#restore-text', { type: 'button', on: { click: () => {
      try {
        const changed = backupStore.importAll(pasteBox.value.trim(), 'merge');
        toast(changed.length ? 'Restored: ' + changed.join(', ') : 'Nothing to restore in this text', 3500);
        if (changed.length) { pasteBox.value = ''; pastePanel.hidden = true; }
      } catch (err) { toast('This is not a Japan Trip backup: ' + err.message, 4000); }
    } } }, 'Restore from this text'));
  const persistLine = h('p.small.storage-status#storage-status', 'Storage: checking…');
  const showPersist = async () => {
    const on = await navigator.storage?.persisted?.().catch(() => false);
    clear(persistLine);
    persistLine.append(on ? 'Storage: protected (the browser keeps it when space runs low).' : 'Storage: may be cleared by the browser when space runs low. ',
      on ? null : h('button.textlink#protect-storage', { type: 'button', on: { click: async () => { await ctx.requestPersist?.(); showPersist(); } } }, 'Protect it'));
    persistLine.dataset.persisted = on ? '1' : '0';
  };
  showPersist();
  const snapBox = h('div.snapshots#snapshots');
  const drawSnaps = async () => {
    const list = await S.listSnapshots(S.idbKV()).catch(() => []);
    clear(snapBox);
    if (!list.length) { snapBox.append(h('p.small', 'Automatic daily snapshots: the first one is saved tomorrow (the last 3 days are kept on this device).')); return; }
    const [newest, ...older] = list;
    const when = (sn) => new Date(sn.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const restore = (sn) => {
      if (!confirm(`Put progress back to how it was on ${when(sn)}? Changes made after that are replaced.`)) return;
      S.restoreSnapshot(backupStore, sn, KEYS);
      toast('Restored the state from ' + when(sn), 3500);
      ctx.rerender();
    };
    snapBox.append(
      h('button.btn.wide#restore-snapshot', { type: 'button', on: { click: () => restore(newest) } },
        newest.day === todayStr() ? 'Restore yesterday’s state' : `Restore the state from ${when(newest)}`),
      h('p.small', `Automatic daily snapshots on this device: ${list.map(when).join(' · ')}. `,
        ...older.map((sn, i) => h('button.textlink', { type: 'button', 'data-snapshot': sn.day, on: { click: () => restore(sn) } }, `${i ? ' · ' : ''}restore ${when(sn)}`))));
  };
  drawSnaps();
  root.append(h('section.block#backup',
    h('h2.section', 'Progress & backup'),
    h('p.small', `${langName} cards in progress: ${st.total}, due today: ${st.due}. By box: ${st.boxes.join(' / ')}.`),
    h('p.small#backup-langs', `One backup holds both courses (cards: ${perLang}).`),
    h('p.small.help-line', 'Progress is stored in this browser for this site; reinstalling the app icon on Android keeps it.'),
    persistLine,
    h('p.small', 'A backup is a short text with your progress, favorites and the Allergy / Hotel cards. Keep a copy somewhere else (Notes, Telegram, email). ' +
      (L.PLATFORM === 'ios' ? 'On iPhone, Safari may delete site data after 7 days without a visit; the home-screen app is safer. ' : '') +
      `Last backup: ${last}.`),
    h('div.backup-actions',
      h('button.btn.primary.wide#copy-backup', { type: 'button', on: { click: async () => {
        try { await navigator.clipboard.writeText(backupText()); backedUp('Backup copied - paste it into Notes or a chat'); } catch { toast('Copy is blocked here: use Share or the file link', 4000); }
      } } }, 'Copy backup to clipboard'),
      navigator.share ? h('button.btn.wide#share-backup', { type: 'button', on: { click: async () => {
        try { await navigator.share({ title: 'Japan Trip backup', text: backupText() }); backedUp('Backup shared'); } catch (e) { if (e?.name !== 'AbortError') toast('Sharing failed: ' + (e?.message || e), 4000); }
      } } }, 'Share…') : null,
      h('button.btn.wide#paste-backup', { type: 'button', on: { click: () => { pastePanel.hidden = !pastePanel.hidden; if (!pastePanel.hidden) pasteBox.focus(); } } }, 'Paste backup')),
    pastePanel,
    snapBox,
    h('p.small.file-links',
      h('button.textlink#backup-btn', { type: 'button', on: { click: () => {
        downloadJson(backupStore.exportAll(), `japan-trip-backup-${new Date().toISOString().slice(0, 10)}.json`);
        backedUp('Backup saved to Downloads / Files');
      } } }, 'Download as a file'),
      ' · ',
      h('label.textlink#restore-file', { tabindex: '0', role: 'button', on: { keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); imp.click(); } } } }, 'Restore from a file', h('span.visually-hidden', imp))),
  ));

  // --- About ---
  const sw = ctx.swInfo ? ctx.swInfo() : {};
  root.append(h('section.block.about',
    h('h2.section', 'About'),
    h('p.small', `Data v${ctx.data.version}. Offline mode: ${sw.controlled ? 'on' : sw.supported ? 'on after a restart' : 'not supported'}.` +
      (ctx.persisted === true ? ' Storage is persistent.' : '')),
    h('p.small', 'Phrases: ' + ctx.data.items.length + (zh ? ', characters: ' : ', kanji: ') + ctx.data.kanji.items.length + '.'),
    h('p.small', D.progressText()),
    h('button.btn.wide#open-credits', { type: 'button', on: { click: () => ctx.go('#/tools/credits') } }, 'Credits and licences'),
  ));
}

// ---------- App version and updates ----------
function updatesBlock() {
  const ver = h('p.app-version#app-version', 'App version: checking…');
  const showVersion = () => U.appVersion().then((v) => { ver.textContent = v ? `App version ${v}` : 'App version: offline copy not installed yet'; ver.dataset.version = v || ''; return v; });
  showVersion();
  const btn = h('button.btn.primary.big.wide#check-updates', { type: 'button', on: { click: async () => {
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      const r = await U.checkForUpdates();
      const v = await showVersion();
      if (r.status === 'updating') { btn.textContent = 'Updating… the app reloads by itself'; toast('New version found, installing…'); return; }
      if (r.status === 'offline') toast('No connection - try again online');
      else if (r.status === 'current') toast(`You're up to date${v ? ` (${v})` : ''}`);
      else toast('Updates are not supported in this browser');
    } catch {
      toast('No connection - try again online');
    }
    btn.disabled = false;
    btn.textContent = 'Check for updates';
  } } }, 'Check for updates');
  const hard = h('button.btn.wide#hard-refresh', { type: 'button', on: { click: async () => {
    if (!confirm('Reload the app files from the server? Your progress, favorites and the dictionary stay.')) return;
    hard.disabled = true;
    const r = await U.hardRefresh().catch(() => ({ status: 'offline' }));
    if (r.status === 'offline') { toast('No connection - try again online'); hard.disabled = false; }
  } } }, 'Hard refresh');
  return h('section.block#updates',
    h('h2.section', 'App updates'),
    ver,
    btn,
    hard,
    h('p.small', 'Hard refresh is for when something looks stuck: it downloads the app files again. Progress, favorites and the dictionary are kept.'));
}

// ---------- Credits and licences (required by the JMdict / EDRDG licence: a separate screen reachable from a menu) ----------
const A = (href, text) => h('a', { href, target: '_blank', rel: 'noopener' }, text || href);
export function renderCredits(ctx, root) {
  const D = dictFor('ja');
  const zhDict = dictFor('zh');
  const st = D.status();
  const date = st.dictDate || '2026-11-16';
  root.append(
    h('header.top', h('button.btn.small#credits-back', { type: 'button', 'aria-label': 'Back to Tools', on: { click: () => ctx.go('#/tools') } }, '‹ Tools'), h('h1', 'Credits')),
    h('section.block.credits#credits-dict',
      h('h2.section', 'Dictionary: JMdict'),
      h('p', 'This app uses the ', A('https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project', 'JMdict/EDICT'),
        ' dictionary files. These files are the property of the ', A('https://www.edrdg.org/', 'Electronic Dictionary Research and Development Group'),
        ', and are used in conformance with the Group’s ',A('https://www.edrdg.org/edrdg/licence.html', 'licence'),
        '. The dictionary data in this app is a selected, ranked and abridged version of JMdict and is available under ',
        A('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0'), '.'),
      h('p.small', `JMdict version: dictDate ${date}. JSON conversion: `, A('https://github.com/scriptin/jmdict-simplified', 'jmdict-simplified'),
        ' (CC BY-SA 4.0, same EDRDG terms). No copyright is claimed over the dictionary material.'),
      h('p.small', D.progressText())),
    h('section.block.credits#credits-cedict',
      h('h2.section', 'Chinese dictionary: CC-CEDICT'),
      h('p', 'The Chinese course uses ', A('https://cc-cedict.org/wiki/', 'CC-CEDICT'), ', maintained by ',
        A('https://www.mdbg.net/chinese/dictionary?page=cc-cedict', 'MDBG'), ' and licensed under ',
        A('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0'),
        '. The dictionary in this app is a selected, ranked and abridged version of CC-CEDICT and is available under the same licence.'),
      h('p.small', 'Word frequencies: ', A('https://github.com/rspeer/wordfreq', 'wordfreq'), ' by Robyn Speer (data CC BY-SA 4.0). HSK levels: ',
        A('https://github.com/drkameleon/complete-hsk-vocabulary', 'complete-hsk-vocabulary'), ' (MIT).'),
      zhDict.status().status === 'idle' ? null : h('p.small', zhDict.progressText())),
    h('section.block.credits#credits-fonts',
      h('h2.section', 'Fonts'),
      h('p', 'Shippori Mincho, Copyright 2021 The Shippori Mincho Project Authors (', A('https://github.com/fontdasu/ShipporiMincho', 'github.com/fontdasu/ShipporiMincho'), ').'),
      h('p', 'Lora, Copyright 2011 The Lora Project Authors (', A('https://github.com/cyrealtype/Lora-Cyrillic', 'github.com/cyrealtype/Lora-Cyrillic'), '), Reserved Font Name "Lora".'),
      h('p.small', 'Both are subsetted and licensed under the ', A('https://openfontlicense.org/', 'SIL Open Font License, Version 1.1'),
        '. Full texts: ', A('fonts/LICENSE-ShipporiMincho-OFL.txt', 'Shippori Mincho licence'), ', ', A('fonts/LICENSE-Lora-OFL.txt', 'Lora licence'), '.')),
    h('section.block.credits#credits-code',
      h('h2.section', 'Code'),
      h('p', A('https://github.com/WaniKani/WanaKana', 'WanaKana'), ' 5.3.1 (romaji to kana), The MIT License, Copyright (c) 2013 WaniKani Community Github.'),
      h('p.small.mit', 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.')),
  );
  window.scrollTo(0, 0);
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

export function readingFromPinyin(input) {
  const romaji = pinyinNumbersToMarks(String(input || '').trim().replace(/\s+/g, ' '));
  return { romaji, kana: pinyinSearchKey(romaji) };
}

function userPhrasesZh(ctx) {
  const box = h('section.block#user-phrases');
  const tag = ctx.lang.tag;
  const draw = () => {
    clear(box);
    const list = ctx.store.get('userItems', []);
    const cats = ctx.data.categories;
    const en = h('input', { type: 'text', placeholder: 'Where is the subway?' });
    const hanzi = h('input', { type: 'text', lang: tag, placeholder: '地铁在哪儿？' });
    const pinyin = h('input', { type: 'text', placeholder: 'ditie4 zai4 nar3 or dìtiě zài nǎr', autocapitalize: 'off', autocomplete: 'off' });
    const preview = h('div.small#user-reading');
    const cat = h('select', cats.map((c) => h('option', { value: c.id }, c.en)));
    const kind = h('select', h('option', { value: 'say' }, 'I say it'), h('option', { value: 'hear' }, 'Others say it'));
    const upd = () => {
      const r = readingFromPinyin(pinyin.value);
      preview.textContent = r.romaji ? `Pinyin: ${r.romaji}` : 'Pinyin with tone marks or tone numbers (ni3 hao3 → nǐ hǎo; v or u: for ü).';
    };
    upd();
    pinyin.addEventListener('input', upd);
    const field = (label, control) => h('label.field', h('span', label), control);
    add(box,
      h('h2.section', 'My phrases'),
      h('p.small', 'Your phrases appear in Phrases, in search and in Study cards. They are included in the backup.'),
      field('Meaning in English', en),
      field('Chinese (hanzi)', hanzi),
      field('Pinyin', pinyin),
      preview,
      h('div.field-row', field('Category', cat), field('Who says it', kind)),
      h('div.actions', h('button.btn.primary#add-phrase', { type: 'button', on: { click: () => {
        const meaning = en.value.trim(), text = hanzi.value.trim();
        const rd = readingFromPinyin(pinyin.value);
        if (!meaning || !text) { toast('Both English and Chinese text are required'); (meaning ? hanzi : en).focus(); return; }
        const item = {
          id: 'zh.u.' + Date.now().toString(36), cat: cat.value, kind: kind.value, en: meaning, ja: text,
          kana: rd.kana, ruby: rd.romaji ? `{${text}|${rd.romaji}}` : text, romaji: rd.romaji, tags: ['user'],
        };
        ctx.store.update('userItems', [], (arr) => [...arr, item]);
        toast('Added to ' + (ctx.data.catById[item.cat]?.en || 'Phrases'));
        draw();
      } } }, 'Add phrase')),
      list.length ? h('div.userlist', h('div.small.chips-label', `Added: ${list.length}`), list.map((it) => h('div.userrow',
        h('div.userrow-text', h('div', { lang: tag }, it.ja), h('div.small', `${it.romaji} — ${it.en}`)),
        h('button.btn.small', { type: 'button', 'aria-label': `Delete: ${it.en}`, on: { click: () => {
          ctx.store.update('userItems', [], (arr) => arr.filter((x) => x.id !== it.id));
          toast('Deleted');
          draw();
        } } }, 'Delete')))) : null,
    );
  };
  draw();
  return box;
}

function userPhrases(ctx) {
  const box = h('section.block#user-phrases');
  const draw = () => {
    clear(box);
    const list = ctx.store.get('userItems', []);
    const cats = ctx.data.categories.filter((c) => c.id !== 'cards');
    const en = h('input', { type: 'text', placeholder: 'Do you have an umbrella?' });
    const ja = h('input', { type: 'text', lang: 'ja', placeholder: '傘はありますか' });
    const kana = h('input', { type: 'text', lang: 'ja', placeholder: 'kasa wa arimasu ka', autocapitalize: 'off', autocomplete: 'off' });
    const preview = h('div.small#user-reading');
    const cat = h('select', cats.map((c) => h('option', { value: c.id }, c.en)));
    const kind = h('select', h('option', { value: 'say' }, 'I say it'), h('option', { value: 'hear' }, 'Staff say it'));
    const upd = () => {
      const r = readingFrom(kana.value);
      preview.textContent = r.kana ? `${r.kana} — ${r.romaji}` : 'Romaji: words separated by spaces; particles wa / o / e become は / を / へ.';
    };
    upd();
    kana.addEventListener('input', upd);
    const field = (label, control) => h('label.field', h('span', label), control);
    add(box,
      h('h2.section', 'My phrases'),
      h('p.small', 'Your phrases appear in Phrases, in search and in Study cards. They are included in the backup.'),
      field('Meaning in English', en),
      field('Japanese (as written)', ja),
      field('Reading (kana or romaji)', kana),
      preview,
      h('div.field-row', field('Category', cat), field('Who says it', kind)),
      h('div.actions', h('button.btn.primary#add-phrase', { type: 'button', on: { click: () => {
        const r = en.value.trim(), j = ja.value.trim();
        const rd = readingFrom(kana.value);
        const k = rd.kana || j;
        if (!r || !j) { toast('Both English and Japanese text are required'); (r ? ja : en).focus(); return; }
        const hasKanji = /[\u3400-\u9fff]/.test(j);
        const item = {
          id: 'u.' + Date.now().toString(36), cat: cat.value, kind: kind.value, en: r, ja: j, kana: k,
          ruby: hasKanji && k !== j ? `{${j}|${k}}` : j,
          romaji: rd.romaji || kanaToHepburn(k), tags: ['w1', 'user'],
        };
        ctx.store.update('userItems', [], (arr) => [...arr, item]);
        toast('Added to ' + (ctx.data.catById[item.cat]?.en || 'Phrases'));
        draw();
      } } }, 'Add phrase')),
      list.length ? h('div.userlist', h('div.small.chips-label', `Added: ${list.length}`), list.map((it) => h('div.userrow',
        h('div.userrow-text', h('div', { lang: 'ja' }, it.ja), h('div.small', `${it.romaji} — ${it.en}`)),
        h('button.btn.small', { type: 'button', 'aria-label': `Delete: ${it.en}`, on: { click: () => {
          ctx.store.update('userItems', [], (arr) => arr.filter((x) => x.id !== it.id));
          toast('Deleted');
          draw();
        } } }, 'Delete')))) : null,
    );
  };
  draw();
  return box;
}
