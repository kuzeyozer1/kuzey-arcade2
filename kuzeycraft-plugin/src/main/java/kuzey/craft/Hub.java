package kuzey.craft;

import org.bukkit.*;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.TextDisplay;
import org.bukkit.inventory.ItemStack;
import org.bukkit.scoreboard.*;

import java.util.*;

/** The hub: a floating plaza with a fountain and a booth for every game. */
public class Hub {
    public static final int Y = 64;
    public final World world;
    /** id -> where its gold pressure plate is */
    public final Map<String, int[]> pads = new LinkedHashMap<>();
    private final Map<String, TextDisplay> signs = new HashMap<>();
    // id, name, colour block, icon
    public static final Object[][] BOOTHS = {
            {"skywars", "&b&lSKYWARS", Material.LIGHT_BLUE_CONCRETE},
            {"sg", "&a&lSURVIVAL GAMES", Material.LIME_CONCRETE},
            {"spleef", "&f&lSPLEEF", Material.WHITE_CONCRETE},
            {"tntrun", "&c&lTNT RUN", Material.RED_CONCRETE},
            {"parkour", "&e&lPARKOUR", Material.YELLOW_CONCRETE},
            {"prison", "&7&lPRISON", Material.GRAY_CONCRETE},
    };

    public Hub(World w) {
        world = w;
        for (int i = 0; i < BOOTHS.length; i++) {
            double a = Math.toRadians(-90 + i * 60);
            pads.put((String) BOOTHS[i][0], new int[]{(int) Math.round(Math.cos(a) * 17), Y + 1, (int) Math.round(Math.sin(a) * 17)});
        }
    }

    public Location spawn() {
        Location l = new Location(world, 0.5, Y + 1, 8.5);
        l.setYaw(180);
        return l;
    }

    // ----- building the plaza -----
    public void build(Runnable done) {
        for (Entity e : world.getEntities()) if (e instanceof TextDisplay) e.remove();
        Build b = new Build(world).clear(-34, Y - 12, -34, 34, Y + 14, 34);
        // the floating island under the plaza
        for (int d = 1; d <= 10; d++) b.disc(0, Y - d, 0, 30 - d * 2.6, d < 3 ? Material.DIRT : Material.STONE);
        // the plaza floor: rings of colour
        b.disc(0, Y, 0, 30, Material.SMOOTH_QUARTZ);
        Material[] rings = {Material.CYAN_TERRACOTTA, Material.WHITE_CONCRETE, Material.LIGHT_BLUE_CONCRETE};
        for (int r = 0; r < 3; r++) for (int a = 0; a < 720; a++) {
            double rad = Math.toRadians(a / 2.0), rr = 10 + r * 8;
            b.set((int) Math.round(Math.cos(rad) * rr), Y, (int) Math.round(Math.sin(rad) * rr), rings[r]);
        }
        // grass and flowers round the edge
        for (int a = 0; a < 720; a++) {
            double rad = Math.toRadians(a / 2.0);
            int x = (int) Math.round(Math.cos(rad) * 29), z = (int) Math.round(Math.sin(rad) * 29);
            b.set(x, Y, z, Material.GRASS_BLOCK);
            if (a % 9 == 0) b.set(x, Y + 1, z, U.pick(Material.POPPY, Material.DANDELION, Material.BLUE_ORCHID, Material.OXEYE_DAISY));
            if (a % 30 == 0) { b.box(x, Y + 1, z, x, Y + 3, z, Material.OAK_FENCE); b.set(x, Y + 4, z, Material.LANTERN); }
        }
        // the fountain
        b.disc(0, Y, 0, 4, Material.PRISMARINE_BRICKS).disc(0, Y + 1, 0, 4, Material.PRISMARINE_BRICKS).disc(0, Y + 1, 0, 3, Material.WATER);
        b.box(0, Y + 1, 0, 0, Y + 4, 0, Material.SEA_LANTERN).set(0, Y + 5, 0, Material.WATER);
        // the booths
        for (int i = 0; i < BOOTHS.length; i++) {
            double a = Math.toRadians(-90 + i * 60);
            Material col = (Material) BOOTHS[i][2];
            int bx = (int) Math.round(Math.cos(a) * 22), bz = (int) Math.round(Math.sin(a) * 22);
            // an arch made of 3x3 posts and a roof
            double px = -Math.sin(a), pz = Math.cos(a);
            for (int s = -1; s <= 1; s += 2) {
                int x = bx + (int) Math.round(px * 3 * s), z = bz + (int) Math.round(pz * 3 * s);
                b.box(x, Y + 1, z, x, Y + 5, z, col);
            }
            for (int s = -3; s <= 3; s++) b.set(bx + (int) Math.round(px * s), Y + 6, bz + (int) Math.round(pz * s), col);
            b.set(bx, Y + 5, bz, Material.SEA_LANTERN);
            b.disc(bx, Y, bz, 3, col);
            int[] pad = pads.get((String) BOOTHS[i][0]);
            b.set(pad[0], Y, pad[2], Material.GOLD_BLOCK).set(pad[0], Y + 1, pad[2], Material.LIGHT_WEIGHTED_PRESSURE_PLATE);
        }
        b.run(() -> { holograms(); if (done != null) done.run(); });
    }

    private void holograms() {
        signs.clear();
        for (Object[] bo : BOOTHS) {
            String id = (String) bo[0];
            int[] p = pads.get(id);
            Location l = new Location(world, p[0] * 22.0 / 17 + 0.5, Y + 3.2, p[2] * 22.0 / 17 + 0.5);
            TextDisplay td = U.label(l, (String) bo[1]);
            if (td != null) signs.put(id, td);
        }
        TextDisplay welcome = U.label(new Location(world, 0.5, Y + 7.5, 0.5), "&6&l" + KuzeyCraft.get().getConfig().getString("server-name", "KUZEYCRAFT") + "\n&fStep on a &egold plate &fto play!\n&7or use your &acompass");
        if (welcome != null) signs.put("_welcome", welcome);
    }

    /** Refresh the floating signs with how many people are playing. */
    public void updateSigns() {
        KuzeyCraft kc = KuzeyCraft.get();
        for (Object[] bo : BOOTHS) {
            String id = (String) bo[0];
            TextDisplay td = signs.get(id);
            if (td == null || !td.isValid()) continue;
            String line;
            Game g = kc.games.get(id);
            if (g != null) line = g.stateText();
            else if (id.equals("parkour")) line = "&7" + kc.parkour.count() + " climbing";
            else line = "&7" + kc.prison.count() + " prisoners";
            td.setText(U.c(bo[1] + "\n" + line + "\n&eStep on the gold plate!"));
        }
    }

    // ----- sending players to the hub -----
    public void send(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Game g = kc.gameOf(p);
        if (g != null) g.leave(p, false);
        kc.prison.leave(p);
        kc.parkour.leave(p, false);
        U.reset(p, p.hasPermission("kuzeycraft.admin") && p.getGameMode() == GameMode.CREATIVE ? GameMode.CREATIVE : GameMode.ADVENTURE);
        p.teleport(spawn());
        giveItems(p);
        p.setAllowFlight(true); // for double jump
    }

    public void giveItems(Player p) {
        p.getInventory().setItem(0, U.item(Material.COMPASS, "&a&lGame Menu &7(right-click)", "&7Pick a game to play!"));
        p.getInventory().setItem(1, U.item(Material.CHEST, "&e&lKits &7(right-click)", "&7Buy kits for SkyWars", "&7and Survival Games with coins."));
        p.getInventory().setItem(2, U.item(Material.SUNFLOWER, "&6&lDaily Wheel &7(right-click)", "&7One free spin every day!"));
        p.getInventory().setItem(4, U.item(Material.NETHER_STAR, "&b&lMy Profile &7(right-click)", "&7Coins, wins and kills"));
        p.getInventory().setItem(8, U.item(Material.FEATHER, "&f&lDouble jump", "&7Press jump twice in the air!"));
    }

    public boolean in(Player p) { return p.getWorld().equals(world); }

    // ----- menus -----
    public void gameMenu(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Gui g = new Gui(3, "&8Pick a game");
        int slot = 10;
        for (Game game : kc.games.values()) {
            g.set(slot++, U.item(game.icon, "&e&l" + game.name, "&7" + game.help(), "", game.stateText(), "", "&aClick to play!"), pl -> { pl.closeInventory(); game.join(pl); });
        }
        g.set(slot++, U.item(Material.FEATHER, "&e&lParkour", "&7Jump to the top as fast as you can!", "", "&7" + kc.parkour.count() + " climbing", "", "&aClick to play!"), pl -> { pl.closeInventory(); kc.parkour.join(pl); });
        g.set(slot, U.item(Material.IRON_PICKAXE, "&e&lPrison", "&7Mine, sell, grade up from A to Z", "&7and escape!", "", "&7" + kc.prison.count() + " prisoners", "", "&aClick to play!"), pl -> { pl.closeInventory(); kc.prison.join(pl); });
        g.set(22, U.item(Material.BARRIER, "&cClose"), Player::closeInventory);
        g.open(p);
    }

    public void profile(Player p) {
        Data.P d = KuzeyCraft.get().data.of(p);
        Gui g = new Gui(3, "&8" + p.getName());
        g.set(10, U.item(Material.GOLD_NUGGET, "&eCoins: &f" + d.coins), null);
        g.set(11, U.item(Material.GOLDEN_HELMET, "&6Wins: &f" + d.wins), null);
        g.set(12, U.item(Material.IRON_SWORD, "&cKnock-outs: &f" + d.kills), null);
        g.set(13, U.item(Material.CLOCK, "&bGames played: &f" + d.played), null);
        g.set(14, U.item(Material.FEATHER, "&eBest parkour: &f" + (d.parkourBest > 0 ? U.time(d.parkourBest) : "not yet")), null);
        g.set(15, U.item(Material.IRON_PICKAXE, "&7Prison grade: &f" + U.grade(d.grade), "&7Gold: &e" + d.gold, "&7Escapes: &d" + d.escapes), null);
        g.set(16, U.item(Material.CHEST, "&eKit: &f" + d.kit), pl -> kits(pl));
        g.open(p);
    }

    public void kits(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Data.P d = kc.data.of(p);
        Gui g = new Gui(3, "&8Kits  &7(you have " + d.coins + " coins)");
        int slot = 10;
        for (String[] k : Loot.KITS) {
            boolean owned = d.kits.contains(k[0]), on = k[0].equals(d.kit);
            Material icon = Material.matchMaterial(k[3]);
            g.set(slot++, U.item(icon == null ? Material.CHEST : icon, k[1] + (on ? " &a✔" : ""), k[4], "",
                    owned ? (on ? "&aYou are using this kit" : "&eClick to use it") : "&6Costs " + k[2] + " coins. Click to buy!"), pl -> {
                Data.P dd = kc.data.of(pl);
                if (!dd.kits.contains(k[0])) {
                    int price = Integer.parseInt(k[2]);
                    if (dd.coins < price) { U.msg(pl, "&cYou need " + price + " coins. Win games to earn more!"); U.sound(pl, Sound.ENTITY_VILLAGER_NO, 1f); return; }
                    dd.coins -= price;
                    dd.kits.add(k[0]);
                    U.msg(pl, "&aYou bought the " + k[1] + " &akit!");
                    U.sound(pl, Sound.ENTITY_PLAYER_LEVELUP, 1.4f);
                }
                dd.kit = k[0];
                kits(pl);
            });
        }
        g.set(16, U.item(Material.BARRIER, "&7No kit"), pl -> { kc.data.of(pl).kit = "none"; kits(pl); });
        g.open(p);
    }

    // ----- scoreboard on the right side of the screen -----
    public void scoreboard(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        Scoreboard sb = p.getScoreboard();
        if (sb == Bukkit.getScoreboardManager().getMainScoreboard()) { sb = Bukkit.getScoreboardManager().getNewScoreboard(); p.setScoreboard(sb); }
        Objective o = sb.getObjective("kc");
        if (o == null) { o = sb.registerNewObjective("kc", Criteria.DUMMY, U.comp("&6&l" + kc.getConfig().getString("server-name", "KUZEYCRAFT"))); o.setDisplaySlot(DisplaySlot.SIDEBAR); }
        Data.P d = kc.data.of(p);
        List<String> lines = new ArrayList<>();
        Game g = kc.gameOf(p);
        lines.add("&7" + new java.text.SimpleDateFormat("dd/MM/yy").format(new Date()));
        lines.add(" ");
        if (g != null) {
            lines.add("&fGame: &e" + g.name);
            lines.add("&fPlayers left: &a" + g.alive.size());
            if (g.state == Game.State.PLAYING) lines.add("&fYour knock-outs: &c" + g.kills.getOrDefault(p.getUniqueId(), 0));
            else lines.add(U.c(g.stateText()));
        } else if (kc.prison.in(p)) {
            lines.add("&fGrade: &e" + U.grade(d.grade));
            lines.add("&fGold: &6" + d.gold);
            lines.add("&fNext grade: &7" + (d.grade >= Prison.MINES - 1 ? "ESCAPE!" : kc.prison.cost(d) + " gold"));
        } else if (kc.parkour.in(p)) {
            lines.add("&fParkour");
            lines.add("&fBest: &e" + (d.parkourBest > 0 ? U.time(d.parkourBest) : "-"));
        } else {
            lines.add("&fCoins: &e" + d.coins);
            lines.add("&fWins: &a" + d.wins);
            lines.add("&fKit: &b" + d.kit);
        }
        lines.add("  ");
        lines.add("&fOnline: &a" + Bukkit.getOnlinePlayers().size() + (kc.bots.count() > 0 ? " &7(+" + kc.bots.count() + " bots)" : ""));
        lines.add("   ");
        lines.add("&e" + kc.getConfig().getString("address", ""));
        for (String e : new ArrayList<>(sb.getEntries())) sb.resetScores(e);
        int n = lines.size();
        Set<String> used = new HashSet<>();
        for (String l : lines) {
            String s = U.c(l);
            while (used.contains(s)) s += " ";
            used.add(s);
            o.getScore(s).setScore(n--);
        }
    }
}
