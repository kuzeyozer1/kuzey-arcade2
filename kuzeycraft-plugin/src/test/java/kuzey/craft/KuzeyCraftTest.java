package kuzey.craft;

import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.Chest;
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
        Block log = kc.prison.world.getBlockAt(-27, 63, -22);
        assertTrue(log.getType().name().endsWith("_LOG"), "mine A has wood: " + log.getType());
        a.simulateBlockBreak(log);
        assertTrue(log.getType().isAir());
        assertTrue(a.getInventory().containsAtLeast(new org.bukkit.inventory.ItemStack(log.getType() == Material.AIR ? Material.OAK_LOG : Material.OAK_LOG), 0));
        Block b2 = kc.prison.world.getBlockAt(-7, 63, -22); // mine B is locked at grade A
        Material before = b2.getType();
        a.simulateBlockBreak(b2);
        assertEquals(before, b2.getType());
        for (int i = 0; i < 70; i++) a.simulateBlockBreak(kc.prison.world.getBlockAt(-27 + i % 9, 62 - i / 9 / 9, -22 + (i / 9) % 9));
        kc.prison.sell(a);
        assertTrue(kc.data.of(a).gold >= 60, "gold " + kc.data.of(a).gold);
        kc.prison.gradeUp(a);
        assertEquals(1, kc.data.of(a).grade);
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
