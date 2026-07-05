/*
 * Tidewater Run water-world test
 * ------------------------------
 * A boat-voyage gallery world showcasing the boat, floaters, water, rings,
 * and race. Verifies:
 *   - the world imports with the boat, a water lake, floating props, three
 *     ring gates wired into an l_race, and the island chest,
 *   - the boat mounts and rides the lake surface,
 *   - the floating barrels bob on the lake,
 *   - a ring detects the BOAT sailing through it and fires the race start,
 *   - all three ring gates run the race start -> checkpoint -> finish,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7113 });
    try {
        await h.start();
        await h.waitForReady(['pr_boat', 't_water', 'pr_barrel', 'l_ring', 'l_race']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });

        // --- 1. Import + inventory ---
        const inv = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/tidewater-run.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const rings = live('l_ring');
                const race = live('l_race')[0];
                window.__W = {
                    boat: live('pr_boat')[0],
                    rings, race,
                    barrels: live('pr_barrel'),
                    chest: live('pr_chest')[0],
                    quest: live('l_quest')[0],
                };
                const W = window.__W;
                const acts = rings.map((r) => (r.wires[0] || {}).action).sort();
                return { ok,
                    hasBoat: !!W.boat, water: live('t_water').length, barrels: W.barrels.length,
                    ring3: rings.length === 3,
                    ringsWireRace: rings.every((r) => r.wires.some((w) => w.toWo === 'l_race')),
                    raceActs: acts.join(','),
                    chest: !!W.chest };
            }));
        console.log('\n[1] inventory', inv);
        check('the water world imports: boat, big lake, floaters, 3 race rings, chest',
            inv.ok && inv.hasBoat && inv.water > 100 && inv.barrels === 5 && inv.ring3 &&
            inv.ringsWireRace && inv.raceActs === 'checkpoint,finish,start' && inv.chest, inv);

        // --- 2. The boat mounts and rides the lake surface ---
        const sailed = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode, boat = window.__W.boat;
            pm.player.position.copyFrom(boat.position);
            boat.script.update(true, pm);   // walk-up mount
            const mounted = pm.driving === boat;
            app.keysPressed['W'] = true;
            let n = 0;
            const tick = () => {
                n++;
                pm.updateDriving();
                if (n > 60) {
                    app.keysPressed['W'] = false;
                    const surf = pm.waterTopAt(boat.position.x, boat.position.z);
                    return resolve({ mounted, onWater: boat._onWater,
                        rides: surf != null && Math.abs(boat.position.y - (surf - 0.35)) < 0.3 });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] sail', sailed);
        check('the boat mounts and rides the lake surface',
            sailed.mounted && sailed.onWater && sailed.rides, sailed);
        await h.screenshot('tidewater');

        // --- 3. The barrels bob on the lake ---
        const bob = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, b = window.__W.barrels[0];
            let n = 0, lo = 99, hi = -99;
            const tick = () => {
                n++;
                pm.updateFloaters();
                lo = Math.min(lo, b.position.y); hi = Math.max(hi, b.position.y);
                if (n > 150) return resolve({ floating: b._floating, amp: hi - lo, y: b.position.y });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] barrels', bob);
        check('the lake barrels float and bob', bob.floating && bob.amp > 0.02, bob);

        // --- 4. A ring detects the boat and runs the race through all gates ---
        const raced = await h.evaluate(() => {
            const pm = window.app.activeMode, W = window.__W;
            // Reset race + rings, then teleport the boat through each ring in
            // order and tick so the flown edge fires into the race.
            W.rings.forEach((r) => { r.script._inside = false; });
            W.race.script.onInput('reset');
            const passRing = (ring) => {
                pm.driving = W.boat;
                W.boat.position.copyFrom(ring.position);   // boat centre in the ring
                ring.script.update(true, pm);
                W.boat.position.copyFrom(ring.position.add(new BABYLON.Vector3(0, 0, 8)));  // exit
                ring.script.update(true, pm);
            };
            const startBefore = W.race.script._racing;
            passRing(W.rings[0]);   // start
            const started = W.race.script._racing;
            passRing(W.rings[1]);   // checkpoint
            const cps = W.race.script._hit.size;
            passRing(W.rings[2]);   // finish
            return { startBefore: !!startBefore, started: !!started, cps,
                finished: !W.race.script._racing,
                questSteps: W.quest.script._done ? W.quest.script._done.size : 0 };
        });
        console.log('[4] race', raced);
        check('a ring detects the boat and starts the race',
            !raced.startBefore && raced.started, raced);
        check('sailing all three gates finishes the race (start->checkpoint->finish)',
            raced.finished && raced.questSteps >= 1, raced);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the water world', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — cast off, thread the gates, and reach the treasure isle.'
            : `RESULT: FAIL — ${failures} assertion(s) failed.`);
        console.log('========================================');
        if (h.pageErrors.length) h.dumpDiagnostics();
    } catch (err) {
        failures += 1;
        console.error('\nHARNESS ERROR:', err && err.stack ? err.stack : err);
        try { await h.screenshot('error-state'); } catch (_) {}
        h.dumpDiagnostics();
    } finally {
        await h.stop();
    }
    process.exit(failures === 0 ? 0 : 1);
}

main();
