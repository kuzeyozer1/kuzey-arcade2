package kuzey.craft;

import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;

import java.util.*;

/** A rainbow parkour course in the sky, with checkpoints and a timer. */
public class Parkour {
    private static final int Y = 70, JUMPS = 48, CHECK_EVERY = 8;
    public final World world;
    private final List<int[]> steps = new ArrayList<>();
    private final Map<UUID, Long> start = new HashMap<>();
    private final Map<UUID, Integer> checkpoint = new HashMap<>();
    private final Set<UUID> inside = new HashSet<>();
    private int[] finish;

    public Parkour(World w) { world = w; }

    public int count() { return inside.size(); }
    public boolean in(Player p) { return inside.contains(p.getUniqueId()); }

    /** The same course every time (fixed random seed), so best times are fair. */
    public void build(Runnable done) {
        Build b = new Build(world).clear(-10, Y - 6, -10, 160, Y + 40, 160);
        steps.clear();
        Random r = new Random(1234);
        Material[] rainbow = {Material.RED_CONCRETE, Material.ORANGE_CONCRETE, Material.YELLOW_CONCRETE, Material.LIME_CONCRETE, Material.LIGHT_BLUE_CONCRETE, Material.BLUE_CONCRETE, Material.PURPLE_CONCRETE, Material.MAGENTA_CONCRETE};
        // start platform
        b.box(-3, Y, -3, 3, Y, 3, Material.QUARTZ_BLOCK);
        b.set(0, Y + 1, 2, Material.LIGHT_WEIGHTED_PRESSURE_PLATE);
        int x = 0, y = Y, z = 4;
        for (int i = 1; i <= JUMPS; i++) {
            int dy = r.nextInt(10) < 4 ? 1 : (r.nextInt(10) < 2 && y > Y ? -1 : 0);
            int gap = dy == 1 ? 2 : 2 + r.nextInt(2); // easy jumps: 1 or 2 blocks of air
            int side = r.nextInt(3) - 1;
            if (r.nextBoolean()) { z += gap; x += side; } else { x += gap; z += side; }
            y += dy;
            boolean check = i % CHECK_EVERY == 0;
            if (check) {
                b.box(x - 1, y, z - 1, x + 1, y, z + 1, Material.EMERALD_BLOCK);
            } else b.set(x, y, z, rainbow[(i / 2) % rainbow.length]);
            steps.add(new int[]{x, y, z, check ? 1 : 0});
        }
        // finish
        x += 3;
        b.box(x - 2, y, z - 2, x + 2, y, z + 2, Material.GOLD_BLOCK);
        b.set(x, y + 1, z, Material.LIGHT_WEIGHTED_PRESSURE_PLATE);
        finish = new int[]{x, y + 1, z};
        steps.add(new int[]{x, y, z, 1});
        b.run(done);
    }

    public Location startLoc() { Location l = new Location(world, 0.5, Y + 1, -1.5); l.setYaw(0); return l; }

    public void join(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Game g = kc.gameOf(p);
        if (g != null) g.leave(p, false);
        kc.prison.leave(p);
        U.reset(p, GameMode.ADVENTURE);
        inside.add(p.getUniqueId());
        checkpoint.put(p.getUniqueId(), -1);
        start.remove(p.getUniqueId());
        p.teleport(startLoc());
        p.getInventory().setItem(0, U.item(Material.ENDER_EYE, "&aBack to checkpoint &7(right-click)"));
        p.getInventory().setItem(8, U.item(Material.RED_BED, "&cLeave &7(right-click)"));
        U.title(p, "&e&lPARKOUR", "&7Step on the gold plate to start the timer!");
    }

    public void leave(Player p, boolean toHub) {
        if (!inside.remove(p.getUniqueId())) return;
        start.remove(p.getUniqueId());
        checkpoint.remove(p.getUniqueId());
        if (toHub) KuzeyCraft.get().hub.send(p);
    }

    /** Someone stepped on a pressure plate in the parkour world. */
    public void plate(Player p, Block b) {
        if (!in(p)) return;
        if (b.getX() == 0 && b.getZ() == 2 && b.getY() == Y + 1) {
            start.put(p.getUniqueId(), System.currentTimeMillis());
            checkpoint.put(p.getUniqueId(), -1);
            U.sound(p, Sound.BLOCK_NOTE_BLOCK_PLING, 1.5f);
            U.bar(p, "&aGo go go!");
        } else if (finish != null && b.getX() == finish[0] && b.getY() == finish[1] && b.getZ() == finish[2]) finishRun(p);
    }

    private void finishRun(Player p) {
        Long s = start.remove(p.getUniqueId());
        if (s == null) return;
        long t = System.currentTimeMillis() - s;
        KuzeyCraft kc = KuzeyCraft.get();
        Data.P d = kc.data.of(p);
        boolean first = d.parkourBest == 0;
        boolean record = first || t < d.parkourBest;
        if (record) d.parkourBest = t;
        U.title(p, "&6&lFINISHED!", "&f" + U.time(t) + (record ? " &a(new best!)" : ""));
        Bukkit.broadcastMessage(U.c("&6&lKC &8» &e" + p.getName() + " &7finished the parkour in &f" + U.time(t) + (record ? " &a(personal best!)" : "")));
        kc.data.addCoins(p, first ? kc.getConfig().getInt("coins.parkour-first", 100) : kc.getConfig().getInt("coins.parkour-again", 20), "parkour");
        U.firework(p.getLocation().add(0, 1, 0));
        U.sound(p, Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f);
    }

    /** Every few ticks: save checkpoints, catch falling players, show the timer. */
    public void tick() {
        for (UUID id : new ArrayList<>(inside)) {
            Player p = Bukkit.getPlayer(id);
            if (p == null || !p.getWorld().equals(world)) { inside.remove(id); continue; }
            Location l = p.getLocation();
            Block under = l.clone().add(0, -0.2, 0).getBlock();
            if (under.getType() == Material.EMERALD_BLOCK) {
                for (int i = 0; i < steps.size(); i++) {
                    int[] s = steps.get(i);
                    if (s[3] == 1 && Math.abs(s[0] - under.getX()) <= 1 && Math.abs(s[2] - under.getZ()) <= 1 && s[1] == under.getY() && checkpoint.get(id) < i) {
                        checkpoint.put(id, i);
                        U.title(p, "", "&aCheckpoint " + (i / CHECK_EVERY + 1) + "!");
                        U.sound(p, Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1.5f);
                    }
                }
            }
            if (l.getY() < lowest(id) - 4) back(p);
            Long s = start.get(id);
            if (s != null) U.bar(p, "&e⏱ " + U.time(System.currentTimeMillis() - s));
        }
    }

    private int lowest(UUID id) {
        int c = checkpoint.getOrDefault(id, -1), low = c < 0 ? Y : steps.get(c)[1];
        // the lowest block before the next checkpoint
        for (int i = c + 1; i < steps.size(); i++) { low = Math.min(low, steps.get(i)[1]); if (steps.get(i)[3] == 1) break; }
        return low;
    }

    public void back(Player p) {
        int c = checkpoint.getOrDefault(p.getUniqueId(), -1);
        if (c < 0) { p.teleport(startLoc()); return; }
        int[] s = steps.get(c);
        Location l = new Location(world, s[0] + 0.5, s[1] + 1, s[2] + 0.5, p.getLocation().getYaw(), 0);
        p.teleport(l);
        p.setFallDistance(0);
    }
}
