/*
 * Speeder hover-bike test
 * -----------------------
 * The Speeder (pr_speeder, SpeederScript) is the fast, unarmed traversal
 * vehicle on the shared seat: high base speed, the sandbox's strongest Shift
 * BOOST, and a hard lean into turns. Verifies:
 *   - pr_speeder registers with an unarmed vehicle profile carrying the
 *     boost fields,
 *   - walking up mounts it and the rider is hidden completely,
 *   - W throttle settles at a cruise FASTER than the kart's (accel 16 vs 14),
 *   - holding Shift bursts well past base cruise (and flags _boosting),
 *   - it leans into a turn while riding (rotation.z) and levels when straight,
 *   - Space hops out and the rider becomes visible again,
 *   - no unexpected page errors.
 * Speeds read from inst._kartSpeed (the seat's internal momentum), immune to
 * terrain bumps.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7156 });
    try {
        await h.start();
        await h.waitForReady(['pr_speeder', 'pr_kart']);
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

        // --- 1. Registration: unarmed profile with boost fields ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const bike = app.findWorldObject('pr_speeder').createInstance();
            bike.position = pm.player.position.add(new BABYLON.Vector3(4, 0.8, 0));
            window.__S = bike;
            bike.script._wasPlay = null;
        });
        await h.waitFrames(5);
        const reg = await h.evaluate(() => {
            const p = window.__S.script.vehicleProfile;
            return { armed: !!p.armed, boostMax: p.boostMax, max: p.max,
                scripted: window.__S.script.constructor.name };
        });
        console.log('[1] registration', reg);
        check('the Speeder registers unarmed with boost fields',
            reg.scripted === 'SpeederScript' && reg.armed === false &&
            reg.boostMax > reg.max, reg);

        // --- 2. Mount: walk up, rider vanishes ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__S.position.add(new BABYLON.Vector3(0.5, 1.0, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__S, null, 20000);
        const rider = await h.evaluate(() => {
            const p = window.app.activeMode.player;
            return [p].concat(p.getChildMeshes()).filter((m) => m.isVisible).length;
        });
        console.log('[2] mounted', { visibleRiderMeshes: rider });
        check('mounting hides the rider completely', rider === 0, { visibleMeshes: rider });

        // --- 3. Base cruise: faster than the kart (accel 16 vs 14) ---
        const base = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['W'] = true;
            const S = window.__S;
            let n = 0, top = 0;
            const tick = () => {
                n++;
                top = Math.max(top, S._kartSpeed || 0);
                if (n >= 80) return resolve({ top, boosting: !!S._boosting });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] base cruise', base);
        // accel 16 / DRAG 2.2 = 7.3 equilibrium; the kart's is 6.4.
        check('base cruise is fast (faster than the kart, ~7.3)',
            base.top > 6.8 && base.top < 8.5 && !base.boosting, base);

        // --- 4. Shift boost: bursts well past base cruise ---
        const boost = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['SHIFT'] = true;
            const S = window.__S;
            let n = 0, top = 0, flagged = false;
            const tick = () => {
                n++;
                top = Math.max(top, S._kartSpeed || 0);
                flagged = flagged || !!S._boosting;
                if (n >= 80) return resolve({ top, flagged });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[4] boost', boost);
        check('Shift boost bursts well past base cruise', boost.top > base.top + 4, boost);
        check('the seat flags the burst (_boosting)', boost.flagged === true, boost);
        await h.screenshot('speeder-boosting');

        // --- 5. Leaning: hard lean into a turn, level when straight ---
        const lean = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['D'] = true;   // steer right, still boosting fast
            const S = window.__S;
            let n = 0, maxLean = 0;
            const tick = () => {
                n++;
                maxLean = Math.max(maxLean, Math.abs(S.rotation.z));
                if (n >= 40 || maxLean > 0.12) {
                    window.app.keysPressed['D'] = false;
                    return resolve({ maxLean });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[5] lean', lean);
        check('the Speeder leans into a turn at speed', lean.maxLean > 0.12, lean);
        // Stop steering and boosting; it should level back toward upright.
        await h.evaluate(() => { window.app.keysPressed['SHIFT'] = false; });
        await h.waitFor(() => Math.abs(window.__S.rotation.z) < 0.04, null, 20000);
        console.log('[5b] leveled');
        check('it levels out when steering stops', true);

        // --- 6. Space hops out, rider returns ---
        await h.evaluate(() => {
            window.app.keysPressed['W'] = false;
            window.app.keysPressed[' '] = true;
        });
        await h.waitFor(() => window.app.activeMode.driving === null, null, 20000);
        await h.evaluate(() => { window.app.keysPressed[' '] = false; });
        const back = await h.evaluate(() => {
            const p = window.app.activeMode.player;
            return { rootVisible: p.isVisible,
                anyChildVisible: p.getChildMeshes().some((m) => m.isVisible) };
        });
        console.log('[6] dismounted', back);
        check('hopping out restores the rider', back.rootVisible || back.anyChildVisible, back);

        // --- 7. Hygiene ---
        const errs = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no unexpected page errors', errs.length === 0, errs.slice(0, 3));
    } catch (err) {
        failures += 1;
        console.log('  FAIL  harness error :: ' + (err && err.stack || err));
        try { await h.screenshot('error-state'); } catch (_) {}
        h.dumpDiagnostics();
    } finally {
        await h.stop();
    }
    console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`);
    process.exit(failures === 0 ? 0 : 1);
}

main();
