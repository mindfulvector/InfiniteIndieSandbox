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
| Melee combat with combo chains | ✅ | 3-hit chain; finisher deals bonus damage (`test-combat-combo.js`) |
| Aerial juggling, blocking, dodging | ⬜ | |
| Ranged combat with aimable projectiles | ✅ | Right-click fires at cursor; projectile from hand (`test-ranged-attack.js`) |
| Lock-on targeting | ✅ | `T` toggles lock-on to nearest enemy; marker + auto-aim (`test-combat-combo.js`) |
| Character-specific movesets / special attacks / super moves | ⬜ | Single starter avatar today |
| Character leveling (to 20) with skill trees | 🟡 | XP from defeating enemies, level 1–20 persisted, +5 max HP/level, +1 melee dmg per 5 levels, HUD badge + XP bar (`test-progression.js`); skill trees planned |
| Health + respawn | ✅ | HP bar, hurt cooldown, respawn at spawn point |
| Pickups: health, currency, collectibles | ✅ | `pk_health`, `pk_pixels`, `pk_star` placeable objects (`test-pickups.js`) |

### Vehicles and traversal
| Feature | Status | Notes |
|---|---|---|
| Drivable ground vehicles (cars, bikes, tanks) | ⬜ | |
| Flyable aircraft / dogfighting | ⬜ | |
| Ridable mounts | ⬜ | |
| Climbing / jumping / double-jump / gliding / character traversal | 🟡 | Jump + slope/step handling via CharacterController; rest planned |
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
| Purchasable figure packs / à la carte | 🟡 | Shop sells premium *objects* with pixels; figures planned |
| Collection screen as roster (select + spawn any owned figure) | ⬜ | |
| Per-figure progress saved to account | ⬜ | |
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
| Logic toys: cameras | ⬜ | Last of the logic family |
| Event wiring between logic toys | ✅ | Overhead 3D wiring view; wires persist in saves (`test-wiring.js`) |
| Interiors (rooms, doors, decoration) | ⬜ | |
| Path/track creation (races, patrols, moving platforms) | ⬜ | |
| AI builder assistants | ⬜ | |
| Templates / starter worlds | ✅ | New Game picker: Rolling Hills / Flat Plane / Arena / Floating Islands (`test-progression.js`) |
| Unlockable toys through play | ✅ | Pixels earned from enemies buy locked objects in the shop (`test-shop-gating.js`) |

### The Sandbox Hub
| Feature | Status | Notes |
|---|---|---|
| Central hub world with zones/quests/challenges | ⬜ | |

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
| Gamepad bindings (attack actions) | 🟡 | Melee/ranged buttons mapped; movement + full abstraction planned |
| In-game economy (pixels) | ✅ | Earn from enemies, spend in shop, persists |

## Next up (suggested order)
1. Avatar animation wiring (idle/walk/run clips — avatar is currently a static pose)
2. Collection/roster screen groundwork (figure definitions, owned set)
3. Camera logic toy (completes the wiring family)
4. Double-jump + glide traversal
5. Blocking/dodging in melee combat
6. Skill tree for spending level-ups
7. Interiors (rooms, doors, decoration)
