package kuzey.craft;

import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.Chest;
import org.bukkit.inventory.ItemStack;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockbukkit.mockbukkit.MockBukkit;
import org.mockbukkit.mockbukkit.ServerMock;
import org.mockbukkit.mockbukkit.entity.PlayerMock;

import static org.junit.jupiter.api.Assertions.*;

class KuzeyCraftTest {
    ServerMock server;
    KuzeyCraft kc;

    @BeforeEach void up() { server = MockBukkit.mock(); kc = MockBukkit.load(KuzeyCraft.class); server.getScheduler().performTicks(300); }
    @AfterEach void down() { MockBukkit.unmock(); }

    @Test void hubAndBooths() {
        World hub = server.getWorld("kc_hub");
        assertNotNull(hub);
        assertEquals(Material.SMOOTH_QUARTZ, hub.getBlockAt(5, Hub.Y, 5).getType(), "plaza floor");
        int[] pad = kc.hub.pads.get("spleef");
        assertEquals(Material.LIGHT_WEIGHTED_PRESSURE_PLATE, hub.getBlockAt(pad[0], pad[1], pad[2]).getType(), "gold plate");
        PlayerMock a = server.addPlayer("Ana");
        server.getScheduler().performTicks(10);
        assertEquals(hub, a.getWorld());
        assertEquals(Material.COMPASS, a.getInventory().getItem(0).getType());
        for (Game g : kc.games.values()) assertEquals(Game.State.WAITING, g.state, g.name + " should be ready");
    }

    @Test void spleefRound() {
        PlayerMock a = server.addPlayer("Ana"), b = server.addPlayer("Ben");
        server.getScheduler().performTicks(10);
        Game g = kc.games.get("spleef");
        g.join(a); g.join(b);
        assertEquals(Game.State.COUNTDOWN, g.state);
        server.getScheduler().performTicks(20 * 25);
        assertEquals(Game.State.PLAYING, g.state);
        assertTrue(a.getInventory().contains(Material.DIAMOND_SHOVEL));
        assertEquals(Material.SNOW_BLOCK, g.world.getBlockAt(3, 64, 3).getType());
        a.teleport(new Location(g.world, 0.5, 10, 0.5));
        server.getScheduler().performTicks(5);
        assertEquals(Game.State.ENDING, g.state);
        assertEquals(1, kc.data.of(b).wins);
        server.getScheduler().performTicks(400);
        assertEquals(Game.State.WAITING, g.state);
        assertEquals(kc.hub.world, b.getWorld());
    }

    @Test void skywarsChestsAndKnockout() {
        PlayerMock a = server.addPlayer("Ana"), b = server.addPlayer("Ben");
        server.getScheduler().performTicks(10);
        Game g = kc.games.get("skywars");
        Block mid = g.world.getBlockAt(3, 65, 0);
        assertEquals(Material.CHEST, mid.getType());
        org.bukkit.inventory.Inventory inv = server.createInventory(null, 27);
        Loot.fill(inv, 2);
        assertFalse(inv.isEmpty(), "chests get loot");
        g.join(a); g.join(b);
        server.getScheduler().performTicks(20 * 25);
        assertEquals(Game.State.PLAYING, g.state);
        server.getScheduler().performTicks(80);
        org.bukkit.event.entity.EntityDamageByEntityEvent hit = new org.bukkit.event.entity.EntityDamageByEntityEvent(a, b,
                org.bukkit.event.entity.EntityDamageEvent.DamageCause.ENTITY_ATTACK,
                org.bukkit.damage.DamageSource.builder(org.bukkit.damage.DamageType.PLAYER_ATTACK).withCausingEntity(a).withDirectEntity(a).build(), 1000);
        server.getPluginManager().callEvent(hit);
        assertTrue(hit.isCancelled(), "the knock-out is handled by the plugin, not a real death");
        server.getScheduler().performTicks(2);
        assertEquals(Game.State.ENDING, g.state);
        assertEquals(1, kc.data.of(a).kills);
        assertEquals(1, kc.data.of(a).wins);
    }

    @Test void tntRunFloorVanishes() {
        PlayerMock a = server.addPlayer("Ana");
        server.getScheduler().performTicks(10);
        Game g = kc.games.get("tntrun");
        g.join(a);
        g.forceStart();
        server.getScheduler().performTicks(20 * 8 + 80);
        assertEquals(Game.State.PLAYING, g.state);
        Location l = new Location(g.world, 5.5, 66, 5.5);
        a.teleport(l);
        server.getScheduler().performTicks(20);
        assertTrue(g.world.getBlockAt(5, 65, 5).getType().isAir(), "sand under the player is gone");
    }

    @Test void prisonMineSellGrade() {
        PlayerMock a = server.addPlayer("Ana");
        server.getScheduler().performTicks(10);
        kc.prison.join(a);
        assertEquals(kc.prison.world, a.getWorld());
        int x0 = Prison.mx(0), z0 = Prison.mz(0);
        Block log = kc.prison.world.getBlockAt(x0, 63, z0);
        assertTrue(log.getType().name().endsWith("_LOG"), "mine A has wood: " + log.getType());
        a.simulateBlockBreak(log);
        assertTrue(log.getType().isAir());
        Block b2 = kc.prison.world.getBlockAt(Prison.mx(1), 63, Prison.mz(1)); // mine B is locked at grade A
        Material before = b2.getType();
        a.simulateBlockBreak(b2);
        assertEquals(before, b2.getType());
        for (int i = 0; i < 70; i++) a.simulateBlockBreak(kc.prison.world.getBlockAt(x0 + i % 9, 62 - i / 81, z0 + (i / 9) % 9));
        kc.prison.sell(a);
        assertTrue(kc.data.of(a).gold >= 60, "gold " + kc.data.of(a).gold);
        kc.prison.gradeUp(a);
        assertEquals(1, kc.data.of(a).grade);
        // 26 mines, A to Z, all filled, and the last one has netherite
        assertEquals(26, Prison.MINES);
        Material z = kc.prison.world.getBlockAt(Prison.mx(25), 60, Prison.mz(25)).getType();
        assertTrue(Prison.PRICE.containsKey(z) && Prison.PRICE.get(z) >= 150, "mine Z has expensive blocks: " + z);
        // grade all the way to Z, then escape
        kc.data.of(a).gold = 100_000_000;
        for (int i = 0; i < 24; i++) kc.prison.gradeUp(a);
        assertEquals("Z", U.grade(kc.data.of(a).grade));
        kc.prison.gradeUp(a);
        assertEquals(0, kc.data.of(a).grade);
        assertEquals(1, kc.data.of(a).escapes);
    }

    @Test void enchanterWithoutHoldingTheTool() {
        PlayerMock a = server.addPlayer("Ana");
        server.getScheduler().performTicks(10);
        kc.prison.join(a); // gets a starter pickaxe in slot 0
        a.getInventory().setHeldItemSlot(8); // holding the menu star, not the pickaxe
        kc.data.of(a).gold = 5000;
        kc.prison.enchanter(a);
        Gui g = (Gui) a.getOpenInventory().getTopInventory().getHolder();
        g.click(a, 10); // the pickaxe
        Gui g2 = (Gui) a.getOpenInventory().getTopInventory().getHolder();
        g2.click(a, 10); // Efficiency 1
        ItemStack pick = a.getInventory().getItem(0);
        assertEquals(1, pick.getEnchantmentLevel(org.bukkit.enchantments.Enchantment.EFFICIENCY), "the pickaxe got Efficiency without being held");
        // armour shop
        kc.prison.armourShop(a);
        ((Gui) a.getOpenInventory().getTopInventory().getHolder()).click(a, 11); // chain set, 1500
        assertEquals(Material.CHAINMAIL_CHESTPLATE, a.getInventory().getChestplate().getType());
    }

    @Test void prisonArenaKnockout() {
        PlayerMock a = server.addPlayer("Ana"), b = server.addPlayer("Ben");
        server.getScheduler().performTicks(10);
        kc.prison.join(a); kc.prison.join(b);
        a.teleport(new Location(kc.prison.world, 10.5, 65, 30.5));
        b.teleport(new Location(kc.prison.world, 11.5, 65, 30.5));
        b.getInventory().addItem(new ItemStack(Material.DIAMOND_ORE, 10));
        org.bukkit.event.entity.EntityDamageByEntityEvent hit = new org.bukkit.event.entity.EntityDamageByEntityEvent(a, b,
                org.bukkit.event.entity.EntityDamageEvent.DamageCause.ENTITY_ATTACK,
                org.bukkit.damage.DamageSource.builder(org.bukkit.damage.DamageType.PLAYER_ATTACK).withCausingEntity(a).withDirectEntity(a).build(), 1000);
        server.getPluginManager().callEvent(hit);
        assertTrue(hit.isCancelled());
        assertTrue(a.getInventory().contains(Material.DIAMOND_ORE), "the winner takes the blocks");
        assertFalse(b.getInventory().contains(Material.DIAMOND_ORE));
        assertTrue(b.getLocation().getZ() < 20, "the loser goes back to the prison spawn");
        // outside the arena nobody can be hurt
        org.bukkit.event.entity.EntityDamageByEntityEvent hit2 = new org.bukkit.event.entity.EntityDamageByEntityEvent(a, b,
                org.bukkit.event.entity.EntityDamageEvent.DamageCause.ENTITY_ATTACK,
                org.bukkit.damage.DamageSource.builder(org.bukkit.damage.DamageType.PLAYER_ATTACK).withCausingEntity(a).withDirectEntity(a).build(), 5);
        server.getPluginManager().callEvent(hit2);
        assertTrue(hit2.isCancelled());
    }

    @Test void botsSpreadOutAndJoinGames() {
        PlayerMock a = server.addPlayer("Ana");
        a.setOp(true);
        server.getScheduler().performTicks(10);
        a.performCommand("bots 20");
        assertEquals(20, kc.bots.count());
        int hub = 0, prison = 0, pvp = 0, game = 0;
        for (Bots.Bot b : kc.bots.all()) switch (b.role) { case HUB: hub++; break; case PRISON: prison++; break; case PVP: pvp++; break; default: game++; }
        assertEquals(10, hub); assertEquals(3, prison); assertEquals(1, pvp); assertEquals(6, game);
        for (Bots.Bot b : kc.bots.all()) {
            org.bukkit.entity.Mob m = b.entity();
            assertNotNull(m);
            World expect = b.role == Bots.Role.PRISON || b.role == Bots.Role.PVP ? kc.prison.world : kc.hub.world;
            assertEquals(expect, m.getWorld(), b.name + " " + b.role);
        }
        server.getScheduler().performTicks(40);
        // Ana joins Spleef: the game bots follow her, and the round can start with them
        Game g = kc.games.get("spleef");
        g.join(a);
        server.getScheduler().performTicks(20 * 6);
        assertTrue(g.bots.size() >= 4, "bots joined: " + g.bots.size());
        assertEquals(Game.State.COUNTDOWN, g.state);
        server.getScheduler().performTicks(20 * 25);
        assertEquals(Game.State.PLAYING, g.state);
        // Ana falls: all real players are out, so the round ends and the bots go home
        a.teleport(new Location(g.world, 0.5, 10, 0.5));
        server.getScheduler().performTicks(5);
        assertEquals(Game.State.ENDING, g.state);
        server.getScheduler().performTicks(200);
        assertTrue(g.bots.isEmpty());
        for (Bots.Bot b : kc.bots.all()) if (b.role == Bots.Role.GAME) { assertNull(b.game); assertEquals(kc.hub.world, b.entity().getWorld()); }
        // bots tick without errors for a while (chatting, walking, mining)
        server.getScheduler().performTicks(20 * 60);
        a.performCommand("bots 0");
        assertEquals(0, kc.bots.count());
    }

    @Test void dailyWheel() {
        PlayerMock a = server.addPlayer("Ana");
        server.getScheduler().performTicks(10);
        assertEquals(Material.SUNFLOWER, a.getInventory().getItem(2).getType());
        int coins = kc.data.of(a).coins, gold = kc.data.of(a).gold, kits = kc.data.of(a).kits.size();
        assertTrue(kc.wheel.ready(a));
        kc.wheel.open(a);
        server.getScheduler().performTicks(20 * 15);
        Data.P d = kc.data.of(a);
        boolean won = d.coins > coins || d.gold > gold || d.kits.size() > kits || d.lastSpin.isEmpty();
        assertTrue(won, "the wheel gave a prize");
        if (!d.lastSpin.isEmpty()) assertFalse(kc.wheel.ready(a), "only one spin a day");
    }

    @Test void parkourAndCommands() {
        PlayerMock a = server.addPlayer("Ana");
        server.getScheduler().performTicks(10);
        kc.parkour.join(a);
        assertEquals(kc.parkour.world, a.getWorld());
        assertEquals(Material.QUARTZ_BLOCK, kc.parkour.world.getBlockAt(0, 70, 0).getType());
        a.performCommand("hub");
        assertEquals(kc.hub.world, a.getWorld());
        a.performCommand("play sg");
        assertTrue(kc.games.get("sg").has(a));
        a.performCommand("leave");
        assertFalse(kc.games.get("sg").has(a));
    }

    @Test void goldPlateAndMenu() {
        PlayerMock a = server.addPlayer("Ana");
        server.getScheduler().performTicks(10);
        int[] pad = kc.hub.pads.get("tntrun");
        Block plate = kc.hub.world.getBlockAt(pad[0], pad[1], pad[2]);
        server.getPluginManager().callEvent(new org.bukkit.event.player.PlayerInteractEvent(a, org.bukkit.event.block.Action.PHYSICAL, null, plate, org.bukkit.block.BlockFace.UP));
        assertTrue(kc.games.get("tntrun").has(a), "stepping on the plate joins TNT Run");
        a.performCommand("hub");
        kc.hub.gameMenu(a);
        assertTrue(a.getOpenInventory().getTopInventory().getHolder() instanceof Gui);
        ((Gui) a.getOpenInventory().getTopInventory().getHolder()).click(a, 10);
        assertTrue(kc.games.get("skywars").has(a), "first button in the menu is SkyWars");
        kc.data.of(a).coins = 500;
        kc.hub.kits(a);
        ((Gui) a.getOpenInventory().getTopInventory().getHolder()).click(a, 10);
        assertEquals("archer", kc.data.of(a).kit);
        assertEquals(300, kc.data.of(a).coins);
    }
}
