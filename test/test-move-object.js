/*
 * Move-object test
 * ----------------
 * Verifies you can select a previously-placed object and move it:
 *   - Enter (in cursor mode, over an object) grabs it as the active instance,
 *   - moving relocates that same instance (no duplicate is created),
 *   - Space drops it back into the world at the new spot and returns to select.
 */

const { GameHarness } = require('./harness');

const OBJ = 'pr_door';
let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function placeOne(h, name, baseline) {
    for (let i = 0; i < 12; i++) {
        if ((await h.instanceCount(name)) > baseline) return;
        await h.tapKey(' ');
        await h.waitFrames(4);
    }
    throw new Error('placeOne: count never rose');
}

// World-space base-centre of the tracked instance (window.__moveTarget).
const centerOf = function () {
    const bm = window.app.activeMode;
    const bb = bm.computeWorldBBox(window.__moveTarget);
    const r = (v) => Math.round(v * 1000) / 1000;
    return bb ? { x: r(bb.center.x), y: r(bb.min.y), z: r(bb.center.z) } : null;
};

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', OBJ]);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFrames(5);

        // Place one door.
        const idx = await h.evaluate((n) => window.app.BuildableObjectList.findIndex((w) => w.name === n), OBJ);
        await h.evaluate((i) => window.app.selectBuildObject(i), idx);
        await h.waitFor((i) => window.app.activeMode.currentInstance &&
            window.app.activeMode.selectedObjectIndex === i, idx, 8000);
        await h.holdKey('w', 20);
        const base = await h.instanceCount(OBJ);
        await placeOne(h, OBJ, base);

        // Enter cursor mode (disposes the live preview, leaving just the placed one).
        await h.tapUntil('0', () => !window.app.activeMode.currentInstance);
        await h.waitFrames(3);
        const placedCount = await h.instanceCount(OBJ);
        await h.screenshot('before-move');

        // Track the placed instance and simulate hovering it, then grab with
        // SPACE -- the same key that places, per the one-thumb flow. The
        // selection must be re-set each attempt: tapUntil may retry, and a
        // cursor nudge between tries rebuilds the selection from intersection.
        await h.evaluate(() => {
            const bm = window.app.activeMode;
            window.__moveTarget = bm.placedInstances[0].inst;
            bm.selection = [window.__moveTarget];
        });
        const posBefore = await h.evaluate(centerOf);
        await h.tapUntil(' ', () => {
            const bm = window.app.activeMode;
            if (!bm.grabbed) bm.selection = [window.__moveTarget];
            return bm.grabbed && bm.currentInstance === window.__moveTarget;
        });
        await h.waitFrames(4);
        const grabbedInfo = await h.evaluate(() => ({
            grabbed: window.app.activeMode.grabbed,
            isTarget: window.app.activeMode.currentInstance === window.__moveTarget,
            count: 0,
        }));
        console.log('\n[1] grabbed', grabbedInfo, 'posBefore', posBefore);
        check('Space grabbed the placed object', grabbedInfo.grabbed && grabbedInfo.isTarget, grabbedInfo);
        check('grabbing did not duplicate the object', (await h.instanceCount(OBJ)) === placedCount,
            { placedCount, now: await h.instanceCount(OBJ) });

        // Move it, then drop it with Space.
        await h.holdKey('s', 26);
        await h.holdKey('d', 16);
        await h.waitFrames(3);
        const posMoved = await h.evaluate(centerOf);
        await h.tapUntil(' ', () => !window.app.activeMode.grabbed);
        await h.waitFrames(4);
        const posAfter = await h.evaluate(centerOf);
        const afterCount = await h.instanceCount(OBJ);
        await h.screenshot('after-move');

        const dist = Math.hypot(posAfter.x - posBefore.x, posAfter.z - posBefore.z);
        console.log('[2] dropped', { posBefore, posMoved, posAfter, afterCount, dist });
        check('the object actually moved', dist > 1.0, { posBefore, posAfter, dist });
        check('still exactly one object (moved, not duplicated)', afterCount === placedCount,
            { placedCount, afterCount });
        check('returned to select mode after dropping',
            (await h.evaluate(() => !window.app.activeMode.grabbed && !window.app.activeMode.currentInstance)) === true);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — a placed object can be selected, moved and dropped.'
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
