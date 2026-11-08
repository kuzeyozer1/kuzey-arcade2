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
