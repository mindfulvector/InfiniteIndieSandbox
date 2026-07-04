/*
 * Kart racing test (Glow Circuit integration)
 * -------------------------------------------
 * The racing promise: triggers fire from the kart seat, so l_race + kart
 * compose into lap racing with ZERO new engine code. Verifies:
 *   - the Glow Circuit gallery world imports (ring track, gate wired to
 *     finish THEN start, two checkpoints, kart at the grid),
 *   - walking to the kart mounts it,
 *   - crossing the gate WHILE DRIVING arms the lap (start via the kart seat),
 *   - checkpoint triggers count from the kart seat,
 *   - re-crossing the gate closes the lap: finished fires the scoreboard,
 *     a best time records, AND the same crossing arms the next lap (the
 *     finish-then-start wire order),
 *   - a second, slower lap finishes without a new record,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7051 });
    try {
        await h.start();
        await h.waitForReady(['pr_kart', 'l_race', 't_tile']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });

        // --- 1. Import the circuit and take inventory ---
        const world = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/glow-circuit.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const gate = live('l_trigger').find((t) => (t.wires || []).length === 2);
                const race = live('l_race')[0];
                const kart = live('pr_kart')[0];
                ['l_race', 'pr_kart'].forEach((n) => live(n).forEach((i) => { i.script._wasPlay = null; }));
                live('l_trigger').forEach((i) => { if (i.script) i.script._wasPlay = null; });
                window.__K = { gate, race, kart,
                    cps: live('l_trigger').filter((t) => t !== gate) };
                return {
                    ok,
                    gateOrder: gate ? gate.wires.map((w) => w.action) : null,
                    checkpoints: race ? race.params.checkpoints : null,
                    hasKart: !!kart,
                };
            }));
        console.log('\n[1] circuit', world);
        check('Glow Circuit imports with the finish-then-start gate order',
            world.ok && JSON.stringify(world.gateOrder) === JSON.stringify(['finish', 'start']) &&
            world.checkpoints === 2 && world.hasKart, world);

        // --- 2. Mount the kart ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__K.kart.position.add(new BABYLON.Vector3(0.4, 0.8, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__K.kart, null, 20000);
        console.log('[2] mounted at the grid');
        check('the player mounts the kart at the starting grid', true);

        // --- 3. Drive through the gate: the lap arms FROM THE KART SEAT ---
        await h.evaluate(() => { window.__K.kart.position.copyFrom(window.__K.gate.position); });
        await h.waitFor(() => window.__K.race.script._racing === true, null, 20000);
        console.log('[3] lap armed while driving');
        check('crossing the gate while driving arms the race', true);
        await h.screenshot('lap-armed');

        // --- 4. Checkpoints count from the kart seat ---
        await h.evaluate(() => { window.__K.kart.position.copyFrom(window.__K.cps[0].position); });
        await h.waitFor(() => window.__K.race.script._hit.size >= 1, null, 20000);
        await h.evaluate(() => { window.__K.kart.position.copyFrom(window.__K.cps[1].position); });
        await h.waitFor(() => window.__K.race.script._hit.size >= 2, null, 20000);
        console.log('[4] both checkpoints from the kart');
        check('both checkpoints count from the kart seat', true);

        // --- 5. Re-crossing the gate closes the lap AND arms the next ---
        const lap = await h.evaluate(() => {
            const s = window.__K.race.script;
            s._elapsed = 42.0;   // deterministic lap time
            window.__K.kart.position.copyFrom(window.__K.gate.position);
            return true;
        });
        await h.waitFor(() => window.__K.race.script._best !== null, null, 20000);
        const closed = await h.evaluate(() => {
            const app = window.app, s = window.__K.race.script;
            const board = app.findWorldObject('l_scoreboard').instances.filter(Boolean)[0];
            return {
                best: s._best,
                bestSaved: window.__K.race.params.bestTime,
                score: board.script.score != null ? board.script.score : board.script.count,
                reArmed: s._racing === true,
                freshLap: s._hit.size === 0,
            };
        });
        console.log('[5] lap closed', closed);
        check('the lap closes with a record (42s persisted to the course)',
            closed.best === 42.0 && closed.bestSaved === 42.0, closed);
        check('`finished` paid the scoreboard', closed.score >= 1, closed);
        check('the SAME crossing arms the next lap with fresh checkpoints',
            closed.reArmed && closed.freshLap, closed);

        // --- 6. A slower second lap finishes but sets no record ---
        const lap2 = await h.evaluate(() => {
            const s = window.__K.race.script, K = window.__K;
            s.onInput('checkpoint', K.cps[0]);
            s.onInput('checkpoint', K.cps[1]);
            s._elapsed = 55.0;
            s.onInput('finish', K.gate);
            return { best: s._best, racing: s._racing };
        });
        console.log('[6] slow lap', lap2);
        check('a slower lap finishes without touching the record', lap2.best === 42.0, lap2);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during kart racing', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the kart, triggers, and race controller compose into real lap racing.'
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
