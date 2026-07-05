/*
 * Barrel cannon test
 * ------------------
 * Verifies pr_cannon + PlayMode.launchPlayer:
 *   - registers with CannonScript + a `fired` output,
 *   - stepping into it launches the player up AND forward along the barrel's
 *     facing (a ballistic arc), and fires `fired`,
 *   - rotating the barrel changes the launch direction,
 *   - a per-cannon cooldown stops an immediate re-fire,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7124 });
    try {
        await h.start();
        await h.waitForReady(['pr_cannon', 'l_counter']);
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

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const c = window.app.findWorldObject('pr_cannon').createInstance();
            c.position = new BABYLON.Vector3(300, 5, 300);
            return { script: c.script.constructor.name,
                out: c.script.outputs.some((o) => o.id === 'fired') };
        });
        console.log('\n[1] registration', reg);
        check('pr_cannon registers with CannonScript and a fired output',
            reg.script === 'CannonScript' && reg.out, reg);

        // --- 2. Stepping in launches up AND forward (+z facing) + fires ---
        const fired = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const c = app.findWorldObject('pr_cannon').createInstance();
            c.position = new BABYLON.Vector3(40, 3, 40);
            c.rotation = new BABYLON.Vector3(0, 0, 0);   // faces +z
            c.params = { power: 14, reach: 26 };
            c.script._cool = 0;
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(40, 3, 43);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            c.wires = [{ event: 'fired', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__C = { c, cnt };
            pm.player.position.copyFrom(c.position);
            const y0 = pm.player.position.y, z0 = pm.player.position.z, x0 = pm.player.position.x;
            c.script.update(true, pm);        // fire once (sets a 45f cooldown)
            c.script._cool = 999;             // pin it: no re-fire while we watch the flight
            let n = 0, maxY = -99;
            const tick = () => {
                n++;
                maxY = Math.max(maxY, pm.player.position.y);   // game loop applies the impulse
                if (n > 90) {
                    return resolve({
                        rose: maxY - y0,
                        forwardZ: pm.player.position.z - z0,
                        driftX: Math.abs(pm.player.position.x - x0),
                        fired: cnt.script.count,
                    });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] launch', fired);
        check('the cannon launches the player up and forward, and fires `fired`',
            fired.rose > 1.5 && fired.forwardZ > 3 && fired.driftX < 2 && fired.fired === 1, fired);
        await h.screenshot('cannon');

        // --- 3. Rotating the barrel aims the launch (east / +x) ---
        const aimed = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const c = app.findWorldObject('pr_cannon').createInstance();
            c.position = new BABYLON.Vector3(80, 3, 80);
            c.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);   // yaw 90deg -> faces +x
            c.params = { power: 14, reach: 26 };
            c.script._cool = 0;
            pm.player.position.copyFrom(c.position);
            const x0 = pm.player.position.x, z0 = pm.player.position.z;
            c.script.update(true, pm);        // fire once
            c.script._cool = 999;
            let n = 0;
            const tick = () => {
                n++;
                if (n > 90) {
                    return resolve({ eastX: pm.player.position.x - x0,
                        littleZ: Math.abs(pm.player.position.z - z0) });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] aim', aimed);
        check('rotating the barrel aims the launch (yaw 90 -> +x)',
            aimed.eastX > 3 && aimed.littleZ < 2, aimed);

        // --- 4. Cooldown blocks an immediate re-fire ---
        const cool = await h.evaluate(() => {
            const pm = window.app.activeMode, c = window.__C.c;
            c.script._cool = 30;   // just fired
            const before = window.__C.cnt.script.count;
            pm.player.position.copyFrom(c.position);
            for (let i = 0; i < 10; i++) c.script.update(true, pm);
            return { noRefire: window.__C.cnt.script.count === before };
        });
        console.log('[4] cooldown', cool);
        check('a cannon on cooldown does not immediately re-fire', cool.noRefire, cool);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the cannon', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — step in, and the barrel flings you where it aims.'
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
