package kuzey.craft;

import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.scheduler.BukkitRunnable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/** The daily prize wheel: one free spin every day. */
public class Wheel {
    /** A prize: what it looks like, how likely it is, and what you get. */
    private static class Prize {
        final Material icon; final String name; final int weight; final java.util.function.Consumer<Player> give;
        Prize(Material icon, String name, int weight, java.util.function.Consumer<Player> give) { this.icon = icon; this.name = name; this.weight = weight; this.give = give; }
    }

    private final List<Prize> prizes = new ArrayList<>();
    private final KuzeyCraft kc;

    public Wheel(KuzeyCraft kc) {
        this.kc = kc;
        prizes.add(new Prize(Material.GOLD_NUGGET, "&e25 coins", 12, p -> coins(p, 25)));
        prizes.add(new Prize(Material.GOLD_NUGGET, "&e50 coins", 26, p -> coins(p, 50)));
        prizes.add(new Prize(Material.GOLD_INGOT, "&e100 coins", 20, p -> coins(p, 100)));
        prizes.add(new Prize(Material.GOLD_INGOT, "&6250 coins", 9, p -> coins(p, 250)));
        prizes.add(new Prize(Material.GOLD_BLOCK, "&6&l500 coins", 4, p -> coins(p, 500)));
        prizes.add(new Prize(Material.DIAMOND_BLOCK, "&b&lJACKPOT! 1000 coins", 1, p -> coins(p, 1000)));
        prizes.add(new Prize(Material.IRON_PICKAXE, "&7500 prison gold", 14, p -> gold(p, 500)));
        prizes.add(new Prize(Material.DIAMOND_PICKAXE, "&b2500 prison gold", 6, p -> gold(p, 2500)));
        prizes.add(new Prize(Material.CHEST, "&dA free kit!", 5, this::freeKit));
        prizes.add(new Prize(Material.CLOCK, "&aSpin again!", 3, p -> { kc.data.of(p).lastSpin = ""; U.msg(p, "&aYou can spin again right now!"); }));
    }

    private void coins(Player p, int n) { kc.data.addCoins(p, n, "daily wheel"); }

    private void gold(Player p, int n) { kc.data.of(p).gold += n; U.msg(p, "&6+" + n + " prison gold &7(daily wheel)"); }

    private void freeKit(Player p) {
        Data.P d = kc.data.of(p);
        for (String[] k : Loot.KITS) if (!d.kits.contains(k[0])) { d.kits.add(k[0]); U.msg(p, "&dYou won the " + k[1] + " &dkit! Pick it in the Kits menu."); return; }
        coins(p, 300); // they already have every kit
    }

    public static String today() { return LocalDate.now().toString(); }

    public boolean ready(Player p) { return !today().equals(kc.data.of(p).lastSpin); }

    private Prize roll() {
        int sum = 0;
        for (Prize z : prizes) sum += z.weight;
        int r = U.RND.nextInt(sum);
        for (Prize z : prizes) { r -= z.weight; if (r < 0) return z; }
        return prizes.get(0);
    }

    private ItemStack icon(Prize z) { return U.item(z.icon, z.name); }

    public void open(Player p) {
        if (!ready(p)) {
            long mins = ChronoUnit.MINUTES.between(LocalTime.now(), LocalTime.MAX) + 1;
            Gui g = new Gui(3, "&8Daily Wheel");
            g.set(13, U.item(Material.CLOCK, "&7Come back tomorrow!", "&7Next spin in &e" + (mins / 60) + "h " + (mins % 60) + "m"), null);
            g.open(p);
            return;
        }
        spin(p);
    }

    /** The wheel spins along the middle row, slows down and stops on the prize under the arrows. */
    private void spin(Player p) {
        kc.data.of(p).lastSpin = today();
        Prize win = roll();
        Gui g = new Gui(3, "&8&lDaily Wheel");
        g.set(4, U.item(Material.HOPPER, "&e▼"), null);
        g.set(22, U.item(Material.LIGHTNING_ROD, "&e▲"), null);
        // a long strip of prizes; the winner lands in the middle slot (13) at the end
        int steps = 38 + U.RND.nextInt(6);
        List<Prize> strip = new ArrayList<>();
        for (int i = 0; i < steps + 9; i++) strip.add(prizes.get(U.RND.nextInt(prizes.size())));
        strip.set(steps + 4, win);
        g.open(p);
        new BukkitRunnable() {
            int step = 0, wait = 0;
            @Override public void run() {
                if (wait-- > 0) return;
                for (int s = 0; s < 9; s++) g.getInventory().setItem(9 + s, icon(strip.get(step + s)));
                if (p.isOnline()) p.playSound(p.getLocation(), Sound.BLOCK_NOTE_BLOCK_HAT, 1f, 1f + step / 60f);
                if (step >= steps) {
                    cancel();
                    if (!p.isOnline()) { win.give.accept(p); return; }
                    U.title(p, "&6&lYOU WON", U.c(win.name));
                    U.sound(p, Sound.ENTITY_PLAYER_LEVELUP, 1f);
                    win.give.accept(p);
                    Bukkit.getScheduler().runTaskLater(kc, () -> { if (p.getOpenInventory().getTopInventory().getHolder() == g) p.closeInventory(); }, 50L);
                    return;
                }
                step++;
                // slow down near the end
                wait = step < steps - 15 ? 0 : step < steps - 6 ? 1 : step < steps - 2 ? 3 : 6;
            }
        }.runTaskTimer(kc, 1L, 2L);
    }
}
