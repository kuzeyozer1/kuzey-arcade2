package kuzey.craft;

import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.TextDisplay;
import org.bukkit.inventory.ItemStack;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;

import java.util.*;

/** Rock Bottom Prison for Java: mine, /sell for gold, grade up from A to F, then escape! */
public class Prison {
    private static final int Y = 64, MINES = 6, SIZE = 9, DEPTH = 8;
    public final World world;
    private final Set<UUID> inside = new HashSet<>();
    private final int[] left = new int[MINES];
    private final long[] filled = new long[MINES];

    // what each mine is made of: block, how likely (weight)
    private static final Object[][][] TABLE = {
            {{Material.OAK_LOG, 50}, {Material.BIRCH_LOG, 35}, {Material.SPRUCE_LOG, 15}},
            {{Material.STONE, 40}, {Material.COBBLESTONE, 25}, {Material.COAL_ORE, 20}, {Material.IRON_ORE, 15}},
            {{Material.STONE, 25}, {Material.COPPER_ORE, 25}, {Material.IRON_ORE, 25}, {Material.LAPIS_ORE, 15}, {Material.GOLD_ORE, 10}},
            {{Material.DEEPSLATE, 25}, {Material.DEEPSLATE_GOLD_ORE, 25}, {Material.REDSTONE_ORE, 25}, {Material.DEEPSLATE_DIAMOND_ORE, 15}, {Material.EMERALD_ORE, 10}},
            {{Material.DIAMOND_ORE, 30}, {Material.EMERALD_ORE, 25}, {Material.GOLD_BLOCK, 25}, {Material.AMETHYST_BLOCK, 20}},
            {{Material.DIAMOND_BLOCK, 35}, {Material.EMERALD_BLOCK, 30}, {Material.ANCIENT_DEBRIS, 25}, {Material.NETHERITE_BLOCK, 10}},
    };
    public static final Map<Material, Integer> PRICE = new HashMap<>();
    static {
        Object[][] p = {{Material.OAK_LOG, 1}, {Material.BIRCH_LOG, 1}, {Material.SPRUCE_LOG, 2}, {Material.STONE, 2}, {Material.COBBLESTONE, 2}, {Material.COAL_ORE, 4},
                {Material.IRON_ORE, 7}, {Material.COPPER_ORE, 5}, {Material.LAPIS_ORE, 10}, {Material.GOLD_ORE, 18}, {Material.DEEPSLATE, 6}, {Material.DEEPSLATE_GOLD_ORE, 25},
                {Material.REDSTONE_ORE, 24}, {Material.DEEPSLATE_DIAMOND_ORE, 55}, {Material.EMERALD_ORE, 40}, {Material.DIAMOND_ORE, 50}, {Material.GOLD_BLOCK, 150},
                {Material.AMETHYST_BLOCK, 60}, {Material.DIAMOND_BLOCK, 210}, {Material.EMERALD_BLOCK, 290}, {Material.ANCIENT_DEBRIS, 400}, {Material.NETHERITE_BLOCK, 560}};
        for (Object[] o : p) PRICE.put((Material) o[0], (Integer) o[1]);
    }

    public Prison(World w) { world = w; }

    public int count() { return inside.size(); }
    public boolean in(Player p) { return inside.contains(p.getUniqueId()); }

    private int mx(int i) { return -27 + (i % 3) * 20; }
    private int mz(int i) { return -22 + (i / 3) * 24; }

    public int cost(Data.P d) { return (int) Math.round(60 * Math.pow(1.7, d.grade) * (1 + d.escapes * 0.5)); }

    public Location spawn() { return new Location(world, 0.5, Y + 1, 18.5, 180, 0); }

    // ----- building -----
    public void build(Runnable done) {
        for (Entity e : world.getEntities()) if (e instanceof TextDisplay) e.remove();
        Build b = new Build(world).clear(-40, Y - DEPTH - 2, -40, 40, Y + 10, 40);
        b.box(-38, Y, -38, 38, Y, 38, Material.POLISHED_ANDESITE);
        b.box(-38, Y - 1, -38, 38, Y - 1, 38, Material.STONE);
        for (int i = -38; i <= 38; i++) {
            b.box(i, Y + 1, -38, i, Y + 5, -38, Material.STONE_BRICKS).box(i, Y + 1, 38, i, Y + 5, 38, Material.STONE_BRICKS);
            b.box(-38, Y + 1, i, -38, Y + 5, i, Material.STONE_BRICKS).box(38, Y + 1, i, 38, Y + 5, i, Material.STONE_BRICKS);
            b.set(i, Y + 6, -38, Material.IRON_BARS).set(i, Y + 6, 38, Material.IRON_BARS).set(-38, Y + 6, i, Material.IRON_BARS).set(38, Y + 6, i, Material.IRON_BARS);
        }
        for (int i = 0; i < MINES; i++) {
            int x = mx(i), z = mz(i);
            b.box(x - 1, Y - DEPTH - 1, z - 1, x + SIZE, Y, z + SIZE, Material.BEDROCK);
            b.box(x, Y, z, x + SIZE - 1, Y, z + SIZE - 1, Material.AIR);
            b.box(x - 2, Y, z - 2, x + SIZE + 1, Y, z - 2, Material.OAK_PLANKS);
        }
        b.box(-3, Y, 15, 3, Y, 21, Material.GOLD_BLOCK);
        b.run(() -> {
            for (int i = 0; i < MINES; i++) refill(i);
            labels();
            if (done != null) done.run();
        });
    }

    private void labels() {
        for (int i = 0; i < MINES; i++) {
            int g = i;
            StringBuilder s = new StringBuilder("&e&lMINE " + U.grade(i) + "\n&7");
            for (Object[] o : TABLE[i]) s.append(PRICE.get((Material) o[0])).append("g ").append(pretty((Material) o[0])).append("  ");
            U.label(new Location(world, mx(g) + SIZE / 2.0, Y + 2.5, mz(g) - 2.5), s.toString().trim());
        }
        U.label(new Location(world, 0.5, Y + 4, 18.5), "&6&lROCK BOTTOM PRISON\n&fMine, type &e/sell&f, then &e/gradeup\n&7Reach grade F and escape!\n&7The &bnether star &7opens the prison menu");
    }

    private static String pretty(Material m) { String n = m.name().toLowerCase().replace('_', ' '); return Character.toUpperCase(n.charAt(0)) + n.substring(1); }

    private void refill(int i) {
        int x = mx(i), z = mz(i);
        for (Player p : online()) {
            Location l = p.getLocation();
            if (mineAt(l.getBlockX(), l.getBlockY() - 1, l.getBlockZ()) == i || (l.getY() < Y && mineAt(l.getBlockX(), Y - 1, l.getBlockZ()) == i)) {
                p.teleport(new Location(world, x + SIZE / 2.0, Y + 1, z - 3.5));
                U.msg(p, "&eMine " + U.grade(i) + " was refilled!");
            }
        }
        Object[][] t = TABLE[i];
        int sum = 0;
        for (Object[] o : t) sum += (Integer) o[1];
        for (int dx = 0; dx < SIZE; dx++) for (int dz = 0; dz < SIZE; dz++) for (int dy = 1; dy <= DEPTH; dy++) {
            int r = U.RND.nextInt(sum);
            Material m = (Material) t[t.length - 1][0];
            for (Object[] o : t) { r -= (Integer) o[1]; if (r < 0) { m = (Material) o[0]; break; } }
            world.getBlockAt(x + dx, Y - dy + 1 - 1, z + dz).setType(m, false);
        }
        left[i] = SIZE * SIZE * DEPTH;
        filled[i] = System.currentTimeMillis();
    }

    /** Which mine (0..5) this block is in, or -1. */
    public int mineAt(int bx, int by, int bz) {
        if (by > Y - 1 || by < Y - DEPTH) return -1;
        for (int i = 0; i < MINES; i++) if (bx >= mx(i) && bx < mx(i) + SIZE && bz >= mz(i) && bz < mz(i) + SIZE) return i;
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
        U.title(p, "&6&lROCK BOTTOM PRISON", "&7You are grade &e" + U.grade(d.grade) + "&7. Escape at grade F!");
    }

    private ItemStack menuItem() { return U.item(Material.NETHER_STAR, "&b&lPrison Menu &7(right-click)"); }

    /** Leave the prison: your things are kept for next time. */
    public void leave(Player p) {
        if (!inside.remove(p.getUniqueId())) return;
        Data.P d = KuzeyCraft.get().data.of(p);
        d.prisonInv = new ArrayList<>(Arrays.asList(p.getInventory().getContents()));
        // don't save the menu star
        for (int i = 0; i < d.prisonInv.size(); i++) { ItemStack it = d.prisonInv.get(i); if (it != null && it.getType() == Material.NETHER_STAR) d.prisonInv.set(i, null); }
    }

    // ----- mining -----
    /** returns true if the break is allowed (we handle the drops). */
    public boolean mine(Player p, Block b) {
        int i = mineAt(b.getX(), b.getY(), b.getZ());
        if (i < 0) return false;
        Data.P d = KuzeyCraft.get().data.of(p);
        if (i > d.grade) { U.bar(p, "&cYou need grade " + U.grade(i) + " to mine here. Use /gradeup!"); return false; }
        Material m = b.getType();
        if (!PRICE.containsKey(m)) return false;
        Map<Integer, ItemStack> extra = p.getInventory().addItem(new ItemStack(m));
        if (!extra.isEmpty()) { U.bar(p, "&cYour inventory is full! Type &e/sell"); return false; }
        b.setType(Material.AIR, false);
        left[i]--;
        return true;
    }

    public void sell(Player p) {
        if (!in(p)) { U.msg(p, "&cYou can only sell in the prison."); return; }
        int total = 0, n = 0;
        ItemStack[] c = p.getInventory().getContents();
        for (int i = 0; i < c.length; i++) {
            ItemStack it = c[i];
            if (it == null || !PRICE.containsKey(it.getType())) continue;
            if (it.hasItemMeta() && it.getItemMeta().hasDisplayName()) continue;
            total += PRICE.get(it.getType()) * it.getAmount();
            n += it.getAmount();
            p.getInventory().setItem(i, null);
        }
        if (n == 0) { U.msg(p, "&7You have nothing to sell. Go mining!"); return; }
        Data.P d = KuzeyCraft.get().data.of(p);
        total = (int) Math.round(total * (1 + d.escapes * 0.5));
        d.gold += total;
        U.msg(p, "&aSold " + n + " blocks for &6" + total + " gold&a!");
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
        p.teleport(new Location(world, mx(d.grade) + SIZE / 2.0, Y + 1, mz(d.grade) - 3.5));
    }

    private void escape(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Data.P d = kc.data.of(p);
        d.escapes++;
        d.grade = 0;
        d.gold = 0;
        Bukkit.broadcastMessage(U.c("&6&lKC &8» &d" + p.getName() + " ESCAPED the prison! (" + d.escapes + "x)"));
        kc.data.addCoins(p, 500, "you escaped!");
        U.title(p, "&d&lYOU ESCAPED!", "&7Everything sells for more now");
        U.firework(p.getLocation());
        p.teleport(spawn());
    }

    public void menu(Player p) {
        Data.P d = KuzeyCraft.get().data.of(p);
        Gui g = new Gui(3, "&8Prison  &6" + d.gold + " gold  &7Grade " + U.grade(d.grade));
        g.set(10, U.item(Material.GOLD_INGOT, "&6&lSell", "&7Sell all your blocks for gold"), pl -> { sell(pl); menu(pl); });
        g.set(11, U.item(Material.EXPERIENCE_BOTTLE, d.grade >= MINES - 1 ? "&d&lESCAPE!" : "&e&lGrade up to " + U.grade(d.grade + 1),
                d.grade >= MINES - 1 ? "&7Start again with 500 coins and better prices" : "&7Costs &6" + cost(d) + " gold"), pl -> { pl.closeInventory(); gradeUp(pl); });
        g.set(12, U.item(Material.IRON_PICKAXE, "&b&lTool Shop", "&7Better pickaxes and Efficiency"), this::shop);
        g.set(13, U.item(Material.MINECART, "&a&lGo to my mine", "&7Mine " + U.grade(d.grade)), pl -> { pl.closeInventory(); pl.teleport(new Location(world, mx(d.grade) + SIZE / 2.0, Y + 1, mz(d.grade) - 3.5)); });
        g.set(16, U.item(Material.RED_BED, "&c&lBack to the hub"), pl -> KuzeyCraft.get().hub.send(pl));
        g.open(p);
    }

    public void shop(Player p) {
        Data.P d = KuzeyCraft.get().data.of(p);
        Gui g = new Gui(3, "&8Tool Shop  &6" + d.gold + " gold");
        Object[][] tools = {{Material.STONE_PICKAXE, 40}, {Material.IRON_PICKAXE, 250}, {Material.DIAMOND_PICKAXE, 1200}, {Material.NETHERITE_PICKAXE, 6000}, {Material.IRON_AXE, 150}};
        int slot = 10;
        for (Object[] t : tools) {
            Material m = (Material) t[0];
            int price = (Integer) t[1];
            g.set(slot++, U.item(m, "&f" + pretty(m), "&6" + price + " gold"), pl -> buy(pl, price, () -> pl.getInventory().addItem(new ItemStack(m))));
        }
        g.set(15, U.item(Material.ENCHANTED_BOOK, "&d&lEfficiency +1", "&7Hold your pickaxe, then click.", "&6" + effCost(p) + " gold"), pl -> {
            ItemStack h = pl.getInventory().getItemInMainHand();
            if (!h.getType().name().endsWith("_PICKAXE") && !h.getType().name().endsWith("_AXE")) { U.msg(pl, "&cHold a pickaxe or axe in your hand first."); return; }
            int lvl = h.getEnchantmentLevel(Enchantment.EFFICIENCY);
            if (lvl >= 5) { U.msg(pl, "&7That tool is already at the top level."); return; }
            buy(pl, effCost(pl), () -> h.addUnsafeEnchantment(Enchantment.EFFICIENCY, lvl + 1));
            shop(pl);
        });
        g.set(16, U.item(Material.POTION, "&e&lHaste (3 minutes)", "&7Mine much faster", "&6300 gold"), pl -> buy(pl, 300, () -> pl.addPotionEffect(new PotionEffect(PotionEffectType.HASTE, 20 * 180, 1))));
        g.set(22, U.item(Material.ARROW, "&7Back"), this::menu);
        g.open(p);
    }

    private int effCost(Player p) {
        ItemStack h = p.getInventory().getItemInMainHand();
        return (int) (100 * Math.pow(2, h.getEnchantmentLevel(Enchantment.EFFICIENCY)));
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
        for (int i = 0; i < MINES; i++) {
            int full = SIZE * SIZE * DEPTH;
            if (left[i] < full * 0.35 || (left[i] < full && System.currentTimeMillis() - filled[i] > 5 * 60 * 1000)) { refill(i); break; }
        }
        for (Player p : online()) if (p.getLocation().getY() < Y - DEPTH - 5) p.teleport(spawn());
    }

    private List<Player> online() {
        List<Player> l = new ArrayList<>();
        for (UUID id : new ArrayList<>(inside)) { Player p = Bukkit.getPlayer(id); if (p != null && p.getWorld().equals(world)) l.add(p); else if (p == null) inside.remove(id); }
        return l;
    }
}
