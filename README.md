# Kuzey Arcade

Two browser games as an installable web app that works offline:

- **Neon Snake Rush**: snake with combos, gold food, portals and power-ups.
- **Five Temples**: a boss rush through the five temples of the Elementals mod.

Play at https://kuzeyozer1.github.io/kuzey-arcade2/ and add it to your home screen
(Safari: Share → Add to Home Screen; Chrome: ⋮ → Add to Home screen / Install app).

When you change a file, bump `VERSION` in `sw.js` so installed copies pick up the update.

## Kuzey Book Club

A separate app at https://kuzeyozer1.github.io/kuzey-arcade2/bookclub/ (add it to the home screen on its own).
Search any book through Open Library, read its summary from Wikipedia, and keep the club's shelf,
pick, meeting date, ratings and notes on the device.

### Book clubs

Start a club from the club bar: the app creates one shared record on the free restful-api.dev storage
(about 50 requests a day per device), and its id is the club code. Only the device holding the host key
can change the shelf, pick and meeting date; every member's ratings and notes are shared.

## FLL Pit Crew

https://kuzeyozer1.github.io/kuzey-arcade2/fll/ — a FIRST LEGO League BIOGLOW (2026–2027) team app:
match timer, live scorer built from the season score sheet, practice-run log with charts, robot run
planner, Innovation Project notes, competition-day checklist and judge practice questions.
A team code shares everything between teammates (same free storage as the book club).

## Yazılı Planı

https://kuzeyozer1.github.io/kuzey-arcade2/yazili/ — a study plan for the 5th grade 1st term written exams
(8–13 November 2026): about an hour of tasks a day, with quizzes, flashcards, read-aloud listening practice
and game breaks. Progress is saved on the device. The questions and the plan live in the `SETS` and `DAYS`
lists at the top of the script in `yazili/index.html`.

## More pages
- `sosyal.html` — Sosyal Bilgiler 1. Yazılı practice quiz.
- `elementals.html` — website for the Elementals mod.
- `minecraft/` — Food Vending Machine schematics (.litematic, Java 1.21.1) with setup steps.
- `snake-arena.html` — Snake Arena (live multiplayer only works inside Claude; solo here).
- `app-forge.html` — App Forge (AI app making only works inside Claude).

- `craft.html` — Kuzey Craft: a 3D block world (survival/creative, medium or endless worlds, monsters or peaceful, animals, farming, tools, Elemental ores). Uses three.js 0.160.0 from jsDelivr.
- `voidbridge.html` — Void Bridge: SkyWars seen from above. Loot chests on floating islands, bridge across the void and knock 1-7 bots off the edge before the sky collapses. TNT, bows, fireballs, Solo/Teams/Lucky Blocks modes, 5 maps and chiptune sound.
- `space.html` — Planet Lab: an interactive solar system explorer (orbits, NASA facts, weight on each planet, travel times, size comparison), English and Turkish.

## Labs & Tools
- `pixel.html` — Pixel Studio: Draw pixel art with a pen, fill bucket and mirror mode. Save a gallery and download your art.
- `beats.html` — Beat Maker: A 16-step drum machine: kick, snare, hi-hat, clap and more. Make a beat and save it.
- `piano.html` — Piano: Play a two-octave piano with 5 sounds, record yourself, and learn songs with glowing keys.
- `elements.html` — Element Explorer: The periodic table: all 118 elements with facts, Turkish names and fun “did you know?” notes.
- `codes.html` — Secret Codes: Morse code with beeps and a tap key, Caesar cipher, binary and an emoji alphabet.
- `timer.html` — Study Timer: Pomodoro focus timer, countdown with alarm, and a stopwatch with laps.
- `convert.html` — Unit Converter: Length, weight, temperature, speed, time, area, volume and computer data.
- `weather.html` — Weather: Live weather, the next 24 hours and a 7-day forecast for any city.
- `fractal.html` — Fractal Explorer: Tap to zoom forever into the Mandelbrot set and find seahorses and spirals.
- `illusions.html` — Illusion Lab: 8 optical illusions that trick your brain, each with a button that shows the truth.
- `kaleido.html` — Kaleidoscope Paint: Draw once and your lines are mirrored around the middle into amazing patterns. Save your art.
- `typing.html` — Typing Trainer: Test your typing speed in English or Turkish and beat your best WPM score.
- `cards.html` — Flashcards: Make your own flashcards for any subject. Tricky cards come back more often.
- `mathgym.html` — Times Table Gym: Practise times tables with a big number pad, sprints and a mastery map.
- `planner.html` — Homework Planner: Write down homework by subject and due date, tick it off and keep your streak.
- `picker.html` — Decision Kit: Spin a wheel, roll dice, flip a coin, pick a number or make fair teams.
- `flags.html` — World Flags: Flags, capitals and continents of 130 countries, plus a flag quiz.
- `voice.html` — Voice Changer: Record your voice and play it as a chipmunk, giant, robot, alien, echo or backwards.
- `qr.html` — QR Code Maker: Turn a link, a message or a Wi-Fi password into a QR code and download it.
- `flipbook.html` — Flipbook Animator: Draw page after page with onion skin, then press play to watch your cartoon move.
