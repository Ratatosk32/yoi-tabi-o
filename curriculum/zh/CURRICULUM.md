# Mandarin course: design

Author: linguist (zh). Date: 2026-11-21.
Data contract: `curriculum/zh/SCHEMA.md`. Sources: `curriculum/zh/src/*.mjs`. Build: `node curriculum/zh/tools/build.mjs`
(writes `app/data/zh/curriculum.json`, `hanzi.json`, `pinyin.json` and `curriculum/zh/SUMMARY.md`). Check:
`node curriculum/zh/tools/validate.mjs`. Counts per unit and lesson: `SUMMARY.md` (generated). Open points: `QUESTIONS.md`.

## 0. What it is

A general Mandarin course (Putonghua, simplified characters) for an adult beginner, not a travel phrasebook:
1000 items in 78 lessons and 22 units, rising from HSK 1 to HSK 3, with an HSK 4 tail. Every item is a
sentence or a slot word the learner can say or must understand by ear, with per-character pinyin.

Realistic pace (same evidence base as `research/LEARNING-RESEARCH.md`): one lesson (10-15 items) per study day
plus reviews. The core path (Z01-Z20, 956 items) is a 3-4 month course at one lesson a day; the HSK 4 tail
(Z21-Z22, 44 items) is always open.

## 1. Structure

| Units | HSK | Level | Content |
|---|---|---|---|
| Z01-Z07 | 1 | 1-2 | greetings, names, 是 / 吗 / 呢, family and 有, 的, numbers and measure words, time and dates, 在 (place and -ing), routine, food, 想 / 要 |
| Z08-Z14 | 2 | 2-3 | eating out, shopping and money, 了 (done / change), 是……的, directions, transport, 过, home and 着, weather, 比, 跟……一样 |
| Z15-Z20 | 3 | 4 | work and study, 得, 会 / 能 / 可以, health, hobbies, result and direction complements, feelings, opinions, 把, small talk, phone and messaging |
| Z21-Z22 (ext) | 4 | 5 | 不但……而且, 除了, 即使, 只要, 被, 连……都, 对……来说, plans and life events |

Paths: `core` (Z01-Z20, sequential, unlock-gated) and `ext` (Z21-Z22, always open). Units Z01-Z14 have 4
lessons; Z15-Z20 have 3; Z21-Z22 have 2. Categories: `basics, people, numbers, daily, food, shopping, city, work,
health, feelings, talk, phone, patterns` (the last for pattern items of any topic).

### Grammar order (where each point is introduced)

| Point | Lesson |
|---|---|
| 是, 不是; 叫 / 姓 | Z01-L02 |
| 吗, 呢, 也, 不太 | Z01-L03 |
| 会 (skill), verb + 一下 | Z01-L04 |
| 这 / 那, 的, 谁, 什么 | Z02-L01 |
| 有 / 没有, 几 + measure word, 两 | Z02-L02 |
| 很 / 太……了 / 真 + adjective | Z02-L04 |
| measure words (个 本 杯 张 件 条 只 位 辆 双 瓶 碗 块 份) | Z03-L01 ... Z03-L04 |
| time word before the verb, 吧 | Z04-L01 |
| 是……的 (first contact) | Z04-L03 |
| verb + duration | Z04-L04 |
| 在 + place; place words 上 / 里 / 下面 / 旁边; place + 有 | Z05-L01, L02 |
| 离 + 远 / 近, verb 不 verb | Z05-L04 |
| 先……然后 | Z06-L01 |
| 在 / 正在 + verb (-ing), 有点儿 | Z06-L02 |
| 要 (plan), 想, 一起……吧, 还是 | Z06-L03 |
| 每……都, 从来不, number + 次 | Z06-L04 |
| 喜欢 / 爱 + verb | Z07-L01 |
| 要 + thing / 想 + verb | Z07-L02 |
| 可以……吗, 能……吗 (requests) | Z08-L02, L03 |
| adjective + 一点儿, doubled verbs, 有没有 | Z09-L01, L02 |
| 又……又 | Z09-L04 |
| verb + 了, 没 + verb, 已经……了, 快……了 | Z10-L01 |
| sentence 了 (change), 不……了, 快要……了, 该……了 | Z10-L02 |
| 是……的 (details of the past) | Z10-L03 |
| 往 + direction, 从 A 到 B | Z11-L01, L02 |
| 不能 (not allowed), 帮 + person | Z11-L04 |
| 过 (experience), 没……过 | Z12-L04 |
| verb phrase + 的 + noun | Z13-L01 |
| verb + 在 + place | Z13-L02 |
| 着, 别 | Z13-L03 |
| 得 děi | Z13-L04 |
| 会 (prediction), 听说 | Z14-L01 |
| 比, 没有……那么, 更 / 最 | Z14-L03 |
| 跟……一样 / 不一样, 像 | Z14-L04 |
| 一边……一边 | Z15-L01 |
| 得 (degree complement) | Z15-L02 |
| 会 / 能 / 可以 contrasted | Z15-L03 |
| 应该, 最好, 越来越 | Z16-L03 |
| 对……感兴趣 | Z17-L01 |
| result complements (完 到 懂 错 好 见 干净), potential form (听得懂 / 看不清楚 / 来得及) | Z17-L02 |
| direction complements (进来 出去 回来 上来 下去 过去 起来) | Z17-L03 |
| 让 + person + feeling | Z18-L01 |
| 觉得, 因为……所以, 虽然……但是 | Z18-L02 |
| 把 | Z18-L03 |
| 是不是, ……吧？ | Z19-L03 |
| HSK 4 connectors, 被, 连……都, 对……来说, 一……就, 越 A 越 B | Z21, Z22 |

Every lesson lists its new patterns in `patterns`; each pattern also appears as at least one `pattern` item with a
`pattern` field (93 pattern items).

### Item kinds and links
- `say` (733): what the learner says; `hear` (174): what the learner hears from others; `pattern` (93): a model
  sentence for a grammar point.
- Every `hear` item either has `replies` (ids of `say` / `pattern` items that answer it) or a note saying no reply
  is needed. Links are symmetric (`replyTo` on the answers) and may point to an earlier lesson (`basics.xie-xie`).
- `word` items (171) are slot words for the patterns of their lesson; `mw` marks measure-word items; `sandhi`
  marks items whose note explains a tone change.
- From Z02 on, each lesson mixes roughly 60 % say, 25 % hear, 15 % pattern / word, so "hear, then answer" drills
  can be built from the links (same approach as the Japanese course, `curriculum/CURRICULUM.md` 3.4).

## 2. Pinyin conventions (summary of SCHEMA.md section 1)

- Ruby: one syllable per character, grouped by pinyin word (`学生[xué sheng]`); `romaji` and `kana` are derived by
  the build. Single words such as 你好 are written as two runs (`你[nǐ]好[hǎo]`) so that `romaji` is `Nǐ hǎo`.
- Neutral tone unmarked. Readings follow CC-CEDICT; where CEDICT is inconsistent, the choice is listed in
  `validate.mjs` (`REVIEWED`) and in `QUESTIONS.md` (for example 进来 jìn lai, 出去 chū qu, 后面 hòu miàn).
- 不 and 一 carry the spoken tone (不是 bú shì, 一个 yí ge, 一起 yì qǐ, 第一 dì yī); the validator checks the next
  syllable. 3rd + 3rd stays in citation tones and the item has a note the first times it matters.
- Erhua: 儿 after a syllable is written `r` as its own syllable (`哪儿[nǎ r]`, `一点儿[yì diǎn r]`), giving
  `nǎr`, `yìdiǎnr` in `romaji`. The builder's per-character alignment still works (one syllable per character).
- Digits and Latin are written `{138|yāo sān bā}` with an explicit `tts` in hanzi where a voice could misread them.
- Sentences are capitalized; single words and phrases without sentence punctuation stay lowercase.

## 3. hanzi.json

402 characters in 12 topic groups plus 35 radicals (`group: "radical"`, `hsk: 0`). Each character has the most
common reading, a short meaning, an example word (`ex`) and, for polyphones, the other readings in `alt`.
`hsk` is the lower of the HSK 2.0 and HSK 3.0 levels of the first HSK word that contains the character
(generated into `src/hanzi-hsk.mjs` by `tools/hsk-levels.mjs` from `dictionary/zh/raw/hsk/complete.json`,
together with the dictionary radical in `radical`). Stroke counts are not included.
Ids are `zh.h.<pinyin><tone>-<code point>` (radicals `zh.h.r-<pinyin>-<code point>`), so they never change
when characters are added.

## 4. pinyin.json

- `tones`: 4 tones and the neutral tone with contour and example.
- `tables`: initials (23, with y / w), finals (simple and compound, i-, u-, ü-groups), a tones grid and
  confusable sounds (zh z j, ch c q, sh s x, r l, u ü, an ang, en eng, in ing). Every cell has an example
  character to speak (`tts`), checked against CC-CEDICT.
- `notes`: 3 + 3 sandhi, half-3rd tone, 不 and 一, neutral tone, ü spelling, iu / ui / un, y / w, the -i of zhi and
  zi, apostrophe, tone-mark placement, erhua, unaspirated b d g.
- `quizzes` (9, 227 items): `tones` (listen), `tone-marks` (read), `tone-pairs` (listen, 2-syllable words),
  `initials` (listen, groups zh z j / ch c q / sh s x / r l), `u-umlaut` (listen), `u-umlaut-read` (read: is the
  written u really ü?), `finals` (listen, -n / -ng), `words` (read: hanzi to meaning), `words-listen`.
  Listen items carry `tts` (one character or word read unambiguously) and `py` (validated reading).
- `words`: 40 basic words.

## 5. Validation

`validate.mjs` checks: header fields; ids unique and namespaced; every lesson id resolves to its lesson; lesson
size 10-15; order sequence; tags[0] = unit path; symmetric reply links; `ja` = ruby base, `romaji` and `kana`
derived from ruby; every hanzi has a reading; syllables = characters; every syllable is one of the 409 Mandarin
syllables with one tone mark on the right vowel; 不 / 一 sandhi; readings against CC-CEDICT (multi-character
words as whole entries, otherwise per character; neutral-tone differences are warnings); hanzi and pinyin-quiz
readings against CC-CEDICT; no empty fields; no Cyrillic. CC-CEDICT is read from `dictionary/zh/raw/cedict/`
(or `$CEDICT_DIR`); without it the reading checks are skipped with a warning.

## 6. Notes for the builder

- Treat zh lessons like Japanese lessons: unlock CORE lessons at 80 % in box 2+; EXT always open.
- `hear` items: audio first, no text before answering; distractors from the same lesson.
- `pattern` items: show `pattern` with the sentence; slot words are the lesson's `word` items.
- Use `tts` when present (phone and room numbers, years).
- The schema example `你好[nǐ hǎo]` is written `你[nǐ]好[hǎo]` in the data (see `QUESTIONS.md`).
