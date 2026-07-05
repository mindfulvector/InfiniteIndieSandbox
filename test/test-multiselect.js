/*
 * Build-mode multi-select test (shift-click groups)
 * -------------------------------------------------
 * Verifies additive selection + group operations:
 *   - selectInstance(inst) replaces the selection (single),
 *   - selectInstance(inst, true) TOGGLES an instance into a multi-selection
 *     (add, and shift-click again removes),
 *   - deleting a multi-selection removes ALL of them (and undoes as a group),
 *   - F on a multi-selection duplicates ALL of them (copies land, and the
 *     selection becomes the copies) without grabbing,
 *   - a single-object F still grabs a copy to move (unchanged),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7129 });
    try {
        await h.start();
        await h.waitForReady(['t_block_4', 'l_spawner']);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // Helper: make N blocks in the world.
        await h.evaluate(() => {
            const app = window.app, wo = app.findWorldObject('t_block_4');
            window.__M = [];
            for (let i = 0; i < 4; i++) {
                const b = wo.createInstance();
                b.position = new BABYLON.Vector3(i * 6, 1, 0);
                window.app.activeMode.placedInstances.push({ wo: wo, inst: b });
                window.__M.push(b);
            }
        });

        // --- 1. Additive select toggles into a group ---
        const sel = await h.evaluate(() => {
            const bm = window.app.activeMode, M = window.__M;
            bm.selectInstance(M[0]);              // single
            const n1 = bm.selection.length;
            bm.selectInstance(M[1], true);        // + add
            bm.selectInstance(M[2], true);        // + add
            const n3 = bm.selection.length;
            bm.selectInstance(M[1], true);        // toggle M[1] back off
            const n2 = bm.selection.length;
            const still = bm.selection.includes(M[0]) && bm.selection.includes(M[2]) &&
                !bm.selection.includes(M[1]);
            return { n1, n3, n2, still };
        });
        console.log('\n[1] additive', sel);
        check('shift-click toggles objects into (and out of) a multi-selection',
            sel.n1 === 1 && sel.n3 === 3 && sel.n2 === 2 && sel.still, sel);

        // --- 2. Deleting a group removes all; undo restores all ---
        const del = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_4');
            bm.selection = [window.__M[0], window.__M[2], window.__M[3]];   // 3 of them
            const before = wo.instances.filter(Boolean).length;
            bm.deleteAction();
            const afterDel = wo.instances.filter(Boolean).length;
            bm.undoDelete();                       // one U restores the group
            const afterUndo = wo.instances.filter(Boolean).length;
            return { removed: before - afterDel, restored: afterUndo - afterDel };
        });
        console.log('[2] group delete', del);
        check('deleting a 3-object selection removes all three; one undo restores all three',
            del.removed === 3 && del.restored === 3, del);

        // --- 3. F on a group duplicates all (no grab) ---
        const dup = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('l_spawner');
            const a = wo.createInstance(); a.position = new BABYLON.Vector3(40, 1, 0);
            const b = wo.createInstance(); b.position = new BABYLON.Vector3(46, 1, 0);
            [a, b].forEach((n) => bm.placedInstances.push({ wo: wo, inst: n }));
            const before = wo.instances.filter(Boolean).length;
            bm.selection = [a, b];
            bm.duplicateSelected();                // F
            const after = wo.instances.filter(Boolean).length;
            return { added: after - before, notGrabbed: bm.currentInstance == null,
                selectionIsCopies: bm.selection.length === 2 &&
                    !bm.selection.includes(a) && !bm.selection.includes(b) };
        });
        console.log('[3] group dup', dup);
        check('F on a 2-object selection duplicates both, selects the copies, and does not grab',
            dup.added === 2 && dup.notGrabbed && dup.selectionIsCopies, dup);
        await h.screenshot('multiselect');

        // --- 4. Single-object F still grabs a copy ---
        const single = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_4');
            const one = wo.createInstance(); one.position = new BABYLON.Vector3(-10, 1, 0);
            bm.placedInstances.push({ wo: wo, inst: one });
            bm.selection = [one];
            bm.duplicateSelected();
            const grabbed = !!bm.currentInstance && bm.currentInstance !== one && bm.grabbed === true;
            return { grabbed };
        });
        console.log('[4] single', single);
        check('a single-object F still grabs a copy to move (unchanged)', single.grabbed, single);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during multi-select', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — shift-click a group, and Delete or F acts on the lot.'
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
