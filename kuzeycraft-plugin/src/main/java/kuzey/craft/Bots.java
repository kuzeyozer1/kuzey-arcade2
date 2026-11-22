package kuzey.craft;

import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.entity.*;
import org.bukkit.inventory.EntityEquipment;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.LeatherArmorMeta;

import java.util.*;

/**
 * Bots: pretend players (/bots <number>). They look like players (a Steve head and coloured clothes) and have a name.
 * 50% hang out in the hub (chat, walk around, do parkour), 20% go to the prison (and a few of those fight in the
 * PvP arena), 30% join the games real players join.
 */
public class Bots {
    public enum Role { HUB, PRISON, PVP, GAME }

    public static class Bot {
        public final UUID id;
        public final String name;
        public Role role;
        public Game game;
        long nextMove, nextAct, nextChat, mineUntil;
        int parkourStep = -1;
        Bot(UUID id, String name, Role role) { this.id = id; this.name = name; this.role = role; }
        public Mob entity() { Entity e = Bukkit.getEntity(id); return e instanceof Mob && e.isValid() ? (Mob) e : null; }
        public String display() { return name; }
    }

    public static final String TAG = "kcbot";
    private static final String[] NAMES = {"BlockBoss", "CraftyKid", "DiamondDan", "PixelPip", "Steve_Miner", "LavaLuna", "CreeperCat", "EnderEmma", "RedstoneRay",
            "NoobNinja", "SkyHopper", "TntTom", "GoldenGus", "MossyMia", "SnowySam", "BuilderBo", "ZigZagZoe", "CookieCraft", "MegaMax", "LuckyLeo",
            "OakOlly", "QuartzQueen", "BlazeBen", "FrostyFin", "PickaxePete", "SwiftSara", "EmeraldEli", "CobbleCole", "PandaPaws", "RocketRia",
            "SlimeSlider", "WoolyWill", "CaveKai", "NetherNell", "BeeBuzz", "CactusCal", "DuneDara", "IceyIvy", "MagmaMo", "TurboTess"};
    private static final String[] HUB_CHAT = {"hi everyone!", "anyone want to play skywars?", "this server is so cool", "how do I get coins?", "gg", "who wants to do parkour?",
            "I just won tnt run!", "lol", "the fountain is so pretty", "let's play spleef!", "brb", "I love the daily wheel", "what kit do you use?", "survival games is my favourite",
            "hello {player}!", "{player} wanna play a game?", "I'm going to the prison", "nice", "can someone help me with parkour?", "I got coins from the wheel!",
            "the archer kit is good", "tnt run is so hard lol", "who is the best at spleef?", "i'm grade F in the prison", "this hub is huge"};
    private static final String[] PRISON_CHAT = {"just got grade {grade}!", "anyone selling diamonds?", "this mine is almost empty lol", "I need more gold", "who's in the pvp arena?",
            "efficiency 5 is so fast", "almost at the next grade!", "the mines refill so fast", "I'm going to escape soon", "/sell"};
    private static final String[] PVP_CHAT = {"come fight me!", "ez", "gg", "you can't catch me!", "who wants to fight?", "I have diamond armour lol", "the pvp arena is mine!"};
    private static final String[] GAME_CHAT = {"good luck everyone!", "gg", "I'm coming for you {player}!", "nooo", "this map is cool", "let's go!", "who has a sword?"};

    private final Map<UUID, Bot> bots = new LinkedHashMap<>();
    private final KuzeyCraft kc;

    public Bots(KuzeyCraft kc) { this.kc = kc; }

    public Bot get(UUID id) { return bots.get(id); }
    public boolean isBot(Entity e) { return e != null && bots.containsKey(e.getUniqueId()); }
    public int count() { return bots.size(); }
    public Collection<Bot> all() { return bots.values(); }
    private boolean showTag() { return kc.getConfig().getBoolean("bots-show-tag", true); }

    // ----- spawning -----
    /** Make exactly n bots (0 removes them all). */
    public void set(int n) {
        removeAll();
        if (n <= 0) return;
        int hub = (int) Math.round(n * 0.5), prison = (int) Math.round(n * 0.2), game = n - hub - prison;
        int pvp = prison > 0 ? Math.max(1, (int) Math.round(prison * 0.05)) : 0;
        List<String> names = new ArrayList<>(Arrays.asList(NAMES));
        Collections.shuffle(names);
        for (int i = 0; i < n; i++) {
            Role r = i < hub ? Role.HUB : i < hub + prison - pvp ? Role.PRISON : i < hub + prison ? Role.PVP : Role.GAME;
            String name = i < names.size() ? names.get(i) : names.get(i % names.size()) + (i / names.size() + 1);
            spawn(name, r);
        }
        kc.getLogger().info("Made " + n + " bots: " + hub + " in the hub, " + (prison - pvp) + " in the prison, " + pvp + " in the PvP arena, " + game + " for games.");
    }

    public void removeAll() {
        for (Bot b : bots.values()) { Mob m = b.entity(); if (m != null) m.remove(); if (b.game != null) { b.game.alive.remove(b.id); b.game.bots.remove(b.id); } }
        bots.clear();
        for (World w : Bukkit.getWorlds()) for (Entity e : w.getEntities()) if (e.getScoreboardTags().contains(TAG)) e.remove();
    }

    private void spawn(String name, Role role) {
        Location at = home(role);
        Zombie z = at.getWorld().spawn(at, Zombie.class, e -> dress(e, name, role));
        Bot b = new Bot(z.getUniqueId(), name, role);
        long now = System.currentTimeMillis();
        b.nextChat = now + 5000 + U.RND.nextInt(60000);
        b.nextMove = now + U.RND.nextInt(3000);
        bots.put(b.id, b);
    }

    /** Runs something, ignoring servers that can't do it (so one missing feature never breaks the bots). */
    private static void safe(Runnable r) { try { r.run(); } catch (Throwable ignored) { } }

    private void dress(Zombie z, String name, Role role) {
        z.addScoreboardTag(TAG);
        safe(z::setAdult);
        safe(() -> z.setShouldBurnInDay(false));
        safe(() -> z.setCanPickupItems(false));
        safe(() -> z.setSilent(true));
        safe(() -> z.setRemoveWhenFarAway(false));
        z.setCustomName(U.c((showTag() ? "&7[Bot] " : "") + "&f" + name));
        z.setCustomNameVisible(true);
        safe(() -> {
            EntityEquipment eq = z.getEquipment();
            Color[] cols = {Color.RED, Color.BLUE, Color.LIME, Color.YELLOW, Color.FUCHSIA, Color.AQUA, Color.ORANGE, Color.PURPLE, Color.WHITE, Color.BLACK, Color.TEAL};
            Color c1 = cols[U.RND.nextInt(cols.length)], c2 = cols[U.RND.nextInt(cols.length)];
            eq.setHelmet(new ItemStack(Material.PLAYER_HEAD));
            eq.setChestplate(dye(Material.LEATHER_CHESTPLATE, c1));
            eq.setLeggings(dye(Material.LEATHER_LEGGINGS, c2));
            eq.setBoots(dye(Material.LEATHER_BOOTS, Color.fromRGB(60, 40, 30)));
            eq.setItemInMainHand(role == Role.PRISON ? new ItemStack(U.pick(Material.IRON_PICKAXE, Material.DIAMOND_PICKAXE, Material.STONE_PICKAXE))
                    : role == Role.PVP ? new ItemStack(U.pick(Material.IRON_SWORD, Material.DIAMOND_SWORD)) : null);
            if (role == Role.PVP) eq.setChestplate(new ItemStack(U.pick(Material.IRON_CHESTPLATE, Material.DIAMOND_CHESTPLATE, Material.CHAINMAIL_CHESTPLATE)));
            eq.setHelmetDropChance(0); eq.setChestplateDropChance(0); eq.setLeggingsDropChance(0); eq.setBootsDropChance(0); eq.setItemInMainHandDropChance(0);
        });
    }

    private static ItemStack dye(Material m, Color c) {
        ItemStack it = new ItemStack(m);
        if (it.getItemMeta() instanceof LeatherArmorMeta) { LeatherArmorMeta lm = (LeatherArmorMeta) it.getItemMeta(); lm.setColor(c); it.setItemMeta(lm); }
        return it;
    }

    /** Where a bot of this kind hangs out. */
    private Location home(Role role) {
        switch (role) {
            case PRISON: { int g = U.RND.nextInt(1 + U.RND.nextInt(14)); return insideMine(g); }
            case PVP: return arenaSpot();
            default: return hubSpot();
        }
    }

    private Location hubSpot() {
        double a = U.RND.nextDouble() * Math.PI * 2, r = 6 + U.RND.nextDouble() * 18;
        return new Location(kc.hub.world, Math.cos(a) * r + 0.5, Hub.Y + 1, Math.sin(a) * r + 0.5);
    }

    private Location arenaSpot() {
        int x, z;
        do { x = Prison.AX1 + 1 + U.RND.nextInt(Prison.AX2 - Prison.AX1 - 2); z = Prison.AZ1 + 1 + U.RND.nextInt(Prison.AZ2 - Prison.AZ1 - 2); } while (x >= -5 && x <= 5 && z >= 31 && z <= 41);
        return new Location(kc.prison.world, x + 0.5, Prison.Y + 1, z + 0.5);
    }

    /** On top of the blocks in mine g. */
    private Location insideMine(int g) {
        int x = Prison.mx(g) + 1 + U.RND.nextInt(Prison.SIZE - 2), z = Prison.mz(g) + 1 + U.RND.nextInt(Prison.SIZE - 2);
        World w = kc.prison.world;
        int y = Prison.Y - 1;
        while (y > Prison.Y - Prison.DEPTH && w.getBlockAt(x, y, z).getType().isAir()) y--;
        return new Location(w, x + 0.5, y + 1, z + 0.5);
    }

    // ----- games -----
    /** A real player joined a game: the game bots come along. */
    public void playerJoinedGame(Game g) {
        int delay = 20;
        for (Bot b : bots.values()) {
            if (b.role != Role.GAME || b.game != null) continue;
            Bot bot = b;
            Bukkit.getScheduler().runTaskLater(kc, () -> { if (bot.game == null && bots.containsKey(bot.id) && bot.entity() != null) g.joinBot(bot); }, delay);
            delay += 10 + U.RND.nextInt(30);
        }
    }

    public void equipForGame(UUID id, Game g) {
        Bot b = bots.get(id);
        Mob m = b == null ? null : b.entity();
        if (m == null || m.getEquipment() == null) return;
        Material hand = g instanceof SkyWars || g instanceof SurvivalGames ? U.pick(Material.STONE_SWORD, Material.WOODEN_SWORD, Material.IRON_SWORD) : g instanceof Spleef ? Material.DIAMOND_SHOVEL : null;
        m.getEquipment().setItemInMainHand(hand == null ? null : new ItemStack(hand));
        m.setHealth(Math.min(20, m.getHealth() + 20));
    }

    /** The bot's round is over (or it was knocked out): back to the hub. */
    public void backFromGame(UUID id) {
        Bot b = bots.get(id);
        if (b == null) return;
        b.game = null;
        Mob m = b.entity();
        if (m == null) return;
        safe(() -> m.setTarget(null));
        safe(() -> m.getEquipment().setItemInMainHand(null));
        m.setFireTicks(0);
        m.setFallDistance(0);
        m.teleport(hubSpot());
        try { m.setHealth(20); } catch (Exception ignored) { }
    }

    /** The prison refilled a mine: lift any bots standing in it out first. */
    public void mineRefilled(int x, int z, int w, Location out) {
        for (Bot b : bots.values()) {
            Mob m = b.entity();
            if (m == null || !m.getWorld().equals(kc.prison.world)) continue;
            Location l = m.getLocation();
            if (l.getX() >= x && l.getX() < x + w && l.getZ() >= z && l.getZ() < z + w && l.getY() < Prison.Y + 2) m.teleport(out);
        }
    }

    // ----- what bots do, twice a second -----
    public void tick() {
        long now = System.currentTimeMillis();
        boolean anyone = !Bukkit.getOnlinePlayers().isEmpty();
        for (Bot b : new ArrayList<>(bots.values())) {
            Mob m = b.entity();
            if (m == null) continue; // its chunk isn't loaded: it's "asleep"
            try {
                if (b.game != null) inGame(b, m, now);
                else if (b.parkourStep >= 0) parkour(b, m, now);
                else switch (b.role) {
                    case PRISON: prison(b, m, now); break;
                    case PVP: pvp(b, m, now); break;
                    default: hub(b, m, now);
                }
            } catch (Exception ignored) { }
            if (anyone && now > b.nextChat) {
                chat(b);
                b.nextChat = now + (b.role == Role.HUB ? 25000 : 45000) + U.RND.nextInt(60000);
            }
        }
    }

    private void walk(Mob m, Location to) {
        try { m.getPathfinder().moveTo(to, 1.0); } catch (Throwable ignored) { }
    }

    private void hub(Bot b, Mob m, long now) {
        if (!m.getWorld().equals(kc.hub.world) || m.getLocation().getY() < Hub.Y - 10) { m.teleport(hubSpot()); return; }
        if (now < b.nextMove) return;
        b.nextMove = now + 3000 + U.RND.nextInt(6000);
        // now and then a hub bot goes and does the parkour
        if (b.role == Role.HUB && U.RND.nextInt(40) == 0 && kc.parkour.stepCount() > 0) {
            b.parkourStep = 0;
            m.teleport(kc.parkour.startLoc());
            b.nextAct = now + 2000;
            return;
        }
        // sometimes walk up to a game booth, like someone choosing a game
        if (U.RND.nextInt(5) == 0) {
            int[] pad = new ArrayList<>(kc.hub.pads.values()).get(U.RND.nextInt(kc.hub.pads.size()));
            walk(m, new Location(kc.hub.world, pad[0] * 1.2 + 0.5, Hub.Y + 1, pad[2] * 1.2 + 0.5));
        } else walk(m, hubSpot());
    }

    private void parkour(Bot b, Mob m, long now) {
        if (now < b.nextAct) return;
        b.nextAct = now + 1100 + U.RND.nextInt(800);
        if (b.parkourStep >= kc.parkour.stepCount()) {
            b.parkourStep = -1;
            say(b, U.pick("finished the parkour!!", "parkour done, that was hard", "gg parkour", "I beat the parkour in " + (40 + U.RND.nextInt(80)) + " seconds!"));
            m.teleport(hubSpot());
            return;
        }
        // sometimes they slip and go back a bit, like a real player
        if (b.parkourStep > 3 && U.RND.nextInt(12) == 0) b.parkourStep -= 1 + U.RND.nextInt(3);
        Location l = kc.parkour.stepLoc(b.parkourStep);
        m.teleport(l);
        b.parkourStep++;
    }

    private void prison(Bot b, Mob m, long now) {
        if (!m.getWorld().equals(kc.prison.world) || m.getLocation().getY() < Prison.Y - Prison.DEPTH - 3) { m.teleport(home(Role.PRISON)); return; }
        if (now > b.mineUntil) { // move to another mine now and then
            b.mineUntil = now + 40000 + U.RND.nextInt(40000);
            m.teleport(home(Role.PRISON));
            return;
        }
        if (now < b.nextAct) return;
        b.nextAct = now + 900 + U.RND.nextInt(900);
        Location l = m.getLocation();
        Block under = l.clone().add(U.RND.nextInt(3) - 1, -1, U.RND.nextInt(3) - 1).getBlock();
        if (kc.prison.mineAt(under.getX(), under.getY(), under.getZ()) >= 0 && !under.getType().isAir()) {
            safe(m::swingMainHand);
            kc.prison.botMined(under);
        } else walk(m, home(Role.PRISON));
    }

    private void pvp(Bot b, Mob m, long now) {
        if (!m.getWorld().equals(kc.prison.world) || !Prison.inArena(m.getLocation())) { m.teleport(arenaSpot()); return; }
        LivingEntity target = null;
        double best = 30 * 30;
        for (Player p : kc.prison.online()) {
            if (!Prison.inArena(p.getLocation()) || p.getGameMode() == GameMode.CREATIVE || p.getGameMode() == GameMode.SPECTATOR) continue;
            double d = p.getLocation().distanceSquared(m.getLocation());
            if (d < best) { best = d; target = p; }
        }
        for (Bot o : bots.values()) {
            if (o == b || o.role != Role.PVP) continue;
            Mob om = o.entity();
            if (om == null || !om.getWorld().equals(m.getWorld())) continue;
            double d = om.getLocation().distanceSquared(m.getLocation());
            if (d < best) { best = d; target = om; }
        }
        if (target != null) { LivingEntity t = target; safe(() -> m.setTarget(t)); }
        else if (now > b.nextMove) { b.nextMove = now + 4000; walk(m, arenaSpot()); }
    }

    private void inGame(Bot b, Mob m, long now) {
        Game g = b.game;
        if (g.state != Game.State.PLAYING || !g.isAlive(b.id)) { safe(() -> m.setTarget(null)); return; }
        if (g.protectedNow()) return;
        LivingEntity target = nearestOpponent(b, m);
        if (g.pvp()) {
            if (target != null) {
                safe(() -> m.setTarget(target));
                // SkyWars: build a bridge towards the target when there is a gap
                if (g instanceof SkyWars && target.getLocation().distanceSquared(m.getLocation()) > 9) {
                    Location l = m.getLocation();
                    org.bukkit.util.Vector dir = target.getLocation().toVector().subtract(l.toVector()).setY(0).normalize();
                    Block next = l.clone().add(dir).add(0, -1, 0).getBlock();
                    if (next.getType().isAir()) { next.setType(Material.COBBLESTONE); safe(m::swingMainHand); }
                    walk(m, target.getLocation());
                }
            }
            return;
        }
        if (g instanceof Spleef) {
            if (now < b.nextAct) return;
            b.nextAct = now + 700 + U.RND.nextInt(700);
            if (target != null) walk(m, target.getLocation());
            Location l = m.getLocation();
            Block snow = l.clone().add(U.RND.nextInt(5) - 2, -1, U.RND.nextInt(5) - 2).getBlock();
            Block mine = l.clone().add(0, -1, 0).getBlock();
            if (snow.getType() == Material.SNOW_BLOCK && !snow.equals(mine)) { snow.setType(Material.AIR); safe(m::swingMainHand); }
        } else if (g instanceof TntRun) {
            if (now < b.nextMove) return;
            b.nextMove = now + 1200 + U.RND.nextInt(1500);
            double a = U.RND.nextDouble() * Math.PI * 2, r = U.RND.nextDouble() * 13;
            Location l = m.getLocation();
            walk(m, new Location(l.getWorld(), Math.cos(a) * r, l.getY(), Math.sin(a) * r));
        }
    }

    private LivingEntity nearestOpponent(Bot b, Mob m) {
        Game g = b.game;
        LivingEntity best = null;
        double bd = Double.MAX_VALUE;
        for (UUID id : g.alive) {
            if (id.equals(b.id)) continue;
            Entity e = Bukkit.getEntity(id);
            if (!(e instanceof LivingEntity) || !e.getWorld().equals(m.getWorld())) continue;
            double d = e.getLocation().distanceSquared(m.getLocation());
            if (d < bd) { bd = d; best = (LivingEntity) e; }
        }
        return best;
    }

    // ----- chat -----
    private void chat(Bot b) {
        String[] pool = b.game != null ? GAME_CHAT : b.role == Role.PRISON ? PRISON_CHAT : b.role == Role.PVP ? PVP_CHAT : HUB_CHAT;
        say(b, pool[U.RND.nextInt(pool.length)]);
    }

    public void say(Bot b, String msg) {
        List<Player> online = new ArrayList<>(Bukkit.getOnlinePlayers());
        if (online.isEmpty()) return;
        msg = msg.replace("{player}", online.get(U.RND.nextInt(online.size())).getName()).replace("{grade}", U.grade(1 + U.RND.nextInt(20)));
        Bukkit.broadcastMessage(U.c((showTag() ? "&7[Bot] " : "") + "&f<" + b.name + "> ") + msg);
    }

    /** A real player said something: maybe a bot answers. */
    public void heard(Player p, String msg) {
        String m = msg.toLowerCase();
        String reply = null;
        if (m.matches(".*\\b(hi|hello|hey|merhaba|selam)\\b.*")) reply = U.pick("hi " + p.getName() + "!", "hello!", "hey " + p.getName(), "hiii");
        else if (m.contains("bot")) reply = U.pick("beep boop 🤖", "yes I'm a bot lol", "bots are people too");
        else if (m.contains("gg")) reply = "gg";
        else if (m.contains("play") || m.contains("game")) reply = U.pick("I'll play!", "let's go!", "me too!");
        if (reply == null || bots.isEmpty() || U.RND.nextInt(3) == 0) return;
        List<Bot> list = new ArrayList<>(bots.values());
        Bot b = list.get(U.RND.nextInt(list.size()));
        String r = reply;
        Bukkit.getScheduler().runTaskLater(kc, () -> say(b, r), 20L + U.RND.nextInt(50));
    }

    /** A PvP bot was beaten in the arena: it comes back a moment later. */
    public void arenaRespawn(Bot b) {
        Mob m = b.entity();
        if (m == null) return;
        safe(() -> m.setTarget(null));
        m.teleport(arenaSpot());
        try { m.setHealth(20); } catch (Exception ignored) { }
    }
}
