/*
 * Vertical grid-snap test
 * -----------------------
 * Build mode auto-snaps a grabbed object to the grid when you stop moving it.
 * Horizontal (x/z) always did; HEIGHT (y, via R/V raise-lower) used to be
 * left off-grid. Verifies:
 *   - a grabbed object left at a NON-integer height settles onto the nearest
 *     grid multiple (y snaps), matching how x/z snap,
 *   - x/z still snap (no regression),
 *   - snap mode / active dragging still suspends the pull (not asserted
 *     destructively here; covered by the existing snap test),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7151 });
    try {
        await h.start();
        await h.waitForReady(['t_block_2']);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // Grab a block as the active (placement) instance and park it at a
        // non-integer position on all axes, snap mode off.
        await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_2');
            bm.snapLatch = false;
            const inst = wo.createInstance();
            inst.position = new BABYLON.Vector3(4.37, 3.42, 6.61);
            bm.currentInstance = inst;
            bm.currentWorldObject = wo;
            bm.grabbed = true;
            bm.selectedObjectIndex = app.BuildableObjectList.indexOf(wo);
            bm.targetScale = 1; bm.initialScale = 1;
            bm.targetPosition = new BABYLON.Vector3(4.37, 3.42, 6.61);
            window.__V = { inst };
        });

        // Let the idle grid-snap lerp run (no movement keys held) until y settles.
        await h.waitFor(() => {
            const bm = window.app.activeMode;
            if (!bm.targetPosition) return false;
            return Math.abs(bm.targetPosition.y - Math.round(bm.targetPosition.y)) < 0.02;
        }, null, 15000);

        const snapped = await h.evaluate(() => {
            const bm = window.app.activeMode, tp = bm.targetPosition;
            return { x: tp.x, y: tp.y, z: tp.z,
                yOnGrid: Math.abs(tp.y - Math.round(tp.y)) < 0.05,
                xOnGrid: Math.abs(tp.x - Math.round(tp.x)) < 0.05,
                zOnGrid: Math.abs(tp.z - Math.round(tp.z)) < 0.05 };
        });
        console.log('\n[1] snapped', snapped);
        check('a grabbed object\'s HEIGHT snaps to the grid when idle (y on a grid multiple)',
            snapped.yOnGrid, snapped);
        check('x and z still snap to the grid (no regression)',
            snapped.xOnGrid && snapped.zOnGrid, snapped);
        await h.screenshot('vertical-snap');

        // --- No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during vertical snap', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — raise/lower now settles onto the grid like horizontal moves.'
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
