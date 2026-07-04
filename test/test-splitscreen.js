/*
 * Split-screen test
 * -----------------
 * Verifies the automatic co-op split:
 *   - with the buddy far away (on real ground, so the rescue tether can't
 *     yank it back), the view splits: two active cameras at half-width
 *     viewports, the buddy camera locked on the buddy,
 *   - the fullscreen HUD is masked OUT of the buddy pane (layer masks),
 *   - hysteresis: drifting back inside the merge band but above the merge
 *     threshold keeps the split,
 *   - reuniting merges back to one full-width camera,
 *   - the buddy leaving mid-split tears the split down cleanly,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7056 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            // A landing pad far east so the roaming buddy has real ground
            // (off-world falls trip the rescue tether and merge the split).
            const wo = window.app.findWorldObject('t_tile');
            for (let gx = 13; gx <= 16; gx++) {
                for (let gz = -1; gz <= 1; gz++) {
                    const t = wo.createInstance();
                    t.position = new BABYLON.Vector3(gx * 2, 0, gz * 2);
                    t.checkCollisions = true;
                }
            }
        });
        await h.waitFrames(10);
        await h.tapUntil('b', () => !!window.app.activeMode.buddy);

        // --- 1. Far apart on solid ground: the view splits ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddy.root.position = new BABYLON.Vector3(29, 1.5, 0);   // on the pad, sep ~30
            pm.buddy.body.vy = 0;
        });
        await h.waitFor(() => window.app.activeMode._split === true, null, 20000);
        await h.waitFrames(8);
        const split = await h.evaluate(() => {
            const pm = window.app.activeMode, scene = window.app.scene;
            return {
                cams: scene.activeCameras ? scene.activeCameras.length : 0,
                mainW: window.app.camera.viewport.width,
                buddyW: pm._buddyCam.viewport.width,
                buddyX: pm._buddyCam.viewport.x,
                locked: pm._buddyCam.lockedTarget === pm.buddy.root,
                guiMasked: (window.app.gui.layer.layerMask & pm._buddyCam.layerMask) === 0,
                guiInMain: (window.app.gui.layer.layerMask & window.app.camera.layerMask) !== 0,
            };
        });
        console.log('\n[1] split', split);
        check('two active cameras at half-width viewports',
            split.cams === 2 && split.mainW === 0.5 && split.buddyW === 0.5 && split.buddyX === 0.5, split);
        check('the buddy camera is locked on the buddy', split.locked, split);
        check('the HUD renders only in P1\'s pane (layer masks)',
            split.guiMasked && split.guiInMain, split);
        await h.screenshot('split-screen');

        // --- 2. Hysteresis: inside 26 but above 18 keeps the split ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddy.root.position = pm.player.position.add(new BABYLON.Vector3(22, 0.5, 0));
            pm.buddy.body.vy = 0;
        });
        await h.waitFrames(10);
        const held = await h.evaluate(() => window.app.activeMode._split);
        console.log('[2] hysteresis', { held });
        check('a 22-unit separation keeps the split (merge needs < 18)', held === true, { held });

        // --- 3. Reuniting merges back to one full camera ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddy.root.position = pm.player.position.add(new BABYLON.Vector3(2, 0.5, 0));
            pm.buddy.body.vy = 0;
        });
        await h.waitFor(() => window.app.activeMode._split === false, null, 20000);
        const merged = await h.evaluate(() => ({
            cams: window.app.scene.activeCameras ? window.app.scene.activeCameras.length : 0,
            active: window.app.scene.activeCamera === window.app.camera,
            mainW: window.app.camera.viewport.width,
        }));
        console.log('[3] merged', merged);
        check('reuniting merges to one full-width camera',
            merged.cams === 0 && merged.active && merged.mainW === 1, merged);

        // --- 4. Leaving mid-split tears down cleanly ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddy.root.position = new BABYLON.Vector3(29, 1.5, 0);
            pm.buddy.body.vy = 0;
        });
        await h.waitFor(() => window.app.activeMode._split === true, null, 20000);
        const left = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddyLeave();
            return {
                split: pm._split,
                cam: pm._buddyCam,
                mainW: window.app.camera.viewport.width,
                active: window.app.scene.activeCamera === window.app.camera,
            };
        });
        console.log('[4] leave mid-split', left);
        check('the buddy leaving mid-split merges and frees the camera',
            !left.split && left.cam === null && left.mainW === 1 && left.active, left);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during split-screen', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the view splits apart and merges together with the players.'
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
