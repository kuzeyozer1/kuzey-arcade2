# KuzeyCraft

A Lifeboat-style plugin for a **Minecraft Java (Paper) server**. It builds everything by itself:

- **Hub:** a floating plaza with a fountain and a booth for every game. Step on a **gold plate** to play, or use the **compass**. Double jump, coins, a scoreboard and kits.
- **SkyWars:** start on your own island, loot chests, bridge over, be the last one standing.
- **Survival Games:** loot the middle and the field, and stay inside the shrinking border.
- **Spleef:** dig the snow out from under the others. Snowballs break snow too.
- **TNT Run:** the floor vanishes where you walk. You get 2 double jumps.
- **Parkour:** a rainbow course in the sky, with checkpoints, a timer and best times.
- **Prison:** 26 mines from A to Z. Mine, `/sell` for gold, `/gradeup`, then escape at Z!
  - Tool shop, an armour and sword shop, and an **Enchanter** where you pick a tool or armour piece from your inventory.
  - A **PvP arena** with a mine of gold and diamonds. If someone beats you there, they take your blocks.
- **Daily wheel:** right-click the sunflower in the hub (or type `/spin`) for a free prize every day.
- **Bots:** `/bots <number>` adds pretend players.
  - Half hang out in the hub, chatting and doing parkour.
  - 20% mine in the prison, and some of those fight in the PvP arena.
  - The rest join the games you join.

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
| `/spin` | Spin the daily wheel (in the hub) |
| `/bots <number>` | Admin: add bots (`/bots 0` removes them) |
| `/kc start <game>` | Admin: start a game now, even with 1 player |
| `/kc rebuild <hub/parkour/prison/game>` | Admin: build it again |
| `/kc setaddress <address>` | Admin: the address shown on the scoreboard |
| `/kc coins <player> <amount>` | Admin: give coins |
| `/kc reload` | Admin: reload `config.yml` |

A game starts by itself when **2 players** are waiting (you can change this in `plugins/KuzeyCraft/config.yml`).
Admins in **creative mode** can build in the hub.

**About the bots:** they are mobs dressed as players (a Steve head, coloured clothes and a name). They walk, chat, mine, fight and play games.
Their names show a grey **[Bot]** tag so your friends know they are bots. You can turn that off in `config.yml` with `bots-show-tag: false`.

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

## 4. Let iPad, phone and Xbox players join too (Bedrock + Java)

Bedrock players (like on an iPad) can't join a Java server by themselves. Two free plugins fix that:

| Plugin | What it does |
|---|---|
| **Geyser** | Translates Bedrock into Java, so Bedrock players can connect |
| **Floodgate** | Lets Bedrock players join without a Java account |

1. Go to **geysermc.org/download**. Download **Geyser** and **Floodgate** for **Spigot/Paper**.
2. Put both `.jar` files in the `plugins` folder, next to KuzeyCraft.jar, and restart the server.
3. Open `plugins/Geyser-Spigot/config.yml` and check that it says `port: 19132` under `bedrock:`. That's usually already set. Geyser finds Floodgate by itself.
4. Your server now has two "doors":

   | Who | Port | playit.gg tunnel |
   |---|---|---|
   | Java players (PC) | **25565** | Minecraft Java |
   | Bedrock players (iPad, phone, Xbox) | **19132** | Minecraft Bedrock |

   In playit.gg, add **both** tunnels. The Bedrock tunnel gives you an address **and** a port number. Write both down.
5. **Joining on iPad:** go to **Play**, then **Servers**, then scroll down to **Add Server**. Type the Bedrock address and port from playit.
   On the same Wi-Fi, you can use the computer's local address (like `192.168.1.20`) with port **19132** instead.

Good to know:
- Bedrock players' names get a dot in front, like `.Kuzey`.
- The KuzeyCraft menus, gold plates, games and scoreboard all work for Bedrock players too.
- Geyser lets the newest Bedrock version join, so you don't need to match versions.

## 5. Staying safe

The plugins are safe **if you download them from the real websites**. The bigger risk is strangers joining.

**Only download from the official sites:**
- **papermc.io** (the server)
- **geysermc.org** (Geyser and Floodgate)
- **playit.gg** (the address)

Never use "free", "cracked" or "modded" downloads from YouTube links or random websites, because they can have viruses.

**Lock your server so only friends can join.** Type these in the server console:
```
whitelist on
whitelist add FriendName
fwhitelist add BedrockFriendName
```
`fwhitelist` is the Floodgate command for iPad, phone and Xbox friends.

**More good habits:**
- Only share the address with friends you know in real life. Don't post it online.
- Only make yourself admin (`op`). Don't give it to anyone else.
- Keep `online-mode=true` in `server.properties` (it's on by default).
- Back up your server folder now and then, so you can fix anything that gets broken.
- **Set it up with a grown-up**, especially the playit.gg account and installing programs.

## 6. Building the plugin yourself

Every change to `kuzeycraft-plugin/` is built and tested automatically by GitHub Actions (see `.github/workflows/kuzeycraft.yml`), and the newest `KuzeyCraft.jar` goes to the Releases page.
To build it on a computer: install Java 21 and Gradle, then run `gradle build` in this folder. The jar is put in `build/libs/`.
The tests (`gradle test`) run the plugin in a pretend server (MockBukkit) and play real rounds of each game.
