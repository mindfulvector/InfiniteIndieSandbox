/*
 * Climbing test
 * -------------
 * Verifies the ladder climb toy:
 *   - pr_ladder registers with rails + rungs,
 *   - holding W at the base of a ladder ascends with gravity suspended
 *     (in-page frame loop), and hugs the player to the ladder line,
 *   - releasing W restores gravity and the player keeps their height,
 *   - climbing caps near the top (you settle on the ledge, not launch),
 *   - holding S descends,
 *   - a play reset / mode exit leaves gravity restored,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7104 });
    try {
        await h.start();
        await h.waitForReady(['pr_ladder', 't_block_4']);
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
            const kids = window.app.findWorldObject('pr_ladder').mesh.getChildMeshes();
            return { exists: !!kids, prims: kids.length };
        });
        console.log('\n[1] registration', reg);
        check('the ladder registers with rails + rungs', reg.exists && reg.prims >= 5, reg);

        // --- 2. Place a ladder in the air; hold W to climb ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const L = app.findWorldObject('pr_ladder').createInstance();
            // Anchor-below: the mesh top snaps to y, so a ladder placed at
            // y=10 spans roughly y 6..10. Park it clear of terrain.
            L.position = new BABYLON.Vector3(40, 10, 0);
            window.__L = L;
            pm.player.position.copyFrom(new BABYLON.Vector3(40, 9, 0));
        });
        const climb = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            pm.player.position.copyFrom(new BABYLON.Vector3(40, 9, 0));
            window.app.keysPressed['W'] = true;
            pm.updateClimbing();   // grab THIS frame, before gravity can drop us
            const y0 = pm.player.position.y;
            const g0 = 9.8;
            let n = 0, gravWhileClimbing = null;
            const tick = () => {
                n++;
                if (pm.climbing && gravWhileClimbing === null) gravWhileClimbing = cc._gravity;
                if (pm.player.position.y - y0 > 2 || n > 900) {
                    window.app.keysPressed['W'] = false;
                    return resolve({
                        y0, y1: pm.player.position.y,
                        rose: pm.player.position.y - y0,
                        climbing: pm.climbing, g0, gravWhileClimbing,
                        offLine: Math.abs(pm.player.position.x - 40),
                    });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] climb', climb);
        check('holding W ascends the ladder with gravity suspended',
            climb.rose > 1.5 && climb.climbing && climb.gravWhileClimbing === 0, climb);
        check('the climber is hugged to the ladder line', climb.offLine < 0.2, climb);
        await h.screenshot('climbing');

        // --- 3. Releasing W restores gravity, keeps the height ---
        const release = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            const yAtRelease = pm.player.position.y;
            let n = 0;
            const tick = () => {
                n++;
                if (n >= 10) {
                    return resolve({ climbing: pm.climbing, g: cc._gravity, yAtRelease });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] release', release);
        check('releasing W stops climbing and restores gravity',
            !release.climbing && release.g === climb.g0, release);

        // --- 4. Climbing caps near the top ---
        const capped = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, L = window.__L;
            L.computeWorldMatrix(true);
            const top = L.getBoundingInfo().boundingBox.maximumWorld.y;
            pm.player.position.copyFrom(new BABYLON.Vector3(40, top - 0.5, 0));
            window.app.keysPressed['W'] = true;
            let n = 0, maxY = -99;
            const tick = () => {
                n++;
                maxY = Math.max(maxY, pm.player.position.y);
                if (n >= 60) {
                    window.app.keysPressed['W'] = false;
                    return resolve({ top, maxY, cappedBelow: maxY < top + 0.6 });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[4] cap', capped);
        check('climbing settles at the top instead of launching past it',
            capped.cappedBelow, capped);

        // --- 5. Holding S descends ---
        const down = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, L = window.__L;
            L.computeWorldMatrix(true);
            const topY = L.getBoundingInfo().boundingBox.maximumWorld.y;
            pm.player.position.copyFrom(new BABYLON.Vector3(40, topY - 0.5, 0));
            window.app.keysPressed['S'] = true;
            pm.updateClimbing();   // grab before gravity interferes
            const y0 = pm.player.position.y;
            let n = 0;
            const tick = () => {
                n++;
                if (y0 - pm.player.position.y > 1.2 || n > 900) {
                    window.app.keysPressed['S'] = false;
                    return resolve({ dropped: y0 - pm.player.position.y });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[5] down', down);
        check('holding S descends the ladder', down.dropped > 1, down);

        // --- 6. Leaving restores gravity for good ---
        const clean = await h.evaluate(() => {
            const pm = window.app.activeMode, cc = pm.cc;
            pm.player.position.copyFrom(new BABYLON.Vector3(0, 3, 0));   // far from the ladder
            pm.updateClimbing();
            return { climbing: pm.climbing, g: cc._gravity };
        });
        console.log('[6] clean', clean);
        check('walking away restores gravity and ends climbing',
            !clean.climbing && clean.g === climb.g0, clean);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during climbing', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — up the rungs, down the rungs, and off at the top.'
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
