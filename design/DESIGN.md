# Japan Trip — "paper and ink" design

Version 1, 2026-11-18. The `design/` folder is self-contained: `tokens.css`, `components.css`, `fonts/`, `icons/`, `mockup.html`, `shots/`, `tools/`. The design does not touch the `app/` folder.

Open the mockup: `design/mockup.html` (a gallery of all screens; `?s=phrases` shows one screen in the full window, `&theme=dark` the night theme). Overview sheets: `design/shots/overview-*.png`.

---

## 1. Concept

A travel notebook on washi. The page is unbleached paper, the text is ink, and there is one red hanko seal. The spirit is borrowed from noetx.com (warm paper `#f8f6f0`, ink in four steps, serif for reading, near-zero radii, "a quote is not a card"); the brand is not: no name, no logo.

Five rules everything rests on:

1. **Paper, not panels.** A phrase is an entry on the page, separated by a hairline. Only what has been "lifted" becomes a sheet (white surface, thin shadow): an expanded phrase, a review card, a quiz.
2. **Ink is the main action.** The primary button is black (sumi), not red. Red is reserved for the seal.
3. **One seal.** Vermilion (shu) appears 2–3 times per screen: the active-tab stamp, the dot after the title, the favourite star, emergency-service numbers. Nowhere else.
4. **Ma — emptiness as material.** Page margins 20 px, 32 px between sections, a section heading is small caps with a rule, not a filled bar.
5. **Four type voices.** Japanese — mincho; how to say it (romaji) — upright sans; what it means (Russian) — a serif with Cyrillic; interface — system sans. They cannot be confused even in peripheral vision.

Japanese motifs that carry meaning rather than decorate:

| Motif | Where | Why |
|---|---|---|
| Hanko (seal) | active tab, app icon, `.seal` | "you are here", "done" |
| Genkō yōshi (ruled manuscript paper) | kana table `.kgrid5` | a grid without boxes, lines with a touch of vermilion |
| Writing-practice square with a cross | character in the quiz `.kana-big` | like children's copybooks |
| Maru ○ / batsu × | correct / wrong | the state reads without colour |
| Ensō (open circle) | empty state, loading | emptiness, not an error |
| Blue rule in the margin | staff phrases `.phrase.hear` | "this will be said to you" — like a quote |

---

## 2. Palette

All values are in `tokens.css`. Contrast is computed by the script `tools/contrast.py` (WCAG 2.x); the figures below are its output.

### Light "paper" (default)

| Token | Hex | Role | Contrast on `--paper` / `--surface` / `--fill` |
|---|---|---|---|
| `--paper` | `#f5f1e7` | page (kinari, unbleached) | — |
| `--surface` | `#fdfbf6` | sheet: cards, fields | — |
| `--fill` | `#ebe5d7` | pressed state, muted fill | — |
| `--line` | `#ddd5c4` | hairline (decorative) | — |
| `--line-strong` | `#bfb5a0` | sheet edge, dashed line | — |
| `--line-field` | `#857e70` | field and outline-button border | 3.57 / 3.89 / 3.21 (needs ≥ 3) |
| `--ink` | `#1c1a17` | body text | 15.39 / 16.79 / 13.83 |
| `--ink-2` | `#46423b` | romaji, secondary text | 8.85 / 9.66 / 7.95 |
| `--ink-3` | `#676257` | captions, notes — the lightest colour for text | 5.38 / 5.87 / 4.83 |
| `--ink-4` | `#857e70` | marks and icons only, not text | 3.57 / 3.89 / 3.21 |
| `--shu` | `#c23a2b` | seal (fill, mark) | 4.73 / 5.16 / 4.25; white on it 5.14 |
| `--shu-text` | `#a83222` | red as text (numbers 110/119) | 5.92 / 6.46 / 5.32 |
| `--ai` | `#2b4c7e` | indigo: "you will hear", links, focus | 7.64 / 8.33 / 6.86 |
| `--matsu` | `#3d6a4c` | pine: correct, "I know it" | 5.53 / 6.04 / 4.97 |
| `--enji` | `#9b3a32` | dark red: wrong, "don't remember" | 6.11 / 6.67 / 5.49 |
| `--kin` | `#7a5c14` | ochre: "with difficulty", warning | 5.53 / 6.03 / 4.96 |

State washes (`--matsu-wash #e6eae2`, `--enji-wash #f1e4de`, `--kin-wash #ede8db`, `--ai-wash #e4e6e8`, `--shu-wash #f4e3dc`): body text on them ≥ 13.8, their own colour ≥ 5.1.

### Dark "night ink"

Warm, not blue-black: the paper colour becomes the ink colour.

| Token | Hex | Contrast on `--paper` / `--surface` / `--fill` |
|---|---|---|
| `--paper` | `#171613` | — |
| `--surface` | `#201f1b` | — |
| `--fill`, `--raised` | `#2a2823` | — |
| `--line` / `--line-strong` / `--line-field` | `#3a372f` / `#575245` / `#7d7768` | field: 4.06 / 3.70 / 3.30 |
| `--ink` | `#ece6d8` | 14.54 / 13.26 / 11.83 |
| `--ink-2` | `#c9c2b1` | 10.20 / 9.30 / 8.30 |
| `--ink-3` | `#a19a8a` | 6.47 / 5.89 / 5.26 |
| `--shu` | `#cc4532` | as a mark 3.85 / 3.51 / 3.13; white on it 4.53 |
| `--shu-text` | `#f08a75` | 7.41 / 6.75 / 6.03 |
| `--ai` | `#9bb8de` | 8.88 / 8.09 / 7.23 |
| `--matsu` / `--enji` / `--kin` | `#8fbf9c` / `#f0958a` / `#d9b765` | all ≥ 6.5 |

Result: all text in both themes passes WCAG AA (≥ 4.5); field borders and icons are ≥ 3.

### "Show to a Japanese person" card

White paper `#ffffff`, black ink `#000000` (21:1) **in both themes** — the `--show-*` tokens are not overridden. The caption for yourself is `#555555` (7.46).

### Themes and the toggle

- Light by default. Dark turns on automatically via `prefers-color-scheme: dark` if the user has not chosen a theme manually.
- Manual choice is an attribute on `<html>`: `data-theme="light"` or `data-theme="dark"`. No attribute means "follow the system".
- The dark-theme block in `tokens.css` is written twice (media query and attribute) — the price of pure CSS; the values must match.

```js
// before the first frame, in <head>:
const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t;
// button <button class="theme-toggle" aria-label="Theme">:
btn.onclick = () => {
  const el = document.documentElement;
  const dark = el.dataset.theme ? el.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  el.dataset.theme = dark ? 'light' : 'dark';
  localStorage.setItem('theme', el.dataset.theme);
  document.querySelector('meta[name=theme-color]').content = dark ? '#f5f1e7' : '#171613';
};
```

In `index.html`: `<meta name="color-scheme" content="light dark">` and two `theme-color` tags (`#f5f1e7` with `media="(prefers-color-scheme: light)"`, `#171613` for dark). In the manifest: `background_color` and `theme_color` = `#f5f1e7`.

### Paper texture

Two tiny inline SVG noises (`feTurbulence`) in `--paper-grain` (fine grain, 240 px tile) and `--paper-fibre` (soft unevenness of tone, 480×320 tile). Together about 0.7 KB of text in CSS, not a single image. They sit on `body`; sheets (`--surface`) are smooth, so they separate from the page without a heavy shadow. The browser rasterises the tile once, so scrolling is not slowed down (the background is not `fixed`).

---

## 3. Fonts

### Four roles

| Role | Token | Font | Where |
|---|---|---|---|
| Japanese, large | `--font-ja-display` | **Shippori Mincho 500** (own subset) → Hiragino Mincho ProN (iOS) → Noto Serif CJK JP (Android) → Yu Mincho | phrase, kana, kanji, character in the seal |
| Japanese, small | `--font-ja-ui` | system gothic: Hiragino Sans (iOS), Noto Sans CJK JP (Android) | furigana, readings in the cheat sheet, Japanese in notes, the "show" card |
| Russian for reading | `--font-read` | **Lora** (own subset, variable 400–700) → Georgia | translation, headings, numbers |
| Interface and romaji | `--font-ui` | system: Roboto (Pixel), SF (iPhone) | buttons, captions, romaji, numerals |

Why: mincho at 22–36 px is beautiful and legible, but at 10–13 px its thin strokes fall apart — so all small Japanese is set in gothic. The "show" card is bold gothic: a Japanese reader at a metre reads it faster than mincho, and the system font covers any text pasted from Translate.

### Offline and sizes (measured)

A full CJK font is 8.7 MB per weight (sources live in `fonts/src/` and are not deployed). Three files go into the app:

| File | Contents | Size |
|---|---|---|
| `fonts/shippori-mincho-500.kana.woff2` | hiragana, katakana, Japanese punctuation, full-width characters, digits — 305 glyphs | **43 KB** |
| `fonts/shippori-mincho-500.kanji.woff2` | only the kanji present in the app data and PLAN.md — currently 361 | **66 KB** |
| `fonts/lora-var.woff2` | Latin, ō ū ē ā ī, Cyrillic, punctuation — 320 glyphs, wght axis 400–700 | **47 KB** |
| `fonts/fonts.css` | three `@font-face` rules with `unicode-range` (generated) | 4 KB |

Total about **156 KB** versus ~17 MB for two full weights. Licences SIL OFL 1.1: `fonts/LICENSE-ShipporiMincho-OFL.txt`, `fonts/LICENSE-Lora-OFL.txt`.

What happens if the font fails to load or a character is missing from the subset: `font-display: swap` and `unicode-range` — the browser silently uses the system mincho for the missing character. This is normal behaviour, not an error: the user's free text and new phrases will always render. To have new kanji in the brand mincho as well, after editing `data/*.json` rerun:

```
design/tools/.venv/Scripts/python design/tools/subset-fonts.py
```

The script reads `app/**/*.json|js|html`, `PLAN.md` and the mockup (read-only) and writes the three woff2 files and `fonts.css`. The venv is local (`fonttools`, `brotli`, `pillow`) and needs no system software.

There are no external CDNs. An optional alternative if you want a gothic instead of the system one: Noto Sans JP from Google Fonts — about 1.1–1.6 MB per weight in woff2 subsets, offline only after full caching; **not recommended**.

### Scale (rem, respects the system text size)

| Token | px | Use |
|---|---|---|
| `--fs-micro` | 12 | tab labels, counters, section small caps |
| `--fs-small` | 13 | notes, hints |
| `--fs-label` | 14 | buttons, chips |
| `--fs-romaji` | 15 | romaji |
| `--fs-body` | 16 | Russian translation; input fields (iOS does not zoom at 16) |
| `--fs-lead` / `--fs-h2` | 18 / 20 | tile headings, h2 |
| `--fs-title` | 28 | screen title |
| `--fs-ja-sm` / `-md` / `-lg` | 18 / 22 / 26 | Japanese: answer, list row, expanded phrase and card |
| `--fs-ja-xl` | 36 | price in kanji numerals |
| `--fs-ja-hero` | 96 | character in the quiz |

Line height: Japanese without furigana 1.5, with furigana 2.05 (`--lh-ja-ruby`, switched on automatically via `:has(rt)`), Russian 1.55, interface 1.4.

### Furigana and romaji

- Markup: `<ruby>袋<rp>(</rp><rt>ふくろ</rt><rp>)</rp></ruby>` — exactly what `rubyEl()` already produces.
- `rt`: system gothic, 0.46em of the base (10 px at 22, 12 px at 26), colour `--ink-3`, not selected when copying. `rp` is hidden.
- Romaji: upright (not italic) system sans at 15 px, `--ink-2`, slight letter-spacing. This is the line a person reads aloud at the till — it must not be grey and tiny. The macrons ō ū exist in both the system fonts and Lora.

---

## 4. Sizes, touch, safe area

- Minimum touch target `--tap: 48px` (buttons, round ▶ / 0.7× / show / ★, checkbox rows, tabs). Main actions are `--tap-lg: 56px` (`.btn.big`, card grades, quiz options).
- 44 px chips and 36 px `.btn.small` are brought up to 48 px with an invisible halo (`::before`).
- Tab bar 64 px + `env(safe-area-inset-bottom)`; everything important is in the bottom two thirds of the screen: ▶ on the left under the thumb, "show" and ★ on the right.
- Page margins 20 px plus `safe-area-inset-left/right` (iPhone landscape).
- `viewport-fit=cover` is already set; `#view` and `.fs` account for the top inset (installed PWA on iPhone).
- Content width up to 560 px; on a tablet the cheat sheet is in 3 columns, tiles in 4.

---

## 5. Components and classes

Class names **match the builder's markup** (`app/modules/*.js`): `components.css` replaces `app/styles.css` without editing JS. Checked on a copy of the app in a temporary folder: five tabs in the light theme, "Phrases" and "Show" in the dark one. New things are marked **[NEW]** — these are optional improvements.

### Skeleton
| Class | What it is |
|---|---|
| `#view` (or `.view`) | content column with margins and bottom padding for the tab bar |
| `header.top > h1` | screen title; the red dot after it is drawn automatically |
| `h2.section` | small caps with a rule; `h2.section.span` spans the full grid width |
| `.block`, `.hint`, `.small`, `.muted`, `.center`, `.ok`, `.warn` | as before |
| `.card` (+ `.error`, `.notice`, `.today`, `.done`, `.edit`, `.flash`) | sheet |
| `.empty`, `.loading` | ensō + a line of text |
| **[NEW]** `button.theme-toggle` | empty button; moon/sun drawn according to the theme |
| **[NEW]** `.seal` | red seal with a single character: `<span class="seal" lang="ja">旅</span>` |

### Buttons
| Class | Look |
|---|---|
| `.btn` | outlined, 48 px |
| `.btn.primary` | ink (black) |
| `.btn.danger` | vermilion outline and text |
| `.btn.big`, `.btn.wide`, `.btn.small` | 56 px / full width / 36 px with halo |
| `.btn.icon` | 48 px circle |
| `.speak > .btn.icon:first-child` | ▶ 1.0× — the only filled circle |
| `.btn.icon.slow` | outlined circle with text; write `0.7×` |
| `.btn.icon.fav`, `.fav.on` | star without a frame; when on — vermilion |
| `.btn.again` / `.hard` / `.good` | brush stroke under the label: dark red / ochre / pine |
| `.btn.opt`, `.opt.right`, `.opt.wrong` | quiz option; ○ and × are added automatically |
| **[NEW]** `.btn.is-speaking` | ring around the button while speech is playing |
| `.actions`, `.actions.wrap`, `.speak` | button rows |

**[NEW] Icons** — CSS masks, coloured with `currentColor`: `<span class="ico ico-play"></span>`. Available: `ico-play`, `ico-star`, `ico-star-fill`, `ico-show`, `ico-close`, `ico-rotate`, `ico-search`, `ico-sun`, `ico-moon`, `ico-camera`, `ico-map`, `ico-phone`, `ico-sound`, `ico-chevron`, `ico-share`. The text glyphs `▶ ☆ ★ ⤢` also work, but on iOS `▶` may turn into a colour emoji — icons are more reliable (or `'▶︎'`).

### Chips and fields
`.chips` (horizontal strip to the screen edges with a fade), `.chip`, `.chip.on`, `.chip .ci` (Japanese badge), `.subnav`; `input.search` (magnifier inside), `.field > span`, `label.toggle > input + span` (switch), `label.check`, `.checks`, `.row`. Checkboxes and radios are styled globally.

### Phrases
```html
<article class="phrase [hear] [is-collapsed | open]">
  <div class="badge">You will hear</div>          <!-- or .badge.pat with a pattern -->
  <div class="jp"><span class="ja" lang="ja">…ruby…</span></div>
  <div class="romaji">fukuro wa irimasen</div>
  <div class="ru">I don't need a bag</div>
  <div class="note">…</div>
  <div class="replies">…</div> | <div class="reply-to">…</div>
  <div class="actions"><span class="speak">▶ 0.7×</span> [show] [★]</div>
</article>
```
- Without modifiers (as now) — everything is visible, entries are separated by a line (`shots/phrases-flat-*`).
- **[NEW]** `.is-collapsed` hides the note and buttons; `.open` lifts the phrase as a sheet and enlarges the Japanese to 26 px. Recommended: in the list all are collapsed, a tap expands one (`shots/phrases-*`, `shots/phrase-open-*`). The screen fits 5–6 phrases instead of 3.
- `.phrase.hear` — indigo rule on the left; `.replies`, `.replies-title`, `.reply`, `.reply-text`, `.reply-to`, `.linklike` — the "How to reply" block and the "Reply to" link.
- **[NEW]** `.kana-line` — a kana reading line under the large Japanese.

### Show
- List: `button.card.showcard > .jp + .ru`; the "expand" icon on the right is drawn automatically. `.card.edit .preview` — a white preview sheet in either theme.
- Full screen: `#fs.fs > .fs-body > p.fs-line(.small) > .fs-ja`, `p.fs-caption`, `.fs-bar > .btn`. `.fs.rot` — manual 90° rotation.
- Text size: **[NEW]** set `--fs-n` — a number, percent of the short side: `style="--fs-n: 11"`. The old `--fs: 11vmin` also works. Recommended table by text length: ≤ 8 characters — 20; ≤ 20 — 13.5; ≤ 40 — 11; ≤ 80 — 8; beyond that 6. At 11 on a 412 px screen a character is about 45 px — readable from a metre with margin to spare.
- Line breaking: in Chrome 119+ Japanese breaks at semantic phrase boundaries (`word-break: auto-phrase`), lines are balanced (`text-wrap: balance`); Safari breaks the usual way.
- Landscape: the button bar moves to the side, the text gets the full height (`shots/show-landscape-915x412-light.png`).

### Study
| Class | What it is |
|---|---|
| `.card.today > .dayline` | "Day 4 · week 1 of 3" |
| `.tiles > button.tile > strong + span + small` | tiles |
| `.sess-head` | session counters; **[NEW]** `.progress > span[style=width]` — progress line; **[NEW]** `.leitner > i(.on) ×5` — the card's box |
| `.card.flash`, `.prompt`, `.back`, `.grade` | card: question, dashed line, answer, three grades |
| `.kana-table > .kgrid5[style=--cols]`, `button.kana > .kch + .kr`, `.kcell-empty` | kana table — genkō yōshi |
| `.quiz-q > .kana-big + .btn.icon`, `.opts`, `.feedback` | quiz |
| `.price-big` (`[lang=ja]` or `.ja` — in kanji numerals), `input.num-input`, `.history`, `details.more`, `.ctable`, `.cnt` | price and time trainer |

Quiz states: correct option — `--matsu-wash` fill, `--matsu` border, mark ○; wrong — `--enji-wash`, `--enji`, ×. The text stays ink-coloured; the difference is carried by three cues at once (fill, border, mark), so colour is not the only carrier.

### Kanji
`.kgrid > button.kcell > .kja + .kkana + [.romaji] + .ru` — a ruled sheet in two columns without boxes. **[NEW]** `.kgrid.rows` — one column: kanji on the left, reading and meaning on the right.

### Tools
Blocks `section.block > h2.section`. **[NEW]** numbers: `<a class="tel" href="tel:110"><b>110</b><span>Police</span></a>`; a long number — `<b class="long">`, a second line — `<small>`. `a.btn.danger` is styled too.

### Tab bar, toast, banner
- `nav.tabbar > button(.on | [aria-current=page]) > span.glyph + span.lbl` — the active glyph becomes a seal (vermilion, rotated −3°).
- `#toast` (or `.toast`) + `.show` — a black bar above the tab bar; `.banner` — a raised sheet (SW update).

---

## 6. Accessibility

- Contrast — section 2: text ≥ 4.5, borders and icons ≥ 3 in both themes.
- Focus: `:focus-visible` — 2 px outline in `--ai` with a 2 px offset; on the "show" card — black. Mouse/touch focus draws no outline.
- States are never conveyed by colour alone: ○/×, brush stroke + label, `aria-pressed` on the star, `aria-current` on the tab.
- `lang="ja"` on all Japanese (correct glyphs and screen-reader voice); `rt` is not included in selection.
- Sizes in rem — system font scaling works.
- 16 px fields — iOS Safari does not zoom the page on focus.

## 7. Motion

Restrained: press 120 ms (1 px shift and fill), appearance of an answer and a toast 220 ms (opacity + 4–8 px), curve `cubic-bezier(.2,.7,.2,1)`. The tab seal simply appears. With `prefers-reduced-motion: reduce` all durations are 1 ms, the loading ensō does not spin, shifts are disabled.

---

## 8. App icon

A red hanko with the character 旅 ("journey") on paper; the uneven edge and dry speckles of the impression are an SVG filter. The character is converted to outlines, no font needed.

| File | Purpose |
|---|---|
| `icons/icon.svg` | source (rounded tile), usable as a favicon |
| `icons/icon-192.png`, `icons/icon-512.png` | `purpose: "any"` — 32 and 144 KB |
| `icons/icon-maskable.svg`, `icons/icon-maskable-512.png` | `purpose: "maskable"`: paper to the edges, seal inside the 80% safe circle — 127 KB |
| `icons/icon-square.svg`, `icons/apple-touch-icon.png` | 180×180, no transparency (iOS rounds it itself) — 26 KB |
| `icons/favicon-32.png` | browser tab |

Rebuild: `design/tools/.venv/Scripts/python design/tools/make-icon.py`, then `node design/tools/render-icons.mjs`.

---

## 9. Integration for the builder

**Path B (recommended) — replace the styles entirely.**
1. Copy `design/fonts/*.woff2` and `fonts.css` to `app/fonts/`, `design/icons/*.png` and `icon.svg` to `app/icons/`.
2. In `app/index.html`, instead of `styles.css`, include in order: `fonts/fonts.css`, `tokens.css`, `components.css` (or concatenate into one `styles.css`; then fix the paths in `fonts.css` to `fonts/…`).
3. `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`; in the manifest — three PNGs, `background_color` and `theme_color` `#f5f1e7`; meta tags from section 2.
4. Add the three woff2 files and the CSS to the `sw.js` precache; bump `VERSION`.
5. Add `button.theme-toggle` to `header.top` and the snippet from section 2.
6. Optionally: `.is-collapsed` / `.open` for phrases, `--fs-n` for the card, `.tel`, `.progress`, `.leitner`, `.ico-*` icons, button text `0.7×`.

**Path A (minimal) — tokens only.** Include `tokens.css` after `:root` in the current `app/styles.css`: it contains aliases for all variables that file uses (`--color-bg`, `--color-surface`, `--color-accent`, `--font-ja`, `--radius-*`, `--tap-min` …). The app gets the paper, ink and both themes without the rest; the primary button will then be red, not black.

**Scripts (`design/tools/`)**: `subset-fonts.py`, `make-icon.py`, `contrast.py`, `contact.py` — Python from the local `.venv`; `shots.mjs`, `render-icons.mjs`, `chrome.mjs` — Node 20 + installed Chrome, no npm dependencies (the script relaunches itself with `--experimental-websocket`).

**Not tested on devices.** Screenshots were taken in headless Chrome on Windows emulating 412×915 and 430×932 (DPR 2). The small Japanese in them is Yu Gothic; on a Pixel it will be Noto Sans CJK JP, on an iPhone Hiragino Sans. Safe area, the tab bar's `backdrop-filter` and `:has()` (needs Safari 15.4+, Chrome 105+) are worth checking on a real iPhone and Pixel.
