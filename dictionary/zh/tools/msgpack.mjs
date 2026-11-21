export function decodeMsgpack(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const utf8 = new TextDecoder('utf-8');
  let pos = 0;
  const str = (n) => { const s = utf8.decode(buf.subarray(pos, pos + n)); pos += n; return s; };
  const bin = (n) => { const b = buf.subarray(pos, pos + n); pos += n; return b; };
  const arr = (n) => { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = read(); return a; };
  const map = (n) => { const m = {}; for (let i = 0; i < n; i++) { const k = read(); m[k] = read(); } return m; };
  function read() {
    const t = buf[pos++];
    if (t <= 0x7f) return t;
    if (t >= 0xe0) return t - 0x100;
    if ((t & 0xf0) === 0x80) return map(t & 0x0f);
    if ((t & 0xf0) === 0x90) return arr(t & 0x0f);
    if ((t & 0xe0) === 0xa0) return str(t & 0x1f);
    let v;
    switch (t) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;
      case 0xc4: v = buf[pos]; pos += 1; return bin(v);
      case 0xc5: v = view.getUint16(pos); pos += 2; return bin(v);
      case 0xc6: v = view.getUint32(pos); pos += 4; return bin(v);
      case 0xca: v = view.getFloat32(pos); pos += 4; return v;
      case 0xcb: v = view.getFloat64(pos); pos += 8; return v;
      case 0xcc: return buf[pos++];
      case 0xcd: v = view.getUint16(pos); pos += 2; return v;
      case 0xce: v = view.getUint32(pos); pos += 4; return v;
      case 0xcf: v = Number(view.getBigUint64(pos)); pos += 8; return v;
      case 0xd0: v = view.getInt8(pos); pos += 1; return v;
      case 0xd1: v = view.getInt16(pos); pos += 2; return v;
      case 0xd2: v = view.getInt32(pos); pos += 4; return v;
      case 0xd3: v = Number(view.getBigInt64(pos)); pos += 8; return v;
      case 0xd9: v = buf[pos]; pos += 1; return str(v);
      case 0xda: v = view.getUint16(pos); pos += 2; return str(v);
      case 0xdb: v = view.getUint32(pos); pos += 4; return str(v);
      case 0xdc: v = view.getUint16(pos); pos += 2; return arr(v);
      case 0xdd: v = view.getUint32(pos); pos += 4; return arr(v);
      case 0xde: v = view.getUint16(pos); pos += 2; return map(v);
      case 0xdf: v = view.getUint32(pos); pos += 4; return map(v);
      default: throw new Error(`msgpack: unsupported type byte 0x${t.toString(16)} at ${pos - 1}`);
    }
  }
  const value = read();
  if (pos !== buf.length) throw new Error(`msgpack: ${buf.length - pos} trailing bytes`);
  return value;
}
