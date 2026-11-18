// Reference search for the dictionary (pure functions, no DOM, no dependencies) - meant to be copied
// into the app as-is. `normalize` is injected: pass the app's normalize() from app/modules/text.js so
// readings and romaji fold macrons, long vowels, katakana and case exactly like the phrasebook search.
//
//   const idx = createDictIndex(core.fields, core.rows, normalize);   // core tier: ~35 ms laptop, ~150-200 ms phone
//   idx.search('kohi')  -> [{ row, tier }]  (row = the original array; read fields via idx.F)
//   // later, without blocking the UI: feed the rest tier in chunks (requestIdleCallback / setTimeout)
//   for (let i = 0; i < rest.rows.length; i += 500) idx.add(rest.rows.slice(i, i + 500)); // ~5 ms laptop / ~25 ms phone per chunk
// Rows must be added in rank order (core first, then rest) so ties sort by rank.
//
// Matching (best tier wins, ties keep dictionary rank order):
//   0 exact: headword / alt form / reading / romaji, or a whole English gloss (parenthetical notes
//     ignored) equals the query
//   1 head: the first gloss is two words ending in the query word ("rice" finds "cooked rice", "new rice")
//   2 prefix of the reading or romaji, or of a whole English gloss
//   3 prefix of any English word inside a gloss ("rice" finds "rice field", "ice cream" finds
//     "soft-serve ice cream")
//   4 Japanese query (2+ chars) found inside the headword / alt forms / reading
// Results are sorted by bucket, then rank: exact core, head core, exact rest, head rest, then tiers 2-4
// (so "rice" lists 米, 飯, 新米, ご飯 before the rarer exact matches ライス, 米穀). `tier` in a result is the
// bucket: 0 exact core, 1 head core, 2 exact rest, 3 head rest, 4 prefix, 5 word prefix, 6 Japanese substring.
// A Latin query is tried both as romaji and as English; a Japanese query against headword/reading.

// Characters treated as Japanese (hiragana, katakana, CJK); built from code points to keep the file ASCII.
const HAS_JA = new RegExp(`[${String.fromCharCode(0x3040)}-${String.fromCharCode(0x30ff)}${String.fromCharCode(0x3400)}-${String.fromCharCode(0x9fff)}]`);
const MACRON = { 'ā': 'a', 'ī': 'i', 'ū': 'u', 'ē': 'e', 'ō': 'o' };

/** Cheap English fold used for BOTH the index and the query (keeps word boundaries as spaces). */
export function foldEn(s) {
  return String(s).toLowerCase()
    .replace(/[āīūēō]/g, (c) => MACRON[c])
    .replace(/['’]/g, '')
    .replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u').replace(/aa/g, 'a').replace(/ii/g, 'i').replace(/ee/g, 'e')
    .replace(/[^a-z0-9;()À-ɏ]+/g, ' ');
}
const squeeze = (s) => s.replace(/\s+/g, ' ').trim();

export function createDictIndex(fields, rows, normalize) {
  const F = Object.fromEntries(fields.map((f, i) => [f, i]));
  const all = [], ja = [], alt = [], kana = [], romaji = [], exact = [], whole = [], spaced = [], head = [], core = [];
  let n = 0;

  function add(chunk) {
    for (const r of chunk) {
      const i = n++;
      all[i] = r;
      ja[i] = r[F.ja];
      alt[i] = r[F.alt] ? r[F.alt].split(',') : [];
      kana[i] = normalize(r[F.kana]);
      romaji[i] = normalize(r[F.romaji]);
      const ex = [], wh = [];
      let sp = '';
      for (const g of foldEn(r[F.en]).split(';')) {
        const full = squeeze(g.replace(/[()]/g, ' '));
        const bare = squeeze(g.replace(/\([^)]*\)/g, ' '));
        if (!full) continue;
        wh.push(full);
        ex.push(full);
        if (bare && bare !== full) ex.push(bare);
        sp += ' ' + full + ' ;';
      }
      exact[i] = ex; whole[i] = wh; spaced[i] = sp;
      core[i] = r[F.core] ? 1 : 0;
      const first = ex.length ? ex[ex.length > 1 && ex[1] !== wh[1] ? 1 : 0].split(' ') : [];
      head[i] = first.length === 2 ? first[1] : ''; // "cooked rice" -> rice (the noun the gloss is about)
    }
  }
  add(rows);

  function search(query, limit = 50) {
    const raw = String(query || '').trim().normalize('NFKC');
    if (!raw) return [];
    const isJa = HAS_JA.test(raw);
    const q = normalize(raw);
    const qe = squeeze(foldEn(raw).replace(/[;()]/g, ' '));
    if (!q && !qe) return [];
    const qeWord = ' ' + qe;
    const hits = [];
    for (let i = 0; i < n; i++) {
      let t = 9;
      if (isJa) {
        if (ja[i] === raw || kana[i] === q || alt[i].includes(raw)) t = 0;
        else if (kana[i].startsWith(q) || ja[i].startsWith(raw)) t = 1;
        else if (raw.length >= 2 && (ja[i].includes(raw) || kana[i].includes(q) || alt[i].some((a) => a.includes(raw)))) t = 3;
      } else {
        if (romaji[i] === q || exact[i].includes(qe)) t = 0;
        else if (qe && head[i] === qe) t = 1;
        else if (romaji[i].startsWith(q) || whole[i].some((g) => g.startsWith(qe))) t = 2;
        else if (qe && spaced[i].includes(qeWord)) t = 3;
      }
      if (isJa && t > 0) t += 1; // Japanese: no head tier (1 prefix -> 2, 3 substring -> 4)
      if (t < 9) {
        const b = t <= 1 ? t + (core[i] ? 0 : 2) : t + 2; // exact core, head core, exact rest, head rest, then 4..6
        hits.push(i * 8 + b); // pack (row, bucket); rows are already in rank order
      }
    }
    hits.sort((a, b) => (a & 7) - (b & 7) || a - b);
    return hits.slice(0, limit).map((h) => ({ row: all[h >> 3], tier: h & 7 }));
  }

  return { search, add, F, get size() { return n; } };
}
