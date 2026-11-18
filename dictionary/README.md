# Offline Japanese-English learner dictionary

A compact, ranked Japanese-English dictionary for the trip PWA: **22,667 entries** (all JMdict
"common" words minus junk, plus 12 hand-picked travel words), searchable by English, kana, romaji
and kanji, fully offline. The **4,000 most useful entries for a tourist + beginner form a "core"
tier** that ships as its own small file.

Every gloss, reading and part of speech comes from **JMdict** (EDRDG). Nothing was written by hand
or generated: the tools here only select, rank, abridge and tag JMdict data.

## Files

| File | Entries | Raw | gzip | Purpose |
|---|---|---|---|---|
| `out/dict-core.json` | 4,000 (rank 1-4000) | 437 KB | 166 KB | core tier, load first |
| `out/dict-rest.json` | 18,667 (rank 4001-22667) | 2.03 MB | 766 KB | everything else, load after |
| `out/dict.json` | 22,667 | 2.46 MB | 930 KB | the same data in one file (core rows + rest rows) |

`dict-core.json` + `dict-rest.json` (rows concatenated in that order) is exactly `dict.json`; the
validator checks this. Use either the pair or the single file.

### Format

Each file is minified JSON:

```json
{
  "format": "japan-trip-dict/1", "part": "core|rest|full",
  "fields": ["id","ja","kana","romaji","en","pos","topic","rank","core","alt"],
  "count": 4000, "total": 22667, "coreSize": 4000,
  "source": "JMdict (EDRDG) via jmdict-simplified 3.6.2, dictDate 2026-11-16; ...",
  "license": "CC BY-SA 4.0",
  "attribution": "This app uses the JMdict/EDICT dictionary files (...) ...",
  "rows": [[1049180,"コーヒー","コーヒー","kōhī","coffee","n","drink",95,1,"珈琲"], ...]
}
```

Rows are arrays (about 40% smaller than objects); the key list is in `fields`. Turning a row into
an object: `Object.fromEntries(d.fields.map((f, i) => [f, row[i]]))`. Rows are sorted by `rank`.

| Field | Type | Meaning |
|---|---|---|
| `id` | int | JMdict entry id (`ent_seq`), unique; links back to JMdict |
| `ja` | string | headword: the most common written form; kana when JMdict marks the word "usually written in kana" (`uk`) or no common kanji form exists. Full-width ASCII is folded (`Ｔシャツ` becomes `Tシャツ`) |
| `kana` | string | reading in kana (hiragana or katakana as in JMdict) |
| `romaji` | string | modified Hepburn with macrons, the app's convention (PLAN.md 1.6); see Romaji below |
| `en` | string | up to 3 English glosses from the first 1-2 senses, joined with `"; "` (a JMdict gloss can itself contain `;`) |
| `pos` | string | short part of speech, up to 3 comma-separated: `n`, `v1`, `v5`, `vk`, `vs` (noun that takes suru, or suru verb), `adj-i`, `adj-na`, `adj` (no/pre-noun/taru), `adv`, `pron`, `prt`, `conj`, `int`, `exp`, `ctr`, `num`, `pref`, `suf`, `aux` |
| `topic` | string | coarse topic: `food`, `drink`, `shop`, `money`, `transport`, `place` (directions, locations), `hotel`, `health` (incl. emergency), `body`, `time`, `number`, `people` (family, children), `weather`, `nature`, `sight` (sightseeing, culture), `tech` (photo, electronics), `clothes`, `phrase` (greetings, interjections), `grammar` (particles, pronouns, question words, conjunctions), `leisure` (sports, games), `society` (politics, law, economy, news), `general` |
| `rank` | int | 1 = most useful; sort search results by it |
| `core` | 0/1 | 1 when `rank <= coreSize` (4000) |
| `alt` | string | other searchable forms, comma-separated: other non-rare kanji spellings and other common readings (`コーヒー` has `珈琲`). Not shown as headword |

## Licence and attribution (must be shown in the app)

JMdict is the property of the Electronic Dictionary Research and Development Group (EDRDG) and is
licensed under **Creative Commons Attribution-ShareAlike 4.0** (CC BY-SA 4.0). This dictionary is a
modified (selected, ranked, abridged) version of JMdict, so **these data files are CC BY-SA 4.0
too**. The app code does not have to be open source. Obligations from the EDRDG licence
(https://www.edrdg.org/edrdg/licence.html):

1. **Acknowledge in the app, on a separate screen reachable from a menu** (an About / Credits
   screen). A start-up or launch screen alone is not enough.
2. **Link** to the JMdict project page and to the EDRDG licence page. Links are enough for an app.
3. **Share-alike:** anyone redistributing these files, or a modified version, must keep them under
   CC BY-SA 4.0 (or a compatible licence), with attribution.
4. **Do not claim copyright** over the dictionary material.
5. **Keep the data current:** the licence requires "a procedure for regular updating of the data
   from the most recent versions available". For this app, rebuild (see below) before each release
   and at least before the trip. The data date is stored in each file's `source` field.
6. Commercial use is allowed. Donations to EDRDG are welcome but not required.

Attribution text to show on the About / Credits screen. It follows EDRDG's sample wording, and the
same text is embedded in every file as `attribution`:

> This app uses the [JMdict/EDICT](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project)
> dictionary files. These files are the property of the
> [Electronic Dictionary Research and Development Group](https://www.edrdg.org/), and are used in
> conformance with the Group's [licence](https://www.edrdg.org/edrdg/licence.html). The dictionary
> data in this app is a selected, ranked and abridged version of JMdict and is available under
> [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
> JMdict version: dictDate 2026-11-16.

The JSON conversion used as input is jmdict-simplified (https://github.com/scriptin/jmdict-simplified,
data CC BY-SA 4.0, same EDRDG terms), so no extra attribution is required beyond the above. A credit
line is still a nice touch.

## How the entries were selected and ranked

Inputs (downloaded to `dictionary/dl/`, which is gitignored; treated as data only, parsed by our own
scripts, never executed):

- `jmdict-eng-common-3.6.2.json`: jmdict-simplified, English, "common" entries only (22,661 entries).
- `JMdict_e.gz`: the original EDRDG XML, used only for the **priority tags** (`news1/2`, `ichi1/2`,
  `spec1/2`, `gai1/2`, `nfXX`). jmdict-simplified keeps only a boolean "common" flag, so the tags are
  joined back by JMdict id.
- `jmdict-eng-3.6.2.json`: full jmdict-simplified, used only for the 12 ids in `tools/overrides.json` `add`.

**Filtering.** Senses tagged archaic, obsolete, rare, obscure, vulgar or X-rated are removed.
Entries with no remaining sense are dropped (6 of 22,661). Search-only, rare, outdated and
irregular kanji/kana forms (`sK rK oK iK sk rk ok ik`) are never used as headword or reading.

**Headword and glosses.** If the first kept sense is "usually kana" (`uk`), the headword is the
common kana form. Otherwise it is the first common, regular kanji form. Senses restricted to other
spellings or readings are skipped. Glosses: 2 from sense 1 plus 1 from sense 2 (3 from sense 1 if
there is no usable sense 2). Sense 2 is skipped when it is slang, colloquial, derogatory, dated,
historical or idiomatic. Glosses after the first that are over 48 characters are dropped.

**Usefulness score** (`tools/topics.mjs`), higher = better:

- *Frequency proxy:* `nfXX` newspaper rank (nf01 = 40 ... nf48 = 1). The newspaper ranks do not cover
  particles, auxiliaries, most loanwords or words written in kana (する, は, コーヒー have no nf), so a
  missing or weak rank is replaced by the best of: ichi1 (kana word 30, kanji word 22), spec1 (25/18),
  gai1 22, spec2 10, gai2 6.
- *List bonuses:* ichi1 +25 (the Ichimango basic-vocabulary list), spec1 +14 / spec2 +8, gai1 +14
  (common loanword).
- *Topic:* travel topics food/drink/shop/money/transport/health +14, place/hotel +12, grammar +18,
  phrase +22, time/number/people/weather/tech/clothes/body +10, sight +8, nature +4, leisure 0,
  general 0, **society (politics, law, economy, military, news) -22**.
- *Part of speech:* verbs +10, i-adjectives +16, na-adjectives +6, adverbs +2, interjections and
  counters +4, particles/auxiliaries/copula +10 extra, conjunctions +3, pronouns +6,
  affix-only -6, expressions -4 (except phrases).
- *Basic layer:* +10 for one-kanji-plus-okurigana verbs and adjectives on the ichi1 list (書く, 待つ,
  好き, 古い). JMdict tags cannot tell these from rarer verbs; their shape can.
- *Penalties:* four-character idioms -20, proverbs/quotations -15, poetic -12, historical -10,
  derogatory -15, dated -8, specialist field on the first sense (baseball, sumo, law, finance,
  physics, Buddhism, ...) -10, abstract nouns (-tion, -ity, -ism ... with no topic) -6, all-kanji
  compounds of 4+ characters -8, readings over 9 kana -3.

Topics come from English keyword rules on the first sense (a first-gloss hit, or two later hits),
JMdict field tags and part of speech. They are **coarse**: in the spot check below about 1 in 5
core topics was debatable.

**Overrides** (`tools/overrides.json`, every change documented there):

- `core`: 52 JMdict ids forced into the core tier. 46 are travel words the score left outside core
  (店, ご飯, 寿司, 出口, 入口, お釣り, コンビニ, チェックイン, ...), plus 交番, 腕時計, 箸, and the beginner
  basics 好き, 上手, 下手.
- `add`: 12 travel words that JMdict does not mark "common", taken from the full JMdict and forced
  into core: カフェラテ, ミルクコーヒー, カフェオレ, お湯, 菓子パン, レジ袋, 指定席, 自由席, 助けて, 絆創膏,
  入場料, 充電器.
- `demote`: 生る "to bear fruit" (score -30). JMdict tags it nf07 while 成る "to become" has nf34;
  without this a search for *naru* would list "to bear fruit" first.

Forced entries get a score just above the core cutoff, so they replace the weakest regular core
entries and core stays exactly 4,000.

### Distribution

| topic | core | all |
|---|---|---|
| general | 1588 | 13861 |
| grammar | 250 | 400 |
| people | 240 | 805 |
| time | 238 | 734 |
| transport | 204 | 540 |
| place | 190 | 661 |
| food | 169 | 516 |
| health | 167 | 461 |
| sight | 108 | 452 |
| body | 106 | 360 |
| number | 100 | 445 |
| hotel | 97 | 312 |
| shop | 94 | 297 |
| money | 86 | 296 |
| phrase | 69 | 133 |
| weather | 65 | 216 |
| nature | 61 | 410 |
| clothes | 58 | 136 |
| drink | 56 | 180 |
| tech | 54 | 258 |
| leisure | 0 | 311 |
| society | 0 | 883 |

`general` in core is mostly basic verbs and adjectives (書く, 悲しい, 古い, ...), which carry no topic.

## Romaji

Romaji comes from the app's own converter: `kanaToHepburn` in `app/modules/text.js`, imported by
`tools/romaji.mjs`. It is therefore the same convention as the rest of the app (PLAN.md 1.6):
コーヒー kōhī, 東京 tōkyō, 切符 kippu, 抹茶 matcha, 問屋 ton'ya, 氷 kōri. Three word-level fixes the
kana-only converter cannot know about (54 entries in total):

- godan -u verbs keep the final u: 思う omou (not omō), 吸う suu, 迷う mayou;
- particle は is wa: は wa, へ e, こんにちは konnichiwa, こんばんは konbanwa, では dewa, には niwa;
- spelled-out letters split on `・` become words: シー・エム shī emu.

Multi-word expressions are written without spaces, as the app converter does (責任を持つ
sekinin'omotsu). **Known limitation**, shared with the app converter: it does not know morpheme
boundaries inside nouns, so a few compounds get a macron where strict Hepburn has two vowels
(安売り yasūri for yasuuri, 湖 mizūmi). Search folds macrons anyway, so typing either finds the word.

## Loading and search (recommendation for the app)

Recommended: **two files, lazy-loaded after first paint, cached separately by the service worker.**

1. After the app shell renders (e.g. `requestIdleCallback`, or when the dictionary screen opens),
   fetch `dict-core.json` (166 KB gzip) and build the index. Search works on core immediately.
2. Then fetch `dict-rest.json` (766 KB gzip) and add it to the index in 500-row chunks between
   frames (or do both steps in a Web Worker).
3. In the service worker give both files their own cache (e.g. `dict-v<dictDate>`), separate from
   the app-shell precache. A shell update then does not re-download the dictionary, and a dictionary
   update (licence: keep data current) does not touch the shell. Use cache-first plus a
   version bump, not network-first.

`tools/dict-search.mjs` is a dependency-free reference search to copy into the app. Inject the app's
`normalize()`:

```js
import { normalize } from './text.js';
import { createDictIndex } from './dict-search.js';
const idx = createDictIndex(core.fields, core.rows, normalize);
for (let i = 0; i < rest.rows.length; i += 500) idx.add(rest.rows.slice(i, i + 500)); // in idle chunks
idx.search('kohi', 30); // [{ row, tier }]: tier 0 exact, 1 prefix, 2 English word prefix, 3 Japanese substring
```

It matches romaji and readings (macrons and long vowels folded: *kohi*, *koohii* and *kōhī* all find
コーヒー), English glosses (whole gloss, prefix, or the start of any word: *rice* finds "cooked rice"),
exact kanji or kana (`駅`, `ぎゅうにゅう`), alt spellings (`珈琲`), and Japanese substrings. Results
are sorted by match tier, then rank.

Measured in Node 20 on the build laptop (`node dictionary/tools/bench-search.mjs`, 30 queries, all
22,667 entries). The phone estimate is 5x:

| step | laptop | phone (est.) |
|---|---|---|
| `JSON.parse` full file | 27 ms | ~135 ms |
| index build, core only | 36 ms | ~180 ms |
| index build, one 500-row chunk of rest | ~5 ms | ~25 ms |
| index build, everything at once | 222 ms | ~1.1 s (avoid on the main thread; use chunks) |
| query, average | 3.9 ms | ~19 ms |
| query, worst (`ticket`, `k`) | 4.8 ms | ~24 ms |

All queries are well under the 50 ms target, without a prebuilt index. Debounce input by about
120 ms so fast typing does not run every keystroke.

## Validation and checks

- `node dictionary/tools/validate-dict.mjs` (exit 1 on error) checks:
  - schema and field types;
  - unique ids;
  - rank 1..N contiguous and core flag consistent;
  - core + rest == full;
  - kana is pure kana;
  - romaji alphabet, and romaji re-derived from the kana with the same converter;
  - romaji accepted by the app's `romajiMatchesKana`;
  - attribution and licence present in every file;
  - no Cyrillic in any text file under `dictionary/`;
  - size budgets (core < 600 KB raw, full < 4 MB raw / 1.5 MB gzip).

  Current result: **OK**.
- `node dictionary/tools/check-travel.mjs [dl/JMdict_e.gz]` audits **216 everyday travel words**
  (`tools/travel-words.mjs`: food/drink, shop/money, transport/directions, hotel, health/emergency,
  family/children, time/numbers, weather/sightseeing, photo/electronics, courtesy). With the XML it
  also says whether a missing word exists in the full JMdict. Current result: **216/216 present, all
  in core**.

  Before the overrides: 158 in core, 46 present but outside core, and 12 not in JMdict-common at all
  (all 12 are in the full JMdict). The 12 are カフェラテ, ミルクコーヒー, カフェオレ, お湯, 菓子パン, レジ袋,
  指定席, 自由席, 助けて, 絆創膏, 入場料, 充電器. Note: お湯 is a separate JMdict entry from 湯, which is
  common.
- `node dictionary/tools/spot-check.mjs [seed]` prints a reproducible random sample (50 core + 50 rest).

### Spot check (100 random entries, seed 20261118, final build)

No data errors found: headwords, readings, glosses and parts of speech match JMdict, and romaji is
correct (凍る kōru, 延々 en'en, 曜日 yōbi). Odd but not wrong:

- **Debatable topics** (keyword heuristic): 手伝う "to help" → health, 構える / 蓄える "store" → shop,
  密接 "close" → place, 導く "guide" → people, ビリビリ "to pieces" / さすが / 両者 / 四季 "four
  seasons" → number, 幼稚園 → time, 井戸 "water well" / 水害 → drink, 土足 → body, 日本画 → people,
  遺品 → place. Treat `topic` as a hint for filtering and boosting, not a classification.
- **Rank quirks from JMdict's own tags:** some kana adverbs and verbs with strong tags rank very high
  (耳より "welcome (news)" #2, またがる #25, かねて #64). Some common words land outside core (経験 "experience"
  #6082, 両替 is core only through the override). News words that slip past the society penalty
  stay in or near core (人民 "the people" #1332, 武装 "armament" #4224).
- **Glosses are JMdict's**, including scientific names (トマト "tomato (Solanum lycopersicum)") and
  occasional surprising second senses (寒い "cold (e.g. weather); uninteresting (esp. joke); lame").
  Slang/colloquial second senses are skipped (before that fix 粉 read "flour; meal; heroin").

## Rebuilding

Requires Node 20+. No npm packages.

```sh
# 1. download into a fresh dictionary/dl/ (data only; never execute anything from it)
#    release page: https://github.com/scriptin/jmdict-simplified/releases/latest
#      jmdict-eng-common-<ver>.json.tgz  and  jmdict-eng-<ver>.json.tgz  (extract with tar -xzf)
#    EDRDG: http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz  (keep gzipped)
# 2. build (writes dictionary/out/*.json; review files go to dictionary/build/, gitignored)
node dictionary/tools/build-dict.mjs dictionary/dl/jmdict-eng-common-<ver>.json dictionary/dl/JMdict_e.gz \
     --full dictionary/dl/jmdict-eng-<ver>.json [--core 4000]
# 3. check
node dictionary/tools/validate-dict.mjs
node dictionary/tools/check-travel.mjs dictionary/dl/JMdict_e.gz
node dictionary/tools/bench-search.mjs
```

`dictionary/build/ranked-debug.tsv` lists every entry with its score, the score parts, and the
priority tags, for tuning `tools/topics.mjs`. `build-report.json` lists dropped, forced and demoted ids.

## Tools

| File | Role |
|---|---|
| `tools/build-dict.mjs` | the builder |
| `tools/jmdict-priority.mjs` | reads priority tags from the EDRDG XML (regex parse, no entity expansion) |
| `tools/topics.mjs` | topic rules and usefulness score |
| `tools/romaji.mjs` | app converter plus the word-level fixes |
| `tools/overrides.json` | forced core / added / demoted ids, with reasons |
| `tools/validate-dict.mjs` | validator |
| `tools/travel-words.mjs`, `tools/check-travel.mjs` | travel vocabulary audit |
| `tools/dict-search.mjs` | reference search (copy into the app) |
| `tools/bench-search.mjs` | search benchmark |
| `tools/spot-check.mjs` | random sample for review |
