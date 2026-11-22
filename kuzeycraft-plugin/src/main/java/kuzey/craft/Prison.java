package kuzey.craft;

import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.TextDisplay;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.PlayerInventory;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;

import java.util.*;

/**
 * Rock Bottom Prison for Java: 26 mines from A to Z. Mine, /sell for gold, grade up, buy tools and armour,
 * enchant them, fight in the PvP arena, then escape at grade Z!
 */
public class Prison {
    public static final int Y = 64, MINES = 26, SIZE = 9, DEPTH = 8;
    // the PvP arena (inside size)
    public static final int AX1 = -22, AX2 = 22, AZ1 = 24, AZ2 = 48;
    public final World world;
    private final Set<UUID> inside = new HashSet<>();
    private final int[] left = new int[MINES + 1];
    private final long[] filled = new long[MINES + 1];

    /** Every block you can mine, from cheapest to most valuable, with its price in gold. */
    public static final Object[][] BLOCKS = {
            {Material.OAK_LOG, 1}, {Material.BIRCH_LOG, 1}, {Material.SPRUCE_LOG, 2},
            {Material.STONE, 2}, {Material.COBBLESTONE, 2}, {Material.COAL_ORE, 4},
            {Material.COPPER_ORE, 5}, {Material.IRON_ORE, 7}, {Material.LAPIS_ORE, 10},
            {Material.NETHER_QUARTZ_ORE, 14}, {Material.GOLD_ORE, 18}, {Material.REDSTONE_ORE, 24},
            {Material.EMERALD_ORE, 32}, {Material.DIAMOND_ORE, 45}, {Material.AMETHYST_BLOCK, 60},
            {Material.OBSIDIAN, 80}, {Material.DEEPSLATE_DIAMOND_ORE, 110}, {Material.GOLD_BLOCK, 150},
            {Material.DIAMOND_BLOCK, 210}, {Material.EMERALD_BLOCK, 290}, {Material.ANCIENT_DEBRIS, 400},
            {Material.NETHERITE_BLOCK, 560},
    };
    public static final Map<Material, Integer> PRICE = new HashMap<>();
    static { for (Object[] o : BLOCKS) PRICE.put((Material) o[0], (Integer) o[1]); }
    private static final Object[][] PVP_TABLE = {{Material.GOLD_ORE, 30}, {Material.EMERALD_ORE, 25}, {Material.DIAMOND_ORE, 20}, {Material.GOLD_BLOCK, 15}, {Material.DIAMOND_BLOCK, 10}};

    /** What mine number g is made of: {block, weight}. Mine A is the wood mine, B has stone, coal and iron. */
    public static Object[][] table(int g) {
        if (g == 0) return new Object[][]{{BLOCKS[0][0], 55}, {BLOCKS[1][0], 35}, {BLOCKS[2][0], 10}};
        if (g == 1) return new Object[][]{{Material.STONE, 40}, {Material.COBBLESTONE, 25}, {Material.COAL_ORE, 20}, {Material.IRON_ORE, 15}};
        int lo = Math.min(BLOCKS.length - 5, 3 + (int) Math.floor((g - 2) * 0.62));
        int[] w = {42, 28, 16, 9, 5};
        Object[][] t = new Object[5][];
        for (int i = 0; i < 5; i++) t[i] = new Object[]{BLOCKS[lo + i][0], w[i]};
        return t;
    }

    public Prison(World w) { world = w; }

    public int count() { return inside.size(); }
    public boolean in(Player p) { return inside.contains(p.getUniqueId()); }

    /** Where mine i starts (its corner). 7 mines in each row. */
    public static int mx(int i) { return -48 + (i % 7) * 14; }
    public static int mz(int i) { return -50 + (i / 7) * 14; }

    public int cost(Data.P d) { return (int) Math.round(60 * Math.pow(1.5, d.grade) * (1 + d.escapes * 0.5)); }

    public Location spawn() { return new Location(world, 0.5, Y + 1, 12.5, 180, 0); }
    public Location mineSpot(int i) { return new Location(world, mx(i) + SIZE / 2.0, Y + 1, mz(i) - 2.5, 0, 30); }
    public Location arenaGate() { return new Location(world, 0.5, Y + 1, AZ1 - 3.5, 0, 0); }

    public static boolean inArena(Location l) {
        return l.getX() >= AX1 && l.getX() < AX2 + 1 && l.getZ() >= AZ1 && l.getZ() < AZ2 + 1 && l.getY() >= Y - DEPTH - 2;
    }

    // ----- building -----
    public void build(Runnable done) {
        for (Entity e : world.getEntities()) if (e instanceof TextDisplay) e.remove();
        int X1 = -56, X2 = 56, Z1 = -58, Z2 = 54;
        Build b = new Build(world).clear(X1 - 2, Y - DEPTH - 2, Z1 - 2, X2 + 2, Y + 10, Z2 + 2);
        b.box(X1, Y, Z1, X2, Y, Z2, Material.POLISHED_ANDESITE).box(X1, Y - 1, Z1, X2, Y - 1, Z2, Material.STONE);
        for (int x = X1; x <= X2; x++) for (int z : new int[]{Z1, Z2}) { b.box(x, Y + 1, z, x, Y + 5, z, Material.STONE_BRICKS); b.set(x, Y + 6, z, Material.IRON_BARS); }
        for (int z = Z1; z <= Z2; z++) for (int x : new int[]{X1, X2}) { b.box(x, Y + 1, z, x, Y + 5, z, Material.STONE_BRICKS); b.set(x, Y + 6, z, Material.IRON_BARS); }
        for (int x : new int[]{X1, X2}) for (int z : new int[]{Z1, Z2}) { b.box(x - 1, Y + 1, z - 1, x + 1, Y + 8, z + 1, Material.DEEPSLATE_BRICKS); b.set(x, Y + 9, z, Material.SEA_LANTERN); }
        for (int i = 0; i < MINES; i++) {
            int x = mx(i), z = mz(i);
            b.box(x - 1, Y - DEPTH - 1, z - 1, x + SIZE, Y, z + SIZE, Material.BEDROCK);
            b.box(x, Y, z, x + SIZE - 1, Y, z + SIZE - 1, Material.AIR);
            Material plank = i == 0 ? Material.OAK_PLANKS : i < 9 ? Material.SPRUCE_PLANKS : i < 18 ? Material.DARK_OAK_PLANKS : Material.CRIMSON_PLANKS;
            b.box(x - 1, Y, z - 2, x + SIZE, Y, z - 2, plank);
        }
        // spawn square
        b.box(-4, Y, 8, 4, Y, 16, Material.GOLD_BLOCK).box(-3, Y, 9, 3, Y, 15, Material.SMOOTH_QUARTZ);
        // the PvP arena: red floor, a fence round it, a gap to walk in, and its own little mine of good blocks
        b.box(AX1 - 1, Y, AZ1 - 1, AX2 + 1, Y, AZ2 + 1, Material.RED_NETHER_BRICKS);
        for (int x = AX1 - 1; x <= AX2 + 1; x++) { b.set(x, Y + 1, AZ1 - 1, Material.NETHER_BRICK_FENCE); b.set(x, Y + 1, AZ2 + 1, Material.NETHER_BRICK_FENCE); }
        for (int z = AZ1 - 1; z <= AZ2 + 1; z++) { b.set(AX1 - 1, Y + 1, z, Material.NETHER_BRICK_FENCE); b.set(AX2 + 1, Y + 1, z, Material.NETHER_BRICK_FENCE); }
        b.box(-1, Y + 1, AZ1 - 1, 1, Y + 1, AZ1 - 1, Material.AIR);
        b.box(-5, Y - DEPTH - 1, 31, 5, Y, 41, Material.BEDROCK).box(-4, Y, 32, 4, Y, 40, Material.AIR);
        b.run(() -> {
            for (int i = 0; i <= MINES; i++) refill(i);
            labels();
            if (done != null) done.run();
        });
    }

    private void labels() {
        for (int i = 0; i < MINES; i++) {
            Object[][] t = table(i);
            StringBuilder s = new StringBuilder("&e&lMINE " + U.grade(i) + (i == 0 ? " &7(wood)" : "") + "\n&7");
            for (int k = Math.max(0, t.length - 2); k < t.length; k++) s.append(pretty((Material) t[k][0])).append(" ").append(PRICE.get((Material) t[k][0])).append("g  ");
            U.label(new Location(world, mx(i) + SIZE / 2.0, Y + 2.5, mz(i) - 2.5), s.toString().trim());
        }
        U.label(new Location(world, 0.5, Y + 4, 12.5), "&6&lROCK BOTTOM PRISON\n&fMine, type &e/sell&f, then &e/gradeup\n&7Reach grade Z and escape!\n&7The &bnether star &7opens the prison menu");
        U.label(new Location(world, 0.5, Y + 3, AZ1 - 2.5), "&c&lPVP ARENA\n&7Gold, emeralds and diamonds!\n&cOthers can fight you here and take your blocks");
    }

    public static String pretty(Material m) { String n = m.name().toLowerCase().replace('_', ' '); return Character.toUpperCase(n.charAt(0)) + n.substring(1); }

    /** Fill mine i again (i == MINES is the PvP arena mine). */
    private void refill(int i) {
        boolean pvp = i == MINES;
        int x = pvp ? -4 : mx(i), z = pvp ? 32 : mz(i), w = pvp ? 9 : SIZE;
        Location out = pvp ? new Location(world, 0.5, Y + 1, 28.5) : mineSpot(i);
        for (Player p : online()) {
            Location l = p.getLocation();
            if (l.getX() >= x && l.getX() < x + w && l.getZ() >= z && l.getZ() < z + w && l.getY() < Y + 2) { p.teleport(out); U.msg(p, "&eThe mine was refilled!"); }
        }
        KuzeyCraft.get().bots.mineRefilled(x, z, w, out);
        Object[][] t = pvp ? PVP_TABLE : table(i);
        int sum = 0;
        for (Object[] o : t) sum += (Integer) o[1];
        for (int dx = 0; dx < w; dx++) for (int dz = 0; dz < w; dz++) for (int dy = 1; dy <= DEPTH; dy++) {
            int r = U.RND.nextInt(sum);
            Material m = (Material) t[t.length - 1][0];
            for (Object[] o : t) { r -= (Integer) o[1]; if (r < 0) { m = (Material) o[0]; break; } }
            world.getBlockAt(x + dx, Y - dy, z + dz).setType(m, false);
        }
        left[i] = w * w * DEPTH;
        filled[i] = System.currentTimeMillis();
    }

    /** Which mine (0..25, or 26 for the PvP mine) this block is in, or -1. */
    public int mineAt(int bx, int by, int bz) {
        if (by > Y - 1 || by < Y - DEPTH) return -1;
        for (int i = 0; i < MINES; i++) if (bx >= mx(i) && bx < mx(i) + SIZE && bz >= mz(i) && bz < mz(i) + SIZE) return i;
        if (bx >= -4 && bx <= 4 && bz >= 32 && bz <= 40) return MINES;
        return -1;
    }

    // ----- joining -----
    public void join(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Game g = kc.gameOf(p);
        if (g != null) g.leave(p, false);
        kc.parkour.leave(p, false);
        if (in(p)) { p.teleport(spawn()); return; }
        U.reset(p, GameMode.SURVIVAL);
        inside.add(p.getUniqueId());
        Data.P d = kc.data.of(p);
        if (d.prisonInv != null) {
            ItemStack[] c = new ItemStack[p.getInventory().getSize()];
            for (int i = 0; i < Math.min(c.length, d.prisonInv.size()); i++) c[i] = d.prisonInv.get(i);
            p.getInventory().setContents(c);
        } else p.getInventory().addItem(U.item(Material.WOODEN_PICKAXE, "&7Starter Pickaxe"), U.item(Material.WOODEN_AXE, "&7Starter Axe"));
        p.getInventory().setItem(8, menuItem());
        p.teleport(spawn());
        U.title(p, "&6&lROCK BOTTOM PRISON", "&7You are grade &e" + U.grade(d.grade) + "&7. Escape at grade Z!");
    }

    private ItemStack menuItem() { return U.item(Material.NETHER_STAR, "&b&lPrison Menu &7(right-click)"); }

    /** Leave the prison: your things are kept for next time. */
    public void leave(Player p) {
        if (!inside.remove(p.getUniqueId())) return;
        Data.P d = KuzeyCraft.get().data.of(p);
        d.prisonInv = new ArrayList<>(Arrays.asList(p.getInventory().getContents()));
        for (int i = 0; i < d.prisonInv.size(); i++) { ItemStack it = d.prisonInv.get(i); if (it != null && it.getType() == Material.NETHER_STAR) d.prisonInv.set(i, null); }
    }

    // ----- mining -----
    /** A player breaks a block. Returns true if it was a mine block (we put it in their inventory). */
    public boolean mine(Player p, Block b) {
        int i = mineAt(b.getX(), b.getY(), b.getZ());
        if (i < 0) return false;
        Data.P d = KuzeyCraft.get().data.of(p);
        if (i < MINES && i > d.grade) { U.bar(p, "&cYou need grade " + U.grade(i) + " to mine here. Use /gradeup!"); return false; }
        Material m = b.getType();
        if (!PRICE.containsKey(m)) return false;
        int n = 1;
        int fortune = p.getInventory().getItemInMainHand().getEnchantmentLevel(Enchantment.FORTUNE);
        if (fortune > 0 && U.RND.nextDouble() < 0.33 * fortune) n += 1 + U.RND.nextInt(fortune);
        Map<Integer, ItemStack> extra = p.getInventory().addItem(new ItemStack(m, n));
        if (!extra.isEmpty() && extra.values().iterator().next().getAmount() == n) { U.bar(p, "&cYour inventory is full! Type &e/sell"); return false; }
        b.setType(Material.AIR, false);
        left[i]--;
        return true;
    }

    /** A bot mined a block. */
    public void botMined(Block b) {
        int i = mineAt(b.getX(), b.getY(), b.getZ());
        if (i >= 0 && PRICE.containsKey(b.getType())) { b.setType(Material.AIR, false); left[i]--; }
    }

    /** How much the blocks in someone's inventory are worth. */
    public int sellables(Player p, boolean remove) {
        int total = 0;
        ItemStack[] c = p.getInventory().getContents();
        for (int i = 0; i < c.length; i++) {
            ItemStack it = c[i];
            if (it == null || !PRICE.containsKey(it.getType())) continue;
            if (it.hasItemMeta() && it.getItemMeta().hasDisplayName()) continue;
            total += PRICE.get(it.getType()) * it.getAmount();
            if (remove) p.getInventory().setItem(i, null);
        }
        return total;
    }

    public void sell(Player p) {
        if (!in(p)) { U.msg(p, "&cYou can only sell in the prison."); return; }
        int total = sellables(p, true);
        if (total == 0) { U.msg(p, "&7You have nothing to sell. Go mining!"); return; }
        Data.P d = KuzeyCraft.get().data.of(p);
        total = (int) Math.round(total * (1 + d.escapes * 0.5));
        d.gold += total;
        U.msg(p, "&aSold your blocks for &6" + total + " gold&a!");
        U.sound(p, Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1f);
    }

    public void gradeUp(Player p) {
        if (!in(p)) { U.msg(p, "&cGo to the prison first."); return; }
        Data.P d = KuzeyCraft.get().data.of(p);
        if (d.grade >= MINES - 1) { escape(p); return; }
        int c = cost(d);
        if (d.gold < c) { U.msg(p, "&cYou need &6" + c + " gold&c. You have " + d.gold + "."); U.sound(p, Sound.ENTITY_VILLAGER_NO, 1f); return; }
        d.gold -= c;
        d.grade++;
        Bukkit.broadcastMessage(U.c("&6&lKC &8» &e" + p.getName() + " &7is now prison grade &e&l" + U.grade(d.grade) + "&7!"));
        U.title(p, "&6&lGRADE " + U.grade(d.grade), "&7Mine " + U.grade(d.grade) + " is open!");
        U.sound(p, Sound.ENTITY_PLAYER_LEVELUP, 1f);
        p.teleport(mineSpot(d.grade));
    }

    private void escape(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Data.P d = kc.data.of(p);
        d.escapes++;
        d.grade = 0;
        d.gold = 0;
        Bukkit.broadcastMessage(U.c("&6&lKC &8» &d" + p.getName() + " ESCAPED the prison! (" + d.escapes + "x)"));
        kc.data.addCoins(p, 1000, "you escaped!");
        U.title(p, "&d&lYOU ESCAPED!", "&7Everything sells for more now");
        U.firework(p.getLocation());
        p.teleport(spawn());
    }

    // ----- the PvP arena -----
    /** Someone was knocked out in the arena: they go back to the spawn and lose the blocks they were carrying. */
    public void arenaKnockout(Player victim, String killerName, Player killer) {
        int worth = sellables(victim, false);
        if (killer != null && in(killer)) {
            for (ItemStack it : victim.getInventory().getContents())
                if (it != null && PRICE.containsKey(it.getType()) && !(it.hasItemMeta() && it.getItemMeta().hasDisplayName())) killer.getInventory().addItem(it.clone());
            U.msg(killer, "&aYou beat " + victim.getName() + " and took their blocks!");
        }
        sellables(victim, true);
        victim.setHealth(20);
        victim.setFireTicks(0);
        victim.teleport(spawn());
        U.title(victim, "&c&lKNOCKED OUT", "&7by " + killerName + (worth > 0 ? " &7(you lost " + worth + "g of blocks)" : ""));
        for (Player p : online()) if (inArena(p.getLocation())) U.msg(p, "&c⚔ " + killerName + " &7beat &c" + victim.getName() + " &7in the PvP arena!");
    }

    // ----- menus -----
    public void menu(Player p) {
        Data.P d = KuzeyCraft.get().data.of(p);
        boolean last = d.grade >= MINES - 1;
        Gui g = new Gui(3, "&8Prison  &6" + d.gold + " gold  &7Grade " + U.grade(d.grade));
        g.set(10, U.item(Material.GOLD_INGOT, "&6&lSell", "&7Sell all your blocks for gold", "&7Your blocks are worth &6" + sellables(p, false) + "g"), pl -> { sell(pl); menu(pl); });
        g.set(11, U.item(Material.EXPERIENCE_BOTTLE, last ? "&d&lESCAPE!" : "&e&lGrade up to " + U.grade(d.grade + 1),
                last ? "&7Start again with 1000 coins and better prices" : "&7Costs &6" + cost(d) + " gold"), pl -> { pl.closeInventory(); gradeUp(pl); });
        g.set(12, U.item(Material.IRON_PICKAXE, "&b&lTool Shop", "&7Pickaxes, axes and Haste"), this::shop);
        g.set(13, U.item(Material.IRON_CHESTPLATE, "&f&lArmour & Swords", "&7For the PvP arena"), this::armourShop);
        g.set(14, U.item(Material.ENCHANTING_TABLE, "&d&lEnchanter", "&7Enchant the tools and armour", "&7in your inventory"), this::enchanter);
        g.set(15, U.item(Material.MINECART, "&a&lGo to my mine", "&7Mine " + U.grade(d.grade)), pl -> { pl.closeInventory(); pl.teleport(mineSpot(d.grade)); });
        g.set(16, U.item(Material.DIAMOND_SWORD, "&c&lPvP Arena", "&7Better blocks, but others can fight you!"), pl -> { pl.closeInventory(); pl.teleport(arenaGate()); });
        g.set(22, U.item(Material.RED_BED, "&c&lBack to the hub"), pl -> KuzeyCraft.get().hub.send(pl));
        g.open(p);
    }

    public void shop(Player p) {
        Data.P d = KuzeyCraft.get().data.of(p);
        Gui g = new Gui(3, "&8Tool Shop  &6" + d.gold + " gold");
        Object[][] tools = {{Material.STONE_PICKAXE, 40}, {Material.IRON_PICKAXE, 250}, {Material.DIAMOND_PICKAXE, 1200}, {Material.NETHERITE_PICKAXE, 6000},
                {Material.STONE_AXE, 30}, {Material.IRON_AXE, 150}, {Material.DIAMOND_AXE, 900}};
        int slot = 10;
        for (Object[] t : tools) {
            Material m = (Material) t[0];
            int price = (Integer) t[1];
            g.set(slot++, U.item(m, "&f" + pretty(m), "&6" + price + " gold"), pl -> { buy(pl, price, () -> pl.getInventory().addItem(new ItemStack(m))); shop(pl); });
        }
        g.set(17, U.item(Material.POTION, "&e&lHaste (3 minutes)", "&7Mine much faster", "&6300 gold"), pl -> buy(pl, 300, () -> pl.addPotionEffect(new PotionEffect(PotionEffectType.HASTE, 20 * 180, 1))));
        g.set(22, U.item(Material.ARROW, "&7Back"), this::menu);
        g.open(p);
    }

    private static final Object[][] ARMOUR = {
            {"Leather", 300, Material.LEATHER_HELMET, Material.LEATHER_CHESTPLATE, Material.LEATHER_LEGGINGS, Material.LEATHER_BOOTS},
            {"Chain", 1500, Material.CHAINMAIL_HELMET, Material.CHAINMAIL_CHESTPLATE, Material.CHAINMAIL_LEGGINGS, Material.CHAINMAIL_BOOTS},
            {"Iron", 5000, Material.IRON_HELMET, Material.IRON_CHESTPLATE, Material.IRON_LEGGINGS, Material.IRON_BOOTS},
            {"Diamond", 25000, Material.DIAMOND_HELMET, Material.DIAMOND_CHESTPLATE, Material.DIAMOND_LEGGINGS, Material.DIAMOND_BOOTS},
            {"Netherite", 150000, Material.NETHERITE_HELMET, Material.NETHERITE_CHESTPLATE, Material.NETHERITE_LEGGINGS, Material.NETHERITE_BOOTS},
    };

    public void armourShop(Player p) {
        Data.P d = KuzeyCraft.get().data.of(p);
        Gui g = new Gui(3, "&8Armour & Swords  &6" + d.gold + " gold");
        int slot = 10;
        for (Object[] a : ARMOUR) {
            int price = (Integer) a[1];
            g.set(slot++, U.item((Material) a[3], "&f" + a[0] + " armour &7(full set)", "&6" + price + " gold", "&7You put it on straight away"), pl -> {
                buy(pl, price, () -> {
                    PlayerInventory inv = pl.getInventory();
                    ItemStack[] old = inv.getArmorContents();
                    for (ItemStack o : old) if (o != null && o.getType() != Material.AIR) inv.addItem(o);
                    inv.setArmorContents(new ItemStack[]{new ItemStack((Material) a[5]), new ItemStack((Material) a[4]), new ItemStack((Material) a[3]), new ItemStack((Material) a[2])});
                });
                armourShop(pl);
            });
        }
        Object[][] swords = {{Material.STONE_SWORD, 100}, {Material.IRON_SWORD, 800}, {Material.DIAMOND_SWORD, 6000}, {Material.SHIELD, 500}};
        slot = 19;
        for (Object[] s : swords) {
            Material m = (Material) s[0];
            int price = (Integer) s[1];
            g.set(slot++, U.item(m, "&f" + pretty(m), "&6" + price + " gold"), pl -> { buy(pl, price, () -> pl.getInventory().addItem(new ItemStack(m))); armourShop(pl); });
        }
        g.set(23, U.item(Material.GOLDEN_APPLE, "&6Golden Apple", "&6400 gold"), pl -> { buy(pl, 400, () -> pl.getInventory().addItem(new ItemStack(Material.GOLDEN_APPLE))); armourShop(pl); });
        g.set(26, U.item(Material.ARROW, "&7Back"), this::menu);
        g.open(p);
    }

    // ----- enchanting: pick an item from your inventory, then the enchantment -----
    private static final Object[][] ENCH = {
            // enchantment, name, max level, base price, for: T = tools, S = swords, A = armour
            {Enchantment.EFFICIENCY, "Efficiency", 5, 100, "T"},
            {Enchantment.FORTUNE, "Fortune", 3, 400, "T"},
            {Enchantment.UNBREAKING, "Unbreaking", 3, 150, "TSA"},
            {Enchantment.SHARPNESS, "Sharpness", 5, 200, "S"},
            {Enchantment.KNOCKBACK, "Knockback", 2, 300, "S"},
            {Enchantment.PROTECTION, "Protection", 4, 200, "A"},
    };

    private static String kind(Material m) {
        String n = m.name();
        if (n.endsWith("_PICKAXE") || n.endsWith("_AXE") || n.endsWith("_SHOVEL")) return "T";
        if (n.endsWith("_SWORD")) return "S";
        if (n.endsWith("_HELMET") || n.endsWith("_CHESTPLATE") || n.endsWith("_LEGGINGS") || n.endsWith("_BOOTS")) return "A";
        return null;
    }

    public void enchanter(Player p) {
        Gui g = new Gui(4, "&8Enchanter: pick an item");
        PlayerInventory inv = p.getInventory();
        int slot = 10;
        // 0-35 is your inventory, 36-39 is the armour you are wearing
        for (int i = 0; i < 40 && slot < 35; i++) {
            ItemStack it = inv.getItem(i);
            if (it == null || kind(it.getType()) == null) continue;
            int invSlot = i;
            ItemStack show = it.clone();
            org.bukkit.inventory.meta.ItemMeta meta = show.getItemMeta();
            if (meta != null) { List<String> lore = meta.hasLore() ? new ArrayList<>(meta.getLore()) : new ArrayList<>(); lore.add(U.c(i >= 36 ? "&7(you are wearing this)" : "")); lore.add(U.c("&aClick to enchant it")); meta.setLore(lore); show.setItemMeta(meta); }
            g.set(slot, show, pl -> enchantItem(pl, invSlot));
            slot++;
            if (slot % 9 == 8) slot += 2;
        }
        if (slot == 10) g.set(13, U.item(Material.BOOK, "&7You have nothing to enchant", "&7Buy a pickaxe, sword or armour first!"), null);
        g.set(31, U.item(Material.ARROW, "&7Back"), this::menu);
        g.open(p);
    }

    private void enchantItem(Player p, int invSlot) {
        ItemStack it = p.getInventory().getItem(invSlot);
        if (it == null || kind(it.getType()) == null) { enchanter(p); return; }
        String k = kind(it.getType());
        Data.P d = KuzeyCraft.get().data.of(p);
        Gui g = new Gui(3, "&8Enchant " + pretty(it.getType()) + "  &6" + d.gold + "g");
        g.set(4, it.clone(), null);
        int slot = 10;
        for (Object[] e : ENCH) {
            if (!((String) e[4]).contains(k)) continue;
            Enchantment en = (Enchantment) e[0];
            int lvl = it.getEnchantmentLevel(en), max = (Integer) e[2], price = (int) ((Integer) e[3] * Math.pow(2, lvl));
            boolean full = lvl >= max;
            g.set(slot++, U.item(full ? Material.BOOK : Material.ENCHANTED_BOOK, full ? "&7" + e[1] + " (max)" : "&d" + e[1] + " " + (lvl + 1), full ? "&7This is as strong as it gets" : "&6" + price + " gold"), pl -> {
                if (full) return;
                ItemStack now = pl.getInventory().getItem(invSlot);
                if (now == null || now.getType() != it.getType()) { enchanter(pl); return; }
                buy(pl, price, () -> now.addUnsafeEnchantment(en, now.getEnchantmentLevel(en) + 1));
                enchantItem(pl, invSlot);
            });
        }
        g.set(22, U.item(Material.ARROW, "&7Back"), this::enchanter);
        g.open(p);
    }

    private void buy(Player p, int price, Runnable give) {
        Data.P d = KuzeyCraft.get().data.of(p);
        if (d.gold < price) { U.msg(p, "&cYou need &6" + price + " gold&c."); U.sound(p, Sound.ENTITY_VILLAGER_NO, 1f); return; }
        d.gold -= price;
        give.run();
        U.msg(p, "&aBought!");
        U.sound(p, Sound.ENTITY_PLAYER_LEVELUP, 1.6f);
    }

    /** Every second: refill mines that are mostly empty or old. */
    public void second() {
        for (int i = 0; i <= MINES; i++) {
            int full = (i == MINES ? 81 : SIZE * SIZE) * DEPTH;
            if (left[i] < full * 0.35 || (left[i] < full && System.currentTimeMillis() - filled[i] > 5 * 60 * 1000)) { refill(i); break; }
        }
        for (Player p : online()) if (p.getLocation().getY() < Y - DEPTH - 5) p.teleport(spawn());
    }

    public List<Player> online() {
        List<Player> l = new ArrayList<>();
        for (UUID id : new ArrayList<>(inside)) { Player p = Bukkit.getPlayer(id); if (p != null && p.getWorld().equals(world)) l.add(p); else if (p == null) inside.remove(id); }
        return l;
    }
}
