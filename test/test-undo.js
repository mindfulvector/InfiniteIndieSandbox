/*
 * Build-mode undo test (U un-deletes)
 * -----------------------------------
 * Verifies undoDelete:
 *   - deleting the last placed object then pressing U restores it (params
 *     and wires intact),
 *   - deleting a multi-object selection and undoing restores all of them,
 *   - the restored object is a real, collidable world instance,
 *   - undo with an empty history is a safe no-op,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7122 });
    try {
        await h.start();
        await h.waitForReady(['l_spawner', 't_block_4']);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // --- 1. Empty history undo is a safe no-op ---
        const empty = await h.evaluate(() => {
            const bm = window.app.activeMode;
            bm._deleteHistory = [];
            bm.undoDelete();   // nothing to undo
            return { ok: true };
        });
        check('undo with an empty history is a safe no-op', empty.ok, empty);

        // --- 2. Delete the last placed object, then U restores it ---
        const single = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const wo = app.findWorldObject('l_spawner');
            const inst = wo.createInstance();
            inst.position = new BABYLON.Vector3(6, 1, 6);
            inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0.9, 0, 0);
            inst.params = { enemyType: 'flyer', frequency: 8, limit: 5, startActive: 'no', wave: 4 };
            inst.wires = [{ event: 'cleared', toWo: 'l_counter', toId: 42, action: 'increment' }];
            bm.placedInstances.push({ wo: wo, inst: inst });
            const before = wo.instances.filter(Boolean).length;

            bm.deleteAction();            // removes the last placed (this one)
            const afterDelete = wo.instances.filter(Boolean).length;

            bm.undoDelete();              // U -- restore it
            const restored = wo.instances.filter(Boolean).find((i) =>
                i.params && i.params.enemyType === 'flyer' && i.params.frequency === 8);
            return {
                deleted: afterDelete === before - 1,
                restored: !!restored,
                params: restored && restored.params.wave === 4,
                yaw: restored && restored.rotationQuaternion &&
                    Math.abs(restored.rotationQuaternion.toEulerAngles().y - 0.9) < 0.02,
                wires: restored && restored.wires && restored.wires.length === 1 &&
                    restored.wires[0].action === 'increment',
                collides: restored && restored.checkCollisions === true,
            };
        });
        console.log('\n[2] single', single);
        check('deleting the last object and pressing U restores it', single.deleted && single.restored, single);
        check('the restored object keeps its params, rotation, wires, and collides',
            single.params && single.yaw && single.wires && single.collides, single);
        await h.screenshot('undo');

        // --- 3. Multi-select delete + undo restores all of them ---
        const multi = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const wo = app.findWorldObject('t_block_4');
            const a = wo.createInstance(); a.position = new BABYLON.Vector3(20, 1, 0);
            const b = wo.createInstance(); b.position = new BABYLON.Vector3(24, 1, 0);
            const c = wo.createInstance(); c.position = new BABYLON.Vector3(28, 1, 0);
            [a, b, c].forEach((n) => bm.placedInstances.push({ wo: wo, inst: n }));
            const before = wo.instances.filter(Boolean).length;

            bm.selection = [a, b, c];
            bm.deleteAction();            // delete all three as one group
            const afterDelete = wo.instances.filter(Boolean).length;

            bm.undoDelete();              // restore the whole group
            const afterUndo = wo.instances.filter(Boolean).length;
            return { removed: before - afterDelete, restored: afterUndo - afterDelete };
        });
        console.log('[3] multi', multi);
        check('deleting a 3-object selection and undoing restores all three',
            multi.removed === 3 && multi.restored === 3, multi);

        // --- 4. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during undo', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — one press brings back what you deleted, wires and all.'
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
