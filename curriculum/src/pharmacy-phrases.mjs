// Pharmacy phrases (curriculum schema, same row format as the unit files):
// [id, kind, ruby, romaji, en, note?, extra?]  extra: { replies, replyTo, tts, pattern, tags, cat }
// Placement: lesson U12-L07 "Pharmacy II" (REF path, level 4), right after the other U12 lessons;
// build.mjs sorts lessons by code, so it lands after U12-L06.
//
// Already in the curriculum and reused rather than duplicated (lesson U12-L03 "Pharmacy" and U12-L02):
//   family.drowsy           眠くなりますか              Does it make you drowsy?
//   family.age-ok           〇歳の子どもでも飲めますか   Can a 〇-year-old take it?
//   family.child-dose       子どもは何錠飲めますか       How many tablets can a child take?
//   family.syrup            シロップの薬はありますか     Do you have it as a syrup?
//   family.fever-med / family.cold-med / family.stomach-med / family.kids-medicine
//   hear.family.drug-allergy  薬のアレルギーはありますか (staff asks about allergies)
//   hear.family.medicine-q    何か薬を飲んでいますか     (staff asks about other medicine)
//   hear.family.pharmacist    薬剤師に確認しますので、少々お待ちください
export const REUSED = ['family.drowsy', 'family.age-ok', 'family.child-dose', 'family.syrup', 'family.fever-med', 'family.cold-med',
  'family.stomach-med', 'family.kids-medicine', 'hear.family.drug-allergy', 'hear.family.medicine-q', 'hear.family.pharmacist'];

export const LESSONS = [
  { code: 'U12-L07', level: 4, title: 'Pharmacy II: symptoms and who it is for', goal: 'Ask for a remedy by symptom; answer the pharmacist.', patterns: ['～に効く薬はありますか'],
    items: [
      ['family.headache-med', 'say', '頭痛薬[ずつうやく]はありますか', 'zutsūyaku wa arimasu ka', 'Do you have medicine for a headache?'],
      ['family.runny-nose-med', 'pattern', '鼻水[はなみず]に効[き]く薬[くすり]はありますか', 'hanamizu ni kiku kusuri wa arimasu ka', 'Do you have something for a runny nose?', '～に効く薬はありますか = "do you have medicine for ～?"', { pattern: '～に効く薬はありますか' }],
      ['family.cough-med', 'say', 'せき止[ど]めはありますか', 'sekidome wa arimasu ka', 'Do you have cough medicine?'],
      ['family.motion-sick', 'say', '酔[よ]い止[ど]めはありますか', 'yoidome wa arimasu ka', 'Do you have motion-sickness medicine?'],
      ['family.eye-drops', 'say', '目薬[めぐすり]はありますか', 'megusuri wa arimasu ka', 'Do you have eye drops?'],
      ['hear.family.symptoms', 'hear', 'どんな症状[しょうじょう]ですか', 'donna shōjō desu ka', 'What are your symptoms?', null, { replies: ['family.headache', 'family.throat', 'family.cough', 'family.runny-nose'] }],
      ['family.runny-nose', 'say', '鼻水[はなみず]が出[で]ます', 'hanamizu ga demasu', 'I have a runny nose'],
      ['hear.family.who-uses', 'hear', 'どなたがお使[つか]いになりますか', 'donata ga otsukai ni narimasu ka', 'Who will be using it?', null, { replies: ['family.for-child', 'family.for-me'] }],
      ['family.for-child', 'say', '子[こ]どもが使[つか]います', 'kodomo ga tsukaimasu', 'It\'s for my child'],
      ['family.for-me', 'say', '私[わたし]が使[つか]います', 'watashi ga tsukaimasu', 'It\'s for me'],
      ['hear.family.other-meds', 'hear', 'ほかに飲[の]んでいるお薬[くすり]はありますか', 'hoka ni nonde iru okusuri wa arimasu ka', 'Are you taking any other medicine?', null, { replies: ['basics.iie', 'family.taking-this'] }],
      ['hear.family.no-pharmacist', 'hear', 'ただいま薬剤師[やくざいし]が不在[ふざい]のため、第一類医薬品[だいいちるいいやくひん]は販売[はんばい]できません', 'tadaima yakuzaishi ga fuzai no tame, daiichirui iyakuhin wa hanbai dekimasen', 'The pharmacist is out, so we can\'t sell Class 1 medicines right now', 'Class 1 (第1類) needs a pharmacist; ask for a Class 2 alternative or come back later.', { replies: ['basics.wakarimashita', 'basics.ato-de'] }],
    ] },
];
