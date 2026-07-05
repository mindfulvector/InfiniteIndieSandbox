/*
 * Kart speed + boost test
 * -----------------------
 * The kart got faster (accel 14 vs the old 12) and gained a Shift-held
 * BOOST burst (boostMax/boostAccel on the vehicle profile). Verifies:
 *   - walking up mounts the kart and the rider is hidden completely,
 *   - W throttle settles at the base cruise speed (accel/drag equilibrium),
 *   - holding Shift bursts well past the base cruise (and flags _boosting),
 *   - releasing Shift decays back toward base cruise,
 *   - Space hops out and the rider becomes visible again,
 *   - no unexpected page errors.
 * Speeds are read from inst._kartSpeed (the seat's internal momentum), so
 * terrain bumps can't make the numbers flaky.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7155 });
    try {
        await h.start();
        await h.waitForReady(['pr_kart']);
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

        // --- 1. Mount: walk up, rider vanishes ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const kart = app.findWorldObject('pr_kart').createInstance();
            kart.position = pm.player.position.add(new BABYLON.Vector3(4, 0.8, 0));
            window.__K = kart;
            kart.script._wasPlay = null;
        });
        await h.waitFrames(5);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__K.position.add(new BABYLON.Vector3(0.5, 1.0, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__K, null, 20000);
        const rider = await h.evaluate(() => {
            const p = window.app.activeMode.player;
            return [p].concat(p.getChildMeshes()).filter((m) => m.isVisible).length;
        });
        console.log('[1] mounted', { visibleRiderMeshes: rider });
        check('mounting hides the rider completely', rider === 0, { visibleMeshes: rider });

        // --- 2. Base cruise: W throttle, no Shift ---
        const base = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['W'] = true;
            const K = window.__K;
            let n = 0, top = 0;
            const tick = () => {
                n++;
                top = Math.max(top, K._kartSpeed || 0);
                if (n >= 70) return resolve({ top, boosting: !!K._boosting });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] base cruise', base);
        check('base cruise settles near accel/drag (~6.4)',
            base.top > 5 && base.top < 7.5 && !base.boosting, base);

        // --- 3. Shift boost: bursts well past base cruise ---
        const boost = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['SHIFT'] = true;
            const K = window.__K;
            let n = 0, top = 0, flagged = false;
            const tick = () => {
                n++;
                top = Math.max(top, K._kartSpeed || 0);
                flagged = flagged || !!K._boosting;
                if (n >= 70) return resolve({ top, flagged });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] boost', boost);
        check('Shift boost bursts well past base cruise', boost.top > base.top + 1.5, boost);
        check('the seat flags the burst (_boosting)', boost.flagged === true, boost);
        await h.screenshot('kart-boosting');

        // --- 4. Releasing Shift decays back toward base cruise ---
        await h.evaluate(() => { window.app.keysPressed['SHIFT'] = false; });
        await h.waitFor((baseTop) => (window.__K._kartSpeed || 0) < baseTop + 0.5, base.top, 20000);
        console.log('[4] decayed');
        check('releasing Shift decays back toward base cruise', true);

        // --- 5. Space hops out, rider returns ---
        await h.evaluate(() => {
            window.app.keysPressed['W'] = false;
            window.app.keysPressed[' '] = true;
        });
        await h.waitFor(() => window.app.activeMode.driving === null, null, 20000);
        await h.evaluate(() => { window.app.keysPressed[' '] = false; });
        const back = await h.evaluate(() => {
            const p = window.app.activeMode.player;
            return {
                rootVisible: p.isVisible,
                anyChildVisible: p.getChildMeshes().some((m) => m.isVisible),
            };
        });
        console.log('[5] dismounted', back);
        check('hopping out restores the rider', back.rootVisible || back.anyChildVisible, back);

        // --- 6. Hygiene ---
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
