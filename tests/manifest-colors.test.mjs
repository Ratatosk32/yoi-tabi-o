// System bar colours of the installed app.
//
// Android (installed PWA = WebAPK): the system navigation / gesture bar below our tab bar is painted with ONE
// static colour from the manifest (background_color in Chromium < 156, theme_color from 156 on). It does not
// follow <meta name="theme-color"> at runtime (that only tints the top status bar), and the manifest dark-mode
// override ("Web App Dark Mode", user_preferences / color_scheme_dark) never shipped on Android: origin trial
// only, Chrome 99-114, "Not supported on Android" (https://chromestatus.com/api/v0/features/5714780426862592).
// WebAPKs are not drawn edge-to-edge (needs chrome://flags/#web-app-short-edges-cutout-mode), so our tab bar
// cannot paint under the bar either. The owner's phone runs the dark system theme, and a light strip under the
// dark app looked broken, so both manifest colours are the dark paper colour; in the light theme the bar is a
// dark frame under the tab bar. Chrome updates an installed WebAPK by itself (manifest checked at launch at most
// every 24 h, applied when the app is closed, the phone charging and on Wi-Fi; about://webapks > Update forces it):
// https://web.dev/articles/manifest-updates - no reinstall needed.
// Top status bar: <meta name="theme-color"> per colour scheme, rewritten by the manual theme toggle (app.js).
// iOS: viewport-fit=cover, the tab bar extends under the home indicator (safe-area-inset-bottom) in theme colour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const manifest = JSON.parse(read('app/manifest.webmanifest'));
const html = read('app/index.html');
const tokens = read('app/tokens.css');
const app = read('app/app.js');
const DARK = '#171613', LIGHT = '#f5f1e7';

test('manifest colours are the dark paper colour (Android navigation bar under the dark app)', () => {
  assert.equal(manifest.background_color, DARK);
  assert.equal(manifest.theme_color, DARK);
  assert.ok(tokens.includes(`--paper: ${DARK};`), 'dark theme paper colour in tokens.css');
  assert.ok(tokens.includes(`--paper: ${LIGHT};`), 'light theme paper colour in tokens.css');
});

test('top status bar follows the theme: meta theme-color per scheme, rewritten by the manual toggle', () => {
  assert.ok(html.includes(`<meta name="theme-color" content="${LIGHT}" media="(prefers-color-scheme: light)">`));
  assert.ok(html.includes(`<meta name="theme-color" content="${DARK}" media="(prefers-color-scheme: dark)">`));
  assert.ok(app.includes(`m.content = theme === 'dark' ? '${DARK}' : '${LIGHT}'`), 'setTheme() updates meta theme-color');
  assert.ok(html.includes(`m.content = t === 'dark' ? '${DARK}' : '${LIGHT}'`), 'saved theme applied before first paint');
});

test('iOS / edge-to-edge: viewport-fit=cover and the tab bar reaches the bottom safe area', () => {
  assert.ok(/name="viewport" content="[^"]*viewport-fit=cover/.test(html));
  assert.ok(/\.tabbar \{[^}]*height: calc\(var\(--tabbar-h\) \+ var\(--safe-b\)\)/.test(read('app/components.css')));
  assert.ok(/--safe-b: env\(safe-area-inset-bottom/.test(tokens), 'safe-b token from env()');
});
