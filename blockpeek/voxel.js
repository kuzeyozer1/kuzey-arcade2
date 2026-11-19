// Block Peek: block storage and mesh building (turns blocks into triangles). No page needed, so it can be tested.
import { appearance, ATLAS_TILES } from "./blocks.js";

const SY0 = 8; // sub-chunk y offset (worlds go down to y -64 = sub-chunk -4; the Nether/End and old worlds start at 0)
export class Vox {
  constructor(atlas, java = false) {
    this.sub = new Map(); this.atlas = atlas; this.java = java;
    this.pal = [{ name: "air" }]; this.palMap = new Map([["air", 0]]);
    this.info = [{ shape: "none" }];
    this.minY = 1e9; this.maxY = -1e9;
  }
  id(name, states = {}) {
    name = String(name).replace(/^minecraft:/, "");
    const st = states || {};
    const key = name + "|" + Object.keys(st).sort().filter(k => typeof st[k] !== "object").map(k => k + "=" + st[k]).join(",");
    let i = this.palMap.get(key); if (i !== undefined) return i;
    let a = appearance(name, st, this.java);
    const cu = this.custom && this.custom.get(name);
    if (cu) a = { shape: "cube", mat: "cut", occl: true, cu };
    if (a.shape === "none") { this.palMap.set(key, 0); return 0; }
    if (a.shape === "slab" && (st.top_slot_bit === 1 || st.top_slot_bit === true || st["minecraft:vertical_half"] === "top" || st.type === "top")) a.shape = "slabTop";
    i = this.pal.length; this.pal.push({ name, states: st }); this.palMap.set(key, i);
    if (a.cu && this.atlas) { a.tT = a.tB = this.atlas.tileFromImage(name + "#top", a.cu.top); a.tS = this.atlas.tileFromImage(name + "#side", a.cu.side); }
    else if (this.atlas) { a.tT = this.atlas.tile(a.top); a.tB = this.atlas.tile(a.bottom); a.tS = this.atlas.tile(a.side); }
    this.info.push(a);
    return i;
  }
  k(sx, sy, sz) { return ((sx + 4096) * 64 + (sy + SY0)) * 8192 + (sz + 4096); }
  getSub(sx, sy, sz) { return this.sub.get(this.k(sx, sy, sz)); }
  setSub(sx, sy, sz, arr) { this.sub.set(this.k(sx, sy, sz), arr); this.minY = Math.min(this.minY, sy * 16); this.maxY = Math.max(this.maxY, sy * 16 + 15); }
  get(x, y, z) { const a = this.sub.get(this.k(x >> 4, y >> 4, z >> 4)); return a ? a[((x & 15) << 8) | ((z & 15) << 4) | (y & 15)] : 0; }
  set(x, y, z, id) {
    const sx = x >> 4, sy = y >> 4, sz = z >> 4; let a = this.getSub(sx, sy, sz);
    if (!a) { if (!id) return; a = new Uint16Array(4096); this.setSub(sx, sy, sz, a); }
    a[((x & 15) << 8) | ((z & 15) << 4) | (y & 15)] = id;
  }
  // a decoded Bedrock sub-chunk -> our ids
  putSubChunk(sx, sy, sz, sc) {
    const L0 = sc.layers[0]; if (!L0) return;
    const lut = L0.pal.map(p => this.id(p.name || "air", p.states));
    if (lut.every(v => v === 0)) { const L1 = sc.layers[1]; if (!L1 || L1.pal.every(p => !/water/.test(p.name || ""))) return; }
    const a = new Uint16Array(4096), idx = L0.idx;
    for (let i = 0; i < 4096; i++) a[i] = lut[idx[i]] || 0;
    const L1 = sc.layers[1];
    if (L1) {
      const lw = L1.pal.map(p => /water/.test(p.name || "") ? this.id("water") : 0);
      if (lw.some(v => v)) for (let i = 0; i < 4096; i++) if (a[i] === 0 && lw[L1.idx[i]]) a[i] = lw[L1.idx[i]];
    }
    this.setSub(sx, sy, sz, a);
  }
  // columns of sub-chunks: Map "sx,sz" -> [sx, sz]
  columns() { const m = new Map(); for (const k of this.sub.keys()) { const sz = (k % 8192) - 4096, rest = Math.floor(k / 8192), sx = Math.floor(rest / 64) - 4096; m.set(sx + "," + sz, [sx, sz]); } return m; }
  // the highest block at x,z (for finding the ground)
  top(x, z) { for (let y = this.maxY; y >= this.minY; y--) { const id = this.get(x, y, z); if (id && this.info[id].shape !== "liquid" && this.info[id].shape !== "cross") return y; } return null; }
}

/* ---------------- meshing ---------------- */
// faces: +x -x +y -y +z -z
const FACES = [
  { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.75 },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.75 },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0 },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.55 },
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.88 },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.88 },
];
const AO = [1, 0.82, 0.68, 0.55];
class Buf {
  constructor() { this.p = []; this.u = []; this.c = []; this.i = []; this.n = 0; }
  quad(ps, uvs, cols) {
    const n = this.n; for (let k = 0; k < 4; k++) { this.p.push(ps[k][0], ps[k][1], ps[k][2]); this.u.push(uvs[k][0], uvs[k][1]); this.c.push(cols[k], cols[k], cols[k]); }
    // flip the quad when it makes the shading look smoother
    if (cols[0] + cols[2] < cols[1] + cols[3]) this.i.push(n + 1, n + 2, n + 3, n + 1, n + 3, n); else this.i.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }
  out() { return this.n ? { pos: new Float32Array(this.p), uv: new Float32Array(this.u), col: new Float32Array(this.c), idx: this.n > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i) } : null; }
}
function tileUV(t, u0, v0, u1, v1) {
  const T = ATLAS_TILES, e = 0.02, tx = (t % T), ty = Math.floor(t / T);
  const U = a => (tx + e + a * (1 - 2 * e)) / T, V = b => (ty + e + b * (1 - 2 * e)) / T;
  return [U(u0), V(v0), U(u1), V(v1)];
}

// Builds the triangles for one column of sub-chunks (sx, sz). Returns {solid, cut, liquid} buffers.
export function meshColumn(vox, sx, sz) {
  const B = { solid: new Buf(), cut: new Buf(), liquid: new Buf() };
  const info = vox.info, occl = info.map(a => a.occl ? 1 : 0);
  const S = 18, pad = new Uint16Array(S * S * S);
  const P = (x, y, z) => ((x + 1) * S + (z + 1)) * S + (y + 1);
  for (let sy = vox.minY >> 4; sy <= vox.maxY >> 4; sy++) {
    const a = vox.getSub(sx, sy, sz); if (!a) continue;
    const X0 = sx * 16, Y0 = sy * 16, Z0 = sz * 16;
    // copy blocks + a 1 block border into pad
    for (let x = -1; x <= 16; x++) for (let z = -1; z <= 16; z++) for (let y = -1; y <= 16; y++) {
      const inside = x >= 0 && x < 16 && y >= 0 && y < 16 && z >= 0 && z < 16;
      pad[P(x, y, z)] = inside ? a[(x << 8) | (z << 4) | y] : ((x === -1 || x === 16) + (y === -1 || y === 16) + (z === -1 || z === 16) > 0 ? vox.get(X0 + x, Y0 + y, Z0 + z) : 0);
    }
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 16; y++) {
      const id = pad[P(x, y, z)]; if (!id) continue;
      const A = info[id], wx = X0 + x, wy = Y0 + y, wz = Z0 + z;
      const nb = f => pad[P(x + FACES[f].d[0], y + FACES[f].d[1], z + FACES[f].d[2])];
      if (A.shape === "cube") {
        const buf = A.mat === "cut" ? B.cut : B.solid;
        for (let f = 0; f < 6; f++) {
          const n = nb(f); if (occl[n]) continue; if (n === id && (A.glass || A.mat === "cut" && !A.leaves)) continue; if (A.leaves && n === id && f !== 2) continue;
          const t = f === 2 ? A.tT : f === 3 ? A.tB : A.tS;
          const F = FACES[f], [u0, v0, u1, v1] = tileUV(t, 0, 0, 1, 1);
          const ps = [], cs = [];
          for (let k = 0; k < 4; k++) {
            const c = F.c[k]; ps.push([wx + c[0], wy + c[1], wz + c[2]]);
            // ambient occlusion: look at the 3 blocks touching this corner, on the side the face points to
            const ox = x + F.d[0], oy = y + F.d[1], oz = z + F.d[2];
            const dir = [c[0] * 2 - 1, c[1] * 2 - 1, c[2] * 2 - 1];
            const ax = F.d[0] ? [0, dir[1], 0] : [dir[0], 0, 0], bx = F.d[2] ? [0, dir[1], 0] : [0, 0, dir[2]];
            const s1 = occl[pad[P(ox + ax[0], oy + ax[1], oz + ax[2])]], s2 = occl[pad[P(ox + bx[0], oy + bx[1], oz + bx[2])]];
            const cr = occl[pad[P(ox + ax[0] + bx[0], oy + ax[1] + bx[1], oz + ax[2] + bx[2])]];
            const ao = s1 && s2 ? 3 : s1 + s2 + cr;
            cs.push(F.s * AO[ao]);
          }
          const uv = f === 2 || f === 3 ? [[u0, v1], [u1, v1], [u1, v0], [u0, v0]] : [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
          buf.quad(ps, uv, cs);
        }
      } else if (A.shape === "liquid") {
        const above = pad[P(x, y + 1, z)], top = info[above].liq === A.liq ? 1 : 0.875;
        for (let f = 0; f < 6; f++) {
          const n = nb(f), NI = info[n]; if (occl[n] || NI.liq === A.liq) continue;
          if (f !== 2 && NI.shape === "cube" && NI.mat === "solid") continue;
          box(B.liquid, wx, wy, wz, 0, 0, 0, 1, top, 1, A, 1 << f, 1);
        }
      } else if (A.shape === "cross") {
        const [u0, v0, u1, v1] = tileUV(A.tS, 0, 0, 1, 1), uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
        const lo = 0.15, hi = 0.85;
        B.cut.quad([[wx + lo, wy, wz + lo], [wx + hi, wy, wz + hi], [wx + hi, wy + 1, wz + hi], [wx + lo, wy + 1, wz + lo]], uv, [0.9, 0.9, 0.9, 0.9]);
        B.cut.quad([[wx + lo, wy, wz + hi], [wx + hi, wy, wz + lo], [wx + hi, wy + 1, wz + lo], [wx + lo, wy + 1, wz + hi]], uv, [0.9, 0.9, 0.9, 0.9]);
      } else {
        // boxes: slabs, carpets, fences, walls, panes, stairs
        const buf = A.mat === "cut" ? B.cut : B.solid, cull = f => !occl[nb(f)];
        let mask = 0; for (let f = 0; f < 6; f++) if (cull(f)) mask |= 1 << f;
        const st = vox.pal[id].states || {};
        switch (A.shape) {
          case "slab": case "slabTop": {
            const top = A.shape === "slabTop";
            box(buf, wx, wy, wz, 0, top ? 0.5 : 0, 0, 1, top ? 1 : 0.5, 1, A, mask | (top ? 8 : 4)); break;
          }
          case "slab9": box(buf, wx, wy, wz, 0, 0, 0, 1, 9 / 16, 1, A, mask | 4); break;
          case "slab15": box(buf, wx, wy, wz, 0, 0, 0, 1, 15 / 16, 1, A, mask | 4); break;
          case "thin": box(buf, wx, wy, wz, 0, 0, 0, 1, A.h || 1 / 16, 1, A, mask | 4); break;
          case "post": { const w = A.w || 0.125; box(buf, wx, wy, wz, 0.5 - w, 0, 0.5 - w, 0.5 + w, 1, 0.5 + w, A, 63); break; }
          case "pane": box(buf, wx, wy, wz, 0.4375, 0, 0, 0.5625, 1, 1, A, 63); box(buf, wx, wy, wz, 0, 0, 0.4375, 1, 1, 0.5625, A, 63); break;
          case "thinwall": box(buf, wx, wy, wz, 0, 0, 0.88, 1, 1, 0.94, A, 63); break;
          case "stairs": {
            const up = st.upside_down_bit === 1 || st.upside_down_bit === true || st.half === "top";
            const dir = st.weirdo_direction !== undefined ? ["e", "w", "s", "n"][st.weirdo_direction] : ({ east: "e", west: "w", south: "s", north: "n" })[st.facing] || "n";
            box(buf, wx, wy, wz, 0, up ? 0.5 : 0, 0, 1, up ? 1 : 0.5, 1, A, mask | (up ? 8 : 4));
            const [x0, z0, x1, z1] = { e: [0.5, 0, 1, 1], w: [0, 0, 0.5, 1], s: [0, 0.5, 1, 1], n: [0, 0, 1, 0.5] }[dir];
            box(buf, wx, wy, wz, x0, up ? 0 : 0.5, z0, x1, up ? 0.5 : 1, z1, A, 63);
            break;
          }
          default: box(buf, wx, wy, wz, 0, 0, 0, 1, 1, 1, A, mask);
        }
      }
    }
  }
  return { solid: B.solid.out(), cut: B.cut.out(), liquid: B.liquid.out() };
}
// a box inside a block (numbers from 0 to 1). mask: which faces to draw (bit per face)
function box(buf, wx, wy, wz, x0, y0, z0, x1, y1, z1, A, mask, liquid) {
  for (let f = 0; f < 6; f++) {
    if (!(mask & (1 << f))) continue;
    const F = FACES[f], t = f === 2 ? A.tT : f === 3 ? A.tB : A.tS;
    const ps = F.c.map(c => [wx + (c[0] ? x1 : x0), wy + (c[1] ? y1 : y0), wz + (c[2] ? z1 : z0)]);
    let uv;
    if (f === 2 || f === 3) { const [u0, v0, u1, v1] = tileUV(t, x0, z0, x1, z1); uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]; }
    else { const a0 = f < 2 ? z0 : x0, a1 = f < 2 ? z1 : x1; const [u0, v0, u1, v1] = tileUV(t, a0, 1 - y1, a1, 1 - y0); uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]; }
    const s = liquid ? 0.6 + F.s * 0.4 : F.s;
    buf.quad(ps, uv, [s, s, s, s]);
  }
}
