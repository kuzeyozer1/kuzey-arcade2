package kuzey.craft;

import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.TreeType;
import org.bukkit.WorldBorder;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** Survival Games: start around the middle, grab loot, and stay inside the border as it shrinks. */
public class SurvivalGames extends Game {
    private static final int Y = 64, R = 46;
    private final List<int[]> chests = new ArrayList<>();
    private final List<int[]> trees = new ArrayList<>();

    public SurvivalGames(org.bukkit.World w) { super("sg", "Survival Games", Material.IRON_SWORD, 12); world = w; }

    @Override public String help() { return "Grab loot, stay inside the border, survive!"; }
    @Override public boolean pvp() { return true; }
    @Override public boolean canBreak(Player p, Block b) { return b.getType().name().endsWith("LEAVES") || b.getType() == Material.COBWEB || b.getType().name().endsWith("_WOOL") || placedByPlayers(b); }
    @Override public boolean canPlace(Player p, Block b) { return true; }
    @Override protected int voidY() { return Y - 20; }
    @Override protected Location lobby() { return new Location(world, 0.5, Y + 31, 0.5); }
    @Override protected List<Location> spawns() { return ring(0, Y + 2, 0, 12, 12); }

    private boolean placedByPlayers(Block b) {
        Material m = b.getType();
        return m == Material.OAK_PLANKS || m == Material.COBBLESTONE || m == Material.BRICKS;
    }

    @Override protected void build(Runnable done) {
        WorldBorder wb = world.getWorldBorder();
        wb.setCenter(0, 0);
        wb.setSize(R * 2 + 10);
        Build b = new Build(world).clear(-R - 3, Y - 6, -R - 3, R + 3, Y + 34, R + 3);
        chests.clear();
        // waiting room
        b.box(-5, Y + 30, -5, 5, Y + 30, 5, Material.LIME_STAINED_GLASS);
        for (int i = -5; i <= 5; i++) {
            b.box(i, Y + 31, -6, i, Y + 33, -6, Material.GLASS).box(i, Y + 31, 6, i, Y + 33, 6, Material.GLASS);
            b.box(-6, Y + 31, i, -6, Y + 33, i, Material.GLASS).box(6, Y + 31, i, 6, Y + 33, i, Material.GLASS);
        }
        // the ground: a big round field, dirt underneath
        b.disc(0, Y - 3, 0, R - 2, Material.STONE).disc(0, Y - 2, 0, R - 1, Material.DIRT).disc(0, Y - 1, 0, R, Material.DIRT).disc(0, Y, 0, R, Material.GRASS_BLOCK);
        // a pond and some paths
        b.disc(22, Y, -18, 5, Material.WATER).disc(-25, Y, 20, 4, Material.WATER);
        for (int i = -R + 2; i <= R - 2; i++) { b.set(i, Y, 0, Material.DIRT_PATH); b.set(0, Y, i, Material.DIRT_PATH); }
        // the cornucopia in the middle
        b.disc(0, Y, 0, 6, Material.SMOOTH_STONE).disc(0, Y + 1, 0, 2, Material.GOLD_BLOCK);
        for (int i = 0; i < 8; i++) {
            double a = i * Math.PI / 4;
            int x = (int) Math.round(Math.cos(a) * 4), z = (int) Math.round(Math.sin(a) * 4);
            b.set(x, Y + 1, z, Material.CHEST); chests.add(new int[]{x, Y + 1, z, 2});
        }
        // pedestals where players start
        for (Location l : spawns()) b.set(l.getBlockX(), Y + 1, l.getBlockZ(), Material.POLISHED_ANDESITE);
        // chests hidden around the field
        for (int i = 0; i < 18; i++) {
            double a = U.RND.nextDouble() * Math.PI * 2, r = 16 + U.RND.nextDouble() * (R - 20);
            int x = (int) (Math.cos(a) * r), z = (int) (Math.sin(a) * r);
            b.set(x, Y + 1, z, Material.CHEST); chests.add(new int[]{x, Y + 1, z, 1});
        }
        // some cobwebs and hay
        for (int i = 0; i < 12; i++) { int x = U.RND.nextInt(R) - R / 2, z = U.RND.nextInt(R) - R / 2; if (Math.abs(x) > 8 || Math.abs(z) > 8) b.set(x, Y + 1, z, U.RND.nextBoolean() ? Material.COBWEB : Material.HAY_BLOCK); }
        trees.clear();
        for (int i = 0; i < 26; i++) {
            double a = U.RND.nextDouble() * Math.PI * 2, r = 15 + U.RND.nextDouble() * (R - 19);
            trees.add(new int[]{(int) (Math.cos(a) * r), (int) (Math.sin(a) * r)});
        }
        b.run(() -> {
            for (int[] t : trees) {
                Block g = world.getBlockAt(t[0], Y, t[1]);
                if (g.getType() == Material.GRASS_BLOCK) { try { world.generateTree(g.getLocation().add(0, 1, 0), U.pick(TreeType.TREE, TreeType.BIRCH, TreeType.TREE, TreeType.REDWOOD)); } catch (Throwable ignored) { } }
            }
            for (int[] c : chests) Loot.fill(world.getBlockAt(c[0], c[1], c[2]), c[3]);
            done.run();
        });
    }

    @Override protected void onStart(List<Player> ps) {
        for (Player p : ps) Loot.giveKit(p, KuzeyCraft.get().data.of(p).kit);
        world.getWorldBorder().setSize(R * 2 + 10);
        tell("&7The border starts shrinking in &e" + KuzeyCraft.get().getConfig().getInt("sg-border-wait", 60) + " seconds&7!");
    }

    @Override protected void everySecond() {
        int wait = KuzeyCraft.get().getConfig().getInt("sg-border-wait", 60), shrink = KuzeyCraft.get().getConfig().getInt("sg-border-shrink", 240);
        if (seconds == wait) {
            world.getWorldBorder().setSize(14, shrink);
            tell("&c&lThe border is shrinking! Go to the middle!");
        }
        if (seconds == wait + shrink) tell("&4&lDEATHMATCH! Last one standing wins!");
        if (seconds >= wait + shrink + 120) end(null);
    }
}
