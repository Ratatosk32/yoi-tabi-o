# Japan Trip: a PWA for a trip to Japan

One app on the phone (Pixel/Chrome and iPhone/Safari) for two jobs:
1. **Study** during the 3 weeks before the trip: kana, phrases, prices and numbers, understanding staff by ear (Leitner SRS).
2. **In Japan**: an offline phrasebook, "show to a Japanese person" cards (allergy, hotel address), a kanji cheat sheet, launchers for Lens / Google Translate / maps, emergency numbers.

The app is English-only (JA<->EN). No build step: vanilla JS (ES modules), custom CSS, offline support through a separate same-origin Service Worker. Plan and rationale: [PLAN.md](PLAN.md).

Live site: https://yoi-tabi-o.noetx.com

## Structure

```
app/                  ← deploy root (only this folder goes to hosting)
  index.html, app.js, sw.js, manifest.webmanifest, _headers, diag.html
  tokens.css, components.css, fonts/   ← design system (source in design/)
  modules/            ← numbers, srs, store, text, tts, launchers, ui, view-*.js
  data/               ← phrases.json (271), kana.json, kanji.json (115)
  vendor/             ← wanakana 5.3.1 (pinned version, MIT)
  icons/              ← 192, 512, maskable 512, apple-touch-icon 180
tools/
  content/*.src.mjs   ← SOURCE of phrases, kana, kanji
  build-data.mjs      ← source → app/data/*.json
  validate.mjs        ← schema, unique ids, ruby↔ja↔kana, romaji↔kana
  serve.mjs           ← local server (127.0.0.1)
  e2e.mjs             ← e2e in headless Chrome via CDP
  check-no-cyrillic.mjs ← repo rule: no Cyrillic in tracked files
tests/                ← unit tests (node --test)
qa/                   ← independent QA suite and report (qa/REPORT.md)
.github/workflows/deploy.yml ← tests + deploy on push to main
```

## Running locally

Requires Node 20+. Nothing to install.

```bash
cd D:\japan-trip
node tools/serve.mjs            # http://localhost:8787/
npm test                        # unit tests (numbers/time, SRS, storage, search, data)
npm run validate                # data checks
npm run e2e                     # e2e: 412x915 (Pixel) and 430x932 (iPhone), offline; screenshots in tools/out/
node tools/check-no-cyrillic.mjs  # repo rule: English only
```

The Service Worker only works on `localhost` or over HTTPS, so you cannot open `index.html` as a file (file://).

## Adding phrases

1. **In the source (main path)**: `tools/content/phrases.src.mjs`, a line like
   `['shop.film', 'フィルムはありますか', 'firumu wa arimasu ka', 'Do you have film?', 'note']`.
   The ruby field: `袋[ふくろ]` is the reading for the kanji run before the brackets, `{ATM|エーティーエム}` is an explicit pair. The `ja` and `kana` fields are built from ruby automatically.
   Romaji: modified Hepburn with macrons (ō, ū, ā, ī, ē); particles は/を/へ → wa/o/e; suffixes with a hyphen (sen-en, 〇〇-eki).
   Then: `npm run build:data && npm run validate && npm test`, bump `VERSION` in `app/sw.js`, commit and push to `main` (see Deploy).
2. **In the app**: "Tools" → "My phrases". The reading can be typed in romaji (`kasa wa arimasu ka` → かさはありますか). Phrases are stored locally and included in the backup.
3. **Import**: "Tools" → "Restore from file" (the JSON from "Download backup").

## Deploy to yoi-tabi-o.noetx.com

Deployment is automatic: every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml) on GitHub Actions, which runs the unit tests and data validation and then deploys the `app/` folder to the Cloudflare Pages project **`yoi-tabi-o`** (`wrangler pages deploy app --project-name=yoi-tabi-o --branch=main`). A failed test means no deploy. The workflow can also be started by hand (Actions → Deploy → Run workflow).

It is a separate Cloudflare Pages project, **not** a route inside the noetx project. The subdomain is a separate origin, so the SW, localStorage and cache are isolated from noetx.com. Do not touch `C:\conq\wrangler.toml`.

One-time setup (already done for the live site; needed only for a fresh repo or account):
1. Repository → Settings → Secrets and variables → Actions: add `CLOUDFLARE_API_TOKEN` (a token with the "Cloudflare Pages: Edit" permission) and `CLOUDFLARE_ACCOUNT_ID`. Without them the workflow still runs the checks but skips the deploy with a warning.
2. The first run creates the `yoi-tabi-o` Pages project itself (`wrangler pages project create`).
3. Cloudflare → Workers & Pages → `yoi-tabi-o` → **Custom domains** → Set up a domain → `yoi-tabi-o.noetx.com` → confirm. The noetx.com zone is already in Cloudflare, so the CNAME is created automatically. **Do not create the CNAME by hand beforehand**, or you will get error 522.

Routine updates:
1. Change files → bump `VERSION` in `app/sw.js` → commit → push to `main`. Watch the run in the repository's Actions tab.
2. Check: `curl -I https://yoi-tabi-o.noetx.com/sw.js` → `Cache-Control: no-cache`; `X-Robots-Tag: noindex` (from `app/_headers`).
3. On the phone the banner "A new version of the app is available." → "Update" appears. Rollback: Pages → `yoi-tabi-o` → Deployments → rollback (or revert the commit and push).
4. Before the trip, **freeze**: last deploy no later than ~December 6; during the trip change only data.

Manual fallback (only if GitHub Actions is unavailable): `npx wrangler pages deploy app --project-name=yoi-tabi-o --branch=main` from the repo root (asks for a login the first time). Cloudflare's dashboard Direct Upload is no longer used.

## Installing on the phone

- **Pixel (Chrome)**: open https://yoi-tabi-o.noetx.com → menu ⋮ → "Install app" / "Add to Home screen".
- **iPhone (Safari)**: open the site → "Share" → "Add to Home Screen". Launch it from the icon (data is better protected that way: Safari may erase a site's data if it has not been opened for 7 days).
- Then open every tab once while online, and check it in **airplane mode**.

## What to check on the phones (Phase 0)

Open `https://yoi-tabi-o.noetx.com/diag.html` on each phone, run the tests, mark "Yes/No" in your device's column and press "Copy report".

| Check | Pixel | iPhone |
|---|---|---|
| The Japanese voice works online ("Tools" → Speech → test) | ☐ | ☐ |
| …and in **airplane mode** (otherwise install the voice: Android — Speech Services by Google → Install voice data → 日本語; iPhone — Settings → Accessibility → Spoken Content → Voices → Japanese) | ☐ | ☐ |
| `12800円` is read as "ichiman nisen happyaku en" | ☐ | ☐ |
| The Lens button opens the Lens camera (variants on the diag page; pick the working one in "Settings") | ☐ | ☐ |
| Fallback: Circle to Search (Pixel) / Camera → Live Text → "Translate" (iPhone) | ☐ | ☐ |
| "Open in Translate" opens the **app** with the text; "Share" offers Translate | ☐ | ☐ |
| Google Translate: the offline Japanese pack is downloaded; camera and "Conversation" work in airplane mode | ☐ | ☐ |
| The app is installed on the home screen and opens **in airplane mode** | ☐ | ☐ |
| "Show" card: the screen stays on for 2 minutes (Wake Lock) | ☐ | ☐ |
| The "Allergy" and "Hotel address" cards are filled in (the Japanese address from the booking) | ☐ | ☐ |
| "Download backup" → the file is saved; "Restore from file" works | ☐ | ☐ |
| MyMemory (diag, online only): the request goes through (CORS) — informational, not used in the app | ☐ | ☐ |

## Daily routine (20–30 minutes)

"Study" → "Today": review (5–10 min) → listening (5 min) → prices (3–5 min) → topic of the week. The week is counted from the date of first launch (can be changed in "Settings").

## Design

All colours, fonts, radii, spacing and shadows are CSS variables in `app/tokens.css`; component styles are in `app/components.css`. The design source and rationale live in `design/` ([design/DESIGN.md](design/DESIGN.md)). A theme can be changed by overriding these variables; the markup does not need to change.

## Known limitations

- No Japanese speech recognition: for a dialogue use the "Conversation" mode in Google Translate.
- No machine translation inside the app (MyMemory is unreliable in quality and privacy): translate through Google Translate.
- The links to the Lens/Translate apps are not confirmed by documentation. What actually works is shown by diag.html; reliable fallbacks are described in "Tools".
- Language items for a native speaker to check: [REVIEW.md](REVIEW.md); the proofreading report is in [review/content-review.md](review/content-review.md).
