# Review list [?]

Items the author is not 100% sure about, or that depend on the device or place. The app shows no markers; they are collected here.
Automatic checks (tools/validate.mjs) guarantee agreement of ruby ↔ ja ↔ kana and romaji ↔ kana, kana-only tts, and symmetric "heard → reply" links. Correct kanji readings and natural phrasing are checked by a human.

## Proofreading 2026-11-18 (review/content-review.md, fixes.json): what was done

- **fixes.json: all 38 fixes applied** (3 error, 20 warn, 15 style) via `tools/apply-fixes.mjs` into the `tools/content/*.src.mjs` sources. 37 automatically, 1 (the handakuten note) by hand. **No disagreements.**
- **replyTo/replies links restored**: a `REPLIES` map in `phrases.src.mjs` (24 staff phrases → 35 replies); the build emits `replies` on hear items and `replyTo` on say items; the validator checks existence, kind and symmetry. In the UI: "How to reply" under a staff phrase (and on the back of a Listening card), "Reply to: …" under a reply.
- **All 20 suggested entries added**: 11 phrases and 9 kanji, including the restored 各駅停車 (k.kakutei). Plus 4 reply phrases the notes referred to: 一緒で大丈夫です, 持ち帰りで, 待ちます, プレゼント用です.
- **Section 3 questions, decisions:**
  - food.allergen-list: kept; the variant アレルゲン情報はありますか added to the note.
  - transport.together: kept; 三人並びの席をお願いします added to the note.
  - hotel.late-checkout: kept; レイトチェックアウトはできますか added to the note.
  - hotel.checkin: **changed** to 予約している〇〇です (more natural).
  - patterns.taberaremasen: translation **changed** to "Can’t eat eggs (I / my child)".
  - k.quartz: `kuōtsu` kept — the literal transliteration of クォ, as the validator checks it; `kwōtsu` is also acceptable.
  - hear.konbini.nenrei: the note now lists button variants (「20歳以上です」, 「確認」).
  - shop.taxfree, the 5,000 yen threshold: **open**, see item 28.

## Language (content)

| # | id | Status | What to check |
|---|---|---|---|
| 1 | transport.platform | closed | 行き: いき is normal in speech, ゆき in announcements; the note is right (confirmed by the proofreader). |
| 2 | shop.floor | open | 何階: なんがい (main), なんかい also occurs. |
| 3 | k.nissa | closed | 日差 = にっさ — the standard watchmakers' term (confirmed). |
| 4 | k.donichi | closed | 土日祝 = どにちしゅく; a note on 土休日 / 平日 in JR timetables was added. |
| 5 | k.kitsuenjo | open | 喫煙所: きつえんじょ (main), きつえんしょ also occurs. |
| 6 | konbini.chopsticks | open | お箸を二つください is casual; the formal counter for chopsticks is 二膳. |
| 7 | hear.konbini.shiharai | closed | 「？」 added; wording at tills varies — the note says so. |
| 8 | hear.food.drink | closed | Translation fixed ("Would you like something to drink?"). |
| 9 | hear.transport.kiiroi | open | 黄色い線: lines differ — 白線 / 点字ブロック / ホームドア. |
| 10 | hear.konbini.heat | open | In speech は is often dropped (お弁当温めますか); still recognisable. |
| 11 | numbers.10fun | on device | tts = じゅっぷん; check that TTS does not read じゅうぶん. |
| 12 | transport.together | closed | The ticket-office variant was added to the note. |
| 13 | hotel.futon | closed | 一組 ひとくみ is correct (no remarks from the proofreader). |
| 14 | transport.taxi-trunk | open | Drivers usually open the trunk themselves; the phrase is just in case. |
| 15 | shop.discount | open | Haggling: not in chains, sometimes in small used shops. |
| 16 | konbini.atm | closed | 7-Eleven accepts foreign cards (confirmed by the proofreader). |
| 17 | kana.words ボディ | open | ボディ / ボディー: both spellings occur. |
| 18 | kana.gojuon を | closed | を = o in Hepburn (confirmed). |
| 19 | view-show: allergy | closed | The card text was judged natural and polite (proofreading §4). |
| 20 | k.used: 美品/良品/並品 | open | Every shop has its own condition scale. |
| 21 | food.not-spicy, food.no-spice, hear.food.karasa | on device | Kana tts added (辛 → から); check that TTS does not read つら-. |
| 22 | k.balsam | open | バルサム切れ = バルサムぎれ (rendaku); high but not absolute confidence. |

## Devices (check on the phone, see diag.html)

| # | Where | What to check |
|---|---|---|
| 23 | Pixel | Lens intents `com.google.ar.lens` and `googleapp://lens`: which one really opens the Lens camera (not officially documented). |
| 24 | Pixel | Does the translate.google.com link open the app; does the intent with the `com.google.android.apps.translate` package work. |
| 25 | iPhone | The `google://` and `googletranslate://?sl=…&tl=…&text=…` schemes are unofficial. |
| 26 | iPhone | Camera Live Text → Translate for Japanese (needs Japanese downloaded in the Translate app). |
| 27 | both | Japanese TTS voice offline; 12800円 read correctly; Wake Lock (iOS 16.4+). |
| 28 | — | Tax-free since 1 Nov 2026: the threshold (5,000 yen before tax per shop per day?) and whether a purchase may be used before departure — check on the Japan Tourism Agency site. |

Total: 28 items. Closed 10 (1, 3, 4, 7, 8, 12, 13, 16, 18, 19). Open 18: 10 language items at your discretion (2, 5, 6, 9, 10, 14, 15, 17, 20, 22), 2 to check speech on a device (11, 21), 6 about devices and rules (23–28).
