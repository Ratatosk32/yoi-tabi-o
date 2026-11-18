# UX audit and fixes

Date: 2026-11-18. Scope: every screen of the app at 412x915 and 430x932, light and dark.
Method: screenshots of the real app (`app/` served locally) before and after, in headless Chrome with phone emulation.
Not checked on physical phones: safe areas, speech and the on-screen keyboard still need a pass on the Pixel and the iPhone.

Screenshots (folder is gitignored): `design/shots/ux/before/` and `design/shots/ux/after/`.
File names are `<scene>-<width>x<height>-<theme>.png`; `_sheet-*.png` and `_tall-*.png` are contact sheets.
Regenerate with `node design/tools/ux-shots.mjs after --all-sizes`.

## Rules this pass applies everywhere

1. **Every action is one tap away.** No action hides behind "expand first".
2. **Nothing scrolls sideways.** Chip rows wrap; long option lists open in a bottom sheet; sub-tabs are equal segments.
3. **A failed load says so and offers Retry.** No endless spinner.
4. **An empty list never looks like a spinner**, and always offers the next step.
5. Touch targets are at least 44 px; primary actions 48-56 px.

## Findings and fixes

| # | Screen | Problem (before) | Fix (after) | Scenes |
|---|---|---|---|---|
| 1 | Phrases | Play, 0.7x, full screen and favorite were hidden until a phrase was tapped open: two taps for the most common action. | Each row has a 2x2 cluster of four 44 px buttons on the right, always visible. Only Play is inked; the other three are quiet outlines. Rows stay about 120 px tall, so 5 full phrases fit at both 412x915 and 430x932. Tapping the text still opens the sheet with the note and reply links; a small "note / replies / reply to" hint shows when there is something to open. | `phrases`, `phrases-open` |
| 2 | Phrases | Category chips scrolled sideways; the row jumped back to the start after every tap, and the active chip could be off screen. | One row under the search field: a category button (icon, name, count) that opens a bottom sheet with a two-column grid, plus a Favorites toggle. The redundant category heading is gone, which gives the list more room. | `phrases-picker` |
| 3 | Kanji | Same sideways chip row for groups. | Same picker button and sheet ("Kanji group"). Search results get a "Found: N" heading. | `kanji`, `kanji-picker` |
| 4 | Study | Five sub-tabs scrolled sideways; "Time & counting" was cut off. | Five equal segments that always fit: Today, Cards, Kana, Prices, Time. | `study-today` |
| 5 | Study, Tools | Quiz sets, price ranges, exercise modes and recent translations were sideways rows. | All chip rows wrap. Custom training uses a select for its 12 categories. Rows that had no label got one ("Price range", "Exercise", "Mode"). | `study-numbers`, `study-cards`, `study-kana` |
| 6 | Start | The user once saw an endless "Loading...". A stalled request, a module that failed to download or an exception before the first render all left the spinner (or a blank page) forever. | Data requests time out after 12 s. Any failed start shows an error card with the reason, a Retry button (reloads the data in place) and "Reload the app". A watchdog in `index.html` covers the case where the app script itself never runs (15 s, or at once if the script fails to download). | `load-error` |
| 7 | Phrases, Kanji | "Nothing found" and "No favorites" were drawn with the same ring as the loading state, so they read as "still loading". | The ring is for loading only. Empty states say what happened and offer one action: "Clear search" or "Browse phrases". | `phrases-search-none`, `phrases-fav-empty` |
| 8 | Study (Kana), Tools (My phrases) | The word "null" was printed on the page (between the kana tables, under the Add button). | Fixed (a shared `add()` helper skips empty children). | `study-kana-full`, `tools` |
| 9 | Show | The cards you actually show were below three long forms; a filled-in allergy or hotel card took scrolling plus a tap. | A one-tap "Cards" list comes first: your filled-in Allergy, Hotel and own-text cards, then the ready-made ones. Cards that are not filled in appear as a dashed reminder that jumps to the form. Forms moved below under "Edit my cards", with labels for the radio and checkbox groups and a "Ready" mark. Buttons say "Show full screen". | `show`, `show-filled` |
| 10 | Tools | A very long page; emergency numbers were four screens down. The third number's label was broken into two columns. | Jump links at the top (Emergency first). Each number is a full-width row with a phone mark; the long hotline number stacks above its label. | `tools` |
| 11 | Tools | "My phrases" had five unlabeled fields and two selects that looked like text inputs. | Labeled fields with examples as placeholders; category and "who says it" side by side; selects have a chevron everywhere; added phrases are listed as rows with Delete. | `tools` |
| 12 | Tools, Time | Collapsible lists ("If the button didn't open the camera", counters, dates) looked like plain text. | A chevron that turns when open, a hairline between items, 48 px rows. | `tools`, `study-time` |
| 13 | Study | "Listen" and "0.7x" were glued together; the slow button looked different from the one in Phrases. | Centered row with a gap; the same round 0.7x button everywhere. | `study-listen`, `study-numbers` |
| 14 | Prices, Time, Quiz | Feedback was plain text ("Wrong."), the answer ran together on one line, a button was labelled "again", "Give up" sounded like failing. | Verdict with a mark and color ("Correct" / "Not quite"), the answer large with kana and romaji below, "Play again", "Show answer". The quiz "Next" button is full width; the last one says "See the score". | `study-numbers-answered`, `study-quiz-answered` |
| 15 | Kana | Two identical "Hiragana / Katakana" rows (quiz sets and table switch) sat next to each other without a heading. | The tables have their own heading and a one-line hint. | `study-kana` |
| 16 | Phrases | "Reply to" was a line of underlined text with stray play icons and commas, shown even when collapsed. | One tappable chip per staff phrase, shown when the phrase is open. | `phrases-search` |
| 17 | Everywhere | Auto-played speech without a tap produced a "Could not speak: not-allowed" toast. | That case is silent; real errors still show a toast. | `study-listen` |
| 18 | Diagnostics | Buttons touched each other (the page used spacing variables that no longer exist). | Uses the current tokens; results wrap under their button. | `diag` |
| 19 | Keyboard, screen readers | The whole phrase article was the focus target; "Restore from file" could not be reached with the keyboard. | The phrase text is a button with `aria-expanded`; the sheet is a dialog that closes on Escape, Back or a tap outside and returns focus; "Restore from file" is focusable. Enter in the search field hides the keyboard. | - |

## Left as is (and why)

- **Price trainer options** stay as wrapping chips (two short rows each) rather than selects: both stay visible and one tap away.
- **"December dates"** in Time is still fixed to December; it matches the trip month.
- **Study card header** ("Review 1/12, new, mode, box, End") is dense but complete; it wraps instead of overflowing.

## For other test suites

`tools/e2e.mjs` was updated in one place: categories are picked through `#cat-picker` and `#sheet [data-cat="..."]`.
`qa/e2e.mjs` was not touched. It still clicks `.chips button[data-cat="<category>"]` for regular categories and needs the same two-step click
(the Favorites selector `.chips button[data-cat="fav"]` still works as is).

## Verification

- `npm test`: 50 of 50 pass.
- `node tools/validate.mjs`: no errors.
- `npm run e2e`: 134 of 134 pass (both viewports, both themes, offline reload).
- `node tools/check-no-cyrillic.mjs`: OK.
