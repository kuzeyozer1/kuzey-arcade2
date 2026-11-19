// Block Peek: open Minecraft Bedrock files and look inside, in 3D.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as fflate from "fflate";
import * as F from "./formats.js";
import { Vox, meshColumn } from "./voxel.js";
import { Atlas, paint, appearance } from "./blocks.js";
F.setZip(fflate);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sizeTxt = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const frame = () => new Promise(r => requestAnimationFrame(r));
let stT;
function status(t, ms) { const s = $("status"); clearTimeout(stT); if (!t) { s.hidden = true; return; } s.textContent = t; s.hidden = false; if (ms) stT = setTimeout(() => s.hidden = true, ms); }
const pretty = id => { const [ns, n] = String(id).includes(":") ? String(id).split(":") : ["minecraft", String(id)]; const t = n.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); return ns === "minecraft" ? t : `${t} (${ns})`; };
const jsonSafe = (k, v) => typeof v === "bigint" ? v.toString() : ArrayBuffer.isView(v) ? `[${v.length} numbers]` : v;
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", ogg: "audio/ogg", wav: "audio/wav", mp3: "audio/mpeg" };
const urls = [];
function blobURL(u8, ext) { const u = URL.createObjectURL(new Blob([u8], { type: MIME[ext] || "application/octet-stream" })); urls.push(u); return u; }
const extOf = p => (p.split(".").pop() || "").toLowerCase();

/* ---------------- home ---------------- */
{ const c = $("logo").getContext("2d"), img = c.createImageData(16, 16); paint(img.data, "grassside|#62a33a|#866043|"); c.putImageData(img, 0, 0); }
const DEMOS = [
  ["🏰", "Rock Bottom Prison", "3D preview of the whole prison", "demo/rock-bottom-prison.zip"],
  ["🌍", "Rock Bottom Prison world", ".mcworld (not played yet)", "../blockbreakout-prison.mcworld"],
  ["🧩", "Rock Bottom Prison add-on", ".mcaddon with a script", "../blockbreakout-prison.mcaddon"],
  ["🗼", "Bonjour Paris add-on", "items, recipes and an Eiffel Tower build", "../paris-pack.mcaddon"],
  ["🍔", "Food Vending Machine", ".litematic build", "../minecraft/Food_Vending_Machine_with_Farms.litematic"],
];
$("demos").innerHTML = DEMOS.map((d, i) => `<button class="demo" data-i="${i}"><span class="em">${d[0]}</span><span><b>${esc(d[1])}</b><small>${esc(d[2])}</small></span></button>`).join("");
$("demos").onclick = async e => {
  const b = e.target.closest(".demo"); if (!b) return; const d = DEMOS[+b.dataset.i];
  status("Loading " + d[1] + "…");
  try { const r = await fetch(d[3]); if (!r.ok) throw new Error(r.status); await openBytes(d[3].split("/").pop(), new Uint8Array(await r.arrayBuffer())); }
  catch (err) { status("Couldn't load it. Are you online? (" + err.message + ")", 5000); }
};
$("file").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (f) openFile(f); };
const drop = $("drop");
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) openFile(f); };
async function openFile(f) {
  status(`Opening ${f.name} (${sizeTxt(f.size)})…`); await frame();
  try { await openBytes(f.name, new Uint8Array(await f.arrayBuffer())); }
  catch (err) { console.error(err); status("Sorry, I couldn't read that file: " + err.message, 7000); }
}
function goHome() { $("doc").hidden = true; $("home").hidden = false; $("doc").innerHTML = ""; while (urls.length) URL.revokeObjectURL(urls.pop()); history.replaceState(null, "", location.pathname); }

/* ---------------- opening files ---------------- */
let DOC = null;
async function openBytes(name, u8) {
  const ext = extOf(name);
  if (u8[0] === 0x50 && u8[1] === 0x4b) {
    const files = F.unzipAll(u8);
    const lv = files.find(([p]) => /(^|\/)level\.dat$/.test(p) && p.split("/").length <= 2);
    if (lv) return openWorld(name, files, lv[0].slice(0, -9));
    if (files.some(([p]) => /(^|\/)manifest\.json$/i.test(p))) return openAddon(name, files);
    const builds = files.filter(([p]) => /\.(mcstructure|litematic)$/i.test(p));
    if (builds.length === 1 && files.length <= 3) { status(""); return openBuild(builds[0][0].split("/").pop(), builds[0][1]); }
    return openAddon(name, files);
  }
  if (ext === "mcstructure" || ext === "litematic" || ext === "mcfunction" || (u8[0] === 0x1f && u8[1] === 0x8b)) { status(""); return openBuild(name, u8); }
  if (ext === "dat") { status(""); return showText(name, JSON.stringify(F.readLevelDat(u8), jsonSafe, 2), "json"); }
  if (ext === "json") { status(""); return showText(name, F.text(u8), "json"); }
  throw new Error("this isn't a Minecraft file I know (try .mcworld, .mcaddon, .mcpack, .mcstructure or .litematic)");
}
function startDoc(name, html) {
  DOC = { name };
  $("home").hidden = true; const d = $("doc"); d.hidden = false;
  d.innerHTML = `<div class="top"><button class="btn alt small" id="docBack">← Back</button><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name)}</b></div>` + html;
  $("docBack").onclick = goHome; window.scrollTo(0, 0); status("");
  return d;
}

/* ---------------- packs (behavior + resource) ---------------- */
function parseLang(u8) { const m = {}; for (const line of F.text(u8).split(/\r?\n/)) { const i = line.indexOf("="); if (i > 0 && !line.startsWith("#")) m[line.slice(0, i).trim()] = line.slice(i + 1).split("\t#")[0].trim(); } return m; }
function scanPacks(files) {
  const roots = files.filter(([p]) => /(^|\/)manifest\.json$/i.test(p)).map(([p]) => p.slice(0, p.length - 13)).sort((a, b) => b.length - a.length);
  const packs = roots.map(root => ({ root, files: new Map() }));
  for (const [p, d] of files) { const k = packs.find(pk => p.startsWith(pk.root)); if (k) k.files.set(p.slice(k.root.length), d); }
  for (const pk of packs) {
    let m = {}; try { m = F.looseJSON(pk.files.get("manifest.json") || pk.files.get("Manifest.json")); } catch (e) { pk.bad = e.message; }
    const h = m.header || {}; pk.manifest = m;
    const langF = [...pk.files.keys()].find(k => /^texts\/en_(US|GB)\.lang$/i.test(k)) || [...pk.files.keys()].find(k => /^texts\/.*\.lang$/.test(k));
    pk.lang = langF ? parseLang(pk.files.get(langF)) : {};
    const loc = s => (typeof s === "string" && pk.lang[s]) || s;
    pk.name = loc(h.name) || pk.root || "Pack"; pk.desc = loc(h.description) || "";
    pk.version = Array.isArray(h.version) ? h.version.join(".") : h.version || "";
    pk.engine = Array.isArray(h.min_engine_version) ? h.min_engine_version.join(".") : h.min_engine_version || "";
    const types = (m.modules || []).map(x => x.type); pk.types = types;
    pk.kind = types.includes("resources") ? "Resource pack" : types.includes("data") || types.includes("script") || types.includes("javascript") ? "Behavior pack" : types.includes("skin_pack") ? "Skin pack" : types.includes("world_template") ? "World template" : "Pack";
    pk.deps = (m.dependencies || []).map(d => d.module_name ? `${d.module_name} ${Array.isArray(d.version) ? d.version.join(".") : d.version}` : "another pack");
    const icon = pk.files.get("pack_icon.png") || pk.files.get("pack_icon.jpg"); pk.icon = icon ? blobURL(icon, "png") : null;
  }
  return packs;
}
// everything from all packs: entities, items, blocks, models, textures...
function collect(packs) {
  const C = { entities: [], items: [], blocks: [], models: [], client: [], textures: [], sounds: [], scripts: [], functions: [], structures: [], recipes: 0, loot: 0, other: {}, itemTex: {}, terrainTex: {}, blocksJson: {}, lang: {} };
  const J = (pk, p) => { try { return F.looseJSON(pk.files.get(p)); } catch (e) { return null; } };
  for (const pk of packs) {
    Object.assign(C.lang, pk.lang);
    for (const [p, d] of pk.files) {
      const lp = p.toLowerCase(), ext = extOf(lp), where = { pk, p, d };
      if (/^entities\/.*\.json$/.test(lp)) { const j = J(pk, p); const id = j?.["minecraft:entity"]?.description?.identifier; if (id) C.entities.push({ ...where, id, comps: Object.keys(j["minecraft:entity"].components || {}).length }); }
      else if (/^items\/.*\.json$/.test(lp)) { const j = J(pk, p); const it = j?.["minecraft:item"]; if (it?.description?.identifier) { const ic = it.components?.["minecraft:icon"]; C.items.push({ ...where, id: it.description.identifier, icon: typeof ic === "string" ? ic : ic?.texture || ic?.textures?.default || it.description.icon_texture || null, comps: it.components || {} }); } }
      else if (/^blocks\/.*\.json$/.test(lp)) { const j = J(pk, p); const b = j?.["minecraft:block"]; if (b?.description?.identifier) C.blocks.push({ ...where, id: b.description.identifier, mi: b.components?.["minecraft:material_instances"] || null, geo: b.components?.["minecraft:geometry"] || null }); }
      else if (/^(entity|attachables)\/.*\.json$/.test(lp)) { const j = J(pk, p); const ce = j?.["minecraft:client_entity"] || j?.["minecraft:attachable"]; if (ce?.description) C.client.push({ ...where, ...ce.description, att: !!j["minecraft:attachable"] }); }
      else if (/^models\/.*\.json$/.test(lp)) { const j = J(pk, p); if (j) for (const g of geometries(j)) C.models.push({ ...where, ...g }); }
      else if (/^textures\/.*\.(png|tga|jpe?g)$/.test(lp)) C.textures.push(where);
      else if (/^sounds\/.*\.(ogg|wav|mp3|fsb)$/.test(lp)) C.sounds.push(where);
      else if (/^scripts\/.*\.(m?js|ts)$/.test(lp)) C.scripts.push(where);
      else if (/^functions\/.*\.mcfunction$/.test(lp)) C.functions.push(where);
      else if (/\.mcstructure$/.test(lp)) C.structures.push(where);
      else if (/^recipes\//.test(lp)) C.recipes++;
      else if (/^loot_tables\//.test(lp)) C.loot++;
      else if (lp === "textures/item_texture.json") Object.assign(C.itemTex, J(pk, p)?.texture_data || {});
      else if (lp === "textures/terrain_texture.json") Object.assign(C.terrainTex, J(pk, p)?.texture_data || {});
      else if (lp === "blocks.json") Object.assign(C.blocksJson, J(pk, p) || {});
      else { const top = lp.split("/")[0]; if (lp.includes("/")) C.other[top] = (C.other[top] || 0) + 1; }
    }
  }
  return C;
}
// find a texture file in any pack from a path like "textures/items/apple"
function findTex(packs, path) {
  if (!path) return null; path = String(path).replace(/\.(png|tga|jpe?g)$/i, "").replace(/^\/+/, "");
  for (const pk of packs) for (const e of ["png", "tga", "jpg", "jpeg"]) { const d = pk.files.get(path + "." + e); if (d) return { d, ext: e, path: path + "." + e }; }
  return null;
}
const shortTex = (table, name) => { const t = table[name]?.textures; const v = Array.isArray(t) ? t[0] : t; return typeof v === "string" ? v : v?.path || null; };
async function toCanvas(d, ext) {
  let cv;
  if (ext === "tga") { const t = F.decodeTGA(d); if (!t) return null; cv = document.createElement("canvas"); cv.width = t.w; cv.height = t.h; cv.getContext("2d").putImageData(new ImageData(t.data, t.w, t.h), 0, 0); return cv; }
  try { const bm = await createImageBitmap(new Blob([d], { type: MIME[ext] || "image/png" })); cv = document.createElement("canvas"); cv.width = bm.width; cv.height = bm.height; cv.getContext("2d").drawImage(bm, 0, 0); return cv; } catch (e) { return null; }
}
function procTile(spec) { const cv = document.createElement("canvas"); cv.width = cv.height = 16; const c = cv.getContext("2d"), im = c.createImageData(16, 16); paint(im.data, spec); c.putImageData(im, 0, 0); return cv; }
// a little 3D cube picture from top + side textures
function isoIcon(top, side, S = 96) {
  const cv = document.createElement("canvas"); cv.width = cv.height = S; const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
  const k = S / 16, L = [0.06 * S, 0.28 * S];
  const face = (img, a, b, cc, d, e, f, dark) => { c.setTransform(a / 16, b / 16, cc / 16, d / 16, e, f); c.drawImage(img, 0, 0, img.width, img.width, 0, 0, 16, 16); if (dark) { c.fillStyle = `rgba(0,0,0,${dark})`; c.fillRect(0, 0, 16, 16); } };
  face(top, 0.44 * S, -0.22 * S, 0.44 * S, 0.22 * S, L[0], L[1]);
  face(side, 0.44 * S, 0.22 * S, 0, 0.44 * S, L[0], L[1], 0.18);
  face(side, 0.44 * S, -0.22 * S, 0, 0.44 * S, 0.5 * S, 0.5 * S, 0.36);
  c.setTransform(1, 0, 0, 1, 0, 0); void k; return cv;
}

/* ---------------- add-on page ---------------- */
async function openAddon(name, files) {
  const packs = scanPacks(files), C = collect(packs);
  const d = startDoc(name, `<div id="packs"></div><div id="secs"></div>`);
  DOC.packs = packs; DOC.files = files; DOC.C = C;
  if (!packs.length) $("packs").innerHTML = `<div class="note">No packs found in this zip (no manifest.json). Here are the files inside.</div>`;
  $("packs").innerHTML += packs.map(packCard).join("");
  renderPackSections($("secs"), packs, C);
  $("secs").insertAdjacentHTML("beforeend", filesSection(files));
  wireFiles(d, files);
}
function packCard(pk) {
  const n = k => [...pk.files.keys()].filter(p => p.toLowerCase().startsWith(k)).length;
  const counts = [["entities/", "mobs"], ["items/", "items"], ["blocks/", "blocks"], ["recipes/", "recipes"], ["functions/", "functions"], ["scripts/", "scripts"], ["structures/", "structures"], ["textures/", "textures"], ["models/", "models"], ["sounds/", "sounds"], ["entity/", "client mobs"]].map(([k, t]) => [n(k), t]).filter(x => x[0]);
  return `<div class="hero">${pk.icon ? `<img src="${pk.icon}" alt="">` : `<img alt="" style="opacity:.2">`}<div class="t"><h2>${esc(pk.name)}</h2><p>${esc(pk.desc)}</p>
    <div class="chips"><span class="chip ${pk.kind.startsWith("Res") ? "b" : "g"}">${pk.kind}</span>${pk.version ? `<span class="chip">v${esc(pk.version)}</span>` : ""}${pk.engine ? `<span class="chip">Minecraft ${esc(pk.engine)}+</span>` : ""}${counts.map(([c, t]) => `<span class="chip y">${c} ${t}</span>`).join("")}</div>
    ${pk.deps.length ? `<small style="color:var(--mute)">Needs: ${esc(pk.deps.join(", "))}</small>` : ""}${pk.bad ? `<div class="note">manifest.json has a mistake: ${esc(pk.bad)}</div>` : ""}</div></div>`;
}
function renderPackSections(host, packs, C) {
  const L = id => C.lang[`entity.${id}.name`] || C.lang[`item.${id}.name`] || C.lang[`item.${id}`] || C.lang[`tile.${id}.name`] || pretty(id);
  // mobs & models
  const used = new Set(), models = [];
  const geoById = id => C.models.find(m => m.id === id);
  for (const ce of C.client) {
    const gid = ce.geometry && (ce.geometry.default || Object.values(ce.geometry)[0]); const g = gid && geoById(gid);
    const texs = Object.values(ce.textures || {}).filter(t => typeof t === "string");
    if (g) { used.add(g.id); models.push({ name: L(ce.identifier), sub: ce.identifier + (ce.att ? " (held item)" : ""), g, texs }); }
  }
  for (const g of C.models) if (!used.has(g.id)) { const base = g.id.replace(/^geometry\./, "").split(/[.:]/)[0]; const t = C.textures.find(x => x.p.toLowerCase().split("/").pop().replace(/\.\w+$/, "") === base); models.push({ name: pretty(base), sub: g.id, g, texs: t ? [t.p.replace(/\.\w+$/, "")] : [] }); }
  const bp = C.entities.filter(e => !C.client.some(c => c.identifier === e.id));
  let h = "";
  if (models.length || C.entities.length) h += `<details class="sec" open><summary>🐷 Mobs & models <small>${models.length} model${models.length === 1 ? "" : "s"}${C.entities.length ? ", " + C.entities.length + " mob rules" : ""}</small></summary><div class="secbody">
    ${models.length ? `<div class="grid" id="modelGrid">${models.map((m, i) => `<div class="card" data-m="${i}"><canvas width="160" height="160"></canvas><b>${esc(m.name)}</b><small>${esc(m.sub)}</small></div>`).join("")}</div>` : ""}
    ${bp.length ? `<p style="color:var(--mute);font-size:14px;margin:12px 0 6px">Mobs with behavior but no model in this file (they use another pack's look):</p><div class="list">${bp.map(e => `<div class="row" data-f="${esc(e.pk.root + e.p)}"><span class="nm">🐾 ${esc(L(e.id))} <small>${esc(e.id)}</small></span><small>${e.comps} parts</small></div>`).join("")}</div>` : ""}</div></details>`;
  // blocks & items
  const blocks = new Map();
  for (const b of C.blocks) blocks.set(b.id, { id: b.id, mi: b.mi, src: b });
  for (const [id, v] of Object.entries(C.blocksJson)) if (id !== "format_version") { const full = id.includes(":") ? id : "minecraft:" + id; const e = blocks.get(full) || { id: full }; e.bj = v; blocks.set(full, e); }
  const items = C.items.map(it => ({ id: it.id, icon: it.icon, src: it }));
  for (const k of Object.keys(C.itemTex)) if (!items.some(i => i.icon === k || i.id.split(":").pop() === k)) items.push({ id: k, icon: k, texOnly: true });
  if (blocks.size || items.length) h += `<details class="sec" open><summary>🧱 Blocks & items <small>${blocks.size} blocks, ${items.length} items</small></summary><div class="secbody"><div class="grid" id="biGrid">
    ${[...blocks.values()].map((b, i) => `<div class="card" data-b="${i}"><canvas width="96" height="96"></canvas><b>${esc(L(b.id))}</b><small>block · ${esc(b.id)}</small></div>`).join("")}
    ${items.map((it, i) => `<div class="card" data-it="${i}"><canvas width="96" height="96"></canvas><b>${esc(it.texOnly ? pretty(it.id) : L(it.id))}</b><small>item · ${esc(it.id)}</small></div>`).join("")}</div></div></details>`;
  // builds: structures + functions that build things
  const builders = C.functions.filter(f => (F.text(f.d).match(/^\s*\/?(execute .* run )?(fill|setblock|clone)\b/gim) || []).length >= 3);
  if (C.structures.length || builders.length) h += `<details class="sec" open><summary>🏗 Builds you can see in 3D <small>${C.structures.length + builders.length}</small></summary><div class="secbody"><div class="list">
    ${C.structures.map(s => `<div class="row" data-build="${esc(s.pk.root + s.p)}"><span class="nm">🏗 ${esc(s.p.split("/").pop())} <small>structure</small></span><span class="btn small">👀 3D</span></div>`).join("")}
    ${builders.map(s => `<div class="row" data-build="${esc(s.pk.root + s.p)}"><span class="nm">🧱 /function ${esc(s.p.replace(/^functions\//, "").replace(/\.mcfunction$/, ""))} <small>builds with commands</small></span><span class="btn small">👀 3D</span></div>`).join("")}</div></div></details>`;
  // code
  if (C.scripts.length || C.functions.length) h += `<details class="sec"><summary>📜 Scripts & functions <small>${C.scripts.length} scripts, ${C.functions.length} functions${C.recipes ? `, ${C.recipes} recipes` : ""}</small></summary><div class="secbody"><div class="list">
    ${[...C.scripts, ...C.functions].map(s => `<div class="row" data-f="${esc(s.pk.root + s.p)}"><span class="nm">${s.p.endsWith(".mcfunction") ? "⚙️" : "📜"} ${esc(s.p)}</span><small>${(F.text(s.d).split("\n").length)} lines</small></div>`).join("")}</div></div></details>`;
  if (C.textures.length) h += `<details class="sec"><summary>🖼 Textures <small>${C.textures.length}</small></summary><div class="secbody"><div class="grid tex" id="texGrid"></div></div></details>`;
  if (C.sounds.length) h += `<details class="sec"><summary>🔊 Sounds <small>${C.sounds.length}</small></summary><div class="secbody"><div class="list">${C.sounds.map(s => `<div class="row" data-f="${esc(s.pk.root + s.p)}"><span class="nm">🔊 ${esc(s.p)}</span><small>${sizeTxt(s.d.length)}</small></div>`).join("")}</div></div></details>`;
  host.insertAdjacentHTML("beforeend", h);
  // pictures
  (async () => {
    const mg = host.querySelector("#modelGrid");
    if (mg) { mg.onclick = e => { const c = e.target.closest("[data-m]"); if (c) openModel(models[+c.dataset.m], packs); }; for (const c of mg.querySelectorAll("[data-m]")) { await modelThumb(models[+c.dataset.m], packs, c.querySelector("canvas")); await sleep(0); } }
    const bi = host.querySelector("#biGrid");
    if (bi) {
      const bl = [...blocks.values()];
      bi.onclick = e => { const b = e.target.closest("[data-b]"), it = e.target.closest("[data-it]"); const src = b ? bl[+b.dataset.b].src : it ? items[+it.dataset.it].src : null; if (src) showFile(src.pk.root + src.p); };
      for (const c of bi.querySelectorAll("[data-b]")) { const b = bl[+c.dataset.b], t = await blockTextures(b, C, packs), cv = c.querySelector("canvas"); cv.getContext("2d").drawImage(isoIcon(t.top, t.side, 96), 0, 0); }
      for (const c of bi.querySelectorAll("[data-it]")) { const it = items[+c.dataset.it]; const f = findTex(packs, shortTex(C.itemTex, it.icon) || (it.icon && it.icon.includes("/") ? it.icon : null)); const cv = c.querySelector("canvas"), x = cv.getContext("2d"); x.imageSmoothingEnabled = false; const img = f && await toCanvas(f.d, f.ext); if (img) x.drawImage(img, 0, 0, img.width, img.height, 8, 8, 80, 80); else { x.font = "48px sans-serif"; x.textAlign = "center"; x.fillText("❔", 48, 64); } }
    }
    const tg = host.querySelector("#texGrid");
    if (tg) { tg.closest("details").addEventListener("toggle", async function once() { tg.closest("details").removeEventListener("toggle", once); for (const t of C.textures.slice(0, 600)) { const src = t.p.endsWith(".tga") ? (await toCanvas(t.d, "tga"))?.toDataURL() : blobURL(t.d, extOf(t.p)); tg.insertAdjacentHTML("beforeend", `<div class="card" data-f="${esc(t.pk.root + t.p)}"><img loading="lazy" src="${src || ""}" alt=""><b>${esc(t.p.split("/").pop())}</b></div>`); } }); }
  })();
  host.onclick = e => {
    const b = e.target.closest("[data-build]"); if (b) { const f = DOC.files.find(x => x[0] === b.dataset.build); if (f) openBuild(f[0].split("/").pop(), f[1], packs); return; }
    const r = e.target.closest("[data-f]"); if (r) showFile(r.dataset.f);
  };
}
async function blockTextures(b, C, packs) {
  const pick = (v, ...keys) => { if (!v) return null; if (typeof v === "string") return v; for (const k of keys) if (v[k]) return typeof v[k] === "string" ? v[k] : v[k].texture; return null; };
  let top = null, side = null;
  if (b.mi) { top = pick(b.mi, "up", "*")?.texture || (b.mi.up || b.mi["*"])?.texture; side = (b.mi.north || b.mi.side || b.mi["*"] || b.mi.up)?.texture; }
  if (b.bj) { const t = b.bj.textures; top = top || pick(t, "up", "top"); side = side || pick(t, "side", "north", "east", "up"); }
  const load = async sn => { const f = sn && findTex(packs, shortTex(C.terrainTex, sn) || (sn.includes("/") ? sn : null)); return f ? await toCanvas(f.d, f.ext) : null; };
  let T = await load(top), S = await load(side || top);
  if (!T || !S) { const a = appearance(b.id, {}); T = T || procTile(a.top || "noise|#888888||"); S = S || procTile(a.side || a.top || "noise|#888888||"); }
  return { top: T, side: S };
}

/* ---------------- files list + viewers ---------------- */
function filesSection(files) {
  const total = files.reduce((a, f) => a + f[1].length, 0);
  return `<details class="sec"><summary>🗂 All files <small>${files.length} files, ${sizeTxt(total)}</small></summary><div class="secbody"><div class="files" id="fileList">${files.slice().sort((a, b) => a[0].localeCompare(b[0])).map(([p, d]) => `<div data-f="${esc(p)}">${esc(p)}<small>${sizeTxt(d.length)}</small></div>`).join("")}</div></div></details>`;
}
function wireFiles(d, files) { d.querySelector("#fileList")?.addEventListener("click", e => { const r = e.target.closest("[data-f]"); if (r) { e.stopPropagation(); showFile(r.dataset.f); } }); }
async function showFile(path) {
  const f = DOC.files.find(x => x[0] === path); if (!f) return; const [p, d] = f, ext = extOf(p), name = p.split("/").pop();
  if (["png", "jpg", "jpeg", "tga"].includes(ext)) { const cv = ext === "tga" ? await toCanvas(d, "tga") : null; const src = cv ? cv.toDataURL() : blobURL(d, ext); return modal(name, `<img src="${src}" alt="" style="width:${Math.min(512, 8 * 64)}px"><p style="color:var(--mute)">${esc(p)} · ${sizeTxt(d.length)}</p>`); }
  if (["ogg", "wav", "mp3"].includes(ext)) return modal(name, `<audio controls autoplay src="${blobURL(d, ext)}" style="width:100%"></audio><p style="color:var(--mute)">If it doesn't play, your browser can't play .${ext} files.</p>`);
  if (ext === "mcstructure" || ext === "litematic") return openBuild(name, d, DOC.packs);
  if (ext === "mcfunction") {
    const txt = F.text(d), n = (txt.match(/^\s*\/?(execute .* run )?(fill|setblock)\b/gim) || []).length;
    modal(name, (n >= 3 ? `<button class="btn small" id="fn3d">👀 See what it builds in 3D</button><br><br>` : "") + `<pre>${esc(txt)}</pre>`);
    if (n >= 3) $("fn3d").onclick = () => { closeModal(); openBuild(name, d, DOC.packs); };
    return;
  }
  if (ext === "dat" || ext === "nbt") { try { return showText(name, JSON.stringify(ext === "dat" ? F.readLevelDat(d) : F.readNBT(d).value, jsonSafe, 2), "json"); } catch (e) { /* fall through */ } }
  if (["json", "lang", "txt", "js", "mjs", "ts", "md", "material", "mcmeta", "properties", "fragment", "vertex", "glsl", "csv"].includes(ext) || d.length < 200000 && !d.subarray(0, 512).some(b => b === 0)) {
    let t = F.text(d);
    if (ext === "json") { try { t = JSON.stringify(F.looseJSON(t), null, 2); } catch (e) { /* keep */ } }
    return showText(name, t.length > 300000 ? t.slice(0, 300000) + "\n…(cut, the file is very long)" : t, ext);
  }
  modal(name, `<p>${esc(p)}</p><p style="color:var(--mute)">${sizeTxt(d.length)} · This kind of file can't be shown.</p>`);
}
function showText(name, t, kind) {
  let h = esc(t);
  if (kind === "json") h = h.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|true|false|null)\b/gi, (m, s, colon, n) => s ? `<span class="${colon ? "k" : "s"}">${s}</span>${colon || ""}` : `<span class="n">${n}</span>`);
  else if (kind === "mcfunction" || kind === "lang") h = h.replace(/^(#.*)$/gm, '<span class="c">$1</span>');
  else if (kind === "js" || kind === "mjs" || kind === "ts") h = h.replace(/(\/\/[^\n]*)/g, '<span class="c">$1</span>');
  modal(name, `<pre>${h}</pre>`);
}
function modal(title, html) { $("mTitle").textContent = title; $("mBody").innerHTML = html; $("modal").hidden = false; $("mBody").scrollTop = 0; }
function closeModal() { $("modal").hidden = true; $("mBody").innerHTML = ""; }
$("mClose").onclick = closeModal; $("modal").onclick = e => { if (e.target.id === "modal") closeModal(); };

/* ---------------- worlds ---------------- */
const MODES = { 0: "Survival", 1: "Creative", 2: "Adventure", 5: "Default", 6: "Spectator" }, DIFF = ["Peaceful", "Easy", "Normal", "Hard"];
const GEN = { 0: "Old (limited)", 1: "Infinite", 2: "Flat", 5: "Void" }, DIMS = { 0: "Overworld", 1: "Nether", 2: "The End" };
async function openWorld(name, files, root) {
  status("Reading the world…"); await frame();
  const get = p => files.find(x => x[0] === root + p)?.[1];
  const lvl = F.readLevelDat(get("level.dat"));
  const dbFiles = files.filter(([p]) => p.startsWith(root + "db/")).map(([p, d]) => [p.slice(root.length + 3), d]);
  const db = new F.LevelDB(dbFiles); const dims = db.chunks();
  let player = null; try { const lp = db.get("~local_player"); if (lp) player = F.readNBT(lp, true).value; } catch (e) { /* none */ }
  const wname = (get("levelname.txt") ? F.text(get("levelname.txt")).trim() : "") || lvl.LevelName || name;
  const iconD = get("world_icon.jpeg") || get("world_icon.png");
  const packs = scanPacks(files.filter(([p]) => !p.startsWith(root + "db/")));
  const C = packs.length ? collect(packs) : null;
  const chunkCount = [...dims.values()].reduce((a, m) => a + m.size, 0);
  const flat = lvl.Generator === 2;
  const ver = Array.isArray(lvl.lastOpenedWithVersion) ? lvl.lastOpenedWithVersion.slice(0, 3).join(".") : "";
  const last = lvl.LastPlayed ? new Date(Number(lvl.LastPlayed) * 1000).toLocaleString() : "";
  const rules = ["keepinventory", "pvp", "dodaylightcycle", "doweathercycle", "domobspawning", "mobgriefing", "showcoordinates", "falldamage", "firedamage", "tntexplodes", "doimmediaterespawn", "naturalregeneration"].filter(k => lvl[k] !== undefined);
  const pPos = player?.Pos ? player.Pos.map(v => Math.floor(v)) : null;
  const d = startDoc(name, `
    <div class="hero">${iconD ? `<img src="${blobURL(iconD, get("world_icon.jpeg") ? "jpg" : "png")}" alt="">` : ""}<div class="t"><h2>${esc(wname)}</h2>
      <div class="chips"><span class="chip g">${MODES[lvl.GameType] || "Survival"}</span><span class="chip">${DIFF[lvl.Difficulty] || ""}</span><span class="chip">${GEN[lvl.Generator] || "World"}</span>${ver ? `<span class="chip b">Minecraft ${esc(ver)}</span>` : ""}${lvl.commandsEnabled ? `<span class="chip y">Cheats on</span>` : ""}</div>
      <p>${chunkCount ? `${chunkCount.toLocaleString()} saved chunks · ${[...dims.keys()].sort((a, b) => a - b).map(k => DIMS[k] || "Dimension " + k).join(", ")}` : "No saved chunks yet"}</p></div></div>
    <div class="explore"><p><b style="font-size:18px">🌍 Walk around this world in 3D</b><br>${chunkCount ? "Fly or walk through the real blocks. Start where the player was standing." : flat ? "This world hasn't been played yet, so no blocks are saved. You'll see the flat ground it starts with." : "This world hasn't been played yet, so there are no blocks to show."}</p>
      ${chunkCount || flat ? `<button class="btn" id="go3d">▶ Explore</button>` : ""}</div>
    ${!chunkCount && packs.length ? `<div class="note">This world comes with ${packs.length === 1 ? "a pack" : packs.length + " packs"} (below). ${packs.some(p => p.files.has("scripts/main.js")) ? "Its script may build things when the world is opened in Minecraft." : ""}</div>` : ""}
    <details class="sec"><summary>📋 World details</summary><div class="secbody"><table class="kv">
      <tr><td>Seed</td><td>${esc(String(lvl.RandomSeed ?? ""))}</td></tr>
      <tr><td>Spawn</td><td>${lvl.SpawnX}, ${lvl.SpawnY >= 32767 ? "(top)" : lvl.SpawnY}, ${lvl.SpawnZ}</td></tr>
      ${pPos ? `<tr><td>Player</td><td>${pPos.join(", ")} in the ${DIMS[player.DimensionId || 0] || "?"}</td></tr>` : ""}
      ${last ? `<tr><td>Last played</td><td>${esc(last)}</td></tr>` : ""}
      ${lvl.currentTick !== undefined ? `<tr><td>Time played</td><td>${Math.round(Number(lvl.currentTick) / 20 / 60).toLocaleString()} minutes of game time</td></tr>` : ""}
      ${rules.map(k => `<tr><td>${esc(k)}</td><td>${lvl[k] ? "on" : "off"}</td></tr>`).join("")}
    </table></div></details>
    <div id="packs"></div><div id="secs"></div>${filesSection(files)}`);
  DOC.files = files; DOC.packs = packs;
  if (packs.length) { $("packs").innerHTML = packs.map(packCard).join(""); renderPackSections($("secs"), packs, C); }
  wireFiles(d, files);
  if (db.errors.length) d.insertAdjacentHTML("beforeend", `<div class="note">Some world files were damaged: ${esc(db.errors.join("; "))}</div>`);
  const go = $("go3d");
  if (go) go.onclick = async () => {
    const custom = C ? await customBlockTextures(packs, C) : null;
    let src, start;
    if (chunkCount) {
      const dim0 = player && dims.has(player.DimensionId || 0) ? (player.DimensionId || 0) : dims.has(0) ? 0 : [...dims.keys()][0];
      src = worldSource(db, dims, dim0);
      const sp = { x: lvl.SpawnX, y: lvl.SpawnY >= 32767 ? null : lvl.SpawnY, z: lvl.SpawnZ };
      const pl = player?.Pos ? { x: player.Pos[0], y: player.Pos[1] - 1.62, z: player.Pos[2], yaw: Math.PI - (player.Rotation?.[0] || 0) * Math.PI / 180, pitch: -(player.Rotation?.[1] || 0) * Math.PI / 180, dim: player.DimensionId || 0 } : null;
      start = pl && pl.dim === dim0 ? pl : sp;
      src.spots = { spawn: sp, player: pl };
      src.dims = dims; src.db = db;
    } else {
      let layers = null; try { layers = JSON.parse(lvl.FlatWorldLayers); } catch (e) { /* default */ }
      src = flatSource(layers); start = { x: lvl.SpawnX + 0.5, y: null, z: lvl.SpawnZ + 0.5 }; src.spots = { spawn: start };
    }
    openExplorer({ title: wname, src, start, custom });
  };
}
function worldSource(db, dims, dim) {
  const m = dims.get(dim) || new Map();
  return {
    dim, sky: dim === 1 ? 0x4a1810 : dim === 2 ? 0x15101f : 0x8fc6ff,
    has: (cx, cz) => m.has(cx + "," + cz),
    load(vox, cx, cz) { const e = m.get(cx + "," + cz); if (!e) return []; for (const sy of e[2]) { const raw = db.get(F.subChunkKey(cx, cz, dim, sy)); if (raw) { try { vox.putSubChunk(cx, sy, cz, F.decodeSubChunk(raw)); } catch (err) { /* broken sub-chunk */ } } } return e[2]; },
    nearest(x, z) { let best = null, bd = Infinity; const cx = Math.floor(x / 16), cz = Math.floor(z / 16); for (const [a, b] of m.values()) { const dd = (a - cx) ** 2 + (b - cz) ** 2; if (dd < bd) { bd = dd; best = [a, b]; } } return best; },
  };
}
function flatSource(layers) {
  const L = (layers?.block_layers || [{ block_name: "minecraft:bedrock", count: 1 }, { block_name: "minecraft:dirt", count: 2 }, { block_name: "minecraft:grass_block", count: 1 }]);
  const y0 = layers?.world_version === "version.post_1_18" ? -64 : 0, list = []; let y = y0;
  for (const l of L) for (let i = 0; i < (l.count || 1); i++) list.push([y++, l.block_name]);
  return {
    sky: 0x8fc6ff, has: () => true,
    load(vox, cx, cz) { const ids = list.map(([yy, n]) => [yy, vox.id(n)]); const sys = new Set(); for (const [yy, id] of ids) { if (!id) continue; sys.add(yy >> 4); for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) vox.set(cx * 16 + x, yy, cz * 16 + z, id); } return [...sys]; },
  };
}
async function customBlockTextures(packs, C) {
  const out = new Map();
  for (const b of C.blocks) { const t = await blockTextures({ id: b.id, mi: b.mi, bj: C.blocksJson[b.id] || C.blocksJson[b.id.split(":").pop()] }, C, packs); out.set(b.id, t); }
  return out;
}

/* ---------------- builds: structures, schematics, functions ---------------- */
async function openBuild(name, u8, packs) {
  status("Building it in 3D…"); await frame();
  const ext = extOf(name), atlas = newAtlas();
  let vox, info = "";
  if (ext === "mcstructure") {
    const s = F.readStructure(u8); vox = new Vox(atlas);
    const lut = s.pal.map(p => vox.id(p.name, p.states)), water = vox.id("water");
    for (let x = 0; x < s.sx; x++) for (let y = 0; y < s.sy; y++) for (let z = 0; z < s.sz; z++) {
      const i = s.at(x, y, z); let id = i >= 0 ? lut[i] : 0;
      if (!id && s.water(x, y, z) >= 0 && /water/.test(s.pal[s.water(x, y, z)]?.name || "")) id = water;
      if (id) vox.set(x, y, z, id);
    }
    info = `${s.sx} × ${s.sy} × ${s.sz} blocks`;
  } else if (ext === "mcfunction") {
    vox = runFunction(F.text(u8), packs, atlas); info = "what this function builds";
  } else {
    const L = F.readLitematic(u8); vox = new Vox(atlas, true);
    for (const r of L.regions) { const lut = r.pal.map(p => vox.id(p.name, p.states)); for (let y = 0; y < r.ay; y++) for (let z = 0; z < r.az; z++) for (let x = 0; x < r.ax; x++) { const id = lut[r.at(x, y, z)]; if (id) vox.set(r.ox + x, r.oy + y, r.oz + z, id); } }
    info = (L.author ? "by " + L.author : "") ; name = L.name || name;
  }
  if (!vox.sub.size) { status("There are no blocks in it to show.", 4000); return; }
  openExplorer({ title: name + (info ? " · " + info : ""), src: { static: true, vox, sky: 0x8fc6ff }, atlas });
}
function runFunction(text, packs, atlas) {
  const vox = new Vox(atlas); const seen = new Set();
  const DY = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"];
  const tok = s => { const out = []; let cur = "", depth = 0, q = false; for (const ch of s) { if (ch === '"') q = !q; if (!q && ch === "[") depth++; if (!q && ch === "]") depth--; if (ch === " " && !depth && !q) { if (cur) out.push(cur); cur = ""; } else cur += ch; } if (cur) out.push(cur); return out; };
  const num = t => parseFloat(String(t).replace(/^[~^]/, "") || "0") || 0;
  const block = (n, st) => {
    n = n.replace(/^minecraft:/, ""); const states = {};
    if (st && st.startsWith("[")) for (const m of st.slice(1, -1).matchAll(/"?([\w:]+)"?\s*[=:]\s*"?([^",\]]+)"?/g)) states[m[1]] = /^\d+$/.test(m[2]) ? +m[2] : m[2] === "true" ? true : m[2] === "false" ? false : m[2];
    else if (st && /^\d+$/.test(st) && ["wool", "concrete", "stained_glass", "carpet", "stained_hardened_clay", "concrete_powder"].includes(n)) states.color = DY[+st];
    return vox.id(n, states);
  };
  let budget = 3e6;
  const run = (txt, depth) => {
    for (let line of txt.split(/\r?\n/)) {
      line = line.trim().replace(/^\//, ""); if (!line || line.startsWith("#")) continue;
      const r = line.match(/\brun (.*)$/); if (line.startsWith("execute") && r) line = r[1].replace(/^\//, "");
      const t = tok(line);
      if (t[0] === "setblock" && t.length >= 5) { vox.set(Math.floor(num(t[1])), Math.floor(num(t[2])), Math.floor(num(t[3])), block(t[4], t[5])); }
      else if (t[0] === "fill" && t.length >= 8) {
        const a = t.slice(1, 7).map(v => Math.floor(num(v))), hasSt = t[8] && (t[8].startsWith("[") || /^\d+$/.test(t[8]));
        const id = block(t[7], hasSt ? t[8] : null), mode = t[hasSt ? 9 : 8] || "replace", filt = mode === "replace" && t[hasSt ? 10 : 9] ? vox.id(t[hasSt ? 10 : 9].replace(/^minecraft:/, "")) : null;
        const [x0, x1] = [Math.min(a[0], a[3]), Math.max(a[0], a[3])], [y0, y1] = [Math.min(a[1], a[4]), Math.max(a[1], a[4])], [z0, z1] = [Math.min(a[2], a[5]), Math.max(a[2], a[5])];
        const vol = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1); if (vol > budget) continue; budget -= vol;
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
          const edge = x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1;
          if ((mode === "hollow" || mode === "outline") && !edge) { if (mode === "hollow") vox.set(x, y, z, 0); continue; }
          if (mode === "keep" && vox.get(x, y, z)) continue;
          if (filt !== null && vox.get(x, y, z) !== filt) continue;
          vox.set(x, y, z, id);
        }
      } else if (t[0] === "function" && t[1] && packs && depth < 6 && !seen.has(t[1])) {
        seen.add(t[1]);
        for (const pk of packs) { const d = pk.files.get("functions/" + t[1] + ".mcfunction"); if (d) { run(F.text(d), depth + 1); break; } }
      }
    }
  };
  run(text, 0);
  return vox;
}

/* ---------------- 3D: shared renderer ---------------- */
let R3 = null;
function renderer3() {
  if (R3) return R3;
  const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); r.domElement.className = "gl";
  $("view").prepend(r.domElement); R3 = r;
  addEventListener("resize", () => { if (!$("view").hidden) fit(); });
  return r;
}
function fit() { const w = innerWidth, h = innerHeight; R3.setSize(w, h, false); if (V.cam) { V.cam.aspect = w / h; V.cam.updateProjectionMatrix(); } }
function newAtlas() { const cv = document.createElement("canvas"); cv.width = cv.height = 1024; return new Atlas(cv); }

/* ---------------- 3D explorer (walk / fly) ---------------- */
const V = { on: false };
const SOLID = new Set(["cube", "slab", "slabTop", "slab9", "slab15", "stairs", "post", "pane"]);
function openExplorer({ title, src, start, atlas, custom }) {
  closeView();
  const r = renderer3();
  atlas = atlas || (src.static ? src.vox.atlas : newAtlas());
  const tex = new THREE.CanvasTexture(atlas.cv); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  const mats = { solid: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true }), cut: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide }), liquid: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }) };
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(72, 1, 0.05, 2000), group = new THREE.Group(); scene.add(group);
  cam.rotation.order = "YXZ";
  Object.assign(V, { on: true, mode: "explore", r, scene, cam, group, mats, tex, atlas, src, R: 5, loaded: new Map(), meshes: new Map(), dirty: new Set(), queue: [], qc: null,
    pos: new THREE.Vector3(), vy: 0, yaw: 0, pitch: -0.2, fly: true, speed: 1, keys: {}, joy: { x: 0, y: 0, id: null }, up: 0, down: 0, ground: false, last: performance.now(), lookT: 0, custom });
  V.vox = src.static ? src.vox : new Vox(atlas, !!src.java);
  if (custom && !src.static) V.vox.custom = custom;
  // highlight box for the block you look at
  V.sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000 })); V.sel.visible = false; scene.add(V.sel);
  setSky(src.sky ?? 0x8fc6ff);
  $("view").dataset.mode = "explore"; $("view").hidden = false; $("vTitle").textContent = title; document.body.style.overflow = "hidden";
  fit();
  if (src.static) {
    const v = V.vox; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [sx, sz] of v.columns().values()) { x0 = Math.min(x0, sx * 16); x1 = Math.max(x1, sx * 16 + 16); z0 = Math.min(z0, sz * 16); z1 = Math.max(z1, sz * 16 + 16); }
    // real bounds (scan)
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    for (const [k, a] of v.sub) { const sz = (k % 8192) - 4096, rest = Math.floor(k / 8192), sy = (rest % 64) - 8, sx = Math.floor(rest / 64) - 4096; for (let i = 0; i < 4096; i++) if (a[i]) { const x = sx * 16 + (i >> 8), z = sz * 16 + ((i >> 4) & 15), y = sy * 16 + (i & 15); if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; if (z < bz0) bz0 = z; if (z > bz1) bz1 = z; } }
    V.bounds = { x0: bx0, x1: bx1 + 1, y0: by0, y1: by1 + 1, z0: bz0, z1: bz1 + 1 };
    for (const c of v.columns().keys()) V.dirty.add(c);
    const cx = (bx0 + bx1 + 1) / 2, cz = (bz0 + bz1 + 1) / 2, span = Math.max(bx1 - bx0, bz1 - bz0, by1 - by0) + 1;
    V.pos.set(cx + span * 0.55, by0 + span * 0.45 + 2, cz + span * 0.9);
    V.yaw = Math.atan2(V.pos.x - cx, V.pos.z - cz); V.pitch = -Math.atan2(V.pos.y - (by0 + by1) / 2, Math.hypot(V.pos.x - cx, V.pos.z - cz));
    cam.far = Math.max(600, span * 6); cam.updateProjectionMatrix(); scene.fog = null;
    // ground
    const gt = new THREE.CanvasTexture(procTile("noise|#5f9a3a||0.12")); gt.magFilter = THREE.NearestFilter; gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(400, 400); gt.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshBasicMaterial({ map: gt, color: 0xb0b0b0 })); ground.rotation.x = -Math.PI / 2; ground.position.set(cx, by0 - 0.01, cz); scene.add(ground); V.groundY = by0;
    V.spots = { start: { x: V.pos.x, y: V.pos.y, z: V.pos.z, yaw: V.yaw, pitch: V.pitch } };
  } else {
    V.spots = src.spots || {};
    placeAt(start || { x: 0, y: null, z: 0 });
  }
  setMode(true); setSpeed(1);
  const touch = matchMedia("(pointer:coarse)").matches;
  $("help3d").innerHTML = touch ? "Left circle: move · Drag the screen: look around · ⬆ ⬇: up and down (or jump)<br>☰ for more" : "<b>W A S D</b> or arrows: move · <b>drag</b>: look · <b>Space</b>: up/jump · <b>Shift</b>: down · <b>F</b>: walk/fly · ☰ for more";
  $("help3d").hidden = false; clearTimeout(V.helpT); V.helpT = setTimeout(() => $("help3d").hidden = true, 9000);
  status(""); V.raf = requestAnimationFrame(loop);
}
function setSky(c) { V.sky = c; V.scene.background = new THREE.Color(c); if (!V.src.static) V.scene.fog = new THREE.Fog(c, V.R * 16 * 0.75, V.R * 16 * 1.05); V.cam.far = V.src.static ? V.cam.far : V.R * 16 * 1.4 + 32; V.cam.updateProjectionMatrix(); }
function placeAt(p) {
  // jump to a spot; if it isn't saved, go to the closest saved chunk
  let { x, y, z } = p;
  if (V.src.has && !V.src.has(Math.floor(x / 16), Math.floor(z / 16)) && V.src.nearest) { const n = V.src.nearest(x, z); if (n) { x = n[0] * 16 + 8; z = n[1] * 16 + 8; y = null; status("That spot isn't saved in this world, so here's the closest place that is.", 4000); } }
  V.pos.set(x, y ?? 200, z); V.needGround = y == null || !isFinite(y);
  if (p.yaw !== undefined) { V.yaw = p.yaw; V.pitch = p.pitch || 0; }
  V.qc = null;
  // load the chunk you're in right away
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  if (!V.src.static) { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) loadChunk(cx + dx, cz + dz); }
  if (V.needGround) { const t = V.vox.top(Math.floor(x), Math.floor(z)); V.pos.y = t == null ? 80 : t + 1.01; V.needGround = false; }
  else if (collides()) { const t = V.vox.top(Math.floor(x), Math.floor(z)); if (t != null) V.pos.y = t + 1.01; }
}
function loadChunk(cx, cz) {
  const ck = cx + "," + cz; if (V.loaded.has(ck) || !V.src.has(cx, cz)) return false;
  const sys = V.src.load(V.vox, cx, cz); V.loaded.set(ck, { cx, cz, sys });
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (cx + dx) + "," + (cz + dz); if (dx === 0 && dz === 0 || V.meshes.has(k)) V.dirty.add(k); }
  return true;
}
function unloadChunk(ck) {
  const e = V.loaded.get(ck); if (!e) return; V.loaded.delete(ck);
  for (const sy of e.sys) V.vox.sub.delete(V.vox.k(e.cx, sy, e.cz));
  dropMeshes(ck); V.dirty.delete(ck);
}
function dropMeshes(ck) { const ms = V.meshes.get(ck); if (ms) { for (const m of ms) { V.group.remove(m); m.geometry.dispose(); } V.meshes.delete(ck); } }
function ready(cx, cz, ccx, ccz) {
  if (V.src.static) return true;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx, z = cz + dz; if (V.loaded.has(x + "," + z) || !V.src.has(x, z) || Math.max(Math.abs(x - ccx), Math.abs(z - ccz)) > V.R) continue; return false; }
  return true;
}
function stream() {
  const t0 = performance.now(), ccx = Math.floor(V.pos.x / 16), ccz = Math.floor(V.pos.z / 16);
  if (!V.src.static) {
    const ck = ccx + "," + ccz;
    if (V.qc !== ck) {
      V.qc = ck;
      for (const k of [...V.loaded.keys()]) { const e = V.loaded.get(k); if (Math.max(Math.abs(e.cx - ccx), Math.abs(e.cz - ccz)) > V.R + 2) unloadChunk(k); }
      V.queue = []; for (let dx = -V.R; dx <= V.R; dx++) for (let dz = -V.R; dz <= V.R; dz++) { const x = ccx + dx, z = ccz + dz; if (!V.loaded.has(x + "," + z) && V.src.has(x, z)) V.queue.push([x, z, dx * dx + dz * dz]); }
      V.queue.sort((a, b) => a[2] - b[2]);
    }
    while (V.queue.length && performance.now() - t0 < 7) { const [x, z] = V.queue.shift(); loadChunk(x, z); }
  }
  if (V.dirty.size) {
    const list = [...V.dirty].map(k => { const [x, z] = k.split(",").map(Number); return [k, x, z, (x - ccx) ** 2 + (z - ccz) ** 2]; }).sort((a, b) => a[3] - b[3]);
    for (const [k, x, z] of list) {
      if (performance.now() - t0 > 14) break;
      if (!V.src.static && !V.loaded.has(k)) { V.dirty.delete(k); continue; }
      if (!ready(x, z, ccx, ccz)) continue;
      V.dirty.delete(k); buildMeshes(k, meshColumn(V.vox, x, z));
    }
  }
  if (V.atlas.dirty) { V.atlas.dirty = false; V.tex.needsUpdate = true; }
  const left = V.queue.length + V.dirty.size;
  $("vLoad").textContent = left > 3 ? `Loading… ${left}` : "";
}
function buildMeshes(ck, r) {
  dropMeshes(ck); const ms = [];
  for (const kind of ["solid", "cut", "liquid"]) {
    const b = r[kind]; if (!b) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(b.pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(b.uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(b.col, 3));
    g.setIndex(new THREE.BufferAttribute(b.idx, 1)); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, V.mats[kind]); if (kind === "liquid") m.renderOrder = 2; V.group.add(m); ms.push(m);
  }
  V.meshes.set(ck, ms);
}
function solidAt(x, y, z) {
  if (V.src.static && y < V.groundY) return true;
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  if (!V.src.static && !V.loaded.has(cx + "," + cz) && V.src.has(cx, cz)) return true; // not loaded yet: wait
  const id = V.vox.get(Math.floor(x), Math.floor(y), Math.floor(z)); return id ? SOLID.has(V.vox.info[id].shape) : false;
}
function collides() {
  const p = V.pos;
  for (let x = Math.floor(p.x - 0.3); x <= Math.floor(p.x + 0.3 - 1e-6); x++) for (let y = Math.floor(p.y); y <= Math.floor(p.y + 1.8 - 1e-6); y++) for (let z = Math.floor(p.z - 0.3); z <= Math.floor(p.z + 0.3 - 1e-6); z++) if (solidAt(x + 0.5, y + 0.5, z + 0.5)) return true;
  return false;
}
function move(axis, d) {
  const steps = Math.ceil(Math.abs(d) / 0.3) || 1, s = d / steps;
  for (let i = 0; i < steps; i++) { V.pos[axis] += s; if (collides()) { V.pos[axis] -= s; return false; } }
  return true;
}
function loop(now) {
  if (!V.on) return;
  V.raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - V.last) / 1000); V.last = now;
  if (V.mode === "explore") {
    stream();
    const K = V.keys, fwd = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) - V.joy.y, str = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + V.joy.x;
    const up = (K.Space ? 1 : 0) + V.up, dn = (K.ShiftLeft || K.ShiftRight ? 1 : 0) + V.down;
    const fx = -Math.sin(V.yaw), fz = -Math.cos(V.yaw), rx = Math.cos(V.yaw), rz = -Math.sin(V.yaw);
    let mx = fx * fwd + rx * str, mz = fz * fwd + rz * str; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    if (V.fly) {
      const sp = [5, 12, 32][V.speed];
      V.pos.x += mx * sp * dt; V.pos.z += mz * sp * dt; V.pos.y += (up - dn) * sp * dt;
    } else {
      const sp = [3, 4.4, 7][V.speed];
      const bx = !move("x", mx * sp * dt), bz = !move("z", mz * sp * dt);
      V.vy -= 30 * dt; if (V.vy < -50) V.vy = -50;
      const okY = move("y", V.vy * dt);
      if (!okY) { if (V.vy < 0) V.ground = true; V.vy = 0; } else V.ground = false;
      if (V.ground && (up || ((bx || bz) && ml > 0.2))) V.vy = 8.6;
      const lowest = V.src.static ? V.groundY - 5 : V.vox.minY - 40;
      if (V.pos.y < lowest) { setMode(true); V.pos.y = (V.vox.top(Math.floor(V.pos.x), Math.floor(V.pos.z)) ?? 64) + 2; status("You fell out of the world! Flying now.", 3000); }
    }
    V.cam.position.set(V.pos.x, V.pos.y + 1.62, V.pos.z); V.cam.rotation.set(V.pitch, V.yaw, 0);
    if (now - V.lookT > 120) { V.lookT = now; lookAt(); }
    const dirs = ["N", "NW", "W", "SW", "S", "SE", "E", "NE"], a = ((V.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    $("vPos").textContent = `X ${Math.floor(V.pos.x)}  Y ${Math.floor(V.pos.y)}  Z ${Math.floor(V.pos.z)}  · facing ${dirs[Math.round(a / (Math.PI / 4)) % 8]}${V.src.dim !== undefined ? " · " + (DIMS[V.src.dim] || "") : ""}`;
  } else V.orbit?.update();
  V.r.render(V.scene, V.cam);
}
function lookAt() {
  const o = V.cam.position, d = new THREE.Vector3(); V.cam.getWorldDirection(d);
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
  let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
  const max = V.fly ? 48 : 8;
  for (let i = 0; i < 300; i++) {
    const id = V.vox.get(x, y, z);
    if (id && V.vox.info[id].shape !== "liquid") {
      const p = V.vox.pal[id]; $("vLook").textContent = `${pretty(p.name)}  ·  ${x} ${y} ${z}`;
      V.sel.position.set(x + 0.5, y + 0.5, z + 0.5); V.sel.visible = true; return;
    }
    if (tx < ty && tx < tz) { if (tx > max) break; x += sx; tx += tdx; } else if (ty < tz) { if (ty > max) break; y += sy; ty += tdy; } else { if (tz > max) break; z += sz; tz += tdz; }
  }
  $("vLook").textContent = ""; V.sel.visible = false;
}
function setMode(fly) { V.fly = fly; V.vy = 0; $("vMode").textContent = fly ? "🕊 Fly" : "🚶 Walk"; $("vMode").classList.toggle("on", !fly); $("vUp").textContent = fly ? "⬆" : "⤒"; $("vDown").style.visibility = fly ? "" : "hidden"; if (!fly && collides()) { const t = V.vox.top(Math.floor(V.pos.x), Math.floor(V.pos.z)); if (t != null) V.pos.y = t + 1.01; } }
function setSpeed(s) { V.speed = s; $("vSpeed").textContent = ["🐢", "🐇", "🚀"][s]; }
function closeView() {
  if (!V.on) return; V.on = false; cancelAnimationFrame(V.raf);
  if (V.group) for (const ck of [...V.meshes.keys()]) dropMeshes(ck);
  V.scene?.traverse(o => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach(m => { m.map?.dispose(); m.dispose(); }); });
  V.tex?.dispose(); V.orbit?.dispose(); V.orbit = null; V.meshes = new Map(); V.loaded = new Map(); V.vox = null;
  $("view").hidden = true; $("menu3d").hidden = true; document.body.style.overflow = "";
}
$("vClose").onclick = closeView;
$("vMode").onclick = () => setMode(!V.fly);
$("vSpeed").onclick = () => setSpeed((V.speed + 1) % 3);
addEventListener("keydown", e => {
  if (!V.on || V.mode !== "explore") { if (e.key === "Escape" && !$("modal").hidden) closeModal(); return; }
  if (e.key === "Escape") return closeView();
  if (e.code === "KeyF") setMode(!V.fly);
  V.keys[e.code] = true; if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
addEventListener("keyup", e => { V.keys[e.code] = false; });
addEventListener("blur", () => { V.keys = {}; });
// look by dragging
{
  const view = $("view"); let drag = null;
  view.addEventListener("pointerdown", e => {
    if (!V.on || V.mode !== "explore" || e.target.closest("button,#joy,#menu3d")) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; (() => { try { view.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } })(); $("menu3d").hidden = true;
  });
  view.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const k = e.pointerType === "touch" ? 0.006 : 0.005;
    V.yaw -= (e.clientX - drag.x) * k; V.pitch = Math.max(-1.55, Math.min(1.55, V.pitch - (e.clientY - drag.y) * k)); drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
  view.addEventListener("pointerup", end); view.addEventListener("pointercancel", end);
  // joystick
  const joy = $("joy"), knob = joy.querySelector("i");
  const jm = e => { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } V.joy.x = dx / m; V.joy.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener("pointerdown", e => { V.joy.id = e.pointerId; (() => { try { joy.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } })(); jm(e); e.stopPropagation(); });
  joy.addEventListener("pointermove", e => { if (e.pointerId === V.joy.id) jm(e); });
  const je = e => { if (e.pointerId !== V.joy.id) return; V.joy = { x: 0, y: 0, id: null }; knob.style.transform = ""; };
  joy.addEventListener("pointerup", je); joy.addEventListener("pointercancel", je);
  for (const [id, k] of [["vUp", "up"], ["vDown", "down"]]) { const b = $(id); b.addEventListener("pointerdown", e => { V[k] = 1; (() => { try { b.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } })(); e.stopPropagation(); }); const off = () => V[k] = 0; b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off); }
}
// ☰ menu
$("vMenuB").onclick = () => {
  const m = $("menu3d"); if (!m.hidden) { m.hidden = true; return; }
  const items = [];
  if (V.mode === "explore") {
    const sp = V.spots || {};
    if (sp.player) items.push(["🧍 Where the player was", () => { if (V.src.dims && sp.player.dim !== V.src.dim) switchDim(sp.player.dim, sp.player); else placeAt(sp.player); }]);
    if (sp.spawn) items.push(["📍 World spawn", () => { if (V.src.dims && V.src.dim !== 0) switchDim(0, sp.spawn); else placeAt(sp.spawn); }]);
    if (sp.start) items.push(["🎥 Back to the start view", () => { V.pos.set(sp.start.x, sp.start.y, sp.start.z); V.yaw = sp.start.yaw; V.pitch = sp.start.pitch; setMode(true); }]);
    if (!V.src.static) items.push(["🔢 Go to coordinates…", () => { const t = prompt("Type X and Z (for example: 100 -250)", `${Math.floor(V.pos.x)} ${Math.floor(V.pos.z)}`); if (!t) return; const [x, z] = t.split(/[ ,]+/).map(Number); if (isFinite(x) && isFinite(z)) placeAt({ x: x + 0.5, y: null, z: z + 0.5 }); }]);
    if (V.src.dims && V.src.dims.size > 1) { items.push(["lbl", "Dimension"]); for (const d of V.src.dims.keys()) items.push([(d === 1 ? "🔥 " : d === 2 ? "🌌 " : "🌍 ") + (DIMS[d] || "Dimension " + d) + (d === V.src.dim ? " ✓" : ""), () => switchDim(d)]); }
    if (!V.src.static) { items.push(["lbl", "How far you can see"]); for (const [n, r] of [["Near (fast)", 3], ["Medium", 5], ["Far", 7], ["Very far (slow)", 9]]) items.push([n + (V.R === r ? " ✓" : ""), () => { V.R = r; V.qc = null; setSky(V.sky); }]); }
  }
  items.push(["lbl", ""]); items.push(["📸 Save a picture", savePic]);
  m.innerHTML = items.map(([t], i) => t === "lbl" ? `<div class="lbl">${esc(items[i][1])}</div>` : `<button data-i="${i}">${esc(t)}</button>`).join("");
  m.onclick = e => { const b = e.target.closest("button"); if (!b) return; m.hidden = true; items[+b.dataset.i][1](); };
  m.hidden = false;
};
function switchDim(d, spot) {
  const s = V.src; const ns = worldSource(s.db, s.dims, d); ns.spots = s.spots; ns.dims = s.dims; ns.db = s.db;
  for (const ck of [...V.loaded.keys()]) unloadChunk(ck);
  V.src = ns; V.vox = new Vox(V.atlas); if (V.custom) V.vox.custom = V.custom; V.dirty.clear(); V.qc = null; setSky(ns.sky);
  const m = s.dims.get(d); const first = spot || (() => { const c = [...m.values()][0]; return { x: c[0] * 16 + 8, y: null, z: c[1] * 16 + 8 }; })();
  placeAt(spot && spot.dim === d ? spot : spot && d === 0 ? spot : first);
}
function savePic() {
  V.r.render(V.scene, V.cam);
  V.r.domElement.toBlob(b => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "block-peek.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }, "image/png");
}

/* ---------------- mob models ---------------- */
function geometries(j) {
  const out = [];
  if (Array.isArray(j["minecraft:geometry"])) for (const g of j["minecraft:geometry"]) { const d = g.description || {}; out.push({ id: d.identifier, tw: d.texture_width || 64, th: d.texture_height || 64, bones: g.bones || [] }); }
  for (const [k, g] of Object.entries(j)) if (k.startsWith("geometry.") && g && typeof g === "object") out.push({ id: k.split(":")[0], tw: g.texturewidth || 64, th: g.textureheight || 64, bones: g.bones || [] });
  return out.filter(g => g.id);
}
const DEG = Math.PI / 180, FL = p => [-(p?.[0] || 0), p?.[1] || 0, p?.[2] || 0];
function buildModel(g, texCanvas) {
  let map = null; if (texCanvas) { map = new THREE.CanvasTexture(texCanvas); map.magFilter = map.minFilter = THREE.NearestFilter; map.colorSpace = THREE.SRGBColorSpace; map.generateMipmaps = false; }
  const mat = new THREE.MeshLambertMaterial(map ? { map, alphaTest: 0.1, side: THREE.DoubleSide } : { color: 0xd8b080 });
  const root = new THREE.Group(), groups = {};
  for (const b of g.bones) groups[b.name] = new THREE.Group();
  for (const b of g.bones) {
    const gr = groups[b.name], piv = FL(b.pivot), par = b.parent && groups[b.parent] && g.bones.find(x => x.name === b.parent), pp = par ? FL(par.pivot) : [0, 0, 0];
    gr.position.set(piv[0] - pp[0], piv[1] - pp[1], piv[2] - pp[2]);
    const r = b.rotation || b.bind_pose_rotation || [0, 0, 0]; gr.rotation.set(-r[0] * DEG, -r[1] * DEG, r[2] * DEG, "ZYX");
    (par ? groups[b.parent] : root).add(gr);
    for (const c of b.cubes || []) {
      const m = new THREE.Mesh(cubeGeo(c, c.mirror ?? b.mirror, g.tw, g.th), mat);
      if (c.rotation) { const cp = FL(c.pivot || [c.origin[0] + c.size[0] / 2, c.origin[1] + c.size[1] / 2, c.origin[2] + c.size[2] / 2]); const cg = new THREE.Group(); cg.position.set(cp[0] - piv[0], cp[1] - piv[1], cp[2] - piv[2]); cg.rotation.set(-c.rotation[0] * DEG, -c.rotation[1] * DEG, c.rotation[2] * DEG, "ZYX"); m.position.set(-cp[0], -cp[1], -cp[2]); cg.add(m); gr.add(cg); }
      else { m.position.set(-piv[0], -piv[1], -piv[2]); gr.add(m); }
    }
  }
  return root;
}
function cubeGeo(c, mirror, tw, th) {
  const [ox, oy, oz] = c.origin || [0, 0, 0], [w, h, d] = c.size || [1, 1, 1], inf = c.inflate || 0;
  const x0 = -(ox + w) - inf, x1 = -ox + inf, y0 = oy - inf, y1 = oy + h + inf, z0 = oz - inf, z1 = oz + d + inf;
  let R = {};
  if (Array.isArray(c.uv) || !c.uv) { const [u, v] = c.uv || [0, 0];
    R = { east: [u, v + d, d, h], north: [u + d, v + d, w, h], west: [u + d + w, v + d, d, h], south: [u + 2 * d + w, v + d, w, h], up: [u + d, v, w, d], down: [u + d + w, v + d, w, -d] };
    if (mirror) { [R.east, R.west] = [R.west, R.east]; for (const k in R) { R[k] = [R[k][0] + R[k][2], R[k][1], -R[k][2], R[k][3]]; } }
  } else for (const [k, f] of Object.entries(c.uv)) if (f && f.uv) R[k] = [f.uv[0], f.uv[1], f.uv_size?.[0] ?? 0, f.uv_size?.[1] ?? 0];
  const P = [], U = [], I = [];
  const quad = (pts, r) => { if (!r) return; const n = P.length / 3; const [u, v, uw, vh] = r; const uv = [[u, v + vh], [u + uw, v + vh], [u + uw, v], [u, v]]; for (let k = 0; k < 4; k++) { P.push(...pts[k]); U.push(uv[k][0] / tw, 1 - uv[k][1] / th); } I.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], R.north);
  quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], R.south);
  quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], R.east);
  quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], R.west);
  quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], R.up);
  quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], R.down);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  return geo;
}
async function modelTexture(m, packs, i = 0) { const f = findTex(packs, m.texs[i]); return f ? await toCanvas(f.d, f.ext) : null; }
function modelScene(obj) {
  const scene = new THREE.Scene(); scene.add(new THREE.AmbientLight(0xffffff, 1.4)); const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(-3, 5, -4); scene.add(dl);
  scene.add(obj); const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()), r = Math.max(s.x, s.y, s.z, 1);
  return { scene, c, r, box };
}
let thumbR = null;
async function modelThumb(m, packs, cv) {
  try {
    if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(160, 160, false); }
    const obj = buildModel(m.g, await modelTexture(m, packs)), { scene, c, r } = modelScene(obj);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 1000); cam.position.set(c.x - r * 1.1, c.y + r * 0.7, c.z - r * 1.9); cam.lookAt(c);
    thumbR.render(scene, cam); cv.getContext("2d").drawImage(thumbR.domElement, 0, 0, 160, 160);
    scene.traverse(o => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
  } catch (e) { console.warn(e); }
}
async function openModel(m, packs) {
  closeView(); const r = renderer3();
  let ti = 0; const tex = await modelTexture(m, packs, ti);
  const obj = buildModel(m.g, tex), { scene, c, r: rad } = modelScene(obj);
  scene.background = new THREE.Color(0x1b261e);
  const grid = new THREE.GridHelper(Math.ceil(rad * 3 / 16) * 16, Math.ceil(rad * 3 / 16) * 2, 0x3d5a44, 0x2a3c2e); grid.position.y = new THREE.Box3().setFromObject(obj).min.y; scene.add(grid);
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 5000); cam.position.set(c.x - rad * 1.1, c.y + rad * 0.6, c.z - rad * 2);
  Object.assign(V, { on: true, mode: "model", r, scene, cam, last: performance.now() });
  V.orbit = new OrbitControls(cam, r.domElement); V.orbit.target.copy(c); V.orbit.enableDamping = true; V.orbit.autoRotate = true; V.orbit.autoRotateSpeed = 1.5; V.orbit.update();
  $("view").dataset.mode = "model"; $("view").hidden = false; $("vTitle").textContent = m.name + (tex ? "" : " (no texture found)"); document.body.style.overflow = "hidden";
  fit(); V.raf = requestAnimationFrame(loop);
  V.modelInfo = { m, packs, obj, ti };
}
// the ☰ button in model mode: change texture / spin
const oldMenu = $("vMenuB").onclick;
$("vMenuB").onclick = () => {
  if (V.mode !== "model") return oldMenu();
  const m = $("menu3d"); if (!m.hidden) { m.hidden = true; return; }
  const mi = V.modelInfo, items = [[V.orbit.autoRotate ? "⏸ Stop spinning" : "🔄 Spin", () => V.orbit.autoRotate = !V.orbit.autoRotate]];
  if (mi.m.texs.length > 1) { items.push(["lbl", "Textures"]); mi.m.texs.forEach((t, i) => items.push([(i === mi.ti ? "✓ " : "") + t.split("/").pop(), async () => { const cv = await modelTexture(mi.m, mi.packs, i); if (!cv) return; mi.ti = i; mi.obj.traverse(o => { if (o.material?.map) { o.material.map.image = cv; o.material.map.needsUpdate = true; } }); }])); }
  items.push(["📸 Save a picture", savePic]);
  m.innerHTML = items.map(([t], i) => t === "lbl" ? `<div class="lbl">${esc(items[i][1])}</div>` : `<button data-i="${i}">${esc(t)}</button>`).join("");
  m.onclick = e => { const b = e.target.closest("button"); if (!b) return; m.hidden = true; items[+b.dataset.i][1](); };
  m.hidden = false;
};

// for testing
window.__bp = { V, openBytes, F };
