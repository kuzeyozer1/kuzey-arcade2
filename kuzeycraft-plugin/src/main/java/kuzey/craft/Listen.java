package kuzey.craft;

import org.bukkit.GameMode;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.Projectile;
import org.bukkit.entity.Snowball;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.*;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.event.player.*;
import org.bukkit.inventory.ItemStack;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Sends every event to the right place: hub, a game, parkour or prison. */
public class Listen implements Listener {
    private final KuzeyCraft kc = KuzeyCraft.get();
    private final Map<UUID, Long> padCooldown = new HashMap<>();

    private boolean ours(World w) { return kc.isOurWorld(w); }

    private boolean builder(Player p) { return p.hasPermission("kuzeycraft.admin") && p.getGameMode() == GameMode.CREATIVE; }

    // ----- joining and leaving the server -----
    @EventHandler public void join(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        e.setJoinMessage(org.bukkit.ChatColor.GREEN + "+ " + org.bukkit.ChatColor.GRAY + p.getName());
        if (kc.getConfig().getBoolean("send-to-hub-on-join", true) || ours(p.getWorld()))
            org.bukkit.Bukkit.getScheduler().runTaskLater(kc, () -> { if (p.isOnline()) { kc.hub.send(p); U.title(p, "&6&l" + kc.getConfig().getString("server-name"), "&7Welcome, " + p.getName() + "!");
                if (kc.wheel.ready(p)) U.msg(p, "&eYour &6daily wheel &eis ready! Right-click the &6sunflower&e."); } }, 5L);
    }

    @EventHandler public void quit(PlayerQuitEvent e) {
        Player p = e.getPlayer();
        e.setQuitMessage(org.bukkit.ChatColor.RED + "- " + org.bukkit.ChatColor.GRAY + p.getName());
        Game g = kc.gameOf(p);
        if (g != null) g.leave(p, false);
        kc.prison.leave(p);
        kc.parkour.leave(p, false);
    }

    @EventHandler public void changedWorld(PlayerChangedWorldEvent e) {
        Player p = e.getPlayer();
        Game g = kc.gameOf(p);
        if (g != null && !p.getWorld().equals(g.world)) g.leave(p, false);
        if (!p.getWorld().equals(kc.prison.world)) kc.prison.leave(p);
        if (!p.getWorld().equals(kc.parkour.world)) kc.parkour.leave(p, false);
        if (!kc.hub.in(p) && !ours(p.getWorld())) { p.setAllowFlight(p.getGameMode() == GameMode.CREATIVE || p.getGameMode() == GameMode.SPECTATOR); }
    }

    @EventHandler public void respawn(PlayerRespawnEvent e) {
        if (ours(e.getPlayer().getWorld())) {
            e.setRespawnLocation(kc.hub.spawn());
            org.bukkit.Bukkit.getScheduler().runTaskLater(kc, () -> kc.hub.send(e.getPlayer()), 2L);
        }
    }

    // ----- clicking things -----
    @EventHandler(priority = EventPriority.HIGH) public void interact(PlayerInteractEvent e) {
        Player p = e.getPlayer();
        if (!ours(p.getWorld())) return;
        Block b = e.getClickedBlock();
        if (e.getAction() == Action.PHYSICAL && b != null && b.getType() == Material.LIGHT_WEIGHTED_PRESSURE_PLATE) {
            if (kc.hub.in(p)) {
                long now = System.currentTimeMillis();
                if (now - padCooldown.getOrDefault(p.getUniqueId(), 0L) < 2500) return;
                for (Map.Entry<String, int[]> pad : kc.hub.pads.entrySet()) {
                    int[] q = pad.getValue();
                    if (q[0] == b.getX() && q[1] == b.getY() && q[2] == b.getZ()) { padCooldown.put(p.getUniqueId(), now); kc.play(p, pad.getKey()); }
                }
            } else if (p.getWorld().equals(kc.parkour.world)) kc.parkour.plate(p, b);
            return;
        }
        if (e.getAction() == Action.RIGHT_CLICK_AIR || e.getAction() == Action.RIGHT_CLICK_BLOCK) {
            ItemStack it = e.getItem();
            if (it != null) {
                Material m = it.getType();
                boolean done = true;
                if (m == Material.COMPASS && kc.hub.in(p)) kc.hub.gameMenu(p);
                else if (m == Material.SUNFLOWER && kc.hub.in(p)) kc.wheel.open(p);
                else if (m == Material.CHEST && kc.hub.in(p)) kc.hub.kits(p);
                else if (m == Material.NETHER_STAR && kc.hub.in(p)) kc.hub.profile(p);
                else if (m == Material.NETHER_STAR && kc.prison.in(p)) kc.prison.menu(p);
                else if (m == Material.RED_BED && (kc.gameOf(p) != null || kc.parkour.in(p))) kc.hub.send(p);
                else if (m == Material.ENDER_EYE && kc.parkour.in(p)) kc.parkour.back(p);
                else if (m == Material.FEATHER && kc.gameOf(p) instanceof TntRun) ((TntRun) kc.gameOf(p)).doubleJump(p);
                else done = false;
                if (done) { e.setCancelled(true); return; }
            }
        }
        // the hub, parkour and prison are look-but-don't-touch (except chests in games)
        if (b != null && !builder(p) && kc.gameOf(p) == null) {
            if (kc.prison.in(p) && e.getAction() == Action.LEFT_CLICK_BLOCK) return;
            e.setCancelled(true);
        }
    }

    // ----- double jump in the hub -----
    @EventHandler public void flight(PlayerToggleFlightEvent e) {
        Player p = e.getPlayer();
        if (!kc.hub.in(p) || p.getGameMode() == GameMode.CREATIVE || p.getGameMode() == GameMode.SPECTATOR) return;
        e.setCancelled(true);
        p.setAllowFlight(false);
        p.setFlying(false);
        p.setVelocity(p.getLocation().getDirection().multiply(1.1).setY(0.9));
        p.getWorld().playSound(p.getLocation(), Sound.ENTITY_BAT_TAKEOFF, 0.8f, 1.3f);
    }

    @EventHandler public void move(PlayerMoveEvent e) {
        Player p = e.getPlayer();
        if (!kc.hub.in(p)) return;
        if (p.getLocation().getY() < Hub.Y - 25) { p.teleport(kc.hub.spawn()); return; }
        if (!p.getAllowFlight() && p.getGameMode() == GameMode.ADVENTURE && ((Entity) p).isOnGround()) p.setAllowFlight(true);
    }

    // ----- getting hurt -----
    /** Who hit: a player, a bot, or a player/bot that shot something. */
    private Entity attackerOf(EntityDamageEvent e) {
        if (!(e instanceof EntityDamageByEntityEvent)) return null;
        Entity d = ((EntityDamageByEntityEvent) e).getDamager();
        if (d instanceof Projectile && ((Projectile) d).getShooter() instanceof Entity) d = (Entity) ((Projectile) d).getShooter();
        return d instanceof Player || kc.bots.isBot(d) ? d : null;
    }

    @EventHandler(priority = EventPriority.HIGH) public void damage(EntityDamageEvent e) {
        Entity victim = e.getEntity();
        if (!ours(victim.getWorld())) return;
        boolean isPlayer = victim instanceof Player, isBot = kc.bots.isBot(victim);
        if (!isPlayer && !isBot) return;
        Entity att = attackerOf(e);
        UUID vid = victim.getUniqueId(), aid = att == null ? null : att.getUniqueId();
        double hp = ((org.bukkit.entity.LivingEntity) victim).getHealth();
        boolean lethal = e.getFinalDamage() >= hp;

        // 1. the prison PvP arena
        if (victim.getWorld().equals(kc.prison.world)) {
            boolean ok = att != null && Prison.inArena(victim.getLocation()) && Prison.inArena(att.getLocation())
                    && (isBot ? kc.bots.get(vid).role == Bots.Role.PVP : kc.prison.in((Player) victim))
                    && (att instanceof Player ? kc.prison.in((Player) att) : kc.bots.get(aid).role == Bots.Role.PVP);
            if (!ok) { e.setCancelled(true); return; }
            if (!lethal) return;
            e.setCancelled(true);
            String attName = att instanceof Player ? att.getName() : kc.bots.get(aid).name;
            if (isPlayer) kc.prison.arenaKnockout((Player) victim, attName, att instanceof Player ? (Player) att : null);
            else {
                Bots.Bot b = kc.bots.get(vid);
                kc.bots.arenaRespawn(b);
                if (att instanceof Player) {
                    Data.P d = kc.data.of((Player) att);
                    int bounty = 25 * (d.grade + 1);
                    d.gold += bounty;
                    U.msg((Player) att, "&aYou beat " + b.name + "! &6+" + bounty + " gold");
                }
            }
            return;
        }

        // 2. the round-based games
        Game g = isPlayer ? kc.gameOf((Player) victim) : (kc.bots.get(vid).game);
        if (g == null || g.state != Game.State.PLAYING || !g.isAlive(vid) || g.protectedNow()) { e.setCancelled(true); return; }
        if (aid != null) {
            if (!g.isAlive(aid)) { e.setCancelled(true); return; }
            g.hit(vid, aid);
        }
        if (!g.pvp()) {
            // Spleef and TNT Run: you can push people, but nobody gets hurt
            if (aid != null) e.setDamage(0); else e.setCancelled(true);
            return;
        }
        if (e.getCause() == EntityDamageEvent.DamageCause.VOID) { e.setCancelled(true); g.knockout(vid, g.lastKiller(vid), "fell into the void"); return; }
        if (lethal) {
            e.setCancelled(true);
            g.knockout(vid, aid != null ? aid : g.lastKiller(vid), "was knocked out");
        }
    }

    // ----- bots: no burning, no turning into drowned, only fight when the plugin says so -----
    @EventHandler public void botTarget(org.bukkit.event.entity.EntityTargetEvent e) {
        if (kc.bots.isBot(e.getEntity()) && e.getReason() != org.bukkit.event.entity.EntityTargetEvent.TargetReason.CUSTOM) e.setCancelled(true);
    }

    @EventHandler public void botBurn(EntityCombustEvent e) { if (kc.bots.isBot(e.getEntity())) e.setCancelled(true); }

    @EventHandler public void botChange(EntityTransformEvent e) { if (kc.bots.isBot(e.getEntity())) e.setCancelled(true); }

    @EventHandler public void oldBots(org.bukkit.event.world.EntitiesLoadEvent e) {
        for (Entity en : e.getEntities()) if (en.getScoreboardTags().contains(Bots.TAG) && !kc.bots.isBot(en)) en.remove();
    }

    @SuppressWarnings("deprecation")
    @EventHandler public void chat(AsyncPlayerChatEvent e) {
        Player p = e.getPlayer();
        String msg = e.getMessage();
        org.bukkit.Bukkit.getScheduler().runTask(kc, () -> kc.bots.heard(p, msg));
    }

    @EventHandler public void death(PlayerDeathEvent e) {
        Player p = e.getEntity();
        Game g = kc.gameOf(p);
        if (g != null) { e.setDeathMessage(null); if (!g.pvp()) e.getDrops().clear(); g.eliminate(p, g.killerOf(p), "was knocked out"); }
        else if (ours(p.getWorld())) { e.getDrops().clear(); e.setDeathMessage(null); }
    }

    @EventHandler public void hunger(FoodLevelChangeEvent e) {
        if (!(e.getEntity() instanceof Player)) return;
        Player p = (Player) e.getEntity();
        if (!ours(p.getWorld())) return;
        Game g = kc.gameOf(p);
        if (g == null || !g.pvp() || g.state != Game.State.PLAYING) { e.setCancelled(true); p.setFoodLevel(20); }
    }

    // ----- breaking and placing -----
    @EventHandler(priority = EventPriority.HIGH) public void breakBlock(BlockBreakEvent e) {
        Player p = e.getPlayer();
        if (!ours(p.getWorld()) || builder(p)) return;
        Block b = e.getBlock();
        Game g = kc.gameOf(p);
        if (g != null) {
            if (g.state != Game.State.PLAYING || !g.isAlive(p) || !g.canBreak(p, b)) { e.setCancelled(true); return; }
            if (g instanceof Spleef) { e.setDropItems(false); if (U.RND.nextInt(3) == 0) p.getInventory().addItem(new ItemStack(Material.SNOWBALL)); }
            return;
        }
        if (kc.prison.in(p)) { kc.prison.mine(p, b); }
        e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGH) public void place(BlockPlaceEvent e) {
        Player p = e.getPlayer();
        if (!ours(p.getWorld()) || builder(p)) return;
        Game g = kc.gameOf(p);
        if (g != null && g.state == Game.State.PLAYING && g.isAlive(p) && g.canPlace(p, e.getBlockPlaced())) return;
        e.setCancelled(true);
    }

    @EventHandler public void snowball(ProjectileHitEvent e) {
        if (!(e.getEntity() instanceof Snowball) || e.getHitBlock() == null) return;
        Game g = kc.games.get("spleef");
        if (g == null || g.state != Game.State.PLAYING || !e.getHitBlock().getWorld().equals(g.world)) return;
        if (e.getHitBlock().getType() == Material.SNOW_BLOCK) e.getHitBlock().setType(Material.AIR);
    }

    @EventHandler public void spawnMobs(CreatureSpawnEvent e) {
        if (ours(e.getLocation().getWorld()) && e.getSpawnReason() == CreatureSpawnEvent.SpawnReason.NATURAL) e.setCancelled(true);
    }

    // ----- inventories and menus -----
    @EventHandler public void drop(PlayerDropItemEvent e) {
        Player p = e.getPlayer();
        if (!ours(p.getWorld()) || builder(p)) return;
        Game g = kc.gameOf(p);
        Material m = e.getItemDrop().getItemStack().getType();
        if (g == null && !kc.prison.in(p)) e.setCancelled(true);
        else if (m == Material.NETHER_STAR || m == Material.RED_BED) e.setCancelled(true);
    }

    @EventHandler public void click(InventoryClickEvent e) {
        if (!(e.getWhoClicked() instanceof Player)) return;
        Player p = (Player) e.getWhoClicked();
        if (e.getView().getTopInventory().getHolder() instanceof Gui) {
            e.setCancelled(true);
            if (e.getClickedInventory() == e.getView().getTopInventory()) {
                Gui gui = (Gui) e.getView().getTopInventory().getHolder();
                org.bukkit.Bukkit.getScheduler().runTask(kc, () -> gui.click(p, e.getSlot()));
            }
            return;
        }
        if (ours(p.getWorld()) && !builder(p) && kc.gameOf(p) == null && !kc.prison.in(p)) e.setCancelled(true);
    }

    @EventHandler public void drag(InventoryDragEvent e) {
        if (e.getView().getTopInventory().getHolder() instanceof Gui) e.setCancelled(true);
    }
}
