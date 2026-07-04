/*
 * Snap-assisted placement test (user request)
 * -------------------------------------------
 * Verifies snap mode in build placement:
 *   - holding Shift turns a movement key press into a flush jump: the
 *     moving block lands exactly against the nearest block in that
 *     direction (edge-to-edge within 2cm, no overlap),
 *   - a second press against the same neighbor is idempotent (already
 *     flush), and snapping with nothing that way refuses politely,
 *   - the grid pull stays suspended while snap is active (the flush
 *     off-grid position holds),
 *   - CapsLock latches snap mode without holding anything; the pad's left
 *     bumper works as the held modifier too,
 *   - with snap active, rotating matches the nearest SAME-TYPE piece's
 *     angle, and a similar-SIZE piece of a different type also qualifies,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7083 });
    try {
        await h.start();
        await h.waitForReady(['t_block_2', 'pr_door']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // --- 1. A held-Shift movement press snaps flush ---
        await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            // A fixed neighbor block, off to +x with an off-grid gap.
            const wo = app.findWorldObject('t_block_2');
            const anchor = wo.createInstance();
            anchor.position = new BABYLON.Vector3(6, 3, 0);
            window.__A = anchor;
            // Select a block for placement via the sidebar path.
            const idx = app.BuildableObjectList.indexOf(wo);
            bm.selectedObjectIndex = idx;
            bm._selectRequested = true;
        });
        await h.waitFor(() => {
            const bm = window.app.activeMode;
            return bm.currentInstance && bm.currentWorldObject &&
                bm.currentWorldObject.name === 't_block_2';
        }, null, 20000);
        await h.evaluate(() => {
            const bm = window.app.activeMode;
            // Park the mover west of the neighbor, misaligned off-grid --
            // with Shift already down, so the idle grid pull never runs
            // between setup and the snap press.
            window.app.keysPressed['SHIFT'] = true;
            bm.targetPosition = new BABYLON.Vector3(1.3, 3, 0.4);
            bm.currentInstance.position.copyFrom(bm.targetPosition);
        });
        await h.waitFrames(4);
        // The camera looks along +x here? Snap along the dominant axis of
        // the actual camera vectors: drive with the key whose direction has
        // the biggest +x component (computed in-page for robustness).
        const snap1 = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const fwd = app.camera.getForwardRay().direction; fwd.y = 0; fwd.normalize();
            const right = BABYLON.Vector3.Cross(fwd, BABYLON.Vector3.Up()); right.y = 0; right.normalize();
            const options = [
                { key: 'W', v: fwd }, { key: 'S', v: fwd.scale(-1) },
                { key: 'A', v: right }, { key: 'D', v: right.scale(-1) },
            ];
            options.sort((a, b) => b.v.x - a.v.x);
            window.__plusXKey = options[0].key;
            app.keysPressed['SHIFT'] = true;
            app.keysPressed[window.__plusXKey] = true;
            return { key: window.__plusXKey };
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            window.app.keysPressed[window.__plusXKey] = false;
        });
        // Flushness: mover's max x meets the neighbor's min x (lerp settles).
        await h.waitFor(() => {
            const bm = window.app.activeMode;
            const mb = bm._worldBounds(bm.currentInstance);
            const ab = bm._worldBounds(window.__A);
            return Math.abs(mb.max.x - ab.min.x) < 0.02;
        }, null, 20000);
        const flush = await h.evaluate(() => {
            const bm = window.app.activeMode;
            const mb = bm._worldBounds(bm.currentInstance);
            const ab = bm._worldBounds(window.__A);
            return {
                gap: Math.round((ab.min.x - mb.max.x) * 1000) / 1000,
                z: bm.targetPosition.z,
            };
        });
        console.log('\n[1] flush snap', { key: snap1.key, flush });
        check('a snap press lands the block flush against its neighbor',
            Math.abs(flush.gap) < 0.02, flush);
        check('the off-grid z offset survives (grid pull suspended)',
            Math.abs(flush.z - 0.4) < 0.05, flush);
        await h.screenshot('flush-snap');

        // --- 2. Idempotent re-press; empty direction refuses ---
        const again = await h.evaluate(() => {
            const bm = window.app.activeMode;
            const x0 = bm.targetPosition.x;
            const okSame = bm.snapToNearest('x', 1);    // already flush
            const x1 = bm.targetPosition.x;
            const okEmpty = bm.snapToNearest('z', 1);   // nothing that way
            return { okSame, moved: Math.abs(x1 - x0), okEmpty };
        });
        console.log('[2] re-press', again);
        check('an already-flush snap is idempotent and an empty direction refuses',
            again.okSame && again.moved < 0.001 && again.okEmpty === false, again);

        // --- 3. CapsLock latches; pad LB holds ---
        const latch = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            app.keysPressed['SHIFT'] = false;
            const off = bm._snapActive();
            app.keysPressed['CAPSLOCK'] = true;
            return { off };
        });
        await h.waitFor(() => window.app.activeMode.snapLatch === true, null, 20000);
        const latched = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const viaCaps = bm._snapActive();
            app.keysPressed['CAPSLOCK'] = false;
            bm.snapLatch = false;
            app.padHeld['block'] = true;    // left bumper held
            const viaLB = bm._snapActive();
            app.padHeld['block'] = false;
            return { viaCaps, viaLB };
        });
        console.log('[3] modifiers', { latch, latched });
        check('CapsLock latches snap and the pad left bumper holds it',
            latch.off === false && latched.viaCaps && latched.viaLB, { latch, latched });

        // --- 4. Snap-rotate matches the nearest same-type piece ---
        await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            // Drop the block preview; select a door and rotate a placed one.
            const doorWo = app.findWorldObject('pr_door');
            const placed = doorWo.createInstance();
            placed.position = new BABYLON.Vector3(2, 3, 6);
            placed.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI / 3, 0, 0);
            window.__R = placed;
            bm.selectedObjectIndex = app.BuildableObjectList.indexOf(doorWo);
            bm._selectRequested = true;
        });
        await h.waitFor(() => {
            const bm = window.app.activeMode;
            return bm.currentInstance && bm.currentWorldObject.name === 'pr_door';
        }, null, 20000);
        const rot = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            bm.targetPosition = new BABYLON.Vector3(0, 3, 6);
            bm.currentInstance.position.copyFrom(bm.targetPosition);
            bm.currentInstance.rotationQuaternion = BABYLON.Quaternion.Identity();
            bm.snapRotationToNeighbor();
            const q = bm.currentInstance.rotationQuaternion;
            const want = window.__R.rotationQuaternion;
            return { dot: Math.abs(BABYLON.Quaternion.Dot(q, want)) };
        });
        console.log('[4] rotation match', rot);
        check('snap-rotate copies the nearest same-type piece\'s angle',
            rot.dot > 0.9999, rot);

        // --- 5. A similar-SIZE different-type neighbor also qualifies ---
        const sizeRot = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            // Remove the same-type door, and run the size-similarity rule
            // in a CLEAN area: the default world's terrain tiles are
            // door-sized, so near the ground the "nearest similar piece"
            // is ambiguous by design, not by bug.
            const doorWo = app.findWorldObject('pr_door');
            doorWo.disposeInstance(window.__R);
            // A t_block_1 (volume 1) is genuinely similar to the door
            // group (~1.35) -- unlike the 2-block (8), which must NOT match.
            const cube = app.findWorldObject('t_block_1').createInstance();
            cube.position = new BABYLON.Vector3(60, 30, 0);
            cube.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI / 6, 0, 0);
            cube.computeWorldMatrix(true);
            window.__A.position = new BABYLON.Vector3(62, 30, 4);   // 2-block: nearer paths must skip it (size)
            window.__A.computeWorldMatrix(true);
            bm.targetPosition = new BABYLON.Vector3(58.5, 30, 0.4);
            bm.currentInstance.position.copyFrom(bm.targetPosition);
            // Level the preview first: similarity compares world AABBs, and
            // section 4's PI/3 yaw inflates the door's box ~3x.
            bm.currentInstance.rotationQuaternion = BABYLON.Quaternion.Identity();
            bm.targetRotation = BABYLON.Quaternion.Identity();
            bm.currentInstance.computeWorldMatrix(true);
            const ok = bm.snapRotationToNeighbor();
            const q = bm.currentInstance.rotationQuaternion;
            const want = cube.rotationQuaternion;
            return { ok, dot: q && want ? Math.abs(BABYLON.Quaternion.Dot(q, want)) : 0, who: bm._lastRotMatch };
        });
        console.log('[5] size-similar match', sizeRot);
        check('a similar-size different-type neighbor matches (size gate + 12u radius)',
            sizeRot.ok === true && sizeRot.dot > 0.9999, sizeRot);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during snapping', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — blocks click together flush and pieces agree on their angles.'
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
