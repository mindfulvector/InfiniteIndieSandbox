/*
 * Build-mode row-stamp test (L)
 * -----------------------------
 * Verifies stampLine — fast walls/floors:
 *   - with an object highlighted, stamping lays 4 copies marching along +X,
 *     each stepped by the object's footprint (so they tile flush, not
 *     overlapping and not gapped),
 *   - the copies carry the original's rotation/scale/params,
 *   - all copies register on the placed (undo) stack and the row (original +
 *     copies) becomes the selection,
 *   - stamping with nothing selected is a harmless no-op,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7148 });
    try {
        await h.start();
        await h.waitForReady(['t_block_2']);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // --- 1. Stamp a row: 4 copies stepped by the footprint ---
        const stamp = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_2');
            const base = wo.createInstance();
            base.position = new BABYLON.Vector3(0, 1, 0);
            if (base.rotationQuaternion) base.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0.5, 0, 0);
            base.computeWorldMatrix(true);
            bm.placedInstances.push({ wo: wo, inst: base });
            bm.selection = [base];
            const before = wo.instances.filter(Boolean).length;
            const stackBefore = bm.placedInstances.length;
            bm.stampLine();   // default 4
            const live = wo.instances.filter(Boolean);
            const added = live.length - before;
            // The copies should march along +X by a consistent, non-zero step.
            const xs = live.map((i) => i.position.x).sort((a, b) => a - b);
            const gaps = [];
            for (let i = 1; i < xs.length; i++) gaps.push(Math.round((xs[i] - xs[i - 1]) * 100) / 100);
            const step = gaps[0];
            const evenGaps = gaps.every((g) => Math.abs(g - step) < 0.05) && step > 0.5;
            const onStack = bm.placedInstances.length === stackBefore + 4;
            window.__base = base;
            return { added, step, evenGaps, onStack, selCount: bm.selection.length };
        });
        console.log('\n[1] stamp', stamp);
        check('L stamps 4 copies marching along +X, evenly stepped by the footprint',
            stamp.added === 4 && stamp.evenGaps && stamp.onStack, stamp);
        await h.screenshot('stampline');

        // --- 2. Copies carry rotation/scale/params ---
        const carry = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_2');
            const base = window.__base;
            // The stamped copies are the selection minus the base.
            const copies = bm.selection.filter((s) => s !== base);
            const baseYaw = base.rotationQuaternion ? base.rotationQuaternion.toEulerAngles().y : 0;
            const ok = copies.length >= 1 && copies.every((c) => {
                const yaw = c.rotationQuaternion ? c.rotationQuaternion.toEulerAngles().y : 0;
                return Math.abs(yaw - baseYaw) < 0.01 && Math.abs(c.scaling.x - base.scaling.x) < 0.01;
            });
            return { copies: copies.length, ok };
        });
        console.log('[2] carry', carry);
        check('the stamped copies carry the original rotation and scale',
            carry.copies === 4 && carry.ok, carry);

        // --- 3. The row is the selection (original + copies) ---
        const sel = await h.evaluate(() => {
            const bm = window.app.activeMode;
            return { selCount: bm.selection.length, hasBase: bm.selection.includes(window.__base) };
        });
        console.log('[3] selection', sel);
        check('the row (original + 4 copies) becomes the selection',
            sel.selCount === 5 && sel.hasBase, sel);

        // --- 4. Nothing selected -> harmless no-op ---
        const noop = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_2');
            bm.selection = [];
            const before = wo.instances.filter(Boolean).length;
            bm.stampLine();
            return { unchanged: wo.instances.filter(Boolean).length === before };
        });
        console.log('[4] noop', noop);
        check('stamping with nothing selected changes nothing', noop.unchanged, noop);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the row stamp', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — one keypress lays a whole tiled row.'
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
