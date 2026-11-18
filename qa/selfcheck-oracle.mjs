// Self-check of the QA oracle against hand-written textbook readings.
import * as O from './oracle-numbers.mjs';
const T = [
  [O.readInt(300).kana,'さんびゃく'],[O.readInt(600).kana,'ろっぴゃく'],[O.readInt(800).kana,'はっぴゃく'],
  [O.readInt(3000).kana,'さんぜん'],[O.readInt(8000).kana,'はっせん'],[O.readInt(1000).kana,'せん'],
  [O.readInt(10000).kana,'いちまん'],[O.readInt(128000).kana,'じゅうにまんはっせん'],[O.readInt(250000).kana,'にじゅうごまん'],
  [O.readInt(100000).kana,'じゅうまん'],[O.readInt(1000000).kana,'ひゃくまん'],[O.readInt(10000000).kana,'いっせんまん'],
  [O.readInt(11000).kana,'いちまんせん'],[O.readInt(99999999).kana,'きゅうせんきゅうひゃくきゅうじゅうきゅうまんきゅうせんきゅうひゃくきゅうじゅうきゅう'],
  [O.readInt(1234).kana,'せんにひゃくさんじゅうよん'],[O.readInt(3300).kana,'さんぜんさんびゃく'],[O.readInt(38000).kana,'さんまんはっせん'],
  [O.readInt(128000).romaji,'jūniman hassen'],[O.readInt(10001).romaji,'ichiman ichi'],
  [O.readYen(4).kana,'よえん'],[O.readYen(14).kana,'じゅうよえん'],[O.readYen(40).kana,'よんじゅうえん'],[O.readYen(300).romaji,'sanbyaku-en'],
  [O.readYen(128000).romaji,'jūniman hassen-en'],[O.readYen(1004).romaji,"sen'yo-en"],[O.readYen(12800).kana,'いちまんにせんはっぴゃくえん'],
  [O.readHour(4).kana,'よじ'],[O.readHour(7).kana,'しちじ'],[O.readHour(9).kana,'くじ'],[O.readHour(14).kana,'じゅうよじ'],[O.readHour(19).kana,'じゅうくじ'],
  [O.readTime(9,30).kana,'くじはん'],[O.readTime(3,30).romaji,'sanji han'],
  ...[[1,'いっぷん'],[2,'にふん'],[3,'さんぷん'],[4,'よんぷん'],[5,'ごふん'],[6,'ろっぷん'],[7,'ななふん'],[8,'はっぷん'],[9,'きゅうふん'],[10,'じゅっぷん'],[11,'じゅういっぷん'],[20,'にじゅっぷん'],[45,'よんじゅうごふん'],[58,'ごじゅうはっぷん']].map(([m,k])=>[O.readMinutes(m).kana,k]),
  [O.readMinutes(10).romaji,'juppun'],[O.readMinutes(1).romaji,'ippun'],
  ...[[1,'ついたち'],[2,'ふつか'],[3,'みっか'],[4,'よっか'],[5,'いつか'],[6,'むいか'],[7,'なのか'],[8,'ようか'],[9,'ここのか'],[10,'とおか'],[11,'じゅういちにち'],[14,'じゅうよっか'],[17,'じゅうしちにち'],[19,'じゅうくにち'],[20,'はつか'],[24,'にじゅうよっか'],[31,'さんじゅういちにち']].map(([d,k])=>[O.readDay(d).kana,k]),
  [O.readDay(10).romaji,'tōka'],[O.readDay(8).romaji,'yōka'],
  ...[[1,'ひとり'],[2,'ふたり'],[3,'さんにん'],[4,'よにん'],[14,'じゅうよにん']].map(([n,k])=>[O.readCounter(n,'人').kana,k]),
  ...[[1,'いっぽん'],[2,'にほん'],[3,'さんぼん'],[6,'ろっぽん'],[8,'はっぽん'],[10,'じゅっぽん'],[100,'ひゃっぽん'],[1000,'せんぼん'],[13,'じゅうさんぼん']].map(([n,k])=>[O.readCounter(n,'本').kana,k]),
  ...[[1,'いっこ'],[6,'ろっこ'],[8,'はっこ'],[10,'じゅっこ'],[100,'ひゃっこ']].map(([n,k])=>[O.readCounter(n,'個').kana,k]),
  ...[[1,'ひとつ'],[3,'みっつ'],[8,'やっつ'],[10,'とお'],[11,'じゅういち']].map(([n,k])=>[O.readCounter(n,'つ').kana,k]),
  ...[[1,'いちまい'],[4,'よんまい'],[7,'ななまい']].map(([n,k])=>[O.readCounter(n,'枚').kana,k]),
  [O.readCounter(1,'本').romaji,'ippon'],[O.readCounter(3,'つ').romaji,'mittsu'],[O.readMonth(4).kana,'しがつ'],[O.readMonth(11).kana,'じゅういちがつ'],
  [O.readCounter(3,'階').kana,'さんがい'],[O.readCounter(20,'歳').kana,'はたち'],
];
let bad = 0;
for (const [a, e] of T) if (a !== e) { bad++; console.log('SELF-CHECK FAIL', a, '!=', e); }
console.log(`oracle self-check: ${T.length - bad}/${T.length} ok`);
console.log('ambiguity sanen:', O.romajiAmbiguity('sanen', 'さんえん'), ' san-en:', O.romajiAmbiguity('san-en', 'さんえん'));
process.exitCode = bad ? 1 : 0;
