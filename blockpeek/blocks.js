// Block Peek: how each block looks. Shapes, see-through or not, and hand-painted 16x16 textures.
// The textures are drawn by code (no Minecraft art is copied), so they look "close enough".

const DYES = { white: "#e9ecec", orange: "#f07613", magenta: "#bd44b3", light_blue: "#3aafd9", yellow: "#f8c527", lime: "#70b919", pink: "#ed8dac", gray: "#3e4447", light_gray: "#8e8e86", silver: "#8e8e86", cyan: "#158991", purple: "#792aac", blue: "#35399d", brown: "#724728", green: "#546d1b", red: "#a12722", black: "#141519" };
const TERRA = { white: "#d1b2a1", orange: "#a15325", magenta: "#95576c", light_blue: "#716c89", yellow: "#ba8523", lime: "#677534", pink: "#a14e4e", gray: "#392a23", light_gray: "#876a61", silver: "#876a61", cyan: "#565b5b", purple: "#764656", blue: "#4a3b5b", brown: "#4d3323", green: "#4c522a", red: "#8f3d2e", black: "#251610" };
// wood: [planks, bark, log inside, leaves]
const WOOD = {
  oak: ["#a2824e", "#6b5433", "#b49359", "#4e8a2c"], spruce: ["#735531", "#3b2a17", "#6f5434", "#3d5e3a"], birch: ["#c4b07b", "#dcd9d0", "#c8b77a", "#6a9a45"],
  jungle: ["#a07351", "#56461c", "#ab8752", "#3f8f1d"], acacia: ["#a8592f", "#67615a", "#b0623a", "#5f9524"], dark_oak: ["#43301a", "#3a2c18", "#4f3b22", "#3a6e1c"],
  mangrove: ["#773631", "#56432e", "#7a3a33", "#5a8d2c"], cherry: ["#e2b5ad", "#3a2129", "#d9a49c", "#f1b6d3"], pale_oak: ["#e3dad3", "#655d58", "#e8ddd5", "#8a8f86"],
  crimson: ["#6a344b", "#5c1d2a", "#7e3a56", "#8c1414"], warped: ["#2b6963", "#3a3a4e", "#36766f", "#167e86"], bamboo: ["#c9b24f", "#7d8c2c", "#d0bb5a", "#5e8f2c"],
};
const ORES = { coal: "#1e1e1e", iron: "#d8a989", gold: "#f6d33c", diamond: "#5decf5", emerald: "#17d460", lapis: "#1f4fbf", redstone: "#ea1a1a", lit_redstone: "#ff3030", copper: "#d07444", quartz: "#eae3d9", nether_gold: "#f6d33c" };
const FLOWER = { dandelion: "#f6e12b", yellow_flower: "#f6e12b", poppy: "#d6271c", red_flower: "#d6271c", rose: "#d6271c", blue_orchid: "#2fb0e8", allium: "#b863e6", azure_bluet: "#e6eef0", red_tulip: "#e0332a", orange_tulip: "#ee8a2c", white_tulip: "#f2f2f2", pink_tulip: "#efa8d0", oxeye_daisy: "#f5f5ee", cornflower: "#4766d6", lily_of_the_valley: "#ffffff", wither_rose: "#2a2a24", sunflower: "#f6cc20", lilac: "#d39be0", rose_bush: "#c42020", peony: "#e6a7d6", torchflower: "#f08a30", pitcher_plant: "#7a8be0", pink_petals: "#f2a0c8", wildflowers: "#f6e12b", open_eyeblossom: "#f0a030", closed_eyeblossom: "#7a7a8a" };

const P = (pat, c1, c2, c3) => [pat, c1 || "", c2 || "", c3 || ""].join("|");
const cube = (all, o = {}) => ({ shape: "cube", mat: "solid", occl: true, top: all, bottom: all, side: all, ...o });
const SKIP = new Set(["air", "cave_air", "void_air", "light_block", "light", "barrier", "structure_void", "moving_block", "moving_piston", "piston_arm_collision", "sticky_piston_arm_collision", "tripwire", "string", "fire", "soul_fire", "unknown", "end_gateway", "end_portal", "portal", "nether_portal", "camera", "info_update", "info_update2", "reserved6", "client_request_placeholder_block"]);

const LIST = {
  stone: P("noise", "#7f7f7f"), granite: P("noise", "#9a6c56", "", "0.18"), polished_granite: P("smooth", "#9c6b57"), diorite: P("noise", "#bdbdbd", "", "0.2"), polished_diorite: P("smooth", "#c3c3c5"),
  andesite: P("noise", "#888888", "", "0.18"), polished_andesite: P("smooth", "#848786"), deepslate: P("noise", "#4f4f53", "", "0.16"), cobbled_deepslate: P("cobble", "#4a4a4e"), polished_deepslate: P("smooth", "#48484a"),
  deepslate_bricks: P("bricks8", "#4c4c4f", "#333336"), deepslate_tiles: P("tiles", "#363638", "#222224"), tuff: P("noise", "#6c6d66", "", "0.15"), tuff_bricks: P("bricks8", "#62665e", "#4a4d47"), polished_tuff: P("smooth", "#636861"),
  calcite: P("noise", "#dfe0dc", "", "0.06"), dripstone_block: P("bands", "#86705f"), bedrock: P("noise", "#575757", "", "0.6"), cobblestone: P("cobble", "#7a7a7a"), mossy_cobblestone: P("cobble", "#6e7a5d"),
  dirt: P("noise", "#866043", "", "0.22"), coarse_dirt: P("noise", "#77553b", "", "0.35"), rooted_dirt: P("noise", "#906a4c", "", "0.3"), farmland: P("rows", "#5a3a20"), mud: P("noise", "#3c3a3d", "", "0.1"), packed_mud: P("noise", "#8e6b50", "", "0.12"),
  mud_bricks: P("bricks", "#896a4f", "#6d543e"), clay: P("noise", "#a0a6b3", "", "0.08"), gravel: P("noise", "#837f7e", "", "0.5"), sand: P("noise", "#dbcfa3", "", "0.1"), red_sand: P("noise", "#be6621", "", "0.12"), suspicious_sand: P("noise", "#d6c99c", "", "0.15"), suspicious_gravel: P("noise", "#857f7d", "", "0.45"),
  sandstone: P("bands", "#d8cb9b"), cut_sandstone: P("smooth", "#d9cc9e"), smooth_sandstone: P("smooth", "#e0d6aa"), chiseled_sandstone: P("box", "#d8cb9b", "#b5a77a"), red_sandstone: P("bands", "#b6601f"), smooth_red_sandstone: P("smooth", "#b5621f"),
  snow: P("noise", "#f4fafa", "", "0.04"), powder_snow: P("noise", "#f6fbfb", "", "0.04"), ice: P("noise", "#91b7fd", "", "0.08"), packed_ice: P("noise", "#8db4fa", "", "0.06"), blue_ice: P("noise", "#74a7fd", "", "0.06"),
  obsidian: P("noise", "#14121d", "#2b2140", "0.5"), crying_obsidian: P("ore", "#14121d", "#8a2be2"), netherrack: P("noise", "#6f3534", "", "0.3"), soul_sand: P("noise", "#513e32", "", "0.3"), soul_soil: P("noise", "#4b3a2f", "", "0.25"),
  glowstone: P("glow", "#c99a5b", "#ffe6a0"), shroomlight: P("glow", "#f19a4a", "#ffd090"), nether_brick: P("bricks", "#2c1519", "#1a0c0f"), nether_bricks: P("bricks", "#2c1519", "#1a0c0f"), red_nether_brick: P("bricks", "#45070a", "#2a0405"), red_nether_bricks: P("bricks", "#45070a", "#2a0405"),
  basalt: P("bark", "#4a4a4f"), smooth_basalt: P("noise", "#48484e", "", "0.1"), polished_basalt: P("smooth", "#5a5a5e"), blackstone: P("noise", "#2a2329", "", "0.2"), polished_blackstone: P("smooth", "#35303a"), polished_blackstone_bricks: P("bricks8", "#30292f", "#1d181d"), gilded_blackstone: P("ore", "#2a2329", "#e8b020"),
  end_stone: P("noise", "#dbde9e", "", "0.12"), end_bricks: P("bricks8", "#dbe0a3", "#bfc489"), purpur_block: P("tiles", "#a77aa7", "#8d628d"), purpur_pillar: P("bands", "#ab81ab"),
  prismarine: P("noise", "#63a297", "#4c8b7c", "0.25"), prismarine_bricks: P("bricks8", "#63ab9e", "#4e8d82"), dark_prismarine: P("tiles", "#335b4b", "#24453a"), sea_lantern: P("glow", "#acc8be", "#eaf6ef"),
  quartz_block: P("smooth", "#ebe5de"), smooth_quartz: P("smooth", "#ece6df"), quartz_bricks: P("bricks8", "#eae4dc", "#d0c9bf"), quartz_pillar: P("bands", "#ebe6e0"), chiseled_quartz_block: P("box", "#e7e2da", "#cfc8bd"),
  brick_block: P("bricks", "#976050", "#c8b8ae"), bricks: P("bricks", "#976050", "#c8b8ae"), stone_bricks: P("bricks8", "#7a7a7a", "#5a5a5a"), stonebrick: P("bricks8", "#7a7a7a", "#5a5a5a"), mossy_stone_bricks: P("bricks8", "#6f7a63", "#555d4b"),
  cracked_stone_bricks: P("bricks8", "#767676", "#4c4c4c"), chiseled_stone_bricks: P("box", "#787878", "#5c5c5c"), smooth_stone: P("smooth", "#9f9f9f"), stone_slab: P("smooth", "#9f9f9f"),
  iron_block: P("smooth", "#dcdcdc"), gold_block: P("smooth", "#f8d33f"), diamond_block: P("smooth", "#62ede4"), emerald_block: P("smooth", "#2ecc60"), lapis_block: P("smooth", "#1f43a0"), redstone_block: P("smooth", "#a91807"),
  coal_block: P("noise", "#141414", "", "0.3"), netherite_block: P("smooth", "#433d40"), copper_block: P("smooth", "#c06b4f"), raw_iron_block: P("noise", "#a6896b", "", "0.3"), raw_gold_block: P("noise", "#dda92e", "", "0.3"), raw_copper_block: P("noise", "#9a6a4f", "", "0.3"),
  amethyst_block: P("noise", "#8562c0", "", "0.25"), budding_amethyst: P("noise", "#8a60c4", "", "0.3"), beacon: P("glow", "#7fe0e6", "#ffffff"), magma: P("glow", "#8f3f1d", "#f09030"), magma_block: P("glow", "#8f3f1d", "#f09030"),
  bone_block: P("bands", "#e3dfc8"), sculk: P("noise", "#0c1d24", "#29dfeb", "0.3"), moss_block: P("noise", "#5a7330", "", "0.2"), pale_moss_block: P("noise", "#8a8f86", "", "0.15"), hay_block: P("bands", "#c39b1a"),
  melon_block: P("bands", "#7a9b20"), melon: P("bands", "#7a9b20"), sponge: P("noise", "#c3c044", "", "0.3"), wet_sponge: P("noise", "#a6a53c", "", "0.3"), honeycomb_block: P("tiles", "#e59a1e", "#c47b10"),
  dried_kelp_block: P("bands", "#38432a"), target: P("box", "#e4d4c4", "#c82828"), note_block: P("box", "#6b4a35", "#3d2a1e"), noteblock: P("box", "#6b4a35", "#3d2a1e"), jukebox: P("box", "#6b4a35", "#3d2a1e"),
  crafting_table: P("box", "#9a6f43", "#5a3e22"), furnace: P("box", "#727272", "#3a3a3a"), lit_furnace: P("box", "#727272", "#f08a30"), blast_furnace: P("box", "#545454", "#2e2e2e"), smoker: P("box", "#6b5643", "#3a2e24"),
  chest: P("box", "#a2702f", "#5b3e19"), trapped_chest: P("box", "#a2702f", "#7a2020"), ender_chest: P("box", "#24343a", "#0e1618"), barrel: P("box", "#86633a", "#4e3a21"), bookshelf: P("books", "#a2824e"), chiseled_bookshelf: P("books", "#a2824e"),
  tnt: P("tnt", "#d33a2f"), pumpkin: P("ridges", "#e3901d"), carved_pumpkin: P("ridges", "#e3901d"), lit_pumpkin: P("ridges", "#e3a02d"), jack_o_lantern: P("ridges", "#e3a02d"),
  slime: P("noise", "#79c05a", "", "0.1"), honey_block: P("noise", "#f6b02e", "", "0.1"), scaffolding: P("box", "#d3b06a", "#a07c40"),
  dispenser: P("box", "#727272", "#3a3a3a"), dropper: P("box", "#727272", "#3a3a3a"), observer: P("box", "#5c5c5c", "#2a2a2a"), piston: P("box", "#9b8460", "#6e6e6e"), sticky_piston: P("box", "#9b8460", "#6e9e4e"),
  redstone_lamp: P("box", "#5a3a20", "#8a5a30"), lit_redstone_lamp: P("glow", "#c08a50", "#ffe0a0"), enchanting_table: P("box", "#c02020", "#1a1a2a"), anvil: P("smooth", "#444444"), cauldron: P("smooth", "#3f3f3f"),
  loom: P("box", "#9b7a55", "#d8c4a4"), cartography_table: P("box", "#6a4a2e", "#d8c4a4"), fletching_table: P("box", "#c6b37a", "#7a6040"), smithing_table: P("box", "#3a3a48", "#7a5a3a"), lectern: P("planks", "#a2824e"), composter: P("planks", "#7d5a32"),
  mob_spawner: P("glass", "#2a3a4a"), spawner: P("glass", "#2a3a4a"), respawn_anchor: P("box", "#20142e", "#8a3ad8"), lodestone: P("box", "#9a9a9a", "#555555"), conduit: P("glow", "#9a8a60", "#c0e0ff"),
  dirt_with_roots: P("noise", "#906a4c", "", "0.3"), muddy_mangrove_roots: P("noise", "#46403a", "", "0.25"), resin_block: P("noise", "#d9671b", "", "0.15"), resin_bricks: P("bricks", "#d9671b", "#a94a10"),
  mycelium_top: P("noise", "#6f6369", "", "0.25"), podzol_top: P("noise", "#5b3e1b", "", "0.3"), grass_top: P("noise", "#62a33a", "", "0.22"),
  waxed_copper: P("smooth", "#c06b4f"), cut_copper: P("tiles", "#bf6a4c", "#9c5136"), chiseled_copper: P("box", "#b8664a", "#8a4a34"), copper_grate: P("glass", "#c06b4f"),
  ochre_froglight: P("glow", "#f6e7a6", "#ffffff"), verdant_froglight: P("glow", "#d6f0c8", "#ffffff"), pearlescent_froglight: P("glow", "#f2dcef", "#ffffff"),
  nether_wart_block: P("noise", "#740a0a", "", "0.25"), warped_wart_block: P("noise", "#167e86", "", "0.25"), crimson_nylium: P("noise", "#821c1c", "", "0.3"), warped_nylium: P("noise", "#2b8a72", "", "0.3"),
  ancient_debris: P("rings", "#5e4440", "#3e2a26"), lodestone_top: P("smooth", "#9a9a9a"), reinforced_deepslate: P("box", "#575b5a", "#3a3a3a"), sculk_catalyst: P("box", "#0d1f25", "#8af0f0"), sculk_shrieker: P("box", "#3a3a32", "#0d1f25"),
  dragon_egg: P("noise", "#1a0f22", "", "0.3"), end_portal_frame: P("box", "#5a8a6a", "#dbde9e"), command_block: P("box", "#c08560", "#4a4a4a"), structure_block: P("box", "#5a4a5a", "#2a2a2a"), jigsaw: P("box", "#5a4a5a", "#2a2a2a"),
  water: P("water", "#3f76e4"), flowing_water: P("water", "#3f76e4"), lava: P("lava", "#d4560e"), flowing_lava: P("lava", "#d4560e"),
  glass: P("glass", "#d8f0ff"), tinted_glass: P("glass", "#2c2433"), glass_pane: P("glass", "#d8f0ff"), iron_bars: P("bars", "#a0a0a0"), cobweb: P("web", "#e8e8e8"), web: P("web", "#e8e8e8"),
};

function hashColor(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); const hue = (h >>> 0) % 360; return `hsl(${hue},35%,50%)`; }
const woodOf = n => { for (const w of Object.keys(WOOD).sort((a, b) => b.length - a.length)) if (n.includes(w)) return w; return null; };
const dyeOf = n => { for (const d of Object.keys(DYES).sort((a, b) => b.length - a.length)) if (n.startsWith(d + "_")) return d; return null; };

// Turn older names (with a "type" state) into today's names
function modernName(n, s) {
  const t = s.wood_type || s.old_log_type || s.new_log_type || s.old_leaf_type || s.new_leaf_type;
  if (["log", "log2"].includes(n)) return (t || "oak") + "_log";
  if (["leaves", "leaves2"].includes(n)) return (t || "oak") + "_leaves";
  if (n === "planks") return (t || "oak") + "_planks";
  if (n === "wood") return (t || "oak") + "_log";
  if (["wooden_slab", "double_wooden_slab"].includes(n)) return (t || "oak") + (n.startsWith("double") ? "_planks" : "_slab");
  if (n === "sapling") return (s.sapling_type || "oak") + "_sapling";
  if (s.color && ["wool", "concrete", "concrete_powder", "stained_glass", "stained_glass_pane", "carpet", "stained_hardened_clay", "shulker_box"].includes(n)) return s.color + "_" + (n === "stained_hardened_clay" ? "terracotta" : n);
  if (n === "stone" && s.stone_type && s.stone_type !== "stone") return s.stone_type.replace("_smooth", "").replace(/^(granite|diorite|andesite)_smooth$/, "polished_$1");
  if (n === "red_flower") return s.flower_type === "tulip_red" ? "red_tulip" : (s.flower_type || "poppy").replace(/^tulip_(.*)/, "$1_tulip").replace("houstonia", "azure_bluet").replace("orchid", "blue_orchid").replace("oxeye", "oxeye_daisy");
  if (n === "tallgrass") return s.tall_grass_type === "fern" ? "fern" : "short_grass";
  if (n === "double_plant") return { sunflower: "sunflower", syringa: "lilac", grass: "tall_grass", fern: "large_fern", rose: "rose_bush", paeonia: "peony" }[s.double_plant_type] || "tall_grass";
  if (n === "sand" && s.sand_type === "red") return "red_sand";
  if (n === "stonebrick") return { mossy: "mossy_stone_bricks", cracked: "cracked_stone_bricks", chiseled: "chiseled_stone_bricks" }[s.stone_brick_type] || "stone_bricks";
  if (n === "sandstone" && s.sand_stone_type && s.sand_stone_type !== "default") return s.sand_stone_type + "_sandstone";
  if (n === "prismarine" && s.prismarine_block_type && s.prismarine_block_type !== "default") return s.prismarine_block_type === "dark" ? "dark_prismarine" : "prismarine_bricks";
  if (n === "monster_egg") return "stone";
  if (n === "coral_block") return (s.coral_color || "blue") + "_coral_block";
  return n;
}

// The look of one block: { shape, mat, occl, top, bottom, side, h }
// shape: cube | slab | slabTop | thin | post | cross | liquid | none.  mat: solid | cut | liquid
export function appearance(rawName, states = {}, java = false) {
  const a = look(rawName, states, java);
  if (a.mat === "solid" && /^(glass|bars|web)\|/.test(a.side || "")) { a.mat = "cut"; a.occl = false; if (a.side.startsWith("glass")) a.glass = 1; }
  return a;
}
function look(rawName, states, java) {
  let n = String(rawName).replace(/^minecraft:/, "");
  if (SKIP.has(n) || n.endsWith("_portal") || n.startsWith("light_block")) return { shape: "none" };
  n = modernName(n, states);
  if (java && (n === "grass" || n === "short_grass")) return plant(n, "#6aa84f");
  if (n === "grass") n = "grass_block";
  const slabTop = states.top_slot_bit === 1 || states.top_slot_bit === true || states["minecraft:vertical_half"] === "top" || states.type === "top";
  // liquids
  if (/^(flowing_)?water$|^bubble_column$/.test(n)) return { shape: "liquid", mat: "liquid", occl: false, top: LIST.water, bottom: LIST.water, side: LIST.water, liq: "w" };
  if (/^(flowing_)?lava$/.test(n)) return { shape: "liquid", mat: "liquid", occl: false, top: LIST.lava, bottom: LIST.lava, side: LIST.lava, liq: "l" };
  // grass-like blocks with a different top
  if (n === "grass_block" || n === "grass_path" || n === "dirt_path") { const path = n !== "grass_block"; return cube(LIST.dirt, { top: path ? P("noise", "#947a45", "", "0.15") : LIST.grass_top, side: path ? P("grassside", "#947a45", "#866043") : P("grassside", "#62a33a", "#866043") }); }
  if (n === "mycelium") return cube(LIST.dirt, { top: LIST.mycelium_top, side: P("grassside", "#6f6369", "#866043") });
  if (n === "podzol") return cube(LIST.dirt, { top: LIST.podzol_top, side: P("grassside", "#5b3e1b", "#866043") });
  if (n === "snow_layer" || n === "snow_layer_block") return { shape: "thin", mat: "solid", occl: false, h: 2 / 16, top: LIST.snow, bottom: LIST.snow, side: LIST.snow };
  if (n === "cactus") return { shape: "cube", mat: "cut", occl: false, top: P("smooth", "#5b8a2f"), bottom: P("smooth", "#5b8a2f"), side: P("bands", "#4f7f27") };
  if (n === "crafting_table") return cube(LIST.crafting_table, { top: P("box", "#a07a4a", "#6b4a2a"), bottom: P("planks", "#a2824e") });
  if (n === "tnt") return cube(LIST.tnt, { top: P("smooth", "#d33a2f") });
  if (/(pumpkin|jack_o_lantern)$/.test(n)) return cube(LIST.pumpkin, { top: P("smooth", "#c87a14") });
  if (n === "melon_block" || n === "melon") return cube(LIST.melon, { top: P("smooth", "#8aa82a") });
  if (n === "hay_block" || n === "bone_block" || n === "quartz_pillar" || n === "purpur_pillar" || n === "basalt") return cube(LIST[n], { top: P("smooth", hexOf(LIST[n])) });
  if (n === "bookshelf" || n === "chiseled_bookshelf") return cube(LIST.bookshelf, { top: P("planks", "#a2824e"), bottom: P("planks", "#a2824e") });
  if (n === "farmland") return { shape: "slab15", mat: "solid", occl: false, top: LIST.farmland, bottom: LIST.dirt, side: LIST.dirt };
  // ores
  if (/_ore$/.test(n)) {
    const deep = n.startsWith("deepslate_"), nether = n.startsWith("nether_") || n === "quartz_ore";
    const kind = n.replace(/^deepslate_/, "").replace(/_ore$/, "").replace(/^lit_/, "");
    const base = deep ? "#4f4f53" : nether ? "#6f3534" : "#7f7f7f";
    return cube(P("ore", base, ORES[kind] || ORES[kind.replace("nether_", "")] || "#e0e0e0"));
  }
  // dyed blocks
  const dye = dyeOf(n);
  if (dye) {
    const rest = n.slice(dye.length + 1), c = DYES[dye];
    if (rest === "wool") return cube(P("wool", c));
    if (rest === "concrete") return cube(P("noise", c, "", "0.03"));
    if (rest === "concrete_powder") return cube(P("noise", c, "", "0.14"));
    if (rest === "terracotta") return cube(P("noise", TERRA[dye], "", "0.08"));
    if (rest === "glazed_terracotta") return cube(P("glazed", c, TERRA[dye]));
    if (rest === "stained_glass") return { ...cube(P("glass", c)), mat: "cut", occl: false, glass: 1 };
    if (rest === "stained_glass_pane") return { shape: "pane", mat: "cut", occl: false, top: P("glass", c), bottom: P("glass", c), side: P("glass", c) };
    if (rest === "carpet") return { shape: "thin", mat: "solid", occl: false, h: 1 / 16, top: P("wool", c), bottom: P("wool", c), side: P("wool", c) };
    if (rest === "shulker_box") return cube(P("box", c, "#00000040"));
    if (rest === "bed") return { shape: "slab9", mat: "solid", occl: false, top: P("wool", c), bottom: P("planks", "#a2824e"), side: P("wool", c) };
    if (rest === "candle" || rest === "banner" || rest === "wall_banner") return rest === "candle" ? plant(n, c) : { shape: "none" };
  }
  if (n === "terracotta" || n === "hardened_clay") return cube(P("noise", "#985e43", "", "0.08"));
  // coral
  if (/coral_block$/.test(n)) return cube(P("noise", coralColor(n), "", "0.3"));
  if (/coral|sea_pickle/.test(n)) return plant(n, coralColor(n));
  // copper (with rust)
  if (/copper/.test(n) && !/ore/.test(n)) {
    const c = /oxidized/.test(n) ? "#52a284" : /weathered/.test(n) ? "#6c9e70" : /exposed/.test(n) ? "#a17e68" : "#c06b4f";
    const base = /cut_copper|copper_bricks/.test(n) ? P("tiles", c, shade(c, -0.18)) : /grate/.test(n) ? P("glass", c) : /bulb/.test(n) ? P("glow", c, "#ffd090") : /door|trapdoor/.test(n) ? P("box", c, shade(c, -0.25)) : P("smooth", c);
    return withShape(n, cube(base, /grate/.test(n) ? { mat: "cut", occl: false } : {}));
  }
  // wood things
  const w = woodOf(n);
  if (w && !/fungus|roots|wart/.test(n)) {
    const [pl, bark, inside, leaf] = WOOD[w];
    if (/leaves$|_leaves|azalea_leaves/.test(n)) return { ...cube(P("leaves", leaf)), mat: "cut", occl: false, leaves: 1 };
    if (/_sapling$|propagule/.test(n)) return plant(n, leaf);
    if (/stripped_.*(log|wood|stem|hyphae)$/.test(n)) return cube(P("bark", inside), { top: P("rings", inside, shade(inside, -0.15)), bottom: P("rings", inside, shade(inside, -0.15)), side: P("bark", inside), pillar: 1 });
    if (/_(wood|hyphae)$/.test(n)) return cube(w === "birch" ? P("birch", bark) : P("bark", bark));
    if (/_(log|stem)$/.test(n) || n === "bamboo_block") return cube(w === "birch" ? P("birch", bark) : P("bark", bark), { top: P("rings", bark, inside), bottom: P("rings", bark, inside), pillar: 1 });
    return withShape(n, cube(w === "bamboo" ? P("bands", pl) : P("planks", pl)));
  }
  if (n === "mangrove_roots") return { ...cube(P("leaves", "#4a3b2a")), mat: "cut", occl: false, leaves: 1 };
  if (/azalea_leaves/.test(n)) return { ...cube(P("leaves", "#5f7e2b")), mat: "cut", occl: false, leaves: 1 };
  if (/mushroom_block|mushroom_stem/.test(n)) return cube(P("noise", /red/.test(n) ? "#b62a28" : /brown/.test(n) ? "#926a4b" : "#cfc8b8", "", "0.15"));
  // plants and small things
  const fl = Object.keys(FLOWER).find(f => n === f || n === "potted_" + f);
  if (fl) return plant(n, FLOWER[fl], "flower");
  if (/^(short_grass|tall_grass|fern|large_fern|deadbush|dead_bush|seagrass|tall_seagrass|kelp|kelp_plant|vine|.*_vines|.*_vines_plant|cave_vines.*|glow_lichen|hanging_roots|twisting_vines|weeping_vines|nether_sprouts|crimson_roots|warped_roots|bush|firefly_bush|short_dry_grass|tall_dry_grass|leaf_litter|sugar_cane|reeds|bamboo|bamboo_sapling|sweet_berry_bush|small_dripleaf_block|big_dripleaf|spore_blossom|moss_carpet|pale_moss_carpet|pale_hanging_moss|lily_pad|waterlily|azalea|flowering_azalea|mangrove_propagule|pitcher_crop|torchflower_crop|cactus_flower)$/.test(n)) {
    if (/lily_pad|waterlily|moss_carpet|leaf_litter/.test(n)) return { shape: "thin", mat: "cut", occl: false, h: 1 / 16, top: P("leaves", /pale/.test(n) ? "#8a8f86" : "#4f8a2c"), bottom: P("leaves", "#4f8a2c"), side: P("leaves", "#4f8a2c") };
    if (/azalea$/.test(n)) return { ...cube(P("leaves", "#6a8a32")), mat: "cut", occl: false, leaves: 1 };
    const col = /dead|dry/.test(n) ? "#9a7a4a" : /kelp|seagrass/.test(n) ? "#3f8f3a" : /crimson|weeping/.test(n) ? "#a0262a" : /warped|twisting|nether_sprouts/.test(n) ? "#1fa38a" : /sugar_cane|reeds|bamboo/.test(n) ? "#8fc25a" : /berry/.test(n) ? "#3d6a3a" : /pale/.test(n) ? "#9aa097" : /glow|spore/.test(n) ? "#c8d080" : "#62a33a";
    return plant(n, col);
  }
  if (/^(wheat|carrots|potatoes|beetroot|nether_wart|melon_stem|pumpkin_stem|torchflower_crop|cocoa)$/.test(n)) return plant(n, n === "carrots" ? "#e88a22" : n === "beetroot" ? "#a8323a" : n === "nether_wart" ? "#8a1a1a" : "#b8b040", "crop");
  if (/(^|_)mushroom$|fungus$/.test(n)) return plant(n, /red|crimson/.test(n) ? "#d03030" : /warped/.test(n) ? "#1fa38a" : "#a77a5a", "flower");
  if (/torch$|^lantern$|^soul_lantern$|candle$|end_rod/.test(n)) return { shape: "cross", mat: "cut", occl: false, top: P("torch", /soul/.test(n) ? "#60d8f0" : "#ffcc40"), bottom: P("torch", "#ffcc40"), side: P("torch", /soul/.test(n) ? "#60d8f0" : "#ffcc40") };
  if (/^(rail|golden_rail|powered_rail|detector_rail|activator_rail|redstone_wire)$/.test(n)) return { shape: "thin", mat: "cut", occl: false, h: 1 / 16, top: P("rail", n === "redstone_wire" ? "#a01010" : "#7a6a5a"), bottom: P("rail", "#7a6a5a"), side: P("rail", "#7a6a5a") };
  if (/ladder$/.test(n)) return plant(n, "#9a7a4a", "ladder");
  if (/(pressure_plate|_button|lever|tripwire_hook|sign|frame|skull|head|banner|item_frame|flower_pot|decorated_pot|bell|chain|lightning_rod|amethyst_cluster|_bud|pointed_dripstone|sniffer_egg|turtle_egg|frog_spawn|heavy_core|vault|trial_spawner|crafter|hopper|comparator|repeater|daylight_detector|brewing_stand|grindstone|stonecutter|campfire|bed$)/.test(n)) {
    if (/stonecutter|daylight_detector/.test(n)) return { shape: "slab9", mat: "solid", occl: false, top: P("smooth", "#8a8a8a"), bottom: P("smooth", "#8a8a8a"), side: P("smooth", "#8a8a8a") };
    if (/hopper|vault|trial_spawner|crafter/.test(n)) return cube(P("box", "#4a4a4a", "#2a2a2a"), { mat: "cut", occl: false });
    if (/campfire/.test(n)) return { shape: "slab9", mat: "cut", occl: false, top: P("glow", "#c06020", "#ffd060"), bottom: P("bark", "#6b5433"), side: P("bark", "#6b5433") };
    return { shape: "none" };
  }
  // cobblestone / brick / stone family with shapes (stairs, slabs, walls)
  const base = baseName(n);
  const look = LIST[base] || LIST[base + "s"] || LIST[base.replace(/s$/, "")] || guess(base);
  return withShape(n, cube(look, LIST[base] && LIST[n] === undefined && /sandstone|quartz_block|purpur_block/.test(base) ? {} : {}));
}
function withShape(n, a) {
  if (/double_slab|double_.*slab|_slab_double/.test(n)) return a;
  if (/_slab$|^slab$|_slab\d?$/.test(n)) return { ...a, shape: "slab", occl: false };
  if (/_fence_gate$|fence_gate$/.test(n)) return { ...a, shape: "post", w: 0.0625, occl: false };
  if (/_fence$|^fence$/.test(n)) return { ...a, shape: "post", w: 0.125, occl: false };
  if (/_wall$|^cobblestone_wall$/.test(n)) return { ...a, shape: "post", w: 0.25, occl: false };
  if (/_pane$|^iron_bars$/.test(n)) return { ...a, shape: "pane", mat: "cut", occl: false };
  if (/_trapdoor$|^trapdoor$/.test(n)) return { ...a, shape: "thin", h: 3 / 16, occl: false, mat: "cut" };
  if (/_door$|^door$|wooden_door|iron_door/.test(n)) return { ...a, shape: "post", w: 0.09, occl: false, mat: "cut" };
  if (/_stairs$/.test(n)) return { ...a, shape: "stairs", occl: false };
  return a;
}
function baseName(n) {
  return n.replace(/^(waxed_|infested_)/, "").replace(/_?(double_slab|slab|stairs|wall|fence_gate|fence|pressure_plate|button|door|trapdoor|pane)$/, "")
    .replace(/^(stone_brick|mossy_stone_brick|nether_brick|red_nether_brick|end_stone_brick|prismarine_brick|deepslate_brick|tuff_brick|mud_brick|quartz_brick|polished_blackstone_brick)$/, "$1s")
    .replace(/^brick$/, "bricks").replace(/^normal_stone$/, "stone").replace(/^cobbled_deepslate$/, "cobbled_deepslate").replace(/^deepslate_tile$/, "deepslate_tiles").replace(/^end_stone_bricks?$/, "end_bricks").replace(/^quartz$/, "quartz_block").replace(/^purpur$/, "purpur_block").replace(/^smooth_stone$/, "smooth_stone");
}
function guess(n) {
  if (/glass/.test(n)) return LIST.glass;
  if (/brick/.test(n)) return P("bricks8", hashColor(n), "#00000040");
  if (/tile/.test(n)) return P("tiles", hashColor(n), "#00000040");
  if (/polished|smooth|block|cut_/.test(n)) return P("smooth", hashColor(n));
  if (/sandstone/.test(n)) return LIST.sandstone;
  if (/stone|rock|slate/.test(n)) return LIST.stone;
  if (/nether/.test(n)) return LIST.netherrack;
  return P("noise", hashColor(n), "", "0.15");
}
function plant(n, c, kind = "grass") { const t = P(kind === "flower" ? "flower" : kind === "crop" ? "crop" : kind === "ladder" ? "ladder" : "plantgrass", c); return { shape: kind === "ladder" ? "thinwall" : "cross", mat: "cut", occl: false, top: t, bottom: t, side: t }; }
function coralColor(n) { return /dead/.test(n) ? "#8a837d" : /tube/.test(n) ? "#3157d2" : /brain/.test(n) ? "#d55aa0" : /bubble/.test(n) ? "#a218a8" : /fire/.test(n) ? "#c8282a" : /horn/.test(n) ? "#d6c63c" : "#3157d2"; }
function hexOf(spec) { return spec.split("|")[1]; }

/* ---------------- colors ---------------- */
function parseColor(c) {
  if (!c) return [128, 128, 128, 255];
  if (c[0] === "#") { const h = c.slice(1); const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a]; }
  const m = c.match(/hsl\((\d+),(\d+)%,(\d+)%\)/);
  if (m) { const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100; const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4), 255]; }
  return [128, 128, 128, 255];
}
function shade(c, k) { const [r, g, b] = parseColor(c); const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + k)))); return "#" + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, "0")).join(""); }

/* ---------------- texture atlas ---------------- */
// Every texture is 16x16. The atlas holds 64x64 of them (1024x1024 px).
export const ATLAS_TILES = 64;
export class Atlas {
  constructor(canvas) { this.map = new Map(); this.n = 0; this.cv = canvas; this.cx = canvas ? canvas.getContext("2d") : null; this.dirty = true; }
  tile(spec) {
    let i = this.map.get(spec); if (i !== undefined) return i;
    i = this.n++; if (i >= ATLAS_TILES * ATLAS_TILES) i = 0;
    this.map.set(spec, i);
    if (this.cx) { const img = this.cx.createImageData(16, 16); paint(img.data, spec); this.cx.putImageData(img, (i % ATLAS_TILES) * 16, Math.floor(i / ATLAS_TILES) * 16); this.dirty = true; }
    return i;
  }
  tileFromImage(key, img) { // a texture from a pack, scaled to 16x16
    let i = this.map.get(key); if (i !== undefined) return i;
    i = this.n++; this.map.set(key, i);
    if (this.cx) { this.cx.imageSmoothingEnabled = false; this.cx.clearRect((i % ATLAS_TILES) * 16, Math.floor(i / ATLAS_TILES) * 16, 16, 16); this.cx.drawImage(img, 0, 0, img.width, Math.min(img.height, img.width), (i % ATLAS_TILES) * 16, Math.floor(i / ATLAS_TILES) * 16, 16, 16); this.dirty = true; }
    return i;
  }
}
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
export function paint(d, spec) {
  const [pat, c1s, c2s, c3s] = spec.split("|");
  const r = rng(hash(spec)), c1 = parseColor(c1s), c2 = parseColor(c2s || shade(c1s, -0.3)), amt = parseFloat(c3s) || 0.12;
  const set = (x, y, c, k = 0, a) => { const o = (y * 16 + x) * 4; d[o] = Math.max(0, Math.min(255, c[0] * (1 + k))); d[o + 1] = Math.max(0, Math.min(255, c[1] * (1 + k))); d[o + 2] = Math.max(0, Math.min(255, c[2] * (1 + k))); d[o + 3] = a === undefined ? c[3] : a; };
  const fillNoise = (c, a = amt) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c, (r() - 0.5) * a * 2); };
  const clear = () => d.fill(0);
  switch (pat) {
    case "noise": fillNoise(c1); if (c2s && c2s !== "") for (let k = 0; k < 10; k++) set(Math.floor(r() * 16), Math.floor(r() * 16), c2, 0); break;
    case "smooth": fillNoise(c1, 0.03); for (let i = 0; i < 16; i++) { set(i, 0, c1, -0.08); set(i, 15, c1, -0.12); set(0, i, c1, -0.08); set(15, i, c1, -0.12); } break;
    case "wool": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c1, ((x + y * 2) % 4 === 0 ? -0.08 : 0) + (r() - 0.5) * 0.14); break;
    case "ore": { fillNoise(c1, 0.14); const n = 4 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const x = 1 + Math.floor(r() * 13), y = 1 + Math.floor(r() * 13); set(x, y, c2, 0.15); set(x + 1, y, c2, -0.1); set(x, y + 1, c2, -0.2); if (r() < 0.6) set(x + 1, y + 1, c2, 0); } break; }
    case "cobble": { const pts = []; for (let k = 0; k < 9; k++) pts.push([r() * 16, r() * 16, (r() - 0.5) * 0.3]);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { let b1 = 1e9, b2 = 1e9, bi = 0; for (let k = 0; k < pts.length; k++) for (const [ox, oy] of [[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16]]) { const dx = x - pts[k][0] - ox, dy = y - pts[k][1] - oy, dd = dx * dx + dy * dy; if (dd < b1) { b2 = b1; b1 = dd; bi = k; } else if (dd < b2) b2 = dd; }
        const edge = Math.sqrt(b2) - Math.sqrt(b1) < 1.1; set(x, y, c1, edge ? -0.35 : pts[bi][2] + (r() - 0.5) * 0.12); } break; }
    case "bricks": case "bricks8": { const bh = pat === "bricks" ? 4 : 8, bw = 8;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0; const mort = y % bh === bh - 1 || (x + off) % bw === bw - 1; set(x, y, mort ? c2 : c1, mort ? (r() - 0.5) * 0.1 : (r() - 0.5) * 0.16 + (row % 3 === 1 ? 0.05 : 0)); } break; }
    case "tiles": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const mort = x % 8 === 7 || y % 8 === 7, hi = x % 8 === 0 || y % 8 === 0; set(x, y, mort ? c2 : c1, mort ? 0 : (hi ? 0.1 : 0) + (r() - 0.5) * 0.1); } break;
    case "planks": { const seams = [Math.floor(r() * 16), Math.floor(r() * 16), Math.floor(r() * 16), Math.floor(r() * 16)];
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const b = Math.floor(y / 4), line = y % 4 === 3 || x === seams[b]; set(x, y, c1, line ? -0.3 : (Math.sin(x * 0.9 + b * 3) * 0.05 + (r() - 0.5) * 0.08 + (b % 2 ? 0.04 : 0))); } break; }
    case "bark": { const cols = []; for (let x = 0; x < 16; x++) cols.push((r() - 0.5) * 0.3);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c1, cols[x] + (r() - 0.5) * 0.1 + (x % 4 === 0 && r() < 0.7 ? -0.25 : 0)); break; }
    case "birch": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c1, (r() - 0.5) * 0.08); for (let k = 0; k < 7; k++) { const x = Math.floor(r() * 13), y = Math.floor(r() * 16); for (let i = 0; i < 2 + r() * 3; i++) set(Math.min(15, x + i), y, [40, 40, 40, 255]); } break;
    case "rings": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (ring > 6.6) set(x, y, c1, (r() - 0.5) * 0.2); else set(x, y, c2, (Math.floor(ring) % 2 ? -0.12 : 0.04) + (r() - 0.5) * 0.06); } break;
    case "bands": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c1, (y % 5 === 0 ? -0.1 : y % 5 === 1 ? 0.06 : 0) + (r() - 0.5) * 0.08); break;
    case "rows": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c1, (y % 4 < 1 ? -0.25 : 0) + (r() - 0.5) * 0.15); break;
    case "box": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const edge = x === 0 || y === 0 || x === 15 || y === 15 || ((x === 1 || x === 14) && (y > 1 && y < 14)) && false; const inner = x > 4 && x < 11 && y > 4 && y < 11; set(x, y, edge ? c2 : inner ? c2 : c1, inner ? 0.1 : (r() - 0.5) * 0.1); } break;
    case "books": { const cols = ["#8a2020", "#2a5a8a", "#3a7a2a", "#8a6a20", "#5a2a7a", "#2a7a7a"];
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const shelf = y < 1 || y === 7 || y === 8 || y > 14; if (shelf) set(x, y, c1, -0.1); else { const bc = parseColor(cols[(x + (y > 8 ? 3 : 0)) % 6]); set(x, y, bc, x % 2 ? -0.15 : 0); } } break; }
    case "tnt": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const band = y > 5 && y < 11; set(x, y, band ? [235, 235, 235, 255] : c1, band ? ((x % 4 === 1 && y > 6 && y < 10) ? -0.8 : 0) : (x % 4 === 0 ? -0.2 : 0)); } break;
    case "ridges": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c1, (x % 4 === 0 ? -0.2 : 0) + (r() - 0.5) * 0.08); break;
    case "glazed": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = ((x + y) % 8 < 2) || ((x - y + 16) % 8 < 2); set(x, y, v ? c2 : c1, (r() - 0.5) * 0.06); } break;
    case "glow": fillNoise(c1, 0.15); for (let k = 0; k < 14; k++) set(Math.floor(r() * 16), Math.floor(r() * 16), c2, 0); break;
    case "grassside": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c2, (r() - 0.5) * 0.4); { const tops = []; for (let x = 0; x < 16; x++) tops.push(2 + Math.floor(r() * 3)); for (let x = 0; x < 16; x++) for (let y = 0; y < tops[x]; y++) set(x, y, c1, (r() - 0.5) * 0.2); } break;
    case "leaves": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (r() < 0.16) set(x, y, c1, 0, 0); else set(x, y, c1, (r() - 0.5) * 0.5); } break;
    case "glass": clear(); for (let i = 0; i < 16; i++) { set(i, 0, c1, 0, 200); set(i, 15, c1, -0.1, 200); set(0, i, c1, 0, 200); set(15, i, c1, -0.1, 200); } for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) set(x, y, c1, 0, c1s === "#d8f0ff" ? 0 : 110); for (const [x, y] of [[3, 3], [4, 4], [5, 5], [4, 3], [10, 10], [11, 11]]) set(x, y, [255, 255, 255, 255], 0, 210); break;
    case "bars": clear(); for (let y = 0; y < 16; y++) for (const x of [1, 6, 9, 14]) set(x, y, c1, (r() - 0.5) * 0.2); break;
    case "web": clear(); for (let i = 0; i < 16; i++) { set(i, i, c1, 0, 220); set(15 - i, i, c1, 0, 220); set(i, 8, c1, 0, 180); set(8, i, c1, 0, 180); } break;
    case "water": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(x, y, c1, Math.sin((x + y * 0.5) * 0.8) * 0.06 + (r() - 0.5) * 0.08, 170); break;
    case "lava": for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = Math.sin(x * 0.7 + Math.sin(y * 0.5) * 2); set(x, y, v > 0.6 ? [250, 200, 60, 255] : c1, (r() - 0.5) * 0.2); } break;
    case "plantgrass": clear(); for (let k = 0; k < 9; k++) { const x = 1 + Math.floor(r() * 14), h = 6 + Math.floor(r() * 9); for (let y = 15; y > 15 - h; y--) set(x + ((15 - y) > h * 0.6 && r() < 0.4 ? (r() < 0.5 ? -1 : 1) : 0), y, c1, (r() - 0.5) * 0.3 - (y > 12 ? 0.15 : 0)); } break;
    case "flower": { clear(); const g = parseColor("#3f7f2a"); for (let y = 7; y < 16; y++) set(7, y, g, (r() - 0.5) * 0.2); set(6, 12, g); set(8, 11, g); set(5, 11, g);
      for (let y = 3; y < 8; y++) for (let x = 5; x < 10; x++) if ((x - 7) ** 2 + (y - 5) ** 2 < 6) set(x, y, c1, (r() - 0.5) * 0.2); set(7, 5, [250, 220, 80, 255]); break; }
    case "crop": clear(); for (const x of [2, 5, 9, 12]) for (let y = 15; y > 4; y--) set(x, y, y < 8 ? c1 : [70, 140, 40, 255], (r() - 0.5) * 0.2); break;
    case "ladder": clear(); for (let y = 0; y < 16; y++) { set(2, y, c1); set(13, y, c1); } for (const y of [2, 6, 10, 14]) for (let x = 2; x < 14; x++) set(x, y, c1, -0.1); break;
    case "rail": clear(); for (const y of [1, 4, 7, 10, 13]) for (let x = 2; x < 14; x++) set(x, y, c1, -0.2); for (let y = 0; y < 16; y++) { set(3, y, [170, 170, 170, 255]); set(12, y, [170, 170, 170, 255]); } break;
    case "torch": clear(); for (let y = 6; y < 16; y++) { set(7, y, [110, 80, 40, 255]); set(8, y, [90, 64, 30, 255]); } for (let y = 3; y < 6; y++) { set(7, y, c1); set(8, y, c1); } break;
    default: fillNoise(c1);
  }
}
