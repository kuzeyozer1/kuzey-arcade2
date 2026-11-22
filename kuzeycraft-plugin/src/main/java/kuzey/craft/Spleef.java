package kuzey.craft;

import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;

import java.util.List;

/** Spleef: dig the snow out from under the other players. Snowballs break snow too! */
public class Spleef extends Game {
    private static final int Y = 64, R = 18;

    public Spleef(org.bukkit.World w) { super("spleef", "Spleef", Material.DIAMOND_SHOVEL, 12); world = w; }

    @Override public String help() { return "Dig the snow under the others. Don't fall!"; }
    @Override public boolean canBreak(Player p, Block b) { return b.getType() == Material.SNOW_BLOCK && !protectedNow(); }
    @Override protected int voidY() { return Y - 16; }
    @Override protected Location lobby() { return new Location(world, 0.5, Y + 21, 0.5); }
    @Override protected List<Location> spawns() { return ring(0, Y + 1, 0, 12, 12); }

    @Override protected void build(Runnable done) {
        Build b = new Build(world).clear(-R - 4, Y - 14, -R - 4, R + 4, Y + 24, R + 4);
        b.disc(0, Y + 20, 0, 6, Material.LIGHT_BLUE_STAINED_GLASS);
        // two floors of snow with an ice rim
        b.disc(0, Y, 0, R, Material.SNOW_BLOCK).disc(0, Y - 8, 0, R - 3, Material.SNOW_BLOCK);
        for (int a = 0; a < 360; a += 2) {
            double rad = Math.toRadians(a);
            int x = (int) Math.round(Math.cos(rad) * (R + 1)), z = (int) Math.round(Math.sin(rad) * (R + 1));
            b.box(x, Y, z, x, Y + 2, z, Material.PACKED_ICE);
        }
        b.run(done);
    }

    @Override protected void onStart(List<Player> ps) {
        for (Player p : ps) {
            p.getInventory().addItem(U.ench(U.item(Material.DIAMOND_SHOVEL, "&bSnow Shovel"), Enchantment.EFFICIENCY, 5));
            p.getInventory().addItem(U.item(Material.SNOWBALL, 16, "&fSnowballs &7(they break snow!)"));
        }
    }

    @Override protected void everySecond() {
        if (seconds == 120) { tell("&c&lThe top floor is melting!"); meltTop(); }
        if (seconds >= 300) end((java.util.UUID) null);
    }

    private void meltTop() {
        Build b = new Build(world);
        for (int x = -R; x <= R; x++) for (int z = -R; z <= R; z++) if (U.RND.nextInt(3) == 0 && world.getBlockAt(x, Y, z).getType() == Material.SNOW_BLOCK) b.set(x, Y, z, Material.AIR);
        b.run(null);
    }
}
