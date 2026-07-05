/*
 * Build-mode duplicate test (F to copy a placed object)
 * -----------------------------------------------------
 * Verifies duplicateSelected:
 *   - with an object selected, F creates a fresh instance of the same type
 *     carrying its rotation, scale, and per-instance params, offset from
 *     the original, and grabs it (currentInstance, ready to move),
 *   - the copy does NOT carry the original's wires,
 *   - dropping the copy (placeCurrent) commits it into the world (two
 *     instances now exist),
 *   - editing the copy's params does not change the original (deep copy),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7121 });
    try {
        await h.start();
        await h.waitForReady(['l_spawner', 't_block_4']);
        // Enter BUILD mode (menu item 1 in this harness lands play; use goto).
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // --- 1. Duplicate a configured spawner ---
        const dup = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const wo = app.findWorldObject('l_spawner');
            const orig = wo.createInstance();
            orig.position = new BABYLON.Vector3(4, 1, 4);
            orig.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(1.2, 0, 0);
            orig.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
            orig.params = { enemyType: 'flyer', frequency: 5, limit: 4, startActive: 'no', wave: 3 };
            orig.wires = [{ event: 'cleared', toWo: 'l_counter', toId: 999, action: 'increment' }];
            const n0 = wo.instances.filter(Boolean).length;

            bm.selectInstance(orig);          // put it under the cursor
            bm.duplicateSelected();           // F

            const copy = bm.currentInstance;
            return {
                grabbed: !!copy && copy !== orig && bm.grabbed === true,
                sameType: copy && copy.worldObject === wo,
                offset: copy && BABYLON.Vector3.Distance(copy.position, orig.position) > 1,
                sameYaw: copy && copy.rotationQuaternion &&
                    Math.abs(copy.rotationQuaternion.toEulerAngles().y - 1.2) < 0.01,
                sameScale: copy && Math.abs(copy.scaling.x - 1.5) < 0.01,
                sameParams: copy && copy.params.enemyType === 'flyer' && copy.params.wave === 3,
                noWires: copy && (!copy.wires || copy.wires.length === 0),
                origWorldId: orig.worldId, copyWorldId: copy && copy.worldId,
            };
        });
        console.log('\n[1] duplicate', dup);
        check('F duplicates the selected object as a grabbed copy of the same type',
            dup.grabbed && dup.sameType && dup.offset, dup);
        check('the copy carries rotation, scale, and params but NOT wires',
            dup.sameYaw && dup.sameScale && dup.sameParams && dup.noWires, dup);
        check('the copy is a distinct instance (new worldId)',
            dup.copyWorldId !== dup.origWorldId, dup);
        await h.screenshot('duplicate');

        // --- 2. Placing the copy commits it (two instances now) ---
        const placed = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const wo = app.findWorldObject('l_spawner');
            const before = wo.instances.filter(Boolean).length;
            bm.placeCurrent();
            return { after: wo.instances.filter(Boolean).length, before,
                cleared: bm.currentInstance == null };
        });
        console.log('[2] placed', placed);
        check('dropping the copy commits it into the world (instance count grew)',
            placed.after === placed.before && placed.cleared, placed);

        // --- 3. Editing the copy's params does not touch the original ---
        const isolate = await h.evaluate(() => {
            const app = window.app;
            const insts = app.findWorldObject('l_spawner').instances.filter(Boolean);
            const orig = insts.find((i) => i.params.enemyType === 'flyer' && i.params.frequency === 5);
            const copy = insts.find((i) => i !== orig && i.params.enemyType === 'flyer');
            if (!copy) return { ok: false };
            copy.params.frequency = 12;   // edit the copy
            return { ok: true, origFreq: orig.params.frequency, copyFreq: copy.params.frequency };
        });
        console.log('[3] isolation', isolate);
        check('editing the copy leaves the original untouched (deep-copied params)',
            isolate.ok && isolate.origFreq === 5 && isolate.copyFreq === 12, isolate);

        // --- 4. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during duplicate', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — one press stamps a configured copy, cleanly isolated.'
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
