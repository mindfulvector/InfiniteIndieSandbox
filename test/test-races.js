/*
 * Race controller test
 * --------------------
 * Verifies l_race packaging a start gate + checkpoints + finish line:
 *   - a real trigger wired to `start` arms the race when the player walks in
 *     (started fires, the HUD clock appears),
 *   - the clock accumulates dt while racing,
 *   - finishing before all checkpoints is refused (still racing, no finish),
 *   - distinct checkpoints count once each (re-entering never double-counts),
 *   - finishing after all checkpoints fires `finished` + `record` (first run
 *     is always a session best) and stops the clock,
 *   - a slower second run finishes but does NOT fire `record`,
 *   - a faster third run fires `record` again,
 *   - respawn mid-race abandons the run and hides the clock,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7039 });
    try {
        await h.start();
        await h.waitForReady(['l_race', 'l_trigger', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            window.app.pixels = 0; window.app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. Build the course: race + start trigger + 2 checkpoints + finish ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const base = pm.player.position;
            const mk = (name, dx, dz) => {
                const inst = app.findWorldObject(name).createInstance();
                inst.position = base.add(new BABYLON.Vector3(dx, 1, dz));
                return inst;
            };
            const race = mk('l_race', 0, 12);
            race.params.checkpoints = 2;
            const gate = mk('l_trigger', 8, 0);
            const cpA = mk('l_trigger', 8, 4);
            const cpB = mk('l_trigger', 8, 8);
            const fin = mk('l_trigger', 8, 12);
            gate.wires.push({ event: 'entered', toWo: 'l_race', toId: race.worldId, action: 'start' });
            cpA.wires.push({ event: 'entered', toWo: 'l_race', toId: race.worldId, action: 'checkpoint' });
            cpB.wires.push({ event: 'entered', toWo: 'l_race', toId: race.worldId, action: 'checkpoint' });
            fin.wires.push({ event: 'entered', toWo: 'l_race', toId: race.worldId, action: 'finish' });
            const cFin = mk('l_counter', -4, 0), cRec = mk('l_counter', -4, 4);
            // Plain tally counters: without this, the default threshold (3)
            // with autoReset would zero cFin on the third finish.
            cFin.params.threshold = 10; cFin.params.autoReset = 'no';
            cRec.params.threshold = 10; cRec.params.autoReset = 'no';
            race.wires.push({ event: 'finished', toWo: 'l_counter', toId: cFin.worldId, action: 'increment' });
            race.wires.push({ event: 'record',   toWo: 'l_counter', toId: cRec.worldId, action: 'increment' });
            window.__R = { race, gate, cpA, cpB, fin, cFin, cRec };
            race.script._wasPlay = null;
        });
        await h.waitFrames(5);

        // --- 2. Walking into the start gate arms the race (real trigger path) ---
        await h.evaluate(() => {
            const R = window.__R;
            window.app.activeMode.player.position.copyFrom(R.gate.position);
        });
        await h.waitFor(() => window.__R.race.script._racing === true, null, 20000);
        await h.waitFrames(6);
        const armed = await h.evaluate(() => ({
            racing: window.__R.race.script._racing,
            elapsed: window.__R.race.script._elapsed,
            hud: window.app.hud.raceText.isVisible,
            hudText: window.app.hud.raceText.text,
        }));
        console.log('\n[2] armed', armed);
        check('walking into the start gate arms the race', armed.racing, armed);
        check('the clock accumulates dt while racing', armed.elapsed > 0.02, armed);
        check('the HUD race clock is showing', armed.hud && /RACE/.test(armed.hudText), armed);
        await h.screenshot('race-clock-running');

        // --- 3. Early finish is refused; distinct checkpoints count once ---
        const logic = await h.evaluate(() => {
            const R = window.__R, s = R.race.script;
            s.onInput('finish', R.fin);                    // no checkpoints yet
            const refusedFinish = s._racing && R.cFin.script.count === 0;
            s.onInput('checkpoint', R.cpA);
            s.onInput('checkpoint', R.cpA);                // same source again
            const afterDupe = s._hit.size;
            s.onInput('checkpoint', R.cpB);
            const afterBoth = s._hit.size;
            return { refusedFinish, afterDupe, afterBoth };
        });
        console.log('[3] checkpoint logic', logic);
        check('finishing before the checkpoints is refused', logic.refusedFinish, logic);
        check('re-entering the same checkpoint never double-counts', logic.afterDupe === 1, logic);
        check('both distinct checkpoints count', logic.afterBoth === 2, logic);

        // --- 4. A completed run fires finished + record (first is a best) ---
        const run1 = await h.evaluate(() => {
            const R = window.__R, s = R.race.script;
            s._elapsed = 10.0;                             // deterministic time
            s.onInput('finish', R.fin);
            return {
                racing: s._racing, best: s._best,
                finished: R.cFin.script.count, records: R.cRec.script.count,
                hud: window.app.hud.raceText.isVisible,
            };
        });
        console.log('[4] first finish', run1);
        check('a completed run fires `finished` and stops the clock',
            run1.finished === 1 && !run1.racing && !run1.hud, run1);
        check('the first finish sets the session best and fires `record`',
            run1.best === 10.0 && run1.records === 1, run1);

        // --- 5. A slower run finishes without a record; a faster one records ---
        const run23 = await h.evaluate(() => {
            const R = window.__R, s = R.race.script;
            // Slower run.
            s.onInput('start', R.gate);
            s.onInput('checkpoint', R.cpA); s.onInput('checkpoint', R.cpB);
            s._elapsed = 15.0;
            s.onInput('finish', R.fin);
            const afterSlow = { finished: R.cFin.script.count, records: R.cRec.script.count, best: s._best };
            // Faster run.
            s.onInput('start', R.gate);
            s.onInput('checkpoint', R.cpA); s.onInput('checkpoint', R.cpB);
            s._elapsed = 7.5;
            s.onInput('finish', R.fin);
            const afterFast = { finished: R.cFin.script.count, records: R.cRec.script.count, best: s._best };
            return { afterSlow, afterFast };
        });
        console.log('[5] slow then fast', run23);
        check('a slower run finishes but fires no record',
            run23.afterSlow.finished === 2 && run23.afterSlow.records === 1 && run23.afterSlow.best === 10.0, run23);
        check('a faster run fires `record` and updates the best',
            run23.afterFast.finished === 3 && run23.afterFast.records === 2 && run23.afterFast.best === 7.5, run23);

        // --- 6. Respawn mid-race abandons the run ---
        const reset = await h.evaluate(() => {
            const R = window.__R, s = R.race.script;
            s.onInput('start', R.gate);
            window.app.activeMode.respawn();               // broadcasts onPlayReset
            return { racing: s._racing, hud: window.app.hud.raceText.isVisible };
        });
        console.log('[6] respawn mid-race', reset);
        check('respawn abandons the run and hides the clock', !reset.racing && !reset.hud, reset);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during races', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the race toy times runs, tracks checkpoints, and celebrates records.'
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
