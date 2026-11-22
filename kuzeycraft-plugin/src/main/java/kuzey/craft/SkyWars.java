package kuzey.craft;

import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** SkyWars: everyone starts on their own floating island. Loot the chests, bridge over and be the last one standing. */
public class SkyWars extends Game {
    private static final int Y = 64, ISLANDS = 8, R = 30;
    private final List<int[]> chests = new ArrayList<>();

    public SkyWars(org.bukkit.World w) { super("skywars", "SkyWars", Material.GRASS_BLOCK, 8); world = w; }

    @Override public String help() { return "Loot chests, bridge over, be the last one standing!"; }
    @Override public boolean pvp() { return true; }
    @Override public boolean canBreak(Player p, Block b) { return b.getType() != Material.BEDROCK; }
    @Override public boolean canPlace(Player p, Block b) { return b.getY() < Y + 40; }
    @Override protected int voidY() { return Y - 30; }
    @Override protected Location lobby() { return new Location(world, 0.5, Y + 31, 0.5); }

    @Override protected List<Location> spawns() { return ring(0, Y + 1, 0, R, ISLANDS); }

    @Override protected void build(Runnable done) {
        Build b = new Build(world).clear(-50, Y - 12, -50, 50, Y + 40, 50);
        chests.clear();
        // waiting room high in the sky
        b.box(-5, Y + 30, -5, 5, Y + 30, 5, Material.LIGHT_BLUE_STAINED_GLASS);
        for (int i = -5; i <= 5; i++) {
            b.box(i, Y + 31, -6, i, Y + 33, -6, Material.GLASS).box(i, Y + 31, 6, i, Y + 33, 6, Material.GLASS);
            b.box(-6, Y + 31, i, -6, Y + 33, i, Material.GLASS).box(6, Y + 31, i, 6, Y + 33, i, Material.GLASS);
        }
        // the islands around the middle
        Material[] tops = {Material.GRASS_BLOCK, Material.SAND, Material.SNOW_BLOCK, Material.GRASS_BLOCK, Material.PODZOL, Material.GRASS_BLOCK, Material.MYCELIUM, Material.GRASS_BLOCK};
        for (int i = 0; i < ISLANDS; i++) {
            double a = i * Math.PI * 2 / ISLANDS;
            int cx = (int) Math.round(Math.cos(a) * R), cz = (int) Math.round(Math.sin(a) * R);
            island(b, cx, cz, 4, tops[i]);
            int chx = cx + (int) Math.round(Math.cos(a) * 2), chz = cz + (int) Math.round(Math.sin(a) * 2);
            b.set(chx, Y + 1, chz, Material.CHEST);
            chests.add(new int[]{chx, Y + 1, chz, 1});
            // a small tree on each island
            int tx = cx - (int) Math.round(Math.sin(a) * 3), tz = cz + (int) Math.round(Math.cos(a) * 3);
            b.box(tx, Y + 1, tz, tx, Y + 3, tz, Material.OAK_LOG);
            b.box(tx - 1, Y + 4, tz - 1, tx + 1, Y + 5, tz + 1, Material.OAK_LEAVES);
        }
        // the middle island with better loot
        island(b, 0, 0, 7, Material.GRASS_BLOCK);
        b.box(-1, Y + 1, -1, 1, Y + 1, 1, Material.GOLD_BLOCK);
        int[][] mid = {{3, 0}, {-3, 0}, {0, 3}, {0, -3}};
        for (int[] m : mid) { b.set(m[0], Y + 1, m[1], Material.CHEST); chests.add(new int[]{m[0], Y + 1, m[1], 2}); }
        b.set(0, Y + 2, 0, Material.ENCHANTING_TABLE);
        b.run(() -> {
            for (int[] c : chests) Loot.fill(world.getBlockAt(c[0], c[1], c[2]), c[3]);
            done.run();
        });
    }

    private void island(Build b, int cx, int cz, int r, Material top) {
        for (int d = 0; d <= r; d++) {
            Material m = d == 0 ? top : d < 3 ? Material.DIRT : Material.STONE;
            b.disc(cx, Y - d, cz, r - d * 0.9 + 0.4, m);
        }
    }

    @Override protected void onStart(List<Player> ps) {
        for (Player p : ps) Loot.giveKit(p, KuzeyCraft.get().data.of(p).kit);
    }

    @Override protected void everySecond() {
        // after 5 minutes, refill the chests once
        if (seconds == 300) {
            for (int[] c : chests) Loot.fill(world.getBlockAt(c[0], c[1], c[2]), c[3]);
            tell("&e&lThe chests have been refilled!");
        }
        if (seconds == 600) tell("&c&lHurry up! The round ends in 1 minute.");
        if (seconds >= 660) end(null);
    }
}
