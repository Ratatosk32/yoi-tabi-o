// Romaji for dictionary entries: the app's own converter (app/modules/text.js, PLAN.md 1.6) plus two
// word-level fixes the app converter cannot know about because it sees only kana:
//  1. godan -u verbs: the final う is the verb ending, not a long vowel (思う = omou, not omō; 吸う = suu).
//  2. the topic particle は inside greetings/conjunctions is read "wa" (こんにちは = konnichiwa, では = dewa),
//     and the particles は / へ on their own are "wa" / "e".
// Everything else is delegated unchanged, so dictionary romaji and app romaji follow one convention.
import { kanaToHepburn } from '../../app/modules/text.js';

export { kanaToHepburn };

const PARTICLE = { 'は': 'wa', 'へ': 'e', 'を': 'o' };
const WA_END = /(では|には|とは|ちは|んは)$/; // では, には, とは, こんにちは, こんばんは

/**
 * @param {string} kana reading
 * @param {string[]} pos JMdict part-of-speech codes of the entry (all senses)
 */
export function entryRomaji(kana, pos = []) {
  // the middle dot separates letters in spelled-out abbreviations (シー・エム): romaji gets a space
  if (kana.includes('・')) return kana.split('・').map((k) => entryRomaji(k, pos)).join(' ');
  const has = (p) => pos.includes(p);
  if (has('prt') && PARTICLE[kana]) return PARTICLE[kana];
  if (WA_END.test(kana) && (has('exp') || has('conj') || has('int') || has('adv') || has('prt'))) {
    return entryRomaji(kana.slice(0, -1), []) + 'wa';
  }
  if ((has('v5u') || has('v5u-s')) && kana.length > 1 && kana.endsWith('う')) {
    return kanaToHepburn(kana.slice(0, -1)) + 'u';
  }
  return kanaToHepburn(kana);
}
