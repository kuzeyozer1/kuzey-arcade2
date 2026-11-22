package kuzey.craft;

import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.block.Chest;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.PlayerInventory;

import java.util.ArrayList;
import java.util.List;

/** What is inside the chests, and the kits you can buy with coins. */
public final class Loot {
    private Loot() {}

    private static ItemStack i(Material m, int n) { return new ItemStack(m, n); }

    private static List<ItemStack> table(int tier) {
        List<ItemStack> l = new ArrayList<>();
        // blocks and food
        l.add(i(Material.OAK_PLANKS, 32)); l.add(i(Material.COBBLESTONE, 32)); l.add(i(Material.WHITE_WOOL, 24));
        l.add(i(Material.COOKED_BEEF, 6)); l.add(i(Material.BREAD, 8)); l.add(i(Material.APPLE, 6));
        l.add(i(Material.SNOWBALL, 16)); l.add(i(Material.EGG, 16)); l.add(i(Material.ARROW, 12));
        if (tier == 1) {
            l.add(i(Material.STONE_SWORD, 1)); l.add(i(Material.WOODEN_AXE, 1)); l.add(i(Material.STONE_PICKAXE, 1));
            l.add(i(Material.LEATHER_HELMET, 1)); l.add(i(Material.LEATHER_CHESTPLATE, 1)); l.add(i(Material.CHAINMAIL_LEGGINGS, 1));
            l.add(i(Material.CHAINMAIL_BOOTS, 1)); l.add(i(Material.IRON_HELMET, 1)); l.add(i(Material.BOW, 1));
            l.add(i(Material.IRON_BOOTS, 1)); l.add(i(Material.WATER_BUCKET, 1));
        } else {
            l.add(i(Material.IRON_SWORD, 1)); l.add(U.ench(i(Material.IRON_SWORD, 1), Enchantment.SHARPNESS, 1)); l.add(i(Material.DIAMOND_SWORD, 1));
            l.add(i(Material.IRON_CHESTPLATE, 1)); l.add(i(Material.IRON_LEGGINGS, 1)); l.add(i(Material.DIAMOND_HELMET, 1));
            l.add(i(Material.DIAMOND_BOOTS, 1)); l.add(U.ench(i(Material.BOW, 1), Enchantment.POWER, 2)); l.add(i(Material.GOLDEN_APPLE, 2));
            l.add(i(Material.ENDER_PEARL, 2)); l.add(i(Material.DIAMOND_PICKAXE, 1)); l.add(i(Material.LAVA_BUCKET, 1));
        }
        return l;
    }

    /** Fill a chest at this block with random loot. tier 1 = normal, tier 2 = the middle (better) */
    public static void fill(Block b, int tier) {
        if (!(b.getState() instanceof Chest)) return;
        Chest chest = (Chest) b.getState();
        fill(chest.getSnapshotInventory(), tier);
        chest.update(true, false);
    }

    public static void fill(Inventory inv, int tier) {
        inv.clear();
        List<ItemStack> t = table(tier);
        int n = 4 + U.RND.nextInt(3) + (tier == 2 ? 1 : 0);
        for (int k = 0; k < n; k++) inv.setItem(U.RND.nextInt(inv.getSize()), U.pick(t).clone());
        // every chest has a weapon or armour piece so nobody is left empty-handed
        inv.setItem(U.RND.nextInt(inv.getSize()), t.get(9 + U.RND.nextInt(t.size() - 9)).clone());
    }

    // ----- kits (bought in the hub with coins) -----
    public static final String[][] KITS = {
            // id, name, price, icon, description
            {"archer", "&aArcher", "200", "BOW", "&7A bow and 16 arrows"},
            {"knight", "&bKnight", "300", "STONE_SWORD", "&7A stone sword and a chain chestplate"},
            {"builder", "&eBuilder", "150", "BRICKS", "&764 bricks and a stone pickaxe"},
            {"chef", "&dChef", "100", "CAKE", "&710 steak and 2 golden apples"},
            {"ninja", "&8Ninja", "400", "ENDER_PEARL", "&72 ender pearls and speed at the start"},
    };

    public static void giveKit(Player p, String kit) {
        PlayerInventory inv = p.getInventory();
        switch (kit) {
            case "archer": inv.addItem(i(Material.BOW, 1), i(Material.ARROW, 16)); break;
            case "knight": inv.addItem(i(Material.STONE_SWORD, 1)); inv.setChestplate(i(Material.CHAINMAIL_CHESTPLATE, 1)); break;
            case "builder": inv.addItem(i(Material.BRICKS, 64), i(Material.STONE_PICKAXE, 1)); break;
            case "chef": inv.addItem(i(Material.COOKED_BEEF, 10), i(Material.GOLDEN_APPLE, 2)); break;
            case "ninja": inv.addItem(i(Material.ENDER_PEARL, 2));
                p.addPotionEffect(new org.bukkit.potion.PotionEffect(org.bukkit.potion.PotionEffectType.SPEED, 20 * 20, 1)); break;
            default: return;
        }
        U.msg(p, "&7You got your &e" + kit + " &7kit.");
    }
}
