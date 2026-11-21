# Mandarin course: open questions

Things I was unsure of, or decisions the builder / owner may want to revisit. Date: 2026-11-21.

## Contract (SCHEMA.md)

1. **你好 in the schema example.** SCHEMA shows `你好[nǐ hǎo]` with `romaji` `Nǐ hǎo!`, but also says one bracket
   = one pinyin word (joined in `romaji`), which would give `Nǐhǎo!`. The data writes greetings as two runs,
   `你[nǐ]好[hǎo]`, so `romaji` is `Nǐ hǎo!` as in the example. Please correct the example in SCHEMA if you agree.
2. **Erhua.** 儿 after a syllable is a syllable of its own, `r`: `哪儿[nǎ r]`, `一点儿[yì diǎn r]`. This keeps
   "syllables = characters" and gives `nǎr`, `yìdiǎnr` in `romaji`. The ruby view shows `r` over 儿. Acceptable?
3. **Explicit readings** `{138|yāo sān bā}` keep their spaces in `romaji` (phone numbers read digit by digit);
   `kana` keeps them as separate words.
4. **Capitalization.** Only items with sentence punctuation (。？！，) are capitalized in `romaji`; slot words and
   phrases (`shǒujī`, `yì bēi chá`) stay lowercase.
5. **Hanzi ids** are `zh.h.<pinyin><tone>-<code point>` (`zh.h.ren2-4eba`), not `zh.h.ren` as in the schema
   example, so that ids never collide (他 / 她 / 它 are all tā) and never change when characters are added.
6. **pinyin.json extras.** Quiz items carry `py` (the reading, for validation) and some carry `group`. Quiz ids
   beyond the schema list: `tone-marks` (read), `u-umlaut-read` (read; options u / ü / none), `words-listen`.
7. **hanzi `hsk`** = the lower of the HSK 2.0 and HSK 3.0 levels of the first HSK word containing the character
   (HSK 3.0 band 1 is large, so 276 characters are level 1). Strokes are not included: no stroke-count source
   in the repo.

## Readings

8. **CC-CEDICT is inconsistent on light tones.** Choices made (listed in `validate.mjs` `REVIEWED` where they
   differ from CEDICT):
   - direction complements always neutral: 进来 jìn lai, 出来 chū lai, 出去 chū qu, 进去 jìn qu, 上来 shàng lai,
     下去 xià qu, 回来 huí lai, 回去 huí qu, 过去 guò qu, 过来 guò lai, 起来 qǐ lai;
   - locatives with 面 in full tone: 里面 lǐ miàn, 外面 wài miàn, 上面 shàng miàn, 下面 xià miàn,
     前面 qián miàn, 后面 hòu miàn; but 左边 zuǒ bian, 右边 yòu bian as in CEDICT, and 这边 zhè biān, 那边 nà biān;
   - 知道 zhī dào, 打算 dǎ suàn, 关上 guān shàng (CEDICT), 东西 dōng xi (thing), 时候 shí hou.
   A native-speaker pass over light tones would be worth it; textbooks differ here too.
9. **这里 / 那里.** 这里 is written zhè lǐ (CEDICT); 那里 is avoided in sentences (那儿 used) because CEDICT only has
   nà li. 哪里 nǎ lǐ is used in 哪里哪里 (spoken ná li ná li, noted).
10. **那个 as a filler** is written nà ge (CEDICT has no nèi ge); the note says it is often said nèige.
11. **一 in numbers and names** keeps yī: 一号线 yī hào xiàn, 星期一, 一月, 十一, 第一, phone numbers (yāo via `tts`).
    一 before 个 is yí (个 was gè). The validator enforces yí / yì by the next syllable.
12. **钥 yào** (only in 钥匙) is not a single-character reading in CEDICT (which has yuè); reviewed.
13. **Three 3rd tones in a row** (我也很好, 请给我, 往左拐): the notes give the common spoken result
    (wó yé hěn hǎo, qíng géi wǒ, wáng zuó guǎi). Real speech depends on phrasing; the notes say "usually".

## Content

14. **Names.** The learner's sample name is 安娜 Ānnà; the sample surname is 王 Wáng. The app could let users swap
    these for their own name.
15. **Payment.** WeChat / Alipay (微信 / 支付宝) are named because paying by phone is the normal case in China;
    the brand names are kept as plain nouns.
16. **Count.** Exactly 1000 items; Z15-Z22 have fewer lessons (3 and 2) to stay within the limit. If the limit is
    raised, the natural additions are a fourth lesson for Z15-Z20 (e.g. school life, a doctor's visit, a hobby
    dialogue, invitations, messaging etiquette) and more HSK 4 material.
17. **CC-CEDICT location.** The validator reads `dictionary/zh/raw/cedict/*.gz`, which is untracked raw data from
    the dictionary agent. On a clean checkout without it, reading checks are skipped (warning, not error); set
    `CEDICT_DIR` to a folder with the CC-CEDICT file to run them.
