package kuzey.craft;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;
import org.bukkit.*;
import org.bukkit.attribute.Attribute;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Firework;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.FireworkMeta;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.potion.PotionEffect;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

/** Small helpers used everywhere. */
public final class U {
    private U() {}
    public static final Random RND = new Random();

    /** Turns &a style colour codes into real colours. */
    public static String c(String s) { return ChatColor.translateAlternateColorCodes('&', s); }

    public static Component comp(String s) { return LegacyComponentSerializer.legacySection().deserialize(c(s)); }

    public static ItemStack item(Material m, String name, String... lore) { return item(m, 1, name, lore); }

    public static ItemStack item(Material m, int amount, String name, String... lore) {
        ItemStack it = new ItemStack(m, amount);
        ItemMeta meta = it.getItemMeta();
        if (meta != null) {
            if (name != null) meta.setDisplayName(c(name));
            if (lore.length > 0) {
                List<String> l = new ArrayList<>();
                for (String s : lore) l.add(c(s));
                meta.setLore(l);
            }
            meta.addItemFlags(org.bukkit.inventory.ItemFlag.HIDE_ATTRIBUTES);
            it.setItemMeta(meta);
        }
        return it;
    }

    public static ItemStack ench(ItemStack it, Enchantment e, int level) { it.addUnsafeEnchantment(e, level); return it; }

    public static void msg(Player p, String s) { p.sendMessage(c("&6&lKC &8» &r" + s)); }

    public static void title(Player p, String t, String sub) { p.sendTitle(c(t), c(sub), 5, 40, 10); }

    public static void bar(Player p, String s) { p.sendActionBar(comp(s)); }

    public static void sound(Player p, Sound s, float pitch) { p.playSound(p.getLocation(), s, 1f, pitch); }

    /** Heals a player and empties their inventory, ready for a game or the hub. */
    public static void reset(Player p, GameMode mode) {
        p.getInventory().clear();
        p.getInventory().setArmorContents(new ItemStack[4]);
        p.setItemOnCursor(new ItemStack(Material.AIR));
        for (PotionEffect e : p.getActivePotionEffects()) p.removePotionEffect(e.getType());
        p.setGameMode(mode);
        p.setHealth(p.getAttribute(Attribute.GENERIC_MAX_HEALTH) != null ? p.getAttribute(Attribute.GENERIC_MAX_HEALTH).getValue() : 20);
        p.setFoodLevel(20);
        p.setSaturation(10);
        p.setFireTicks(0);
        p.setFallDistance(0);
        p.setExp(0);
        p.setLevel(0);
        p.setAllowFlight(false);
        p.setFlying(false);
    }

    public static void firework(Location l) {
        World w = l.getWorld();
        if (w == null) return;
        w.spawn(l, Firework.class, fw -> {
            FireworkMeta m = fw.getFireworkMeta();
            Color[] cols = {Color.RED, Color.YELLOW, Color.AQUA, Color.LIME, Color.FUCHSIA, Color.ORANGE};
            m.addEffect(FireworkEffect.builder().with(FireworkEffect.Type.BALL_LARGE)
                    .withColor(cols[RND.nextInt(cols.length)], cols[RND.nextInt(cols.length)]).withFade(Color.WHITE).trail(true).flicker(true).build());
            m.setPower(1);
            fw.setFireworkMeta(m);
        });
    }

    /** A floating text sign. Returns null if this server can't make one (then the game still works). */
    public static org.bukkit.entity.TextDisplay label(Location l, String text) {
        try {
            return l.getWorld().spawn(l, org.bukkit.entity.TextDisplay.class, t -> {
                t.setBillboard(org.bukkit.entity.Display.Billboard.CENTER);
                t.setText(c(text));
                t.setPersistent(false);
                t.setShadowed(true);
            });
        } catch (Throwable e) { return null; }
    }

    public static <T> T pick(List<T> l) { return l.get(RND.nextInt(l.size())); }

    @SafeVarargs public static <T> T pick(T... a) { return a[RND.nextInt(a.length)]; }

    public static List<String> list(String... s) { return new ArrayList<>(Arrays.asList(s)); }

    /** 0 -> "A", 1 -> "B" ... */
    public static String grade(int g) { return String.valueOf((char) ('A' + g)); }

    public static String time(long ms) {
        long s = ms / 1000;
        return String.format("%d:%02d.%d", s / 60, s % 60, (ms % 1000) / 100);
    }
}
