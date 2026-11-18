# Phrasebook content proofreading (JA ⇄ RU)

> Note: at the time of this review the app's translations were Russian (the `ru` field). The app is now English-only (JA ⇄ EN) and the field is `en`; Russian translations quoted below are given as their English meaning.

Date: 2026-11-18. Reviewer: independent proofreading (teacher/translator). App files were not changed.
Machine-applicable fixes: `review/fixes.json` (fixes to the **sources** `tools/content/*.src.mjs`; after applying them run `node tools/build-data.mjs`, ja/kana are rebuilt from ruby).

## 1. Summary

| What was checked | Volume |
|---|---|
| phrases.json | 256 entries (say 184 / hear 53 / pattern 13 / card 6) — each one line by line against 8 criteria |
| kanji.json | 106 entries (7 groups) |
| kana.json | 120 cells (gojūon 46, dakuten/handakuten 25, yōon 33, extended katakana 16) + 45 quiz words + 5 notes |
| Content generated in code | `app/modules/numbers.js` (prices up to 99 999 999, time, dates, 5 counters × 10), `app/modules/view-show.js` ("Allergy" cards for 12 allergens, "Hotel address") |
| Mechanical check | my own strict kana→Hepburn-with-macrons script (PLAN 1.6) over all 362 entries: macrons, っ, ん, particles は/を/へ |

Problems found (by meaning, not by field):

| Type | error | warn | style | Entries |
|---|---|---|---|---|
| Wrong meaning / wrong fact in a note | — | 1 | — | k.tokkyu |
| Wrong reading | 1 | 2 groups | — | k.don; TTS risk 辛→つらい (3 entries); hidden sound changes 階/か月 (3 entries) |
| Unnatural / wrong register | — | 2 | — | hear.food.karasa, shop.passport |
| Romaji | 0 | 0 | 1 question | k.quartz (kuōtsu vs kwōtsu) |
| Translation (RU) | — | 3 | 2 + 7 (gender) | food.itadakimasu, hear.food.drink, hear.family.hoken; food.oishii, family.pediatric; "lost" (masculine/feminine verb forms) ×7 |
| Style / useful notes | — | 4 | 5 | nansai, tickets, donichi, nyu; shiharai ？, ikkatsu, no-wasabi, pharmacy, kana note |
| Data structure | — | 1 | — | no replyTo/replies (see §5) |
| **Total fixes in fixes.json** | **3** | **20** | **15** | 38 field fixes in 30 entries |

**Overall assessment: the content is of very good quality.** Kanji readings in all 256 phrases are correct, including rendaku and sound changes (取り皿 とりざら, 試し撮り ためしどり, 一括払い いっかつばらい, 東口 ひがしぐち, 三百 さんびゃく, 六百 ろっぴゃく, 八千 はっせん, 三つ みっつ, 一個 いっこ, 十分 じゅっぷん + tts). The kana field is everywhere exactly equal to the reading of ja (derived from ruby, verified). Romaji strictly follows PLAN 1.6: the strict script found no mismatch except the expected こんにちは/こんばんは (wa), and every ん before a vowel sits on a word boundary or is separated by a hyphen/apostrophe (sen-en, kin'en, sen'yōsha, nan-ari). The です/ます register is consistent. Nothing crude or culturally inappropriate.

## 2. Errors and warnings (included in fixes.json)

### error
1. **k.don `丼[どん]`** — standalone 丼 is read **どんぶり** (donburi). どん is only a suffix in dish names (牛丼 gyūdon, 親子丼 oyakodon, 天丼 tendon). Fix: ruby `丼[どんぶり]`, romaji `donburi` + a note about ～どん.

### warn — Japanese
2. **hear.food.karasa `辛さはどうしますか`** — this is how a customer talks, not staff. Staff say: **辛さはどうなさいますか** (or いかがなさいますか). Fix to ruby/romaji + tts (see item 4).
3. **shop.passport `パスポートはこれです`** — grammatically correct, but sounds like an answer to "which one is the passport?". When handing over a passport people say **パスポートです** (or "はい、お願いします"). Fix: `パスポートです` / `pasupōto desu`.
4. **TTS risk for 辛** — in food.not-spicy (辛くない), food.no-spice (辛く), hear.food.karasa (辛さ) the synthesizer may read 辛 as つらい ("hard, painful"). I did not check this on a device [?], but a kana override is harmless. `tts` added. (In the kanji cheat sheet the kana is spoken, so there is no risk there.)
5. **Hidden sound changes in hear phrases with 〇** — hear.hotel.floor and hear.shop.counter (〇階), hear.shop.hosho (〇か月). The romaji `〇-kai`/`〇-kagetsu` is correct as a template, but by ear you will hear いっかい / さんがい / ろっかい / はっかい / じゅっかい, ろっかげつ, etc. A "6か月 ろっかげつ" warranty is exactly what is typical for used camera gear. Notes added.

### warn — facts in notes
6. **k.tokkyu, note "Usually needs an extra ticket"** — true for JR and some private lines (Odakyu Romancecar, Tobu, Seibu, Kintetsu), but on Keio, Keikyu, Tokyu, Hankyu, Keihan 特急 runs with no surcharge. Note refined.
7. **transport.tickets** — no child fare rules. Added: 小児 ages 6–12 (primary school) pay half, under 6 travel free (up to two children per adult) unless the child needs a reserved seat. These are JR rules; private lines are almost the same.
8. **k.donichi 土日祝** — the reading どにちしゅく is correct (this closes the [?] in PLAN 4.11), but JR timetables more often say **土休日** (どきゅうじつ), and weekdays are **平日**. Note added.
9. **k.nyu 乳** — on packaging the allergen is usually written **乳成分**. Note added.
10. **hear.family.nansai** — doctors and staff often ask **おいくつですか**. Added this variant and the answer 〇歳です (いっさい / はっさい / じゅっさい).

### warn — translation
11. **food.itadakimasu** "Enjoy your meal / thank you" — いただきます is said by the person eating; it is not a wish to others. Fix: "(before eating) Thank you for the food — I'm starting" + a note.
12. **hear.food.drink** お飲み物はいかがですか means "Would you like something to drink?", not "What will you drink?" (that would be お飲み物は何になさいますか). Fix: "Anything to drink?".
13. **hear.family.hoken** 保険証 is the Japanese health insurance card; a tourist does not have one. The translation was clarified, plus a note: reply 海外旅行保険に入っています (family.insurance) and show the policy.

### style (also in fixes.json)
- food.oishii: "It was **very** delicious" → "It was delicious" (the Japanese has no とても).
- family.pediatric: "Where is a children's doctor?" → "Where is pediatrics (a children's doctor)?".
- Gender: transport.lost-ticket, transport.overshot, hotel.key, family.injury, family.wallet, family.phone, card.lost-way → masculine/feminine verb forms ("lost", "got lost", etc.), since a family is travelling.
- hear.konbini.shiharai: `お支払い方法は` → `お支払い方法は？`. The phrase breaks off at は, and without a question mark it is not clear that it is a question (PLAN 4.9 had the mark).
- hear.konbini.ikkatsu: convenience stores hardly ever ask this, but electronics shops ask it all the time, often as **お支払い回数は？** → "一括で". Added to the note.
- food.no-wasabi: staff say **さび抜き** (sabinuki). Added to the note.
- family.pharmacy: a note that over-the-counter medicine is easier to buy at a ドラッグストア.
- kana.src SPECIAL_NOTES[3]: "handakuten" written in Latin script → the Cyrillic spelling (consistent with the rest of the Russian text at the time).

## 3. Questions and variants I did NOT put into fixes.json

- **food.allergen-list `アレルギー表はありますか`** — will be understood. Slightly more familiar: **アレルギーの一覧表はありますか** / **アレルゲン情報はありますか**. Can stay.
- **transport.together `三人並んで座れますか`** — clear and acceptable. At the ticket counter people more often say **三人並びの席をお願いします** / **三人並んで座れる席はありますか**. Your call.
- **hotel.late-checkout `チェックアウトを遅くできますか`** — correct. More common: **レイトチェックアウトはできますか**.
- **hotel.checkin `予約した〇〇です`** — correct; **予約している〇〇です** is slightly more natural. Not an error.
- **patterns.taberaremasen** translation "Cannot eat eggs" — without a subject it reads oddly. Variant: "No eggs (I can't / the child can't eat them)".
- **k.quartz** romaji `kuōtsu` — by Hepburn, クォ is rather `kwōtsu`, which is also closer to the pronunciation. The current version is a choice, not an error.
- **shop.taxfree** — I confirm the note about the refund scheme from 1.11.2026 from memory. I believe the threshold "from 5,000 yen excluding tax in one shop per day" stays, but I am not sure [?]: check on the Japan Tourism Agency site before the trip (PLAN already notes this).
- **hear.konbini.nenrei** — the note "press はい" is broadly correct; on some registers the button is labelled "20歳以上です" / "確認". Could be added.

### Answers to the [?] items in PLAN
- 行き: いき is the norm in speech, ゆき in announcements and on boards. The note in transport.platform is correct.
- 土日祝 = どにちしゅく — the standard reading (see item 8 about 土休日).
- 日差 = にっさ — correct, the established watchmakers' term.

## 4. Checked and fine (a selection of what was worth checking)

- **Hear lines** match real staff speech: お弁当は温めますか, お箸はお付けしますか, 以上でよろしいですか, 千円お預かりします, 二百円のお返しです, 合計〇〇円になります, お次の方どうぞ, 店内でお召し上がりですか, 黄色い線の内側までお下がりください, お出口は右側です, 〇〇線はお乗り換えです, 撮影はご遠慮ください, お手を触れないでください, 在庫がございません.
- **Factual notes**: 7-Eleven ATMs accept foreign cards; water and tea in restaurants are free; 110 / 119; the eight mandatory allergens (えび, かに, くるみ, 小麦, そば, 卵, 乳, 落花生) — correct, くるみ was added in 2023; 十分 じゅっぷん/じっぷん vs じゅうぶん; 四時 よじ, 九時 くじ, 千 without いち.
- **Kanji cheat sheet**: all 106 readings and meanings are correct (used-goods grading 美品/良品/並品/難あり/ジャンク/現状品, 動作確認済み/未確認, 付属品, 元箱, 分解清掃済み, 正規品/並行輸入, 自動巻/手巻, 税込/税抜, 免税, 現金のみ, カード可). The only error is 丼.
- **kana.json**: tables complete and correct (ぢ/づ = ji/zu, を = o); the extended katakana covers the combinations needed for loanwords; all 45 quiz words are real, correctly spelled, with correct romaji.
- **numbers.js**: さんびゃく/ろっぴゃく/はっぴゃく, さんぜん/はっせん, いっせんまん (10 million), …4円 = よえん; minutes いっぷん/さんぷん/よんぷん/ろっぷん/はっぷん/じゅっぷん; hours よじ/しちじ/くじ, 0 = れいじ; dates ついたち…とおか, じゅうよっか, はつか, にじゅうよっか; counters つ/人/枚/本/個 (よにん, いっぽん/さんぼん/ろっぽん/はっぽん, いっこ/ろっこ/はっこ/じゅっこ) — all correct.
- **"Allergy" card** (view-show.js): 「この子には卵・小麦のアレルギーがあります。卵・小麦が入った料理は食べられません。少量でも危険です。入っているかどうか確認していただけますか。」 — natural and polite. The "Address" card is fine too.
- **Duplicate ja across categories** (konbini.kore = patterns.kudasai and 6 more pairs) — apparently intentional (pattern + situation); not a problem from the language point of view.

## 5. replyTo / replies links — missing

The PLAN 3.3 schema provides `replyTo`/`replies`, but the source format `[id, ruby, romaji, ru, note, extra]` does not contain them, and `build-data.mjs` does not output them: phrases.json has 0 links. Right now replies exist only as text in notes ("Reply: …"). Recommended markup (`replyTo` on say; `replies` on hear — the reverse):

| hear | matching say |
|---|---|
| hear.konbini.bag | konbini.bag-none, konbini.bag-yes, basics.daijobu, basics.onegai |
| hear.konbini.heat | konbini.heat, konbini.no-heat, basics.daijobu, basics.onegai |
| hear.konbini.hashi | basics.onegai, basics.daijobu, konbini.chopsticks |
| hear.konbini.receipt | konbini.receipt-yes, konbini.receipt-no |
| hear.konbini.point | konbini.no-point, basics.iie |
| hear.konbini.shiharai | konbini.card, konbini.cash, konbini.ic |
| hear.konbini.ijo, hear.konbini.ikkatsu | basics.hai |
| hear.food.nanmei | food.party, food.party-detail |
| hear.food.order | food.not-yet, basics.hai |
| hear.food.eatin | basics.hai, food.takeout |
| hear.shop.sagashi | shop.looking, shop.looking-lens, shop.looking-body |
| hear.shop.passport, hear.hotel.passport | shop.passport |
| hear.shop.tsutsumi | shop.gift, basics.daijobu |
| hear.taxi.dochira | transport.taxi-address |
| hear.family.hoken | family.insurance |
| hear.family.dou, hear.family.itai | family.stomach, family.fever, family.injury, family.sick |

Notes refer to replies that do not exist as separate phrases: 持ち帰りで (mochikaeri de), 待ちます (machimasu), 一緒で大丈夫です. They should be added as say entries if the links are implemented.

## 6. What is missing (20 suggestions, by value)

| # | id (suggested) | kind | ja | ruby | kana | romaji | ru (given here in English) |
|---|---|---|---|---|---|---|---|
| 1 | hear.food.suki | hear | お好きな席へどうぞ | お好[す]きな席[せき]へどうぞ | おすきなせきへどうぞ | osuki na seki e dōzo | Sit wherever you like |
| 2 | hear.food.button | hear | お決まりになりましたら、ボタンでお呼びください | お決[き]まりになりましたら、ボタンでお呼[よ]びください | おきまりになりましたら、ボタンでおよびください | okimari ni narimashitara, botan de oyobi kudasai | When you have decided, press the call button |
| 3 | hear.food.namae | hear | こちらにお名前を書いてお待ちください | こちらにお名前[なまえ]を書[か]いてお待[ま]ちください | こちらにおなまえをかいておまちください | kochira ni onamae o kaite omachi kudasai | Write your name on the waiting list and wait (Latin letters are fine) |
| 4 | hear.shop.jitaku | hear | ご自宅用ですか | ご自宅用[じたくよう]ですか | ごじたくようですか | go-jitaku-yō desu ka | Is it for yourself (not a gift)? → はい / プレゼント用です |
| 5 | hear.konbini.wake | hear | 袋はお分けしますか | 袋[ふくろ]はお分[わ]けしますか | ふくろはおわけしますか | fukuro wa owake shimasu ka | Shall I pack them in separate bags (hot/cold)? → 一緒で大丈夫です (issho de daijōbu desu) |
| 6 | family.age | say | 〇歳です | 〇歳[さい]です | 〇さいです | 〇-sai desu | He/she is 〇 years old (1 いっさい, 8 はっさい, 10 じゅっさい) |
| 7 | family.free | say | 子どもは無料ですか | 子[こ]どもは無料[むりょう]ですか | こどもはむりょうですか | kodomo wa muryō desu ka | Is it free for a child? |
| 8 | family.kid-price | say | 子ども料金はいくらですか | 子[こ]ども料金[りょうきん]はいくらですか | こどもりょうきんはいくらですか | kodomo ryōkin wa ikura desu ka | How much is a child ticket (admission)? |
| 9 | shop.flashlight | say | ライトで中を見てもいいですか | ライトで中[なか]を見[み]てもいいですか | ライトでなかをみてもいいですか | raito de naka o mite mo ii desu ka | May I check the lens with a flashlight? |
| 10 | shop.body-only | say | 本体のみですか | 本体[ほんたい]のみですか | ほんたいのみですか | hontai nomi desu ka | Is this the body/unit only (no accessories)? |
| 11 | shop.return | say | 返品はできますか | 返品[へんぴん]はできますか | へんぴんはできますか | henpin wa dekimasu ka | Can it be returned? |
| 12 | k.homen | kanji/station | 方面 | 方面[ほうめん] | ほうめん | hōmen | direction (渋谷方面 — towards Shibuya) — on every platform |
| 13 | k.heijitsu | kanji/station | 平日 | 平日[へいじつ] | へいじつ | heijitsu | weekdays (in timetables and opening hours) |
| 14 | k.kakutei | kanji/station | 各駅停車 | 各駅停車[かくえきていしゃ] | かくえきていしゃ | kakueki teisha | stopping at every station (= 普通, short 各停); was in PLAN 4.11 but got lost |
| 15 | k.eigyojikan | kanji/signs | 営業時間 | 営業時間[えいぎょうじかん] | えいぎょうじかん | eigyō jikan | opening hours |
| 16 | k.henpinfuka | kanji/shop | 返品不可 | 返品不可[へんぴんふか] | へんぴんふか | henpin fuka | no returns |
| 17 | k.hontai | kanji/used | 本体のみ | 本体[ほんたい]のみ | ほんたいのみ | hontai nomi | body/unit only, no accessories/box |
| 18 | k.jitsuyo | kanji/used | 実用品 | 実用品[じつようひん] | じつようひん | jitsuyōhin | "user" copy: visible wear, but works |
| 19 | k.fukikizu | kanji/used | 拭きキズ | 拭[ふ]きキズ | ふきキズ | fukikizu | cleaning marks (micro-scratches) on the coating |
| 20 | k.balsam | kanji/used | バルサム切れ | バルサム切[ぎ]れ | バルサムぎれ | barusamu-gire | balsam separation (of cemented lens elements) |

Explanations: #9–11 and #16–20 are what is actually written on used-gear listings in Japan (本体のみ, 実用品, 拭きキズあり, バルサム切れ, 返品不可) and what is worth asking about before buying. The reading of #20 バルサムぎれ (rendaku, like 在庫切れ ざいこぎれ) — confidence is high but not absolute [?].
