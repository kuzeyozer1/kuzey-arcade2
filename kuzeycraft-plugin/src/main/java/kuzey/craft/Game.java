package kuzey.craft;

import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.*;

/**
 * A round-based game (SkyWars, Survival Games, Spleef, TNT Run).
 * WAITING -> COUNTDOWN -> PLAYING -> ENDING -> RESETTING -> WAITING ...
 */
public abstract class Game {
    public enum State { RESETTING, WAITING, COUNTDOWN, PLAYING, ENDING }

    public final String id, name;
    public final Material icon;
    public final int maxPlayers;
    public World world;
    public State state = State.RESETTING;
    public final Set<UUID> players = new LinkedHashSet<>(); // everyone in the round (also the ones who are out)
    public final Set<UUID> alive = new LinkedHashSet<>();
    public final Map<UUID, Integer> kills = new HashMap<>();
    public final Map<UUID, UUID> lastHit = new HashMap<>();
    public final Map<UUID, Long> lastHitTime = new HashMap<>();
    protected int countdown, seconds;
    protected int startedWith;

    protected Game(String id, String name, Material icon, int maxPlayers) {
        this.id = id; this.name = name; this.icon = icon; this.maxPlayers = maxPlayers;
    }

    // ----- things each game decides -----
    /** Build (or rebuild) the arena, then call done. */
    protected abstract void build(Runnable done);
    /** Where players stand when the game starts. */
    protected abstract List<Location> spawns();
    /** Where players wait before the game starts. */
    protected abstract Location lobby();
    /** Give kits, start the border, and so on. */
    protected abstract void onStart(List<Player> ps);
    /** Called every second while playing. */
    protected void everySecond() {}
    /** Called every 2 ticks while playing. */
    protected void everyTick() {}
    /** Players falling below this are out. */
    protected abstract int voidY();
    public boolean pvp() { return false; }
    public boolean canBreak(Player p, Block b) { return false; }
    public boolean canPlace(Player p, Block b) { return false; }
    public String help() { return ""; }

    // ----- joining and leaving -----
    public boolean has(Player p) { return players.contains(p.getUniqueId()); }
    public boolean isAlive(Player p) { return alive.contains(p.getUniqueId()); }

    public void join(Player p) {
        KuzeyCraft kc = KuzeyCraft.get();
        if (has(p)) { U.msg(p, "&7You are already in &e" + name + "&7."); return; }
        Game other = kc.gameOf(p);
        if (other != null) other.leave(p, false);
        kc.prison.leave(p);
        kc.parkour.leave(p, false);
        if (state == State.RESETTING) { U.msg(p, "&e" + name + " &7is getting ready. Try again in a few seconds!"); return; }
        if (state == State.PLAYING || state == State.ENDING) { spectate(p); return; }
        if (alive.size() >= maxPlayers) { U.msg(p, "&c" + name + " is full! Try another game."); return; }
        players.add(p.getUniqueId());
        alive.add(p.getUniqueId());
        U.reset(p, GameMode.ADVENTURE);
        p.teleport(lobby());
        p.getInventory().setItem(8, U.item(Material.RED_BED, "&cLeave &7(right-click)"));
        tell("&a" + p.getName() + " &7joined &e" + name + " &7(" + alive.size() + "/" + maxPlayers + ")");
        U.title(p, "&e&l" + name.toUpperCase(), "&7" + help());
        U.sound(p, Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1.2f);
        int min = kc.getConfig().getInt("min-players", 2);
        if (state == State.WAITING && alive.size() >= min) startCountdown(kc.getConfig().getInt("countdown", 20));
        if (state == State.COUNTDOWN && alive.size() >= maxPlayers && countdown > 10) countdown = 10;
    }

    public void spectate(Player p) {
        players.add(p.getUniqueId());
        U.reset(p, GameMode.SPECTATOR);
        p.teleport(lobby());
        U.msg(p, "&7" + name + " has already started, so you are watching. Type &e/hub &7to leave.");
    }

    /** Leave the game. toHub = send them back to the hub. */
    public void leave(Player p, boolean toHub) {
        UUID id = p.getUniqueId();
        if (!players.contains(id)) return;
        if (state == State.PLAYING && alive.contains(id)) eliminate(p, null, "left the game");
        players.remove(id);
        alive.remove(id);
        if ((state == State.COUNTDOWN) && alive.size() < KuzeyCraft.get().getConfig().getInt("min-players", 2) && !forced) {
            state = State.WAITING;
            tell("&cNot enough players. Waiting for more...");
        }
        if (toHub) KuzeyCraft.get().hub.send(p);
    }

    // ----- the round -----
    private boolean forced = false;

    public void forceStart() {
        if (state == State.WAITING || state == State.COUNTDOWN) {
            if (alive.isEmpty()) return;
            forced = true;
            if (state == State.WAITING) startCountdown(5); else countdown = Math.min(countdown, 5);
        }
    }

    private void startCountdown(int secs) { state = State.COUNTDOWN; countdown = secs; }

    /** Runs once a second (from the main plugin). */
    public void second() {
        if (state == State.COUNTDOWN) {
            if (countdown <= 0) { start(); return; }
            for (Player p : online(alive)) {
                if (countdown <= 5 || countdown % 10 == 0) {
                    U.title(p, "&e" + countdown, "&7" + name + " starts soon!");
                    U.sound(p, Sound.BLOCK_NOTE_BLOCK_HAT, 1.5f);
                }
                p.setLevel(countdown);
            }
            countdown--;
        } else if (state == State.PLAYING) {
            seconds++;
            everySecond();
        }
    }

    public void tick() { if (state == State.PLAYING) {
        everyTick();
        for (Player p : online(alive)) if (p.getLocation().getY() < voidY()) eliminate(p, killerOf(p), "fell into the void");
    } }

    private void start() {
        state = State.PLAYING;
        seconds = 0;
        List<Player> ps = online(alive);
        startedWith = ps.size();
        List<Location> sp = new ArrayList<>(spawns());
        Collections.shuffle(sp);
        KuzeyCraft kc = KuzeyCraft.get();
        int i = 0;
        for (Player p : ps) {
            U.reset(p, GameMode.SURVIVAL);
            p.teleport(sp.get(i++ % sp.size()));
            U.title(p, "&a&lGO!", "&7" + help());
            U.sound(p, Sound.ENTITY_ENDER_DRAGON_GROWL, 1.4f);
            kc.data.of(p).played++;
            kills.put(p.getUniqueId(), 0);
        }
        onStart(ps);
        if (startedWith == 1) tell("&7Practice round: you are on your own. Have fun!");
    }

    /** Someone is out. */
    public void eliminate(Player p, Player killer, String why) {
        UUID id = p.getUniqueId();
        if (!alive.remove(id)) return;
        // drop their things where they were
        Location at = p.getLocation();
        if (pvp() && at.getY() > voidY()) {
            for (ItemStack it : p.getInventory().getContents()) if (it != null && it.getType() != Material.AIR) at.getWorld().dropItemNaturally(at, it);
        }
        U.reset(p, GameMode.SPECTATOR);
        Location view = lobby();
        p.teleport(view);
        KuzeyCraft kc = KuzeyCraft.get();
        if (killer != null && killer != p && alive.contains(killer.getUniqueId())) {
            tell("&c" + p.getName() + " &7was knocked out by &a" + killer.getName() + "&7!");
            kills.merge(killer.getUniqueId(), 1, Integer::sum);
            kc.data.of(killer).kills++;
            kc.data.addCoins(killer, kc.getConfig().getInt("coins.kill", 10), "knock out");
            U.sound(killer, Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1f);
        } else tell("&c" + p.getName() + " &7" + why + "!");
        U.title(p, "&c&lYOU'RE OUT", "&7You can watch, or type &e/hub");
        U.sound(p, Sound.ENTITY_VILLAGER_NO, 1f);
        checkEnd();
    }

    protected void checkEnd() {
        if (state != State.PLAYING) return;
        if (startedWith > 1 && alive.size() <= 1) end(alive.isEmpty() ? null : Bukkit.getPlayer(alive.iterator().next()));
        else if (alive.isEmpty()) end(null);
    }

    public void end(Player winner) {
        if (state != State.PLAYING) return;
        state = State.ENDING;
        KuzeyCraft kc = KuzeyCraft.get();
        if (winner != null) {
            tell("&6&l★ " + winner.getName() + " won " + name + "! ★");
            for (Player p : online(players)) U.title(p, "&6&l" + winner.getName() + " WINS!", "&7" + name);
            if (startedWith > 1) {
                kc.data.of(winner).wins++;
                kc.data.addCoins(winner, kc.getConfig().getInt("coins.win", 50), "you won!");
            }
            U.sound(winner, Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f);
            for (int i = 0; i < 4; i++) {
                int d = i;
                Bukkit.getScheduler().runTaskLater(kc, () -> { if (winner.isOnline()) U.firework(winner.getLocation().add(0, 1, 0)); }, 10L * d);
            }
        } else tell("&7The round is over.");
        for (Player p : online(players)) kc.data.addCoins(p, kc.getConfig().getInt("coins.play", 5), "for playing");
        Bukkit.getScheduler().runTaskLater(kc, () -> {
            for (Player p : online(players)) kc.hub.send(p);
            players.clear(); alive.clear(); kills.clear(); lastHit.clear(); lastHitTime.clear();
            reset();
        }, 120L);
    }

    public void reset() {
        state = State.RESETTING;
        forced = false;
        build(() -> { state = State.WAITING; Bukkit.getLogger().info("[KuzeyCraft] " + name + " is ready."); });
    }

    // ----- helpers -----
    public Player killerOf(Player p) {
        UUID k = lastHit.get(p.getUniqueId());
        Long t = lastHitTime.get(p.getUniqueId());
        if (k == null || t == null || System.currentTimeMillis() - t > 10000) return null;
        return Bukkit.getPlayer(k);
    }

    /** The first 3 seconds of a round: nobody can be hurt yet. */
    public boolean protectedNow() { return state == State.PLAYING && seconds < 3; }

    public void tell(String s) { for (Player p : online(players)) U.msg(p, s); }

    public static List<Player> online(Collection<UUID> ids) {
        List<Player> out = new ArrayList<>();
        for (UUID id : ids) { Player p = Bukkit.getPlayer(id); if (p != null && p.isOnline()) out.add(p); }
        return out;
    }

    public String stateText() {
        switch (state) {
            case WAITING: return "&aWaiting &7(" + alive.size() + "/" + maxPlayers + ")";
            case COUNTDOWN: return "&eStarting in " + countdown + " &7(" + alive.size() + "/" + maxPlayers + ")";
            case PLAYING: return "&cPlaying &7(" + alive.size() + " left)";
            case ENDING: return "&6Finishing";
            default: return "&7Building the arena...";
        }
    }

    /** A circle of points, for spawns. */
    protected List<Location> ring(double cx, double y, double cz, double r, int n) {
        List<Location> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            double a = i * Math.PI * 2 / n;
            Location l = new Location(world, cx + Math.cos(a) * r + 0.5, y, cz + Math.sin(a) * r + 0.5);
            l.setDirection(new org.bukkit.util.Vector(cx - l.getX(), 0, cz - l.getZ()));
            out.add(l);
        }
        return out;
    }
}
