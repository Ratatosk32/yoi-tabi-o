// Запуск внешних приложений (PLAN.md 2b, 2c). Все ссылки открываются только по клику пользователя.
// Какие варианты реально работают на Pixel — проверяется в diag.html (Фаза 0).

const enc = encodeURIComponent;

export const LENS_VARIANTS = {
  lensApp: {
    label: 'Lens (пакет com.google.ar.lens)',
    url: () => `intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;S.browser_fallback_url=${enc('https://lens.google.com/')};end`,
  },
  googleApp: {
    label: 'Lens через приложение Google (googleapp://lens)',
    url: () => `intent://lens/#Intent;scheme=googleapp;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=${enc('https://lens.google.com/')};end`,
  },
  web: {
    label: 'lens.google.com (веб)',
    url: () => 'https://lens.google.com/',
  },
};

export function translateUrl(text, sl = 'ru', tl = 'ja') {
  return `https://translate.google.com/?sl=${sl}&tl=${tl}&text=${enc(text || '')}&op=translate`;
}

/** Вариант через intent с явным пакетом приложения Переводчика (если приложение перехватывает ссылку). */
export function translateIntentUrl(text, sl = 'ru', tl = 'ja') {
  const web = translateUrl(text, sl, tl);
  return `intent://translate.google.com/?sl=${sl}&tl=${tl}&text=${enc(text || '')}&op=translate#Intent;scheme=https;package=com.google.android.apps.translate;S.browser_fallback_url=${enc(web)};end`;
}

/** Системный лист «Поделиться» — пользователь выбирает Переводчик. */
export async function shareText(text) {
  if (!navigator.share) return 'unsupported';
  try { await navigator.share({ text }); return 'ok'; } catch (e) { return e && e.name === 'AbortError' ? 'cancel' : 'error'; }
}

export function mapsSearchUrl(q) {
  return `https://www.google.com/maps/search/?api=1&query=${enc(q || '')}`;
}

export function mapsTransitUrl(dest) {
  return `https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=${enc(dest || '')}`;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function open(url) {
  // для intent:// — тот же жест пользователя; window.location надёжнее window.open
  if (url.startsWith('intent:')) { location.href = url; return; }
  window.open(url, '_blank', 'noopener');
}
