/*
 * Gamepad abstraction test
 * ------------------------
 * Verifies the pad input layer without hardware:
 *   - handlePadButton routes every PAD_MAP entry to the right action flag
 *     (edge actions to padActions, held actions to padHeld) and returns the
 *     action name; unmapped buttons return null and set nothing,
 *   - the left stick (injected via app.testPad) drives the character through
 *     the controller's real key handlers: forward moves the player,
 *   - hysteresis holds the key between the press (0.45) and release (0.30)
 *     thresholds, and releases below it (movement stops),
 *   - the right stick orbits the camera (alpha changes; beta stays clamped),
 *   - pad jump (held A) starts a controller jump; releasing ends the hold,
 *   - right-stick click acquires lock-on through the real consume path,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7043 });
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
        });
        await h.waitFrames(15);

        // --- 1. The PAD_MAP routes every button to its action ---
        const map = await h.evaluate(() => {
            const app = window.app;
            app.padActions = {}; app.padHeld = {};
            const out = {};
            out.melee = app.handlePadButton(2, true);       // X
            out.dodge = app.handlePadButton(1, true);       // B
            out.special = app.handlePadButton(3, true);     // Y
            out.ranged = app.handlePadButton(5, true);      // RB
            out.lock = app.handlePadButton(11, true);       // right-stick click
            out.blockDown = app.handlePadButton(4, true);   // LB hold
            out.blockHeld = app.padDown('block');
            out.blockUp = app.handlePadButton(4, false);
            out.blockReleased = !app.padDown('block');
            out.jumpDown = app.handlePadButton(0, true);    // A hold
            out.jumpHeld = app.padDown('jump');
            app.handlePadButton(0, false);
            out.unmapped = app.handlePadButton(8, true);    // Back: unmapped
            out.actions = Object.keys(app.padActions).filter((k) => app.padActions[k]).sort();
            return out;
        });
        console.log('\n[1] pad map', map);
        check('every mapped button routes to its action name',
            map.melee === 'meleeAttack' && map.dodge === 'dodge' && map.special === 'special' &&
            map.ranged === 'rangedAttack' && map.lock === 'lockOn', map);
        check('held actions toggle padHeld on down/up',
            map.blockDown === 'block' && map.blockHeld && map.blockReleased &&
            map.jumpDown === 'jump' && map.jumpHeld, map);
        check('edge actions land in padActions',
            JSON.stringify(map.actions) === JSON.stringify(['dodge', 'lockOn', 'meleeAttack', 'rangedAttack', 'special']), map);
        check('unmapped buttons return null', map.unmapped === null, map);
        await h.evaluate(() => { window.app.padActions = {}; window.app.padHeld = {}; });

        // --- 2. Left stick forward moves the player (real key handlers) ---
        const p0 = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.testPad = { leftStick: { x: 0, y: -1 }, rightStick: { x: 0, y: 0 } };
            return { x: pm.player.position.x, z: pm.player.position.z };
        });
        await h.waitFrames(20);
        const p1 = await h.evaluate(() => {
            const pm = window.app.activeMode;
            return { x: pm.player.position.x, z: pm.player.position.z, w: pm._padKeys.w };
        });
        const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
        console.log('[2] stick forward', { p0, p1, moved });
        check('a full-forward stick moves the player (> 0.3 units)', moved > 0.3 && p1.w === true, { moved, p1 });

        // --- 3. Hysteresis: 0.35 deflection HOLDS an active key, then 0.1 releases ---
        await h.evaluate(() => { window.app.testPad.leftStick = { x: 0, y: -0.35 }; });
        await h.waitFrames(6);
        const held = await h.evaluate(() => window.app.activeMode._padKeys.w);
        await h.evaluate(() => { window.app.testPad.leftStick = { x: 0, y: -0.1 }; });
        await h.waitFrames(6);
        const released = await h.evaluate(() => window.app.activeMode._padKeys.w);
        console.log('[3] hysteresis', { held, released });
        check('a 0.35 deflection holds the key (between release 0.30 and press 0.45)', held === true, { held });
        check('dropping under the release threshold lets go', released === false, { released });

        // --- 4. Right stick orbits the camera; beta stays clamped ---
        const cam0 = await h.evaluate(() => ({ alpha: window.app.camera.alpha, beta: window.app.camera.beta }));
        await h.evaluate(() => { window.app.testPad.rightStick = { x: 1, y: 1 }; });
        await h.waitFrames(15);
        const cam1 = await h.evaluate(() => ({ alpha: window.app.camera.alpha, beta: window.app.camera.beta }));
        await h.evaluate(() => { window.app.testPad.rightStick = { x: 0, y: 0 }; });
        console.log('[4] camera', { cam0, cam1 });
        check('the right stick orbits the camera (alpha changed)', cam1.alpha < cam0.alpha - 0.02, { cam0, cam1 });
        check('the camera pitch stays inside its clamp', cam1.beta >= 0.35 - 1e-6 && cam1.beta <= 1.45 + 1e-6, cam1);

        // --- 5. Pad jump: held A starts a controller jump ---
        const jump = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.handlePadButton(0, true);   // press and hold A
            return { y0: pm.player.position.y };
        });
        await h.waitFrames(8);
        const jumped = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.handlePadButton(0, false);  // release
            return { y: pm.player.position.y, jumping: pm.cc._act._jump };
        });
        console.log('[5] pad jump', { jump, jumped });
        check('a held A press starts a jump (rising or mid-jump)',
            jumped.jumping === true || jumped.y > jump.y0 + 0.2, { jump, jumped });

        // --- 6. Right-stick click acquires lock-on via the consume path ---
        await h.waitFor(() => !window.app.activeMode.cc._act._jump, null, 20000);   // land first
        const lock = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const wo = app.findWorldObject('en_blob');
            const blob = wo.createInstance();
            blob.hp = 5;
            blob.position = pm.player.position.add(new BABYLON.Vector3(4, 1.3, 0));
            pm.clearLockOn();
            app.handlePadButton(11, true);   // right-stick click
            return { queued: !!app.padActions.lockOn };
        });
        await h.waitFor(() => !!window.app.activeMode.lockTarget, null, 20000);
        console.log('[6] pad lock-on', lock);
        check('right-stick click acquires lock-on', true);

        // --- 7. No unexpected page errors ---
        await h.evaluate(() => { window.app.testPad = null; });
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during gamepad emulation', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the pad map routes cleanly and sticks drive movement, camera, jump, and lock-on.'
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
