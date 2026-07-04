/*
 * Logic gate test (l_gate: AND / OR / NOT)
 * ----------------------------------------
 * Verifies the Boolean puzzle combinator:
 *   - l_gate registers with GateScript,
 *   - an ALL (AND) gate fed by two sources fires `on` only when BOTH are
 *     active, and `off` when either drops (edge-triggered, once each),
 *   - an ANY (OR) gate fires `on` as soon as one source is active,
 *   - a NOT gate fires `on` when a source signalled but is now off,
 *   - a real puzzle: two triggers wired entered->on / exited->off into an
 *     AND gate open a door only when both plates are occupied,
 *   - a play reset clears the gate,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7108 });
    try {
        await h.start();
        await h.waitForReady(['l_gate', 'l_trigger', 'l_counter', 'pr_door']);
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
        const reg = await h.evaluate(() =>
            ({ gate: !!window.app.findWorldObject('l_gate'),
               script: window.app.findWorldObject('l_gate').createInstance().script.constructor.name }));
        console.log('\n[1] registration', reg);
        check('l_gate registers with GateScript', reg.gate && reg.script === 'GateScript', reg);

        // Helper: build a gate wired to a counter so we can count on/off edges.
        const makeGate = async (mode) => h.evaluate((m) => {
            const app = window.app;
            const gate = app.findWorldObject('l_gate').createInstance();
            gate.params = { mode: m };
            gate.script.onPlayReset(app.activeMode);
            const onC = app.findWorldObject('l_counter').createInstance();
            const offC = app.findWorldObject('l_counter').createInstance();
            onC.params.threshold = 99; onC.params.autoReset = 'no';
            offC.params.threshold = 99; offC.params.autoReset = 'no';
            gate.wires = [
                { event: 'on',  toWo: 'l_counter', toId: onC.worldId,  action: 'increment' },
                { event: 'off', toWo: 'l_counter', toId: offC.worldId, action: 'increment' },
            ];
            // Two fake sources with distinct ids.
            const srcA = { worldId: 5001 }, srcB = { worldId: 5002 };
            window.__G = { gate, onC, offC, srcA, srcB };
            return true;
        }, mode);
        const tick = () => h.evaluate(() => window.__G.gate.script.update(true, window.app.activeMode));
        const signal = (which, act) => h.evaluate((a) => {
            const g = window.__G;
            g.gate.script.onInput(a.act, a.which === 'A' ? g.srcA : g.srcB);
        }, { which, act });
        const edges = () => h.evaluate(() => ({
            on: window.__G.onC.script.count, off: window.__G.offC.script.count,
            state: window.__G.gate.script._state }));

        // --- 2. AND gate: on only when both, off when either drops ---
        await makeGate('all');
        await tick();
        await signal('A', 'on'); await tick();
        const afterA = await edges();
        await signal('B', 'on'); await tick();
        const afterBoth = await edges();
        await signal('A', 'off'); await tick();
        const afterDrop = await edges();
        console.log('[2] AND', { afterA, afterBoth, afterDrop });
        check('an AND gate stays off with one source, opens on both',
            afterA.on === 0 && afterA.state === false && afterBoth.on === 1 && afterBoth.state === true,
            { afterA, afterBoth });
        check('an AND gate closes (once) when a source drops',
            afterDrop.off === 1 && afterDrop.state === false, afterDrop);

        // --- 3. OR gate: on as soon as one source active ---
        await makeGate('any');
        await tick();
        await signal('A', 'on'); await tick();
        const orOne = await edges();
        await signal('B', 'on'); await tick();
        const orTwo = await edges();
        console.log('[3] OR', { orOne, orTwo });
        check('an OR gate opens on the first active source and stays open',
            orOne.on === 1 && orOne.state === true && orTwo.on === 1, { orOne, orTwo });

        // --- 4. NOT gate: on when a source signalled but is now off ---
        await makeGate('not');
        await tick();
        const notIdle = await edges();   // nothing has signalled -> off
        await signal('A', 'on'); await tick();
        const notActive = await edges();  // source on -> gate off
        await signal('A', 'off'); await tick();
        const notCleared = await edges(); // source off -> gate on
        console.log('[4] NOT', { notIdle, notActive, notCleared });
        check('a NOT gate is off until a source clears, then opens',
            notIdle.state === false && notActive.state === false && notCleared.state === true && notCleared.on === 1,
            { notIdle, notActive, notCleared });

        // --- 5. Real puzzle: two plates + AND gate open a door ---
        const puzzle = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const gate = app.findWorldObject('l_gate').createInstance();
            gate.params = { mode: 'all' };
            gate.script.onPlayReset(pm);
            const door = app.findWorldObject('pr_door').createInstance();
            door.position = new BABYLON.Vector3(80, 1.5, 80);
            gate.wires = [{ event: 'on', toWo: 'pr_door', toId: door.worldId, action: 'open' }];
            const plateA = { worldId: 6001 }, plateB = { worldId: 6002 };
            window.__P = { gate, door, plateA, plateB };
            return { doorClosed: door.script._t !== 1 };
        });
        // Only plate A: door stays shut.
        await h.evaluate(() => {
            const P = window.__P;
            P.gate.script.onInput('on', P.plateA);
            P.gate.script.update(true, window.app.activeMode);
        });
        await h.waitFrames(6);
        const oneUp = await h.evaluate(() => ({ opening: window.__P.door.script._t > 0 }));
        // Both plates: door opens.
        await h.evaluate(() => {
            const P = window.__P;
            P.gate.script.onInput('on', P.plateB);
            P.gate.script.update(true, window.app.activeMode);
        });
        await h.waitFor(() => window.__P.door.script._t === 1, null, 20000);
        console.log('[5] puzzle', { puzzle, oneUp });
        check('two plates + an AND gate open a door only when both are pressed',
            puzzle.doorClosed && !oneUp.opening, { puzzle, oneUp });
        check('pressing the second plate opens the door', true);
        await h.screenshot('gate-puzzle');

        // --- 6. Play reset clears the gate ---
        const reset = await h.evaluate(() => {
            const g = window.__P.gate.script;
            g.onPlayReset(window.app.activeMode);
            return { active: g._active.size, seen: g._seen.size, state: g._state };
        });
        console.log('[6] reset', reset);
        check('a play reset clears the gate state',
            reset.active === 0 && reset.seen === 0 && reset.state === false, reset);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the gate', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — AND, OR, NOT, and a two-plate door that means it.'
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
