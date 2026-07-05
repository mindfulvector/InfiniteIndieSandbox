/*
 * Build-mode group-move test (multi-select drag)
 * ----------------------------------------------
 * Completes multi-select: grabbing a multi-selection moves the WHOLE group,
 * each object holding its offset from the anchor. Verifies:
 *   - grabbing a 3-object selection makes one the moving anchor and records
 *     the other two as followers (with correct offsets), all taken off the
 *     undo stack,
 *   - as the anchor moves, the followers track it (offset preserved) and end
 *     up somewhere new,
 *   - dropping (placeCurrent) re-registers all three on the undo stack and
 *     clears the group,
 *   - a single-object grab still moves just one (no followers),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7135 });
    try {
        await h.start();
        await h.waitForReady(['t_block_4']);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // Three blocks at known offsets from the first (the anchor).
        await h.evaluate(() => {
            const app = window.app, wo = app.findWorldObject('t_block_4'), bm = app.activeMode;
            window.__M = [];
            const spots = [[0, 1, 0], [4, 1, 0], [0, 1, 4]];
            spots.forEach((s) => {
                const b = wo.createInstance();
                b.position = new BABYLON.Vector3(s[0], s[1], s[2]);
                b.computeWorldMatrix(true);
                bm.placedInstances.push({ wo: wo, inst: b });
                window.__M.push(b);
            });
        });

        // --- 1. Grab the group: anchor + two followers, all off the stack ---
        const grab = await h.evaluate(() => {
            const bm = window.app.activeMode, M = window.__M;
            bm.selectInstance(M[0]);
            bm.selectInstance(M[1], true);
            bm.selectInstance(M[2], true);
            bm.grabSelectedObject();
            const inStack = (inst) => bm.placedInstances.some((p) => p.inst === inst);
            const foll = bm._groupFollowers || [];
            const offOf = (inst) => { const g = foll.find((f) => f.inst === inst); return g ? [g.off.x, g.off.z] : null; };
            return { anchorIsCurrent: bm.currentInstance === M[0],
                followerCount: foll.length,
                offB: offOf(M[1]), offC: offOf(M[2]),
                noneInStack: !inStack(M[0]) && !inStack(M[1]) && !inStack(M[2]) };
        });
        console.log('\n[1] grab', grab);
        check('grabbing a 3-object selection: anchor + 2 followers, all off the undo stack',
            grab.anchorIsCurrent && grab.followerCount === 2 &&
            JSON.stringify(grab.offB) === '[4,0]' && JSON.stringify(grab.offC) === '[0,4]' &&
            grab.noneInStack, grab);

        // --- 2. Move the anchor; followers track it (offset preserved) ---
        await h.evaluate(() => {
            const bm = window.app.activeMode, M = window.__M;
            // Shove the whole grab far along +x; the live loop eases the anchor
            // there and syncs followers each frame.
            bm.targetPosition = new BABYLON.Vector3(24, M[0].position.y, 0);
            bm.currentInstance.position.x = 24;
        });
        await h.waitFrames(12);
        const moved = await h.evaluate(() => {
            const M = window.__M, a = M[0].position;
            const relB = [Math.round((M[1].position.x - a.x) * 100) / 100, Math.round((M[1].position.z - a.z) * 100) / 100];
            const relC = [Math.round((M[2].position.x - a.x) * 100) / 100, Math.round((M[2].position.z - a.z) * 100) / 100];
            return { anchorX: a.x, relB, relC };
        });
        console.log('[2] move', moved);
        check('as the anchor moves the followers track it (offsets preserved) and it ends up new',
            moved.anchorX > 3 && JSON.stringify(moved.relB) === '[4,0]' &&
            JSON.stringify(moved.relC) === '[0,4]', moved);
        await h.screenshot('groupmove');

        // --- 3. Drop: all three re-registered, group cleared ---
        const drop = await h.evaluate(() => {
            const bm = window.app.activeMode, M = window.__M;
            bm.placeCurrent();
            const inStack = (inst) => bm.placedInstances.some((p) => p.inst === inst);
            return { allBack: inStack(M[0]) && inStack(M[1]) && inStack(M[2]),
                groupCleared: bm._groupFollowers == null, notGrabbed: bm.currentInstance == null };
        });
        console.log('[3] drop', drop);
        check('dropping re-registers all three on the undo stack and clears the group',
            drop.allBack && drop.groupCleared && drop.notGrabbed, drop);

        // --- 4. A single grab still moves just one (no followers) ---
        const single = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode, wo = app.findWorldObject('t_block_4');
            const one = wo.createInstance();
            one.position = new BABYLON.Vector3(-12, 1, 0);
            bm.placedInstances.push({ wo: wo, inst: one });
            bm.selectInstance(one);
            bm.grabSelectedObject();
            const ok = bm.currentInstance === one && bm._groupFollowers == null && bm.grabbed === true;
            bm.placeCurrent();
            return { ok };
        });
        console.log('[4] single', single);
        check('a single-object grab still moves just one (no followers)', single.ok, single);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during group move', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — grab a group and the whole cluster moves as one.'
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
