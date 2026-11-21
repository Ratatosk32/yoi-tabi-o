// Launch external apps (PLAN.md 2b, 2c). Links open only on a user tap.
// Android (Pixel/Chrome): intent:// with S.browser_fallback_url.
// iOS (iPhone/Safari): no intent:// → app URL schemes [not officially documented] and https links.
// What actually works is checked on each phone in diag.html (Phase 0).

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
      label: 'Lens (package com.google.ar.lens)',
      url: () => `intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;S.browser_fallback_url=${enc(LENS_WEB)};end`,
    },
    googleApp: {
      label: 'Lens via the Google app (googleapp://lens)',
      url: () => `intent://lens/#Intent;scheme=googleapp;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=${enc(LENS_WEB)};end`,
    },
    web: { label: 'lens.google.com (web)', url: () => LENS_WEB },
  },
  ios: {
    googleApp: {
      label: 'Google app (google://) → Lens icon',
      url: () => 'google://',
    },
    web: { label: 'lens.google.com (web, may open the app)', url: () => LENS_WEB },
  },
};
LENS_VARIANTS_BY_PLATFORM.other = { web: LENS_VARIANTS_BY_PLATFORM.android.web };

export const LENS_VARIANTS = LENS_VARIANTS_BY_PLATFORM[PLATFORM] || LENS_VARIANTS_BY_PLATFORM.other;
export const DEFAULT_LENS = { android: 'lensApp', ios: 'googleApp', other: 'web' }[PLATFORM] || 'web';

export function lensVariant(key) {
  return LENS_VARIANTS[key] || LENS_VARIANTS[DEFAULT_LENS] || Object.values(LENS_VARIANTS)[0];
}

/** Reliable fallbacks for "read a sign" on the current platform. */
export const CAMERA_FALLBACKS = {
  android: [
    'The Lens icon in the Google search bar on your home screen.',
    'Circle to Search: long-press the navigation bar / Home and circle the text (supported Pixels).',
    'Google Translate → Camera (works offline with the Japanese pack).',
  ],
  ios: [
    'iPhone Camera → point at the text → Live Text icon → Translate (download Japanese in the Translate app).',
    'Google app → camera (Lens) icon in the search bar.',
    'Google Translate → Camera (works offline with the Japanese pack).',
  ],
  other: ['Use Google Lens on your phone.'],
};

export function cameraFallbacks(platform = PLATFORM, langName = 'Japanese') {
  return (CAMERA_FALLBACKS[platform] || CAMERA_FALLBACKS.other).map((t) => t.replace(/Japanese/g, langName));
}

export function translateUrl(text, sl = 'ru', tl = 'ja') {
  return `https://translate.google.com/?sl=${sl}&tl=${tl}&text=${enc(text || '')}&op=translate`;
}

/** Open the Translate app itself: Android — intent with the package; iOS — googletranslate:// scheme [unofficial]. */
export function translateAppUrl(text, sl = 'ru', tl = 'ja', platform = PLATFORM) {
  if (platform === 'ios') return `googletranslate://?sl=${sl}&tl=${tl}&text=${enc(text || '')}`;
  if (platform !== 'android') return translateUrl(text, sl, tl); // desktop: no intent:// (QA B14)
  const web = translateUrl(text, sl, tl);
  return `intent://translate.google.com/?sl=${sl}&tl=${tl}&text=${enc(text || '')}&op=translate#Intent;scheme=https;package=com.google.android.apps.translate;S.browser_fallback_url=${enc(web)};end`;
}
// old name (Android)
export const translateIntentUrl = (text, sl, tl) => translateAppUrl(text, sl, tl, 'android');

/** System share sheet — the user picks Translate. */
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
  // intent:// and app schemes — navigate in the same tab on the user gesture
  if (!/^https?:/i.test(url)) { location.href = url; return; }
  window.open(url, '_blank', 'noopener');
}
