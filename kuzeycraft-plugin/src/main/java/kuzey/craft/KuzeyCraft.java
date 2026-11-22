package kuzey.craft;

import org.bukkit.*;
import org.bukkit.block.Biome;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.generator.BiomeProvider;
import org.bukkit.generator.ChunkGenerator;
import org.bukkit.generator.WorldInfo;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.*;

/**
 * KuzeyCraft: a Lifeboat-style hub with mini-games.
 * Every game has its own empty sky world that the plugin builds by itself:
 * kc_hub, kc_skywars, kc_sg, kc_spleef, kc_tntrun, kc_parkour, kc_prison
 */
public class KuzeyCraft extends JavaPlugin {
    private static KuzeyCraft inst;
    public Data data;
    public Hub hub;
    public Parkour parkour;
    public Prison prison;
    public final Map<String, Game> games = new LinkedHashMap<>();
    private final Set<World> worlds = new HashSet<>();

    public static KuzeyCraft get() { return inst; }

    @Override public void onEnable() {
        inst = this;
        saveDefaultConfig();
        getDataFolder().mkdirs();
        data = new Data(getDataFolder());
        hub = new Hub(world("kc_hub"));
        games.put("skywars", new SkyWars(world("kc_skywars")));
        games.put("sg", new SurvivalGames(world("kc_sg")));
        games.put("spleef", new Spleef(world("kc_spleef")));
        games.put("tntrun", new TntRun(world("kc_tntrun")));
        parkour = new Parkour(world("kc_parkour"));
        prison = new Prison(world("kc_prison"));
        getServer().getPluginManager().registerEvents(new Listen(), this);

        getLogger().info("Building the hub and the arenas. This takes a few seconds...");
        hub.build(() -> {
            getLogger().info("The hub is ready!");
            for (Player p : Bukkit.getOnlinePlayers()) if (getConfig().getBoolean("send-to-hub-on-join", true)) hub.send(p);
        });
        parkour.build(() -> getLogger().info("Parkour is ready!"));
        prison.build(() -> getLogger().info("The prison is ready!"));
        for (Game g : games.values()) g.reset();

        // once a second
        Bukkit.getScheduler().runTaskTimer(this, () -> {
            for (Game g : games.values()) g.second();
            prison.second();
            hub.updateSigns();
            for (Player p : Bukkit.getOnlinePlayers()) {
                hub.scoreboard(p);
                p.sendPlayerListHeaderAndFooter(U.comp("&6&l" + getConfig().getString("server-name") + "\n&7Have fun!"),
                        U.comp("&7Play with friends at &e" + getConfig().getString("address")));
            }
        }, 20L, 20L);
        // ten times a second
        Bukkit.getScheduler().runTaskTimer(this, () -> { for (Game g : games.values()) g.tick(); parkour.tick(); }, 2L, 2L);
        // save every minute
        Bukkit.getScheduler().runTaskTimer(this, () -> data.save(), 1200L, 1200L);
    }

    @Override public void onDisable() {
        for (Player p : Bukkit.getOnlinePlayers()) prison.leave(p);
        data.save();
    }

    // ----- worlds -----
    /** An empty sky world (nothing but air). */
    public static class Sky extends ChunkGenerator {
        @Override public boolean shouldGenerateNoise() { return false; }
        @Override public boolean shouldGenerateSurface() { return false; }
        @Override public boolean shouldGenerateCaves() { return false; }
        @Override public boolean shouldGenerateDecorations() { return false; }
        @Override public boolean shouldGenerateMobs() { return false; }
        @Override public boolean shouldGenerateStructures() { return false; }
        @Override public Location getFixedSpawnLocation(World w, Random r) { return new Location(w, 0.5, 66, 0.5); }
        @Override public BiomeProvider getDefaultBiomeProvider(WorldInfo info) {
            return new BiomeProvider() {
                @Override public Biome getBiome(WorldInfo w, int x, int y, int z) { return Biome.PLAINS; }
                @Override public List<Biome> getBiomes(WorldInfo w) { return Collections.singletonList(Biome.PLAINS); }
            };
        }
    }

    private World world(String name) {
        World w = Bukkit.getWorld(name);
        if (w == null) w = new WorldCreator(name).generator(new Sky()).generateStructures(false).createWorld();
        w.setGameRule(GameRule.DO_DAYLIGHT_CYCLE, false);
        w.setGameRule(GameRule.DO_WEATHER_CYCLE, false);
        w.setGameRule(GameRule.DO_MOB_SPAWNING, false);
        w.setGameRule(GameRule.ANNOUNCE_ADVANCEMENTS, false);
        w.setGameRule(GameRule.DO_FIRE_TICK, false);
        w.setGameRule(GameRule.MOB_GRIEFING, false);
        w.setGameRule(GameRule.SHOW_DEATH_MESSAGES, false);
        w.setGameRule(GameRule.DO_IMMEDIATE_RESPAWN, true);
        w.setTime(6000);
        w.setStorm(false);
        w.setDifficulty(Difficulty.NORMAL);
        w.setSpawnLocation(0, 66, 0);
        worlds.add(w);
        return w;
    }

    public boolean isOurWorld(World w) { return worlds.contains(w); }

    public Game gameOf(Player p) {
        for (Game g : games.values()) if (g.has(p)) return g;
        return null;
    }

    /** Join a game by name. */
    public void play(Player p, String id) {
        switch (id.toLowerCase()) {
            case "skywars": case "sw": games.get("skywars").join(p); break;
            case "sg": case "survivalgames": case "survival": case "hungergames": games.get("sg").join(p); break;
            case "spleef": games.get("spleef").join(p); break;
            case "tntrun": case "tnt": games.get("tntrun").join(p); break;
            case "parkour": parkour.join(p); break;
            case "prison": prison.join(p); break;
            default: U.msg(p, "&cI don't know that game. Try: skywars, sg, spleef, tntrun, parkour, prison");
        }
    }

    // ----- commands -----
    @Override public boolean onCommand(CommandSender s, Command cmd, String label, String[] a) {
        String c = cmd.getName().toLowerCase();
        if (c.equals("kc")) return admin(s, a);
        if (!(s instanceof Player)) { s.sendMessage("Only players can do that."); return true; }
        Player p = (Player) s;
        switch (c) {
            case "hub": case "leave": hub.send(p); break;
            case "play": if (a.length == 0) hub.gameMenu(p); else play(p, a[0]); break;
            case "stats": Data.P d = data.of(p);
                U.msg(p, "&eCoins: &f" + d.coins + "  &6Wins: &f" + d.wins + "  &cKnock-outs: &f" + d.kills + "  &bGames: &f" + d.played); break;
            case "sell": prison.sell(p); break;
            case "gradeup": prison.gradeUp(p); break;
        }
        return true;
    }

    private boolean admin(CommandSender s, String[] a) {
        String sub = a.length > 0 ? a[0].toLowerCase() : "help";
        switch (sub) {
            case "start": {
                Game g = a.length > 1 ? games.get(a[1].toLowerCase()) : null;
                if (g == null) { s.sendMessage(U.c("&cUse: /kc start skywars|sg|spleef|tntrun")); return true; }
                g.forceStart();
                s.sendMessage(U.c("&aStarting " + g.name + " (even with 1 player)."));
                return true;
            }
            case "rebuild": {
                String what = a.length > 1 ? a[1].toLowerCase() : "";
                if (what.equals("hub")) hub.build(null);
                else if (what.equals("parkour")) parkour.build(null);
                else if (what.equals("prison")) prison.build(null);
                else if (games.containsKey(what) && games.get(what).state != Game.State.PLAYING) games.get(what).reset();
                else { s.sendMessage(U.c("&cUse: /kc rebuild hub|parkour|prison|skywars|sg|spleef|tntrun (not while playing)")); return true; }
                s.sendMessage(U.c("&aRebuilding " + what + "..."));
                return true;
            }
            case "setaddress":
                if (a.length < 2) { s.sendMessage(U.c("&cUse: /kc setaddress your.address.here")); return true; }
                getConfig().set("address", a[1]); saveConfig();
                s.sendMessage(U.c("&aThe address on the scoreboard is now &e" + a[1])); return true;
            case "coins": {
                if (a.length < 3) { s.sendMessage(U.c("&cUse: /kc coins <player> <amount>")); return true; }
                Player t = Bukkit.getPlayer(a[1]);
                if (t == null) { s.sendMessage(U.c("&cThat player is not online.")); return true; }
                try { data.of(t).coins += Integer.parseInt(a[2]); } catch (NumberFormatException ex) { s.sendMessage(U.c("&cThat's not a number.")); return true; }
                s.sendMessage(U.c("&aDone! " + t.getName() + " has " + data.of(t).coins + " coins.")); return true;
            }
            case "reload": reloadConfig(); s.sendMessage(U.c("&aSettings reloaded.")); return true;
            default:
                s.sendMessage(U.c("&6&lKuzeyCraft admin commands"));
                s.sendMessage(U.c("&e/kc start <game> &7- start a game now (even alone)"));
                s.sendMessage(U.c("&e/kc rebuild <hub|parkour|prison|game> &7- build it again"));
                s.sendMessage(U.c("&e/kc setaddress <address> &7- the address on the scoreboard"));
                s.sendMessage(U.c("&e/kc coins <player> <amount> &7- give coins"));
                s.sendMessage(U.c("&e/kc reload &7- reload config.yml"));
                s.sendMessage(U.c("&7Tip: admins in creative mode can build in the hub."));
                return true;
        }
    }
}
