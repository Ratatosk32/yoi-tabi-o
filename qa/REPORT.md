# QA report (run on commit b3ff174)

Full pass/fail tables with actual outputs: `qa/out/tables.md`. Screenshots: `qa/shots/`.
Rerun: `cd qa; node selfcheck-oracle.mjs; node compare-numbers.mjs; node unit.mjs; node e2e.mjs [pixel|iphone]; node gen-tables.mjs`.

## Summary
- Number oracle (written before reading numbers.js): 101 reference readings; 62 031 comparisons with the app (control set 8/8, 1..10000, 20 000 random up to 250 000, times 0:00-24:59, dates, counters つ/人/枚/本/個): no reading errors. Accepted variants: 0 → ゼロ/ぜろ, 7人 → ななにん/しちにん.
- Unit: 68/78 (all 10 failures are bugs below). Day boundaries in 6 time zones: all pass.
- E2E: 88/98 on Pixel 412x915 and iPhone 430x932 (iOS UA). Offline, search, favourites, show card, kana quiz, trainers, SW, launchers, export/import work.

## Bugs
- **B1 Medium (data loss)** store.js:85-88 mergeArrays: restoring a backup with `favs: []` wipes current favourites (same for history). Fix: `if (!b.length) return a;` merge by id only when both arrays hold objects with id.
- **B2 Medium** srs.js:61 buildSession: same phrase twice in a row in two modes (ja2ru then ru2ja), first card gives away the second; limit 12 new = 6 phrases. Fix: ja2ru on day 1, ru2ja later, or spread modes.
- **B3 Medium** ui.js:97, view-show.js:29: allergy card with ≥8 allergens overflows (8: 698/655 px at 412x915; 12: 793/655), the request 「入っているかどうか確認していただけますか」 is hidden. Fix: shrink until it fits; second sentence 「これらが入った料理は食べられません」 instead of repeating the list.
- B4 Low view-study.js:352: switching price range keeps the old price (numState.n not reset).
- B5 Low view-study.js:328-332 (and :385 time trainer): pressing Enter twice counts the answer twice.
- B6 Low store.js:61-63 importAll: no type checks; data:null shows a raw JS error toast.
- B7 Low srs.js:37-46 grade: box null → due "NaN-NaN-NaN"; box "3" concatenates to "31".
- B8 Low srs.js:74 stats: box 7 creates 7 buckets.
- B9 Low srs.js:80 studyWeek: future start date shows "День -6".
- B10 Low text.js:74 normalize: kohii/koohii/takushii/raamen don't match kōhī/takushī/rāmen (only ō/ū folded).
- B11 Trivial diag.html: 404 /favicon.ico.
- B12 Trivial numbers.js:170 dateReading accepts 2/30, 4/31.
- B13 Trivial numbers.js parseDigits: "12万8千" → NaN.
- B14 Trivial launchers.js:69: desktop gets an Android intent:// link.
- B15 Trivial ui.js:114: Esc stops closing the card after any other key ({once:true}).
- B16 Trivial: allergy card at 412 px ends with a lone 「か。」 line.

## Notes
- Backup merge: incoming progress always overwrites current, even if older.
- store.get() returns a cached reference (harmless now).
- tts.speak() never resolves if the engine sends neither onend nor onerror.
- Check on phone: 明日, 今日, 〇〇行き readings by TTS.
- After stripping 〇〇 placeholders some phrases sound truncated: 「次は、です」, 「この電車は、に行きますか」.
- yenMixed(1000) gives 「1千円」; price tags write 「1,000円」.
