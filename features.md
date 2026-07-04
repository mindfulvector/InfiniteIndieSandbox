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
| Drivable ground vehicles (cars, bikes, tanks) | ⬜ | |
| Flyable aircraft / dogfighting | ⬜ | |
| Ridable mounts | ⬜ | |
| Climbing / jumping / double-jump / gliding / character traversal | 🟡 | Jump, double jump, and hold-to-glide (`test-traversal.js`); slope/step handling via CharacterController; climbing/swinging planned |
| Grind rails, trampolines, traversal toys | ⬜ | |

### Multiplayer
| Feature | Status | Notes |
|---|---|---|
| 2P local split-screen campaigns (4P brawler) | ⬜ | |
| Up to 4P Sandbox (local + online) | ⬜ | |
| Drop-in/drop-out co-op | ⬜ | |

### Digital figures and collection
| Feature | Status | Notes |
|---|---|---|
| Purchasable figure packs / à la carte | ✅ | Figures purchasable à la carte with pixels (`test-collection.js`); shop packs bundle figures + premium objects at a discount (Hero Pack, Winter/Neon Play Sets) — flat price grants all missing contents, ownership derived from contents (`test-figure-packs.js`) |
| Collection screen as roster (select + spawn any owned figure) | ✅ | Collection menu (main + pause): 4 figures with colorways + stat leans; selecting applies live (`test-collection.js`) |
| Per-figure progress saved to account | ✅ | Level/XP persisted per figure; switching figures swaps progression (`test-collection.js`) |
| Round power discs (abilities/buffs) | ⬜ | |
| Hex discs (vehicles, gadgets, skies/terrain) | ⬜ | |
| Multiple discs stack/combine | ⬜ | |

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
| Path/track creation (races, patrols, moving platforms) | ✅ | `l_pathnode` waypoints chain via wires; `pr_platform_moving` follows the chain dt-based; `en_blob` patrols a wired chain (`test-paths.js`); `l_race` packages start gate + distinct-checkpoint tracking + finish line with a HUD stopwatch, `finished`/`record` outputs and session best (`test-races.js`) |
| AI builder assistants | ⬜ | |
| Templates / starter worlds | ✅ | New Game picker: Rolling Hills / Flat Plane / Arena / Floating Islands (`test-progression.js`) / Sandbox Hub challenge park (`test-hub.js`) |
| Unlockable toys through play | ✅ | Pixels earned from enemies buy locked objects in the shop (`test-shop-gating.js`) |

### The Sandbox Hub
| Feature | Status | Notes |
|---|---|---|
| Central hub world with zones/quests/challenges | 🟡 | New Game template 5 "Sandbox Hub": central plaza + 4 pre-wired zones — Combat Yard (trigger→spawner+camera cut), Star Climb (4 stars→counter→scoreboard), The Crossing (ping-pong ferry over a gap + patrolling guard), Homestead (room-kit house + sliding door + cell door) (`test-hub.js`); quest chains/rewards planned |

### Sidekicks
| Feature | Status | Notes |
|---|---|---|
| Collectible sidekicks that follow/level/feed/equip | ⬜ | |
| Crop farming for sidekick food | ⬜ | |

### Sandbox Expansion Games
| Feature | Status | Notes |
|---|---|---|
| Kart racing expansion | ⬜ | |
| Co-op dungeon-crawl expansion | 🟡 | Enemy waves/loot core exists (EnemyManager waves, pixel loot); packaging planned |

### Community features
| Feature | Status | Notes |
|---|---|---|
| Saving multiple Sandbox worlds locally | ✅ | 9 save slots, transforms/params/wires persist (`test-save-load.js`) |
| Upload + share creations online | ⬜ | |
| Browse/rate/download community worlds | ⬜ | |
| Featured/curated rotations | ⬜ | |

## Engine / platform underpinnings (not on the public list)
| Feature | Status | Notes |
|---|---|---|
| Linux/CI test harness (headless, screenshots, frame sampling) | ✅ | `test/harness.js`, 16+ suites, GitHub Actions CI |
| Gamepad bindings (attack actions) | 🟡 | Melee/ranged/dodge (Y) buttons + hold-LB block mapped; movement + full abstraction planned |
| In-game economy (pixels) | ✅ | Earn from enemies, spend in shop, persists |

## Next up (suggested order)
1. Round power discs (abilities/buffs)
2. Hub quest chains (multi-step goals with rewards)
3. Best-time persistence for races (per save slot)
4. Gamepad movement + full input abstraction
