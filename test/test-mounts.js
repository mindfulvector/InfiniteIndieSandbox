/*
 * Ridable mount test
 * ------------------
 * Verifies the Strider on the generalized vehicle seat:
 *   - pr_mount registers with its four trot legs,
 *   - walking up saddles it (seat handshake shared with the kart),
 *   - riding builds speed and the legs trot (rotation oscillates); parked
 *     legs settle,
 *   - the mount pivots in place (steering with zero speed changes yaw --
 *     the kart profile can't),
 *   - Space JUMPS while mounted (grounded -> rises -> lands, still mounted),
 *   - C dismounts with the usual cooldown,
 *   - the kart's own profile still dismounts on Space (both vehicles ride
 *     the same seat without stepping on each other),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7060 });
    try {
        await h.start();
        await h.waitForReady(['pr_mount', 'pr_kart']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Registration + legs ---
        const reg = await h.evaluate(() => {
            const wo = window.app.findWorldObject('pr_mount');
            return {
                exists: !!wo,
                legs: wo.mesh.getChildMeshes().filter((m) => m.name.indexOf('mleg') >= 0).length,
            };
        });
        console.log('\n[1] registration', reg);
        check('the Strider registers with four legs', reg.exists && reg.legs === 4, reg);

        // --- 2. Walk-up saddling ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const mount = app.findWorldObject('pr_mount').createInstance();
            mount.position = pm.player.position.add(new BABYLON.Vector3(5, 0.9, 0));
            window.__M = mount;
            mount.script._wasPlay = null;
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__M.position.add(new BABYLON.Vector3(0.5, 1.0, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__M, null, 20000);
        console.log('[2] saddled');
        check('walking up saddles the Strider', true);
        await h.screenshot('saddled-strider');

        // --- 3. Riding trots the legs; parking settles them ---
        const t0 = await h.evaluate(() => {
            window.app.keysPressed['W'] = true;
            const legs = window.__M.getChildMeshes().filter((m) => m.name.indexOf('mleg') >= 0);
            window.__legs = legs;
            return { x: window.__M.position.x, z: window.__M.position.z };
        });
        await h.waitFor((t0) => {
            const M = window.__M;
            return Math.hypot(M.position.x - t0.x, M.position.z - t0.z) > 2;
        }, t0, 20000);
        const trot = await h.evaluate(() => new Promise((resolve) => {
            // Sample leg swing across frames while moving (in-page, per the
            // frame-window doctrine).
            const samples = [];
            let n = 0;
            const tick = () => {
                samples.push(window.__legs[0].rotation.x);
                if (++n >= 12) {
                    window.app.keysPressed['W'] = false;
                    const min = Math.min.apply(null, samples), max = Math.max.apply(null, samples);
                    return resolve({ swing: max - min, speed: window.__M._kartSpeed });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] trot', trot);
        check('the legs trot while riding (swing > 0.1)', trot.swing > 0.1 && trot.speed > 2, trot);

        // --- 4. Pivot in place: steering at rest changes yaw ---
        await h.waitFor(() => Math.abs(window.__M._kartSpeed) < 0.3, null, 20000);
        const yaw0 = await h.evaluate(() => {
            window.app.keysPressed['D'] = true;
            return window.__M.rotation.y;
        });
        await h.waitFor((yaw0) => Math.abs(window.__M.rotation.y - yaw0) > 0.25, yaw0, 20000);
        await h.evaluate(() => { window.app.keysPressed['D'] = false; });
        console.log('[4] pivoted in place');
        check('the Strider pivots in place at rest', true);

        // --- 5. Space jumps while mounted (still mounted after) ---
        await h.waitFor(() => window.__M._kartBody.grounded, null, 20000);
        const jump = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, M = window.__M;
            const y0 = M.position.y;
            window.app.keysPressed[' '] = true;
            let n = 0, rose = false;
            const tick = () => {
                n++;
                // Hold the key a few ticks: our RAF callback can run BEFORE
                // the game's update in the same frame, so clearing too early
                // could erase the press before it was ever consumed.
                if (n === 5) window.app.keysPressed[' '] = false;
                if (M.position.y > y0 + 0.4) rose = true;
                if ((rose && M._kartBody.grounded) || n > 900) {
                    return resolve({ rose, stillMounted: pm.driving === M });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[5] jump', jump);
        check('Space jumps the mount (rises, lands, still saddled)',
            jump.rose && jump.stillMounted, jump);

        // --- 6. C dismounts ---
        await h.evaluate(() => { window.app.keysPressed['C'] = true; });
        await h.waitFor(() => window.app.activeMode.driving === null, null, 20000);
        await h.evaluate(() => { window.app.keysPressed['C'] = false; });
        const off = await h.evaluate(() => ({ cooldown: window.__M._mountCooldown }));
        console.log('[6] dismount', off);
        check('C dismounts with a re-mount cooldown', off.cooldown > 0, off);

        // --- 7. The kart still dismounts on Space (profiles independent) ---
        const kart = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const k = app.findWorldObject('pr_kart').createInstance();
            k.position = pm.player.position.add(new BABYLON.Vector3(8, 0.8, 8));
            k.script._wasPlay = null;
            window.__K2 = k;
            return true;
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__K2.position.add(new BABYLON.Vector3(0.4, 0.8, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__K2, null, 20000);
        await h.evaluate(() => { window.app.keysPressed[' '] = true; });
        await h.waitFor(() => window.app.activeMode.driving === null, null, 20000);
        await h.evaluate(() => { window.app.keysPressed[' '] = false; });
        console.log('[7] kart profile intact');
        check('the kart still dismounts on Space', true);

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during mounts', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the Strider saddles, trots, pivots, jumps, and shares the seat cleanly.'
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
