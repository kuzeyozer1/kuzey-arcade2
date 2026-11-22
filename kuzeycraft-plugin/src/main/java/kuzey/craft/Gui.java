package kuzey.craft;

import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

/** A chest menu. Each slot can have something that happens when you click it. */
public class Gui implements InventoryHolder {
    private final Inventory inv;
    private final Map<Integer, Consumer<Player>> actions = new HashMap<>();

    public Gui(int rows, String title) {
        inv = Bukkit.createInventory(this, rows * 9, U.c(title));
        ItemStack pane = U.item(Material.GRAY_STAINED_GLASS_PANE, " ");
        for (int i = 0; i < inv.getSize(); i++) inv.setItem(i, pane);
    }

    public Gui set(int slot, ItemStack it, Consumer<Player> action) {
        inv.setItem(slot, it);
        if (action != null) actions.put(slot, action);
        return this;
    }

    public void open(Player p) { p.openInventory(inv); }

    public void click(Player p, int slot) {
        Consumer<Player> a = actions.get(slot);
        if (a != null) { U.sound(p, org.bukkit.Sound.UI_BUTTON_CLICK, 1.2f); a.accept(p); }
    }

    @Override public Inventory getInventory() { return inv; }
}
