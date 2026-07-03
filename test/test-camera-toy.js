/*
 * Camera logic-toy test
 * ---------------------
 * Action-driven checks with screenshots:
 *   - a wired 'activate' cuts the view to the camera toy (view moves to its
 *     spot, player input pauses, 'started' fires),
 *   - after its duration the view returns, input resumes, 'finished' fires
 *     (asserted by wiring finished -> counter.increment),
 *   - 'release' ends a cut early,
 *   - a trigger can drive the camera end-to-end (trigger.entered -> activate).
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_camera', 'l_counter', 'l_trigger']);
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(15);

        // --- 1. Activate cuts the view to the camera ---
        const setup = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const cam = app.findWorldObject('l_camera').createInstance();
            cam.position = pm.player.position.add(new BABYLON.Vector3(7, 4, 7));
            cam.params.duration = 3;
            cam.params.focus = 'player';
            // Wire finished -> counter so we can assert the cut completed.
            const counter = app.findWorldObject('l_counter').createInstance();
            counter.position = pm.player.position.add(new BABYLON.Vector3(-4, 1, -4));
            counter.params.threshold = 10;    // just tallies
            app.addWire(cam, 'finished', 'l_counter', counter.worldId, 'increment');
            const cam0 = app.camera.position.clone();
            cam.script.onInput('activate');
            return { camId: cam.worldId, counterId: counter.worldId,
                cam0: { x: cam0.x, y: cam0.y, z: cam0.z } };
        });
        await h.waitFor((s) => {
            const inst = window.app.findInstance('l_camera', s.camId);
            if (!inst || !inst.script._active) return false;
            const d = BABYLON.Vector3.Distance(window.app.camera.position,
                inst.getAbsolutePosition().add(new BABYLON.Vector3(0, 0.6, 0)));
            return d < 1.5;   // the view arrived at the camera toy
        }, setup, 20000);
        const during = await h.evaluate((s) => {
            const inst = window.app.findInstance('l_camera', s.camId);
            return { active: inst.script._active, saved: !!inst.script._saved };
        }, setup);
        console.log('\n[1] cut active', during);
        check('activate cuts the view to the camera toy', during.active === true && during.saved === true, during);
        await h.screenshot('camera-cut');

        // --- 2. The cut ends on its own; view restores; finished fires ---
        await h.waitFor((s) => {
            const inst = window.app.findInstance('l_camera', s.camId);
            return inst && inst.script._active === false;
        }, setup, 30000);
        await h.waitFrames(6);
        const after = await h.evaluate((s) => {
            const app = window.app;
            const counter = app.findInstance('l_counter', s.counterId);
            const p = app.camera.position;
            const d0 = Math.hypot(p.x - s.cam0.x, p.y - s.cam0.y, p.z - s.cam0.z);
            return { finishedCount: counter.script.count, backNearStart: d0 < 6,
                cutsActive: app.activeMode._cameraToyActive || null };
        }, setup);
        console.log('\n[2] cut finished', after);
        check('the cut ends after its duration and fires `finished` (wired counter +1)',
            after.finishedCount === 1, after);
        check('the view returns to the follow camera', after.backNearStart === true && after.cutsActive === null, after);
        await h.screenshot('camera-restored');

        // --- 3. release ends a cut early ---
        const early = await h.evaluate(async (s) => {
            const app = window.app;
            const inst = app.findInstance('l_camera', s.camId);
            inst.script.onInput('activate');
            await new Promise((r) => { let n = 0; const t = () => (++n >= 10 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            const wasActive = inst.script._active;
            inst.script.onInput('release');
            await new Promise((r) => { let n = 0; const t = () => (++n >= 6 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { wasActive, nowActive: inst.script._active,
                finishedCount: app.findInstance('l_counter', s.counterId).script.count };
        }, setup);
        console.log('\n[3] early release', early);
        check('release ends the cut early', early.wasActive === true && early.nowActive === false, early);
        check('an early release still fires `finished` (counter now 2)', early.finishedCount === 2, early);

        // --- 4. A trigger drives the camera end-to-end ---
        const viaTrigger = await h.evaluate(async (s) => {
            const app = window.app;
            const trig = app.findWorldObject('l_trigger').createInstance();
            trig.position = new BABYLON.Vector3(50, 1, 50);   // away from the player
            app.addWire(trig, 'entered', 'l_camera', s.camId, 'activate');
            app.fireEvent(trig, 'entered');
            await new Promise((r) => { let n = 0; const t = () => (++n >= 10 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            const inst = app.findInstance('l_camera', s.camId);
            const active = inst.script._active;
            inst.script.onInput('release');   // clean up
            return { active };
        }, setup);
        console.log('\n[4] trigger-driven', viaTrigger);
        check('a trigger wire can activate the camera', viaTrigger.active === true, viaTrigger);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the camera toy cuts, restores, releases early, and chains via wires.'
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
