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

**New Game** opens a **starter-world picker**: Rolling Hills (the classic
gentle terrain), Flat Plane (a blank canvas), Arena (a walled floor for combat
games), Floating Islands (a platforming start), or the **Sandbox Hub** — a
pre-wired challenge park with four zones: a Combat Yard whose entrance wakes a
spawner (with a camera cut), a Star Climb that pays the scoreboard when you
collect all four stars, a Crossing bridged only by a moving platform (watch
the patrol on the far side), and a furnished Homestead with a sliding door
and a pocket-interior cell door. It doubles as a live tour of everything the
wiring system can do — open the Wiring view there and study the connections.

To switch between modes, press the `Esc` key then to enter a new mode:

* Press `1` for Build mode
* Press `2` for Play mode


### Build Mode

* Press the `Up`/`Down` arrow keys to switch object categories — the bottom
  bar shows only the selected category
* Press the `Left`/`Right` arrow keys to cycle through the objects in that
  category
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
lower the object (and the whole surface height) before placing. Terrain now
comes in **themes**: alongside the classic grass blocks you'll find **sand**, **snow**,
**volcanic** (charred rock with a glowing-ember crust), and **toxic**
(sickly alien green) — build deserts, snowfields, lava flats, or
wastelands that even sound different underfoot.

**Snap mode:** hold `Shift` (or the controller's left bumper), or tap
`CapsLock` to latch it on. While active, each movement key press **snaps the
object flush** against the nearest thing in that direction — perfect for
clicking blocks together seamlessly — and the rotate keys **match the angle**
of the nearest similar piece instead of stepping 45°.

A **sidebar on the left** lists every object in the current category — click
a row (or use the arrow keys) to switch what you're placing.

**Ask the builder:** press `K` and type what you want — *"a walled arena"*,
*"a star trail with 5 stars"*, *"a patrol"*, *"a snow tower"* — and the
assistant assembles it around you, wiring included (the arena's trigger
arms its spawner, the star trail scores itself). It's all local: no
internet, no accounts, just a builder that understands a handful of
requests and their size/count/theme tweaks.

Some objects have **settings**: place a **Spawner** (Logic category) and a
parameters popup opens automatically so you can choose the enemy type, spawn
frequency and max-alive limit. To edit a placed object's settings later, enter
cursor mode (`0`), select it and press `Shift+Space`.

**Selecting placed objects** (cursor mode, `0`): move the cursor onto an
object with `WASD` — or just **click it with the mouse**. Then `Space` picks
it up to move it (drop it with `Space` again), and `Shift+Space` opens its
properties.

#### Wiring: triggers → spawners

You can build simple gameplay by wiring interactive objects together. Place a
**Trigger** volume (Logic category) and a **Spawner**, then press `Esc` and
choose **Wiring**. The camera smoothly lifts to an overhead view showing only
the interactive objects, with 3D arrows drawn between wired objects:

* **Drag** from a source object (one that fires events — cyan outline) onto a
  target object (one that accepts actions) to connect them. If several
  event/action combinations fit, a chooser asks exactly which event drives
  which action.
* **Click any object** to open its inspector card: what events it fires,
  what actions it accepts, and every wire leaving it (click a wire row to
  jump to that wire).
* **Click a wire** to select it — its card shows exactly what it carries
  (from, event, to, action) with a **Delete Wire** button inside, so you can
  explore an existing setup without breaking anything. Every wire is also
  labelled in the world ("Player Enters → Spawn One").
* A **guide panel** on the right explains the model and lists each object
  type's events (▸ fires) and actions (◂ accepts).

For example, wire a trigger's *Player Enters* to a spawner's *Spawn One* and set
the spawner to *Start on: no* — enemies then appear only when the player walks
into the trigger. Wires are saved with the world.

There's also a **Quest** toy: wire several different event sources into its
*Quest Step Done* input (a trigger, a counter's target, a race finish, a cell
door…) and it completes once all of them have fired — each source counts only
once, so it's "do these N different things". Completion pays a pixel reward
(set in its settings) and fires *Quest Complete* for further wiring. Dying
re-arms every quest for the next run. The Sandbox Hub starter world ships
with a 3-step "Tour the Park" quest to show the pattern.

The logic family also includes a **Counter** (fires *Target Reached* after a set
number of wired events — e.g. "after collecting 3 stars, spawn a boss"), a
**Timer** (fires *Tick* on a schedule, startable/stoppable by wires — e.g. timed
enemy waves), a **Scoreboard** (wired events score points, the score shows
on the play-mode HUD, and hitting the target fires *Target Reached* — build
your own minigame win conditions), and a **Camera** (a wired *Cut To This
Camera* moves the view to it for a few seconds — a cutaway that shows the
player what their trigger just did — then fires *Cut Finished*, so cameras can
chain into mini-cinematics). Chain them freely: trigger → counter → spawner,
timer → spawner, star → scoreboard, trigger → camera, and so on.

#### Interiors: rooms, doors, decoration

The **Interior** category is a room-building kit: solid walls, a wall with a
**doorway**, a wall with a **window**, and a wood **floor** panel (its top
snaps to the cursor like terrain, so room floors sit flush with the ground).
Walls block movement and shots; the doorway and window openings genuinely let
things through. The **Door** (Props category) is a sliding pocket door sized
to the doorway gap — in the Wiring view it accepts *Open* / *Close* /
*Open-Close* actions and fires *Opened* / *Closed* events, so a trigger or
counter can unlock a room (a settings option makes it start open instead).
Furnish with the **Decor** category: table, chair, floor lamp, and rug.

For a whole room behind a single door, place a **Cell Door** (Props) — its
glowing panel is a portal: walk into it in play mode and you're teleported
into a small decorated interior — and that room is **yours to remodel**:
it's made of real objects, so enter build mode while inside (or click its
pieces from anywhere) to redecorate, and your changes save with the world
and survive every visit (its settings pick the starting theme, a cozy den or a
columned hall). Step on the glowing exit pad to return to where you entered.
While you're inside, enemies outside politely freeze. The door fires *Player
Entered* / *Player Exited* wiring events, so entering a room can start timers,
cut cameras, or count visits.

#### Paths and moving platforms

Place **Path Node** markers (Logic category) and chain them in the Wiring
view — wire each node's *Next Node* to the following node's *Chain From
Previous*. Then place a **Moving Platform** (Props) and wire its *Follow Path
From* to the first node: in play mode the platform travels the chain at its
configured speed, in **loop**, **ping-pong**, or **once** mode. Wires can
*Start*/*Stop*/*Reset* it, it fires *Arrived At Node* and *Path Completed*
events (drive counters, spawners, cameras…), and dying resets it to the path
start. Note: the platform pushes things in its way, but doesn't carry riders
yet — use it for sweepers, barriers, and timed crossings.

**Enemy patrols:** wire an `en_blob`'s *Patrol Path From* to a path node the
same way and it walks the chain (its settings choose speed and loop vs
ping-pong). When you get close it stops and watches you; back away and the
patrol resumes.

**Races:** place a **Race** toy (Logic) and wire trigger volumes into it — one
as the *Start Gate*, any number as *Checkpoints* (its settings say how many
the course needs), and one as the *Finish Line*. Running through the start
arms a stopwatch on the HUD; the finish only counts once every checkpoint has
been hit (each one counts once, so laps through the same gate don't cheat).
Finishing fires *Race Finished*, and beating your best fires *New Best
Time* — wire those to scoreboards, cameras, or spawners to celebrate. Best
times are stored with the course, so they persist in your world's save slot.

#### Pickups

The **Pickups** category has placeable collectables that bob and spin in play
mode and are collected by touch: **health packs** (restore HP), **pixel caches**
(grant currency), and **stars** (collectibles). Each has settings for the
amount and whether it respawns after a delay or is one-time. Pickups fire a
*Collected* wiring event, so collecting one can drive spawners, counters, and
timers.

#### Select / move placed objects

* Press `0` to enter cursor (select) mode
* Move the cursor (`W`,`A`,`S`,`D`) over a placed object — or **click the
  object with the mouse** — to highlight it
* Press `Space` to pick it up and move it (then `Space` again to drop it)
* Press `Shift+Space` to open its properties
* Press `Delete` to remove the highlighted object

**Saving:** Press `Esc` and choose Save World / Load World — worlds save
under **names you type**, and you can save or load at any time without
leaving your session. Your character's **progression** (pixels, levels,
skills, companions) lives separately in one of three **progression slots**
(main menu → Progression Slot); everything you *own* is shared across
slots, so buying a figure once means having it everywhere.

**Sharing:** the main menu's **Share Worlds** screen exports your current
world as a `.json` file you can send to anyone, and imports world files you
receive (the game checks they really are world files first). Imported worlds
open straight into build mode. The same screen shows the **gallery** — ready-
made worlds that ship with the game: a parkour star-run, a tiny arena, and
**Glow Circuit**, a kart lap-race whose start gate times every lap (while
you're driving, the kart itself trips triggers — build your own courses the
same way) — complete with a translucent **ghost kart** rival lapping the
circuit to race against; place your own (Props → Ghost Kart) and wire it to
any path chain. There's also **The Glowlands**, a three-mission Play Set:
light the path, open the vault, win the trial — finishing each mission
unlocks the next (the vault door literally stays shut until you do), and the
finale pays out with a camera flourish. Every mission is ordinary wiring, so
open it in the Wiring view to learn how to build campaigns of your own. The
Glowlands is a **premium Play Set** — 150 pixels unlocks it forever (earn
them fighting and questing in the Sandbox), and it comes with its own
hero: **Wick** joins your collection when you buy the set. Play Set
heroes are special — inside their campaign only they can take the stage
(whoever you brought in may finish as a guest), but out in the Sandbox
they're yours to play anywhere, like every figure you own. Its sequel, **Nightfall Crown**
(200 pixels), is a boss-arena showdown under a living day/night sky: enter
the arena for a dramatic camera reveal, fight the crowned titan through all
three of its phases while reinforcements pour in, and depose it to swing
the loot vault open. A **★ FEATURED** pick rotates daily at the top of the
list. For a longer quest, **The Locked Depths** is a key-and-lock dungeon (dodge across a lava
channel for the gold key, slip past the sentry for the silver, and unlock
the vault — checkpoints keep a misstep cheap), and **Aether Ruins** is a
three-stage adventure —
fight past a sentry and clear a wave to open the first gate, teleport up to
a key-star to open the second, and loot the vault, with checkpoints so a
death doesn't send you back to the start.

### Play Mode
In play mode, a default avatar will be dropped into the world at the origin `(0,0,0)`.

Right now there is a placeholder cube there so the player will not fall through the world, place your objects around this so you can navigate to them.

Keys:

* Press `W`,`A`,`S`,`D` to move
* Hold down `Shift` to run
* Press `Space` to jump — press again mid-air for a **double jump**, and
  **hold** `Space` while falling to **glide** down slowly
* **Left click** for a melee attack (also `F` for keyboard-only play)
* **Right click** for a ranged attack — the character turns to aim their hand and
  fires a neon shot toward the cursor
* Press `T` to **lock on** to the nearest enemy (a marker floats above it);
  ranged shots then track that target until it's defeated or you press `T` again
* Hold `G` to **block** — a shield raises in front of you and attacks from the
  front deal no damage (attacks from behind still hurt, so keep facing the threat)
* Press `C` to **dodge roll** — a quick burst of movement in the direction
  you're moving (or a back-hop if standing still); anything that hits you
  mid-roll is ignored entirely. There's a short cooldown between rolls.
* Press `M` to **mute/unmute** all sound (remembered across sessions)

**Combos:** land melee swings back-to-back to chain a 3-hit combo — the third
hit is a finisher that deals triple damage.

**Juggling:** press `R` for a **launcher** — an upward swing that knocks
enemies in front of you into the air. While they're airborne every hit deals
**+1 bonus damage** and pops them back up, so launch → swing → swing keeps
them helpless in the air (the HUD celebrates your juggle chain). Walkers
ragdoll up and crash back down; flyers tumble. Launched enemies can't attack
until they land.

Aim the ranged shot with the mouse; a gamepad auto-aims at the locked/nearest enemy.

**Driving:** buy the **Hover-Kart** in the shop (Props category), place it,
and walk into it in play mode to hop in. `W`/`S` (or the left stick) throttle
with real momentum, `A`/`D` steer — sharper the faster you go — and `Space`
hops out. Dying parks the kart back where you left it. The kart is **armed**:
hold `F` or left-click to fire its forward guns for drive-by combat.

**Riding:** the **Strider** (Props) is a friendly beast you saddle the same
way. It's slower than the kart but turns on the spot, its legs trot as you
ride, and `Space` makes it **jump** — `C` hops off. Perfect for bounding
around rough terrain the kart hates.

**Sound:** the **Chime** (Logic) plays a synthesized jingle whenever
anything wires into its *Play* input — pick jingle, alarm, gong, or
power-up in its options, set the volume, and chain its *Played* event
onward. Wire a door to a gong, a spawner to an alarm, a quest to a
fanfare; every sound is generated on the spot, no files involved.

**Day & night:** place a **Sun** (Logic) and play mode gets a living sky —
noon blazes, dusk glows warm, night falls deep and blue, on a cycle you
choose in its options. The sun fires *Dawn / Noon / Dusk / Midnight* wiring
events, so you can make monsters spawn only at night or lamps greet the
dark. Build mode always stays daylit, and every run starts at first light.

**Gadgets:** the Collection's **Discs** screen also sells **gadget hexes** —
equippable passive perks, one active at a time: a **Pixel Magnet** (dropped
pixels rush straight to you), **Boost Boots** (jump higher everywhere), and
a **Guardian Ward** (shrugs off the first hit each life). Buy one and it's
yours across every character; which one you have active is per save slot.

**Photo mode:** press `P` to freeze the whole world mid-action. The HUD
slips away, the camera comes off its leash (`WASD` to move, `R`/`F` for
height, `Shift` to hurry, mouse to orbit), and `Enter` saves a PNG of your
shot. Press `P` again to jump back into the fray exactly where it left off.

**Boats:** drop a **Boat** (Props) onto or beside water, hop in, and sail —
it rides the surface of any pool so you can cross deep water without
swimming. `WASD` steers, `Space` hops out. Beach it on dry land and it
just sits there.

**Keys & locks:** drop a **Key** (Pickups) and a **Lock** barrier (Props),
give them the same color, and the lock stays shut until you've grabbed the
key — then walking into it opens the way (the key is used up). Wire several
keys and locks by color for a proper dungeon.

**Hazards:** drop a **Hazard** zone (Logic) over lava, spikes, or a pit —
it hurts the player while they stand in it (a well-timed **Dodge** roll
gets you through unscathed). Pair it with a **Checkpoint** so a misstep
costs a stretch, not the whole level.

**Teleporters:** drop two **Teleport** pads (Logic) and wire one's *Teleport
To* to the other's *Link Target* — step on the first and you blink to the
second. Wire it both ways for a two-way portal, or many pads into a hub:
instant shortcuts, secret rooms, and puzzle warps.

**Checkpoints:** place a **Checkpoint** flag (Logic) in your level and
walk into it — its flag raises and it becomes your respawn point, so
dying sends you back there instead of all the way to the start. Touch a
later one and it takes over. Great for long platformers and dungeons.

**Sentry turrets:** drop an **en_turret** (Enemies) into a world for a
stationary gunner — it swivels to track you and fires when you're in
range (mind the walls, and your Block/Dodge). Destroy it and it fires a
*Turret Destroyed* event you can wire to a door or a counter.

**Logic gates:** the **Gate** toy (Logic) combines wired signals — set it
to **AND** (opens only when all its inputs are on, e.g. two pressure
plates), **OR** (any input), or **NOT** (a switch that inverts). Wire
triggers, counters, or chests into it and its *Opens*/*Closes* events into
doors, spawners, or cameras to build real puzzles.

**Floating props:** drop a **Barrel** or **Crate** (Props) onto a pool and
it bobs on the surface instead of sinking — scatter a few for a river
crossing or a dockside scene. On dry land they just sit there.

**Treasure:** drop a **Chest** (Props) into your world for a pixel payout —
walk up to it and the lid pops open, spilling coins that fly to you. Set
its reward (10–100 pixels) in the object parameters, or wire its *Open*
input to a switch or a cleared room, and its *Opened* event to whatever
comes next. A great capstone for a dungeon.

**Climbing:** place a **Ladder** (Props) against a ledge and hold `W` at
its base to climb — you'll rise steadily up the rungs and step off at the
top; `S` climbs back down. Perfect for reaching platforms without a jump
puzzle.

**Water:** place **Water** blocks (Terrain) to build pools, moats, and
lakes — they're translucent volumes you fall into. Underwater you sink
gently, move slower, and **hold `Space` to swim up**; you'll tread just
under the surface, and stacked water blocks make genuinely deep pools.

**Traversal toys:** the **Trampoline** (Terrain) launches you sky-high when
you land on it — set its bounce power in its options. The **Grind Rail**
(Props) carries you hands-free: wire its *Rail Path* to a chain of path
nodes in the Wiring view, then just step onto the rail head and enjoy the
ride. Both fire wiring events (*Bounced*, *Grind Started/Ended*) so courses
can react to your moves.

**Flying:** the **Sky-Wing** (Props) is a glider you board like any vehicle.
Build speed with `W`, then **hold `Space`** to climb — release it and you
glide, sinking gently as long as you keep your airspeed. Bank into turns,
mind your speed (slow too much and you stall), and press `C` to bail out.
The Sky-Wing has **guns** too (`F`/left-click) — go dogfight the flyers.
For something to fly *through*, place **Rings** (Logic) in the sky — they
flash as you pass and fire a *Flown Through* event, so wiring four of them
into a **Race** controller (start, checkpoints, finish) builds a whole
aerial time-trial. Rings notice your kart and Sky-Wing too, not just you.

**Villagers:** place **Villagers** (Props) to give your world a
neighborhood — they wander near home, and when you walk up they stop,
turn to you, and say something (pick their mood in the options: friendly,
mysterious, grumpy, or heroic). Every greeting fires a *Talked To* wiring
event, so a Quest set to a few steps becomes a classic "talk to everyone
in town" errand.

**Companions:** place a **Recruit** (Props) and walk up to them — a
conversation opens. Talk, ask questions, and if you like them, hire them:
Fern joins for free, Rusty and Lumen charge pixels. Hired companions walk
at your side wherever you go, they belong to your **progression slot** (each
character keeps their own crew), and they come right back whenever you load
that slot and enter a world. Talk to their recruit spot again to part ways.

**Online co-op:** main menu → **Online Co-op**. The host picks *create
invite code* (it lands on the clipboard), sends it to a friend over any
chat, and the friend picks *join* and pastes it — their answer code goes
back the same way, the host pastes it, and the link opens. No servers, no
accounts: just two codes traded. The host's world crosses the link, the
guest lands right in it, each player sees the other as a glowing ghost —
and **you build together**: anything either of you places or removes
appears and vanishes on the other side, live — wiring included, so you
can build a contraption together. If the link drops, the Online screen
says so: trade fresh codes and the host's world comes right back across.
The host can invite **several friends** (create one invite code per
person) — everyone sees everyone as differently-tinted ghosts wearing **name
tags**, and everyone's edits reach everyone.

**Couch co-op — up to four players:** press `B` — or press any button on a
**second, third, or fourth gamepad** — and a friendly figure (green, orange,
then violet) drops in beside you; when the party is full, `B` sends everyone
home. The screen splits into halves, then quadrants, as players spread out. Player 2 moves with their
left stick, jumps with `A` (hold), and swings melee with `X`. Enemies hunt
whichever of you is **closer**, and player 2 has their own health: at zero
they slump for a few seconds (enemies lose interest) and pop back up at half.
Falls teleport them back to your side, the camera widens when you split up —
and if you wander really far apart, the screen **splits in two** (your HUD
stays on your side) and merges back when you reunite. Dying together respawns
you together. Triggers and pickups still only answer to player 1.

**Gamepad:** full pad play is supported. The **left stick** moves, the
**right stick** orbits the camera, and **A** jumps (hold to glide, tap again
mid-air to double-jump). `X` or the left trigger swings melee, the right
bumper/trigger shoots, `B` dodge-rolls, `Y` fires your figure's special,
holding `LB` blocks, and clicking the right stick toggles lock-on.

### Survival

A brand-new sandbox starts **empty and peaceful** — no enemies spawn on their
own. Enemies appear only from things you place: drop an `en_blob` enemy, or a
**Spawner** (Logic category) configured to produce neon **TRON-style enemies**.
There are flying polyhedra (melee) and **bipedal walkers** that fall and walk on
the terrain (using the same gravity as the player) and attack with both melee
and ranged neon shots. Attack them with `F` before they wear down your health
bar (top-left); if your health hits zero you respawn. Every figure fights
differently: each has a signature `V` special AND their own melee combo —
Volt snaps a quick two-hit chain that fires a free bolt, Blaze pressures
through four hits, Frost's finisher freezes the crowd, and the Play Set
heroes bring finishers of their own.

For a real showdown, place a **Boss** (Enemies category): a crowned titan
with three phases — it stomps, then adds ranged volleys, then flies into a
shockwave-slamming rage as its health falls. Its aura shifts violet → orange
→ red so you always know how angry it is, and beating it pays a hefty pixel
and XP bounty. Builders: the boss fires *Phase 2 / Phase 3 / Defeated*
wiring events and takes a *Reset Fight* input, so you can choreograph whole
arenas around it — spawn adds mid-fight, open the loot room on victory.

### Levelling up

Defeating enemies also grants **XP**. Your character levels up (to level 20,
shown top-left with an XP bar): each level adds max HP, and every 5 levels
adds +1 melee damage. Progress persists between sessions, like pixels.

Every level-up also grants a **skill point**. Press `Esc` → **Skills** to spend
points on four skills: **Vitality** (+10 max HP per rank), **Power** (+1 melee
damage), **Trigger** (faster ranged fire), and **Agility** (shorter dodge
cooldown). Skill ranks are per-figure, persist like XP, and can be reset for
free at any time from the same screen.

### The Collection (figures)

The **Collection** screen (main menu, or `Esc` → Collection in game) is your
figure roster. Figures are colorways of the avatar with their own stat leans —
Scout (balanced, free), Blaze (+1 melee), Frost (+25 max HP), and Volt (faster
ranged fire) — bought à la carte with pixels. Each figure also has a
**signature special** on `V` (about a 5-second cooldown): Scout's
**Shockwave** blasts and launches everything around you, Blaze's **Flame
Arc** is one heavy frontal strike, Frost's **Nova** freezes nearby enemies in
place, and Volt's **Chain Bolt** fires a fan of five shots. Each figure **levels up
independently**: switch figures and you switch to that figure's saved
level and XP. The HUD badge shows who you're playing and their level.

### Sidekicks

The Collection screen also lists **sidekicks** — small companions you adopt
with pixels (Wisp, Pebble, or Spark). One follows you at a time, hovering at
your shoulder. Your sidekick earns **half of every XP drop** you collect and
levels up on its own curve (to level 10); each of its levels adds **+2 max
HP** to you while it follows. Impatient? **Feed it** from the Collection
screen — glowberries are the good stuff (1 food → 15 XP), with a 10-pixel
snack as the fallback. Grow glowberries on a **Farm Plot** (Props): crops
ripen on a timer, turn gold, and you harvest by walking over them (they
replant themselves by default). Plots fire a *Harvested* wiring event, so a
farm can drive counters and quests too.

Food also crafts **sidekick gear** in the **Sidekick Care** screen
(Collection → 8): a Tiny Top Hat (+2 aura HP), a Silver Bell (their XP share
rounds up), and a Micro Cape (heartier meals). One hat and one trinket per
sidekick, each keeps its own outfit, and the accessories show on the little
companion itself. Each sidekick keeps its own progress, and
re-selecting the active one sends it home for a while.

### Power Discs

The Collection screen also opens your **Power Discs** (`9` from the roster) —
buyable buff tokens that work with **any** figure: Ember Sigil (+1 melee),
Aegis Shell (+20 max HP), Swift Coil (faster dodge), Fortune Prism (+25%
pixels), and Sage Lens (+25% XP). You can equip **two at once**, and two
different discs stack — pick a pair that fits your build. Discs persist like
pixels and follow you across figure switches.

Below the round discs live the **hex discs** — world themes that recolor the
sky and terrain everywhere: Classic Meadow (free), Midnight Vale, Emberfall,
and Verdant Haze. One is active at a time; pick a mood for your sandbox.

### Pixels & the Shop

Defeated enemies burst into **pixels** — tiny multi-coloured cubes that fly to
you and are added to your pixel count (shown top-right). Spend pixels in the
**Shop** (`Esc` → Shop) to unlock premium objects. Objects you don't own can
still appear and work in a world in play mode, but they're locked in build mode
(shown with a price in the object bar) until you buy them.

The shop also sells **packs** — bundles of figures and premium objects at a
discount (the listing shows how much you save): the **Hero Pack** (all three
premium figures) and themed **Play Sets** that pair a figure with matching
objects. Buying a pack grants everything in it you don't already own, and a
pack shows as owned once you have all its contents, however you got them.

### Sound

Every gameplay event plays a **recorded sound effect** from the pack under
`assets/sounds/` (loaded in the background after your first input). Footsteps
change with the surface underfoot: grass, dirt, sand, snow, wooden props,
stone, carpet, and metal platforms — terrain blocks even sound different per
face (walk on a block's grassy top vs. a dirt side turned upward). Jumping,
double-jumping, landing, gliding, every attack and hit, pickups, level-ups,
purchases, and the build/wiring tools all have their own effects, with slight
random variation so repeats sound natural. If a sample hasn't loaded yet (or
fails to), a **synthesised Web Audio fallback** covers it seamlessly. Press
`M` to mute or unmute (the setting is remembered).

The **Chime** logic toy (`l_chime`) is a separate, placeable instrument: wire
any event into it and it sings a configured pattern (jingle, alarm, gong,
powerup), so a door can ring a gong or a quest can play a fanfare.

## Contributing

Contributions in the form of source code, content, documentation, and example levels are welcome!

Please see [docs/contributing.md](docs/contributing.md) for details on required contributor agreements and other procedures.


## Code of Conduct
For details on our code of conduct, please see [docs/conduct.md](docs/conduct.md). All contributors are required to agree to the Code of Conduct Pledge as described in [docs/contributing.md](docs/contributing.md).
