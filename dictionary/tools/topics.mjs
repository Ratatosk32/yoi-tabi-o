// Coarse topic tagging and usefulness scoring for JMdict entries (tourist + beginner).
// Topics come from English gloss keywords, JMdict field tags and part of speech. This only CLASSIFIES
// JMdict data; no dictionary content is invented here.

const W = (list) => new RegExp(`\\b(?:${list.trim().split(/\s*\|\s*/).join('|')})\\b`, 'i');

// Order matters for ties: earlier topics win.
export const TOPIC_RULES = [
  ['drink', W(`coffee|tea|green tea|black tea|milk|juice|beer|wine|sake|alcohol|alcoholic drink|liquor|drink|drinks|drinking|beverage|soda|cola|whisky|whiskey|cocktail|latte|cocoa|soy milk|shochu|highball|lemonade|mineral water|drinking water|cold water|hot water|water|ice|thirsty|bar|pub|izakaya|teahouse|teacup|cup|mug|straw|bottle|canned drink`)],
  ['food', W(`food|foods|meal|meals|rice|cooked rice|bread|noodles?|ramen|udon|soba|sushi|sashimi|tempura|meat|beef|pork|chicken|fish|eggs?|vegetables?|fruits?|apples?|oranges?|mandarin|bananas?|strawberr(?:y|ies)|grapes?|peach(?:es)?|melons?|lemons?|potato(?:es)?|sweet potato|onions?|carrots?|cabbage|tomato(?:es)?|mushrooms?|beans?|soybeans?|tofu|soy sauce|miso|salt|sugar|pepper|spice|sauce|soup|curry|salad|sandwich|cakes?|sweets|candy|confectionery|snacks?|chocolate|cookies?|biscuits?|dessert|ice cream|pastry|bun|buns|dumplings?|breakfast|lunch|dinner|supper|menu|restaurant|cafeteria|diner|cooking|cook|cuisine|dish|dishes|taste|tasty|delicious|flavou?r|sweet|spicy|salty|sour|bitter|hungry|hunger|eat|eating|chopsticks|spoon|fork|plate|bowl|bento|lunch box|seafood|shrimp|prawns?|crab|squid|octopus|tuna|salmon|seaweed|ham|sausage|bacon|cheese|butter|yogurt|yoghurt|jam|honey|vinegar|cooking oil|vegetarian|wheat|flour|nuts?|peanuts?|sesame|ginger|garlic|wasabi|pickles?|pickled|rice ball|grilled|fried|boiled|raw|chef|waiter|waitress|set meal|serving|portion|takeout|take-out|bakery|bake|steak|hamburger|pizza|pasta|spaghetti|egg|kitchen|appetite|feast|picnic|lunchbox|tableware`)],
  ['money', W(`money|yen|cash|coins?|banknotes?|paper money|bill \\(money\\)|price|prices|cost|costs|fee|fees|payment|pay|paying|change \\(money\\)|small change|credit card|bank|ATM|wallet|purse|refund|exchange rate|currency|cheap|inexpensive|expensive|costly|free of charge|free \\(of charge\\)|discount|tax|tax-free|duty-free|savings|deposit|loan|debt|allowance|budget|gratuity|bank account|service charge|surcharge|admission fee`)],
  ['shop', W(`shop|shops|store|stores|buy|buying|purchase|purchasing|sell|selling|sale|sales|bargain|shopping|convenience store|supermarket|department store|market|customer|customers|cashier|checkout|cash register|receipt|bag|bags|plastic bag|paper bag|package|packaging|wrapping|wrap|gift|souvenir|souvenirs|goods|merchandise|product|products|brand|clerk|salesclerk|shop assistant|vending machine|stock|out of stock|sold out|order|delivery|catalogue|catalog|counter|coupon|showroom|try on|fitting room|merchant|shopkeeper|boutique|mall|kiosk|stall|vendor|present \(gift\)`)],
  ['transport', W(`train|trains|railway|railroad|rail|station|subway|underground|metro|bus|buses|taxi|cab|car|cars|automobile|vehicle|bicycle|bike|motorcycle|airplane|aeroplane|plane|aircraft|airport|flight|ship|boat|ferry|port|harbour|harbor|ticket|tickets|fare|fares|platform|transfer|change trains|limited express|bullet train|shinkansen|reserved seat|unreserved seat|seat|seats|departure|depart|departs|leave \\(for\\)|arrival|arrive|arrives|timetable|ride|riding|get on|get off|boarding|driver|drive|driving|road|roads|highway|expressway|traffic|traffic light|signal|parking|gasoline|petrol|passenger|passengers|luggage|baggage|suitcase|locker|travel|traveling|travelling|trip|journey|passport|visa|customs|immigration|gate|transit|commute|commuting|conductor|carriage|tunnel|bridge|route|rush hour|go|come|walk|walking|on foot|pedestrian|crossing|lane|tram|streetcar|ropeway|cable car|monorail|tourist|traveller|traveler|reservation|seat reservation|express train|express \(train\)`)],
  ['place', W(`left|right|left-hand side|right-hand side|left side|right side|front|in front|behind|rear|back \(direction\)|north|south|east|west|northeast|northwest|southeast|southwest|near|nearby|close|far|distant|distance|exit|way out|entrance|entry|way in|corner|intersection|crossroads|street|streets|avenue|alley|address|building|buildings|direction|directions|straight|straight ahead|side|opposite|next to|beside|inside|outside|interior|exterior|above|below|under|underneath|top|bottom|middle|center|centre|place|location|spot|area|neighbourhood|neighborhood|vicinity|downtown|town|city|village|here and there|where|basement|ground floor|rooftop|first floor|second floor|square|plaza|toward|towards`)],
  ['hotel', W(`hotel|inn|ryokan|lodging|lodgings|accommodation|accommodations|guest room|room|rooms|bed|beds|futon|pillow|blanket|towel|bath|bathtub|bathe|shower|hot spring|hot springs|check-in|check in|check-out|check out|key|keys|lobby|front desk|reception|laundry|washing|soap|shampoo|toothbrush|toothpaste|hair dryer|air conditioner|air conditioning|heater|heating|door|window|house|home|apartment|stay|staying|lodge|guest|guests|toilet|lavatory|restroom|bathroom|washroom|sleep|sleeping|bedroom|tatami|closet|stairs|staircase|elevator|escalator|floor \\(storey\\)|storey|story \\(of a building\\)|furniture|desk|chair|table|lamp`)],
  ['health', W(`hospital|doctor|physician|nurse|medicine|medicines|medication|medical|drug|drugs|pharmacy|pharmacist|drugstore|chemist|pill|pills|tablet|tablets|illness|sick|sickness|disease|ill|injury|injured|injure|wound|wounded|pain|painful|ache|aches|hurt|hurts|headache|stomachache|toothache|fever|cold \\(illness\\)|common cold|cough|coughing|allergy|allergic|diarrhea|diarrhoea|nausea|vomit|vomiting|bleeding|bleed|blood|burn|burns|emergency|ambulance|police|police officer|police box|firefighter|fire engine|help|danger|dangerous|accident|insurance|prescription|symptom|symptoms|health|healthy|tired|fatigue|clinic|dentist|bandage|plaster|mask|thermometer|poison|poisoning|cure|treatment|injection|vaccine|vaccination|operation \\(surgery\\)|surgery|patient|pregnant|pregnancy|dizzy|dizziness|itch|itchy|sore|swelling|fracture|asthma|diabetes|infection|virus|flu|influenza|earthquake|tsunami|evacuation|evacuate|fire|thief|lost|lose|stolen|theft|safe|safety`)],
  ['body', W(`body|head|face|eye|eyes|ear|ears|nose|mouth|tooth|teeth|hand|hands|arm|leg|legs|foot|feet|finger|fingers|toe|toes|hair|neck|shoulder|shoulders|stomach|belly|abdomen|chest|heart|skin|knee|knees|throat|tongue|lip|lips|bone|bones|muscle|back \\(of the body\\)|lower back|waist|hip|hips|elbow|wrist|ankle|nail|fingernail|eyebrow|cheek|chin|forehead|breath|breathe|sweat|tears`)],
  ['time', W(`time|hour|hours|minute|minutes|o'clock|day|days|today|tomorrow|yesterday|morning|noon|midday|afternoon|evening|night|tonight|midnight|week|weeks|weekday|weekend|month|months|year|years|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december|now|soon|later|early|late|date|calendar|holiday|holidays|vacation|birthday|schedule|clock|period|ago|always|sometimes|often|usually|never|already|still|yet|until|daytime|dawn|sunrise|sunset|everyday|every day|daily|annual|century|age|new year|new year's|last year|next year|this year|last week|next week|this week|this morning|half past|beginning|end`)],
  ['number', W(`number|numbers|numeral|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|hundred|hundreds|thousand|thousands|ten thousand|million|billion|counter for|half|quarter|percent|per cent|dozen|piece|pieces|pair|several|amount|quantity|count|first|second|third|times \\(multiplier\\)|zero|order \\(sequence\\)|one(?!['’]s)`)],
  ['people', W(`person|persons|people|man|men|woman|women|child|children|kid|kids|baby|babies|infant|toddler|boy|boys|girl|girls|family|families|father|mother|parent|parents|son|daughter|brother|brothers|sister|sisters|older brother|younger brother|older sister|younger sister|husband|wife|grandfather|grandmother|grandparents|grandchild|grandson|granddaughter|uncle|aunt|cousin|nephew|niece|friend|friends|relative|relatives|adult|adults|elderly|old person|old man|old woman|student|students|pupil|teacher|staff|employee|employees|worker|foreigner|foreign|japanese|name|surname|mr|mrs|ms|miss|stroller|pram|baby carriage|diaper|nappy|kindergarten|nursery|wedding|marriage|married|boyfriend|girlfriend|neighbour|neighbor|acquaintance|guide|colleague|boss|company employee|office worker|housewife|everyone|everybody|someone|somebody|nobody`)],
  ['weather', W(`weather|rain|rainy|rainfall|snow|snowfall|wind|windy|cloud|clouds|cloudy|sunny|clear weather|fine weather|sunshine|typhoon|storm|temperature|warm|cool|humid|humidity|umbrella|season|seasons|spring|summer|autumn|fall \\(season\\)|winter|sky|rainbow|forecast|weather forecast|thunder|lightning|fog|mist|hot \\(weather\\)|heat|cold \\(weather\\)|chilly|freezing|frost|degrees|climate|rainy season|shower \\(rain\\)`)],
  ['nature', W(`mountain|mountains|river|rivers|sea|ocean|beach|seashore|coast|lake|pond|forest|woods|tree|trees|flower|flowers|cherry blossom|cherry blossoms|cherry tree|autumn leaves|maple|island|islands|hill|valley|waterfall|nature|animal|animals|dog|dogs|cat|cats|bird|birds|insect|insects|horse|cow|pig|monkey|deer|bear|plant|plants|grass|leaf|leaves|stone|rock|sand|earth|ground|moon|star|stars|sun|field|countryside|garden plant|bamboo|pine`)],
  ['sight', W(`sightseeing|tourism|tour|tours|temple|temples|shrine|shrines|castle|castles|museum|art gallery|gallery|garden|gardens|park|parks|festival|festivals|scenery|landscape|culture|cultural|tradition|traditional|tea ceremony|performance|theater|theatre|concert|movie|movies|film|cinema|guidebook|information|guidance|admission|entrance fee|zoo|aquarium|amusement park|event|exhibition|attraction|ruins|statue|tower|buddha|pagoda|hobby|fun|enjoy|enjoyable|game|games|play|playing|sport|sports|music|song|songs|sing|dance|art|painting|picture|kimono|yukata|fireworks|sightsee|scenic|famous|history|historic|historical|world heritage|souvenir shop|map|maps|walk around|stroll|onsen|hiking|ski|skiing|swimming|swim|camp|camping|karaoke|manga|anime|view \(scenery\)|scenic view|sightseeing spot`)],
  ['tech', W(`camera|cameras|photo|photos|photograph|photographs|photography|take a picture|video|lens|lenses|battery|batteries|charger|charging|phone|telephone|smartphone|mobile phone|cellphone|cell phone|computer|computers|personal computer|PC|laptop|internet|website|web|e-mail|email|mail|wifi|wi-fi|wireless|password|app|electricity|electric|electrical|electronic|electronics|plug|outlet|socket|power outlet|cable|cord|adapter|adaptor|TV|television|radio|memory card|printer|machine|device|digital|data|screen|display|button|switch|wristwatch|appliance|keyboard|mouse|tablet computer|online|download|upload|file|software|signal \\(phone\\)|SIM|tripod|drone|headphones|earphones|speaker|microphone|flash|film \\(photographic\\)|watch \(timepiece\)`)],
  ['clothes', W(`clothes|clothing|garment|garments|shirt|shirts|T-shirt|trousers|pants|jeans|skirt|dress|coat|jacket|sweater|shoes|shoe|sneakers|boots|socks|sock|hat|cap|gloves|glove|scarf|muffler|underwear|underclothes|belt|pocket|wear|put on|take off \\(clothes\\)|glasses|spectacles|sunglasses|accessory|accessories|necklace|earrings|uniform|pajamas|pyjamas|sandals|slippers|handkerchief|necktie|fashion|cosmetics|makeup|perfume|wallet|handbag|backpack|rucksack`)],
  ['phrase', W(`thank you|thanks|thank|sorry|excuse me|please|hello|good morning|good afternoon|good evening|good night|goodbye|good-bye|bye|welcome|congratulations|yes|no|okay|ok|all right|alright|bon appetit|itadakimasu|cheers|nice to meet you|pardon|i'm home|i'm off|take care|see you|of course|really|certainly|indeed|well then|hey|oh|ah|wow|excuse|i see|that's right|not at all|you're welcome|don't mention it`)],
  ['society', W(`government|governmental|political|politics|politician|politicians|election|elections|electoral|vote|voting|parliament|parliamentary|diet \\(legislature\\)|the diet|cabinet|minister|ministry|ministers|legislation|legislative|law|laws|legal|lawsuit|litigation|court|courts|trial|judicial|judiciary|prosecutor|prosecution|defendant|plaintiff|verdict|indictment|military|troops|army|navy|armed forces|soldier|soldiers|war|warfare|weapon|weapons|missile|treaty|diplomacy|diplomatic|administration|administrative|policy|policies|bureaucrat|bureaucracy|corporate|corporation|shareholder|shareholders|securities|stock market|fiscal|economy|economic|economics|industry|industrial|enterprise|organization|organisation|committee|council|labor union|labour union|political party|faction|reform|reforms|regulation|regulations|statute|constitution|constitutional|sovereignty|nuclear|investigation|suspect|arrest|arrested|criminal|crime|governor|mayor|prefectural|municipal|summit|negotiation|negotiations|trade|export|exports|import|imports|investment|investor|finance|financial|deficit|inflation|unemployment|terrorism|terrorist|riot|protest|campaign|candidate|senate|assembly|councillor|councilor|representative|delegate|authorities|jurisdiction|ordinance|amendment|ratification|sanction|sanctions|alliance|nation|national|international|official|officials|bill \\(legislation\\)|subsidy|tariff|merger|bankruptcy|revenue|profit|profits|fund|funds|management|executive|president|chairman|director|board of directors|ideology|socialism|communism|capitalism|democracy|democratic|liberal|conservative|opposition|ruling party|coalition|regime|bureau|agency|department \\(government\\)|ministerial|police investigation|incident|scandal|dispute|conflict`)],
];

export const TOPICS = [...TOPIC_RULES.map(([t]) => t), 'grammar', 'leisure', 'general'];

// Function words: a sense is "grammar" when one of its glosses (parentheticals removed) is exactly one of these.
const GRAMMAR_GLOSS = new Set(`what|who|whom|whose|where|when|why|how|which|how much|how many|what kind of|this|that|these|those|
here|there|over there|this one|that one|this way|that way|this place|that place|and|but|or|however|because|therefore|so|if|
although|though|then|also|too|as well|only|just|even|very|more|most|less|not|all|every|each|some|any|nothing|everything|
something|anything|someone|anyone|somewhere|anywhere|same|different|other|another|such|like|about|approximately|around|
with|without|from|to|by|than|as|for|of|in|on|at|and then|or else|still|already|again|maybe|perhaps|probably|certainly`
  .split(/\s*\|\s*/));
const bare = (g) => g.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const FIELD_TOPIC = {
  food: 'food', med: 'health', pharm: 'health', dent: 'health', pathol: 'health', anat: 'body', physiol: 'body',
  comp: 'tech', internet: 'tech', elec: 'tech', electr: 'tech', telec: 'tech', photo: 'tech', audvid: 'tech', tv: 'tech',
  rail: 'transport', aviat: 'transport', cloth: 'clothes',
  law: 'society', politics: 'society', finc: 'society', econ: 'society', stockm: 'society', bus: 'society', mil: 'society',
  sports: 'leisure', baseb: 'leisure', sumo: 'leisure', golf: 'leisure', boxing: 'leisure', MA: 'leisure', ski: 'leisure',
  figskt: 'leisure', prowres: 'leisure', motor: 'leisure', horse: 'leisure', go: 'leisure', shogi: 'leisure', mahj: 'leisure',
  cards: 'leisure', hanaf: 'leisure', music: 'leisure', vidg: 'leisure', film: 'sight', kabuki: 'sight', noh: 'sight',
  Buddh: 'sight', Shinto: 'sight', bot: 'nature', zool: 'nature', ornith: 'nature', fish: 'nature', met: 'weather',
};

// Specialist fields: entries whose first sense lives in one of these are rarely needed by a traveller.
const SPECIALIST = new Set(['baseb', 'sumo', 'go', 'shogi', 'mahj', 'hanaf', 'cards', 'golf', 'boxing', 'prowres', 'MA', 'math',
  'physics', 'chem', 'astron', 'biol', 'geol', 'ling', 'gramm', 'logic', 'phil', 'psych', 'psyanal', 'genet', 'biochem', 'Christn',
  'Buddh', 'law', 'finc', 'econ', 'stockm', 'mil', 'politics', 'bus', 'print', 'geom', 'stat', 'engr', 'archeol', 'min', 'ecol',
  'civeng', 'agric', 'grmyth', 'horse', 'motor', 'figskt', 'kabuki', 'noh', 'tradem', 'elec', 'electr', 'music', 'sports']);

const GRAMMAR_POS = new Set(['prt', 'conj', 'aux', 'aux-v', 'aux-adj', 'cop', 'pn', 'adj-pn']);

/** Pick a topic from the first two senses (each: { pos[], field[], misc[], gloss[] }). */
export function topicOf(senses) {
  const s1 = senses[0];
  if (s1.pos.some((p) => GRAMMAR_POS.has(p))) {
    // pronouns about people stay "people"; everything else grammatical is "grammar"
    if (s1.pos.includes('pn') && /\b(?:I|me|you|he|she|we|they)\b/.test(s1.gloss[0])) return 'people';
    return 'grammar';
  }
  if (s1.pos.includes('ctr') || s1.pos.includes('num')) return 'number';
  for (const f of s1.field) if (FIELD_TOPIC[f]) return FIELD_TOPIC[f];
  const score = new Map();
  const add = (gl, w) => {
    TOPIC_RULES.forEach(([t, re], order) => {
      // strip parenthetical qualifiers like "(to the touch)" from the start only; keep inner text for matching
      if (re.test(gl)) score.set(t, (score.get(t) || 0) + w - order * 1e-4);
    });
  };
  s1.gloss.forEach((g, i) => add(g, i === 0 ? 3 : 1.5));
  if (senses[1]) senses[1].gloss.slice(0, 2).forEach((g) => add(g, 0.5));
  if (s1.pos.includes('int') && !score.size) return 'phrase';
  if (s1.gloss.slice(0, 2).some((g) => GRAMMAR_GLOSS.has(bare(g)))) return 'grammar';
  // a topic needs a hit on the first gloss (weight 3) or on two later first-sense glosses (1.5 each)
  let best = 'general', bs = 2.9;
  for (const [t, v] of score) if (v > bs) { best = t; bs = v; }
  return best;
}

const TOPIC_BOOST = {
  food: 14, drink: 14, shop: 14, money: 14, transport: 14, place: 12, hotel: 12, health: 14,
  grammar: 18, phrase: 22, time: 10, number: 10, people: 10, weather: 10, sight: 8, tech: 10, clothes: 10, body: 10,
  nature: 4, leisure: 0, general: 0, society: -22,
};

const MISC_PENALTY = {
  yoji: -20, id: -8, proverb: -15, quote: -15, hist: -10, dated: -8, poet: -12, sl: -4, 'net-sl': -8, derog: -15, sens: -8,
  form: -3, joc: -6, person: -12, place: -6, abbr: -2, male: -2, fem: -1,
};

const SIMPLE = new RegExp(`^[${String.fromCharCode(0x4e00)}-${String.fromCharCode(0x9fff)}][${String.fromCharCode(0x3041)}-${String.fromCharCode(0x3096)}]{1,4}$`);
const ABSTRACT = /(?:tion|sion|ment|ity|ism|ness|ance|ence|ology|ship|ality|ization|isation)\b/i;

/**
 * Usefulness score (higher = more useful). Inputs are already filtered senses of the entry and its
 * priority tag set.
 */
export function scoreEntry({ pri, senses, topic, ja, kana }) {
  let s = 0;
  const parts = {};
  let nf = 0;
  for (const t of pri) { const m = /^nf(\d\d)$/.exec(t); if (m) nf = nf ? Math.min(nf, +m[1]) : +m[1]; }
  // The newspaper ranks (nfXX) do not cover particles, auxiliaries, most loanwords or words the
  // papers write in kana, so a missing or weak rank says little: use the best of the rank and a value
  // imputed from the other lists.
  const kanaWord = !/[一-鿿々]/.test(ja);
  let f = nf ? 40 * (49 - nf) / 48 : 0;
  if (pri.has('ichi1')) f = Math.max(f, kanaWord ? 30 : 22);
  if (pri.has('spec1')) f = Math.max(f, kanaWord ? 25 : 18);
  if (pri.has('gai1')) f = Math.max(f, 22);
  if (pri.has('spec2')) f = Math.max(f, 10);
  if (pri.has('gai2')) f = Math.max(f, 6);
  s += parts.freq = f;
  if (pri.has('ichi1')) s += parts.ichi1 = 25; else if (pri.has('ichi2')) s += parts.ichi2 = 5;
  if (pri.has('spec1')) s += parts.spec1 = 14; else if (pri.has('spec2')) s += parts.spec2 = 8;
  if (pri.has('gai1')) s += parts.gai1 = 14; else if (pri.has('gai2')) s += parts.gai2 = 4;
  s += parts.topic = TOPIC_BOOST[topic] ?? 0;

  const s1 = senses[0];
  const pos = s1.pos;
  let p = 0;
  if (pos.some((x) => /^v(?:1|5|k|s-i|z)/.test(x))) p = 10;
  else if (pos.includes('adj-i') || pos.includes('adj-ix')) p = 16; // basic descriptive adjectives: few and essential
  else if (pos.includes('adj-na')) p = 6;
  else if (pos.includes('adv')) p = 2;
  else if (pos.includes('int')) p = 4;
  else if (pos.includes('ctr')) p = 4;
  else if (pos.includes('exp')) p = topic === 'phrase' ? 2 : -4;
  else if (pos.every((x) => ['suf', 'pref', 'n-suf', 'n-pref'].includes(x))) p = -6;
  // basic layer: one kanji + okurigana verbs/adjectives on the ichi1 list (書く, 待つ, 好き, 古い) -
  // JMdict's frequency tags cannot tell them from rarer verbs, their shape can
  if (pri.has('ichi1') && SIMPLE.test(ja) && pos.some((x) => /^v(?:1|5|k)|^adj-(?:i|na)$/.test(x))) p += 10;
  // function words: few, but every sentence needs them
  if (pos.some((x) => ['prt', 'aux', 'aux-v', 'cop'].includes(x))) p += 10;
  else if (pos.includes('conj')) p += 3;
  else if (pos.includes('pn')) p += 6;
  s += parts.pos = p;

  let m = 0;
  for (const t of s1.misc) m += MISC_PENALTY[t] || 0;
  if (s1.field.some((f) => SPECIALIST.has(f))) m -= 10;
  if (topic === 'general' && pos.includes('n') && ABSTRACT.test(s1.gloss[0])) m -= 6;
  // long all-kanji compounds are mostly news vocabulary
  if (/^[一-鿿々]{4,}$/.test(ja)) m -= 8;
  if (kana.length > 9) m -= 3;
  s += parts.misc = m;
  return { score: Math.round(s * 100) / 100, parts };
}
