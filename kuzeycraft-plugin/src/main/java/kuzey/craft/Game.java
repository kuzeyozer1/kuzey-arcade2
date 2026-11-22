package kuzey.craft;

import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Item;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.*;

/**
 * A round-based game (SkyWars, Survival Games, Spleef, TNT Run).
 * WAITING -> COUNTDOWN -> PLAYING -> ENDING -> RESETTING -> WAITING ...
 * Real players and bots can both play. alive holds both; bots holds only the bots.
 */
public abstract class Game {
    public enum State { RESETTING, WAITING, COUNTDOWN, PLAYING, ENDING }

    public final String id, name;
    public final Material icon;
    public final int maxPlayers;
    public World world;
    public State state = State.RESETTING;
    public final Set<UUID> players = new LinkedHashSet<>(); // real players in the round (also the ones who are out)
    public final Set<UUID> alive = new LinkedHashSet<>();   // still in: players and bots
    public final Set<UUID> bots = new LinkedHashSet<>();    // bots in the round
    public final Map<UUID, Integer> kills = new HashMap<>();
    public final Map<UUID, UUID> lastHit = new HashMap<>();
    public final Map<UUID, Long> lastHitTime = new HashMap<>();
    protected int countdown, seconds;
    protected int startedWith;
    private boolean forced = false;

    protected Game(String id, String name, Material icon, int maxPlayers) {
        this.id = id; this.name = name; this.icon = icon; this.maxPlayers = maxPlayers;
    }

    // ----- things each game decides -----
    protected abstract void build(Runnable done);
    protected abstract List<Location> spawns();
    protected abstract Location lobby();
    protected abstract void onStart(List<Player> ps);
    protected void everySecond() {}
    protected void everyTick() {}
    protected abstract int voidY();
    public boolean pvp() { return false; }
    public boolean canBreak(Player p, Block b) { return false; }
    public boolean canPlace(Player p, Block b) { return false; }
    public String help() { return ""; }

    // ----- joining and leaving -----
    public boolean has(Player p) { return players.contains(p.getUniqueId()); }
    public boolean isAlive(Player p) { return alive.contains(p.getUniqueId()); }
    public boolean isAlive(UUID id) { return alive.contains(id); }
    private int min() { return KuzeyCraft.get().getConfig().getInt("min-players", 2); }
    public int realPlayers() { int n = 0; for (UUID id : alive) if (!bots.contains(id)) n++; return n; }

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
        joined();
        kc.bots.playerJoinedGame(this);
    }

    /** A bot wants to play. Returns true if it got in. */
    public boolean joinBot(Bots.Bot b) {
        if ((state != State.WAITING && state != State.COUNTDOWN) || alive.size() >= maxPlayers || realPlayers() == 0) return false;
        alive.add(b.id);
        bots.add(b.id);
        b.game = this;
        if (b.entity() != null) b.entity().teleport(lobby().add(U.RND.nextInt(7) - 3, 0, U.RND.nextInt(7) - 3));
        tell("&a" + b.display() + " &7joined &e" + name + " &7(" + alive.size() + "/" + maxPlayers + ")");
        joined();
        return true;
    }

    private void joined() {
        if (state == State.WAITING && alive.size() >= min() && realPlayers() > 0) startCountdown(KuzeyCraft.get().getConfig().getInt("countdown", 20));
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
        if (state == State.PLAYING && alive.contains(id)) knockout(id, null, "left the game");
        players.remove(id);
        alive.remove(id);
        if (state == State.COUNTDOWN && (alive.size() < min() || realPlayers() == 0) && !forced) {
            state = State.WAITING;
            tell("&cNot enough players. Waiting for more...");
        }
        // no real players left waiting: the bots go back to the hub
        if ((state == State.WAITING || state == State.COUNTDOWN) && realPlayers() == 0) sendBotsHome();
        if (toHub) KuzeyCraft.get().hub.send(p);
    }

    private void sendBotsHome() {
        for (UUID b : new ArrayList<>(bots)) { alive.remove(b); KuzeyCraft.get().bots.backFromGame(b); }
        bots.clear();
        if (state == State.COUNTDOWN) state = State.WAITING;
    }

    // ----- the round -----
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

    public void tick() {
        if (state != State.PLAYING) return;
        everyTick();
        for (Player p : online(alive)) if (p.getLocation().getY() < voidY()) knockout(p.getUniqueId(), lastKiller(p.getUniqueId()), "fell into the void");
        for (UUID b : new ArrayList<>(bots)) {
            Entity e = Bukkit.getEntity(b);
            if (alive.contains(b) && (e == null || !e.isValid() || e.getLocation().getY() < voidY())) knockout(b, lastKiller(b), "fell into the void");
        }
    }

    private void start() {
        state = State.PLAYING;
        seconds = 0;
        List<Player> ps = online(alive);
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
        for (UUID b : bots) {
            Entity e = Bukkit.getEntity(b);
            if (e != null) { e.teleport(sp.get(i++ % sp.size())); kc.bots.equipForGame(b, this); }
        }
        startedWith = alive.size();
        onStart(ps);
        if (startedWith == 1) tell("&7Practice round: you are on your own. Have fun!");
    }

    // ----- knock-outs -----
    public void eliminate(Player p, Player killer, String why) {
        knockout(p.getUniqueId(), killer != null ? killer.getUniqueId() : lastKiller(p.getUniqueId()), why);
    }

    /** Someone (a player or a bot) is out. killer can be a player, a bot, or null. */
    public void knockout(UUID id, UUID killer, String why) {
        if (!alive.remove(id)) return;
        KuzeyCraft kc = KuzeyCraft.get();
        Player p = Bukkit.getPlayer(id);
        String who = nameOf(id);
        if (p != null) {
            Location at = p.getLocation();
            if (pvp() && at.getY() > voidY())
                for (ItemStack it : p.getInventory().getContents()) if (it != null && it.getType() != Material.AIR) at.getWorld().dropItemNaturally(at, it);
            U.reset(p, GameMode.SPECTATOR);
            p.teleport(lobby());
            U.title(p, "&c&lYOU'RE OUT", "&7You can watch, or type &e/hub");
            U.sound(p, Sound.ENTITY_VILLAGER_NO, 1f);
        } else {
            bots.remove(id);
            kc.bots.backFromGame(id);
        }
        if (killer != null && !killer.equals(id) && alive.contains(killer)) {
            tell("&c" + who + " &7was knocked out by &a" + nameOf(killer) + "&7!");
            kills.merge(killer, 1, Integer::sum);
            Player kp = Bukkit.getPlayer(killer);
            if (kp != null) {
                kc.data.of(kp).kills++;
                kc.data.addCoins(kp, kc.getConfig().getInt("coins.kill", 10), "knock out");
                U.sound(kp, Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1f);
            }
        } else tell("&c" + who + " &7" + why + "!");
        checkEnd();
    }

    protected void checkEnd() {
        if (state != State.PLAYING) return;
        if (alive.isEmpty()) { end((UUID) null); return; }
        if (startedWith > 1 && alive.size() == 1) { end(alive.iterator().next()); return; }
        // all the real players are out: the bot with the most knock-outs wins, so nobody waits for ages
        if (startedWith > 1 && realPlayers() == 0) end(alive.stream().max(Comparator.comparingInt(b -> kills.getOrDefault(b, 0))).orElse(null));
    }

    /** Old style: end with a winning player (or null). */
    public void end(Player winner) { end(winner == null ? null : winner.getUniqueId()); }

    public void end(UUID winner) {
        if (state != State.PLAYING) return;
        state = State.ENDING;
        KuzeyCraft kc = KuzeyCraft.get();
        if (winner != null) {
            String wn = nameOf(winner);
            tell("&6&l★ " + wn + " won " + name + "! ★");
            for (Player p : online(players)) U.title(p, "&6&l" + wn + " WINS!", "&7" + name);
            Player wp = Bukkit.getPlayer(winner);
            if (wp != null) {
                if (startedWith > 1) {
                    kc.data.of(wp).wins++;
                    kc.data.addCoins(wp, kc.getConfig().getInt("coins.win", 50), "you won!");
                }
                U.sound(wp, Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f);
            }
            Entity we = Bukkit.getEntity(winner);
            for (int i = 0; i < 4; i++)
                Bukkit.getScheduler().runTaskLater(kc, () -> { if (we != null && we.isValid()) U.firework(we.getLocation().add(0, 1, 0)); }, 10L * i);
        } else tell("&7The round is over.");
        for (Player p : online(players)) kc.data.addCoins(p, kc.getConfig().getInt("coins.play", 5), "for playing");
        Bukkit.getScheduler().runTaskLater(kc, () -> {
            for (Player p : online(players)) kc.hub.send(p);
            for (UUID b : new ArrayList<>(bots)) kc.bots.backFromGame(b);
            players.clear(); alive.clear(); bots.clear(); kills.clear(); lastHit.clear(); lastHitTime.clear();
            reset();
        }, 120L);
    }

    public void reset() {
        state = State.RESETTING;
        forced = false;
        for (Entity e : world.getEntities()) if (e instanceof Item) e.remove();
        build(() -> { state = State.WAITING; Bukkit.getLogger().info("[KuzeyCraft] " + name + " is ready."); });
    }

    // ----- helpers -----
    public void hit(UUID victim, UUID attacker) { lastHit.put(victim, attacker); lastHitTime.put(victim, System.currentTimeMillis()); }

    public UUID lastKiller(UUID victim) {
        UUID k = lastHit.get(victim);
        Long t = lastHitTime.get(victim);
        if (k == null || t == null || System.currentTimeMillis() - t > 10000) return null;
        return k;
    }

    public Player killerOf(Player p) { UUID k = lastKiller(p.getUniqueId()); return k == null ? null : Bukkit.getPlayer(k); }

    public String nameOf(UUID id) {
        Player p = Bukkit.getPlayer(id);
        if (p != null) return p.getName();
        Bots.Bot b = KuzeyCraft.get().bots.get(id);
        return b != null ? b.display() : "someone";
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
