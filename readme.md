# Infinite Indie Sandbox
The aim of Infinite Indie Sandbox is to capture the eternal, endless dream of creating your own world and sharing it with others.

Inspired by the now defunct toys-to-life genre, but with an all-digital premise and open-source development.

<img src="iis.png" />

# How to play
To run the game, right now you need to have PHP installed to use a local dev server. This will be replaced with a single-EXE HTTP server and WebView shell in a future update.

### Mac OS
You should already have PHP installed. Double click `run.sh` to start the game server.

### Linux
You may already have PHP installed. Double click `run.sh` to start the game server. If there is an error or the window disappears, proceed to follow these steps:

#### Ubuntu
Run this command:
```
sudo apt -y install php-cli
```

**Now you can run it!**

Double click `run.sh` to start the game server.

### Windows
One-time setup for Windows:
* Go to [scoop.sh](https://scoop.sh/) and follow the instructions
* Double click `scoop-install-php.bat` to install PHP via Scoop

**Now you can run it!**
* Double click `run.bat` to run the game


## Controls
After the server is started, go to this URL:
[localhost:7001](http://localhost:7001/)

Currently, the game starts in build mode. The active mode is listed at the top of the screen.

To switch between modes, press the `Esc` key then to enter a new mode:

* Press `1` for Build mode
* Press `2` for Play mode


### Build Mode

* Press the `Left`/`Right` arrow keys to cycle through the buildable objects
* Press the `Up`/`Down` arrow keys to switch object categories
* Press `W`,`A`,`S`,`D` to move the object around the world
* Press `R` or `V` to raise or lower the object
* Press `Z` or `C` to rotate the object
* Press `[` or `]` to scale the object
* Press `Space` to place the object
* Press `Delete` to remove the last placed object

Objects are placed centred under the cursor. Most objects rest their **base** on
the cursor (a tree sits *on* the surface), while **terrain** tiles snap their
**top** to the cursor — so a thin floor panel and a full terrain cube line up at
the same walking surface and tile together seamlessly. Use `R`/`V` to raise or
lower the object (and the whole surface height) before placing.

Some objects have **settings**: place a **Spawner** (Logic category) and a
parameters popup opens automatically so you can choose the enemy type, spawn
frequency and max-alive limit. To edit a placed object's settings later, enter
cursor mode (`0`), move the cursor over it and press `Space`.

#### Wiring: triggers → spawners

You can build simple gameplay by wiring interactive objects together. Place a
**Trigger** volume (Logic category) and a **Spawner**, then press `Esc` and
choose **Wiring**. The camera smoothly lifts to an overhead view showing only
the interactive objects, with 3D arrows drawn between wired objects:

* **Click a trigger** to start a wire (click it again to switch between its
  *Player Enters* / *Player Exits* events).
* **Click a spawner** to connect the trigger's event to it. Clicking the same
  spawner again cycles the action it performs (*Spawn One* → *Turn On* →
  *Turn Off* → *Toggle* → disconnect).

For example, wire a trigger's *Player Enters* to a spawner's *Spawn One* and set
the spawner to *Start on: no* — enemies then appear only when the player walks
into the trigger. Wires are saved with the world.

The logic family also includes a **Counter** (fires *Target Reached* after a set
number of wired events — e.g. "after collecting 3 stars, spawn a boss") and a
**Timer** (fires *Tick* on a schedule, startable/stoppable by wires — e.g. timed
enemy waves). Chain them freely: trigger → counter → spawner, timer → spawner,
star → counter, and so on.

#### Pickups

The **Pickups** category has placeable collectables that bob and spin in play
mode and are collected by touch: **health packs** (restore HP), **pixel caches**
(grant currency), and **stars** (collectibles). Each has settings for the
amount and whether it respawns after a delay or is one-time. Pickups fire a
*Collected* wiring event, so collecting one can drive spawners, counters, and
timers.

#### Select / move placed objects

* Press `0` to enter cursor (select) mode
* Move the cursor (`W`,`A`,`S`,`D`) over a placed object to highlight it
* Press `Enter` to pick it up and move it (then `Space` to drop it back)
* Press `Delete` to remove the highlighted object

**Saving:** Press `Esc` and choose Save Game / Load Game to store worlds in
save slots.

### Play Mode
In play mode, a default avatar will be dropped into the world at the origin `(0,0,0)`.

Right now there is a placeholder cube there so the player will not fall through the world, place your objects around this so you can navigate to them.

Keys:

* Press `W`,`A`,`S`,`D` to move
* Hold down `Shift` to run
* Press `Space` to jump
* **Left click** for a melee attack (also `F` for keyboard-only play)
* **Right click** for a ranged attack — the character turns to aim their hand and
  fires a neon shot toward the cursor
* Press `T` to **lock on** to the nearest enemy (a marker floats above it);
  ranged shots then track that target until it's defeated or you press `T` again

**Combos:** land melee swings back-to-back to chain a 3-hit combo — the third
hit is a finisher that deals triple damage.

Aim the ranged shot with the mouse; a gamepad auto-aims at the locked/nearest enemy.

**Gamepad:** the right trigger / right bumper fires a ranged attack, and the
left trigger / `X` swings a melee attack (in addition to the movement stick).

### Survival

A brand-new sandbox starts **empty and peaceful** — no enemies spawn on their
own. Enemies appear only from things you place: drop an `en_blob` enemy, or a
**Spawner** (Logic category) configured to produce neon **TRON-style enemies**.
There are flying polyhedra (melee) and **bipedal walkers** that fall and walk on
the terrain (using the same gravity as the player) and attack with both melee
and ranged neon shots. Attack them with `F` before they wear down your health
bar (top-left); if your health hits zero you respawn.

### Pixels & the Shop

Defeated enemies burst into **pixels** — tiny multi-coloured cubes that fly to
you and are added to your pixel count (shown top-right). Spend pixels in the
**Shop** (`Esc` → Shop) to unlock premium objects. Objects you don't own can
still appear and work in a world in play mode, but they're locked in build mode
(shown with a price in the object bar) until you buy them.

## Contributing

Contributions in the form of source code, content, documentation, and example levels are welcome!

Please see [docs/contributing.md](docs/contributing.md) for details on required contributor agreements and other procedures.


## Code of Conduct
For details on our code of conduct, please see [docs/conduct.md](docs/conduct.md). All contributors are required to agree to the Code of Conduct Pledge as described in [docs/contributing.md](docs/contributing.md).
