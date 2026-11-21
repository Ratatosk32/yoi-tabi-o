# Mandarin data schema (app/data/zh/)

Status: v1, 2026-11-21. Owner: the zh linguist / data engineer. Audience: the builder of the language
switch. The Japanese files in `app/data/*.json` are not touched; everything Chinese lives in
`app/data/zh/` and is fetched only after the user switches to Chinese.

## 0. Principles

1. **Same shape and field names as the Japanese files** wherever they fit, so the app code can stay
   generic. Hanzi go into the `ja` slot (it means "target-language text as written"), pinyin with
   tone marks into `romaji`, the reading ruby into `ruby`. A neutral rename (`text`) was considered
   and rejected: every view, the search, `ttsText()` and the show card already read `ja`, `ruby`,
   `romaji`; a rename would touch every view for no gain. The language is stated once per file.
2. **Every zh file starts with the same header**:
   `{ "format": ..., "lang": "zh", "locale": "zh-CN", "script": "Hans", "version": 1, "generated": "YYYY-MM-DD", ... }`.
   The app picks behaviour from `lang` (TTS voice, `lang` attribute, fonts), never by sniffing text.
3. **All ids are namespaced** so that progress stored per id never collides with Japanese progress:
   items `zh.<cat>.<slug>`, lessons `Z01-L01`, units `Z01`, hanzi `zh.h.<slug>`, dictionary ids
   are integers that are only unique within the zh dictionary (store them under a zh key).
4. **Text rendering** (for the builder): every Chinese element needs `lang="zh-CN"` (not `ja`),
   otherwise Chrome picks Japanese glyph variants (Han unification: 直, 骨, 角, 次 differ). The
   bundled Shippori Mincho kanji subset does not cover simplified characters (这, 们, 吗, 说, 见 ...);
   for zh use the system CJK sans font (Noto Sans CJK SC on Android), no web font needed.
5. **TTS**: `utterance.lang = 'zh-CN'`; speak `tts || ja` (exactly what `ttsText()` does now, minus
   the Japanese 〇 replacement). `tts` is always hanzi (never pinyin: Chinese voices read pinyin badly).

## 1. Readings: ruby, romaji, kana

### `ruby` (per-character pinyin, grouped by word)
```
我[wǒ]是[shì]学生[xué sheng]。
你好[nǐ hǎo]！
{25|èr shí wǔ}块[kuài]
北京[Běi jīng]
```
- A run of hanzi followed by `[...]`: the bracket holds **one pinyin syllable per character,
  separated by single spaces**. The run is one pinyin word (orthography unit), so `romaji` can be
  derived from it. The validator enforces syllables = characters.
- The existing parser (`parseRuby` in `app/modules/text.js`, regex `[CJK]+\[...\]`) already parses
  this unchanged. For per-character alignment, split `rt` on spaces and pair it with the base
  characters one by one (`[...base]` and `rt.split(' ')` have equal length, guaranteed).
- `{base|reading}` for non-hanzi that are read aloud (digits, Latin letters): `{25|èr shí wǔ}`,
  `{WiFi|WiFi}`. Readings in `{}` are not split per character.
- Everything else (punctuation `，。？！、：`, spaces) is plain text.
- A capital letter in a reading marks a proper noun (`北京[Běi jīng]` gives `Běijīng`).

### Tone convention (ruby and romaji)
- Tone marks, never numbers: `ā á ǎ à`, `ē é ě è`, `ī í ǐ ì`, `ō ó ǒ ò`, `ū ú ǔ ù`, `ǖ ǘ ǚ ǜ`, `ü`.
- **Neutral tone has no mark**: 谢谢 `xiè xie`, 朋友 `péng you`, 吗 `ma`, 的 `de`, 了 `le`.
- **不 and 一 are written with the tone actually spoken** (the textbook convention of the HSK
  Standard Course): 不是 `bú shì`, 不好 `bù hǎo`, 一个 `yí ge`, 一天 `yì tiān`, 第一 `dì yī`.
- **3rd + 3rd is written in citation tones** (你好 `nǐ hǎo`, spoken *ní hǎo*); the item carries a
  `note` saying so the first times it appears and wherever it matters.
- These rules are checked by `curriculum/zh/tools/validate.mjs` against CC-CEDICT readings.

### `romaji` (pinyin with tone marks, standard orthography)
Derived from `ruby` by the build: syllables of one run are joined (`xuésheng`), runs are separated by
a space, an apostrophe goes before a/o/e-initial syllables inside a word (`Xī'ān`, `tiān'ānmén`),
the first letter of a sentence is capitalized, Chinese punctuation becomes ASCII (`，`→`, ` `。`→`.`
`？`→`?` `！`→`!` `、`→`, ` `：`→`: `). Example: `Wǒ shì xuésheng.`

### `kana` (search key; Chinese has no kana)
Toneless lowercase ASCII pinyin, no punctuation, words as in `romaji`, `ü` written `v`:
`wo shi xuesheng`, `lv cha`. It exists so the current `normalize()` search (which does not fold
tone marks) finds `ni hao` / `nihao`. The builder may additionally fold tone marks and `ü→v` in the
query for zh. Do not display `kana` in zh mode.

## 2. app/data/zh/curriculum.json

```json
{
  "format": 1, "lang": "zh", "locale": "zh-CN", "script": "Hans", "version": 1, "generated": "2026-11-21",
  "source": "curriculum/zh/src/*.mjs via curriculum/zh/tools/build.mjs",
  "categories": [{ "id": "basics", "en": "Basics", "icon": "好" }],
  "units":   [{ "id": "Z01", "title": "Hello", "path": "core", "hsk": 1 }],
  "lessons": [{ "code": "Z01-L01", "unit": "Z01", "title": "...", "goal": "...", "level": 1, "path": "core",
                "hsk": 1, "patterns": ["A 是 B"], "count": 12, "ids": ["zh.basics.ni-hao", "..."] }],
  "items": [{
    "id": "zh.basics.ni-hao", "cat": "basics", "kind": "say",
    "en": "Hello", "ja": "你好！", "ruby": "你好[nǐ hǎo]！", "kana": "ni hao", "romaji": "Nǐ hǎo!",
    "tts": "...", "note": "3rd + 3rd tone: the first 3rd tone is spoken as a 2nd: ní hǎo.",
    "pattern": "...", "replyTo": ["..."], "replies": ["..."],
    "tags": ["core"], "lesson": "Z01-L01", "level": 1, "order": 1, "src": "new"
  }]
}
```
Same fields and meaning as the Japanese curriculum (CURRICULUM.md section 3), with these
differences:
- `ja` = hanzi, `romaji` = pinyin, `kana` = toneless search key (section 1).
- `tts` (optional) = hanzi text to speak instead of `ja` (polyphone or digit fixes).
- `kind`: `say` | `hear` | `pattern` (no `card`). `pattern` items have a `pattern` field.
- `hear` items have `replies` (ids of `say`/`pattern` items that answer them); the reverse link
  `replyTo` is always present and symmetric (same rule as Japanese).
- `tags[0]` = path: `core` (sequential, unlock-gated, HSK 1-3) or `ext` (always open: the HSK 4
  tail). Other tags: `word` (a slot word), `mw` (measure word), `sandhi`.
- `level` 1..5 (1 = HSK 1 start ... 5 = HSK 4); lessons and units also carry `hsk` 1..4.
- `src` is always `new`.
- Categories: `basics, people, daily, work, food, city, shopping, numbers, health, feelings, talk,
  phone, patterns`.

## 3. app/data/zh/hanzi.json (the "signs / characters" sheet, counterpart of kanji.json)

```json
{
  "format": 1, "lang": "zh", "locale": "zh-CN", "script": "Hans", "version": 1, "generated": "...",
  "groups": [{ "id": "radical", "en": "Radicals (components)" }, { "id": "number", "en": "Numbers" }],
  "items": [{
    "id": "zh.h.ren", "group": "people", "ja": "人", "ruby": "人[rén]", "kana": "ren", "romaji": "rén",
    "en": "person", "hsk": 1, "strokes": 2, "radical": "人",
    "ex": { "ja": "中国人", "ruby": "中国人[Zhōng guó rén]", "romaji": "Zhōngguó rén", "en": "Chinese (person)" },
    "alt": "zhǎng: to grow (only on polyphones)"
  }]
}
```
- One item = one character (Japanese items are words; the view only needs `ja ruby romaji en group`).
- Radical items (`group: "radical"`) are components such as 亻 氵 讠 扌 口 女 心/忄 with `romaji` =
  the pinyin of the radical's name syllable, `en` = meaning + "(side form of 人)" etc., and `ex` =
  a common character containing it. `hsk` is 0 for radicals.
- `strokes`, `radical`, `alt` are optional extras for the detail view.

## 4. app/data/zh/pinyin.json (the "alphabet", counterpart of kana.json)

```json
{
  "format": 1, "lang": "zh", "version": 1, "generated": "...",
  "tones": [{ "n": 1, "name": "1st tone", "shape": "high, level", "contour": "55", "mark": "ā",
              "ex": { "h": "妈", "r": "mā", "en": "mother" } }, "... n 2, 3, 4, 5 (neutral)"],
  "tables": [{ "id": "initials", "title": "Initials", "cols": 4,
               "rows": [[{ "h": "b", "r": "b", "ex": "八", "py": "bā", "en": "eight", "tts": "八" }, null, "..."]] }],
  "notes": [{ "mark": "不", "en": "bù becomes bú before a 4th tone: 不是 bú shì." }],
  "quizzes": [{
    "id": "tones", "label": "Tones", "mode": "listen", "hint": "...",
    "items": [{ "q": "mā", "a": "mā", "opts": ["mā", "má", "mǎ", "mà"], "tts": "妈", "sub": "mother" }]
  }],
  "words": [{ "k": "你好", "r": "nǐ hǎo", "en": "hello" }]
}
```
- `tables`: generic grids (`rows` of cells, `null` = empty cell, `cols` = columns). Cell `h` is the
  big label, `r` the small label, `tts` what to speak on tap (a character, since TTS cannot speak
  a bare initial), `ex`/`py`/`en` an example. Tables: initials, finals (a/o/e, i-, u-, ü-groups),
  tones, confusable pairs.
- `quizzes`: each one is the data for the existing kana quiz engine (`{ q, a, group?, sub? }`) plus:
  - `mode: "listen"`: do not show `q` before answering; play `tts` (and re-play on tap). Show `q`
    and `sub` in the feedback.
  - `mode: "read"`: show `q` big (as now), options are pinyin or meanings.
  - `opts` (optional): the exact options to offer (the answer is among them). Without `opts`, use
    the current logic (3 random other answers from the set).
  Quizzes: `tones` (single syllables), `tone-pairs` (2-syllable words), `initials` (zh/z/j, ch/c/q,
  sh/s/x, r/l), `u-umlaut` (u vs ü), `finals` (an/ang, en/eng, in/ing), `words` (hanzi word to
  meaning, like the katakana words set).
- `words`: like kana.json `words` (`k` = hanzi, `r` = pinyin, `en`).

## 5. app/data/zh/dict-core.json and dict-rest.json (CC-CEDICT)

Same container and row format as the Japanese dictionary (dictionary/README.md), so
`dictionary/tools/dict-search.mjs` and `app/modules/dict.js` work unchanged:

```json
{
  "format": "japan-trip-dict/1", "lang": "zh", "part": "core|rest",
  "fields": ["id","ja","kana","romaji","en","pos","topic","rank","core","alt","hsk"],
  "count": 4000, "total": 15000, "coreSize": 4000,
  "source": "CC-CEDICT <date>; frequency: ...", "license": "CC BY-SA 4.0", "attribution": "...",
  "rows": [[123456789, "学生", "xue sheng", "xuésheng", "student; schoolchild", "", "people", 57, 1, "學生", 1]]
}
```
- `id`: stable 31-bit FNV-1a hash of the CC-CEDICT key `traditional simplified [pinyin]`.
- `ja`: simplified headword. `kana`: toneless search key (section 1). `romaji`: tone-marked pinyin
  (CC-CEDICT tones, neutral unmarked, no 一/不 sandhi). `en`: up to 3 glosses joined by `"; "`.
- `pos`: mostly `""` (CC-CEDICT has no part of speech); `ctr` for measure words, `name` for proper
  names, `abbr`.
- `topic`: same coarse topic set as the Japanese dictionary. `alt`: traditional form and other
  readings, comma-separated (searchable, not the headword). `hsk`: 1..6 (HSK 3.0 bands, 7 = levels
  7-9) or 0.
- `attribution` must be shown on the Credits screen (text in dictionary/zh/README.md). The check in
  `tools/build-dict-app.mjs` (`edrdg.org`) is Japanese-only; zh files carry the MDBG / CC-CEDICT
  attribution instead.
- Load exactly like Japanese: core first, rest lazily, both only after the switch to Chinese.

## 6. Validation and build

- `node curriculum/zh/tools/build.mjs` writes `app/data/zh/curriculum.json`, `hanzi.json`,
  `pinyin.json` and `curriculum/zh/SUMMARY.md`.
- `node dictionary/zh/tools/build-dict.mjs <cedict.u8> <freq file> <hsk dir>` writes the dict files.
- `node curriculum/zh/tools/validate.mjs` checks all zh files (ids unique and namespaced, every
  lesson id resolves, lesson size 10-15, symmetric reply links, ruby ↔ ja ↔ romaji ↔ kana, every
  syllable is a valid pinyin syllable with one correct tone mark, readings agree with CC-CEDICT,
  no empty fields, no Cyrillic).
