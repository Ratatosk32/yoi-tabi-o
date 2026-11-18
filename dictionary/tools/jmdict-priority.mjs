// Reads priority tags (ke_pri / re_pri: news1/2, ichi1/2, spec1/2, gai1/2, nfXX) from the
// original EDRDG JMdict_e(.gz) XML. jmdict-simplified only keeps a boolean "common" flag, so the
// ranking joins these tags back by JMdict id (ent_seq).
// The XML is treated as plain data: it is parsed with regular expressions, nothing in it is executed
// and no external entities / DTD are resolved.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/**
 * @param {string} path JMdict_e or JMdict_e.gz
 * @returns {Map<string, {k: Map<string,string[]>, r: Map<string,string[]>}>} only entries with any priority tag
 */
export function readPriority(path) {
  let buf = readFileSync(path);
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  const xml = buf.toString('utf8');
  const out = new Map();
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  let m;
  while ((m = entryRe.exec(xml))) {
    const body = m[1];
    if (!body.includes('_pri>')) continue;
    const id = /<ent_seq>(\d+)<\/ent_seq>/.exec(body)?.[1];
    if (!id) continue;
    const rec = { k: new Map(), r: new Map() };
    for (const [, blk] of body.matchAll(/<k_ele>([\s\S]*?)<\/k_ele>/g)) {
      const text = unesc(/<keb>([^<]*)<\/keb>/.exec(blk)?.[1] ?? '');
      const pri = [...blk.matchAll(/<ke_pri>([^<]*)<\/ke_pri>/g)].map((x) => x[1]);
      if (text && pri.length) rec.k.set(text, pri);
    }
    for (const [, blk] of body.matchAll(/<r_ele>([\s\S]*?)<\/r_ele>/g)) {
      const text = unesc(/<reb>([^<]*)<\/reb>/.exec(blk)?.[1] ?? '');
      const pri = [...blk.matchAll(/<re_pri>([^<]*)<\/re_pri>/g)].map((x) => x[1]);
      if (text && pri.length) rec.r.set(text, pri);
    }
    out.set(id, rec);
  }
  return out;
}
