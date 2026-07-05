/*
 * Checkpoint flag test
 * --------------------
 * Verifies l_checkpoint:
 *   - registers with CheckpointScript + a `reached` output,
 *   - touching it sets the run's respawn point (mode.spawnPoint moves to
 *     the flag) and fires `reached` once, raising the flag,
 *   - dying after a checkpoint respawns AT the checkpoint, not world spawn,
 *   - touching a SECOND checkpoint takes over (respawn moves, the first
 *     lowers), and only one is active at a time,
 *   - a play reset keeps the active checkpoint (respawn persistence),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7114 });
    try {
        await h.start();
        await h.waitForReady(['l_checkpoint', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const cp = window.app.findWorldObject('l_checkpoint').createInstance();
            cp.position = new BABYLON.Vector3(300, 2, 300);
            return { script: cp.script.constructor.name,
                out: cp.script.outputs.some((o) => o.id === 'reached'),
                flag: cp.getChildMeshes().some((m) => m.name.indexOf('flag') >= 0) };
        });
        console.log('\n[1] registration', reg);
        check('l_checkpoint registers with CheckpointScript, a reached output, a flag',
            reg.script === 'CheckpointScript' && reg.out && reg.flag, reg);

        // --- 2. Touching sets the respawn point + fires reached, raises flag ---
        const touched = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const worldSpawn = pm.spawnPoint.clone();
            const cp = app.findWorldObject('l_checkpoint').createInstance();
            cp.position = new BABYLON.Vector3(20, 1, 5);
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(20, 1, 8);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            cp.wires = [{ event: 'reached', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__C1 = cp; window.__CNT = cnt; window.__WS = worldSpawn;
            const flag0 = cp.script._flagMesh().position.y;
            pm.player.position.copyFrom(cp.position);   // walk onto it
            let n = 0;
            const tick = () => {
                n++;
                cp.script.update(true, pm);
                if (n > 30) return resolve({
                    active: cp.script._active,
                    spawnMoved: BABYLON.Vector3.Distance(pm.spawnPoint, cp.position) < 2 &&
                        BABYLON.Vector3.Distance(pm.spawnPoint, window.__WS) > 5,
                    counted: cnt.script.count,
                    flagRose: cp.script._flagMesh().position.y > flag0 + 0.5,
                });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] touch', touched);
        check('touching a checkpoint moves the respawn point, fires reached once, raises the flag',
            touched.active && touched.spawnMoved && touched.counted === 1 && touched.flagRose, touched);
        await h.screenshot('checkpoint');

        // --- 3. Dying respawns AT the checkpoint ---
        const died = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(new BABYLON.Vector3(60, 1, 60));   // wander off
            pm.respawn();
            return { at: [Math.round(pm.player.position.x), Math.round(pm.player.position.z)],
                cp: [window.__C1.position.x, window.__C1.position.z] };
        });
        console.log('[3] respawn', died);
        check('dying respawns at the checkpoint, not world spawn',
            Math.abs(died.at[0] - died.cp[0]) < 2 && Math.abs(died.at[1] - died.cp[1]) < 2, died);

        // --- 4. A second checkpoint takes over; only one active ---
        const second = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const cp2 = app.findWorldObject('l_checkpoint').createInstance();
            cp2.position = new BABYLON.Vector3(40, 1, 25);
            window.__C2 = cp2;
            pm.player.position.copyFrom(cp2.position);
            for (let i = 0; i < 5; i++) { cp2.script.update(true, pm); window.__C1.script.update(true, pm); }
            return { c2Active: cp2.script._active, c1Active: window.__C1.script._active,
                spawnAtC2: BABYLON.Vector3.Distance(pm.spawnPoint, cp2.position) < 2 };
        });
        console.log('[4] takeover', second);
        check('a second checkpoint takes over and lowers the first (one active)',
            second.c2Active && !second.c1Active && second.spawnAtC2, second);

        // --- 5. A play reset keeps the active checkpoint ---
        const persist = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.__C2.script.onPlayReset(pm);
            return { stillActive: window.__C2.script._active,
                spawnKept: BABYLON.Vector3.Distance(pm.spawnPoint, window.__C2.position) < 2 };
        });
        console.log('[5] persist', persist);
        check('a play reset keeps the active checkpoint (respawn persistence)',
            persist.stillActive && persist.spawnKept, persist);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during checkpoints', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — raise the flag, and death sends you back to it.'
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
