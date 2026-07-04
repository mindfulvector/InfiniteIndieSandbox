# Infinite Indie Sandbox — Feature Tracker

Status legend: ✅ done · 🟡 partial · 🔨 in progress · ⬜ planned

Every ✅/🟡 item is covered by the harness test suite (`npm test`) unless noted.

## Gameplay Features

### Story Campaigns (Play Sets)
| Feature | Status | Notes |
|---|---|---|
| Standalone purchasable campaign modules (themed universes) | ⬜ | Economy + purchase gating exists (pixels/shop) to build on |
| Action-adventure / puzzle-platformer / arena-brawler campaign types | ⬜ | |
| Characters locked to campaign, usable in Sandbox | ⬜ | |
| Mission-based progression (story/side missions, collectibles) | 🟡 | Collectible stars exist in the Sandbox; no mission structure yet |

### Combat and character systems
| Feature | Status | Notes |
|---|---|---|
| Melee combat with combo chains | ✅ | 3-hit chain; finisher deals bonus damage; swings only strike a frontal arc (player and walkers alike) (`test-combat-combo.js`) |
| Aerial juggling, blocking, dodging | ✅ | Hold `G` (pad LB) to block — negates damage from the frontal arc, shield visual; tap `C` (pad Y) to dodge-roll — i-frames + burst move (`test-blocking.js`); `R` launcher knocks enemies airborne (walkers via GravityBody velocity + stun, flyers via ballistic pop), airborne hits deal +1 and re-pop, juggle counter + toast (`test-juggling.js`) |
| Ranged combat with aimable projectiles | ✅ | Right-click fires at cursor; projectile from hand (`test-ranged-attack.js`) |
| Lock-on targeting | ✅ | `T` toggles lock-on to nearest enemy; marker + auto-aim (`test-combat-combo.js`) |
| Character-specific movesets / special attacks / super moves | 🟡 | Every figure has a signature `V` special on a 5s cooldown: Scout Shockwave (360° launch), Blaze Flame Arc (heavy frontal), Frost Nova (chills enemies — rooted + attack-less, new `chill` mechanic), Volt Chain Bolt (5-bolt fan) (`test-specials.js`); full per-figure movesets planned |
| Avatar animation (locomotion clips + idle) | ✅ | Authored walk/run/jump/strafe clips via the character controller; procedural breathing idle replaces the rig's frozen 2-frame idle range (`test-idle-animation.js`) |
| Character leveling (to 20) with skill trees | ✅ | XP from defeating enemies, level 1–20 persisted, +5 max HP/level, +1 melee dmg per 5 levels, HUD badge + XP bar (`test-progression.js`); skill tree: 1 point per level-up (derived from level), 4 skills (Vitality/Power/Trigger/Agility) with flat ranks, per-figure persistence, free respec, Esc→Skills menu (`test-skill-tree.js`) |
| Health + respawn | ✅ | HP bar, hurt cooldown, respawn at spawn point; respawn is deferred to the next frame so dying mid-combat can't crash the enemy loops (`test-death.js`) |
| Pickups: health, currency, collectibles | ✅ | `pk_health`, `pk_pixels`, `pk_star` placeable objects (`test-pickups.js`) |

### Vehicles and traversal
| Feature | Status | Notes |
|---|---|---|
| Drivable ground vehicles (cars, bikes, tanks) | 🟡 | `pr_kart` hover-kart (premium, 60 px): walk-up mount stops the CharacterController, momentum driving on the shared GravityBody (throttle/drag/speed-scaled steering, WASD or left stick), Space dismounts, respawn parks it home, mid-drive saves store the parked spot (`test-vehicles.js`); more vehicle types planned |
| Flyable aircraft / dogfighting | ⬜ | |
| Ridable mounts | ⬜ | |
| Climbing / jumping / double-jump / gliding / character traversal | 🟡 | Jump, double jump, and hold-to-glide (`test-traversal.js`); slope/step handling via CharacterController; climbing/swinging planned |
| Grind rails, trampolines, traversal toys | ⬜ | |

### Multiplayer
| Feature | Status | Notes |
|---|---|---|
| 2P local split-screen campaigns (4P brawler) | ⬜ | |
| Up to 4P Sandbox (local + online) | ⬜ | |
| Drop-in/drop-out co-op | ✅ | Drop-in buddy: `B` or any second-pad button joins; stick/A/X drive move/jump/melee; enemies hunt the NEAREST player (flyers, walker melee, projectiles all route via `combatTargets`/`damageTarget`), buddy has 60 HP with a downed-then-revive-at-half cycle (out of targeting while down), falls auto-rescue, respawn restores it, and the camera widens to frame both players (`test-coop.js`); full P2 figure avatar planned |

### Digital figures and collection
| Feature | Status | Notes |
|---|---|---|
| Purchasable figure packs / à la carte | ✅ | Figures purchasable à la carte with pixels (`test-collection.js`); shop packs bundle figures + premium objects at a discount (Hero Pack, Winter/Neon Play Sets) — flat price grants all missing contents, ownership derived from contents (`test-figure-packs.js`) |
| Collection screen as roster (select + spawn any owned figure) | ✅ | Collection menu (main + pause): 4 figures with colorways + stat leans; selecting applies live (`test-collection.js`) |
| Per-figure progress saved to account | ✅ | Level/XP persisted per figure; switching figures swaps progression (`test-collection.js`) |
| Round power discs (abilities/buffs) | ✅ | 5 buyable discs (Ember +1 melee, Aegis +20 HP, Swift faster dodge, Fortune +25% pixels, Sage +25% XP), 2 equip slots, global across figures, persisted; Discs screen via Collection → 9 (`test-discs.js`) |
| Hex discs (vehicles, gadgets, skies/terrain) | 🟡 | Sky/terrain theme hexes: Classic (free) / Midnight Vale / Emberfall / Verdant Haze — one active, swaps `scene.clearColor` + tints the shared terrain atlas, persists, Discs-screen rows (`test-hex-discs.js`); vehicle/gadget hexes planned |
| Multiple discs stack/combine | ✅ | Two different equipped discs both apply (Ember + Aegis verified stacking in `test-discs.js`) |

## Sandbox Features

### Creation tools
| Feature | Status | Notes |
|---|---|---|
| Open building mode with placeable objects | ✅ | Object browser w/ runtime thumbnails, categories, arrow-key cycling |
| Magic-wand: place / move / rotate / scale / link / delete | ✅ | Cursor select+grab, R/V raise, Z/C rotate, [/] scale, wiring view links, Delete |
| Terrain sculpting with block terrain, themes | 🟡 | Block tiles w/ top-snap anchor + rolling default grid; more themes planned |
| Logic toys: triggers | ✅ | `l_trigger` volumes fire enter/exit events (`test-wiring.js`) |
| Logic toys: spawners | ✅ | `l_spawner` w/ enemy type / frequency / limit params (`test-spawner.js`) |
| Logic toys: counters | ✅ | `l_counter` — increment/decrement/reset inputs, reached/changed outputs (`test-logic-toys.js`) |
| Logic toys: timers | ✅ | `l_timer` — start/stop/reset inputs, tick output, interval/repeat params (`test-logic-toys.js`) |
| Logic toys: scoreboards | ✅ | `l_scoreboard` — add/subtract/reset inputs, HUD score display, edge-triggered `reached` output (`test-progression.js`) |
| Logic toys: cameras | ✅ | `l_camera` — wires cut the view to it for N seconds (player-tracking or fixed shot), `started`/`finished` outputs chain cinematics (`test-camera-toy.js`) |
| Event wiring between logic toys | ✅ | Overhead 3D wiring view; wires persist in saves (`test-wiring.js`) |
| Interiors (rooms, doors, decoration) | ✅ | INTERIOR category room kit (`in_wall`, `in_wall_door`, `in_wall_window`, `in_floor` — walls block shots, openings pass), wirable sliding door (`pr_door`), furniture (`d_table/chair/lamp/rug`), multi-prim manifest support (`test-interiors.js`); pocket-interior cell door (`pr_door_cell`: walk in → teleport to a themed room built from raw meshes, exit pad returns, outdoor enemies freeze, entered/exited wiring events, dollhouse camera) (`test-interior-cells.js`) |
| Path/track creation (races, patrols, moving platforms) | ✅ | `l_pathnode` waypoints chain via wires; `pr_platform_moving` follows the chain dt-based; `en_blob` patrols a wired chain (`test-paths.js`); `l_race` packages start gate + distinct-checkpoint tracking + finish line with a HUD stopwatch, `finished`/`record` outputs; best times persist per save slot via `params.bestTime` (`test-races.js`) |
| AI builder assistants | ⬜ | |
| Templates / starter worlds | ✅ | New Game picker: Rolling Hills / Flat Plane / Arena / Floating Islands (`test-progression.js`) / Sandbox Hub challenge park (`test-hub.js`) |
| Unlockable toys through play | ✅ | Pixels earned from enemies buy locked objects in the shop (`test-shop-gating.js`) |

### The Sandbox Hub
| Feature | Status | Notes |
|---|---|---|
| Central hub world with zones/quests/challenges | ✅ | New Game template 5 "Sandbox Hub": central plaza + 4 pre-wired zones — Combat Yard (trigger→spawner+camera cut), Star Climb (4 stars→counter→scoreboard), The Crossing (ping-pong ferry + patrolling guard), Homestead (room kit + sliding door + cell door) (`test-hub.js`); `l_quest` quest toy — distinct wired steps, once-per-run completion with a pixel reward, hub ships a 3-step "Tour the Park" quest (`test-quests.js`) |

### Sidekicks
| Feature | Status | Notes |
|---|---|---|
| Collectible sidekicks that follow/level/feed/equip | ✅ | 3 adoptable sidekicks, hover-follow, half-share XP leveling + feeding, +2 max HP aura per level (`test-sidekicks.js`); gear crafted from farmed food (Top Hat +2 HP, Bell rounds XP share up, Cape +5 meal XP) worn per-sidekick in hat/trinket slots with visible accessories, managed on the Sidekick Care screen (`test-sidekick-gear.js`) |
| Crop farming for sidekick food | ✅ | `pr_plot` grows glowberries dt-based (growTime/autoReplant params, per-instance crop material, green→gold stages); walking over a ripe plot harvests +2 food and fires a wirable `harvested`; food is the premium sidekick meal (1 → 15 XP, pixel fallback), persisted (`test-farming.js`) |

### Sandbox Expansion Games
| Feature | Status | Notes |
|---|---|---|
| Kart racing expansion | 🟡 | Kart + triggers + `l_race` compose into lap racing with no new engine systems: while driving, the VEHICLE trips triggers, and the "Glow Circuit" gallery world wires its gate to finish-then-start so every crossing closes a lap and arms the next (`test-kart-racing.js`); multi-kart AI opponents planned |
| Co-op dungeon-crawl expansion | 🟡 | Enemy waves/loot core exists (EnemyManager waves, pixel loot); packaging planned |

### Community features
| Feature | Status | Notes |
|---|---|---|
| Saving multiple Sandbox worlds locally | ✅ | 9 save slots, transforms/params/wires persist (`test-save-load.js`) |
| Upload + share creations online | 🟡 | Serverless sharing via world files: main menu → Share Worlds exports the current world as a versioned `.json` (same snapshot as save slots) and imports validate format/version, rejecting bad files without touching the world; unknown object types skip gracefully (`test-share.js`); online gallery planned |
| Browse/rate/download community worlds | 🟡 | Gallery browsing on the Share screen: `assets/worlds/index.json` catalog fetched over HTTP, one-digit import into build mode, plus `importWorldFromUrl` for arbitrary links; ships Starter Parkour + Tiny Arena (`test-gallery.js`); remote gallery + ratings planned |
| Featured/curated rotations | ⬜ | |

## Engine / platform underpinnings (not on the public list)
| Feature | Status | Notes |
|---|---|---|
| Linux/CI test harness (headless, screenshots, frame sampling) | ✅ | `test/harness.js`, 16+ suites, GitHub Actions CI |
| Gamepad bindings (attack actions) | ✅ | Declarative `PAD_MAP` behind one `handlePadButton` entry point: A hold = jump/glide, X/LT melee, B dodge, Y special, RB/RT ranged, LB hold block, right-stick click lock-on; left stick drives movement through the controller's real key handlers (8-way + hysteresis), right stick orbits the camera; `app.testPad` harness hook (`test-gamepad.js`) |
| In-game economy (pixels) | ✅ | Earn from enemies, spend in shop, persists |

## Next up (suggested order)
1. Featured/curated gallery rotations
2. Split-screen exploration (second camera viewport)
3. Kart AI opponents (ghost karts on path chains)
4. Play Set campaign packaging (mission chains in a gallery world)
