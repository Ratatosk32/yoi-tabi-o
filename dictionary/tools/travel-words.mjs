// Everyday travel vocabulary used to audit the dictionary (not a data source: entries still come
// from JMdict). Each item: [written form, reading, English hint]. A word counts as present when an
// entry has it as headword, reading or alternative form.
export const TRAVEL_WORDS = [
  // food and drink
  ['コーヒー', 'コーヒー', 'coffee'], ['カフェラテ', 'カフェラテ', 'caffe latte'], ['ミルクコーヒー', 'ミルクコーヒー', 'coffee with milk'],
  ['カフェオレ', 'カフェオレ', 'cafe au lait'], ['紅茶', 'こうちゃ', 'black tea'], ['お茶', 'おちゃ', 'tea'], ['緑茶', 'りょくちゃ', 'green tea'],
  ['牛乳', 'ぎゅうにゅう', 'milk'], ['ミルク', 'ミルク', 'milk'], ['水', 'みず', 'water'], ['お湯', 'おゆ', 'hot water'], ['氷', 'こおり', 'ice'],
  ['ジュース', 'ジュース', 'juice'], ['ビール', 'ビール', 'beer'], ['酒', 'さけ', 'sake'], ['ワイン', 'ワイン', 'wine'],
  ['パン', 'パン', 'bread'], ['菓子パン', 'かしパン', 'sweet bun'], ['ご飯', 'ごはん', 'rice/meal'], ['米', 'こめ', 'rice'],
  ['朝ご飯', 'あさごはん', 'breakfast'], ['昼ご飯', 'ひるごはん', 'lunch'], ['晩ご飯', 'ばんごはん', 'dinner'], ['弁当', 'べんとう', 'boxed lunch'],
  ['おにぎり', 'おにぎり', 'rice ball'], ['寿司', 'すし', 'sushi'], ['ラーメン', 'ラーメン', 'ramen'], ['うどん', 'うどん', 'udon'],
  ['そば', 'そば', 'soba'], ['肉', 'にく', 'meat'], ['魚', 'さかな', 'fish'], ['鶏肉', 'とりにく', 'chicken'], ['豚肉', 'ぶたにく', 'pork'],
  ['牛肉', 'ぎゅうにく', 'beef'], ['卵', 'たまご', 'egg'], ['野菜', 'やさい', 'vegetables'], ['果物', 'くだもの', 'fruit'],
  ['塩', 'しお', 'salt'], ['砂糖', 'さとう', 'sugar'], ['醤油', 'しょうゆ', 'soy sauce'], ['菓子', 'かし', 'sweets'], ['ケーキ', 'ケーキ', 'cake'],
  ['アイスクリーム', 'アイスクリーム', 'ice cream'], ['箸', 'はし', 'chopsticks'], ['スプーン', 'スプーン', 'spoon'], ['フォーク', 'フォーク', 'fork'],
  ['皿', 'さら', 'plate'], ['コップ', 'コップ', 'glass/cup'], ['メニュー', 'メニュー', 'menu'], ['注文', 'ちゅうもん', 'order'],
  ['美味しい', 'おいしい', 'delicious'], ['甘い', 'あまい', 'sweet'], ['辛い', 'からい', 'spicy'], ['熱い', 'あつい', 'hot (to touch)'],
  ['冷たい', 'つめたい', 'cold (to touch)'], ['温かい', 'あたたかい', 'warm'], ['食べる', 'たべる', 'to eat'], ['飲む', 'のむ', 'to drink'],
  ['アレルギー', 'アレルギー', 'allergy'], ['持ち帰り', 'もちかえり', 'takeout'], ['店内', 'てんない', 'eat in / in store'],
  ['レストラン', 'レストラン', 'restaurant'], ['食堂', 'しょくどう', 'cafeteria'], ['定食', 'ていしょく', 'set meal'],
  // shopping and money
  ['店', 'みせ', 'shop'], ['コンビニ', 'コンビニ', 'convenience store'], ['スーパー', 'スーパー', 'supermarket'], ['デパート', 'デパート', 'department store'],
  ['買う', 'かう', 'to buy'], ['売る', 'うる', 'to sell'], ['値段', 'ねだん', 'price'], ['安い', 'やすい', 'cheap'], ['高い', 'たかい', 'expensive/high'],
  ['大きい', 'おおきい', 'big'], ['小さい', 'ちいさい', 'small'], ['袋', 'ふくろ', 'bag'], ['レジ袋', 'レジぶくろ', 'plastic shopping bag'],
  ['レシート', 'レシート', 'receipt'], ['領収書', 'りょうしゅうしょ', 'formal receipt'], ['レジ', 'レジ', 'cash register'], ['免税', 'めんぜい', 'tax exemption'],
  ['税込', 'ぜいこみ', 'tax included'], ['割引', 'わりびき', 'discount'], ['お土産', 'おみやげ', 'souvenir'], ['サイズ', 'サイズ', 'size'],
  ['お金', 'おかね', 'money'], ['円', 'えん', 'yen'], ['現金', 'げんきん', 'cash'], ['カード', 'カード', 'card'], ['クレジットカード', 'クレジットカード', 'credit card'],
  ['お釣り', 'おつり', 'change'], ['財布', 'さいふ', 'wallet'], ['払う', 'はらう', 'to pay'], ['両替', 'りょうがえ', 'money exchange'], ['銀行', 'ぎんこう', 'bank'],
  // transport and directions
  ['駅', 'えき', 'station'], ['切符', 'きっぷ', 'ticket'], ['電車', 'でんしゃ', 'train'], ['地下鉄', 'ちかてつ', 'subway'], ['新幹線', 'しんかんせん', 'shinkansen'],
  ['バス', 'バス', 'bus'], ['タクシー', 'タクシー', 'taxi'], ['空港', 'くうこう', 'airport'], ['飛行機', 'ひこうき', 'airplane'], ['乗り換え', 'のりかえ', 'transfer'],
  ['出口', 'でぐち', 'exit'], ['入口', 'いりぐち', 'entrance'], ['改札', 'かいさつ', 'ticket gate'], ['ホーム', 'ホーム', 'platform'], ['指定席', 'していせき', 'reserved seat'],
  ['自由席', 'じゆうせき', 'unreserved seat'], ['終電', 'しゅうでん', 'last train'], ['荷物', 'にもつ', 'luggage'], ['地図', 'ちず', 'map'],
  ['右', 'みぎ', 'right'], ['左', 'ひだり', 'left'], ['まっすぐ', 'まっすぐ', 'straight'], ['近い', 'ちかい', 'near'], ['遠い', 'とおい', 'far'],
  ['道', 'みち', 'road'], ['北', 'きた', 'north'], ['南', 'みなみ', 'south'], ['東', 'ひがし', 'east'], ['西', 'にし', 'west'], ['行く', 'いく', 'to go'],
  ['乗る', 'のる', 'to ride'], ['降りる', 'おりる', 'to get off'], ['歩く', 'あるく', 'to walk'],
  // hotel
  ['ホテル', 'ホテル', 'hotel'], ['旅館', 'りょかん', 'ryokan'], ['予約', 'よやく', 'reservation'], ['部屋', 'へや', 'room'], ['鍵', 'かぎ', 'key'],
  ['トイレ', 'トイレ', 'toilet'], ['風呂', 'ふろ', 'bath'], ['温泉', 'おんせん', 'hot spring'], ['タオル', 'タオル', 'towel'], ['チェックイン', 'チェックイン', 'check-in'],
  ['チェックアウト', 'チェックアウト', 'check-out'], ['エレベーター', 'エレベーター', 'elevator'], ['階段', 'かいだん', 'stairs'], ['朝食', 'ちょうしょく', 'breakfast'],
  // health and emergency
  ['病院', 'びょういん', 'hospital'], ['薬', 'くすり', 'medicine'], ['薬局', 'やっきょく', 'pharmacy'], ['医者', 'いしゃ', 'doctor'], ['熱', 'ねつ', 'fever'],
  ['風邪', 'かぜ', 'a cold'], ['頭痛', 'ずつう', 'headache'], ['痛い', 'いたい', 'painful'], ['救急車', 'きゅうきゅうしゃ', 'ambulance'], ['警察', 'けいさつ', 'police'],
  ['交番', 'こうばん', 'police box'], ['助けて', 'たすけて', 'help!'], ['危ない', 'あぶない', 'dangerous'], ['迷子', 'まいご', 'lost child'], ['絆創膏', 'ばんそうこう', 'adhesive bandage'],
  // family and children
  ['子供', 'こども', 'child'], ['赤ちゃん', 'あかちゃん', 'baby'], ['家族', 'かぞく', 'family'], ['息子', 'むすこ', 'son'], ['娘', 'むすめ', 'daughter'],
  ['夫', 'おっと', 'husband'], ['妻', 'つま', 'wife'], ['ベビーカー', 'ベビーカー', 'stroller'], ['おむつ', 'おむつ', 'diaper'],
  // time and numbers
  ['今日', 'きょう', 'today'], ['明日', 'あした', 'tomorrow'], ['昨日', 'きのう', 'yesterday'], ['今', 'いま', 'now'], ['朝', 'あさ', 'morning'], ['夜', 'よる', 'night'],
  ['時間', 'じかん', 'time'], ['何時', 'なんじ', 'what time'], ['一つ', 'ひとつ', 'one (thing)'], ['二つ', 'ふたつ', 'two (things)'], ['半分', 'はんぶん', 'half'],
  ['千', 'せん', 'thousand'], ['万', 'まん', 'ten thousand'], ['営業時間', 'えいぎょうじかん', 'business hours'], ['休み', 'やすみ', 'holiday/closed'],
  // weather and sightseeing
  ['天気', 'てんき', 'weather'], ['雨', 'あめ', 'rain'], ['雪', 'ゆき', 'snow'], ['傘', 'かさ', 'umbrella'], ['寒い', 'さむい', 'cold (weather)'], ['暑い', 'あつい', 'hot (weather)'],
  ['寺', 'てら', 'temple'], ['神社', 'じんじゃ', 'shrine'], ['城', 'しろ', 'castle'], ['博物館', 'はくぶつかん', 'museum'], ['公園', 'こうえん', 'park'],
  ['入場料', 'にゅうじょうりょう', 'admission fee'], ['観光', 'かんこう', 'sightseeing'], ['案内', 'あんない', 'guidance'],
  // photo and electronics
  ['写真', 'しゃしん', 'photograph'], ['カメラ', 'カメラ', 'camera'], ['レンズ', 'レンズ', 'lens'], ['電池', 'でんち', 'battery'], ['充電', 'じゅうでん', 'charging'],
  ['充電器', 'じゅうでんき', 'charger'], ['携帯電話', 'けいたいでんわ', 'mobile phone'], ['スマホ', 'スマホ', 'smartphone'], ['時計', 'とけい', 'watch/clock'],
  ['腕時計', 'うでどけい', 'wristwatch'], ['コンセント', 'コンセント', 'power outlet'],
  // courtesy and basics
  ['ありがとう', 'ありがとう', 'thank you'], ['すみません', 'すみません', 'excuse me'], ['ください', 'ください', 'please give me'], ['はい', 'はい', 'yes'],
  ['いいえ', 'いいえ', 'no'], ['大丈夫', 'だいじょうぶ', 'okay'], ['いくら', 'いくら', 'how much'], ['どこ', 'どこ', 'where'], ['これ', 'これ', 'this'],
  ['要る', 'いる', 'to need'],
];
