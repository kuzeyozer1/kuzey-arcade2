package kuzey.craft;

import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.scheduler.BukkitRunnable;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Builds arenas a few thousand blocks at a time, so the server never freezes.
 * Usage: Build b = new Build(world); b.clear(...); b.set(...); b.run(() -> done());
 */
public class Build {
    private static final int PER_TICK = 20000;
    private static final Deque<Build> QUEUE = new ArrayDeque<>();
    private static boolean running = false;

    private final World w;
    private final List<int[]> clears = new ArrayList<>();
    private final List<int[]> pos = new ArrayList<>();
    private final List<Material> mats = new ArrayList<>();
    private Runnable done;
    // where the clearing has got to
    private int ci = 0, cx, cy, cz;
    private boolean clearStarted = false;
    private int si = 0;

    public Build(World w) { this.w = w; }

    /** Turn everything in this box into air (only the blocks that are not air already). */
    public Build clear(int x1, int y1, int z1, int x2, int y2, int z2) {
        clears.add(new int[]{Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2), Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2)});
        return this;
    }

    public Build set(int x, int y, int z, Material m) { pos.add(new int[]{x, y, z}); mats.add(m); return this; }

    public Build box(int x1, int y1, int z1, int x2, int y2, int z2, Material m) {
        for (int x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
            for (int y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
                for (int z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) set(x, y, z, m);
        return this;
    }

    /** A flat disc (circle) of blocks. */
    public Build disc(int cx, int y, int cz, double r, Material m) {
        int ri = (int) Math.ceil(r);
        for (int x = -ri; x <= ri; x++) for (int z = -ri; z <= ri; z++) if (x * x + z * z <= r * r) set(cx + x, y, cz + z, m);
        return this;
    }

    public void run(Runnable whenDone) {
        this.done = whenDone;
        QUEUE.add(this);
        if (!running) {
            running = true;
            new BukkitRunnable() {
                @Override public void run() {
                    int budget = PER_TICK;
                    while (budget > 0 && !QUEUE.isEmpty()) {
                        Build b = QUEUE.peek();
                        budget = b.step(budget);
                        if (b.finished()) {
                            QUEUE.poll();
                            if (b.done != null) {
                                try { b.done.run(); } catch (Exception e) { e.printStackTrace(); }
                            }
                        }
                    }
                    if (QUEUE.isEmpty()) { running = false; cancel(); }
                }
            }.runTaskTimer(KuzeyCraft.get(), 1L, 1L);
        }
    }

    private boolean finished() { return ci >= clears.size() && si >= pos.size(); }

    private int step(int budget) {
        // 1. clearing
        while (budget > 0 && ci < clears.size()) {
            int[] c = clears.get(ci);
            if (!clearStarted) { cx = c[0]; cy = c[1]; cz = c[2]; clearStarted = true; }
            Block b = w.getBlockAt(cx, cy, cz);
            if (!b.getType().isAir()) { b.setType(Material.AIR, false); budget -= 3; } else budget--;
            // move to the next block in the box
            if (++cz > c[5]) { cz = c[2]; if (++cy > c[4]) { cy = c[1]; if (++cx > c[3]) { ci++; clearStarted = false; } } }
        }
        // 2. placing
        while (budget > 0 && ci >= clears.size() && si < pos.size()) {
            int[] p = pos.get(si);
            Material m = mats.get(si);
            // falling blocks (sand, gravel) must not fall while we build
            w.getBlockAt(p[0], p[1], p[2]).setType(m, m == Material.WATER || m == Material.LAVA);
            si++;
            budget -= 3;
        }
        return budget;
    }
}
