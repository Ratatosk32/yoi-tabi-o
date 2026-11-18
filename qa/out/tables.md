### Unit (black-box) — 78/78 PASS

| # | Module | Check | Result | Actual output |
|---|---|---|---|---|
| 1 | srs | INTERVALS = 0/1/2/4/7 | PASS | 0/1/2/4/7 |
| 2 | srs | new card "good" → box 2, due +1 | PASS | {"box":2,"due":"2026-11-19","seen":1,"lapses":0} |
| 3 | srs | good ×6 → boxes 2,3,4,5,5,5; intervals 1,2,4,7,7,7 | PASS | b2:2026-11-19 b3:2026-11-21 b4:2026-11-25 b5:2026-12-02 b5:2026-12-09 b5:2026-12-16 |
| 4 | srs | again from box 4 → box 1, due today, lapses+1 | PASS | {"box":1,"due":"2026-11-18","seen":6,"lapses":1} |
| 5 | srs | hard at box 1 → stays 1, due tomorrow | PASS | {"box":1,"due":"2026-11-19","seen":1,"lapses":0} |
| 6 | srs | hard at box 3 → stays 3, due +2 | PASS | {"box":3,"due":"2026-11-20","seen":1,"lapses":0} |
| 7 | srs | unknown grade throws | PASS | throws |
| 8 | srs | addDays across month/year/leap | PASS | 2026-12-01 2027-01-01 2028-02-29 2026-03-01 2027-01-02 2025-12-31 |
| 9 | srs | robustness: imported box 0 / 6 / "3" → valid due date | PASS | [{"box":2,"due":"2026-11-19","seen":1,"lapses":0},{"box":5,"due":"2026-11-25","seen":1,"lapses":0},{"box":4,"due":"2026-11-22","seen":1,"lapses":0},{"box":2,"due":"2026-11-19","seen":1,"lapses":0},{"box":2,"due":"2026-11-19","seen":1,"lapses":0}] |
| 10 | srs | stats: due counts ≤ today, boxes histogram | PASS | {"total":3,"due":2,"boxes":[1,0,1,0,1]} |
| 11 | srs | stats with out-of-range box (imported) keeps 5 numeric bins | PASS | {"total":1,"due":1,"boxes":[0,0,0,0,1]} |
| 12 | srs | modesFor: hear → audio only; card → none; say → 3 | PASS | [["audio"],[],["ja2en","en2ja","audio"]] |
| 13 | srs | buildSession: overdue first (oldest first), then new ≤ newLimit | PASS | p1\|ja2en,p0\|ja2en,p3\|ja2en,p4\|ja2en,p5\|ja2en |
| 14 | srs | buildSession: hear item only in audio mode | PASS | 9 cards, no p9 |
| 15 | srs | buildSession (review = ja2en+en2ja): same phrase not shown in both modes back-to-back | PASS | p0\|ja2en,p1\|ja2en,p2\|ja2en,p3\|ja2en,p4\|ja2en,p5\|ja2en,p6\|ja2en,p7\|ja2en,p8\|ja2en |
| 16 | srs | buildSession: newLimit counts cards (id×mode), not phrases | PASS | newLimit=12 → 9 cards from 9 phrases |
| 17 | srs | studyWeek: day1/week1, day8/week2, day15/week3, day31/week3 | PASS | [{"day":1,"week":1},{"day":8,"week":2},{"day":15,"week":3},{"day":31,"week":3}] |
| 18 | srs | studyWeek with start date in the future → day ≥ 1 | PASS | {"day":1,"week":1} |
| 19 | srs | studyWeek across DST end (Europe, 2026-10-25) | PASS | {"day":8,"week":2} |
| 20 | srs-tz | TZ=Europe/Berlin: todayStr/addDays/day boundary | PASS | Europe/Berlin: 2193 checks ok; 2026-11-18T15:30Z → 2026-11-18 |
| 21 | srs-tz | TZ=Asia/Tokyo: todayStr/addDays/day boundary | PASS | Asia/Tokyo: 2193 checks ok; 2026-11-18T15:30Z → 2026-11-19 |
| 22 | srs-tz | TZ=America/Los_Angeles: todayStr/addDays/day boundary | PASS | America/Los_Angeles: 2193 checks ok; 2026-11-18T15:30Z → 2026-11-18 |
| 23 | srs-tz | TZ=America/Santiago: todayStr/addDays/day boundary | PASS | America/Santiago: 2193 checks ok; 2026-11-18T15:30Z → 2026-11-18 |
| 24 | srs-tz | TZ=Pacific/Kiritimati: todayStr/addDays/day boundary | PASS | Pacific/Kiritimati: 2193 checks ok; 2026-11-18T15:30Z → 2026-11-19 |
| 25 | srs-tz | TZ=UTC: todayStr/addDays/day boundary | PASS | UTC: 2193 checks ok; 2026-11-18T15:30Z → 2026-11-18 |
| 26 | store | no localStorage (Node) → in-memory fallback works | PASS | ok |
| 27 | store | localStorage getter throws (Safari blocked storage) → fallback | PASS | ok |
| 28 | store | setItem throws (quota) → set() returns false, value kept in session cache | PASS | set→false |
| 29 | store | corrupted JSON → fallback, no throw | PASS | fallbacks |
| 30 | store | export → JSON → import(replace) on clean profile: deep-equal round-trip | PASS | changed: favs,srs,settings,cards,userItems,history,quizStats |
| 31 | store | export → import(merge) on clean profile: deep-equal round-trip | PASS | ok |
| 32 | store | persisted: new store instance on same backend sees imported data | PASS | jt.favs,jt.srs,jt.settings,jt.cards,jt.userItems,jt.history,jt.quizStats |
| 33 | store | merge favs: local [a,b] + backup [c] → [a,b,c] | PASS | ["a","b","c"] |
| 34 | store | merge favs: local [a,b] + backup with EMPTY favs [] → keeps [a,b] | PASS | ["a","b"] |
| 35 | store | merge history: local strings + backup [] → local kept | PASS | ["x","y"] |
| 36 | store | merge userItems by id (incoming wins), keeps local-only | PASS | ok |
| 37 | store | merge srs: older backup overwrites newer local progress for same key | PASS | after merge: {"box":1,"due":"2026-11-10","seen":1} (incoming always wins) |
| 38 | store | import rejects: non-JSON, foreign app, data:null — with readable message | PASS | not json → Error: This file is not a Japan Trip backup \| {"app":"other","data":{}} → Error: This file is not a Japan Trip backup \| {"app":"japan-trip","data":null} → Error: This file is not a Japan Trip backup \| [] → Error: This file is not a Japan Trip bac |
| 39 | store | import validates types (srs:"garbage", favs:{} ) → rejected or ignored | PASS | {"srs":{},"favs":[]} |
| 40 | store | get() returns cached reference (mutation leaks without set) | PASS | in-memory: ["a","LEAK"] (not persisted) — callers must use update() |
| 41 | store | exportAll only known keys, prefix jt. | PASS | {"favs":["a"]} |
| 42 | text | phrase 袋はいりません exists | PASS | patterns.irimasen |
| 43 | text-search | search «ふくろ» finds 袋はいりません | PASS | rank 1/5 |
| 44 | text-search | search «bag» finds 袋はいりません | PASS | rank 3/7 |
| 45 | text-search | search «fukuro» finds 袋はいりません | PASS | rank 1/5 |
| 46 | text-search | search «Bag» finds 袋はいりません | PASS | rank 3/7 |
| 47 | text-search | search «BAG» finds 袋はいりません | PASS | rank 3/7 |
| 48 | text-search | search «フクロ» finds 袋はいりません | PASS | rank 1/5 |
| 49 | text-search | search «ﾌｸﾛ» finds 袋はいりません | PASS | rank 1/5 |
| 50 | text-search | search «FUKURO» finds 袋はいりません | PASS | rank 1/5 |
| 51 | text-search | search «fukuro wa» finds 袋はいりません | PASS | rank 1/4 |
| 52 | text-search | search «don't need a bag» finds 袋はいりません | PASS | rank 1/2 |
| 53 | text-search | search «袋» finds 袋はいりません | PASS | rank 1/6 |
| 54 | text-search | search «bag?» finds 袋はいりません | PASS | rank 3/7 |
| 55 | text | normalize case, NFKC, macrons, katakana | PASS | all 10 |
| 56 | text | long-vowel spellings equivalent: kōhī ≡ kohii ≡ koohii ≡ kouhii | PASS | [["kōhī","kohi"],["kohi","kohi"],["kohii","kohi"],["koohii","kohi"],["kouhii","kohi"]] |
| 57 | text | long-vowel spellings: takushī ≡ takushii, rāmen ≡ raamen, ē ≡ ee | PASS | ok |
| 58 | text-search | search in real data with curly and straight apostrophes (don’t / don't) | PASS | 2/2 |
| 59 | text-search | search macron-less romaji in real data (arigato, gozaimasu) | PASS | 2 hits |
| 60 | text-search | search romaji with doubled vowel (arigatou / koohii-type input) in real data | PASS | 2 hits |
| 61 | text-search | kanji search (real kanji.json): chuko / 中古 / ちゅうこ / exit | PASS | [["chuko",1],["中古",1],["ちゅうこ",1],["exit",6]] |
| 62 | text-search | empty / whitespace query → [] | PASS | ok |
| 63 | text | parseRuby / rubyToJa / rubyToKana | PASS | 5 ok |
| 64 | text | ttsText strips 〇〇 placeholders | PASS | まるまる駅はどこですか \| この電車はまるまるに行きますか \| 次はまるまる、まるまるです |
| 65 | text | kanaToHepburn (PLAN 1.6 conventions) | PASS | 18 ok |
| 66 | text | kanaToHepburn vs QA oracle on number kana 1..10000 | PASS | 10000 ok |
| 67 | tts | Node: no speechSynthesis → speak() resolves "unsupported", status() sane | PASS | unsupported {"supported":false,"voiceCount":0,"hasJapanese":false,"jaVoiceName":null} |
| 68 | tts | zero voices: init() resolves ≤1.6s, hasJapanese=false, speak resolves error (no throw) | PASS | init 1516ms, speak → error:synthesis-failed, utter.lang=ja-JP |
| 69 | tts | Android-style voice lang "ja_JP" detected as Japanese | PASS | Google 日本語 (ja_JP) → end |
| 70 | tts | speak() throwing inside engine → resolves "error:…", never rejects | PASS | error:boom |
| 71 | tts | engine fires neither onend nor onerror → speak() promise settles (timeout)? | PASS | end (UI does not await it, so harmless) |
| 72 | tts | empty text → "unsupported" (no utterance) | PASS | unsupported |
| 73 | launchers | detectPlatform | PASS | android,ios,other,ios,other,other |
| 74 | launchers | Android: Lens intent with package + fallback; Translate intent | PASS | {"PLATFORM":"android","DEFAULT_LENS":"lensApp","lens":{"lensApp":"intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;S.browser_fallback_url=https%3A%2F%2Flens.google.com%2F;end","googleApp":"intent://lens/#Intent;scheme=googleapp;package= |
| 75 | launchers | iOS: no intent:// anywhere; google:// + googletranslate:// | PASS | {"PLATFORM":"ios","DEFAULT_LENS":"googleApp","lens":{"googleApp":"google://","web":"https://lens.google.com/"},"lensDefaultUrl":"google://","translateApp":"googletranslate://?sl=ru&tl=ja&text=Where%20is%20the%20toilet%3F%20%26%20100%25","translateWeb":"https:/ |
| 76 | launchers | desktop/other: web Lens only; unknown variant falls back | PASS | {"PLATFORM":"other","DEFAULT_LENS":"web","lens":{"web":"https://lens.google.com/"},"lensDefaultUrl":"https://lens.google.com/","translateApp":"https://translate.google.com/?sl=ru&tl=ja&text=Where%20is%20the%20toilet%3F%20%26%20100%25&op=translate","translateWe |
| 77 | launchers | web Translate / Maps URLs correctly encoded | PASS | https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%AE%BF%E9%A7%85 https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=Shinjuku%20Station |
| 78 | launchers | translateAppUrl: Android intent - which platform when ctx is "other" (desktop)? | PASS | https://translate.google.com/?sl=ru&tl=ja&text=Where%20is%20… |

### E2E (Chrome/157.0.8103.79, 2026-11-18T18:23:04.554Z) — 46/47 PASS

| # | Profile | Check | Result | Actual output |
|---|---|---|---|---|
| 1 | pixel | app boots (data-ready=1) | PASS | items=271, platform=android |
| 2 | pixel | platform detected = android | PASS | android |
| 3 | pixel | tab phrases renders, no console errors, no horizontal overflow | PASS | h1=Phrases, nodes=451, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-phrases.png |
| 4 | pixel | tab study renders, no console errors, no horizontal overflow | PASS | h1=Study, nodes=34, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-study.png |
| 5 | pixel | tab show renders, no console errors, no horizontal overflow | PASS | h1=Show, nodes=118, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-show.png |
| 6 | pixel | tab kanji renders, no console errors, no horizontal overflow | PASS | h1=Kanji, nodes=726, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-kanji.png |
| 7 | pixel | tab tools renders, no console errors, no horizontal overflow | PASS | h1=Tools, nodes=113, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-tools.png |
| 8 | pixel | study/today renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-today.png |
| 9 | pixel | study/cards renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-cards.png |
| 10 | pixel | study/kana renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-kana.png |
| 11 | pixel | study/numbers renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-numbers.png |
| 12 | pixel | study/time renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-time.png |
| 13 | pixel | search «ふくろ» shows patterns.irimasen | PASS | Found: 5; first=patterns.irimasen; shot=shots\pixel-search-fukuro-kana.png |
| 14 | pixel | search «bag» shows patterns.irimasen | PASS | Found: 7; first=konbini.bag-yes; shot=shots\pixel-search-bag.png |
| 15 | pixel | search «fukuro» shows patterns.irimasen | PASS | Found: 5; first=patterns.irimasen; shot=shots\pixel-search-fukuro.png |
| 16 | pixel | favourite ★ persists after reload | PASS | localStorage jt.favs=["patterns.irimasen"]; shot=shots\pixel-fav-after-reload.png |
| 17 | pixel | un-favourite removes it from Favorites immediately | PASS |  |
| 18 | pixel | Show card opens full screen (covers viewport, ja text, no furigana, lang=ja) | PASS | {"x":0,"y":0,"w":412,"h":915,"vw":412,"vh":915,"text":"袋はいりません","rt":0,"bg":"rgb(255, 255, 255)","color":"rgb(0, 0, 0)","fontPx":72.8,"bodyOverflow":false,"lang":"ja"} shot=shots\pixel-show-fullscreen.png |
| 19 | pixel | Android Back (history.back) closes the card and stays in app | PASS | url=http://127.0.0.1:8765/#/phrases |
| 20 | pixel | Show tab: ready card (6) opens, fits, ✕ closes | PASS | {"text":"すみません、日本語があまり話せません。この画面を見ていただけますか。","overflow":false,"sh":244,"ch":244} shot=shots\pixel-show-readycard.png |
| 21 | pixel | all ready cards fit on screen without scrolling | PASS | [{"id":"","over":false,"sh":244,"ch":244},{"id":"","over":false,"sh":231,"ch":231},{"id":"","over":false,"sh":231,"ch":231},{"id":"","over":false,"sh":162,"ch":162},{"id":"","over":false,"sh":231,"ch":231},{"id":"","over":false,"sh":231,"ch":231}] |
| 22 | pixel | allergy card (3 allergens, strict) shows and fits | PASS | {"text":"この子には卵のアレルギーがあります。卵が入った料理は食べられません。少量でも危険です。入っているかどうか確認していただけますか。","over":false,"sh":322,"ch":322} shot=shots\pixel-show-allergy-3.png |
| 23 | pixel | allergy card with ALL allergens fits without scroll | PASS | {"chars":103,"over":false,"sh":241,"ch":241,"checked":12} shot=shots\pixel-show-allergy-all.png |
| 24 | pixel | kana quiz: 10 correct answers → 10/10, stored | PASS | Score: 10/10; quizStats={"kana":{"hira":10}}; unknown=; shot=shots\pixel-kana-quiz-result.png |
| 25 | pixel | kana quiz: wrong answer marked, second click ignored | PASS | {"fb":"Answer: wa","score":"correct: 0"} |
| 26 | pixel | kana quiz "Katakana words" accepts correct meaning | PASS | ポイントカード → point card: Correct! (pointo kādo) |
| 27 | pixel | price trainer (audio mode) accepts the correct number in 4 formats | PASS | [{"typed":"960","spoken":"960円","ok":true,"fb":"Correct! ¥960 = 960円きゅうひゃくろくじゅうえん — kyūhyakurokujū-enagainNext"},{"typed":"900","spoken":"900円","ok":true,"fb":"Correct! ¥900 = 900円きゅうひゃくえん — kyūhyaku-enagainNext"},{"typed":"450","spoken":"450円","ok":true,"fb": |
| 28 | pixel | price trainer (mixed, Cameras) «2万9,100円» → 29100 accepted, kana shown | PASS | Correct! ¥29,100 = 2万9,100円にまんきゅうせんひゃくえん — niman kyūsenhyaku-enagainNext shot=shots\pixel-price-mixed-gear.png |
| 29 | pixel | price trainer: one answer + Enter pressed again counts once (Cameras) | PASS | before: total 4; after 1 answer + repeated Enter: «Correct 5 of 5» |
| 30 | pixel | price trainer (mixed, Konbini) «670円» → 670 accepted, kana shown | PASS | Correct! ¥670 = 670円ろっぴゃくななじゅうえん — roppyakunanajū-enagainNext shot=shots\pixel-price-mixed-konbini.png |
| 31 | pixel | price trainer: one answer + Enter pressed again counts once (Konbini) | PASS | before: total 5; after 1 answer + repeated Enter: «Correct 6 of 6» |
| 32 | pixel | price trainer: switching range Konbini→Cameras immediately shows a 20,000–250,000 price | PASS | after switch: «7万9,500円» (79500) |
| 33 | pixel | price trainer rejects a wrong number | PASS | Wrong. ¥79,500 = 7万9,500円ななまんきゅうせんごひゃくえん — nanaman kyūsengohyaku-enagainNext |
| 34 | pixel | time trainer accepts «11時8分» as 11:08 | PASS | Correct! 11:08 = 11時8分じゅういちじはっぷん — jūichiji happunNext |
| 35 | pixel | SRS lesson: grading saves progress, survives reload | PASS | sequence: basics.sumimasen\|ja2en → basics.arigato\|ja2en → basics.onegai\|ja2en → basics.daijobu\|ja2en; srs keys 4 → after reload 4 |
| 36 | pixel | SRS lesson: consecutive cards are different phrases | PASS | basics.sumimasen\|ja2en → basics.arigato\|ja2en → basics.onegai\|ja2en → basics.daijobu\|ja2en |
| 37 | pixel | TTS (API present, 0 voices) ▶ does not throw | PASS | toast=«»; spoken={"text":"これをください","lang":"ja-JP","rate":1}; errors=[] |
| 38 | pixel | Tools → Speech shows the right platform guidance | PASS | SPEECH (JAPANESE VOICE) /  / No Japanese voice found (voices on this device: 0). Speech may be silent offline. /  / Android Settings → System → Languages → Text-to-speech output. / Engine: Speech Services by Google → gear icon → Install voice data → Japanese ( |
| 39 | pixel | Lens button URL for android | PASS | {"href":"intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;S.browser_fallback_url=https%3A%2F%2Flens.google.com%2F;end","opts":["lensApp=Lens (package com.google.ar.lens)","googleApp=Lens via the Google app (googleapp://lens)","web=lens. |
| 40 | pixel | Translate/Maps buttons open expected https URLs | PASS | ["https://translate.google.com/?sl=en&tl=ja&text=Where%20is%20the%20toilet%3F&op=translate","https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%AE%BF%E9%A7%85","https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=%E6%96%B0%E5%AE%BF% |
| 41 | pixel | "In the Translate app" navigates to android app URL | PASS | ["intent://translate.google.com/?sl=en&tl=ja&text=Where%20is%20the%20toilet%3F&op=translate#Intent;scheme=https;package=com.google.android.apps.translate;S.browser_fallback_url=https%3A%2F%2Ftranslate.google.com%2F%3Fsl%3Den%26tl%3Dja%26text%3DWhere%2520is%252 |
| 42 | pixel | app still alive after app-scheme navigation | PASS | http://127.0.0.1:8765/#/tools |
| 43 | pixel | emergency tel: links | PASS | ["tel:110","tel:119","tel:05038162787"] |
| 44 | pixel | backup button downloads a JSON export | PASS | japan-trip-backup-2026-11-18.json; keys=favs,srs,settings,cards,history,quizStats |
| 45 | pixel | import backup on clean profile restores favs/srs/cards | PASS | toast=«Imported: favs, srs, settings, cards, history, quizStats»; {"favs":"[\"patterns.irimasen\"]","srs":4,"cards":true} |
| 46 | pixel | UNCAUGHT in run | **FAIL** | ProtocolError: Runtime.callFunctionOn timed out. Increase the 'protocolTimeout' setting in launch/connect calls for a higher timeout if needed.     at <instance_members_initializer> (file:///D:/japan-trip/qa/node_modules/puppeteer-core/lib/esm/puppeteer/common |
| 47 | pixel | diag.html loads without console errors (favicon.ico 404 tolerated) | PASS |  shot=shots\pixel-diag.png |

### Numbers: PLAN.md control set (yenReading)

| n | app kana | app romaji | oracle kana | oracle romaji | Result |
|---|---|---|---|---|---|
| 300 | さんびゃくえん | sanbyaku-en | さんびゃくえん | sanbyaku-en | PASS |
| 600 | ろっぴゃくえん | roppyaku-en | ろっぴゃくえん | roppyaku-en | PASS |
| 800 | はっぴゃくえん | happyaku-en | はっぴゃくえん | happyaku-en | PASS |
| 3000 | さんぜんえん | sanzen-en | さんぜんえん | sanzen-en | PASS |
| 8000 | はっせんえん | hassen-en | はっせんえん | hassen-en | PASS |
| 10000 | いちまんえん | ichiman-en | いちまんえん | ichiman-en | PASS |
| 128000 | じゅうにまんはっせんえん | jūniman hassen-en | じゅうにまんはっせんえん | jūniman hassen-en | PASS |
| 250000 | にじゅうごまんえん | nijūgoman-en | にじゅうごまんえん | nijūgoman-en | PASS |
