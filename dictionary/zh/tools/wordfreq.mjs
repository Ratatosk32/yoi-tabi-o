import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { decodeMsgpack } from './msgpack.mjs';

export function readWordfreq(path) {
  const data = decodeMsgpack(gunzipSync(readFileSync(path)));
  if (!Array.isArray(data) || !data[0] || data[0].format !== 'cB') throw new Error('wordfreq: unexpected file header');
  const zipf = new Map();
  for (let i = 1; i < data.length; i++) {
    const value = 9 - (i - 1) / 100;
    for (const word of data[i]) if (typeof word === 'string' && !zipf.has(word)) zipf.set(word, value);
  }
  return { zipf, header: data[0] };
}
