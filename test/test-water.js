/*
 * Water blocks test
 * -----------------
 * Verifies swim volumes:
 *   - t_water preps itself: translucent shared material, no collisions,
 *     not pickable (shots pass through, the ground ray ignores it),
 *   - entering the volume starts swimming: gravity drops, walk slows,
 *   - sinking through water is far slower than free fall (paired in-page
 *     descent measurements),
 *   - holding Space strokes upward, capped under the surface,
 *   - leaving the water restores gravity and speeds exactly,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7092 });
    try {
        await h.start();
        await h.waitForReady(['t_water']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            // A floating 2x2x2-block pool up in the air: clean measurements,
            // no terrain interference. Blocks are anchor-below (top at y).
            const wo = window.app.findWorldObject('t_water');
            for (const dx of [0, 2]) for (const dz of [0, 2]) for (const dy of [0, 2]) {
                const w = wo.createInstance();
                w.position = new BABYLON.Vector3(20 + dx, 8 + dy, dz);
            }
            // Raw instances are CENTERED boxes (build-mode anchoring does
            // not apply): the pool spans x 19..23, y 7..11, z -1..3. Park
            // measurements INSIDE a block, off the seams -- strict
            // containment excludes exact boundaries.
            window.__W = { top: 11, cx: 20.5, cz: 0.5 };
        });
        await h.waitFrames(6);

        // --- 1. Water preps: translucent, intangible, unpickable ---
        const prep = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const w = window.app.findWorldObject('t_water').instances.filter(Boolean)[0];
            return {
                alpha: w.material.alpha,
                collide: w.checkCollisions,
                pickable: w.isPickable,
                shotPasses: !pm.projectileBlocked(
                    new BABYLON.Vector3(17, 8.5, 1), new BABYLON.Vector3(4, 0, 0)),
            };
        });
        console.log('\n[1] water prep', prep);
        check('water is translucent, intangible, and lets shots pass',
            prep.alpha < 0.6 && !prep.collide && !prep.pickable && prep.shotPasses, prep);

        // --- 2. Entering starts swimming; sinking is slow ---
        const swim = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            const g0 = cc._gravity, walk0 = cc._actionMap.walk.speed;
            pm.player.position.copyFrom(new BABYLON.Vector3(window.__W.cx, 9.2, window.__W.cz));
            let n = 0, y0 = null, sank = 0;
            const tick = () => {
                n++;
                if (pm.swimming && y0 === null) y0 = pm.player.position.y;
                if (y0 !== null && n >= 40) {
                    sank = y0 - pm.player.position.y;
                    return resolve({
                        swimming: pm.swimming, g0, walk0,
                        g: cc._gravity, walk: cc._actionMap.walk.speed,
                        sank: Math.round(sank * 100) / 100,
                    });
                }
                if (n > 900) return resolve({ swimming: pm.swimming, timeout: true });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] swimming', swim);
        check('entering water starts swimming (low gravity, slowed walk)',
            swim.swimming && swim.g === 1.5 && swim.walk < swim.walk0, swim);
        check('sinking through water is gentle (well under a metre in the window)',
            swim.sank !== undefined && swim.sank < 1.0, swim);
        await h.screenshot('swimming');

        // --- 3. Held Space strokes upward, capped under the surface ---
        const stroke = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode;
            // Re-park inside the pool: the CDP gap since section 2 is long
            // enough (wall-clock) to have sunk out of the volume entirely.
            pm.player.position.copyFrom(new BABYLON.Vector3(window.__W.cx, 8.4, window.__W.cz));
            const y0 = 8.4;
            window.app.keysPressed[' '] = true;
            let n = 0, maxY = -99;
            const tick = () => {
                n++;
                maxY = Math.max(maxY, pm.player.position.y);
                if (n >= 120) {
                    window.app.keysPressed[' '] = false;
                    return resolve({
                        rose: maxY - y0 > 0.4,
                        cappedUnderTop: maxY + 1.0 < window.__W.top + 0.6,
                    });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] stroke', stroke);
        check('holding Space strokes upward, treading under the surface',
            stroke.rose && stroke.cappedUnderTop, stroke);

        // --- 4. Leaving restores gravity and speeds ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(new BABYLON.Vector3(0, 3, 0));   // back on land
        });
        await h.waitFor(() => window.app.activeMode.swimming === false, null, 20000);
        const dry = await h.evaluate(() => ({
            g: window.app.activeMode.cc._gravity,
            walk: window.app.activeMode.cc._actionMap.walk.speed,
        }));
        console.log('[4] dry land', { dry, was: { g: swim.g0, walk: swim.walk0 } });
        check('leaving the water restores gravity and speeds exactly',
            dry.g === swim.g0 && Math.abs(dry.walk - swim.walk0) < 0.001, { dry, swim });

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during water', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — water holds you gently, strokes lift you, and dry land is dry.'
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
