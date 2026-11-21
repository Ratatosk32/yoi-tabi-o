import { addTone, splitTone, joinWord } from '../tools/lib.mjs';

const TONE_NAMES = ['1st tone', '2nd tone', '3rd tone', '4th tone'];
const cell = (h, r, ex, py, en) => ({ h, r, ex, py, en, tts: ex });

const tones = [
  { n: 1, name: '1st tone', shape: 'high, level', contour: '55', mark: 'ā', ex: { h: '妈', r: 'mā', en: 'mother' } },
  { n: 2, name: '2nd tone', shape: 'rising, like a surprised "what?"', contour: '35', mark: 'á', ex: { h: '麻', r: 'má', en: 'hemp; numb' } },
  { n: 3, name: '3rd tone', shape: 'low, dipping; in speech mostly just low', contour: '214', mark: 'ǎ', ex: { h: '马', r: 'mǎ', en: 'horse' } },
  { n: 4, name: '4th tone', shape: 'falling sharply, like a firm "no!"', contour: '51', mark: 'à', ex: { h: '骂', r: 'mà', en: 'scold' } },
  { n: 5, name: 'neutral tone', shape: 'short and light, no mark', contour: '', mark: 'a', ex: { h: '吗', r: 'ma', en: 'question particle' } },
];

const tables = [
  { id: 'initials', title: 'Initials', cols: 4, rows: [
    [cell('b', 'soft p', '八', 'bā', 'eight'), cell('p', 'p with a puff', '跑', 'pǎo', 'run'), cell('m', 'm', '妈', 'mā', 'mother'), cell('f', 'f', '飞', 'fēi', 'fly')],
    [cell('d', 'soft t', '大', 'dà', 'big'), cell('t', 't with a puff', '他', 'tā', 'he'), cell('n', 'n', '你', 'nǐ', 'you'), cell('l', 'l', '来', 'lái', 'come')],
    [cell('g', 'soft k', '哥', 'gē', 'older brother'), cell('k', 'k with a puff', '看', 'kàn', 'look'), cell('h', 'rough h, as in Scottish "loch"', '好', 'hǎo', 'good'), null],
    [cell('j', 'like "jee", tongue tip down', '鸡', 'jī', 'chicken'), cell('q', 'like "chee", tongue tip down', '七', 'qī', 'seven'), cell('x', 'like "shee", tongue tip down', '西', 'xī', 'west'), null],
    [cell('zh', 'like "j" in "jar", tongue curled back', '中', 'zhōng', 'middle'), cell('ch', 'like "ch" in "church", tongue curled back', '吃', 'chī', 'eat'), cell('sh', 'like "sh", tongue curled back', '是', 'shì', 'be'), cell('r', 'like the "s" in "pleasure", curled back', '人', 'rén', 'person')],
    [cell('z', 'like "ds" in "beds"', '字', 'zì', 'character'), cell('c', 'like "ts" in "cats", with a puff', '菜', 'cài', 'dish'), cell('s', 's', '三', 'sān', 'three'), null],
    [cell('y', 'y (spelling for i- at the start)', '有', 'yǒu', 'have'), cell('w', 'w (spelling for u- at the start)', '我', 'wǒ', 'I'), null, null],
  ] },
  { id: 'finals-simple', title: 'Finals: simple and compound', cols: 4, rows: [
    [cell('a', 'as in "father"', '他', 'tā', 'he'), cell('o', 'as in "or" (after b p m f)', '波', 'bō', 'wave'), cell('e', 'like "uh", from the throat', '饿', 'è', 'hungry'), cell('er', 'like "are" (American)', '二', 'èr', 'two')],
    [cell('ai', 'as in "eye"', '爱', 'ài', 'love'), cell('ei', 'as in "day"', '黑', 'hēi', 'black'), cell('ao', 'as in "now"', '好', 'hǎo', 'good'), cell('ou', 'as in "go"', '口', 'kǒu', 'mouth')],
    [cell('an', 'as in "fun" but open', '三', 'sān', 'three'), cell('en', 'as in "taken"', '人', 'rén', 'person'), cell('ang', 'as in "long" but with a', '忙', 'máng', 'busy'), cell('eng', 'as in "sung"', '冷', 'lěng', 'cold')],
    [cell('ong', 'as in German "Lunge"', '红', 'hóng', 'red'), cell('-i (zh ch sh r)', 'a buzzing "r"-like vowel', '吃', 'chī', 'eat'), cell('-i (z c s)', 'a buzzing "z"-like vowel', '字', 'zì', 'character'), null],
  ] },
  { id: 'finals-i', title: 'Finals starting with i', cols: 4, rows: [
    [cell('i', 'as in "see" (yi alone)', '衣', 'yī', 'clothes'), cell('ia', '"ya"', '家', 'jiā', 'home'), cell('ie', '"ye" as in "yes"', '谢', 'xiè', 'thank'), cell('iao', '"yow"', '小', 'xiǎo', 'small')],
    [cell('iu', '"yo" (written iu, from iou)', '六', 'liù', 'six'), cell('ian', '"yen"', '天', 'tiān', 'sky'), cell('in', 'as in "in"', '心', 'xīn', 'heart'), cell('iang', '"yahng"', '想', 'xiǎng', 'think')],
    [cell('ing', 'as in "sing"', '星', 'xīng', 'star'), cell('iong', '"yong"', '熊', 'xióng', 'bear'), null, null],
  ] },
  { id: 'finals-u', title: 'Finals starting with u', cols: 4, rows: [
    [cell('u', 'as in "moon"', '五', 'wǔ', 'five'), cell('ua', '"wa"', '花', 'huā', 'flower'), cell('uo', '"wo"', '我', 'wǒ', 'I'), cell('uai', '"why"', '快', 'kuài', 'fast')],
    [cell('ui', '"way" (written ui, from uei)', '对', 'duì', 'right'), cell('uan', '"wan"', '晚', 'wǎn', 'late'), cell('un', '"won" (written un, from uen)', '春', 'chūn', 'spring'), cell('uang', '"wahng"', '黄', 'huáng', 'yellow')],
    [cell('ueng', '"weng" (only as weng)', '翁', 'wēng', 'old man'), null, null, null],
  ] },
  { id: 'finals-v', title: 'Finals with ü', cols: 4, rows: [
    [cell('ü', 'say "ee" with rounded lips', '女', 'nǚ', 'woman'), cell('üe', '"ü" + "e" (written ue after j q x y)', '学', 'xué', 'study'), cell('üan', '"ü" + "an" (written uan after j q x y)', '远', 'yuǎn', 'far'), cell('ün', '"ü" + "n" (written un after j q x y)', '云', 'yún', 'cloud')],
  ] },
  { id: 'tones', title: 'Tones', cols: 4, rows: [
    [cell('mā', '1', '妈', 'mā', 'mother'), cell('má', '2', '麻', 'má', 'hemp; numb'), cell('mǎ', '3', '马', 'mǎ', 'horse'), cell('mà', '4', '骂', 'mà', 'scold')],
    [cell('bā', '1', '八', 'bā', 'eight'), cell('bá', '2', '拔', 'bá', 'pull out'), cell('bǎ', '3', '把', 'bǎ', 'hold'), cell('bà', '4', '爸', 'bà', 'dad')],
    [cell('tāng', '1', '汤', 'tāng', 'soup'), cell('táng', '2', '糖', 'táng', 'sugar'), cell('tǎng', '3', '躺', 'tǎng', 'lie down'), cell('tàng', '4', '烫', 'tàng', 'scalding hot')],
    [cell('yī', '1', '衣', 'yī', 'clothes'), cell('yí', '2', '姨', 'yí', 'aunt'), cell('yǐ', '3', '椅', 'yǐ', 'chair'), cell('yì', '4', '亿', 'yì', 'hundred million')],
  ] },
  { id: 'confusable', title: 'Confusable sounds', cols: 3, rows: [
    [cell('zh', 'zhī', '知', 'zhī', 'know'), cell('z', 'zī', '资', 'zī', 'funds'), cell('j', 'jī', '鸡', 'jī', 'chicken')],
    [cell('ch', 'chí', '迟', 'chí', 'late'), cell('c', 'cí', '词', 'cí', 'word'), cell('q', 'qí', '骑', 'qí', 'ride')],
    [cell('sh', 'shī', '诗', 'shī', 'poem'), cell('s', 'sī', '丝', 'sī', 'silk'), cell('x', 'xī', '西', 'xī', 'west')],
    [cell('r', 'rì', '日', 'rì', 'sun, day'), cell('l', 'lì', '力', 'lì', 'strength'), null],
    [cell('u', 'lù', '路', 'lù', 'road'), cell('ü', 'lǜ', '绿', 'lǜ', 'green'), null],
    [cell('an', 'shān', '山', 'shān', 'mountain'), cell('ang', 'shāng', '商', 'shāng', 'trade'), null],
    [cell('en', 'shēn', '身', 'shēn', 'body'), cell('eng', 'shēng', '生', 'shēng', 'be born'), null],
    [cell('in', 'xīn', '新', 'xīn', 'new'), cell('ing', 'xīng', '星', 'xīng', 'star'), null],
  ] },
];

const notes = [
  { mark: '3 + 3', en: 'Two 3rd tones in a row: the first is spoken as a 2nd tone. 你好 is written nǐ hǎo but said ní hǎo. The written marks do not change.' },
  { mark: '3', en: 'Before any other tone, a 3rd tone is usually just low (it does not rise again): 老师 lǎoshī = low + high.' },
  { mark: '不', en: '不 is bù, but bú before a 4th tone: 不是 bú shì, 不对 bú duì. In verb + 不 + verb it is neutral: 是不是 shì bu shì. This course writes the tone that is spoken.' },
  { mark: '一', en: '一 is yī alone, when counting and in dates; yí before a 4th tone (一个 yí ge, 一样 yíyàng); yì before tones 1-3 (一天 yì tiān, 一起 yìqǐ). This course writes the tone that is spoken.' },
  { mark: 'ma', en: 'Neutral tone: short and light, written without a mark. Particles (吗 ma, 的 de, 了 le), noun suffixes (子 zi, 们 men) and the second half of many words (谢谢 xièxie, 朋友 péngyou).' },
  { mark: 'ü', en: 'After j, q, x and y the two dots of ü are dropped: 去 qù, 学 xué, 鱼 yú all have ü. After n and l they stay: 女 nǚ, 绿 lǜ (because nu and lu also exist).' },
  { mark: 'iu ui un', en: 'Shortened spellings: iou is written iu (六 liù), uei is written ui (对 duì), uen is written un (春 chūn).' },
  { mark: 'y w', en: 'At the start of a syllable i- is written y and u- is written w: ia = ya, uo = wo, i = yi, u = wu, ü = yu.' },
  { mark: 'zhi ci', en: 'The i in zhi, chi, shi, ri, zi, ci, si is not "ee": it is a buzzing continuation of the consonant.' },
  { mark: '\'', en: 'An apostrophe separates syllables when the next one starts with a, o or e: 西安 Xī\'ān (two syllables), not xiān.' },
  { mark: 'ǎ', en: 'Where the mark goes: on a or e if present; on o in ou; otherwise on the last vowel (liù, duì).' },
  { mark: '儿', en: 'Northern r-ending: 哪儿 nǎr, 一点儿 yìdiǎnr, 玩儿 wánr. The 儿 adds an r sound to the syllable before it.' },
  { mark: 'b / p', en: 'b d g are not voiced like English b d g; they are plain p t k without a puff of air. p t k have a strong puff.' },
];

const toneVariants = (py) => {
  const { base } = splitTone(py);
  return [1, 2, 3, 4].map((t) => addTone(base, t));
};

const SINGLE = [
  ['妈', 'mā', 'mother'], ['麻', 'má', 'hemp; numb'], ['马', 'mǎ', 'horse'], ['骂', 'mà', 'scold'],
  ['八', 'bā', 'eight'], ['拔', 'bá', 'pull out'], ['把', 'bǎ', 'hold'], ['爸', 'bà', 'dad'],
  ['汤', 'tāng', 'soup'], ['糖', 'táng', 'sugar'], ['躺', 'tǎng', 'lie down'], ['烫', 'tàng', 'scalding hot'],
  ['衣', 'yī', 'clothes'], ['姨', 'yí', 'aunt'], ['椅', 'yǐ', 'chair'], ['亿', 'yì', 'hundred million'],
  ['屋', 'wū', 'house'], ['无', 'wú', 'without'], ['五', 'wǔ', 'five'], ['雾', 'wù', 'fog'],
  ['飞', 'fēi', 'fly'], ['肥', 'féi', 'fat'], ['买', 'mǎi', 'buy'], ['卖', 'mài', 'sell'],
  ['天', 'tiān', 'sky'], ['甜', 'tián', 'sweet'], ['文', 'wén', 'writing'], ['问', 'wèn', 'ask'],
];

const PAIRS = [
  ['中国', 'Zhōng guó', 'China'], ['飞机', 'fēi jī', 'plane'], ['公园', 'gōng yuán', 'park'], ['医生', 'yī shēng', 'doctor'],
  ['咖啡', 'kā fēi', 'coffee'], ['商店', 'shāng diàn', 'shop'], ['时间', 'shí jiān', 'time'], ['熊猫', 'xióng māo', 'panda'],
  ['银行', 'yín háng', 'bank'], ['明年', 'míng nián', 'next year'], ['牛奶', 'niú nǎi', 'milk'], ['学校', 'xué xiào', 'school'],
  ['北京', 'Běi jīng', 'Beijing'], ['老师', 'lǎo shī', 'teacher'], ['手机', 'shǒu jī', 'mobile phone'], ['米饭', 'mǐ fàn', 'rice'],
  ['火车', 'huǒ chē', 'train'], ['电脑', 'diàn nǎo', 'computer'], ['汉语', 'Hàn yǔ', 'Chinese language'], ['上海', 'Shàng hǎi', 'Shanghai'],
  ['再见', 'zài jiàn', 'goodbye'], ['电话', 'diàn huà', 'telephone'], ['地铁', 'dì tiě', 'metro'], ['面条', 'miàn tiáo', 'noodles'],
];

const shift = (t, k) => ((t - 1 + k) % 4) + 1;
function pairOptions(py) {
  const syl = py.split(' ');
  const parts = syl.map((s) => ({ ...splitTone(s), cap: s[0] !== s[0].toLowerCase() }));
  const make = (t1, t2) => joinWord([t1, t2].map((t, i) => {
    const s = addTone(parts[i].base, t);
    return parts[i].cap ? s[0].toUpperCase() + s.slice(1) : s;
  }));
  const [a, b] = parts.map((p) => p.tone);
  return { answer: make(a, b), opts: [make(a, b), make(a, shift(b, 1)), make(shift(a, 1), b), make(shift(a, 2), shift(b, 1))].sort() };
}

const swapInitial = (py, inits) => {
  const { base, tone } = splitTone(py);
  const ini = ['zh', 'ch', 'sh', 'z', 'c', 's', 'j', 'q', 'x', 'r', 'l'].find((i) => base.startsWith(i));
  const rest = base.slice(ini.length);
  return inits.map((i) => addTone(i + (['j', 'q', 'x'].includes(i) && rest === 'u' ? 'u' : rest), tone));
};

const INITIALS = [
  ['知', 'zhī', 'know', 'zh z j'], ['资', 'zī', 'funds', 'zh z j'], ['鸡', 'jī', 'chicken', 'zh z j'], ['住', 'zhù', 'live', 'zh z j'], ['句', 'jù', 'sentence', 'zh z j'], ['租', 'zū', 'rent', 'zh z j'],
  ['吃', 'chī', 'eat', 'ch c q'], ['七', 'qī', 'seven', 'ch c q'], ['次', 'cì', 'time(s)', 'ch c q'], ['出', 'chū', 'go out', 'ch c q'], ['去', 'qù', 'go', 'ch c q'], ['粗', 'cū', 'thick', 'ch c q'],
  ['是', 'shì', 'be', 'sh s x'], ['四', 'sì', 'four', 'sh s x'], ['戏', 'xì', 'play, drama', 'sh s x'], ['书', 'shū', 'book', 'sh s x'], ['需', 'xū', 'need', 'sh s x'], ['诉', 'sù', 'tell', 'sh s x'],
  ['日', 'rì', 'sun, day', 'r l'], ['力', 'lì', 'strength', 'r l'], ['路', 'lù', 'road', 'r l'], ['入', 'rù', 'enter', 'r l'], ['热', 'rè', 'hot', 'r l'], ['肉', 'ròu', 'meat', 'r l'],
];
const INIT_SETS = { 'zh z j': ['zh', 'z', 'j'], 'ch c q': ['ch', 'c', 'q'], 'sh s x': ['sh', 's', 'x'], 'r l': ['r', 'l'] };

const UMLAUT_LISTEN = [
  ['路', 'lù', 'lǜ', 'road'], ['绿', 'lǜ', 'lù', 'green'], ['努', 'nǔ', 'nǚ', 'make an effort'], ['女', 'nǚ', 'nǔ', 'woman'],
  ['鲁', 'lǔ', 'lǚ', 'Lu (Shandong)'], ['旅', 'lǚ', 'lǔ', 'travel'], ['怒', 'nù', 'nǜ', 'anger'], ['律', 'lǜ', 'lù', 'law'],
];
const UMLAUT_READ = [
  ['去', 'qù', 'ü'], ['学', 'xué', 'ü'], ['鱼', 'yú', 'ü'], ['句', 'jù', 'ü'], ['远', 'yuǎn', 'ü'], ['云', 'yún', 'ü'], ['需', 'xū', 'ü'], ['女', 'nǚ', 'ü'],
  ['路', 'lù', 'u'], ['书', 'shū', 'u'], ['五', 'wǔ', 'u'], ['出', 'chū', 'u'], ['住', 'zhù', 'u'], ['春', 'chūn', 'u'], ['卖', 'mài', 'none'], ['绿', 'lǜ', 'ü'],
];

const FINALS = [
  ['山', 'shān', 'shāng', 'mountain', 'an ang'], ['商', 'shāng', 'shān', 'trade', 'an ang'], ['饭', 'fàn', 'fàng', 'meal', 'an ang'], ['放', 'fàng', 'fàn', 'put', 'an ang'],
  ['晚', 'wǎn', 'wǎng', 'late', 'an ang'], ['网', 'wǎng', 'wǎn', 'net', 'an ang'],
  ['身', 'shēn', 'shēng', 'body', 'en eng'], ['生', 'shēng', 'shēn', 'be born', 'en eng'], ['门', 'mén', 'méng', 'door', 'en eng'], ['根', 'gēn', 'gēng', 'root', 'en eng'],
  ['人', 'rén', 'réng', 'person', 'en eng'], ['朋', 'péng', 'pén', 'friend', 'en eng'], ['盆', 'pén', 'péng', 'basin', 'en eng'],
  ['新', 'xīn', 'xīng', 'new', 'in ing'], ['星', 'xīng', 'xīn', 'star', 'in ing'], ['金', 'jīn', 'jīng', 'gold', 'in ing'], ['京', 'jīng', 'jīn', 'capital', 'in ing'],
  ['林', 'lín', 'líng', 'forest', 'in ing'], ['零', 'líng', 'lín', 'zero', 'in ing'],
];

const words = [
  ['你好', 'nǐ hǎo', 'hello'], ['谢谢', 'xiè xie', 'thank you'], ['再见', 'zài jiàn', 'goodbye'], ['对不起', 'duì bu qǐ', 'sorry'],
  ['没关系', 'méi guān xi', 'never mind'], ['中国', 'Zhōng guó', 'China'], ['老师', 'lǎo shī', 'teacher'], ['学生', 'xué sheng', 'student'],
  ['朋友', 'péng you', 'friend'], ['喜欢', 'xǐ huan', 'like'], ['吃饭', 'chī fàn', 'have a meal'], ['水果', 'shuǐ guǒ', 'fruit'],
  ['米饭', 'mǐ fàn', 'rice'], ['咖啡', 'kā fēi', 'coffee'], ['手机', 'shǒu jī', 'mobile phone'], ['电脑', 'diàn nǎo', 'computer'],
  ['今天', 'jīn tiān', 'today'], ['明天', 'míng tiān', 'tomorrow'], ['昨天', 'zuó tiān', 'yesterday'], ['现在', 'xiàn zài', 'now'],
  ['时间', 'shí jiān', 'time'], ['多少', 'duō shao', 'how many'], ['什么', 'shén me', 'what'], ['哪儿', 'nǎ r', 'where'],
  ['医院', 'yī yuàn', 'hospital'], ['商店', 'shāng diàn', 'shop'], ['飞机', 'fēi jī', 'plane'], ['火车', 'huǒ chē', 'train'],
  ['出租车', 'chū zū chē', 'taxi'], ['北京', 'Běi jīng', 'Beijing'], ['上海', 'Shàng hǎi', 'Shanghai'], ['漂亮', 'piào liang', 'pretty'],
  ['高兴', 'gāo xìng', 'glad'], ['天气', 'tiān qì', 'weather'], ['便宜', 'pián yi', 'cheap'], ['好吃', 'hǎo chī', 'tasty'],
  ['工作', 'gōng zuò', 'work'], ['银行', 'yín háng', 'bank'], ['汉字', 'Hàn zì', 'Chinese character'], ['熊猫', 'xióng māo', 'panda'],
];

const quizzes = [
  { id: 'tones', label: 'Tones', mode: 'listen', hint: 'Listen and pick the tone you hear.',
    items: SINGLE.map(([h, py, en]) => ({ q: py, a: py, opts: toneVariants(py), tts: h, sub: `${h} ${en}`, py })) },
  { id: 'tone-marks', label: 'Tone marks', mode: 'read', hint: 'Which tone does the mark show?',
    items: SINGLE.map(([h, py, en]) => ({ q: py, a: TONE_NAMES[splitTone(py).tone - 1], opts: TONE_NAMES, sub: `${h} ${en}` })) },
  { id: 'tone-pairs', label: 'Tone pairs', mode: 'listen', hint: 'Listen to the word and pick its two tones.',
    items: PAIRS.map(([h, py, en]) => { const { answer, opts } = pairOptions(py); return { q: answer, a: answer, opts, tts: h, sub: `${h} ${en}`, py: answer }; }) },
  { id: 'initials', label: 'zh z j, ch c q, sh s x, r l', mode: 'listen', hint: 'Curled tongue (zh ch sh r), flat tongue (z c s), or tongue tip down behind the teeth (j q x)?',
    items: INITIALS.map(([h, py, en, group]) => ({ q: py, a: py, opts: swapInitial(py, INIT_SETS[group]), group, tts: h, sub: `${h} ${en}`, py })) },
  { id: 'u-umlaut', label: 'u or ü (listen)', mode: 'listen', hint: 'Rounded "oo" (u) or "ee" with rounded lips (ü)?',
    items: UMLAUT_LISTEN.map(([h, py, other, en]) => ({ q: py, a: py, opts: [py, other].sort(), tts: h, sub: `${h} ${en}`, py })) },
  { id: 'u-umlaut-read', label: 'u or ü (spelling)', mode: 'read', hint: 'After j, q, x and y a written u is really ü.',
    items: UMLAUT_READ.map(([h, py, a]) => ({ q: py, a, opts: ['u', 'ü', 'none'], sub: h })) },
  { id: 'finals', label: 'an ang, en eng, in ing', mode: 'listen', hint: 'Does the syllable end in -n (tongue up front) or -ng (back of the throat)?',
    items: FINALS.map(([h, py, other, en, group]) => ({ q: py, a: py, opts: [py, other].sort(), group, tts: h, sub: `${h} ${en}`, py })) },
  { id: 'words', label: 'Words', mode: 'read', hint: 'What does the word mean?',
    items: words.map(([k, r, en]) => ({ q: k, a: en, sub: joinWord(r.split(' ')) })) },
  { id: 'words-listen', label: 'Words by ear', mode: 'listen', hint: 'Listen and pick the meaning.',
    items: words.map(([k, r, en]) => ({ q: k, a: en, tts: k, sub: joinWord(r.split(' ')) })) },
];

export const PINYIN = {
  tones,
  tables,
  notes,
  quizzes,
  words: words.map(([k, r, en]) => ({ k, r, en })),
};
