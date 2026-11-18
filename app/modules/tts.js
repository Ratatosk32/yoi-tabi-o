// Озвучка через Web Speech API (на Android Chrome → системный движок, Speech Services by Google).
// Не бросает исключений, если API или японского голоса нет (PLAN.md 2a).

const JA_RE = /^ja([-_]JP)?$/i;
let voices = [];
let jaVoice = null;
let ready = null;

function synth() {
  try { return globalThis.speechSynthesis || null; } catch { return null; }
}

export function supported() {
  return !!synth() && typeof globalThis.SpeechSynthesisUtterance === 'function';
}

function refresh() {
  const s = synth();
  if (!s) return;
  try { voices = s.getVoices() || []; } catch { voices = []; }
  const ja = voices.filter((v) => JA_RE.test(v.lang || '') || /^ja/i.test(v.lang || ''));
  jaVoice = ja.find((v) => v.localService) || ja[0] || null;
}

/** Дождаться списка голосов (асинхронно на Android); максимум ~1.5 с. */
export function init() {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    const s = synth();
    if (!s) return resolve(status());
    refresh();
    if (voices.length) return resolve(status());
    let done = false;
    const finish = () => { if (done) return; done = true; refresh(); resolve(status()); };
    try { s.addEventListener('voiceschanged', finish, { once: true }); } catch { /* старые движки */ }
    setTimeout(() => { refresh(); if (voices.length) finish(); }, 400);
    setTimeout(finish, 1500);
  });
  return ready;
}

export function status() {
  return {
    supported: supported(),
    voiceCount: voices.length,
    hasJapanese: !!jaVoice,
    jaVoiceName: jaVoice ? `${jaVoice.name} (${jaVoice.lang}${jaVoice.localService ? ', local' : ''})` : null,
  };
}

export function listVoices() {
  refresh();
  return voices.map((v) => ({ name: v.name, lang: v.lang, local: !!v.localService, default: !!v.default }));
}

/**
 * Произнести японский текст. Вызывать из обработчика клика (Chrome требует user activation).
 * Возвращает Promise<'end'|'error:…'|'unsupported'>.
 */
export function speak(text, rate = 1.0) {
  const s = synth();
  if (!s || !text) return Promise.resolve('unsupported');
  return new Promise((resolve) => {
    try {
      // На iOS/WebKit cancel() непосредственно перед speak() может «проглотить» новую фразу,
      // поэтому отменяем только если что-то реально звучит.
      if (s.speaking || s.pending) s.cancel();
      if (!voices.length) refresh(); // iOS отдаёт голоса лениво — пробуем ещё раз в момент жеста
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (jaVoice) u.voice = jaVoice;
      u.rate = rate;
      // Некоторые движки не присылают ни onend, ни onerror — страхуемся опросом и таймаутом (заметка QA)
      let done = false, poll = null, hard = null;
      const finish = (r) => { if (done) return; done = true; clearInterval(poll); clearTimeout(hard); resolve(r); };
      u.onend = () => finish('end');
      u.onerror = (e) => finish('error:' + (e && e.error ? e.error : 'unknown'));
      s.speak(u);
      const t0 = Date.now();
      poll = setInterval(() => { if (Date.now() - t0 > 800 && !s.speaking && !s.pending) finish('end'); }, 250);
      hard = setTimeout(() => finish('timeout'), 4000 + text.length * 400);
      // Chrome иногда «засыпает» на паузе — страховка
      if (s.paused) s.resume();
    } catch (e) {
      resolve('error:' + (e && e.message ? e.message : e));
    }
  });
}

export function stop() {
  try { synth()?.cancel(); } catch { /* ignore */ }
}
