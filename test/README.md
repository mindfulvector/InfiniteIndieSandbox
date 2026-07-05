# Infinite Indie Sandbox — Linux Test Harness

A headless test harness for driving the game on Linux, exercising real gameplay
through the same `window.app` object and keyboard events a player uses, and
capturing screenshots so features can be verified both **assertively** (against
game state) and **visually** (PNG screenshots).

It boots the actual game: the project's `php -S` dev server serves the files,
and Playwright drives a headless Chromium with WebGL forced through ANGLE /
SwiftShader (software rendering), so it runs on a plain Linux box / CI container
with no GPU.

## What's here

| File | Purpose |
|------|---------|
| `harness.js` | Reusable `GameHarness` class: starts the PHP server, launches Chromium, waits for the game to be ready, and provides input / state / screenshot helpers. |
| `test-boss-arena.js` | Nightfall Crown, played end to end: the arena imports fully wired (boss→spawner/camera/door/quest, sun→spawner, gate→camera/quest), the vault blocks pre-fight while the sun keeps the clock, the gate completes Q1 and steps Q2, phase 2 musters adds through the wired spawner, victory opens the vault and pays Q2 + scoreboard, and the loot stars collect. |
| `test-powerup.js` | The pk_powerup timed buff: registers with PowerUpScript + a collected output, a 'power' pickup doubles melee damage while active then fades to normal, a 'shield' pickup negates incoming damage then damage lands after it fades, and respawn clears the buff while a play reset restores the pickup. |
| `test-bomber.js` | The en_bomber kamikaze enemy: registers isEnemy + a detonated output, chases the player (closes distance), detonates on contact dealing blast damage to a nearby player then hides (fires detonated), a range-kill detonates harmlessly, a dodge roll survives the blast, and a play reset re-arms it. |
| `test-mender.js` | The en_mender support-healer enemy: registers isEnemy + a mended output, heals the nearest wounded ally over time (fires mended) capped at the ally's maxHp, never heals a full ally / itself / one out of range, and melee defeats it (drops from the world) after which the ally stops being healed. |
| `test-shielder.js` | The en_shielder flanking enemy: registers isEnemy + blocksHit + a flanked output, blocksHit blocks a frontal attacker and lets a rear one through (fires flanked), a frontal melee swing does no damage (clangs) while a rear swing lands, the shield turns slowly toward the player (eases, not snaps), and enough rear hits defeat it. |
| `test-charger.js` | The en_charger dash enemy: registers isEnemy + a charged output, idles out of range then winds up and dashes when the player is near (moving a real distance, firing `charged`), the charge damages the player on contact, a dodge's i-frames pass through it unharmed, and melee defeats it. |
| `test-breakable.js` | The t_breakable destructible block: registers isEnemy+isBreakable and solid, melee whittles its hp (toughness respected) then breaks it intangible + fires `broken` (not disposed), lock-on/auto-aim ignore it, a wired break force-smashes it, and a play reset rebuilds it solid at full hp. |
| `test-turret.js` | The en_turret sentry: registers as an attackable enemy with a `defeated` output, yaw-tracks and fires enemy projectiles at an in-range player (holding fire when out of range), is defeated by melee into a resettable hide (loot XP + fires `defeated`, not disposed), and re-arms on a play reset. |
| `test-boat.js` | The pr_boat watercraft: registers with BoatScript and a `watercraft` profile, walk-up mounts, and while driven over a water pool RIDES the surface (Y eases to the water top minus draft, steady, not sinking, reusing waterTopAt) and Space dismounts. |
| `test-boss.js` | The multi-phase boss: rigs itself (GravityBody, collision-free children, phase aura) and stomps at the player, real melee arcs damage it through the shared isEnemy plumbing, phase 2 fires its wired edge + volleys (sighted in-page — they cross and despawn in milliseconds), phase 3 fires + shockwaves land, defeat pays out and hides WITHOUT disposal, and a play reset re-arms the fight with the edges firing again. |
| `test-groupmove.js` | Build-mode group move: grabbing a 3-object selection makes one the moving anchor and records the other two as followers with correct offsets (all off the undo stack), the followers track the anchor as it moves (offsets preserved), dropping re-registers all three and clears the group, and a single grab still moves just one. |
| `test-multiselect.js` | Build-mode multi-select: shift-click toggles objects into and out of a multi-selection, deleting a 3-object selection removes all three (one undo restores all), F on a 2-object selection duplicates both and selects the copies without grabbing, and a single-object F still grabs a copy to move. |
| `test-redo.js` | Build-mode redo (pairs with undo): delete→undo restores and arms the redo trail, redo (Y) re-removes exactly what undo brought back and re-arms the undo stack, undo after redo restores again (symmetric round-trip), a fresh deletion clears the redo trail, and an empty redo is a harmless no-op. |
| `test-undo.js` | Build-mode undo (U): deleting the last placed object then U restores it with params/rotation/wires intact and collidable, deleting a 3-object selection and undoing restores all three, and undo on an empty history is a safe no-op. |
| `test-duplicate.js` | Build-mode duplicate (F): with an object selected, F creates a grabbed copy of the same type carrying its rotation/scale/params (but not its wires), offset from the original; dropping it commits a second instance; and editing the copy's params leaves the original untouched (deep copy). |
| `test-build-ux.js` | The selection overhaul: the left sidebar lists the browsed category and a row click selects that object, Shift+Space opens the highlighted object's properties, a real mouse tap selects a placed object in cursor mode, and in the wiring view tapping an object opens its inspector card, tapping a wire opens the wire card (highlighted) whose Delete removes exactly that wire. |
| `test-building.js` | The building-feature test: create a new sandbox and place objects in it. |
| `test-movesets.js` | Per-figure melee movesets: Scout's 1/1/3 triple, Volt's 2-hit chain firing a free bolt on the finisher, Blaze's 4-hit pressure chain (3rd swing not a finisher), Frost's chilling finisher, and Wick's launching finisher that self-juggles for the airborne +1 — with the dummy re-parked per chain because melee knockback accumulates synchronously across a burst. |
| `test-named-saves.js` | The save rework: a fresh progression slot starts with its own pixels but the shared collection, slots keep their progression across switches, worlds save under typed names from the pause path (prompt test-hooked) and load back mid-session restoring state, overwrite saves in place, and legacy numbered saves migrate to "Slot N" names. |
| `test-net-menu.js` | The Online screen: main menu item 8 opens it, hosting shares the invite code, the pasted answer reaches netFinish, joining shares the answer code (net calls stubbed — RTC itself is test-netlink's job), and a received world auto-creates the guest's world and lands them in play mode. |
| `test-netlink.js` | The online co-op spike over REAL WebRTC: a loopback peer pair opens with direct signaling (no server), the host's world snapshot crosses the wire with its object count intact, the throttled transform stream grows a ghost rig that glides to the streamed position, live edits stream (a placement crosses with a fresh local id and intact params, a deletion crosses and clears the remote map), wires stream and RESOLVE to the receiver's own copies (add + remove, echo-guarded), close() says bye and disposes the ghost, a dropped link tears down (ghost, map) and flags reconnect, mode switches never strand a frozen ghost, and a 3-player star (host hub + two guests over pipes) welcomes distinct ids and relays guest traffic — transforms and edits — to the other guest, and ghosts wear tinted billboard name tags that dispose with them. |
| `test-object-browser.js` | The object-browser test: bottom bar shows a runtime thumbnail per object and click-to-select works. |
| `test-placement-consistency.js` | Verifies every object base-aligns, centres on the anchor, and stays framed by the camera. |
| `test-terrain-themes.js` | Themed terrain: sand/snow blocks register as top-snap terrain, each of the FOUR themes (sand, snow, volcanic, toxic) shares ONE procedural atlas distinct from grass and each other (instancing stays one draw call per theme), a sand platform holds the player up, and the surface underfoot maps to the theme's footstep sound. |
| `test-textures-survive-baking.js` | Regression guard: thumbnail baking must not dispose the shared textures of live objects. |
| `test-save-load.js` | A world survives save → clear → load with transforms intact and no duplicate cube. |
| `test-delete.js` | Placed objects can be removed with Delete (quick undo). |
| `test-move-object.js` | A previously-placed object can be grabbed, moved and dropped (not duplicated). |
| `test-combat.js` | Attacking defeats an enemy, which bursts pixels that home to the player and increment the count. |
| `test-enemy-management.js` | TRON enemies auto-spawn, chase the player, are defeatable for pixels, damage the player, and are cleaned up on mode exit. |
| `test-bipedal-enemy.js` | The bipedal TRON walker uses the shared GravityBody (falls/lands on terrain), walks, does melee + ranged attacks, and drops pixels. |
| `test-spawner.js` | The spawner object auto-opens a parameters popup, edits/persists its params, and spawns the chosen enemy type at its frequency up to the limit. |
| `test-rings.js` | Aerial rings: l_ring grows its torus visual, `flown` fires once per pass (hover holds, exit + re-entry re-fires), a ridden kart trips the hoop, and four rings wired start/checkpoint/checkpoint/finish run a complete race on the stock l_race machinery with an early finish refused. |
| `test-shop-gating.js` | Premium objects are locked in build mode and unlock via the shop for pixels. |
| `test-villagers.js` | Ambient NPCs: the villager rigs itself and wanders leashed near home, greeting shows the bubble and edge-fires `talked` (hover holds, leave-and-return advances the line), `say` forces a timed bubble from afar, two villagers wired into a 2-step quest complete it, and a play reset sends it home with the bubble hidden. |
| `test-water.js` | Swim volumes: water preps translucent/intangible/unpickable (shots pass), entering starts swimming (gravity 1.5, slowed walk), sinking is gentle, held Space strokes upward treading under the COLUMN surface (stacked-pool fix), and dry land restores gravity and speeds exactly. |
| `test-wiring.js` | Trigger volumes fire wired output events into a spawner's inputs (directly and on player entry), wires persist through save/load, and the overhead 3D wiring view lifts the camera, shows labelled wires + the guide panel, connects objects by drag (with the event/action chooser), and deletes wires on click. |
| `test-animation.js` | Samples the game a few frames per second to prove things move over time (not just look right in one frame): a walker closes on the player and swings its legs, pixel cubes fly to the player, and a captured filmstrip's frames actually differ. Also reports whether the player avatar's skeleton is animating. |
| `test-ranged-attack.js` | Mouse combat: a ranged attack fires a projectile from the player that travels and defeats an enemy (engaging the aim pose), right-click shoots and left-click swings melee, and the melee path still works. |
| `test-assistant.js` | The offline build assistant: unknown requests are refused with guidance, "a walled arena" builds floor+walls and wires a trigger→spawner, "...with 4 stars" makes exactly 4 stars wired counter→scoreboard, "a patrol" chains a looped path with a wired blob, a snow modifier swaps themed terrain, and the K key runs a request in build mode. |
| `test-anchor.js` | The per-object snap anchor: terrain snaps its top to the cursor (cube/floor/tile tops align into a seamless surface) while props snap their base to it, all centred on the cursor. |
| `test-photo.js` | Photo mode: P freezes the world (a hunting walker holds bit-still for 30 in-page frames) and hides the HUD, WASD dollies the free camera, Enter captures a real PNG into app.lastPhotoData (download suppressed under test), P exits with HUD/camera/motion restored, and Esc mid-photo restores the HUD through mode teardown. |
| `test-pickups.js` | Pickups: health/pixel/star collectables are collected by touch, apply their effect, animate (bob), respawn per their parameter or stay gone, and fire a `collected` wiring event that can drive spawners. |
| `test-logic-toys.js` | Counter + timer logic toys: counters gate spawners via `reached`, count math (inc/dec/reset), timers drive spawns while started and stop on `stop`/one-shot, wire self-loops are stopped by the fireEvent depth guard, and params/wires persist through save/load. |
| `test-combat-combo.js` | Melee combo chains (0→1→2 with a triple-damage finisher, window expiry resets), the frontal melee arc (a swing hits the enemy in front but not the one behind), and `T` lock-on targeting (acquires nearest, marker shown, no-arg ranged shots track the lock, auto-unlock on death, toggle off). |
| `test-origin-and-pixels.js` | Regression guards: no invisible template mesh collides at the world origin (templates are collision-stripped), and pixel-burst cubes always drain within their lifetime instead of orbiting the player forever. |
| `test-progression.js` | New Game starter-world picker (Flat/Arena/Islands layouts), XP + level-up with stat growth (max HP, level-5 melee bonus), and the scoreboard logic toy (wired points, HUD display, `reached` firing a spawner). |
| `test-idle-animation.js` | The procedural idle: standing still stops the rig's frozen 2-frame idle clip and breathes the spine/neck, movement input hands the bones back to the real locomotion clips, and idle breathing resumes afterwards. |
| `test-coop-campaign.js` | Split-screen campaign packaging: a coop:true world sets app.coopWorld and auto-joins player 2 on entry, the co-op trigger plate fires `entered` only when two party members stand inside (opening the gated vault + stepping the quest, ignoring a single player), a normal world clears the flag, and Twin Trials ships its plate + cleared-gated arena wiring. |
| `test-floaters.js` | Buoyant props: pr_barrel/pr_crate register and flag buoyant with a measured half-height, a barrel dropped over a pool eases to the surface and rides there without sinking, a settled barrel bobs, a dry-land crate is left alone, a play reset returns a drifted floater home, and the shared waterTopAt/waterSurfaceAt helper climbs a stacked pool. |
| `test-keylock.js` | The key-and-lock mechanic: pk_key + pr_lock register with the right ports, a locked barrier starts solid and ignores an approach without the key, collecting the matching key adds it to mode.keysHeld, approaching with the key unlocks (consuming it, going intangible, firing unlocked), a wrong-color key does nothing, a wired unlock force-opens, and a play reset re-locks and empties the ring. |
| `test-cannon.js` | The pr_cannon barrel: registers with CannonScript + a fired output, stepping in launches the player up and forward along the barrel's facing (firing `fired`), rotating the barrel aims the launch (yaw 90 -> +x), and a cannon on cooldown doesn't immediately re-fire. |
| `test-regen.js` | The l_regen healing zone: registers with RegenScript + healed/full outputs, a hurt player inside is healed over time (fires healed), healing caps at playerMaxHp and fires full exactly once, a player outside is not healed, and an already-full player triggers no heal events. |
| `test-crumble.js` | The t_crumble crumbling platform: registers with CrumbleScript + collapsed/reformed outputs, stays solid when unoccupied, stepping on it fuses then collapses (intangible + invisible, fires collapsed), it reforms (solid again) after the respawn delay firing reformed, and a play reset snaps it back to solid. |
| `test-sweeper.js` | The l_sweeper moving hazard: registers with SweeperScript + hurt/swept outputs, oscillates both ways along its axis (firing swept at centre), damages the player it crosses, a dodge rolls through it unharmed, and a play reset parks it home. |
| `test-conveyor.js` | The l_conveyor moving walkway: registers with ConveyorScript + a carrying output and on/off inputs, a rider on top is carried along the belt direction (east→+x) firing carrying, a player off the footprint is not carried, the direction param changes the axis (north→+z), and switching it off stops the carry. |
| `test-fan.js` | The l_fan wind/updraft zone: registers with FanScript + isFan + on/off inputs, an up fan lifts the player, an east fan pushes them sideways, leaving the volume stops the force, a wired off disables it (on re-enables), and a play reset re-enables it. |
| `test-hazard.js` | The l_hazard damage zone: registers with HazardScript + isHazard + a hurt output, standing in it drains HP on its interval and fires hurt, leaving it stops the damage, dodge i-frames roll through unharmed, and enough damage triggers the deferred respawn to the last checkpoint. |
| `test-teleport.js` | The l_teleport pad: registers with a link output + here input + used output, stepping on pad A (linked to B) whisks the player to B and fires used, the far pad does not bounce you back while the shared cooldown holds (then a two-way link teleports back), an unlinked pad does nothing, and a vehicle rider is not teleported. |
| `test-checkpoint.js` | The l_checkpoint respawn flag: registers with CheckpointScript + a reached output, touching it moves mode.spawnPoint to the flag (fires reached once, raises the flag), dying respawns AT the checkpoint (not world spawn), a second checkpoint takes over and lowers the first (one active), and a play reset keeps the active checkpoint. |
| `test-chest.js` | The treasure chest: pr_chest registers with a hinged lid, the `open` input pays the pixel reward as a homing burst and fires `opened` once, an opened chest can't be re-looted, a play reset re-arms it, an auto chest opens on walk-up (a no-auto chest ignores proximity), and a 100-pixel chest pays in full (burst capped at 30, overflow credited). |
| `test-climbing.js` | The ladder climb toy: pr_ladder registers with rails + rungs, holding W ascends with gravity suspended and hugged to the ladder line, releasing W restores gravity, climbing settles at the top (no launch), S descends, and walking away restores gravity — all sampled in-page on rise/drop conditions (not frame counts). |
| `test-collection.js` | The figure Collection: roster with the free default active, locked figures stay locked without pixels, buying unlocks + selects (colorway tint on the live avatar, stat leans apply), and level/XP progress is tracked per figure across switches. |
| `test-texture-category.js` | Every non-logic prim object has a textured surface while logic toys stay flat; wood/brick/planks/marble prims load real images from the CC0 texture pack (`assets/textures/1`, not procedural paint); the object bar shows only the current category, Down re-filters it, Left/Right cycling never leaves the category, and locked-only categories are still browsable with priced tiles. |
| `test-camera-toy.js` | The camera logic toy: a wired `activate` cuts the view to it (input paused), the cut ends after its duration and fires `finished` (wired into a counter), `release` ends early, and a trigger can drive it end-to-end. |
| `test-traversal-toys.js` | Grind rails + trampolines: the pad launches past +4 with a squash (in-page min-scale recorder) and a wired `bounced` edge, the CC's stock jump speed returns after liftoff, the rail carries the player hands-free to the end of its node chain with grindStart/grindEnd firing exactly once each, and respawning mid-grind bails to spawn cleanly. |
| `test-traversal.js` | Double jump + glide: a mid-air second press reaches clearly higher than a single jump, holding Space falls at a slow constant glide (vs. a clearly faster released fall), and landing restores the air jumps. Drives the CharacterController through its real key handlers. |
| `test-daynight.js` | The sun toy: a 2-second test day swings the light bright→dim and darkens the sky from the captured baseline (in-page min/max over one wrap), dawn/noon/dusk/midnight fire their wired marks, stop/start freeze and resume time, build mode restores the exact daylight baseline, and a play reset returns to dawn. |
| `test-dogfight.js` | Vehicle guns: the armed profile (kart + Sky-Wing armed, Strider not), the cooldown gate yielding throttled twin bolts (1 shot/10 frames, 2 each), a vehicle bolt killing a walker ahead via the player-bolt path, the Sky-Wing firing while flying (dogfighting), and the unarmed mount never firing. |
| `test-dungeon.js` | The dungeon-crawl primitive + The Deepvault: a wave spawner (wave=3) spawns its quota then stops and fires `cleared` exactly once when the room empties (re-armed by play reset), the dungeon imports with its chamber chain wired, clearing chamber 1's wave opens door 1 and steps the quest, and deposing the boss opens the loot vault and pays the scoreboard. |
| `test-death.js` | Death penalty: dying costs exactly 10% of current pixels (floored) and fully resets the run — counters/scoreboards zero, timers/spawners re-arm, collected pickups return, triggers forget the player, HP and position restore. Death happens mid-combat (live walkers + in-flight projectiles) to guard against the enemy-loop crash regression (`e.kind` / `pr.mesh` TypeErrors). |
| `test-blocking.js` | Defensive moves: holding `G` raises a guard (shield mesh shown) that negates frontal hits but not hits from behind, releasing it disposes the shield + material, a dodge roll grants i-frames and displaces the player, the dodge cooldown refuses a second roll, and the real `C` keypress path triggers a dodge. |
| `test-skill-tree.js` | The skill tree: points derive from level (1 per level-up), spending ranks raises the derived stats (max HP live-applied, melee, ranged + dodge cooldowns), overspend and max-rank are refused, ranks persist per figure and survive a localStorage round-trip, reset refunds everything, and the Esc→9 Skills menu spends points through the real number-key path. |
| `test-interiors.js` | The interior kit: in_* walls/floor and d_* furniture register under INTERIOR/DECOR, multi-prim objects clone as visible+collidable hierarchies, a solid wall blocks shots while the doorway gap passes (lintel blocks), the sliding pr_door blocks when closed, opens via its wired `open` input (panel slides, `opened` fires a counter once), and respawn's onPlayReset shuts it. |
| `test-figure-packs.js` | Shop packs: definitions are coherent (contents exist, price < à-la-carte value), broke purchases refused cleanly, the Hero Pack grants all three figures, Play Sets grant figure + premium object, ownership is derived from contents (à-la-carte completion counts), grants survive reload, and the shop digit path buys a pack (packs number after objects so object indices never shift). |
| `test-hub.js` | The Sandbox Hub starter world (New Game option 5): terrain + all four zones' objects exist with their pre-authored wires (trigger→spawner+camera, stars→counter→scoreboard, path chain→ferry, patrol), and the wires PLAY — walking into the Combat Yard spawns walkers and cuts the camera, the ferry moves, the guard patrols, and touching a star increments the climb counter; the homestead has ground beneath it, all furniture stands on the floor within 5cm, and the sliding door sits inside the rotated doorway span (user-reported fixes). |
| `test-interior-cells.js` | The pocket-interior door: walking in teleports the player to a far-away decorated room (raw meshes, ≥8 built), outdoor enemies freeze via insideCell, `entered`/`exited` fire wired counters, the player can WALK inside the cell (regression: the unpickable floor once froze the CC into permanent free-fall, user-reported), the exit pad returns the player placed clear of the trigger radius (no yo-yo even past the cooldown, with slope-slide margin), dying inside respawns outside with the state cleared, and the room PERSISTS: real world objects furnished once from the template, kept through build mode (only the pad mechanism goes), riding the world save, and never refurnished over player edits. |
| `test-juggling.js` | Aerial juggling: the `R` launcher gives a walker upward velocity + stun (it rises and can't melee), airborne hits deal +1 damage / re-pop the target / count the juggle chain (reset on landing), flyers get a ballistic pop that pauses their contact attacks, the cooldown gates repeat swings, and the real R keypress path works. |
| `test-farming.js` | Farm plots: a plot sows itself on play start and ripens dt-based (a slow control plot lags), the ripe crop scales up gold on a per-instance material, walking over it harvests +2 food / fires `harvested` / auto-replants, feeding prefers food (1→15 XP, pixels untouched) with a pixel fallback when empty, and food persists across reload. |
| `test-aircraft.js` | The Sky-Wing glider: registers with collision-free wings + tail, walk-up boarding, throttle + held Space takes off, the glide caps sink rate at -2.5 with airspeed (in-page vy sampling), it banks into airborne turns, cutting throttle stalls/settles/levels, and C bails out with a cooldown. |
| `test-mounts.js` | The Strider mount: registers with four legs, walk-up saddling on the shared seat, legs trot in proportion to speed (in-page sampling), pivots in place at rest (unlike the kart), Space jumps while mounted (rises + lands still saddled), C dismounts with a cooldown, and the kart's own Space-dismount profile stays intact. |
| `test-vehicles.js` | The hover-kart: registers as a priced prop, walk-up mounting seats the player (controller stopped), W builds momentum and the player rides along, D steers while moving, drag bleeds released speed, Space dismounts with a re-mount cooldown, and respawn mid-drive parks the kart back at its home pose. |
| `test-companions.js` | Dialog-tree hiring: approaching a recruit opens its dialog, choices navigate, the free hire joins/closes/fires the wired `hired` edge and spawns a following rig, a broke paid hire refuses in-conversation while a funded one pays, slot switches despawn and respawn the crew (companions ride the progression slot), and the hired dialog offers working dismissal. |
| `test-coop.js` | The drop-in buddy: B toggles a bipedal rig beside P1, the injected second-pad stick moves it, a held jump launches it, its pad attack lands the frontal-arc melee, falls rescue to P1's side, a pad join flag works keyboard-free, leaving disposes the rig — plus the upgrade: a walker hunts and damages the NEARBY buddy with P1 far away, 0 HP downs it (slumped, out of combatTargets, input ignored) then revives at half, and respawn restores it healthy at spawn. |
| `test-ghost-kart.js` | The AI rival: a ghost wired to a 4-node loop starts on the grid, advances along the racing line, is half-visible and intangible (shots pass through), fires `lapped` into a wired counter every circuit, returns to the grid on respawn, and ships wired into Glow Circuit's racing line. |
| `test-kart-racing.js` | Kart lap racing (Glow Circuit): the course imports with its gate wired finish-then-start, mounting at the grid works, the gate arms a lap FROM THE KART SEAT, both checkpoints count while driving, re-crossing the gate closes the lap (record persisted, scoreboard paid) and the same crossing arms the next lap, and a slower lap sets no record. |
| `test-campaign-figures.js` | Campaign heroes: not pixel-buyable, granted into the shared collection by their Play Set purchase, outside figures refuse to switch inside the campaign world while the hero selects fine, and back in a sandbox template everyone (hero included) selects freely. |
| `test-campaign.js` | The Glowlands Play Set, played end to end: the 3-mission chain imports wired, the vault door blocks before M1, collecting the stars pays M1 and slides the vault open, entering the pocket room pays M2, a zero-checkpoint lap at the gate pays M3 with the scoreboard and camera finale — proving campaigns package from shipped toys with no engine additions. |
| `test-fourplayer.js` | The 4P party: slot pads join their own buddies, B fills the party (4th refused) and disbands when full, per-slot sticks drive independently, combatTargets lists everyone with downed buddies dropping out alone, a full party splits into a 2×2 quadrant grid and re-layouts on leave, and respawn restores the whole party at spawn. |
| `test-featured.js` | Featured rotations: the curation loads, featuredWorld(day) cycles all entries and wraps, today's pick is a real gallery entry sorted first with the ★ FEATURED badge on the Share screen, and digit 3 imports the featured world into build mode. |
| `test-gate.js` | The l_gate logic combinator: registers with GateScript, an AND gate opens only when `need` sources are active (and closes once when one drops), an OR gate opens on the first active source, a NOT gate opens when a source clears, two plates + an AND gate open a door only when both are pressed, and a play reset clears the gate. |
| `test-gadget-hex.js` | Gadget hexes: the roster, buy/select/persist (pixels deducted, granted, active choice survives reload), Boost Boots raising the CC jump speed + baseline, Pixel Magnet collecting a burst faster than default, Guardian Ward absorbing the first hit each life and recharging on respawn (2nd hit lands), and the Discs-screen gadget rows selecting by digit. |
| `test-trial-world.js` | The Bladeworks skill-trial world end to end: imports with three checkpoints, a shield + power power-up, three sweeping blades, the shielder wired to its gate, the charger, and the vault; a trial blade sweeps; flanking the shielder (a rear hit) opens the gate and steps the quest; and the vault chest pays out and advances the quest. |
| `test-shift-world.js` | The Shiftworks traversal world end to end: imports with 3 checkpoints, 2 conveyors, 4 crumble tiles, a sweeper, a trampoline, and the star wired to the vault gate; a conveyor carries the player; a crumble tile collapses when stood on; the sweeper oscillates; collecting the star opens the gate and steps the quest; and the vault chest pays out. |
| `test-warded-world.js` | The Warded Hall combat world end to end: imports with a checkpoint, regen field, a shielder+charger front line, and the mender wired to the vault; the in-world mender heals a wounded ally; the regen field heals a hurt player; defeating the mender opens the vault ward and steps the quest; and the vault chest pays out. |
| `test-arena-world.js` | The Gauntlet combat-arena world end to end: imports with a checkpoint, arm-gate, wave spawner, a turret, two chargers, and the vault (wired); an arena charger aggros and dashes at the player; clearing the wave opens the exit door and steps the quest; and the vault chest pays out and advances the quest. |
| `test-launch-world.js` | The Skybreak Run cannon/secret world end to end: imports with 2 cannons, 2 breakable walls, a hidden star, a checkpoint and the vault (wired); a cannon launches the player forward and up; the mid breakable wall starts solid then smashing it opens the way and steps the quest; smashing the top breakable opens the vault door; and the vault chest pays out and advances the quest. |
| `test-dungeon-world.js` | The Locked Depths key-and-lock dungeon end to end: imports with lava hazards, gold+silver keys, matching locks, 3 checkpoints, a turret, and a vault; the lava channel damages the player; the gold key opens the gold lock (a gold key ignores the silver lock, key consumed); the silver key opens the silver lock; and the vault chest pays out and advances the quest. |
| `test-adventure-world.js` | The Aether Ruins three-stage adventure end to end: imports with turret+wave AND gate, teleporters, checkpoints, and vault wired; door 1 stays shut until BOTH the turret is destroyed AND the wave cleared; a checkpoint moves the respawn point; the teleport pad warps to the key-star which opens door 2; and the vault chest pays the scoreboard and advances the quest. |
| `test-water-world.js` | The Tidewater Run boat-voyage world end to end: imports with the boat, a big water lake, floating props, three ring gates wired into an l_race, and the island chest; the boat mounts and rides the lake surface; the barrels bob; and a ring detects the BOAT sailing through it, running the race start->checkpoint->finish (stepping the quest). |
| `test-platformer-world.js` | The Skyward Steps puzzle-platformer end to end: imports with the trampoline, ladder, moving platform, a 2-input AND gate, star and chest all wired; the moving-platform sweeper travels its chain; the trampoline launches the player; and the AND gate opens the goal only after BOTH the trampoline is bounced AND the sky-star is collected (stepping the quest). |
| `test-puzzle-world.js` | The Gatekeeper's Vault demo world end to end: imports with OR + AND gates wired, Room A's OR gate opens door 1 on either button, Room B's AND gate keeps door 2 shut on the chest alone but opens it once the chest AND the 3-star counter are done (stepping the quest), and Room C's vault barrel rides the pool. |
| `test-favorites.js` | Gallery local favourites: toggleFavorite stars/unstars a world and persists it (survives loadEconomy), orderedGallery floats favourites to the top after the featured pick, favourite mode makes a gallery pick star the world instead of loading it, and with the mode off a pick imports into build mode as usual. |
| `test-gallery.js` | Gallery browsing: the Share screen fetches the bundled index over HTTP and lists both worlds, importWorldFromUrl pulls Starter Parkour with wires intact (stars→counter→scoreboard), a bad URL resolves false leaving the world untouched, and the gallery digit imports Tiny Arena straight into build mode. |
| `test-share.js` | World files: the main-menu Share screen opens/returns, exporting with no world is refused, exports are versioned iis-world envelopes carrying positions/params/wires, garbage/foreign/too-new files are rejected without touching the world, an export→clear→import round-trip restores everything, and the browser download path runs clean. |
| `test-sidekick-gear.js` | Sidekick gear: foodless crafting refused, the Top Hat costs 5 food / auto-wears / +2 aura HP, the follower redresses with the accessory child, the Bell rounds the XP share up, the Cape replaces the Bell (still owned) and makes meals 20 XP (level-wrap-aware math), outfits are per sidekick and restore on switch-back, everything survives reload, and the Care digits wear owned gear. |
| `test-sidekicks.js` | Sidekicks: broke adoptions refused, adopting deducts + follows + adds the +2/level max-HP aura, the follower mesh closes a teleport gap in play mode, the sidekick earns half the player's XP and levels its aura live, feeding trades 10 pixels for 10 XP, re-selecting dismisses (mesh + aura), per-sidekick progress survives reload, and Collection digits adopt/feed. |
| `test-hex-discs.js` | Hex world themes: a fresh economy owns only classic, broke buys refused, buying Midnight applies its exact sky + terrain tint, classic restores the captured default precisely, ownership/active survive reload with re-apply, and the Discs screen's hex rows buy/select by digit. |
| `test-gamepad.js` | The pad abstraction: handlePadButton routes every PAD_MAP entry (edge vs held) and rejects unmapped buttons, an injected left stick moves the player through the controller's real key handlers with hysteresis at the 0.45/0.30 thresholds, the right stick orbits the camera inside its pitch clamp, held A starts a jump, and right-stick click acquires lock-on. |
| `test-discs.js` | Power discs: broke purchases refused, buying deducts + auto-equips + buffs (+1 melee Ember), two different discs stack (+20 HP Aegis alongside), the third equip is refused until a slot frees, Swift shortens the dodge, Fortune's fractional accumulator pays 16 singles as exactly 20, Sage rounds 8 XP to 10, the loadout is global across figures and survives reload, and the Collection→9 Discs screen toggles by digit. |
| `test-splitscreen.js` | Automatic co-op split-screen: far apart on solid ground the view splits into two half-width cameras (buddy FollowCamera locked on, HUD layer-masked out of the buddy pane), a 22-unit gap holds the split (hysteresis), reuniting merges to one full camera, and leaving mid-split tears down cleanly. |
| `test-snap.js` | Snap-assisted placement: a Shift+movement press lands the block flush against its neighbor (off-grid offset preserved, grid pull suspended), re-press is idempotent and empty directions refuse, CapsLock latches / pad LB holds the mode, and snap-rotate copies the nearest same-type piece's angle with similar-size different-type pieces qualifying inside a 12u radius. |
| `test-sound.js` | The chime toy: the audio layer builds lazily (context + master gain, float32-tolerant), `play` schedules the 4-note jingle and fires `played`, each sound param selects its distinct pattern (alarm 6 / gong 2 / powerup 5 notes) with its volume, and a trigger wired into `play` sounds the chime from world events (seq-marked — currentTime freezes on suspended headless contexts). |
| `test-specials.js` | Figure specials on V: Scout's Shockwave damages + launches all around, Blaze's Flame Arc hits heavy and frontal-only, Frost's Nova chills walkers/flyers (a chilled walker deals no point-blank melee), Volt fires exactly five bolts, the shared cooldown refuses seconds, respawn resets it, and the real V keypress works. |
| `test-playset-gating.js` | Locked Play Sets: The Glowlands is priced and starts locked (free worlds always owned), the Share row renders 🔒 + price, a broke pick refuses without charging or importing, a funded pick pays 150 exactly once and imports the campaign, later picks are free, and the unlock survives an economy reload. |
| `test-quests.js` | The l_quest goal toy: distinct wired sources count once each with `progress` edges, completing all steps fires `complete` once and pays the pixel reward, post-completion steps neither fire nor pay, `reset` and death both re-arm it, and the hub ships a 3-step Tour the Park quest wired to yard + climb + cell door. |
| `test-races.js` | The l_race controller: a real start-gate trigger arms the run (HUD stopwatch shows and accumulates dt), early finishes are refused, distinct checkpoints count once each, completion fires `finished` + `record` (first run), a slower run finishes without a record while a faster one records, respawn abandons the run, and best times persist per save slot via params.bestTime (a restored instance honours its saved best and re-persists when beaten). |
| `test-paths.js` | Paths + moving platform + patrols: a 3-node wire chain resolves, the platform snaps to node 1 on play start and travels dt-based, `arrived` fires a counter at each node, `once` stops at the end firing `completed` exactly once, `stop`/`start` freeze/resume, `pingpong` turns around, respawn returns it to the start, restPos keeps a mid-route save at the build-time home, a patrol-wired en_blob walks the chain / pauses when the player nears / resumes, and a pathless blob keeps the old stationary bob. |
| `test-sfx.js` | The sound-effects layer (`app.sound` / `SoundManager`): recorded pack samples with synth fallback. Every play() request lands in `app.sound.recent` even headless, so the test asserts the whole mapped pack preloads (a 404/bad path shows as failed), footsteps fire on a walking cadence tagged with the real surface underfoot (grass tiles, a wood door slab, a rolled grass block's dirt face) and play `via: 'sample'`, jump/double-jump/land follow the controller, combat/survival/economy/wiring events all ring their sounds, and `M` toggles a persistent mute that silences but keeps logging. |
| `run.sh` | Convenience runner. |
| `screenshots/` | Output PNGs from the most recent run (cleared at the start of each run). |

## Requirements

- **PHP** on `PATH` (used to serve the game, exactly like `run.sh` in the repo root).
- **Playwright + a Chromium build.** In this repo's container both are
  pre-installed (`/opt/.../playwright`, `/opt/pw-browsers/chromium-*`). Elsewhere:
  ```bash
  npm i -g playwright
  npx playwright install chromium
  ```

The harness auto-discovers the Chromium binary under `PLAYWRIGHT_BROWSERS_PATH`
(default `/opt/pw-browsers`). Override with `IIS_CHROMIUM_PATH=/path/to/chrome`.

## Running

Run the whole suite (what CI runs):

```bash
npm test                 # = node test/run-all.js
node test/run-all.js test-building test-delete   # run a subset
```

Or a single test directly:

```bash
./test/run.sh            # the building test
node test/test-building.js
```

Exit code `0` = all assertions passed, non-zero = failure. `run-all.js` writes
each test's screenshots to `test/screenshots/<test-name>/`; a single test writes
to `test/screenshots/`.

## Continuous integration

`.github/workflows/ci.yml` runs the full suite on every push and pull request:
it installs PHP and a Playwright Chromium (`--with-deps`), runs `npm test`, and
uploads `test/screenshots/` as a build artifact. Note that in CI the four
village-pack objects load from `assets.babylonjs.com` (there's outbound
network), so the buildable-object count is higher than in a network-restricted
sandbox; the tests don't hard-code that count, and `waitForReady` blocks until
the manifest fully settles so the object list is stable before assertions run.

Environment variables:

- `IIS_HEADLESS=0` — run with a visible browser (needs an X/Wayland display).
- `IIS_PORT=7031` — override the PHP dev-server port (tests may also pass
  `port` to the GameHarness constructor). Distinct ports let several harness
  instances run in parallel without colliding.

## What the building test verifies

It walks the exact flow a player uses and asserts game state at each step:

1. **Main menu** boots (`MENU_MAIN`), object library registered, no world yet.
2. **New Game** → a `SandboxWorld` is created, the origin terrain cube spawns,
   and the game enters **Play mode** with a loaded avatar.
3. **Esc → Pause → Build mode** is reached.
4. An object (`pr_door`) is **selected** for placement (a floating preview appears).
5. The preview is **moved** (WASD) and **rotated** (Z/C), then **placed** (Space) —
   asserted by the live instance count rising.
6. A **second** object is placed to prove repeat placement.
7. Returning to **Play mode**, both placed objects **persist** in the world.

The test deliberately builds with the primitive `pr_door` object because
primitives register synchronously and need no network assets, keeping the test
deterministic. (Four village-pack objects load from `assets.babylonjs.com`; if
outbound HTTPS is blocked you'll see "Loading 6/10" and matching console errors —
this is expected and does not affect the test.)

## Reusing the harness for other tests

```js
const { GameHarness } = require('./harness');

const h = new GameHarness();           // opts: { headless, port, viewport, ... }
await h.start();
await h.waitForReady(['t_cube_1x1']);  // wait for app + named objects to register

await h.tapUntil('1', () =>            // tap a key, retrying until it takes effect
  window.app.activeMode?.constructor.name === 'PlayMode');
await h.holdKey('w', 24);              // hold a key for N animation frames (movement)
const state = await h.getState();      // high-level snapshot for assertions
await h.screenshot('my-step');         // saved under screenshots/NN-my-step.png
await h.stop();
```

### Sampling over time (animation / behaviour)

A single screenshot can't tell a living scene from a frozen one. Two helpers
sample the game a few frames per second so tests can assert things actually
move and animate:

```js
// Sample an in-page value every few animation frames, N times, in order.
// Prove motion by asserting the series changes (positions, a bone matrix, an
// enemy count, pixels, ...).
const series = await h.sampleSeries(() => {
  const e = window.app.activeMode.enemyManager.enemies[0];
  return e ? [e.mesh.position.x, e.mesh.position.z] : null;
}, { samples: 8, everyFrames: 4 });

// Capture a short filmstrip (NN-name-fKK.png) at a few frames per second and
// report whether the render is actually changing. Each frame's PNG bytes are
// hashed, so a frozen game shows up as byte-identical (distinctFrames === 1).
const strip = await h.filmstrip('my-motion', { frames: 6, everyFrames: 4 });
// strip => { files, hashes, framesChanged, distinctFrames, frames }
```

Because both step by animation frames (not wall-clock), they stay reliable
under the low, variable software-rendering frame rate. Note the filmstrip only
detects change that's actually *on screen*: motion behind the follow-camera (an
enemy approaching from off-screen) won't move any pixels, so point it at
on-screen motion (a pixel burst, an enemy in view, a camera move).

### Input model gotcha

The game's `App.keyPressed()` **consumes** a key on first read, and software
rendering frame rates are low and variable. A fixed wall-clock key hold can be
missed entirely between two slow frames, so the harness syncs key presses to
animation frames and offers `tapUntil()` to retry a press until it has the
intended effect — which is also exactly what a real player does when a menu
doesn't respond.
