/*
 * Floating props test
 * -------------------
 * Verifies buoyant props on water:
 *   - pr_barrel / pr_crate register and are flagged buoyant,
 *   - a barrel dropped over a water pool rises to and settles near the
 *     surface (rides mostly submerged), and does NOT sink through,
 *   - it bobs (its y oscillates once settled),
 *   - a crate on dry land is left alone (falls/rests, not pinned to a
 *     surface),
 *   - a play reset returns a drifted floater to its start,
 *   - the shared waterSurfaceAt helper reports a stacked pool's true top,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7107 });
    try {
        await h.start();
        await h.waitForReady(['pr_barrel', 'pr_crate', 't_water']);
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

        // --- 1. Registration + buoyant flag ---
        const reg = await h.evaluate(() => {
            const app = window.app;
            const b = app.findWorldObject('pr_barrel').createInstance();
            b.position = new BABYLON.Vector3(200, 50, 200);   // off alone, dry
            b.script.update(true, app.activeMode);
            return { barrel: !!app.findWorldObject('pr_barrel'),
                crate: !!app.findWorldObject('pr_crate'),
                flagged: b.buoyant === true, half: b._floatHalf };
        });
        console.log('\n[1] registration', reg);
        check('barrel + crate register and flag buoyant with a measured half-height',
            reg.barrel && reg.crate && reg.flagged && reg.half > 0.2, reg);

        // --- 2. A barrel floats on a pool (surface, not sunk) ---
        const floated = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            // A 3x3 water pool with its surface at y=5 (t_water is a 2-tall
            // block; place centers at y=4 so tops are at 5).
            for (let dx = -2; dx <= 2; dx += 2) for (let dz = -2; dz <= 2; dz += 2) {
                const w = app.findWorldObject('t_water').createInstance();
                w.position = new BABYLON.Vector3(60 + dx, 4, 60 + dz);
            }
            const barrel = app.findWorldObject('pr_barrel').createInstance();
            barrel.position = new BABYLON.Vector3(60, 8, 60);   // dropped above
            barrel.script.update(true, pm);
            window.__B = barrel;
            let n = 0;
            const tick = () => {
                n++;
                pm.updateFloaters();
                if (n > 240) {
                    const surfTop = pm.waterSurfaceAt(60, 60, 8, -8);
                    return resolve({ y: barrel.position.y, surfTop,
                        floating: barrel._floating,
                        nearSurface: Math.abs(barrel.position.y - (surfTop - barrel._floatHalf)) < 0.5,
                        notSunk: barrel.position.y > surfTop - barrel._floatHalf - 0.5 });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] float', floated);
        check('a barrel rises to the surface and rides there without sinking',
            floated.floating && floated.nearSurface && floated.notSunk && floated.surfTop === 5, floated);
        await h.screenshot('floaters');

        // --- 3. It bobs once settled ---
        const bob = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, b = window.__B;
            let n = 0, lo = 99, hi = -99;
            const tick = () => {
                n++;
                pm.updateFloaters();
                lo = Math.min(lo, b.position.y); hi = Math.max(hi, b.position.y);
                if (n > 120) return resolve({ amp: hi - lo });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] bob', bob);
        check('the settled barrel bobs (its height oscillates)', bob.amp > 0.02, bob);

        // --- 4. A dry-land crate is left alone ---
        const dry = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const crate = app.findWorldObject('pr_crate').createInstance();
            crate.position = new BABYLON.Vector3(120, 6, 120);   // no water here
            crate.script.update(true, pm);
            const y0 = crate.position.y;
            for (let i = 0; i < 30; i++) pm.updateFloaters();
            return { y0, y1: crate.position.y, floating: crate._floating };
        });
        console.log('[4] dry', dry);
        check('a crate over dry land is not pinned to any surface',
            !dry.floating && dry.y1 === dry.y0, dry);

        // --- 5. Play reset returns a floater home ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, b = window.__B;
            const home = b.script._home.clone();
            b.position.x += 15; b.position.z += 15;   // drift it away
            b.script.onPlayReset(pm);
            return { home: [home.x, home.z], now: [b.position.x, b.position.z] };
        });
        console.log('[5] reset', reset);
        check('a play reset returns a drifted floater to its start',
            Math.abs(reset.home[0] - reset.now[0]) < 0.01 &&
            Math.abs(reset.home[1] - reset.now[1]) < 0.01, reset);

        // --- 6. waterSurfaceAt climbs a stacked pool ---
        const stacked = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            // Stack two water blocks: centers 4 and 6 -> tops 5 and 7.
            const w2 = app.findWorldObject('t_water').createInstance();
            w2.position = new BABYLON.Vector3(60, 6, 60);
            return { top: pm.waterSurfaceAt(60, 60, 4, -4) };
        });
        console.log('[6] stacked', stacked);
        check('waterSurfaceAt reports a stacked pool\'s true top', stacked.top === 7, stacked);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during floaters', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — barrels bob, crates float, dry land is left dry.'
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
