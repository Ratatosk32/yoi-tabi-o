# Phrasebook curriculum: ~1000 items, 80 lessons

Author: linguist / Japanese teacher. Date: 2026-11-18.
Data: `curriculum/data/curriculum.json`, built from `curriculum/src/*.mjs` by `curriculum/tools/build.mjs`; checked by `curriculum/tools/validate.mjs`; counts in `curriculum/SUMMARY.md` (generated). Open questions: `curriculum/QUESTIONS.md`.

Learner: a beginner who studied a little long ago and has forgotten almost everything. The path starts from zero; no kana or grammar is assumed.

## 0. What is realistic

- 3 weeks × 20–30 min/day ≈ **8–10 hours** in total. With active recall that is **10–13 new items a day** plus reviews, so about **250 items** in 20 days that will actually come to mind at a register or on a platform. **1000 phrases cannot be learned in 3 weeks**, and this plan does not pretend otherwise.
- Hence two paths:
  - **CORE** — units U01–U04: **20 lessons, 248 items**, one lesson a day before the flight. Covers what the family needs at a konbini, restaurant, station, hotel, camera shop and tax-free counter, plus an SOS minimum. About a quarter of the core is staff speech (`hear`): it only has to be **recognized by ear**, which is much cheaper than producing it.
  - **MINIMUM, if you fall behind** — 8 lessons: U01-L01…L05, U02-L01, U03-L05 (SOS), U04-L05 (paying and tax-free). About 100 items, enough not to get lost.
  - **EXTENDED (ext)** — U05–U11, 43 lessons, 553 items. Study **by situation**: the evening before a camera-shop day do U08; before the shinkansen, U07-L01; before an onsen, U09-L03. Good for the plane and evenings during the trip.
  - **REFERENCE (ref)** — U12–U14, 17 lessons, 214 items: health and emergencies in detail, small talk, long exchanges, show-to-staff cards. **Searched, not studied**: search by English, kana or romaji, and the full-screen "show" button.
- The goal of the core is not to "know Japanese" but to recognize a familiar staff line within 2–3 seconds and answer with a ready-made chunk. Grammar is not taught separately; it lives inside the patterns.

## 1. Progression

Difficulty grows along four axes at once:

1. **Chunks → patterns with slots → staff keigo → longer exchanges.**
   - Level 1: fixed chunks (すみません, これをください, 大丈夫です).
   - Level 2: patterns with a slot (～をください, ～はどこですか, ～てもいいですか) and numbers.
   - Level 3: recognizing staff keigo (お召し上がりですか, ご利用ですか, お預かりします) and answering it.
   - Level 4: specialized situations (used lenses, watches, shinkansen, clinic) and two-part requests.
   - Level 5: long exchanges and "explain a problem" sentences.
2. **Kana → common kanji.** Level 1 is almost all kana. Kanji enter one or two per phrase (円, 人, 時, 駅, 口), always with furigana. Reading signs is the job of the kanji cheat sheet; the lessons reinforce the same words (出口, 中古, 免税).
3. **Frequency × usefulness for this trip.** A family with a child, 3 weeks in December (illuminations; much is closed around 29 Dec – 3 Jan), camera and watch shopping. Daily situations come first (register, food, trains), then the 1–3 times situations (taxi, tax-free), then rare but critical ones (clinic), and last the "nice to have" (small talk).
4. **Say → hear.** After U01, every lesson contains staff lines, and every hear item is linked to its answers (`replies`), so "hear → answer" drills can be built automatically.

## 2. Units and lessons

A lesson is 10–15 items, about 20 minutes. Lesson fields: code (`U03-L02`), title, goal, new patterns, level, path. The full list with counts is in `SUMMARY.md`.

| Unit | Path | Level | Lessons | Content |
|---|---|---|---|---|
| U01 First words | core | 1 | 5 | polite keys; "I don't understand"; this / here / how much; konbini: say; konbini: hear the cashier |
| U02 Patterns and numbers | core | 2 | 5 | ～をください / ～はどこですか / ～はありますか; prices; time and days; counting things and people; ～てもいいですか / ～てもらえますか / ～たいです |
| U03 Restaurant and SOS | core | 2–3 | 5 | getting a table; ordering; child and allergies; paying and leaving; SOS minimum |
| U04 Trains, hotel, shops | core | 3 | 5 | station; announcements; taxi and check-in; camera shop I; paying and tax-free |
| U05 Building blocks | ext | 2–3 | 4 | directions; colors, sizes, qualities; days and dates; question words and connectors |
| U06 Food+ | ext | 3–4 | 8 | ramen and ticket machines; sushi; izakaya and drinks; café and fast food; dishes; ingredients; supermarket and food halls; special requests |
| U07 Getting around+ | ext | 3–4 | 7 | shinkansen; IC cards and fares; buses; on foot; station signs; trouble on the way; airport and luggage delivery |
| U08 Cameras and watches+ | ext | 4 | 8 | condition grades; inspecting a lens; inspecting a body / film; price and comparison; staff lines; watches I; watches II; accessories and repair |
| U09 Hotel and daily life+ | ext | 3–4 | 5 | requests; room problems; ryokan and onsen; money, laundry, post; phone and front desk |
| U10 With a child+ | ext | 2–4 | 5 | a child's needs; parks and museums; when people talk to your child; words for the child; if the child gets lost |
| U11 Sightseeing | ext | 3–4 | 6 | tickets and hours; temples and shrines; photo etiquette; "take our photo" and tips; December: lights and New Year; weather |
| U12 Health and emergencies+ | ref | 4–5 | 7 | symptoms; at the clinic; pharmacy; lost items and police; earthquakes and alerts; paperwork and paying; pharmacy II (by symptom, who it is for) |
| U13 Small talk | ref | 4 | 5 | about yourself; the trip; compliments and thanks; family talk; declining and apologizing |
| U14 Long exchanges and cards | ref | 5 | 5 | the whole konbini exchange; the whole restaurant exchange; buying a used lens; tax-free; show-to-staff cards |

### How a lesson mixes say / hear / pattern
- **U01–U02:** mostly `say` and `pattern`, plus one full `hear` lesson (the konbini register: you hear it from day one).
- **From U03 on:** each lesson is roughly **60 % say, 30 % hear, 10 % patterns / words**. A situational lesson is a small scene: staff line → our answer → next staff line (何名様ですか → 三人です → こちらへどうぞ).
- **Pattern lessons** (U02-L01, U02-L05, U05-L04) give the pattern plus 3–6 substitutions so the slot becomes visible.
- **Words** (`tags: ["word"]`) are only things that go into a pattern slot: dishes, camera parts, colors, directions.

## 3. Mapping to the app

Aligned with `research/LEARNING-RESEARCH.md`, section 4 (recommendation numbers R1…R15 in brackets). **[UI]** = the builder must implement it in the interface; **[data]** = already present in `curriculum.json`.

**Data [data].** Every item: `id, cat, kind, en, ja, ruby, kana, romaji, note?, tts?, pattern?, replyTo?, replies?, tags, lesson, level, order, src`. `order` is the global study order 1…N; `tags[0]` is the path (`core` / `ext` / `ref`); `word` marks slot words; `src` is `v1` (reused item) or `new`. Lessons (`code, unit, title, goal, level, path, patterns, count, ids`) are in `curriculum.json → lessons`; units in `units`; categories in `categories`.

### 3.1 Card: attempt first, then the answer (R1, R2) [UI]
- No "just browse" mode. Card: cue → "said it aloud / thought it" → answer (Japanese with furigana, ▶ audio) → **3 self-grade buttons** (Forgot / Hard / Knew).
- **say and pattern:** main mode EN → JA aloud; secondary JA → EN.
- **hear:** only "audio → meaning" and "audio → pick the reply" (options from `replies` plus distractors: say items from the same lesson). No text before answering.
- **card:** no SRS, display only.
- Audio at speed 1.0 by default; 0.7 only as a hint after a mistake (R11). Alternate ja-JP voices if the system has several.

### 3.2 Lesson of the day = two sessions (R4, R3) [UI]
- **Morning, 12–15 min:** due reviews → **pretest** of the new lesson (R8: audio → "what does it mean?" for 5 items, correct answer shown at once; correct guesses go to box 2) → new lesson (10–15 items) → lesson quiz.
- **Evening, 8–10 min:** review of today's new items + **price listening**.
- **Price listening: 2–3 min every day, mandatory** (generator `numbers.js`: audio → type the digits, realistic prices, speed 1.0).
- If more than 60 reviews are due, do not offer a new lesson.
- Reminders: **not planned** (decision 2026-11-18: no alarm / calendar-reminder screen). R13 is left to the learner.

### 3.3 Leitner boxes and unlocking (R14) [UI]
- 5 boxes, intervals 0 / 1 / 2 / 4 / 7 days (PLAN 3.4). Forgot → box 1, Hard → stays, Knew → +1. Progress is per (id, mode).
- **Unlock the next CORE lesson** when ≥ 80 % of the current lesson's items are in box ≥ 2.
- **Optional "test out"** (a convenience, not the basis of the plan): 10 random items of the lesson (say: EN → JA aloud with self-grade; hear: audio → meaning). 8 of 10 correct → the lesson counts as passed and the correct items go to box 3, staying in light review. Early lessons are not shortened or sped up.
- EXT and REF lessons are always open.

### 3.4 Reply chains: "hear → answer within 3 s" (R5) [UI]
- A hear line plays, a 3-second timer runs, the user says or picks a reply from `replies`, then the next staff line of the same scene plays.
- Scenes follow lesson order (`order`): konbini register U01-L05 + U01-L04; getting a table U03-L01; ordering U03-L02; paying in shops U04-L05; tax-free U14-L04. Whole scenes are in U14.
- After a scene: a badge such as "ready for the konbini register" (R12; no points, no leagues).

### 3.5 Kana: a separate week-1 block (R6) [UI]
- Kana is not part of the lessons but a module on `app/data/kana.json`, run in parallel with U01–U02 on days 1–5.
- **Day 1:** hiragana diagnostic; rows read correctly and quickly (< 2 s) are skipped.
- **Days 1–2:** hiragana. **Days 3–5:** katakana (more important for cameras and gear).
- Speed quiz "character → sound" and a **confusable-pairs block**: シ/ツ, ソ/ン, ク/ケ, ぬ/め, は/ほ, る/ろ, わ/ね/れ.
- Goal: read a shop katakana word (カメラ, レンズ, ボディ, ジャンク) in 2–3 s.

### 3.6 Romaji and furigana (R7) [UI]
- **Week 1:** romaji shown small.
- **From week 2:** romaji hidden by default, revealed by tap; a settings toggle. Search by romaji always works.
- Furigana always above kanji in study modes. On the "show to staff" card: no furigana, no romaji.

### 3.7 Pre-flight run and trip mode (R9, R10) [UI]
- **Days −3…0:** all CORE items (`tags[0] == "core"`) in one "audio → meaning" pass plus prices; mistakes go to "Trip favorites".
- **During the trip, "before a situation":** pick a situation (register, camera shop, taxi, restaurant, onsen) → a 3-minute run of the hear+say items of the matching lessons (map situations to lessons via `lesson` and `cat`). Diary "it helped / didn't understand": lines not understood go into the SRS.

### 3.8 Lesson quizzes [UI]
1. JA → EN, 4 options from the same lesson.
2. Audio → meaning (hear items).
3. Mini-dialog: hear line → pick the reply from `replies`.
4. Patterns: substitution "～はどこですか + トイレ" → build the sentence from tiles (`pattern` + the lesson's `word` items).
5. EN → JA aloud, self-graded.

### 3.9 Motivation and what not to build (R12, R15)
- Streak, CORE progress "N / 248", scene badges. No points, leagues or hearts.
- Do not build: speech recognition with scoring, pitch training, Japanese typing or kanji writing, a picture for every phrase, AI chat, FSRS/SM-2, a built-in translator.

### 3.10 Three-week schedule (core)
| Days | Morning (lesson) | In parallel |
|---|---|---|
| 1–5 | U01-L01…L05 | kana: hiragana (1–2), katakana (3–5) |
| 6–10 | U02-L01…L05 | prices every day |
| 11–15 | U03-L01…L05 | prices; first chain: konbini register |
| 16–19 | U04-L01…L04 | prices; restaurant chains |
| 20 | U04-L05 | — |
| −3…0 | no new lessons | pre-flight run of the core |

If the trip comes sooner, move U04-L01…L05 into days −3…0 instead of the pre-flight run: the CORE matters more than the run.

## 4. Language conventions
- Tourist register: です/ます. Staff: the real keigo used at konbini, restaurants, stations and shops; it is only recognized, never required in production.
- Romaji follows PLAN 1.6: modified Hepburn with macrons; particles は/を/へ → wa / o / e; ん before a vowel or y → n' or a hyphen at a suffix; っち → tchi; ん before b / p / m is still written n (tenpura, sanbyaku). `〇〇` is a slot to fill in. Proper nouns are capitalized (Shibuya, Kyōto, Ōsaka, Fujisan).
- 行き: いき in our own speech, ゆき in announcements, and written as it will be heard (〇〇行[ゆ]き in hear items).
- Casual child phrases (U10-L04) are marked as casual in their notes.
- Anything uncertain was left out of the data and listed in `QUESTIONS.md`.

## 5. Integration notes for the builder
- **Load:** `curriculum/data/curriculum.json` replaces `app/data/phrases.json` as the phrase source (same item shape; `en` instead of `ru`; extra fields `lesson`, `level`, `order`, `src`). All 271 v1 ids are kept, with their Japanese, kana, romaji, tts and links unchanged, so SRS progress keyed by id survives.
- **Copy, don't edit:** to ship, copy `curriculum.json` into `app/data/` (or import it in `tools/build-data.mjs`); the source of truth stays in `curriculum/src/`.
- **Links:** `replies` (on hear) and `replyTo` (on say / pattern / card) are symmetric and validated; use them for chains and for quiz distractors.
- **Lessons UI:** list of units → lessons (title, goal, count, progress bar = share of items in box ≥ 2); "Lesson of the day" button; lock icon on CORE lessons until unlocked; "Test out" button on every lesson.
- **Search:** keep searching `en`, `ja`, `kana`, `romaji`, `note`, `pattern`; the corpus is the reference for the trip.
- **TTS:** use `tts` when present (it overrides kanji readings such as 辛 = から, 十分 = じゅっぷん).

## 6. Extra content files (for the builder to merge)
- `src/kanji-extra.mjs` exports `KANJI_EXTRA` (247 items, exactly the kanji.json item fields `id, group, ja, ruby, kana, romaji, en, note?`) and `GROUPS_EXTRA` (new group `pharmacy`, suggested after `allergen`). Append each group's items after the existing items of that group; rows are ordered most frequent first. Check: `node curriculum/tools/validate-kanji-extra.mjs`.
- `src/pharmacy-phrases.mjs` adds lesson U12-L07 (12 items) to the curriculum and lists the existing pharmacy items it reuses (`REUSED`). It is already part of `curriculum.json`.
