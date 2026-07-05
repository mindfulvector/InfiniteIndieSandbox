/*
 * Build-mode redo test (pairs with undo)
 * --------------------------------------
 * Verifies redoDelete completes the undo/redo pair:
 *   - delete -> undo brings the objects back (existing behaviour),
 *   - redo (Y) re-removes exactly what the last undo restored,
 *   - undo after redo brings them back AGAIN (symmetric round-trip),
 *   - a fresh deletion clears the redo trail (history diverges),
 *   - redo with nothing to redo is a harmless no-op,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7139 });
    try {
        await h.start();
        await h.waitForReady(['t_block_4']);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        const count = () => h.evaluate(() =>
            window.app.findWorldObject('t_block_4').instances.filter(Boolean).length);

        // Place three blocks.
        await h.evaluate(() => {
            const app = window.app, wo = app.findWorldObject('t_block_4'), bm = app.activeMode;
            window.__R = [];
            for (let i = 0; i < 3; i++) {
                const b = wo.createInstance();
                b.position = new BABYLON.Vector3(i * 6, 1, 0);
                bm.placedInstances.push({ wo: wo, inst: b });
                window.__R.push(b);
            }
        });
        const base = await count();

        // --- 1. Delete a group, then undo restores it ---
        const undo = await h.evaluate(() => {
            const bm = window.app.activeMode, R = window.__R;
            bm.selection = [R[0], R[1], R[2]];
            bm.deleteAction();
            const afterDel = window.app.findWorldObject('t_block_4').instances.filter(Boolean).length;
            bm.undoDelete();
            const afterUndo = window.app.findWorldObject('t_block_4').instances.filter(Boolean).length;
            return { afterDel, afterUndo, redoDepth: bm._redoHistory.length };
        });
        console.log('\n[1] undo', { base, undo });
        check('delete removes 3 and undo restores all 3 (redo trail armed)',
            undo.afterDel === base - 3 && undo.afterUndo === base && undo.redoDepth === 1, undo);

        // --- 2. Redo re-removes exactly what undo restored ---
        const redo = await h.evaluate(() => {
            const bm = window.app.activeMode;
            bm.redoDelete();
            return { count: window.app.findWorldObject('t_block_4').instances.filter(Boolean).length,
                redoDepth: bm._redoHistory.length, undoDepth: bm._deleteHistory.length };
        });
        console.log('[2] redo', redo);
        check('redo re-removes the 3 restored objects and re-arms the undo stack',
            redo.count === base - 3 && redo.redoDepth === 0 && redo.undoDepth === 1, redo);
        await h.screenshot('redo');

        // --- 3. Undo after redo brings them back again (symmetric) ---
        const roundtrip = await h.evaluate(() => {
            const bm = window.app.activeMode;
            bm.undoDelete();
            return { count: window.app.findWorldObject('t_block_4').instances.filter(Boolean).length,
                redoDepth: bm._redoHistory.length };
        });
        console.log('[3] round-trip', roundtrip);
        check('undo after redo restores the objects again (redo re-armed)',
            roundtrip.count === base && roundtrip.redoDepth === 1, roundtrip);

        // --- 4. A fresh deletion clears the redo trail ---
        const diverge = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_4');
            const one = wo.createInstance(); one.position = new BABYLON.Vector3(30, 1, 0);
            bm.placedInstances.push({ wo: wo, inst: one });
            bm.selection = [one];
            bm.deleteAction();   // a NEW delete -- redo trail must be gone
            return { redoDepth: bm._redoHistory.length };
        });
        console.log('[4] diverge', diverge);
        check('a fresh deletion clears the redo trail', diverge.redoDepth === 0, diverge);

        // --- 5. Redo with an empty stack is a harmless no-op ---
        const noop = await h.evaluate(() => {
            const bm = window.app.activeMode;
            bm._redoHistory = [];
            const before = window.app.findWorldObject('t_block_4').instances.filter(Boolean).length;
            bm.redoDelete();
            const after = window.app.findWorldObject('t_block_4').instances.filter(Boolean).length;
            return { unchanged: before === after };
        });
        console.log('[5] noop', noop);
        check('redo with nothing to redo changes nothing', noop.unchanged, noop);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during redo', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — undo brings it back, redo takes it away, cleanly both ways.'
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
