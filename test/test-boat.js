/*
 * Boat / watercraft test
 * ----------------------
 * Verifies pr_boat:
 *   - registers with BoatScript and a `watercraft` vehicleProfile,
 *   - walk-up mount hands the player to the driving seat,
 *   - while driven over a water pool it RIDES the surface (its Y eases to
 *     the water top minus a small draft, and holds there as it sails),
 *   - it does not sink through the water,
 *   - Space dismounts,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7112 });
    try {
        await h.start();
        await h.waitForReady(['pr_boat', 't_water']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Registration + watercraft profile ---
        const reg = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const b = app.findWorldObject('pr_boat').createInstance();
            b.position = new BABYLON.Vector3(200, 5, 200);
            return { script: b.script.constructor.name,
                watercraft: pm._vehicleProfile(b).watercraft === true,
                seatY: pm._vehicleProfile(b).seatY };
        });
        console.log('\n[1] registration', reg);
        check('pr_boat registers with BoatScript + a watercraft profile',
            reg.script === 'BoatScript' && reg.watercraft, reg);

        // --- 2. Build a pool + a boat on it; mount via walk-up ---
        const mounted = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            // A 5x5 water pool, tops at y=5 (2-tall blocks centered at 4).
            for (let dx = -4; dx <= 4; dx += 2) for (let dz = -4; dz <= 4; dz += 2) {
                const w = app.findWorldObject('t_water').createInstance();
                w.position = new BABYLON.Vector3(70 + dx, 4, 70 + dz);
            }
            const boat = app.findWorldObject('pr_boat').createInstance();
            boat.position = new BABYLON.Vector3(70, 5, 70);
            boat.script._wasPlay = null; boat.script.update(true, pm);
            window.__B = boat;
            // Walk up and let the script mount us.
            pm.player.position.copyFrom(boat.position);
            boat.script.update(true, pm);
            return { driving: pm.driving === boat };
        });
        console.log('[2] mount', mounted);
        check('walk-up mounts the boat', mounted.driving, mounted);

        // --- 3. Sail forward: the boat rides the water surface ---
        const sailed = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            app.keysPressed['W'] = true;   // throttle
            let n = 0, minY = 99, maxY = -99;
            const tick = () => {
                n++;
                pm.updateDriving();
                const y = window.__B.position.y;
                if (n > 20) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
                if (n > 90) {
                    app.keysPressed['W'] = false;
                    const surf = pm.waterTopAt(window.__B.position.x, window.__B.position.z);
                    return resolve({ y: window.__B.position.y, surf,
                        onWater: window.__B._onWater,
                        ridesSurface: surf != null && Math.abs(window.__B.position.y - (surf - 0.35)) < 0.25,
                        steady: (maxY - minY) < 0.5 });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] sail', sailed);
        check('the boat rides the water surface (Y near surface minus draft)',
            sailed.onWater && sailed.ridesSurface && sailed.surf === 5, sailed);
        check('the boat does not sink through the water', sailed.y > 4.5, sailed);
        await h.screenshot('boat');

        // --- 4. Space dismounts ---
        const off = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            app.keysPressed[' '] = true;
            pm.updateDriving();
            app.keysPressed[' '] = false;
            return { driving: !!pm.driving };
        });
        console.log('[4] dismount', off);
        check('Space hops out of the boat', !off.driving, off);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the boat', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — cast off, ride the surface, and step ashore.'
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
