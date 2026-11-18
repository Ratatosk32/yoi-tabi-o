> Update: the app is now English-only (JA<->EN); the 'ru' field became 'en'.

# Japan Trip PWA — plan (v1, 2026-11-18)

Goal: a single app on a Pixel (Chrome) that
1) over ~3 weeks (until ~December 9) refreshes kana, survival phrases, numbers/prices and **listening comprehension**;
2) in Japan works as "one place": phrases, "show to a Japanese person", kanji cheat sheet, launcher buttons for Lens / Google Translate / maps.

Hosting: own subdomain `japanese.noetx.com` (Cloudflare). No implementation, publishing or sign-ups in this document — plan only.

Legend: **[MUST]** — required before the trip; **[NICE]** — if time remains; **[?]** — unsure / verify on the device.

---

## 0. Key conclusions (TL;DR)

1. The original spec is broadly right about the set of tabs, but **three technical assumptions are wrong or unreliable**: a Service Worker from a Blob URL is **forbidden**; the Tailwind Play CDN is a runtime compiler "not for production"; the MyMemory → wanakana chain **will not produce romaji** for a reply containing kanji (wanakana does not read kanji). On top of that, auto-speak after a network request may be blocked by Chrome's user-activation policy.
2. Translation and the camera are better **delegated** to Google Translate (offline JA pack) and Lens/Circle to Search; our app is a **launcher + trainer + offline phrasebook + "show" cards**.
3. From the language side, the spec lacks: **5-6 grammar patterns**, **counters**, **time/dates**, **phrases the staff will say** (most important — understanding keigo at the till by ear), **allergies/child**, **hotel address card**. Overkill: 1000 phrases, typing Japanese on the keyboard, an RU→JA "write it in Japanese" mode.
4. Hosting — a **separate Cloudflare Pages project** on `japanese.noetx.com`, not a route inside the noetx project. Subdomain = separate origin → its own SW scope and localStorage, nothing leaks into noetx.com.
5. Realistic amount of work: ~12–16 h of code + 4–6 h for content and proofreading. Content is the bottleneck, not code.

---

## 1. Critique of the spec as a Japanese teacher

### 1.1 What actually pays off in 3 weeks
| Priority | What | Why |
|---|---|---|
| 1 | **Listening comprehension of staff phrases** (keigo at the konbini, restaurant, till, station) | You will *say* short "this one, please" things, but you will *hear* long polite `袋はご利用ですか` at high speed. Recognition > speaking. |
| 2 | **Numbers and prices, especially 万** | Russian speakers stumble on grouping by 4 digits: 128 000 = 12万8千 = じゅうにまんはっせん. Plus sound changes: さんびゃく, ろっぴゃく, はっぴゃく, さんぜん, はっせん. |
| 3 | **10–15 polite formulas** + **6 patterns** | Patterns "unlock" hundreds of phrases (see 1.3). |
| 4 | **Katakana** | Almost all photo/tech/food vocabulary is katakana: カメラ, レンズ, フィルム, ボディ, バッテリー, レシート, ポイントカード. Hiragana is needed less (you partly remember it). |
| 5 | **Reading signs** (~50 kanji) | Recognition, not writing. 入口/出口, 中古/新品, 税込/税抜, 現金のみ. |
| 6 | Speaking | Minimal: pattern + noun + お願いします. |

### 1.2 What the spec is missing
- **Yōon and special kana**: きゃ/しゅ/ちょ…, small っ, the lengthening mark ー, extended katakana (ティ, ディ, ファ, フィ, ウィ, ウォ, ヴ) — without them you cannot read フィルム, ボディ, ウォッチ.
- **Staff phrases (recognition)** — a separate category with an "audio first" mode.
- **Counters**: つ (generic: ひとつ…とお), 人 (ひとり, ふたり, さんにん, よにん), 枚 (tickets, towels), 本 (bottles, umbrellas: いっぽん, にほん, さんぼん), 個 (いっこ, にこ), 名様 (heard from staff: 何名様).
- **Time and dates**: じ/ふん (ぷん) with sound changes (よじ, しちじ, くじ; いっぷん, さんぷん, じゅっぷん), dates (ついたち, ふつか, みっか, ようか, とおか, はつか), days of the week (月火水木金土日 — also needed for timetables: 土日祝 = Sat/Sun/holidays).
- **Allergies/child** + a **"show" card** with the child's allergy and a **hotel address card** for taxis.
- **Scenarios** (sequence of lines at a konbini till, in a restaurant) — the best comprehension trainer.
- **Prohibition signs in polite language**: `撮影はご遠慮ください` = "photography prohibited" (critical for a photographer; "ご遠慮ください" is a prohibition, not a request).
- **New tax-free rules (from November 1, 2026)** — see 4.6: you now pay the full price, the refund comes after a customs check on departure.

### 1.3 Patterns that "unlock everything" (learn as pattern cards)
| Pattern | Example | Romaji | Meaning |
|---|---|---|---|
| ～をください | これをください | kore o kudasai | This one, please |
| ～をお願いします | お会計をお願いします | okaikei o onegai shimasu | The bill, please (more universal than ください) |
| ～はどこですか | トイレはどこですか | toire wa doko desu ka | Where is the toilet? |
| ～はありますか | 英語のメニューはありますか | eigo no menyū wa arimasu ka | Do you have an English menu? |
| ～てもいいですか | 写真を撮ってもいいですか | shashin o totte mo ii desu ka | May I take a photo? |
| ～できますか | 免税手続きはできますか | menzei tetsuzuki wa dekimasu ka | Can you process tax-free? |
| ～は使えますか | このカードは使えますか | kono kādo wa tsukaemasu ka | Do you accept this card? |
| ～はいくらですか | これはいくらですか | kore wa ikura desu ka | How much is this? |
| ～を探しています | 中古のレンズを探しています | chūko no renzu o sagashite imasu | I'm looking for a used lens |
| ～てもらえますか | 見せてもらえますか | misete moraemasu ka | Could you show me? |
| ～に行きたいです | 渋谷に行きたいです | Shibuya ni ikitai desu | I want to go to Shibuya |
| ～はいりません | 袋はいりません | fukuro wa irimasen | I don't need a bag |
| ～が食べられません | 卵が食べられません | tamago ga taberaremasen | Can't eat eggs |

### 1.4 What is excessive in the spec
- **1000 phrases** — impossible to learn or to find at the right moment. Target: ~200 "say" cards + ~40 "hear" + generated numbers/time.
- **RU→JA mode with Japanese typing** — typing on a Japanese keyboard is not needed in 3 weeks. RU→JA = "recall and say it aloud, then reveal the answer + audio" (self-assessment).
- **"Character → pick the romaji" quiz** is useful only in the first week; after that "katakana word → meaning" and "audio → meaning" are more valuable.
- **Pitch accent** — don't learn it.

### 1.5 Kanji vs kana: how to display
- Every phrase stores **ja** (as Japanese people write it, with kanji), **kana** (reading) and **romaji**. Display: large `ja` with **furigana** via HTML `<ruby>` (toggle "furigana on/off"), smaller — romaji, smaller still — Russian.
- On the "show to a Japanese person" card — **only `ja`, without furigana and without romaji** (furigana doesn't bother a Japanese reader, but romaji distracts), large, with a short Russian caption at the bottom for yourself.
- All Japanese text must be in elements with `lang="ja"` — otherwise on a phone with a Russian locale Chrome may pick Chinese glyph variants (Han unification: 直, 今, 骨 look different).

### 1.6 Romaji: convention and pitfalls
Convention (as on station signs in Japan): **modified Hepburn with macrons**.
- Long vowels: おう/おお → **ō**, うう → **ū**, katakana ー → macron (コーヒー → kōhī). えい is written **ei** (as spelled; pronounced almost as a long "e"), いい → **ii**.
- っ → doubled consonant: きって kitte, いっぽん ippon; exception っち → **tchi** (まっちゃ → *matcha*, not *maccha*).
- ん → **n**; before a vowel/ya-yu-yo — **n'** (きんえん kin'en). Suffixes are separated by a hyphen, which also removes ambiguity: せんえん → sen-en, 〇〇えき → 〇〇-eki. Before b/p/m ん sounds like "m" (さんびゃく — "sambyaku"), still written n.
- Particles: は → **wa**, を → **o**, へ → **e**.
- For Russian speakers: don't use Cyrillic transcription (Polivanov) in parallel — it gets confused with the romaji on signs. But in notes for difficult sounds give a hint: tsu ≈ "ts" + "u", chi ≈ "chee", fu — between "f" and "h", r — a single tap between "r" and "l", u in です/ます is barely audible ("des", "mas").

### 1.7 Study regime: 3 weeks × 20–30 min/day (the app guides you day by day)
The daily in-app "lesson" = 4 blocks, a timer is optional:
1. **SRS review** (5–10 min): new + due cards of the day.
2. **Listening** (5 min): "audio first" on staff phrases, 1.0x, then 0.7x.
3. **Numbers/prices/time** (3–5 min): trainer.
4. **Topic of the day** (5–10 min): the week's category.

| Week | Focus | New cards/day |
|---|---|---|
| 1 (Nov 19–25) | Hiragana (days 1–2), katakana + yōon + っ/ー (days 3–5), polite formulas, numbers up to 10 000 and **万**, counters つ/人. Topic: konbini. | 10–12 |
| 2 (Nov 26–Dec 2) | 6 patterns, restaurant, transport, time/dates, 枚/本/個. Listening: konbini + restaurant staff phrases. Kanji: signs and station (5/day). | 12–15 |
| 3 (Dec 3–8) | Shopping (photo/watches, tax-free), hotel, child/health/emergency. Shop kanji. Prepare "show" cards (hotel address, allergy). 2 "dress rehearsals" of scenarios. | 8–10 + review |
| In Japan | 5 min in the morning: "phrases of the day" according to the trip plan; in the evening — mark the phrases that were actually useful. | — |

---

## 2. Critique as an engineer (verified by search, links in section 8)

### (a) ja-JP TTS via Web Speech on Pixel/Chrome
- Chrome on Android proxies `speechSynthesis` to the system Android TTS engine (on Pixel — Speech Services by Google). **Works offline if Japanese voice data is installed**: Settings → System → Languages → Text-to-speech output → Speech Services by Google → gear → Install voice data → 日本語 [? exact menu item names depend on the Android version]. Quality is decent "neural TTS", sufficient for listening recognition.
- `getVoices()` on Android is unreliable: the list is populated asynchronously (wait for `voiceschanged` + retry after 300–1000 ms), tags may be `ja_JP` (match `/^ja[-_]JP/i`), Chrome on Android returns more of a "list of languages" than of voices; `localService` as an offline indicator [?] is not confirmed for Android.
- **Handling**: always set `utterance.lang = 'ja-JP'` (works even if no voice is selected explicitly); `speechSynthesis.cancel()` before `speak()`; rate 1.0 and 0.7. If there is no Japanese voice in the list — a banner "Install a Japanese voice" with instructions. A "Diagnostics" screen: voice list, test button, airplane-mode test.
- **User activation**: since Chrome 71 `speechSynthesis.speak()` without a user gesture is rejected (`not-allowed`). "Auto speak" after an asynchronous translation may not work → provide an explicit ▶ button, or speak directly in the click handler if the page has already had activation [? verify behavior after await].
- Ambiguous kanji readings in TTS: a `tts` field (kana) as an override for individual phrases; don't voice `〇〇` placeholders.

### (b) Google Lens via an intent from Chrome
- The `intent://…#Intent;scheme=https;package=…;S.browser_fallback_url=…;end` syntax is documented by Chrome; it launches only on a user gesture and only for activities with `BROWSABLE`; if it doesn't resolve — it goes to `browser_fallback_url`.
- **Risk**: on Pixel, Lens usually lives inside the Google app (`com.google.android.googlequicksearchbox`), the separate package `com.google.ar.lens` is often not installed, and it is unknown whether it declares a BROWSABLE filter for `lens.google.com` [? not confirmed by any source]. The fallback `https://lens.google.com/` on mobile is a promo page, not the camera.
- **Solution**: the Lens button = "best effort" (intent + fallback), verified in Phase 0. Next to it — a mini-guide to reliable paths that don't depend on the web: (1) the Lens icon in the Google search bar on the home screen; (2) **Circle to Search** (long press on the navigation bar / "Home") — translates any screen, including menus and price tags in photos [? depends on the Pixel model, Pixel 8+ has it]; (3) the "Camera" mode in Google Translate (offline translation of signs). Recommendation to the user: put Lens and Translate shortcuts on the home screen next to our PWA icon.

### (c) MyMemory
- Limits (official page): anonymous **5 000 characters/day** (per IP), with the `de=email` parameter — **50 000/day**. Enough for tourist phrases.
- RU→JA quality: MyMemory mixes translation memory (human segments from the internet) and MT — short phrases sometimes get odd "memory matches", the register is often not touristy. Dangerous for "show to a Japanese person".
- CORS: judging by widespread use from the browser — allowed [? check the `Access-Control-Allow-Origin` header in Phase 0].
- Privacy: text goes to a third party (Translated srl), probably stored; don't enter addresses/passport data.
- **wanakana won't help**: it converts kana↔romaji but **does not read kanji**, and machine translation returns a kanji+kana mix → the romaji will have "holes". Conclusion: don't show romaji for an MT reply (or show it only if the reply is pure kana).
- **Better**: the Google Translate app with the **offline Japanese pack**. From our PWA: (1) an "Open in Translate" button → `https://translate.google.com/?sl=ru&tl=ja&text=…&op=translate` (opens the web version, or the app if it intercepts the link — [?] verify); (2) a **"Share → Translate"** button via `navigator.share({text})` — guaranteed to work in Chrome Android, the system sheet will show Translate; (3) text selection → "Translate" in the Android context menu (PROCESS_TEXT). The user copies the answer from Translate and pastes it into our "show" card (full screen, with wake lock).
- LibreTranslate public instances — unstable, weaker JA quality; not recommended.

### (d) Service Worker from a Blob — not allowed
- Registering a SW with a `blob:`/`data:` URL is rejected (TypeError per spec/WPT); the SW script must be a **separate same-origin file over HTTPS** (or localhost). SW doesn't work at all with `file://`.
- So "one index.html file" → a **small static multi-file PWA** at `https://japanese.noetx.com` (see sections 3 and 6).
- Installability in Chrome: HTTPS, `manifest.webmanifest` with `name`, `short_name`, `start_url`, `display: standalone`, 192 and 512 px icons (+ `maskable`), a registered SW with a `fetch` handler [from memory: Chrome's requirements have been relaxed over time, but with SW+fetch we cover all variants].
- Storage: `localStorage` is enough; call `navigator.storage.persist()` and provide a **JSON progress export/import** button in case of clearing.

### (e) Tailwind CDN
- Officially: the Play CDN (`@tailwindcss/browser@4` / the old `cdn.tailwindcss.com`) is "for development, not for production"; it is an **in-browser compiler on every load**. Offline it will work only if cached, plus a delay and flash of unstyled content.
- **Solution**: plain CSS (~300 lines, CSS variables, dark theme). Tailwind isn't needed for this UI; if you really want it — a one-off Tailwind CLI build into a static `styles.css` (but that's an install, later).

### (f) wanakana
- Needed only for: (1) generating romaji from kana when the user adds their own phrases; (2) checking quiz answers. Take a **pinned version**, put the file in `/vendor/` (not a runtime CDN) and precache it in the SW. For the main content, romaji is stored in JSON in advance (proofread manually — wanakana doesn't know about は→wa/を→o in particles or about macrons).

### (g) ja-JP speech recognition ("what did the Japanese person say")
- `webkitSpeechRecognition` in Chrome Android works via a Google server → **network required**. On-device mode (`processLocally`) appeared in desktop Chrome; blink-dev discussions state that Android/ChromeOS don't support on-device Web Speech [? confirm the date of the message; state as of late 2026 not verified].
- **Conclusion**: not in the MVP. For dialogue — the "Conversation" mode in Google Translate (more reliable online; offline [?] — test in airplane mode). In our app — [NICE] an online "Listen" button with an honest "internet required" label.

---

## 3. Recommended architecture

### 3.1 Files (no build, vanilla JS + ES modules)
```
app/                     ← deploy root (D:\japan-trip\app)
  index.html             ← shell, 5 tabs, <html lang="ru">
  styles.css             ← own CSS, dark theme, CSS variables
  app.js                 ← tab router, state, rendering
  modules/tts.js         ← speak(text, rate), voice detection, diagnostics
  modules/srs.js         ← Leitner
  modules/numbers.js     ← number → kana/romaji (万, sound changes), time
  modules/store.js       ← localStorage, export/import
  modules/launchers.js   ← Lens / Translate / Maps / share
  sw.js                  ← same-origin service worker, VERSION
  manifest.webmanifest
  icons/icon-192.png, icon-512.png, icon-maskable-512.png
  data/phrases.json      ← say + hear + patterns
  data/kana.json         ← gojūon, dakuten, yōon, extended katakana tables, quiz words
  data/kanji.json        ← cheat sheet
  data/scenarios.json    ← [NICE] scenarios
  vendor/wanakana.min.js ← pinned version
  _headers               ← Cloudflare Pages headers
  diag.html              ← TTS/intent/share diagnostics (Phase 0)
```

### 3.2 Tabs (rethinking the 5 tabs)
1. **Phrases** — categories, search (by ru/ja/kana/romaji), ★ favorites, ▶ 1.0x / 0.7x, "Show" button.
2. **Study** — "Lesson of the day" (SRS + listening + numbers), Kana (tables + quiz), Numbers/time.
3. **Show** — full-screen cards: "I speak little Japanese, please have a look", child's allergy, hotel address, free text (paste from Translate). White background/black text, huge font, Screen Wake Lock, rotation.
4. **Kanji** — cheat sheet with groups and search.
5. **Tools** — Lens, Translate (RU field + "Open"/"Share"), Google Maps, transit app, emergency numbers (110, 119, Japan Visitor Hotline), TTS diagnostics.

### 3.3 Phrase data schema
```json
{
  "version": 1,
  "items": [
    {
      "id": "konbini.bag.none",
      "cat": "konbini",
      "kind": "say",               // say | hear | pattern | card
      "ru": "No bag needed",       // Russian text in v1 (English gloss here)
      "ja": "袋はいりません",
      "ruby": "袋[ふくろ]はいりません", // furigana: kanji[reading]
      "kana": "ふくろはいりません",
      "romaji": "fukuro wa irimasen",
      "tts": null,                 // TTS override (kana) if TTS reads the kanji wrong
      "note": "Reply to 袋はご利用ですか",
      "replyTo": ["hear.konbini.bag"],   // for say: which staff lines it answers
      "replies": [],               // for hear: ids of suitable replies
      "pattern": "～はいりません",
      "tags": ["core", "w1"],
      "audio": null                // [NICE] path to a native-speaker recording
    }
  ]
}
```
Rules: `id` is stable (`cat.word.variant`) and unique; user phrases get a `u.` prefix and are stored separately (`localStorage: userItems`), merged with the base ones by `id`.

### 3.4 SRS: Leitner, not SM-2
- SM-2 is designed for months; in 3 weeks the intervals won't have time to "ramp up", and tuning "ease" is unnecessary. **Leitner, 5 boxes**, intervals 0 / 1 / 2 / 4 / 7 days; mistake → box 1; "Know it" → +1; grading with 3 buttons (Don't remember / Hard / Know it; "hard" = stays).
- Progress is stored **per pair (id, mode)**: `JA→RU`, `RU→JA (aloud)`, `Audio→meaning`. The mode for `hear` is only "audio→meaning".
- Daily limits: 10–15 new, unlimited reviews. Filter by categories and week tags (`w1`, `w2`, `w3`).
- Storage: `localStorage['srs'] = {"konbini.bag.none|ja2ru": {"box":3,"due":"2026-11-25"}}` — hundreds of entries, a few KB.

### 3.5 How the user adds phrases
1. **Main path**: edit `data/phrases.json` in the repository → deploy → the SW updates the cache (section 6.3). Phrases can be generated with AI and must be proofread.
2. **In the app** [NICE]: an "Add phrase" form (ru, ja, kana; romaji automatically via wanakana with manual correction), stored locally.
3. **JSON import/export** (paste text or a file) — same schema; for backing up progress and user phrases.

---

## 4. Content plan

Target volumes (~230 in total + generated numbers/time):

| Category (`cat`) | say | hear | Comment |
|---|---|---|---|
| basics — polite formulas | 20 | — | すみません as the "universal key" |
| patterns — patterns | 13 | — | section 1.3 |
| konbini — konbini/supermarket | 15 | 15 | |
| food — restaurant/food | 25 | 12 | incl. 食券 (ticket vending machine) |
| transport — trains/taxi | 20 | 8 | train announcements — hear |
| hotel — hotel | 12 | 4 | |
| shop — shopping/photo/watches/tax-free | 30 | 8 | |
| family — child/health/emergency | 20 | 3 | |
| numbers — numbers/time/counting | ~30 + generator | — | |
| cards — "show" | 6 | — | |

Romaji convention — section 1.6. All examples below are in the neutral-polite register (です/ます), natural for a tourist. Places where I'm unsure are marked [?]. Ideally — one proofreading by a native speaker (a Japanese acquaintance or a native-speaker Q&A service) before the trip.

### 4.1 basics — polite formulas
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| すみません | すみません | sumimasen | Excuse me (to call someone, apologize, "thanks for the trouble") |
| ありがとうございます | ありがとうございます | arigatō gozaimasu | Thank you |
| お願いします | おねがいします | onegai shimasu | Please (I ask) |
| 大丈夫です | だいじょうぶです | daijōbu desu | It's fine / no need (soft refusal) |
| いいえ、結構です | いいえ、けっこうです | iie, kekkō desu | No, thank you (firmer) |
| わかりません | わかりません | wakarimasen | I don't understand |
| もう一度お願いします | もういちどおねがいします | mō ichido onegai shimasu | Once more, please |
| ゆっくり話してください | ゆっくりはなしてください | yukkuri hanashite kudasai | Please speak more slowly |
| 英語は話せますか | えいごははなせますか | eigo wa hanasemasu ka | Do you speak English? |
| 日本語は少しだけ話せます | にほんごはすこしだけはなせます | nihongo wa sukoshi dake hanasemasu | I speak a little Japanese |
| ここに書いてもらえますか | ここにかいてもらえますか | koko ni kaite moraemasu ka | Could you write it here? |

### 4.2 konbini — say
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| これをください | これをください | kore o kudasai | This one, please |
| 袋はいりません | ふくろはいりません | fukuro wa irimasen | I don't need a bag |
| 袋をお願いします | ふくろをおねがいします | fukuro o onegai shimasu | A bag, please (paid, a few yen) |
| 温めてください | あたためてください | atatamete kudasai | Please heat it up |
| 温めなくて大丈夫です | あたためなくてだいじょうぶです | atatamenakute daijōbu desu | No need to heat it |
| お箸を二つください | おはしをふたつください | ohashi o futatsu kudasai | Two pairs of chopsticks (colloquial; the formal counter is 膳) |
| カードで払えますか | カードではらえますか | kādo de haraemasu ka | Can I pay by card? |
| ATMはありますか | エーティーエムはありますか | ētīemu wa arimasu ka | Is there an ATM here? |
| トイレを借りてもいいですか | トイレをかりてもいいですか | toire o karite mo ii desu ka | May I use the toilet? |

### 4.3 food — restaurant/food
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| 三人です。大人二人と子ども一人です | さんにんです。おとなふたりとこどもひとりです | sannin desu. otona futari to kodomo hitori desu | There are three of us: two adults and a child |
| 英語のメニューはありますか | えいごのメニューはありますか | eigo no menyū wa arimasu ka | Do you have an English menu? |
| おすすめは何ですか | おすすめはなんですか | osusume wa nan desu ka | What do you recommend? |
| これを一つと、これを二つください | これをひとつと、これをふたつください | kore o hitotsu to, kore o futatsu kudasai | One of this and two of this, please (pointing at the menu) |
| 子ども用の椅子はありますか | こどもようのいすはありますか | kodomo-yō no isu wa arimasu ka | Do you have a child's chair? |
| 取り皿をください | とりざらをください | torizara o kudasai | Small plates, please (to share) |
| お水をください | おみずをください | omizu o kudasai | Water, please |
| 辛くないものはありますか | からくないものはありますか | karakunai mono wa arimasu ka | Is there anything not spicy? |
| お会計をお願いします | おかいけいをおねがいします | okaikei o onegai shimasu | The bill, please |
| ごちそうさまでした | ごちそうさまでした | gochisōsama deshita | Thank you, it was delicious (when leaving) |

### 4.4 transport — trains/taxi
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| 〇〇駅はどこですか | 〇〇えきはどこですか | 〇〇-eki wa doko desu ka | Where is 〇〇 station? |
| この電車は〇〇に行きますか | このでんしゃは〇〇にいきますか | kono densha wa 〇〇 ni ikimasu ka | Does this train go to 〇〇? |
| 〇〇行きは何番線ですか | 〇〇いきはなんばんせんですか | 〇〇-iki wa nanbansen desu ka | Which platform for 〇〇? (行き is read いき, in speech sometimes ゆき [?both variants occur]) |
| 乗り換えはどこですか | のりかえはどこですか | norikae wa doko desu ka | Where do I transfer? |
| 〇〇まで大人二枚、子ども一枚お願いします | 〇〇までおとなにまい、こどもいちまいおねがいします | 〇〇 made otona nimai, kodomo ichimai onegai shimasu | To 〇〇: two adults and one child |
| この住所までお願いします | このじゅうしょまでおねがいします | kono jūsho made onegai shimasu | (Taxi) To this address, please — show the card |
| ここで止めてください | ここでとめてください | koko de tomete kudasai | Stop here, please |
| コインロッカーはどこですか | コインロッカーはどこですか | koin rokkā wa doko desu ka | Where are the coin lockers? |
| エレベーターはどこですか | エレベーターはどこですか | erebētā wa doko desu ka | Where is the elevator? (with a stroller/suitcases) |
| 切符をなくしました | きっぷをなくしました | kippu o nakushimashita | I lost my ticket |

### 4.5 hotel — hotel
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| チェックインをお願いします。予約した〇〇です | チェックインをおねがいします。よやくした〇〇です | chekkuin o onegai shimasu. yoyaku shita 〇〇 desu | Check-in, please. The booking is under 〇〇 |
| 荷物を預かってもらえますか | にもつをあずかってもらえますか | nimotsu o azukatte moraemasu ka | Can I leave my luggage? |
| 朝食は何時からですか | ちょうしょくはなんじからですか | chōshoku wa nanji kara desu ka | What time does breakfast start? |
| チェックアウトは何時ですか | チェックアウトはなんじですか | chekkuauto wa nanji desu ka | What time is check-out? |
| Wi-Fiのパスワードを教えてください | ワイファイのパスワードをおしえてください | waifai no pasuwādo o oshiete kudasai | Please tell me the Wi-Fi password |
| タオルをもう一枚お願いします | タオルをもういちまいおねがいします | taoru o mō ichimai onegai shimasu | One more towel, please |
| エアコンがつきません | エアコンがつきません | eakon ga tsukimasen | The air conditioner won't turn on |
| タクシーを呼んでもらえますか | タクシーをよんでもらえますか | takushī o yonde moraemasu ka | Could you call a taxi, please? |

### 4.6 shop — shopping, photo gear, watches, tax-free
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| 中古カメラの売り場はどこですか | ちゅうこカメラのうりばはどこですか | chūko kamera no uriba wa doko desu ka | Where is the used camera section? |
| 〇〇のレンズを探しています | 〇〇のレンズをさがしています | 〇〇 no renzu o sagashite imasu | I'm looking for a 〇〇 lens |
| これを見せてもらえますか | これをみせてもらえますか | kore o misete moraemasu ka | Could you show me this? |
| 手に取ってもいいですか | てにとってもいいですか | te ni totte mo ii desu ka | May I hold it? |
| 試し撮りしてもいいですか | ためしどりしてもいいですか | tameshidori shite mo ii desu ka | May I take a test shot? |
| カビやクモリはありますか | カビやクモリはありますか | kabi ya kumori wa arimasu ka | Is there any fungus or haze (in the lens)? |
| 動作確認済みですか | どうさかくにんずみですか | dōsa kakunin-zumi desu ka | Has it been tested for function? |
| 保証は何か月ですか | ほしょうはなんかげつですか | hoshō wa nankagetsu desu ka | How many months is the warranty? |
| 付属品は何がありますか | ふぞくひんはなにがありますか | fuzokuhin wa nani ga arimasu ka | What accessories are included? |
| 箱と保証書はありますか | はことほしょうしょはありますか | hako to hoshōsho wa arimasu ka | (Watch) Is there a box and warranty card? |
| 国際保証は付いていますか | こくさいほしょうはついていますか | kokusai hoshō wa tsuite imasu ka | Does it have an international warranty? |
| 免税手続きはできますか | めんぜいてつづきはできますか | menzei tetsuzuki wa dekimasu ka | Can you process tax-free? |
| 税込みですか | ぜいこみですか | zeikomi desu ka | Is the price tax-inclusive? |
| ちょっと考えます | ちょっとかんがえます | chotto kangaemasu | I'll think about it (polite way to leave) |

**Tax-free from November 1, 2026 (important for photo gear/watches)**: shops charge the full price including the 10% tax; the shop registers the purchase as tax-free against the passport (original), and **the tax refund comes after customs at the airport inspects the goods on departure** (before check-in). Each receipt is checked as a whole; goods used in Japan may not qualify [? sources disagree on whether you may use a purchased camera before departure — check the Japan Tourism Agency site before buying]. Allow time at the airport. Details of the payout method differ between shops.

Used-condition scale: each shop has its own (美品 / 良品 / 並品 / 難あり / ジャンク, letter grades AB/B/C) — compare only within the same shop.

### 4.7 family — child, health, emergency
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| 子どもは卵アレルギーです | こどもはたまごアレルギーです | kodomo wa tamago arerugī desu | My child is allergic to eggs (substitute the allergen) |
| これに卵は入っていますか | これにたまごははいっていますか | kore ni tamago wa haitte imasu ka | Does this contain eggs? |
| 子どもが迷子になりました | こどもがまいごになりました | kodomo ga maigo ni narimashita | My child is lost |
| 近くに病院はありますか | ちかくにびょういんはありますか | chikaku ni byōin wa arimasu ka | Is there a hospital nearby? |
| 薬局はどこですか | やっきょくはどこですか | yakkyoku wa doko desu ka | Where is the pharmacy? |
| 子どもが熱を出しました | こどもがねつをだしました | kodomo ga netsu o dashimashita | My child has a fever |
| 救急車を呼んでください | きゅうきゅうしゃをよんでください | kyūkyūsha o yonde kudasai | Please call an ambulance |
| 助けてください | たすけてください | tasukete kudasai | Help! |
| おむつを替える場所はありますか | おむつをかえるばしょはありますか | omutsu o kaeru basho wa arimasu ka | Where can I change a diaper? (if there is a baby) |
| 財布をなくしました | さいふをなくしました | saifu o nakushimashita | I lost my wallet |

Numbers: **110** police, **119** ambulance/fire, **Japan Visitor Hotline 050-3816-2787** (JNTO, 24/7, English/Chinese/Korean). Allergens that must be labeled in Japan (8): えび, かに, くるみ, 小麦, そば, 卵, 乳, 落花生 — into the kanji cheat sheet.

### 4.8 numbers — numbers, time, counting (mostly generated by code)
| JA | Kana | Romaji | Meaning |
|---|---|---|---|
| 三百円 | さんびゃくえん | sanbyaku-en | 300 yen |
| 六百円 / 八百円 | ろっぴゃくえん / はっぴゃくえん | roppyaku-en / happyaku-en | 600 / 800 |
| 三千円 / 八千円 | さんぜんえん / はっせんえん | sanzen-en / hassen-en | 3000 / 8000 |
| 一万円 | いちまんえん | ichiman-en | 10 000 (not "ten thousands"!) |
| 十二万八千円 | じゅうにまんはっせんえん | jūniman hassen-en | 128 000 |
| 何時ですか | なんじですか | nanji desu ka | What time is it? |
| 四時 / 七時 / 九時 | よじ / しちじ / くじ | yoji / shichiji / kuji | 4 / 7 / 9 o'clock |
| 三時半 | さんじはん | sanji han | half past three (3:30) |
| 一人 / 二人 / 三人 / 四人 | ひとり / ふたり / さんにん / よにん | hitori / futari / sannin / yonin | 1/2/3/4 people |
| 一本 / 二本 / 三本 | いっぽん / にほん / さんぼん | ippon / nihon / sanbon | 1/2/3 (bottles, umbrellas) |

"Prices and numbers" trainer: random prices **weighted by reality** (konbini 100–1 500 step 10; café 800–8 000; electronics 20 000–250 000 step 100/1000), modes: (1) audio → type the digits; (2) "12万8千円" → type the digits; (3) digits → say it aloud, checked by self-assessment. TTS voices the string as digits ("128000円") — Japanese TTS reads it correctly [? verify on the device]; kana/romaji for the hint — a function in `numbers.js`. Same for time (時/分) and dates.

### 4.9 hear — what the staff will say (recognition, "audio first" mode)
| JA | Kana | Romaji | Meaning | Your reply |
|---|---|---|---|---|
| いらっしゃいませ | いらっしゃいませ | irasshaimase | Welcome | not needed (a nod) |
| 何名様ですか | なんめいさまですか | nanmei-sama desu ka | How many people? | 三人です |
| 少々お待ちください | しょうしょうおまちください | shōshō omachi kudasai | Please wait a moment | はい |
| こちらへどうぞ | こちらへどうぞ | kochira e dōzo | This way, please | — |
| ご注文はお決まりですか | ごちゅうもんはおきまりですか | go-chūmon wa okimari desu ka | Are you ready to order? | はい / もう少し待ってください (mō sukoshi matte kudasai) |
| 店内でお召し上がりですか | てんないでおめしあがりですか | tennai de omeshiagari desu ka | Will you eat here? | はい / 持ち帰りで (mochikaeri de) |
| 袋はご利用ですか | ふくろはごりようですか | fukuro wa go-riyō desu ka | Do you need a bag? | 大丈夫です / お願いします |
| ポイントカードはお持ちですか | ポイントカードはおもちですか | pointo kādo wa omochi desu ka | Do you have a points card? | ないです / いいえ |
| 温めますか | あたためますか | atatamemasu ka | Shall I heat it up? | お願いします / 大丈夫です |
| お箸はお付けしますか | おはしはおつけしますか | ohashi wa otsuke shimasu ka | Shall I add chopsticks? | お願いします |
| 以上でよろしいですか | いじょうでよろしいですか | ijō de yoroshii desu ka | Is that everything? | はい |
| お支払い方法は？ | おしはらいほうほうは | oshiharai hōhō wa? | How will you pay? | カードで / 現金で (genkin de) |
| 一括払いでよろしいですか | いっかつばらいでよろしいですか | ikkatsu-barai de yoroshii desu ka | In a single payment? (card) | はい |
| 暗証番号の入力をお願いします | あんしょうばんごうのにゅうりょくをおねがいします | anshō bangō no nyūryoku o onegai shimasu | Please enter your PIN | — |
| レシートはご入用ですか | レシートはごにゅうようですか | reshīto wa go-nyūyō desu ka | Do you need the receipt? | お願いします |
| 千円お預かりします | せんえんおあずかりします | sen-en oazukari shimasu | Receiving 1000 yen | — |
| 二百円のお返しです | にひゃくえんのおかえしです | nihyaku-en no okaeshi desu | Your change is 200 yen | — |
| 申し訳ございません、売り切れです | もうしわけございません、うりきれです | mōshiwake gozaimasen, urikire desu | Sorry, it's sold out | — |
| ただいま満席です | ただいままんせきです | tadaima manseki desu | All seats are taken right now | 待ちます (machimasu) |
| ラストオーダーです | ラストオーダーです | rasuto ōdā desu | Last order | — |
| パスポートをお願いします | パスポートをおねがいします | pasupōto o onegai shimasu | Your passport, please (tax-free, hotel) | — |
| かしこまりました | かしこまりました | kashikomarimashita | Certainly, right away | — |
| お待たせしました | おまたせしました | omatase shimashita | Sorry to keep you waiting (serving the order) | — |
| 撮影はご遠慮ください | さつえいはごえんりょください | satsuei wa go-enryo kudasai | Photography prohibited | すみません |
| ドアが閉まります | ドアがしまります | doa ga shimarimasu | The doors are closing | — |
| 次は〇〇、〇〇です | つぎは〇〇、〇〇です | tsugi wa 〇〇, 〇〇 desu | The next station is 〇〇 | — |
| お出口は右側です | おでぐちはみぎがわです | odeguchi wa migigawa desu | The exit is on the right | — |

### 4.10 cards — "show to a Japanese person" (full screen)
1. 「すみません、日本語があまり話せません。この画面を見ていただけますか。」 — "Excuse me, I don't speak Japanese well. Could you please look at this screen?"
2. **Allergy** (fill in!): 「この子は〇〇アレルギーです。〇〇が入っている料理は食べられません。」 — "This child is allergic to 〇〇. They cannot eat dishes containing 〇〇."
3. **Hotel address** (fill in the Japanese address from the booking): 「このホテルまでお願いします。」 + name and address.
4. 「この商品の免税手続きをお願いします。」 — tax-free for this item.
5. 「写真を撮ってもいいですか。」 — may I take a photo (in a shop / of a person).
6. Free text: paste a translation from Google Translate.

### 4.11 Kanji cheat sheet (~60)
| Group | Kanji — reading (romaji) — meaning |
|---|---|
| Signs | 入口 いりぐち (iriguchi) entrance · 出口 でぐち (deguchi) exit · 非常口 ひじょうぐち (hijōguchi) emergency exit · 押 おす (osu) push · 引 ひく (hiku) pull · 男 おとこ men's · 女 おんな women's · お手洗い おてあらい (otearai) toilet · 禁煙 きんえん (kin'en) no smoking · 喫煙所 きつえんじょ (kitsuenjo) smoking area · 立入禁止 たちいりきんし (tachiiri kinshi) no entry · 撮影禁止 さつえいきんし (satsuei kinshi) no photography · 営業中 えいぎょうちゅう (eigyōchū) open · 準備中 じゅんびちゅう (junbichū) closed/in preparation · 定休日 ていきゅうび (teikyūbi) regular closing day · 故障中 こしょうちゅう (koshōchū) out of order · 危険 きけん (kiken) danger · 年末年始 ねんまつねんし (nenmatsu nenshi) New Year holidays (closed ~Dec 29–Jan 3) |
| Station | 駅 えき station · 改札 かいさつ (kaisatsu) ticket gates · 〇番線 ばんせん (bansen) platform No. · 乗り場 のりば (noriba) boarding area · 乗換 のりかえ (norikae) transfer · 普通/各駅停車 ふつう/かくえきていしゃ (futsū/kakueki teisha) local, all stops · 快速 かいそく (kaisoku) · 急行 きゅうこう (kyūkō) · 特急 とっきゅう (tokkyū) — express trains (特急 often requires an extra ticket) · 指定席 していせき (shiteiseki) reserved seats · 自由席 じゆうせき (jiyūseki) non-reserved seats · 精算機 せいさんき (seisanki) fare adjustment machine · 優先席 ゆうせんせき (yūsenseki) priority seats · 女性専用車 じょせいせんようしゃ (josei sen'yōsha) women-only car · 東口/西口/南口/北口 ひがしぐち/にしぐち/みなみぐち/きたぐち east/west/south/north exit · 終電 しゅうでん (shūden) last train · 土日祝 どにちしゅく (donichi-shuku) Sat/Sun/holidays [? the reading of 祝 as しゅく in this abbreviation is standard] |
| Shop | 税込 ぜいこみ (zeikomi) tax included · 税抜 ぜいぬき (zeinuki) tax excluded · 免税 めんぜい (menzei) tax-free · 現金のみ げんきんのみ (genkin nomi) cash only · カード可 カードか (kādo-ka) cards accepted · 割引 わりびき (waribiki) discount · 半額 はんがく (hangaku) −50% · 値下げ ねさげ (nesage) markdown · 売切 うりきれ (urikire) sold out · 在庫 ざいこ (zaiko) in stock/stock · 会計/レジ かいけい (kaikei) checkout · 無料/有料 むりょう/ゆうりょう (muryō/yūryō) free/paid · 試着室 しちゃくしつ (shichakushitsu) fitting room |
| Used photo gear | 中古 ちゅうこ (chūko) used · 新品 しんぴん (shinpin) new · 未使用 みしよう (mishiyō) unused · 美品 びひん (bihin) excellent condition · 良品 りょうひん (ryōhin) good · 並品 なみひん (namihin) average/signs of use · 難あり なんあり (nan-ari) with a defect · ジャンク (janku) "as is", not working/not tested · 現状品 げんじょうひん (genjōhin) sold as is · 動作確認済み どうさかくにんずみ (dōsa kakunin-zumi) function tested · 動作未確認 どうさみかくにん (dōsa mikakunin) not tested · 付属品 ふぞくひん (fuzokuhin) accessories · 元箱 もとばこ (motobako) original box · 保証 ほしょう (hoshō) warranty · カビ (kabi) fungus · クモリ (kumori) haze · キズ (kizu) scratches · スレ (sure) scuffs · チリ/ホコリ (chiri/hokori) dust specks · 外観 がいかん (gaikan) exterior · 光学 こうがく (kōgaku) optics · 分解清掃済み ぶんかいせいそうずみ (bunkai seisō-zumi) cleaned (CLA) |
| Watches | 自動巻 じどうまき (jidōmaki) automatic · 手巻 てまき (temaki) hand-wound · クォーツ (kuōtsu) quartz · 正規品 せいきひん (seikihin) official import · 並行輸入 へいこうゆにゅう (heikō yunyū) parallel import · 国際保証 こくさいほしょう (kokusai hoshō) international warranty · 保証書 ほしょうしょ (hoshōsho) warranty card · OH済 オーバーホールずみ (ōbāhōru-zumi) serviced · 日差 にっさ (nissa) daily rate [? reading にっさ — as used among watch people, verify] · 防水 ぼうすい (bōsui) water resistance |
| Food/menu | 定食 ていしょく (teishoku) set meal · 丼 どん (don) rice bowl with topping · 大盛 おおもり (ōmori) large portion · 並 なみ (nami) regular · 辛口/甘口 からくち/あまくち spicy/mild · 食券 しょっけん (shokken) meal ticket from a machine · 持ち帰り もちかえり (mochikaeri) takeaway · 店内 てんない (tennai) eat in · 豚/牛/鶏 ぶた/ぎゅう/とり pork/beef/chicken · 魚 さかな fish · 生 なま raw · アレルゲン (allergens): 卵 たまご egg · 乳 にゅう milk · 小麦 こむぎ wheat · そば buckwheat · 落花生 らっかせい peanut · えび shrimp · かに crab · くるみ walnut |

---

## 5. Implementation plan

### Phase 0 — checks on the Pixel (1–2 h, BEFORE the main code) [MUST]
Deploy a single page `diag.html` + `sw.js` + `manifest` to `japanese.noetx.com`.
| Check | How | Criterion |
|---|---|---|
| Japanese TTS offline | Install the JA voice; airplane mode; ▶ on 「袋はご利用ですか」 and 「12800円」 | It speaks, reads "いちまんにせんはっぴゃくえん" |
| `getVoices()` | Print the list, `lang`, `localService` | Determined how to detect the Japanese voice |
| Lens intent | 3 button variants (com.google.ar.lens; Google app; fallback) | Record which one opens the Lens camera |
| Translate | Link `translate.google.com/?sl=ru&tl=ja&text=…`; `navigator.share` | Find out whether the app opens; share shows Translate |
| MyMemory CORS | `fetch` from the page | Response without a CORS error (otherwise we drop the feature) |
| SW/offline | Install the PWA, airplane mode, restart | Opens from the icon without network |
| Wake Lock | "Show" card for 2 min | The screen doesn't turn off |

### Phase 1 — MVP "in Japan" (5–6 h) [MUST, by ~November 23]
Shell + 5 tabs, own CSS, SW+manifest, **Phrases** (categories, search, ★, ▶ 1.0/0.7), **Show** (cards, wake lock), **Kanji**, **Tools** (launchers based on Phase 0 results, emergency numbers). Content: basics, patterns, konbini, food, transport (~100).
Acceptance on the Pixel: install to the home screen; in airplane mode all tabs open, TTS speaks, searching for 「ふくろ」/"bag" (Russian word in v1)/"fukuro" finds the phrase; the card is readable from 1 m.

### Phase 2 — study (4–5 h) [MUST, by ~November 29]
Kana (gojūon/dakuten/yōon/extended katakana tables, tap = sound, quiz), **Leitner SRS** with 3 modes and week tags, **price/time trainer**, "Lesson of the day", progress export/import. Content: hear (~40), hotel, shop, family, numbers.
Acceptance: complete the lesson of the day 3 days in a row; progress is preserved after restart; export → import on a clean profile restores progress; the number generator produces correct kana on the control set (300, 600, 800, 3000, 8000, 10000, 128000, 250000).

### Phase 3 — proofreading and freeze (2–3 h) [MUST, by ~December 6]
Proofread all JSON (romaji, particles は/を, macrons, `lang="ja"`), fill in the "allergy" and "hotel address" cards, final airplane-mode test, **version freeze** (during the trip — content edits only).

### Phase 4 — [NICE]
Dialogue scenarios (konbini/restaurant/taxi) with sequential audio; add-phrase form + wanakana; MyMemory inline (if it passed the CORS test) labeled "draft translation"; online speech recognition; a "useful/not useful" diary; native-speaker voice recordings (`audio`).

### Estimate and what to cut
Total MUST: ~12–16 h of code + 4–6 h of content. If we fall behind, cut in this order: scenarios → MyMemory → kana quiz (keep the tables with sound) → SRS (replace with "shuffle favorites + week category") → RU→JA mode. **Do not cut**: offline, Phrases+TTS, the hear category, the price trainer, "show" cards.

---

## 6. Hosting on japanese.noetx.com (Cloudflare)

### 6.1 What is in the existing noetx setup
`C:\conq\wrangler.toml`: Cloudflare Pages project `name = "noetx"`, `pages_build_output_dir = "dist/client"`, the `functions/` folder proxies `/api/**` and `/healthz` to Cloud Run. So the noetx.com zone is already on Cloudflare and Pages is in use.

### 6.2 Recommendation: a separate Pages project, not a route in noetx
- **Why separate**: independent deploys (editing a phrase doesn't rebuild noetx), no overlap with `functions/` and `/api/**`, own SW and cache, zero risk of breaking the main site. The subdomain is a **separate origin**, so SW scope, localStorage and IndexedDB are isolated from noetx.com.
- **Steps (done by the user, later)**:
  1. Folder `D:\japan-trip\app` (a separate git repository or just a folder).
  2. Create a Pages project, e.g. `japan-trip`: either Direct Upload in the dashboard (drag the folder), or `npx wrangler pages deploy D:\japan-trip\app --project-name japan-trip` (wrangler is already familiar). A separate `wrangler.toml` in `D:\japan-trip\app` — **do not touch** `C:\conq\wrangler.toml`.
  3. Workers & Pages → project → Custom domains → Set up a domain → `japanese.noetx.com` → confirm. The CNAME is created automatically since the zone is on Cloudflare. **Do not create the CNAME manually in advance** — per the documentation this causes error 522.
  4. Check HTTPS and `curl -I https://japanese.noetx.com/sw.js` (headers from `_headers`).
- The free Pages plan is more than enough (static requests are not billed).
- **No leaking into noetx**: no noetx links/branding in the app; `X-Robots-Tag: noindex` via `_headers` so the page isn't indexed under the domain; check that noetx.com doesn't set cookies with `Domain=.noetx.com` (otherwise they'd also be sent to the subdomain — harmless, but unnecessary); the app doesn't read or write anything on noetx.com. If noetx.com has HSTS with `includeSubDomains` — the subdomain must be HTTPS (it is anyway).

### 6.3 Cache and SW versioning
- `sw.js`: constant `VERSION = 'v7'`; cache `jp-shell-v7`. `install` — precache all shell files, `data/*.json`, `vendor/*`, icons. `activate` — delete caches with a different VERSION.
- Strategies: shell and vendor — **cache-first**; `data/*.json` — **stale-while-revalidate** (updated in the background when online); external APIs (MyMemory) — **network-only**, not cached; navigation — cache-first on `index.html` (offline).
- Update: any byte change in `sw.js` (VERSION change) → the browser installs the new SW; the app shows "A new version is available — update" → `postMessage('skipWaiting')` → reload. No silent auto-reloads (so as not to lose the card on screen in front of a shop assistant).
- `_headers`:
  ```
  /sw.js
    Cache-Control: no-cache
  /index.html
    Cache-Control: no-cache
  /data/*
    Cache-Control: no-cache
  /*
    X-Robots-Tag: noindex
  ```
  (everything else is cached by default; the SW controls offline anyway). In Cloudflare, leave Browser Cache TTL at "Respect existing headers".
- Before the trip: pin the version; keep the previous build for rollback (Pages keeps deployment history — one-click rollback).

### 6.4 Translation proxy on a Cloudflare Worker — assessment (not in the MVP)
- Possible: a Worker at `japanese.noetx.com/api/translate` (same origin → no CORS), provider key in Worker Secrets, CORS/Origin check, rate limit.
- Providers: Google Cloud Translation / DeepL API Free — free monthly quotas exist, but **registration and a linked card/billing are required** [? check the terms]; Workers AI (m2m100 translation model) — no external keys, but RU→JA quality is doubtful [? not tested].
- Cost: practically zero for a family (Workers free tier ~100k requests/day). Privacy: text goes through your own Worker to the provider — better than MyMemory directly, but not offline.
- **Verdict**: don't do it before the trip. Google Translate with the offline pack is better in quality, works offline and has camera/voice. Revisit after the trip if a built-in translator is desired.

---

## 7. Top recommendations

1. **Google Translate**: download the **Japanese** and **Russian** (and English) offline packs before departure; test the camera and "Conversation" in airplane mode. This is the main translator; our PWA is a launcher for it.
2. **Google Lens / Circle to Search**: put a Lens shortcut on the home screen; practice translating a price tag/menu from a photo. The button in the PWA is a fallback path.
3. **Speech Services by Google**: install the Japanese voice data (otherwise TTS in the PWA may stay silent offline).
4. **Google Maps**: public transport routes in Japan work well; download offline areas (offline transit routes are not computed [?]). As a second option — **Japan Transit Planner (Jorudan)** or **NAVITIME Japan Travel**: platforms, cars, exits, transfers.
5. **Fares**: Suica in Google Wallet on a Pixel bought outside Japan is in practice **unavailable** (no FeliCa in Pixel 10 and older; non-US Pixel 11 has it in hardware, but it is unconfirmed whether it works; Welcome Suica Mobile — iOS only). Options: a physical **Welcome Suica** at Narita/Haneda (28 days, no deposit, the balance is not refunded), **contactless bank card/Google Wallet** on Tokyo Metro, Toei and ~9 more operators since 2026-03-25 (**not on JR East**; exit with the same device/card). Child fares: on JR children aged 6–11 pay ~50%, under 6 free (up to 2 children per adult) [? verify for specific lines]; a discounted child IC card is issued separately [? confirm].
6. **Tax-free (new scheme from 2026-11-01)**: before buying a camera/watch, read the Japan Tourism Agency rules; original passport; don't lose the receipts; get to the airport early — customs inspection before check-in.
7. **Safety Tips** (the official JTA app for earthquake/tsunami warnings) and the **Japan Visitor Hotline 050-3816-2787** number.
8. A separate kana app is **not needed** — our PWA covers kana; Anki is not needed — Leitner is built in.
9. Dates: if the trip extends past December 28 — many institutions are closed for 年末年始 (~Dec 29–Jan 3).
10. The most valuable exercise is **listening to staff phrases for 5 minutes a day**; for speaking, the patterns from 1.3 are enough.

---

## 8. Sources
- Readium — SpeechSynthesis in browsers and OSes (Android voices, `ja_JP`): https://readium.org/speech/docs/WebSpeech.html
- Chromium `tts_android.cc` (Chrome Android → system TTS): https://chromium.googlesource.com/chromium/src/+/lkgr/content/browser/speech/tts_android.cc
- Installing Japanese voice data (third-party guide): https://www.xamisoft.com/cs/kanjikana/help ; Android Police 2014: https://www.androidpolice.com/2014/09/13/googles-text-to-speech-engine-now-supports-japanese-output/
- Chrome 71: speechSynthesis.speak without user activation removed: https://developer.chrome.com/blog/chrome-71-deps-rems/ ; https://groups.google.com/a/chromium.org/g/blink-dev/c/WsnBm53M4Pc
- Android Intents with Chrome (syntax, `S.browser_fallback_url`, user gesture, BROWSABLE): https://developer.chrome.com/docs/android/intents
- Lens in Chrome/Google app: https://9to5google.com/2019/08/21/chrome-android-lens-replace-google-images/ ; https://www.androidpolice.com/access-google-lens-method-android-iphone-various-ways/
- MyMemory usage limits: https://mymemory.translated.net/doc/usagelimits.php ; API spec: https://mymemory.translated.net/doc/spec.php ; Terms: https://mymemory.translated.net/terms-and-conditions
- Service Worker: `register()` (MDN): https://developer.mozilla.org/docs/Web/API/ServiceWorkerContainer/register ; blob: URL not allowed (W3C discussion): https://lists.w3.org/Archives/Public/public-webapps-github/2018Jan/0729.html ; WPT: https://searchfox.org/firefox-main/source/testing/web-platform/tests/connection-allowlist/tentative/service-worker.sub.https.window.js
- Tailwind Play CDN "not intended for production": https://tailwindcss.com/docs/installation/play-cdn ; https://github.com/tailwindlabs/tailwindcss/issues/7169
- Web Speech recognition `processLocally` (MDN): https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally ; blink-dev on-device: https://groups.google.com/a/chromium.org/g/blink-dev/c/P8P-x7AnC6I ; https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/Rlyc2uAsFCY
- Google Translate offline/camera: https://9to5google.com/2017/01/26/google-translate-word-lens-japanese/ ; https://komarilab-en.pages.dev/guides/offline-translation/
- Suica on Android 2026: https://www.getaroundjapan.jp/?p=11538 ; https://komarilab-en.pages.dev/guides/ic-card-iphone-android/
- Tax-free refund method from 2026-11-01: https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00028.html ; https://www.japan.travel/en/us/blog/everything-you-need-to-know-japans-new-tax-free-shopping-system/ ; https://www.gltjp.com/en/article/item/21542/
- Japan Visitor Hotline: https://www.japan.travel/en/plan/hotline/
- Cloudflare Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/ ; headers: https://developers.cloudflare.com/pages/configuration/headers/
