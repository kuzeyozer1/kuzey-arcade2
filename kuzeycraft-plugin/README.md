# KuzeyCraft

A Lifeboat-style plugin for a **Minecraft Java (Paper) server**. It builds everything by itself:

- **Hub:** a floating plaza with a fountain and a booth for every game. Step on a **gold plate** to play, or use the **compass**. Double jump, coins, a scoreboard and kits.
- **SkyWars:** start on your own island, loot chests, bridge over, be the last one standing.
- **Survival Games:** loot the middle and the field, and stay inside the shrinking border.
- **Spleef:** dig the snow out from under the others. Snowballs break snow too.
- **TNT Run:** the floor vanishes where you walk. You get 2 double jumps.
- **Parkour:** a rainbow course in the sky, with checkpoints, a timer and best times.
- **Prison:** mine, `/sell` for gold, `/gradeup` from A to F, buy pickaxes, then escape!

Each game gets its own sky world (`kc_hub`, `kc_skywars`, `kc_sg`, `kc_spleef`, `kc_tntrun`, `kc_parkour`, `kc_prison`). Your normal world is not touched.

## 1. Install it

1. You need **Paper 1.21.1** (or a newer 1.21 version) running on **Java 21**.
2. Download **KuzeyCraft.jar** from this repository's **Releases** page (`kuzeycraft-latest`).
3. Put it in your server's `plugins` folder and restart the server.
4. Wait until the console says **"The hub is ready!"** (a few seconds).
5. Make yourself the admin. Type this in the server console: `op YourName`

## 2. Commands

| Command | What it does |
|---|---|
| `/hub` | Go back to the hub |
| `/play skywars` (`sg`, `spleef`, `tntrun`, `parkour`, `prison`) | Join a game |
| `/leave` | Leave your game |
| `/stats` | Your coins, wins and knock-outs |
| `/sell`, `/gradeup` | Prison: sell your blocks, and grade up |
| `/kc start <game>` | Admin: start a game now, even with 1 player |
| `/kc rebuild <hub/parkour/prison/game>` | Admin: build it again |
| `/kc setaddress <address>` | Admin: the address shown on the scoreboard |
| `/kc coins <player> <amount>` | Admin: give coins |
| `/kc reload` | Admin: reload `config.yml` |

A game starts by itself when **2 players** are waiting (you can change this in `plugins/KuzeyCraft/config.yml`).
Admins in **creative mode** can build in the hub.

## 3. An address your friends can join

The address has to come from the computer that runs the server. (**GitHub Actions can't host a Minecraft server.** It only builds the plugin.)

### Easiest and safest: playit.gg (free, no router changes)
1. Ask a grown-up to help you make a free account at **playit.gg**.
2. On the server computer, download and run the **playit** program, then open the link it shows to connect it to your account.
3. On the playit.gg website, add a tunnel: **Minecraft Java**, local port **25565**.
4. It gives you an address like `something.joinmc.link`. **That's your server address!** Friends type it into Multiplayer, then Add Server.
5. In Minecraft, type `/kc setaddress something.joinmc.link` so it shows on the scoreboard.

Your server and playit only work while your computer is on.

### Friends in your house (same Wi-Fi)
They can use your computer's local address, like `192.168.1.20`. On Windows, type `ipconfig` in Command Prompt and look for "IPv4 Address".

### Port forwarding (a grown-up must do this)
Forward **TCP port 25565** on the router to the server computer, then share the public IP from a "what is my IP" website.
This shows your home's internet address to everyone who joins, and it can change, so **playit.gg is better**.

## 4. Let iPad, phone and Xbox players join too

Bedrock players (like on an iPad) can't join a Java server by themselves. Add these two free plugins from **geysermc.org/download**:
**Geyser-Spigot** and **Floodgate**. Then:

- With playit.gg, add a second tunnel: **Minecraft Bedrock**, local port **19132**.
- On the iPad, go to **Play**, then **Servers**, then **Add Server**. Type the Bedrock address and port that playit gives you.

## 5. Building the plugin yourself

Every change to `kuzeycraft-plugin/` is built and tested automatically by GitHub Actions (see `.github/workflows/kuzeycraft.yml`), and the newest `KuzeyCraft.jar` goes to the Releases page.
To build it on a computer: install Java 21 and Gradle, then run `gradle build` in this folder. The jar is put in `build/libs/`.
The tests (`gradle test`) run the plugin in a pretend server (MockBukkit) and play real rounds of each game.
