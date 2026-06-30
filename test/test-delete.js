/*
 * Delete test
 * -----------
 * Verifies build-mode object deletion: after placing an object, pressing Delete
 * removes the most recently placed object (quick undo), and the live instance
 * count drops accordingly.
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

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0' });
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

        // Select the door and place one (then a fresh preview auto-spawns).
        const idx = await h.evaluate((n) => window.app.BuildableObjectList.findIndex((w) => w.name === n), OBJ);
        await h.evaluate((i) => window.app.selectBuildObject(i), idx);
        await h.waitFor((i) => window.app.activeMode.currentInstance &&
            window.app.activeMode.selectedObjectIndex === i, idx, 8000);
        await h.holdKey('w', 24);
        const previewOnly = await h.instanceCount(OBJ);   // 1 (the preview)
        await placeOne(h, OBJ, previewOnly);
        const afterPlace = await h.instanceCount(OBJ);     // 2 (placed + new preview)
        const stackAfterPlace = await h.evaluate(() => window.app.activeMode.placedInstances.length);
        console.log('\n[1] placed', { previewOnly, afterPlace, stackAfterPlace });
        check('placing added an instance', afterPlace === previewOnly + 1, { previewOnly, afterPlace });
        check('placement was recorded for undo', stackAfterPlace === 1, { stackAfterPlace });

        // Delete -> removes the placed object (the live preview stays).
        await h.tapKey('Delete');
        await h.waitFrames(4);
        const afterDelete = await h.instanceCount(OBJ);
        const stackAfterDelete = await h.evaluate(() => window.app.activeMode.placedInstances.length);
        console.log('[2] deleted', { afterDelete, stackAfterDelete });
        check('Delete removed the placed object', afterDelete === afterPlace - 1, { afterPlace, afterDelete });
        check('undo stack emptied', stackAfterDelete === 0, { stackAfterDelete });

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — placed object can be removed with Delete.'
            : `RESULT: FAIL — ${failures} assertion(s) failed.`);
        console.log('========================================');
        if (h.pageErrors.length) h.dumpDiagnostics();
    } catch (err) {
        failures += 1;
        console.error('\nHARNESS ERROR:', err && err.stack ? err.stack : err);
        h.dumpDiagnostics();
    } finally {
        await h.stop();
    }
    process.exit(failures === 0 ? 0 : 1);
}

main();
