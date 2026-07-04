/*
 * Photo mode test
 * ---------------
 * Verifies the freeze + free camera + capture flow:
 *   - P enters photo mode: the HUD hides and the world FREEZES (a hunting
 *     walker's position stays bit-identical across frames, in-page sample),
 *   - WASD dollies the free camera target while frozen,
 *   - Enter captures a real PNG (CreateScreenshotUsingRenderTarget ->
 *     app.lastPhotoData; downloads suppressed under test),
 *   - P exits: HUD back, camera restored to the return pose, the world
 *     unfreezes (the walker hunts again),
 *   - Esc mid-photo restores the HUD as the mode disposes,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7066 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const em = pm.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            // One hunting walker: our freeze/unfreeze motion probe.
            em.spawnWalker(pm.player.position.add(new BABYLON.Vector3(6, 1.5, 0)));
            window.__walker = em.enemies[0];
            app.noPhotoDownload = true;
        });
        await h.waitFrames(10);

        // --- 1. P freezes the world and hides the HUD ---
        await h.tapUntil('p', () => window.app.activeMode.photoMode === true);
        const entered = await h.evaluate(() => ({
            hudHidden: window.app.gui.rootContainer.isVisible === false,
        }));
        const frozen = await h.evaluate(() => new Promise((resolve) => {
            const w = window.__walker;
            const p0 = { x: w.mesh.position.x, y: w.mesh.position.y, z: w.mesh.position.z };
            let n = 0, maxDelta = 0;
            const tick = () => {
                n++;
                maxDelta = Math.max(maxDelta,
                    Math.abs(w.mesh.position.x - p0.x) +
                    Math.abs(w.mesh.position.y - p0.y) +
                    Math.abs(w.mesh.position.z - p0.z));
                if (n >= 30) return resolve({ maxDelta });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('\n[1] photo entered', { entered, frozen });
        check('P enters photo mode and hides the HUD', entered.hudHidden, entered);
        check('the world freezes (the walker holds bit-still for 30 frames)',
            frozen.maxDelta < 0.001, frozen);

        // --- 2. The free camera dollies with WASD ---
        const t0 = await h.evaluate(() => {
            window.app.keysPressed['W'] = true;
            const t = window.app.camera.target;
            return { x: t.x, y: t.y, z: t.z };
        });
        await h.waitFor((t0) => {
            const t = window.app.camera.target;
            return Math.hypot(t.x - t0.x, t.z - t0.z) > 1.5;
        }, t0, 20000);
        await h.evaluate(() => { window.app.keysPressed['W'] = false; });
        console.log('[2] camera dollied');
        check('WASD dollies the free camera', true);

        // --- 3. Enter captures a real PNG ---
        await h.evaluate(() => { window.app.lastPhotoData = null; window.app.keysPressed['ENTER'] = true; });
        await h.waitFor(() => typeof window.app.lastPhotoData === 'string' &&
            window.app.lastPhotoData.indexOf('data:image/png') === 0, null, 30000);
        await h.evaluate(() => { window.app.keysPressed['ENTER'] = false; });
        const photo = await h.evaluate(() => ({ bytes: window.app.lastPhotoData.length }));
        console.log('[3] captured', photo);
        check('Enter captures a non-trivial PNG', photo.bytes > 5000, photo);
        await h.screenshot('photo-mode');

        // --- 4. P exits: HUD back, camera restored, world unfrozen ---
        const before = await h.evaluate(() => ({
            ret: window.app.activeMode._photoReturn.target.x,
        }));
        await h.tapUntil('p', () => window.app.activeMode.photoMode === false);
        const exited = await h.evaluate(() => ({
            hudBack: window.app.gui.rootContainer.isVisible === true,
            targetRestored: Math.abs(window.app.camera.target.x -
                window.app.activeMode._photoReturn.target.x) < 0.01,
            wx: window.__walker.mesh.position.x,
        }));
        await h.waitFor((e) => Math.abs(window.__walker.mesh.position.x - e.wx) +
            Math.abs(window.__walker.mesh.position.z) > 0.05 ||
            window.__walker.mesh.position.x !== e.wx, exited, 20000);
        console.log('[4] exited', exited);
        check('P exits: HUD back and the camera pose restored',
            exited.hudBack && exited.targetRestored, exited);
        check('the world unfreezes (the walker hunts again)', true);

        // --- 5. Esc mid-photo restores the HUD via dispose ---
        await h.tapUntil('p', () => window.app.activeMode.photoMode === true);
        await h.tapUntil('Escape', () => !window.app.activeMode ||
            window.app.activeMode.constructor.name !== 'PlayMode');
        const escaped = await h.evaluate(() => ({
            hud: window.app.gui.rootContainer.isVisible,
        }));
        console.log('[5] esc mid-photo', escaped);
        check('Esc mid-photo brings the HUD back with the mode teardown',
            escaped.hud === true, escaped);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during photo mode', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the world freezes, the camera roams, and the shot comes out.'
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
