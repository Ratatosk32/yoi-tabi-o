// Запуск внешних приложений (PLAN.md 2b, 2c). Все ссылки открываются только по клику пользователя.
// Android (Pixel/Chrome): intent:// с S.browser_fallback_url.
// iOS (iPhone/Safari): intent:// не существует → схемы приложений [не подтверждены документацией] и https-ссылки.
// Какие варианты реально работают — проверяется в diag.html на каждом телефоне (Фаза 0).

const enc = encodeURIComponent;

export function detectPlatform(nav = globalThis.navigator) {
  const ua = (nav && nav.userAgent) || '';
  const iPadOS = nav && nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}
export const PLATFORM = detectPlatform();

const LENS_WEB = 'https://lens.google.com/';

export const LENS_VARIANTS_BY_PLATFORM = {
  android: {
    lensApp: {
      label: 'Lens (пакет com.google.ar.lens)',
      url: () => `intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;S.browser_fallback_url=${enc(LENS_WEB)};end`,
    },
    googleApp: {
      label: 'Lens через приложение Google (googleapp://lens)',
      url: () => `intent://lens/#Intent;scheme=googleapp;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=${enc(LENS_WEB)};end`,
    },
    web: { label: 'lens.google.com (веб)', url: () => LENS_WEB },
  },
  ios: {
    googleApp: {
      label: 'Приложение Google (google://) → значок Lens',
      url: () => 'google://',
    },
    web: { label: 'lens.google.com (веб, может открыть приложение)', url: () => LENS_WEB },
  },
};
LENS_VARIANTS_BY_PLATFORM.other = { web: LENS_VARIANTS_BY_PLATFORM.android.web };

export const LENS_VARIANTS = LENS_VARIANTS_BY_PLATFORM[PLATFORM] || LENS_VARIANTS_BY_PLATFORM.other;
export const DEFAULT_LENS = { android: 'lensApp', ios: 'googleApp', other: 'web' }[PLATFORM] || 'web';

export function lensVariant(key) {
  return LENS_VARIANTS[key] || LENS_VARIANTS[DEFAULT_LENS] || Object.values(LENS_VARIANTS)[0];
}

/** Надёжные запасные пути «прочитать надпись» для текущей платформы. */
export const CAMERA_FALLBACKS = {
  android: [
    'Значок Lens в поисковой строке Google на домашнем экране.',
    'Circle to Search: долгое нажатие на полоску навигации / «Домой» и обвести текст (на поддерживаемых Pixel).',
    'Google Переводчик → «Камера» (офлайн с японским пакетом).',
  ],
  ios: [
    'Камера iPhone → навести на текст → значок Live Text (рамка с текстом) → «Перевести» (Apple Translate; скачайте японский язык в приложении «Перевод»).',
    'Приложение Google → значок камеры (Lens) в строке поиска.',
    'Google Translate → «Камера» (офлайн с японским пакетом).',
  ],
  other: ['Используйте Google Lens на телефоне.'],
};

export function translateUrl(text, sl = 'ru', tl = 'ja') {
  return `https://translate.google.com/?sl=${sl}&tl=${tl}&text=${enc(text || '')}&op=translate`;
}

/** Открыть именно приложение Переводчика: Android — intent с пакетом; iOS — схема googletranslate:// [неофициальная]. */
export function translateAppUrl(text, sl = 'ru', tl = 'ja', platform = PLATFORM) {
  if (platform === 'ios') return `googletranslate://?sl=${sl}&tl=${tl}&text=${enc(text || '')}`;
  const web = translateUrl(text, sl, tl);
  return `intent://translate.google.com/?sl=${sl}&tl=${tl}&text=${enc(text || '')}&op=translate#Intent;scheme=https;package=com.google.android.apps.translate;S.browser_fallback_url=${enc(web)};end`;
}
// старое имя (Android)
export const translateIntentUrl = (text, sl, tl) => translateAppUrl(text, sl, tl, 'android');

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
  // intent:// и схемы приложений — переход в той же вкладке по жесту пользователя
  if (!/^https?:/i.test(url)) { location.href = url; return; }
  window.open(url, '_blank', 'noopener');
}
