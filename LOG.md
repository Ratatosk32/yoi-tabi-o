# Work log

- Build start: Wed Nov 18 18:04:00 CEST 2026
- 18:04 Environment: Node 20.18.1, git 2.32, Chrome present, no puppeteer → e2e via CDP (`node --experimental-websocket`). wanakana 5.3.1 downloaded into app/vendor (official minified build from the package, sha256 78197931…bf63).
- 18:05–18:12 Pure modules: numbers (万, sound changes, ふん/ぷん, dates, counters), srs (Leitner 0/1/2/4/7), store (localStorage + export/import), text (furigana, search, kana→Hepburn), tts, launchers.
- 18:12–18:16 Content: 256 phrases (184 say, 53 hear, 13 patterns, 6 cards), 45 katakana words, 106 kanji. Builder and validator. False alarms of the romaji check at word boundaries (を+お) removed by a strict comparison without vowel merging. Manual second pass: found 十分 → TTS override じゅっぷん.
- 18:16–18:24 UI: shell, 5 tabs, SW, manifest, diag.html. Icons (headless Chrome).
- 18:20 Addition: iPhone 16 Plus (Safari): Apple meta tags, safe areas, platform-specific launchers, iPhone column in diag, backup reminder. CSS fully tokenised for the future design (design/ untouched).
- 18:25 Mistake: `git add -A` picked up design/ and qa/ (other agents' folders). Commit undone (soft reset); later commits use explicit paths only; `.venv/` added to .gitignore.
- 18:26–18:30 Unit tests (21) and e2e (CDP): 412x915 + 430x932, real offline (server stopped). First run 69/74 — bugs in the test itself (state shared between viewports), fixed → 74/74. Japanese line breaking (line-break: strict, auto-phrase).
- 18:30–18:33 "My phrases" (romaji→kana via wanakana, particles wa/o/e → は/を/へ). README, REVIEW.md (28 items).
- Final check: `npm test` 21/21, `npm run validate` 0 errors, `npm run e2e` 78/78 PASS.
- End: Wed Nov 18 18:33:42 CEST 2026
- 18:36–18:50 Proofreading: all 38 fixes.json edits applied (tools/apply-fixes.mjs), +15 phrases and +9 kanji (incl. 各駅停車), "heard → reply" links (24→35) in data, validator and UI; REVIEW.md updated (10 closed, 18 open). SW v2. Tests: 23/23, validate OK, e2e 82/82.
- End of stage: Wed Nov 18 18:39:44 CEST 2026
- Later stages: design integration (paper & ink, light/dark), QA fixes B1–B16, English-only app (data `en`, UI, migration of stored progress), English-only repository (tools/check-no-cyrillic.mjs). Details in git log.
- Curriculum integration: curriculum.json (1003 items, 79 lessons) is the phrase source; SW v8. Study = Today (morning: reviews → pretest → lesson → quiz; evening: today's items + prices), Lessons (units, progress, unlock at 80 % box 2+, test out 8/10), retrieval-first cards (Forgot / Hard / Knew), hear items audio-only, lesson quizzes, reply chains (3 s window, scene badges), pre-flight and situation runs, kana look-alikes with response time, romaji shown in week 1 then tap-to-show. Not built yet: alternating ja-JP voices, full kana diagnostic with row skipping, tile-building pattern quiz. Calendar-reminder screen: not planned (user decision).
