package kuzey.craft;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** TNT Run: the floor disappears where you walk. Keep running! Last one up wins. */
public class TntRun extends Game {
    private static final int Y = 64, R = 16, LAYERS = 3, GAP = 8;

    public TntRun(org.bukkit.World w) { super("tntrun", "TNT Run", Material.TNT, 12); world = w; }

    @Override public String help() { return "The floor vanishes under you. Keep running!"; }
    @Override protected int voidY() { return Y - LAYERS * GAP - 4; }
    @Override protected Location lobby() { return new Location(world, 0.5, Y + 21, 0.5); }
    @Override protected List<Location> spawns() { return ring(0, Y + 2, 0, 10, 12); }

    @Override protected void build(Runnable done) {
        Build b = new Build(world).clear(-R - 2, Y - LAYERS * GAP - 2, -R - 2, R + 2, Y + 24, R + 2);
        b.disc(0, Y + 20, 0, 6, Material.ORANGE_STAINED_GLASS);
        Material[] tops = {Material.SAND, Material.RED_SAND, Material.GRAVEL};
        for (int i = 0; i < LAYERS; i++) {
            int y = Y - i * GAP;
            b.disc(0, y, 0, R, Material.TNT);
            b.disc(0, y + 1, 0, R, tops[i]);
        }
        b.run(done);
    }

    private final Map<UUID, Integer> jumps = new HashMap<>();

    @Override protected void onStart(List<Player> ps) {
        jumps.clear();
        for (Player p : ps) { p.getInventory().setItem(0, U.item(Material.FEATHER, 2, "&fDouble jump &7(right-click)")); jumps.put(p.getUniqueId(), 2); }
    }

    /** Right-click the feather to jump high (2 times per round). */
    public void doubleJump(Player p) {
        int n = jumps.getOrDefault(p.getUniqueId(), 0);
        if (n <= 0 || !isAlive(p)) return;
        jumps.put(p.getUniqueId(), n - 1);
        p.setVelocity(p.getLocation().getDirection().multiply(0.7).setY(0.95));
        p.getWorld().playSound(p.getLocation(), org.bukkit.Sound.ENTITY_BAT_TAKEOFF, 1f, 1.2f);
        org.bukkit.inventory.ItemStack f = p.getInventory().getItemInMainHand();
        if (f.getType() == Material.FEATHER) f.setAmount(f.getAmount() - 1);
    }

    @Override protected void everyTick() {
        if (protectedNow()) return;
        for (Player p : online(alive)) {
            Location l = p.getLocation();
            // the blocks under the player's feet (their feet are 0.6 wide)
            for (double dx : new double[]{-0.3, 0.3}) for (double dz : new double[]{-0.3, 0.3}) {
                Block top = world.getBlockAt((int) Math.floor(l.getX() + dx), (int) Math.floor(l.getY() - 0.1), (int) Math.floor(l.getZ() + dz));
                if (isFloor(top.getType())) vanish(top);
            }
        }
    }

    private boolean isFloor(Material m) { return m == Material.SAND || m == Material.RED_SAND || m == Material.GRAVEL; }

    private void vanish(Block top) {
        Bukkit.getScheduler().runTaskLater(KuzeyCraft.get(), () -> {
            if (!isFloor(top.getType())) return;
            top.setType(Material.AIR, false);
            Block under = top.getRelative(0, -1, 0);
            if (under.getType() == Material.TNT) under.setType(Material.AIR, false);
        }, 8L);
    }

    @Override protected void everySecond() { if (seconds >= 300) end(null); }
}
