### Unit (black-box) — 68/78 PASS

| # | Модуль | Проверка | Итог | Фактический вывод |
|---|---|---|---|---|
| 1 | srs | INTERVALS = 0/1/2/4/7 | PASS | 0/1/2/4/7 |
| 2 | srs | new card "good" → box 2, due +1 | PASS | {"box":2,"due":"2026-11-19","seen":1,"lapses":0} |
| 3 | srs | good ×6 → boxes 2,3,4,5,5,5; intervals 1,2,4,7,7,7 | PASS | b2:2026-11-19 b3:2026-11-21 b4:2026-11-25 b5:2026-12-02 b5:2026-12-09 b5:2026-12-16 |
| 4 | srs | again from box 4 → box 1, due today, lapses+1 | PASS | {"box":1,"due":"2026-11-18","seen":6,"lapses":1} |
| 5 | srs | hard at box 1 → stays 1, due tomorrow | PASS | {"box":1,"due":"2026-11-19","seen":1,"lapses":0} |
| 6 | srs | hard at box 3 → stays 3, due +2 | PASS | {"box":3,"due":"2026-11-20","seen":1,"lapses":0} |
| 7 | srs | unknown grade throws | PASS | throws |
| 8 | srs | addDays across month/year/leap | PASS | 2026-12-01 2027-01-01 2028-02-29 2026-03-01 2027-01-02 2025-12-31 |
| 9 | srs | robustness: imported box 0 / 6 / "3" → valid due date | **FAIL** | invalid results: [{"box":1,"due":"2026-11-18","seen":1,"lapses":0},{"box":5,"due":"2026-11-25","seen":1,"lapses":0},{"box":5,"due":"2026-11-25","seen":1,"lapses":0},{"box":null,"due":"NaN-NaN-NaN","seen":1,"lapses":0},{"box":1,"due":"2026-11-18","seen":1,"laps |
| 10 | srs | stats: due counts ≤ today, boxes histogram | PASS | {"total":3,"due":2,"boxes":[1,0,1,0,1]} |
| 11 | srs | stats with out-of-range box (imported) keeps 5 numeric bins | **FAIL** | Expected values to be strictly equal:  7 !== 5  |
| 12 | srs | modesFor: hear → audio only; card → none; say → 3 | PASS | [["audio"],[],["ja2ru","ru2ja","audio"]] |
| 13 | srs | buildSession: overdue first (oldest first), then new ≤ newLimit | PASS | p1\|ja2ru,p0\|ja2ru,p3\|ja2ru,p4\|ja2ru,p5\|ja2ru |
| 14 | srs | buildSession: hear item only in audio mode | PASS | 18 cards, no p9 |
| 15 | srs | buildSession (review = ja2ru+ru2ja): same phrase not shown in both modes back-to-back | **FAIL** | adjacent same-phrase pairs: 6; order: p0\|ja2ru, p0\|ru2ja, p1\|ja2ru, p1\|ru2ja, p2\|ja2ru, p2\|ru2ja…  6 !== 0  |
| 16 | srs | buildSession: newLimit counts cards (id×mode), not phrases | PASS | newLimit=12 → 12 cards from 6 phrases |
| 17 | srs | studyWeek: day1/week1, day8/week2, day15/week3, day31/week3 | PASS | [{"day":1,"week":1},{"day":8,"week":2},{"day":15,"week":3},{"day":31,"week":3}] |
| 18 | srs | studyWeek with start date in the future → day ≥ 1 | **FAIL** | day=-6 |
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
| 34 | store | merge favs: local [a,b] + backup with EMPTY favs [] → keeps [a,b] | **FAIL** | got [] + actual - expected  + [] - [ -   'a', |
| 35 | store | merge history: local strings + backup [] → local kept | **FAIL** | got [] + actual - expected  + [] - [ -   'x', |
| 36 | store | merge userItems by id (incoming wins), keeps local-only | PASS | ok |
| 37 | store | merge srs: older backup overwrites newer local progress for same key | PASS | after merge: {"box":1,"due":"2026-11-10","seen":1} (incoming always wins) |
| 38 | store | import rejects: non-JSON, foreign app, data:null — with readable message | **FAIL** | technical messages shown to user: {"app":"japan-trip","data":null} → TypeError: Cannot use 'in' operator to search for 'favs' in null  1 !== 0  |
| 39 | store | import validates types (srs:"garbage", favs:{} ) → rejected or ignored | **FAIL** | stored invalid types: {"srs":"garbage","favs":{"a":1}} |
| 40 | store | get() returns cached reference (mutation leaks without set) | PASS | in-memory: ["a","LEAK"] (not persisted) — callers must use update() |
| 41 | store | exportAll only known keys, prefix jt. | PASS | {"favs":["a"]} |
| 42 | text | phrase 袋はいりません exists | PASS | patterns.irimasen |
| 43 | text-search | search «ふくろ» finds 袋はいりません | PASS | rank 1/5 |
| 44 | text-search | search «пакет» finds 袋はいりません | PASS | rank 1/7 |
| 45 | text-search | search «fukuro» finds 袋はいりません | PASS | rank 1/5 |
| 46 | text-search | search «Пакет» finds 袋はいりません | PASS | rank 1/7 |
| 47 | text-search | search «ПАКЕТ» finds 袋はいりません | PASS | rank 1/7 |
| 48 | text-search | search «フクロ» finds 袋はいりません | PASS | rank 1/5 |
| 49 | text-search | search «ﾌｸﾛ» finds 袋はいりません | PASS | rank 1/5 |
| 50 | text-search | search «FUKURO» finds 袋はいりません | PASS | rank 1/5 |
| 51 | text-search | search «fukuro wa» finds 袋はいりません | PASS | rank 1/4 |
| 52 | text-search | search «пакет не нужен» finds 袋はいりません | PASS | rank 2/4 |
| 53 | text-search | search «袋» finds 袋はいりません | PASS | rank 1/6 |
| 54 | text-search | search «пакет?» finds 袋はいりません | PASS | rank 1/7 |
| 55 | text | normalize ё/е, case, NFKC, macrons, katakana | PASS | all 10 |
| 56 | text | long-vowel spellings equivalent: kōhī ≡ kohii ≡ koohii ≡ kouhii | **FAIL** | [["kōhī","kohi"],["kohi","kohi"],["kohii","kohii"],["koohii","kohii"],["kouhii","kohii"]]  2 !== 1  |
| 57 | text | long-vowel spellings: takushī ≡ takushii, rāmen ≡ raamen, ē ≡ ee | **FAIL** | [["takushī","takushi","takushii","takushii"],["rāmen","ramen","raamen","raamen"],["ēgo","ego","eego","eego"]]  3 !== 0  |
| 58 | text-search | search in real data with ё/е both ways (ещё / еще) | PASS | «всё»: 7/7 |
| 59 | text-search | search macron-less romaji in real data (arigato, gozaimasu) | PASS | 2 hits |
| 60 | text-search | search romaji with doubled vowel (arigatou / koohii-type input) in real data | PASS | 2 hits |
| 61 | text-search | kanji search (real kanji.json): chuko / 中古 / б/у | PASS | [["chuko",1],["中古",1],["ちゅうこ",1],["выход",7]] |
| 62 | text-search | empty / whitespace query → [] | PASS | ok |
| 63 | text | parseRuby / rubyToJa / rubyToKana | PASS | 5 ok |
| 64 | text | ttsText strips 〇〇 placeholders | PASS | 駅はどこですか \| この電車は、に行きますか \| 次は、です |
| 65 | text | kanaToHepburn (PLAN 1.6 conventions) | PASS | 18 ok |
| 66 | text | kanaToHepburn vs QA oracle on number kana 1..10000 | PASS | 10000 ok |
| 67 | tts | Node: no speechSynthesis → speak() resolves "unsupported", status() sane | PASS | unsupported {"supported":false,"voiceCount":0,"hasJapanese":false,"jaVoiceName":null} |
| 68 | tts | zero voices: init() resolves ≤1.6s, hasJapanese=false, speak resolves error (no throw) | PASS | init 1512ms, speak → error:synthesis-failed, utter.lang=ja-JP |
| 69 | tts | Android-style voice lang "ja_JP" detected as Japanese | PASS | Google 日本語 (ja_JP) → end |
| 70 | tts | speak() throwing inside engine → resolves "error:…", never rejects | PASS | error:boom |
| 71 | tts | engine fires neither onend nor onerror → speak() promise settles (timeout)? | PASS | PENDING after 3s (UI does not await it, so harmless) |
| 72 | tts | empty text → "unsupported" (no utterance) | PASS | unsupported |
| 73 | launchers | detectPlatform | PASS | android,ios,other,ios,other,other |
| 74 | launchers | Android: Lens intent with package + fallback; Translate intent | PASS | {"PLATFORM":"android","DEFAULT_LENS":"lensApp","lens":{"lensApp":"intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;S.browser_fallback_url=https%3A%2F%2Flens.google.com%2F;end","googleApp":"intent://lens/#Intent;scheme=googleapp;package= |
| 75 | launchers | iOS: no intent:// anywhere; google:// + googletranslate:// | PASS | {"PLATFORM":"ios","DEFAULT_LENS":"googleApp","lens":{"googleApp":"google://","web":"https://lens.google.com/"},"lensDefaultUrl":"google://","translateApp":"googletranslate://?sl=ru&tl=ja&text=%D0%93%D0%B4%D0%B5%20%D1%82%D1%83%D0%B0%D0%BB%D0%B5%D1%82%3F%20%26%2 |
| 76 | launchers | desktop/other: web Lens only; unknown variant falls back | PASS | {"PLATFORM":"other","DEFAULT_LENS":"web","lens":{"web":"https://lens.google.com/"},"lensDefaultUrl":"https://lens.google.com/","translateApp":"intent://translate.google.com/?sl=ru&tl=ja&text=%D0%93%D0%B4%D0%B5%20%D1%82%D1%83%D0%B0%D0%BB%D0%B5%D1%82%3F%20%26%20 |
| 77 | launchers | web Translate / Maps URLs correctly encoded | PASS | https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%AE%BF%E9%A7%85 https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=Shinjuku%20Station |
| 78 | launchers | translateAppUrl: Android intent - which platform when ctx is "other" (desktop)? | PASS | intent://translate.google.com/?sl=ru&tl=ja&text=%D0%93%D0%B4… |

### E2E (Chrome/157.0.8103.79, 2026-11-18T17:48:06.321Z) — 88/98 PASS

| # | Профиль | Проверка | Итог | Фактический вывод |
|---|---|---|---|---|
| 1 | pixel | app boots (data-ready=1) | PASS | items=271, platform=android |
| 2 | pixel | platform detected = android | PASS | android |
| 3 | pixel | tab phrases renders, no console errors, no horizontal overflow | PASS | h1=Фразы, nodes=370, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-phrases.png |
| 4 | pixel | tab study renders, no console errors, no horizontal overflow | PASS | h1=Учёба, nodes=33, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-study.png |
| 5 | pixel | tab show renders, no console errors, no horizontal overflow | PASS | h1=Показать японцу, nodes=117, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-show.png |
| 6 | pixel | tab kanji renders, no console errors, no horizontal overflow | PASS | h1=Кандзи, nodes=725, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-kanji.png |
| 7 | pixel | tab tools renders, no console errors, no horizontal overflow | PASS | h1=Инструменты, nodes=100, scrollWidth=412/412, errors=none, shot=shots\pixel-tab-tools.png |
| 8 | pixel | study/today renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-today.png |
| 9 | pixel | study/cards renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-cards.png |
| 10 | pixel | study/kana renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-kana.png |
| 11 | pixel | study/numbers renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-numbers.png |
| 12 | pixel | study/time renders | PASS | scrollWidth=412/412, errors=none, shot=shots\pixel-study-time.png |
| 13 | pixel | search «ふくろ» shows patterns.irimasen | PASS | Найдено: 5; first=patterns.irimasen; shot=shots\pixel-search-fukuro-kana.png |
| 14 | pixel | search «пакет» shows patterns.irimasen | PASS | Найдено: 7; first=patterns.irimasen; shot=shots\pixel-search-paket.png |
| 15 | pixel | search «fukuro» shows patterns.irimasen | PASS | Найдено: 5; first=patterns.irimasen; shot=shots\pixel-search-fukuro.png |
| 16 | pixel | favourite ★ persists after reload | PASS | localStorage jt.favs=["patterns.irimasen"]; shot=shots\pixel-fav-after-reload.png |
| 17 | pixel | un-favourite removes it from Избранное immediately | PASS |  |
| 18 | pixel | Show card opens full screen (covers viewport, ja text, no furigana, lang=ja) | PASS | {"x":0,"y":0,"w":412,"h":915,"vw":412,"vh":915,"text":"袋はいりません","rt":0,"bg":"rgb(255, 255, 255)","color":"rgb(0, 0, 0)","fontPx":32.96,"bodyOverflow":false,"lang":"ja"} shot=shots\pixel-show-fullscreen.png |
| 19 | pixel | Android «Назад» (history.back) closes the card and stays in app | PASS | url=http://127.0.0.1:8765/#/phrases |
| 20 | pixel | Show tab: ready card (6) opens, fits, ✕ closes | PASS | {"text":"すみません、日本語があまり話せません。この画面を見ていただけますか。","overflow":false,"sh":203,"ch":203} shot=shots\pixel-show-readycard.png |
| 21 | pixel | all ready cards fit on screen without scrolling | PASS | [{"id":"","over":false,"sh":203,"ch":203},{"id":"","over":false,"sh":108,"ch":108},{"id":"","over":false,"sh":108,"ch":108},{"id":"","over":false,"sh":108,"ch":108},{"id":"","over":false,"sh":108,"ch":108},{"id":"","over":false,"sh":108,"ch":108}] |
| 22 | pixel | allergy card (3 allergens, strict) shows and fits | PASS | {"text":"この子には卵のアレルギーがあります。卵が入った料理は食べられません。少量でも危険です。入っているかどうか確認していただけますか。","over":false,"sh":413,"ch":413} shot=shots\pixel-show-allergy-3.png |
| 23 | pixel | allergy card with ALL allergens fits without scroll | **FAIL** | {"chars":138,"over":true,"sh":793,"ch":655,"checked":12} shot=shots\pixel-show-allergy-all.png |
| 24 | pixel | kana quiz: 10 correct answers → 10/10, stored | PASS | Результат: 10/10; quizStats={"kana":{"hira":10}}; unknown=; shot=shots\pixel-kana-quiz-result.png |
| 25 | pixel | kana quiz: wrong answer marked, second click ignored | PASS | {"fb":"Правильно: chi","score":"верно: 0"} |
| 26 | pixel | kana quiz «Слова катаканой» accepts correct meaning | PASS | パスポート → паспорт: Верно! (pasupōto) |
| 27 | pixel | price trainer (audio mode) accepts the correct number in 4 formats | PASS | [{"typed":"920","spoken":"920円","ok":true,"fb":"Верно! ¥920 = 920円きゅうひゃくにじゅうえん — kyūhyakunijū-en▶ ещё разСледующее"},{"typed":"1,140","spoken":"1140円","ok":true,"fb":"Верно! ¥1 140 = 1,140円せんひゃくよんじゅうえん — senhyakuyonjū-en▶ ещё разСледующее"},{"typed":"780","spo |
| 28 | pixel | price trainer (mixed, Техника) «110円» → 110 accepted, kana shown | PASS | Верно! ¥110 = 110円ひゃくじゅうえん — hyakujū-en▶ ещё разСледующее shot=shots\pixel-price-mixed-gear.png |
| 29 | pixel | price trainer: one answer + Enter pressed again counts once (Техника) | **FAIL** | before: total 4; after 1 answer + repeated Enter: «Верно 6 из 6» |
| 30 | pixel | price trainer (mixed, Конбини) «21万1千円» → 211000 accepted, kana shown | PASS | Верно! ¥211 000 = 21万1千円にじゅういちまんせんえん — nijūichiman sen-en▶ ещё разСледующее shot=shots\pixel-price-mixed-konbini.png |
| 31 | pixel | price trainer: one answer + Enter pressed again counts once (Конбини) | **FAIL** | before: total 6; after 1 answer + repeated Enter: «Верно 8 из 8» |
| 32 | pixel | price trainer: switching range Конбини→Техника immediately shows a 20 000–250 000 price | **FAIL** | after switch: «970円» (970) |
| 33 | pixel | price trainer rejects a wrong number | PASS | Неверно. ¥970 = 970円きゅうひゃくななじゅうえん — kyūhyakunanajū-en▶ ещё разСледующее |
| 34 | pixel | time trainer accepts «16時半» as 16:30 | PASS | Верно! 16:30 = 16時半じゅうろくじはん — jūrokuji hanСледующее |
| 35 | pixel | SRS lesson: grading saves progress, survives reload | PASS | sequence: basics.sumimasen\|ja2ru → basics.sumimasen\|ru2ja → basics.arigato\|ja2ru → basics.arigato\|ru2ja; srs keys 4 → after reload 4 |
| 36 | pixel | SRS lesson: consecutive cards are different phrases | **FAIL** | basics.sumimasen\|ja2ru → basics.sumimasen\|ru2ja → basics.arigato\|ja2ru → basics.arigato\|ru2ja |
| 37 | pixel | TTS (API present, 0 voices) ▶ does not throw | PASS | toast=«»; spoken={"text":"これをください","lang":"ja-JP","rate":1}; errors=[] |
| 38 | pixel | Tools → Озвучка shows the right platform guidance | PASS | Озвучка (японский голос) /  / Японский голос не найден (голосов в системе: 0). Озвучка может молчать офлайн. /  / Настройки Android → Система → Языки → Синтез речи (Text-to-speech). / Движок: Speech Services by Google → значок шестерёнки → Install voice data → |
| 39 | pixel | Lens button URL for android | PASS | {"href":"intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;S.browser_fallback_url=https%3A%2F%2Flens.google.com%2F;end","opts":["lensApp=Lens (пакет com.google.ar.lens)","googleApp=Lens через приложение Google (googleapp://lens)","web=le |
| 40 | pixel | Translate/Maps buttons open expected https URLs | PASS | ["https://translate.google.com/?sl=ru&tl=ja&text=%D0%93%D0%B4%D0%B5%20%D1%82%D1%83%D0%B0%D0%BB%D0%B5%D1%82%3F&op=translate","https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%AE%BF%E9%A7%85","https://www.google.com/maps/dir/?api=1&travelmode=transit |
| 41 | pixel | «В приложении Переводчика» navigates to android app URL | PASS | ["intent://translate.google.com/?sl=ru&tl=ja&text=%D0%93%D0%B4%D0%B5%20%D1%82%D1%83%D0%B0%D0%BB%D0%B5%D1%82%3F&op=translate#Intent;scheme=https;package=com.google.android.apps.translate;S.browser_fallback_url=https%3A%2F%2Ftranslate.google.com%2F%3Fsl%3Dru%26t |
| 42 | pixel | app still alive after app-scheme navigation | PASS | http://127.0.0.1:8765/#/tools |
| 43 | pixel | emergency tel: links | PASS | ["tel:110","tel:119","tel:05038162787"] |
| 44 | pixel | backup button downloads a JSON export | PASS | japan-trip-backup-2026-11-18.json; keys=favs,srs,settings,cards,userItems,history,quizStats |
| 45 | pixel | import backup on clean profile restores favs/srs/cards | PASS | toast=«Импортировано: favs, srs, settings, cards, userItems, history, quizStats»; {"favs":"[\"patterns.irimasen\"]","srs":4,"cards":true} |
| 46 | pixel | SW registers, activates, controls page after reload; precache filled | PASS | {"scope":"http://127.0.0.1:8765/","active":true,"controlled":true,"controlledAfterReload":true,"keys":["jt-v2"],"n":26} |
| 47 | pixel | OFFLINE (CDP offline + server stopped): app reloads, all tabs, search works | PASS | tabs=true,true,true,true,true, search hits=5, about=«О приложении  Данные v1. Офлайн-режим: включён.  Фраз: 271, кандзи: 115.», console=none |
| 48 | pixel | OFFLINE cold start in new tab with deep link #/study/numbers | PASS | study |
| 49 | pixel | OFFLINE diag.html served from cache | PASS | Диагностика · Japan Trip |
| 50 | iphone | app boots (data-ready=1) | PASS | items=271, platform=ios |
| 51 | iphone | platform detected = ios | PASS | ios |
| 52 | iphone | tab phrases renders, no console errors, no horizontal overflow | PASS | h1=Фразы, nodes=370, scrollWidth=430/430, errors=none, shot=shots\iphone-tab-phrases.png |
| 53 | iphone | tab study renders, no console errors, no horizontal overflow | PASS | h1=Учёба, nodes=33, scrollWidth=430/430, errors=none, shot=shots\iphone-tab-study.png |
| 54 | iphone | tab show renders, no console errors, no horizontal overflow | PASS | h1=Показать японцу, nodes=117, scrollWidth=430/430, errors=none, shot=shots\iphone-tab-show.png |
| 55 | iphone | tab kanji renders, no console errors, no horizontal overflow | PASS | h1=Кандзи, nodes=725, scrollWidth=430/430, errors=none, shot=shots\iphone-tab-kanji.png |
| 56 | iphone | tab tools renders, no console errors, no horizontal overflow | PASS | h1=Инструменты, nodes=95, scrollWidth=430/430, errors=none, shot=shots\iphone-tab-tools.png |
| 57 | iphone | study/today renders | PASS | scrollWidth=430/430, errors=none, shot=shots\iphone-study-today.png |
| 58 | iphone | study/cards renders | PASS | scrollWidth=430/430, errors=none, shot=shots\iphone-study-cards.png |
| 59 | iphone | study/kana renders | PASS | scrollWidth=430/430, errors=none, shot=shots\iphone-study-kana.png |
| 60 | iphone | study/numbers renders | PASS | scrollWidth=430/430, errors=none, shot=shots\iphone-study-numbers.png |
| 61 | iphone | study/time renders | PASS | scrollWidth=430/430, errors=none, shot=shots\iphone-study-time.png |
| 62 | iphone | search «ふくろ» shows patterns.irimasen | PASS | Найдено: 5; first=patterns.irimasen; shot=shots\iphone-search-fukuro-kana.png |
| 63 | iphone | search «пакет» shows patterns.irimasen | PASS | Найдено: 7; first=patterns.irimasen; shot=shots\iphone-search-paket.png |
| 64 | iphone | search «fukuro» shows patterns.irimasen | PASS | Найдено: 5; first=patterns.irimasen; shot=shots\iphone-search-fukuro.png |
| 65 | iphone | favourite ★ persists after reload | PASS | localStorage jt.favs=["patterns.irimasen"]; shot=shots\iphone-fav-after-reload.png |
| 66 | iphone | un-favourite removes it from Избранное immediately | PASS |  |
| 67 | iphone | Show card opens full screen (covers viewport, ja text, no furigana, lang=ja) | PASS | {"x":0,"y":0,"w":430,"h":932,"vw":430,"vh":932,"text":"袋はいりません","rt":0,"bg":"rgb(255, 255, 255)","color":"rgb(0, 0, 0)","fontPx":34.4,"bodyOverflow":false,"lang":"ja"} shot=shots\iphone-show-fullscreen.png |
| 68 | iphone | Android «Назад» (history.back) closes the card and stays in app | PASS | url=http://127.0.0.1:8765/#/phrases |
| 69 | iphone | Show tab: ready card (6) opens, fits, ✕ closes | PASS | {"text":"すみません、日本語があまり話せません。この画面を見ていただけますか。","overflow":false,"sh":208,"ch":208} shot=shots\iphone-show-readycard.png |
| 70 | iphone | all ready cards fit on screen without scrolling | PASS | [{"id":"","over":false,"sh":208,"ch":208},{"id":"","over":false,"sh":111,"ch":111},{"id":"","over":false,"sh":111,"ch":111},{"id":"","over":false,"sh":111,"ch":111},{"id":"","over":false,"sh":111,"ch":111},{"id":"","over":false,"sh":111,"ch":111}] |
| 71 | iphone | allergy card (3 allergens, strict) shows and fits | PASS | {"text":"この子には卵のアレルギーがあります。卵が入った料理は食べられません。少量でも危険です。入っているかどうか確認していただけますか。","over":false,"sh":422,"ch":422} shot=shots\iphone-show-allergy-3.png |
| 72 | iphone | allergy card with ALL allergens fits without scroll | **FAIL** | {"chars":138,"over":true,"sh":809,"ch":672,"checked":12} shot=shots\iphone-show-allergy-all.png |
| 73 | iphone | kana quiz: 10 correct answers → 10/10, stored | PASS | Результат: 10/10; quizStats={"kana":{"hira":10}}; unknown=; shot=shots\iphone-kana-quiz-result.png |
| 74 | iphone | kana quiz: wrong answer marked, second click ignored | PASS | {"fb":"Правильно: wa","score":"верно: 0"} |
| 75 | iphone | kana quiz «Слова катаканой» accepts correct meaning | PASS | ケース → чехол: Верно! (kēsu) |
| 76 | iphone | price trainer (audio mode) accepts the correct number in 4 formats | PASS | [no speechSynthesis: audio mode untestable, see mixed mode] [{"i":0,"note":"no TTS → cannot hear price"}] |
| 77 | iphone | price trainer (mixed, Техника) «1,340円» → 1340 accepted, kana shown | PASS | Верно! ¥1 340 = 1,340円せんさんびゃくよんじゅうえん — sensanbyakuyonjū-en▶ ещё разСледующее shot=shots\iphone-price-mixed-gear.png |
| 78 | iphone | price trainer: one answer + Enter pressed again counts once (Техника) | **FAIL** | before: total 0; after 1 answer + repeated Enter: «Верно 2 из 2» |
| 79 | iphone | price trainer (mixed, Конбини) «21万500円» → 210500 accepted, kana shown | PASS | Верно! ¥210 500 = 21万500円にじゅういちまんごひゃくえん — nijūichiman gohyaku-en▶ ещё разСледующее shot=shots\iphone-price-mixed-konbini.png |
| 80 | iphone | price trainer: one answer + Enter pressed again counts once (Конбини) | **FAIL** | before: total 2; after 1 answer + repeated Enter: «Верно 4 из 4» |
| 81 | iphone | price trainer: switching range Конбини→Техника immediately shows a 20 000–250 000 price | **FAIL** | after switch: «1,120円» (1120) |
| 82 | iphone | price trainer rejects a wrong number | PASS | Неверно. ¥1 120 = 1,120円せんひゃくにじゅうえん — senhyakunijū-en▶ ещё разСледующее |
| 83 | iphone | SRS lesson: grading saves progress, survives reload | PASS | sequence: basics.sumimasen\|ja2ru → basics.sumimasen\|ru2ja → basics.arigato\|ja2ru → basics.arigato\|ru2ja; srs keys 4 → after reload 4 |
| 84 | iphone | SRS lesson: consecutive cards are different phrases | **FAIL** | basics.sumimasen\|ja2ru → basics.sumimasen\|ru2ja → basics.arigato\|ja2ru → basics.arigato\|ru2ja |
| 85 | iphone | TTS (no speechSynthesis API) ▶ does not throw | PASS | toast=«Озвучка недоступна в этом браузере»; spoken=undefined; errors=[] |
| 86 | iphone | Tools → Озвучка shows the right platform guidance | PASS | Озвучка (японский голос) /  / Этот браузер не поддерживает озвучку. /  / ▶ Тест: 袋はご利用ですか / ▶ Тест: 12800円 / Диагностика shot=shots\iphone-tools-tts.png |
| 87 | iphone | Lens button URL for ios | PASS | {"href":"google://","opts":["googleApp=Приложение Google (google://) → значок Lens","web=lens.google.com (веб, может открыть приложение)"]} |
| 88 | iphone | Translate/Maps buttons open expected https URLs | PASS | ["https://translate.google.com/?sl=ru&tl=ja&text=%D0%93%D0%B4%D0%B5%20%D1%82%D1%83%D0%B0%D0%BB%D0%B5%D1%82%3F&op=translate","https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%AE%BF%E9%A7%85","https://www.google.com/maps/dir/?api=1&travelmode=transit |
| 89 | iphone | «В приложении Переводчика» navigates to ios app URL | PASS | ["googletranslate://?sl=ru&tl=ja&text=%D0%93%D0%B4%D0%B5%20%D1%82%D1%83%D0%B0%D0%BB%D0%B5%D1%82%3F"] |
| 90 | iphone | app still alive after app-scheme navigation | PASS | http://127.0.0.1:8765/#/tools |
| 91 | iphone | emergency tel: links | PASS | ["tel:110","tel:119","tel:05038162787"] |
| 92 | iphone | backup button downloads a JSON export | PASS | japan-trip-backup-2026-11-18.json; keys=favs,srs,settings,cards,userItems,history,quizStats |
| 93 | iphone | import backup on clean profile restores favs/srs/cards | PASS | toast=«Импортировано: favs, srs, settings, cards, userItems, history, quizStats»; {"favs":"[\"patterns.irimasen\"]","srs":4,"cards":true} |
| 94 | iphone | SW registers, activates, controls page after reload; precache filled | PASS | {"scope":"http://127.0.0.1:8765/","active":true,"controlled":true,"controlledAfterReload":true,"keys":["jt-v2"],"n":26} |
| 95 | iphone | OFFLINE (CDP offline + server stopped): app reloads, all tabs, search works | PASS | tabs=true,true,true,true,true, search hits=5, about=«О приложении  Данные v1. Офлайн-режим: включён.  Фраз: 271, кандзи: 115.», console=none |
| 96 | iphone | OFFLINE cold start in new tab with deep link #/study/numbers | PASS | study |
| 97 | iphone | OFFLINE diag.html served from cache | PASS | Диагностика · Japan Trip |
| 98 | pixel | diag.html loads without console errors (favicon.ico 404 tolerated) | PASS |  shot=shots\pixel-diag.png |

### Числа: контрольный набор PLAN.md (yenReading)

| n | app kana | app romaji | oracle kana | oracle romaji | Итог |
|---|---|---|---|---|---|
| 300 | さんびゃくえん | sanbyaku-en | さんびゃくえん | sanbyaku-en | PASS |
| 600 | ろっぴゃくえん | roppyaku-en | ろっぴゃくえん | roppyaku-en | PASS |
| 800 | はっぴゃくえん | happyaku-en | はっぴゃくえん | happyaku-en | PASS |
| 3000 | さんぜんえん | sanzen-en | さんぜんえん | sanzen-en | PASS |
| 8000 | はっせんえん | hassen-en | はっせんえん | hassen-en | PASS |
| 10000 | いちまんえん | ichiman-en | いちまんえん | ichiman-en | PASS |
| 128000 | じゅうにまんはっせんえん | jūniman hassen-en | じゅうにまんはっせんえん | jūniman hassen-en | PASS |
| 250000 | にじゅうごまんえん | nijūgoman-en | にじゅうごまんえん | nijūgoman-en | PASS |
