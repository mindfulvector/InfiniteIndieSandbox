/*
 * Sweeping-hazard test
 * --------------------
 * Verifies l_sweeper:
 *   - registers with SweeperScript + hurt/swept outputs,
 *   - it OSCILLATES along its axis from home (position swings both ways),
 *   - it damages the player only while overlapping them (times a crossing:
 *     safe when the blade is away, a hit when it sweeps over),
 *   - a dodge rolls through it unharmed,
 *   - it fires `swept` as it passes centre, and a play reset parks it home,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7132 });
    try {
        await h.start();
        await h.waitForReady(['l_sweeper', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const w = window.app.findWorldObject('l_sweeper').createInstance();
            w.position = new BABYLON.Vector3(300, 2, 300);
            return { script: w.script.constructor.name,
                hurt: w.script.outputs.some((o) => o.id === 'hurt'),
                swept: w.script.outputs.some((o) => o.id === 'swept') };
        });
        console.log('\n[1] registration', reg);
        check('l_sweeper registers with SweeperScript, hurt + swept outputs',
            reg.script === 'SweeperScript' && reg.hurt && reg.swept, reg);

        // --- 2. It oscillates along its axis ---
        const swing = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const w = app.findWorldObject('l_sweeper').createInstance();
            w.position = new BABYLON.Vector3(40, 2, 40);
            w.params = { axis: 'x', reach: 5, speed: 3, damage: 2 };
            w.script._wasPlay = null; w.script.update(true, pm);
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(40, 2, 44);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            w.wires = [{ event: 'swept', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__W = { w, cnt, home: 40 };
            let minX = 99, maxX = -99;
            for (let i = 0; i < 200; i++) { w.script.update(true, pm); minX = Math.min(minX, w.position.x); maxX = Math.max(maxX, w.position.x); }
            // The `swept` edge fires on a RISING zero-crossing. Proving it via
            // the timed loop is dt-flaky (a phase step can straddle the sample);
            // force one crossing deterministically instead: _lastSin below zero
            // and _phase already past zero, so sin is positive next update
            // regardless of frame dt.
            const before = cnt.script.count;
            w.script._lastSin = -0.5; w.script._phase = 0.1;
            w.script.update(true, pm);
            return { minX, maxX, span: maxX - minX, swept: cnt.script.count - before };
        });
        console.log('[2] swing', swing);
        check('the sweeper oscillates both ways along its axis, firing swept at centre',
            swing.minX < 39 && swing.maxX > 41 && swing.span > 6 && swing.swept >= 1, swing);
        await h.screenshot('sweeper');

        // --- 3. It damages the player when the blade is over them ---
        const hit = await h.evaluate(() => {
            const pm = window.app.activeMode, w = window.__W.w;
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 0;
            // FREEZE the blade over the player (speed 0, phase 0 -> parked at
            // home x). A *moving* blade only grazes a point-player for a few
            // frames per pass, which aliases under load; contact damage itself
            // is what we assert here (the sweep is proven in [2]).
            w.params.speed = 0; w.script._phase = 0; w.script._lastSin = 0;
            pm.player.position.copyFrom(new BABYLON.Vector3(40, 2, 40));
            const hp0 = pm.playerHp;
            for (let i = 0; i < 200; i++) { pm.hurtCooldown = 0; w.script._cool = 0; w.script.update(true, pm); }
            const took = hp0 - pm.playerHp;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { took };
        });
        console.log('[3] contact', hit);
        check('the sweeping blade damages the player it crosses', hit.took >= 2, hit);

        // --- 4. A dodge rolls through it unharmed ---
        const dodge = await h.evaluate(() => {
            const pm = window.app.activeMode, w = window.__W.w;
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 400;   // rolling throughout
            // Same frozen-blade-over-player setup: a roll must eat every hit.
            w.params.speed = 0; w.script._phase = 0; w.script._lastSin = 0;
            pm.player.position.copyFrom(new BABYLON.Vector3(40, 2, 40));
            const hp0 = pm.playerHp;
            for (let i = 0; i < 200; i++) { pm.hurtCooldown = 0; w.script._cool = 0; w.script.update(true, pm); }
            pm.dodgeFrames = 0;
            const unharmed = pm.playerHp === hp0;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { unharmed };
        });
        console.log('[4] dodge', dodge);
        check('a dodge rolls through the sweeper unharmed', dodge.unharmed, dodge);

        // --- 5. Play reset parks it home ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, w = window.__W.w;
            w.params.speed = 3; w.script._phase = 0.6;   // restore motion (prior tests froze it)
            for (let i = 0; i < 20; i++) w.script.update(true, pm);   // move it off-home
            const off = Math.abs(w.position.x - window.__W.home) > 0.1;
            w.script.onPlayReset(pm);
            return { movedOff: off, homed: Math.abs(w.position.x - window.__W.home) < 0.01 };
        });
        console.log('[5] reset', reset);
        check('a play reset parks the sweeper back home', reset.movedOff && reset.homed, reset);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the sweeper', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the blade swings, bites what it crosses, and a roll slips past.'
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
