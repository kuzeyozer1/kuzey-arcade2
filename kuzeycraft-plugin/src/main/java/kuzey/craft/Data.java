package kuzey.craft;

import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.io.File;
import java.io.IOException;
import java.util.*;

/** Everything we remember about each player: coins, wins, kills, kits, parkour and prison. Saved in players.yml. */
public class Data {
    public static class P {
        public int coins, wins, kills, played;
        public long parkourBest; // milliseconds, 0 = never finished
        public int gold, grade, escapes;
        public String kit = "none";
        public String lastSpin = "";
        public Set<String> kits = new HashSet<>();
        public List<ItemStack> prisonInv = null;
    }

    private final File file;
    private final Map<UUID, P> map = new HashMap<>();
    private boolean dirty = false;

    public Data(File folder) {
        file = new File(folder, "players.yml");
        if (!file.exists()) return;
        YamlConfiguration y = YamlConfiguration.loadConfiguration(file);
        for (String k : y.getKeys(false)) {
            try {
                P p = new P();
                p.coins = y.getInt(k + ".coins");
                p.wins = y.getInt(k + ".wins");
                p.kills = y.getInt(k + ".kills");
                p.played = y.getInt(k + ".played");
                p.parkourBest = y.getLong(k + ".parkour");
                p.gold = y.getInt(k + ".gold");
                p.grade = y.getInt(k + ".grade");
                p.escapes = y.getInt(k + ".escapes");
                p.kit = y.getString(k + ".kit", "none");
                p.lastSpin = y.getString(k + ".last-spin", "");
                p.kits = new HashSet<>(y.getStringList(k + ".kits"));
                List<?> inv = y.getList(k + ".prison-inv");
                if (inv != null) {
                    p.prisonInv = new ArrayList<>();
                    for (Object o : inv) p.prisonInv.add(o instanceof ItemStack ? (ItemStack) o : null);
                }
                map.put(UUID.fromString(k), p);
            } catch (Exception ignored) { }
        }
    }

    public P of(Player pl) { return of(pl.getUniqueId()); }

    public P of(UUID id) { dirty = true; return map.computeIfAbsent(id, k -> new P()); }

    public void addCoins(Player pl, int n, String why) {
        of(pl).coins += n;
        U.msg(pl, "&e+" + n + " coins &7(" + why + ")");
    }

    public void save() {
        if (!dirty) return;
        YamlConfiguration y = new YamlConfiguration();
        for (Map.Entry<UUID, P> e : map.entrySet()) {
            String k = e.getKey().toString();
            P p = e.getValue();
            y.set(k + ".coins", p.coins);
            y.set(k + ".wins", p.wins);
            y.set(k + ".kills", p.kills);
            y.set(k + ".played", p.played);
            y.set(k + ".parkour", p.parkourBest);
            y.set(k + ".gold", p.gold);
            y.set(k + ".grade", p.grade);
            y.set(k + ".escapes", p.escapes);
            y.set(k + ".kit", p.kit);
            y.set(k + ".last-spin", p.lastSpin);
            y.set(k + ".kits", new ArrayList<>(p.kits));
            if (p.prisonInv != null) y.set(k + ".prison-inv", p.prisonInv);
        }
        try { y.save(file); dirty = false; } catch (IOException ex) { ex.printStackTrace(); }
    }
}
