# Mandarin dictionary (app/data/zh/dict-core.json, dict-rest.json)

16,000 entries ranked by usefulness. The first 4,000 are `dict-core.json`; the rest are in `dict-rest.json`, which loads lazily. Both files load only after the user switches the app to Chinese. The row format is defined in curriculum/zh/SCHEMA.md, section 5.

## Sources and licences
- **CC-CEDICT** (https://cc-cedict.org/wiki/), maintained by MDBG: headwords, readings and glosses. Licence: CC BY-SA 4.0.
- **wordfreq** `large_zh` by Robyn Speer: word frequency. The code is Apache-2.0 and the data is CC BY-SA 4.0.
- **complete-hsk-vocabulary**: HSK levels (HSK 3.0 bands, falling back to the 2025 and 2.0 lists). Licence: MIT.

The derived dictionary is a selected, ranked and abridged version of CC-CEDICT and is available under CC BY-SA 4.0.

## Credits text
This app uses CC-CEDICT (https://cc-cedict.org/wiki/), maintained by MDBG and licensed under CC BY-SA 4.0. Word frequencies come from wordfreq by Robyn Speer (data CC BY-SA 4.0). HSK levels come from complete-hsk-vocabulary (MIT).

## Selection
- **Candidates:** a headword qualifies if it is in an HSK list or has a wordfreq Zipf score of at least 2.5.
- **Score:** Zipf plus an HSK bonus (HSK 1–3: +1.5, HSK 4–5: +0.8, HSK 6: +0.4, HSK 7–9: +0.2).
- **Readings:** up to 2 per headword. When the word is in HSK, the reading that matches the HSK list comes first. Proper names are kept only if they are in HSK or very frequent.
- **Glosses:** up to 3 per entry. Senses that only point to variants or other entries ("variant of", "see", "used in", "CL:"), surname senses and slang senses are removed.
- **Family-safe filter:** an entry is removed whenever any of its senses carries a CEDICT register tag (vulgar, derog., offensive, coarse, obscene, pejorative).
- **Pinyin:** tone marks follow CEDICT tones. The neutral tone is unmarked, ü replaces u:, an apostrophe goes before a, o or e inside a word, and no 一/不 sandhi is applied. The search key in `kana` is the toneless syllables separated by spaces, with ü written as v.
- **Ids:** a 31-bit FNV-1a hash of `traditional simplified [pinyin]`.

## Rebuild
Download the three inputs into separate, empty folders under `dictionary/zh/raw/` (these folders are git-ignored), then run:

```
node dictionary/zh/tools/build-dict.mjs dictionary/zh/raw/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz dictionary/zh/raw/wordfreq/large_zh.msgpack.gz dictionary/zh/raw/hsk/complete.json dictionary/zh/out app/data/zh
```
