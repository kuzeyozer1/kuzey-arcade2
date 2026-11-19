// Block Peek file readers: NBT, Bedrock world database (LevelDB), sub-chunks, .mcstructure, .litematic, TGA.
// Pure code (no page needed), so it can be tested outside the browser. The zip library is passed in with setZip().
let Z = null;
export function setZip(z) { Z = z; }
const td = new TextDecoder();

/* ---------------- NBT ---------------- */
export function readNBT(u8, little = true, off = 0) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let o = off;
  const str = () => { const n = dv.getUint16(o, little); o += 2; const s = td.decode(u8.subarray(o, o + n)); o += n; return s; };
  function pay(t) {
    switch (t) {
      case 1: return dv.getInt8(o++);
      case 2: { const v = dv.getInt16(o, little); o += 2; return v; }
      case 3: { const v = dv.getInt32(o, little); o += 4; return v; }
      case 4: { const v = dv.getBigInt64(o, little); o += 8; return v; }
      case 5: { const v = dv.getFloat32(o, little); o += 4; return v; }
      case 6: { const v = dv.getFloat64(o, little); o += 8; return v; }
      case 7: { const n = dv.getInt32(o, little); o += 4; const a = u8.slice(o, o + n); o += n; return a; }
      case 8: return str();
      case 9: { const tt = u8[o++]; const n = dv.getInt32(o, little); o += 4; const a = new Array(Math.max(0, n)); for (let i = 0; i < n; i++) a[i] = pay(tt); return a; }
      case 10: { const obj = {}; for (;;) { const tt = u8[o++]; if (tt === 0 || tt === undefined) break; const k = str(); obj[k] = pay(tt); } return obj; }
      case 11: { const n = dv.getInt32(o, little); o += 4; const a = new Int32Array(n); for (let i = 0; i < n; i++) { a[i] = dv.getInt32(o, little); o += 4; } return a; }
      case 12: { const n = dv.getInt32(o, little); o += 4; const a = new BigInt64Array(n); for (let i = 0; i < n; i++) { a[i] = dv.getBigInt64(o, little); o += 8; } return a; }
      default: throw new Error("Bad NBT tag " + t + " at " + (o - 1));
    }
  }
  const t = u8[o++]; const name = str(); const value = pay(t);
  return { name, value, end: o };
}
// level.dat has an 8 byte header before the NBT
export function readLevelDat(u8) { return readNBT(u8, true, 8).value; }

/* ---------------- LevelDB (the world's db folder) ---------------- */
function varint(u8, p) { let r = 0, s = 1, b; do { b = u8[p.o++]; r += (b & 0x7f) * s; s *= 128; } while (b & 0x80); return r; }
function snappy(src) {
  const p = { o: 0 }; const n = varint(src, p); const out = new Uint8Array(n); let op = 0;
  while (p.o < src.length) {
    const t = src[p.o++], kind = t & 3;
    if (kind === 0) {
      let len = t >> 2;
      if (len >= 60) { const nb = len - 59; len = 0; for (let i = 0; i < nb; i++) len += src[p.o++] * 2 ** (8 * i); }
      len += 1; out.set(src.subarray(p.o, p.o + len), op); p.o += len; op += len;
    } else {
      let len, off;
      if (kind === 1) { len = ((t >> 2) & 7) + 4; off = ((t >> 5) << 8) | src[p.o++]; }
      else if (kind === 2) { len = (t >> 2) + 1; off = src[p.o] | (src[p.o + 1] << 8); p.o += 2; }
      else { len = (t >> 2) + 1; off = (src[p.o] | (src[p.o + 1] << 8) | (src[p.o + 2] << 16)) + src[p.o + 3] * 16777216; p.o += 4; }
      for (let i = 0; i < len; i++) { out[op] = out[op - off]; op++; }
    }
  }
  return out;
}
function decompress(raw, type) {
  if (type === 0) return raw;
  if (type === 1) return snappy(raw);
  if (type === 2) return Z.unzlibSync(raw);
  if (type === 4) return Z.inflateSync(raw);
  throw new Error("Unknown compression " + type);
}
function blockEntries(blk, cb) {
  const dv = new DataView(blk.buffer, blk.byteOffset, blk.byteLength);
  const nr = dv.getUint32(blk.length - 4, true), end = blk.length - 4 - 4 * nr;
  const p = { o: 0 }; let key = new Uint8Array(0);
  while (p.o < end) {
    const shared = varint(blk, p), ns = varint(blk, p), vl = varint(blk, p);
    const k = new Uint8Array(shared + ns); k.set(key.subarray(0, shared)); k.set(blk.subarray(p.o, p.o + ns), shared); p.o += ns;
    key = k; cb(k, p.o, vl); p.o += vl;
  }
}
const latin1 = u8 => { let s = ""; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return s; };

export class LevelDB {
  constructor(files /* [[name, Uint8Array]] */) {
    this.files = []; this.index = new Map(); this.cache = new Map(); this.errors = [];
    for (const [name, data] of files) {
      const fi = this.files.length; this.files.push(data);
      try {
        if (/\.(ldb|sst)$/.test(name)) this.scanTable(fi, data);
        else if (/\.log$/.test(name)) this.scanLog(data);
      } catch (e) { this.errors.push(name + ": " + e.message); }
    }
  }
  put(ukey, seq, del, ref) {
    const k = latin1(ukey), old = this.index.get(k);
    if (!old || old.seq <= seq) { ref.seq = seq; ref.del = del; this.index.set(k, ref); }
  }
  block(fi, bo, bs) {
    const ck = fi * 4294967296 + bo; let b = this.cache.get(ck);
    if (b) { this.cache.delete(ck); this.cache.set(ck, b); return b; }
    const f = this.files[fi]; b = decompress(f.subarray(bo, bo + bs), f[bo + bs]);
    this.cache.set(ck, b); if (this.cache.size > 96) this.cache.delete(this.cache.keys().next().value);
    return b;
  }
  scanTable(fi, f) {
    const L = f.length; if (L < 48) return;
    const p = { o: L - 48 }; varint(f, p); varint(f, p); const io = varint(f, p), is = varint(f, p);
    const idx = decompress(f.subarray(io, io + is), f[io + is]);
    blockEntries(idx, (k, vo) => {
      const q = { o: vo }; const bo = varint(idx, q), bs = varint(idx, q);
      const blk = this.block(fi, bo, bs);
      blockEntries(blk, (key, o2, l2) => {
        const n = key.length; let seq = 0; for (let i = 6; i >= 0; i--) seq = seq * 256 + key[n - 7 + i];
        this.put(key.subarray(0, n - 8), seq, key[n - 8] === 0, { f: fi, bo, bs, vo: o2, vl: l2 });
      });
    });
  }
  scanLog(f) {
    let o = 0, cur = null; const BS = 32768;
    const batch = b => {
      let seq = 0; for (let i = 7; i >= 0; i--) seq = seq * 256 + b[i];
      const n = b[8] | (b[9] << 8) | (b[10] << 16) | (b[11] << 24); const p = { o: 12 };
      for (let i = 0; i < n && p.o < b.length; i++) {
        const tag = b[p.o++], kl = varint(b, p), key = b.subarray(p.o, p.o + kl); p.o += kl;
        if (tag === 1) { const vl = varint(b, p); this.put(key, seq + i, false, { buf: b.subarray(p.o, p.o + vl) }); p.o += vl; }
        else this.put(key, seq + i, true, {});
      }
    };
    while (o + 7 <= f.length) {
      const left = BS - (o % BS); if (left < 7) { o += left; continue; }
      const len = f[o + 4] | (f[o + 5] << 8), type = f[o + 6];
      if (type === 0 || o + 7 + len > f.length) { o += left; continue; }
      const data = f.subarray(o + 7, o + 7 + len); o += 7 + len;
      if (type === 1) batch(data);
      else if (type === 2) cur = [data];
      else if (type === 3) { if (cur) cur.push(data); }
      else if (type === 4 && cur) { cur.push(data); const t = new Uint8Array(cur.reduce((a, c) => a + c.length, 0)); let q = 0; for (const c of cur) { t.set(c, q); q += c.length; } batch(t); cur = null; }
    }
  }
  get(k) {
    const r = this.index.get(k); if (!r || r.del) return null;
    if (r.buf) return r.buf;
    return this.block(r.f, r.bo, r.bs).subarray(r.vo, r.vo + r.vl);
  }
  // all saved sub-chunks: Map "dim" -> Map "cx,cz" -> [cx, cz, [sub-chunk y...]]
  chunks() {
    const dims = new Map();
    for (const [k, r] of this.index) {
      if (r.del) continue;
      const n = k.length; if ((n !== 10 && n !== 14) || k.charCodeAt(n - 2) !== 47) continue;
      const i32 = o => (k.charCodeAt(o) | (k.charCodeAt(o + 1) << 8) | (k.charCodeAt(o + 2) << 16) | (k.charCodeAt(o + 3) << 24));
      const cx = i32(0), cz = i32(4), dim = n === 14 ? i32(8) : 0, sy = (k.charCodeAt(n - 1) << 24) >> 24;
      if (!dims.has(dim)) dims.set(dim, new Map());
      const m = dims.get(dim), ck = cx + "," + cz;
      if (!m.has(ck)) m.set(ck, [cx, cz, []]);
      m.get(ck)[2].push(sy);
    }
    return dims;
  }
}
export function subChunkKey(cx, cz, dim, sy) {
  const b = []; const w = v => { b.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255); };
  w(cx); w(cz); if (dim) w(dim); b.push(47, sy & 255);
  return String.fromCharCode(...b);
}

/* ---------------- sub-chunks (16x16x16 blocks) ---------------- */
// Old worlds used number IDs. These are the common ones.
const LEGACY = { 0: "air", 1: "stone", 2: "grass_block", 3: "dirt", 4: "cobblestone", 5: "oak_planks", 6: "oak_sapling", 7: "bedrock", 8: "water", 9: "water", 10: "lava", 11: "lava", 12: "sand", 13: "gravel", 14: "gold_ore", 15: "iron_ore", 16: "coal_ore", 17: "oak_log", 18: "oak_leaves", 19: "sponge", 20: "glass", 21: "lapis_ore", 22: "lapis_block", 24: "sandstone", 31: "short_grass", 32: "deadbush", 35: "white_wool", 37: "dandelion", 38: "poppy", 39: "brown_mushroom", 40: "red_mushroom", 41: "gold_block", 42: "iron_block", 43: "smooth_stone", 44: "smooth_stone_slab", 45: "brick_block", 46: "tnt", 47: "bookshelf", 48: "mossy_cobblestone", 49: "obsidian", 50: "torch", 53: "oak_stairs", 54: "chest", 56: "diamond_ore", 57: "diamond_block", 58: "crafting_table", 59: "wheat", 60: "farmland", 61: "furnace", 64: "wooden_door", 65: "ladder", 66: "rail", 67: "stone_stairs", 73: "redstone_ore", 78: "snow_layer", 79: "ice", 80: "snow", 81: "cactus", 82: "clay", 83: "reeds", 85: "oak_fence", 86: "pumpkin", 87: "netherrack", 88: "soul_sand", 89: "glowstone", 98: "stone_bricks", 102: "glass_pane", 103: "melon_block", 106: "vine", 107: "fence_gate", 108: "brick_stairs", 109: "stone_brick_stairs", 110: "mycelium", 111: "waterlily", 112: "nether_brick", 121: "end_stone", 125: "double_wooden_slab", 126: "wooden_slab", 129: "emerald_ore", 133: "emerald_block", 141: "carrots", 142: "potatoes", 152: "redstone_block", 155: "quartz_block", 159: "white_terracotta", 161: "acacia_leaves", 162: "acacia_log", 170: "hay_block", 171: "white_carpet", 172: "hardened_clay", 173: "coal_block", 174: "packed_ice", 175: "sunflower", 179: "red_sandstone", 243: "podzol" };
export function decodeSubChunk(b) {
  const ver = b[0];
  if (ver !== 1 && ver !== 8 && ver !== 9) {
    // very old format: 4096 block numbers
    if (b.length < 4097) return { layers: [] };
    const idx = new Uint16Array(4096), pal = [], map = new Map();
    for (let i = 0; i < 4096; i++) { const id = b[1 + i]; if (!map.has(id)) { map.set(id, pal.length); pal.push({ name: LEGACY[id] || "unknown_" + id }); } idx[i] = map.get(id); }
    return { layers: [{ idx, pal }] };
  }
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 1, n = 1;
  if (ver !== 1) { n = b[1]; o = ver === 9 ? 3 : 2; }
  const layers = [];
  for (let s = 0; s < n && o < b.length; s++) {
    const h = b[o++], bits = h >> 1, idx = new Uint16Array(4096);
    if (bits > 0 && bits <= 16) {
      const per = Math.floor(32 / bits), words = Math.ceil(4096 / per), mask = (1 << bits) - 1;
      let i = 0;
      for (let w = 0; w < words; w++) { let word = dv.getUint32(o + w * 4, true); for (let j = 0; j < per && i < 4096; j++) { idx[i++] = word & mask; word >>>= bits; } }
      o += words * 4;
    } else if (bits !== 0) break;
    let palN;
    if (bits === 0 && b[o] === 0x0a) palN = 1; else { palN = dv.getInt32(o, true); o += 4; }
    const pal = [];
    for (let i = 0; i < palN; i++) { const r = readNBT(b, true, o); o = r.end; pal.push(r.value); }
    layers.push({ idx, pal });
  }
  return { layers };
}

/* ---------------- .mcstructure ---------------- */
export function readStructure(u8) {
  const r = readNBT(u8, true).value;
  const [sx, sy, sz] = r.size.map(Number);
  const st = r.structure || {}, lay = (st.block_indices || [])[0] || [], lay2 = (st.block_indices || [])[1] || [];
  const pal = ((st.palette || {}).default || {}).block_palette || [];
  return { sx, sy, sz, pal, at: (x, y, z) => lay[(x * sy + y) * sz + z], water: (x, y, z) => lay2[(x * sy + y) * sz + z], entities: (st.entities || []).length };
}

/* ---------------- .litematic (Java schematics) ---------------- */
export function readLitematic(u8) {
  const raw = (u8[0] === 0x1f && u8[1] === 0x8b) ? Z.gunzipSync(u8) : u8;
  const r = readNBT(raw, false).value;
  const regions = [];
  for (const [name, g] of Object.entries(r.Regions || {})) {
    const P = g.Position, S = g.Size;
    const ax = Math.abs(S.x), ay = Math.abs(S.y), az = Math.abs(S.z);
    const pal = (g.BlockStatePalette || []).map(e => ({ name: e.Name, states: e.Properties || {} }));
    const bits = Math.max(2, Math.ceil(Math.log2(pal.length))), mask = (1n << BigInt(bits)) - 1n, arr = g.BlockStates || new BigInt64Array(0);
    const total = ax * ay * az, out = new Uint16Array(total);
    for (let i = 0; i < total; i++) {
      const sb = i * bits, sl = Math.floor(sb / 64), el = Math.floor((sb + bits - 1) / 64), so = BigInt(sb % 64);
      let v = BigInt.asUintN(64, arr[sl] || 0n) >> so;
      if (sl !== el) v |= BigInt.asUintN(64, arr[el] || 0n) << (64n - so);
      out[i] = Number(v & mask);
    }
    const ox = P.x + (S.x < 0 ? S.x + 1 : 0), oy = P.y + (S.y < 0 ? S.y + 1 : 0), oz = P.z + (S.z < 0 ? S.z + 1 : 0);
    regions.push({ name, ox, oy, oz, ax, ay, az, pal, at: (x, y, z) => out[(y * az + z) * ax + x] });
  }
  const m = r.Metadata || {};
  return { name: m.Name || "Schematic", author: m.Author || "", regions, java: true };
}

/* ---------------- TGA images (some packs use them) ---------------- */
export function decodeTGA(u8) {
  const idLen = u8[0], type = u8[2], w = u8[12] | (u8[13] << 8), h = u8[14] | (u8[15] << 8), bpp = u8[16], desc = u8[17];
  const px = bpp / 8, out = new Uint8ClampedArray(w * h * 4); let o = 18 + idLen + (u8[1] ? (u8[5] | (u8[6] << 8)) * (u8[7] / 8) : 0);
  const n = w * h; let i = 0;
  const put = q => { out[i * 4] = u8[q + 2]; out[i * 4 + 1] = u8[q + 1]; out[i * 4 + 2] = u8[q]; out[i * 4 + 3] = px === 4 ? u8[q + 3] : 255; i++; };
  if (type === 2) { for (; i < n;) { put(o); o += px; } }
  else if (type === 10) {
    while (i < n && o < u8.length) { const c = u8[o++], cnt = (c & 127) + 1; if (c & 128) { for (let k = 0; k < cnt; k++) put(o); o += px; } else for (let k = 0; k < cnt; k++) { put(o); o += px; } }
  } else return null;
  if (!(desc & 32)) { // stored bottom to top: flip
    const row = w * 4, tmp = new Uint8ClampedArray(row);
    for (let y = 0; y < h >> 1; y++) { const a = y * row, b = (h - 1 - y) * row; tmp.set(out.subarray(a, a + row)); out.copyWithin(a, b, b + row); out.set(tmp, b); }
  }
  return { w, h, data: out };
}

/* ---------------- zip helpers ---------------- */
// Opens a zip (and zips inside it, like .mcpack files inside an .mcaddon). Returns [[path, Uint8Array]].
export function unzipAll(u8, prefix = "", depth = 0) {
  const files = Z.unzipSync(u8);
  const out = [];
  for (const [p, d] of Object.entries(files)) {
    if (p.endsWith("/") || p.startsWith("__MACOSX")) continue;
    if (depth < 2 && /\.(mcpack|mcaddon|zip|mcworld|mctemplate)$/i.test(p)) {
      try { out.push(...unzipAll(d, prefix + p.replace(/\.[^.]+$/, "") + "/", depth + 1)); continue; } catch (e) { /* not a zip */ }
    }
    out.push([prefix + p, d]);
  }
  return out;
}
// Minecraft JSON files may have comments and trailing commas
export function looseJSON(u8) {
  let s = typeof u8 === "string" ? u8 : td.decode(u8);
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  try { return JSON.parse(s); } catch (e) { /* clean it up */ }
  let out = "", inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { out += c; if (c === "\\") { out += s[++i] || ""; } else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === "/" && s[i + 1] === "/") { while (i < s.length && s[i] !== "\n") i++; out += "\n"; continue; }
    if (c === "/" && s[i + 1] === "*") { i += 2; while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++; i++; continue; }
    out += c;
  }
  out = out.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(out);
}
export const text = u8 => td.decode(u8);
