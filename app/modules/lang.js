export const LANGS = {
  ja: {
    id: 'ja',
    tag: 'ja',
    locale: 'ja-JP',
    label: '日本語',
    short: 'JA',
    name: 'Japanese',
    speaker: 'a Japanese person',
    prefix: 'jt.',
    data: {
      curriculum: 'data/curriculum.json',
      alphabet: 'data/kana.json',
      chars: 'data/kanji.json',
      dictBase: 'data/',
    },
    words: {
      reading: 'romaji',
      Reading: 'Romaji',
      ruby: 'Furigana',
      rubyLong: 'Show furigana (readings above kanji)',
      alphabet: 'Kana',
      chars: 'Signs',
      charsGroup: 'Kanji group',
      hear: 'Staff will say',
      hearHint: 'Staff will say these to you. Train your ear: Study → Listening.',
      searchPhrases: 'Search: bag, fukuro, ふくろ…',
      searchChars: 'Search: exit, chūko, 中古…',
      searchDict: 'English, kana, romaji or kanji: coffee, kōhī, コーヒー',
      searchTry: 'Try English, romaji or kana.',
      native: 'Japanese (as written)',
      translateTo: 'ja',
    },
  },
  zh: {
    id: 'zh',
    tag: 'zh-CN',
    locale: 'zh-CN',
    label: '中文',
    short: 'ZH',
    name: 'Chinese',
    speaker: 'a Chinese speaker',
    prefix: 'jt.zh.',
    data: {
      curriculum: 'data/zh/curriculum.json',
      alphabet: 'data/zh/pinyin.json',
      chars: 'data/zh/hanzi.json',
      dictBase: 'data/zh/',
    },
    words: {
      reading: 'pinyin',
      Reading: 'Pinyin',
      ruby: 'Pinyin',
      rubyLong: 'Show pinyin above the characters',
      alphabet: 'Pinyin',
      chars: 'Characters',
      charsGroup: 'Character group',
      hear: 'You will hear',
      hearHint: 'Lines people will say to you. Train your ear with the lesson quizzes and reply chains.',
      searchPhrases: 'Search: student, xuesheng, 学生…',
      searchChars: 'Search: person, ren, 人…',
      searchDict: 'English, pinyin or hanzi: student, xuesheng, 学生',
      searchTry: 'Try English, pinyin without tones (lv for lü) or hanzi.',
      native: 'Chinese (hanzi)',
      translateTo: 'zh-CN',
    },
  },
};

export const LANG_IDS = Object.keys(LANGS);
export const DEFAULT_LANG = 'ja';
const SAVED_KEY = 'jt.lang';

let active = DEFAULT_LANG;

export const isLang = (id) => Object.prototype.hasOwnProperty.call(LANGS, id);
export function current() { return LANGS[active]; }
export function activeId() { return active; }
export function setActive(id) { active = isLang(id) ? id : DEFAULT_LANG; return LANGS[active]; }

export function tag() { return LANGS[active].tag; }
export const isZh = () => active === 'zh';

export function savedLang(storage = globalThis.localStorage) {
  try { const v = storage?.getItem(SAVED_KEY); return isLang(v) ? v : DEFAULT_LANG; } catch { return DEFAULT_LANG; }
}
export function saveLang(id, storage = globalThis.localStorage) {
  try { storage?.setItem(SAVED_KEY, id); } catch { }
}

export function dataFiles(id) {
  const d = LANGS[id].data;
  return [d.curriculum, d.alphabet, d.chars, d.dictBase + 'dict-core.json', d.dictBase + 'dict-rest.json'];
}
