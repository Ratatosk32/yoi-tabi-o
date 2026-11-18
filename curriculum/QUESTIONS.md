# Open questions (not shipped as data)

Items I was not sure enough about to put into `curriculum.json`, plus decisions for the builder. Nothing below is in the data unless stated.

## Left out of the data
1. **バルサム切れ (lens balsam separation).** Common in used-lens listings. I believe the reading is バルサムぎれ (rendaku, like 在庫切れ ざいこぎれ), but I have not confirmed it, and きれ may also be heard. Not shipped. The lens lesson uses 絞りに油 (shibori ni abura, oil on aperture blades) instead.
2. **Tax-free rules under the refund system (from 1 Nov 2026).** The data asks neutral questions (`shop.tf-5` "May I use it in Japan before I leave?", `shop.tf-7` "By what date must I leave Japan?", `shop.tf-8` "When will I get the refund?") and makes no claims about the answers. Unconfirmed: the minimum purchase per store per day (I believe ¥5,000 before tax), whether goods used in Japan still qualify, and whether customs must be visited before airline check-in. Check the Japan Tourism Agency site before the trip.
3. **Physical Suica / PASMO sales to tourists.** Availability has changed in recent years; the note on `transport.suica-buy` only says that a Suica on the phone works too.
4. **Children in the other-sex onsen bath.** Age limits differ by prefecture and facility, so `hotel.child-bath-age` is a question with no number in the note.

## Decisions for the builder
5. **クォーツ romaji.** The curriculum uses `kwōtsu` (strict Hepburn for クォ, closer to the pronunciation). `app/data/kanji.json` (k.quartz) still has `kuōtsu`. Pick one for both; I recommend `kwōtsu`.
6. **Duplicate Japanese across lessons (intended).** Some chunks appear as a single word in one lesson and inside a sentence elsewhere, e.g. `basics.kore-word` これ vs `konbini.kore` これをください, or `food.w-tamago` 卵 vs the allergy items. Within a lesson there are no repeats (the validator warns otherwise).
7. **`talk.from` 〇〇から来ました.** The slot is the user's country, written in katakana by the user (e.g. ロシア, イギリス). Consider a one-time "your country in Japanese" field in settings that fills `〇〇` on display.

## Recommended before freezing
8. **Native-speaker pass on the 732 new items**, especially staff keigo in U06–U14 (hear items) and the long two-part exchanges in U14. I wrote them to the same standard as the v1 review, but one pass by a native speaker is the best remaining check (PLAN section 4 already suggests this).
9. **TTS on device.** Possible misreadings already have a `tts` override (辛 → から, 十分 → じゅっぷん). Overrides were also added for 一日 = ついたち (`numbers.tsuitachi`, `sights.open-jan1`). Spot-check on the Pixel: 生もの (なまもの), 何色 (なにいろ), 一日三回 (いちにち, `hear.family.dosage`), 明日 (あした), 大人 (おとな), 方 in お次の方 (かた). Add `tts` overrides wherever the voice gets them wrong.
