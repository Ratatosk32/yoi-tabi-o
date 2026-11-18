// Kana source. Katakana is derived from hiragana by a code-point shift (except the extended set).
// Romaji: Hepburn; を is shown as "o" (pronounced "o").

// Gojūon table: rows by consonant, columns a i u e o (null = empty)
export const GOJUON = [
  ['あ a', 'い i', 'う u', 'え e', 'お o'],
  ['か ka', 'き ki', 'く ku', 'け ke', 'こ ko'],
  ['さ sa', 'し shi', 'す su', 'せ se', 'そ so'],
  ['た ta', 'ち chi', 'つ tsu', 'て te', 'と to'],
  ['な na', 'に ni', 'ぬ nu', 'ね ne', 'の no'],
  ['は ha', 'ひ hi', 'ふ fu', 'へ he', 'ほ ho'],
  ['ま ma', 'み mi', 'む mu', 'め me', 'も mo'],
  ['や ya', null, 'ゆ yu', null, 'よ yo'],
  ['ら ra', 'り ri', 'る ru', 'れ re', 'ろ ro'],
  ['わ wa', null, null, null, 'を o'],
  ['ん n', null, null, null, null],
];

export const DAKUTEN = [
  ['が ga', 'ぎ gi', 'ぐ gu', 'げ ge', 'ご go'],
  ['ざ za', 'じ ji', 'ず zu', 'ぜ ze', 'ぞ zo'],
  ['だ da', 'ぢ ji', 'づ zu', 'で de', 'ど do'],
  ['ば ba', 'び bi', 'ぶ bu', 'べ be', 'ぼ bo'],
  ['ぱ pa', 'ぴ pi', 'ぷ pu', 'ぺ pe', 'ぽ po'],
];

// Yōon: columns ya yu yo
export const YOON = [
  ['きゃ kya', 'きゅ kyu', 'きょ kyo'],
  ['しゃ sha', 'しゅ shu', 'しょ sho'],
  ['ちゃ cha', 'ちゅ chu', 'ちょ cho'],
  ['にゃ nya', 'にゅ nyu', 'にょ nyo'],
  ['ひゃ hya', 'ひゅ hyu', 'ひょ hyo'],
  ['みゃ mya', 'みゅ myu', 'みょ myo'],
  ['りゃ rya', 'りゅ ryu', 'りょ ryo'],
  ['ぎゃ gya', 'ぎゅ gyu', 'ぎょ gyo'],
  ['じゃ ja', 'じゅ ju', 'じょ jo'],
  ['びゃ bya', 'びゅ byu', 'びょ byo'],
  ['ぴゃ pya', 'ぴゅ pyu', 'ぴょ pyo'],
];

// Extended katakana for loanwords (katakana only)
export const EXTENDED = [
  ['ティ ti', 'ディ di', 'トゥ tu', 'ドゥ du'],
  ['ファ fa', 'フィ fi', 'フェ fe', 'フォ fo'],
  ['ウィ wi', 'ウェ we', 'ウォ wo', 'ヴ vu'],
  ['シェ she', 'ジェ je', 'チェ che', 'デュ dyu'],
];

export const SPECIAL_NOTES = [
  { mark: 'っ / ッ', en: 'Small tsu: doubles the next consonant (a short pause). きって kitte, カップ kappu.' },
  { mark: 'ー', en: 'Long-vowel mark in katakana: コーヒー kōhī, ビール bīru. Written as a macron in romaji.' },
  { mark: 'ん / ン', en: 'Syllabic n. Before b/p/m it sounds like “m”: さんびゃく “sambyaku”. Before a vowel romaji writes n\' (kin\'en).' },
  { mark: '゛ ゜', en: 'Dakuten (voicing: か→が) and handakuten (は→ぱ).' },
  { mark: 'は / を / へ', en: 'As particles they are read wa / o / e.' },
];

// Quiz words: [katakana, romaji, en]
export const WORDS = [
  ['カメラ', 'kamera', 'camera'],
  ['レンズ', 'renzu', 'lens'],
  ['フィルム', 'firumu', 'film'],
  ['ボディ', 'bodi', 'camera body'],
  ['バッテリー', 'batterī', 'battery'],
  ['ストラップ', 'sutorappu', 'strap'],
  ['フィルター', 'firutā', 'filter'],
  ['シャッター', 'shattā', 'shutter'],
  ['ズーム', 'zūmu', 'zoom'],
  ['ケース', 'kēsu', 'case'],
  ['キャップ', 'kyappu', 'lens cap'],
  ['ジャンク', 'janku', 'junk (as-is, broken)'],
  ['メモリーカード', 'memorī kādo', 'memory card'],
  ['レシート', 'reshīto', 'receipt'],
  ['ポイントカード', 'pointo kādo', 'point card'],
  ['コンビニ', 'konbini', 'convenience store'],
  ['スーパー', 'sūpā', 'supermarket'],
  ['レジ', 'reji', 'register (checkout)'],
  ['コーヒー', 'kōhī', 'coffee'],
  ['ジュース', 'jūsu', 'juice'],
  ['ミルク', 'miruku', 'milk'],
  ['パン', 'pan', 'bread'],
  ['アイスクリーム', 'aisukurīmu', 'ice cream'],
  ['チーズ', 'chīzu', 'cheese'],
  ['ラーメン', 'rāmen', 'ramen'],
  ['カレー', 'karē', 'curry'],
  ['メニュー', 'menyū', 'menu'],
  ['セット', 'setto', 'set meal / set'],
  ['ホテル', 'hoteru', 'hotel'],
  ['チェックイン', 'chekkuin', 'check-in'],
  ['タクシー', 'takushī', 'taxi'],
  ['バス', 'basu', 'bus'],
  ['ホーム', 'hōmu', 'platform'],
  ['エレベーター', 'erebētā', 'elevator'],
  ['エスカレーター', 'esukarētā', 'escalator'],
  ['トイレ', 'toire', 'toilet'],
  ['ベビーカー', 'bebīkā', 'stroller'],
  ['タオル', 'taoru', 'towel'],
  ['パスポート', 'pasupōto', 'passport'],
  ['クレジットカード', 'kurejitto kādo', 'credit card'],
  ['ティッシュ', 'tisshu', 'tissues'],
  ['デジタル', 'dejitaru', 'digital'],
  ['ファミリー', 'famirī', 'family'],
  ['ウォッチ', 'wotchi', 'watch (in names)'],
  ['チケット', 'chiketto', 'ticket'],
];
