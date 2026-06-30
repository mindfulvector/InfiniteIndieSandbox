/*
 * Building-feature test
 * ---------------------
 * Verifies the core promise of the sandbox: a player can create a NEW sandbox
 * world and PLACE objects within it.
 *
 * It walks the real game flow a player would use:
 *   Main menu  ->  New Game (creates SandboxWorld, drops terrain cube at origin)
 *              ->  Play mode (avatar in the fresh world)
 *   Esc / Pause ->  Build mode
 *   Build mode ->  select an object, move it, place it (x2)
 *   Esc / Pause ->  Play mode (walk among the placed objects)
 *
 * Each milestone is asserted against game state AND captured as a screenshot
 * under test/screenshots/ so the result can be eyeballed.
 *
 * Exit code 0 = all assertions passed, non-zero = failure.
 */

const { GameHarness } = require('./harness');

// We build with a primitive object (`pr_door`) because primitives are
// registered synchronously and never depend on remote/network assets, which
// keeps the test deterministic on an isolated CI box.
const BUILD_OBJECT = 'pr_door';

// Press Space once to commit the current placement preview, and confirm the
// commit "took" by watching the live instance count rise above `baseline`.
// (Space also auto-spawns the next preview, so the count goes baseline -> +1.)
async function placeOne(h, objectName, baseline) {
    for (let i = 0; i < 12; i++) {
        if ((await h.instanceCount(objectName)) > baseline) return;
        await h.tapKey(' ');
        await h.waitFrames(4);
    }
    if ((await h.instanceCount(objectName)) > baseline) return;
    throw new Error(`placeOne: ${objectName} count never rose above ${baseline}`);
}

let failures = 0;
function check(label, cond, extra) {
    if (cond) {
        console.log(`  PASS  ${label}`);
    } else {
        failures += 1;
        console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`);
    }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0' });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', BUILD_OBJECT]);

        // --- 1. Main menu -----------------------------------------------------
        let s = await h.getState();
        console.log('\n[1] Main menu', s);
        await h.screenshot('main-menu');
        check('boots to MENU_MAIN (state 1)', s.menuState === 1, s);
        check('object library registered', s.objectTypes >= 2, s);
        check('no world yet', s.hasWorld === false, s);

        // --- 2. New Game -> Play mode in a fresh sandbox ----------------------
        // Press "1" the same way a player does; App.update() consumes it. Retry
        // until the New Game actually takes (robust against frame-timing races).
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' &&
            window.app.menu.state === 0);
        // Wait for the avatar/character controller to finish loading so the
        // world is fully realised before we screenshot and leave the mode.
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(10);
        s = await h.getState();
        console.log('\n[2] New sandbox / Play mode', s);
        await h.screenshot('play-mode-new-sandbox');
        check('a SandboxWorld was created', s.hasWorld === true, s);
        check('entered PlayMode', s.activeMode === 'PlayMode', s);
        check('origin terrain cube spawned', (s.instanceCounts.t_cube_1x1 || 0) >= 1, s);

        // --- 3. Pause -> Build mode ------------------------------------------
        // Esc from the HUD opens the pause menu (and tears down PlayMode).
        await h.tapUntil('Escape', () => window.app.menu.state === 2 /* MENU_PAUSE */);
        await h.waitFrames(3);
        await h.screenshot('pause-menu');
        // "1" selects Build Mode from the pause menu.
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' &&
            window.app.menu.state === 0);
        await h.waitFrames(5);
        s = await h.getState();
        console.log('\n[3] Build mode', s);
        await h.screenshot('build-mode');
        check('entered BuildMode', s.activeMode === 'BuildMode', s);

        const before = await h.instanceCount(BUILD_OBJECT);
        check(`${BUILD_OBJECT} has no instances yet`, before === 0, { before });

        // --- 4. Select the build object --------------------------------------
        // Point the selector one slot *before* our target, then press E so the
        // real BuildMode.update() cycles onto it and spawns a floating preview.
        await h.evaluate((name) => {
            const list = window.app.BuildableObjectList;
            const idx = list.findIndex((wo) => wo.name === name);
            window.__targetIdx = idx;
            window.app.activeMode.selectedObjectIndex = (idx - 1 + list.length) % list.length;
        }, BUILD_OBJECT);
        await h.tapUntil('ArrowRight', () => window.app.activeMode.currentInstance &&
            window.app.activeMode.selectedObjectIndex === window.__targetIdx);
        await h.waitFrames(5);
        s = await h.getState();
        console.log('\n[4] Object selected for placement', s);
        await h.screenshot('object-selected');
        check('a floating placement preview exists', s.hasCurrentInstance === true, s);
        check('selector landed on target object',
            s.buildSelectedIndex === (await h.evaluate(() => window.__targetIdx)), s);

        // --- 5. Move the object, then place it (Space) -----------------------
        const startPos = await h.evaluate(() => {
            const p = window.app.activeMode.currentInstance.position;
            return { x: p.x, y: p.y, z: p.z };
        });
        await h.holdKey('w', 28);    // drive it away from the origin
        await h.holdKey('d', 18);
        await h.tapKey('c');         // rotate 45 deg to prove rotation works
        await h.waitFrames(3);
        const movedPos = await h.evaluate(() => {
            const p = window.app.activeMode.currentInstance.position;
            return { x: p.x, y: p.y, z: p.z };
        });
        const moveDist = Math.hypot(movedPos.x - startPos.x, movedPos.z - startPos.z);
        check('object moved from its spawn position', moveDist > 0.5, { startPos, movedPos, moveDist });
        await h.screenshot('object-moved');

        // Pressing Space PLACES the current object and immediately spawns a
        // fresh preview for the next one (rapid-build flow), so the signal that
        // a placement "took" is the live instance count going up by one.
        const countBeforePlace1 = await h.instanceCount(BUILD_OBJECT); // 1 (the preview)
        await placeOne(h, BUILD_OBJECT, countBeforePlace1);
        const afterFirst = await h.instanceCount(BUILD_OBJECT);
        s = await h.getState();
        console.log('\n[5] First object placed', { afterFirst, ...s });
        await h.screenshot('object-placed-1');
        check('placing committed an object (instance count grew)',
            afterFirst === countBeforePlace1 + 1, { countBeforePlace1, afterFirst });
        check('a fresh placement preview is ready for the next object',
            s.hasCurrentInstance === true, s);

        // --- 6. Place a second object to prove repeat placement --------------
        await h.holdKey('s', 24);    // move the fresh preview the other way
        await h.holdKey('a', 18);
        await h.waitFrames(3);
        const countBeforePlace2 = await h.instanceCount(BUILD_OBJECT);
        await placeOne(h, BUILD_OBJECT, countBeforePlace2);
        const afterSecond = await h.instanceCount(BUILD_OBJECT);
        console.log('\n[6] Second object placed', { afterSecond });
        await h.screenshot('object-placed-2');
        check('a second object was committed',
            afterSecond === countBeforePlace2 + 1, { countBeforePlace2, afterSecond });

        // --- 7. Back to Play mode to walk the built scene --------------------
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('2', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode');
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(10);
        s = await h.getState();
        console.log('\n[7] Play mode with built objects', s);
        await h.screenshot('play-mode-with-built-objects');
        check('returned to PlayMode', s.activeMode === 'PlayMode', s);
        check('built objects persist into play', (s.instanceCounts[BUILD_OBJECT] || 0) >= 2, s);

        // --- summary ----------------------------------------------------------
        console.log('\n========================================');
        if (failures === 0) {
            const persisted = s.instanceCounts[BUILD_OBJECT] || 0;
            console.log(`RESULT: PASS — created a sandbox and placed ${persisted} objects that persist into play.`);
        } else {
            console.log(`RESULT: FAIL — ${failures} assertion(s) failed.`);
        }
        console.log('Screenshots in test/screenshots/');
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
