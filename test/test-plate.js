/*
 * Pressure-plate test
 * -------------------
 * Verifies l_plate:
 *   - registers with PlateScript + pressed/released outputs,
 *   - standing on it fires `pressed` once (edge) and sinks it; wired to a
 *     door's open, the door opens,
 *   - stepping off fires `released` (momentary) and it rises; wired to the
 *     door's close, the door closes,
 *   - in latch mode it stays pressed after stepping off (no release),
 *   - a play reset lifts it back up,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7145 });
    try {
        await h.start();
        await h.waitForReady(['l_plate', 'pr_door', 'l_counter']);
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
            const p = window.app.findWorldObject('l_plate').createInstance();
            p.position = new BABYLON.Vector3(300, 1, 300);
            return { script: p.script.constructor.name,
                pressed: p.script.outputs.some((o) => o.id === 'pressed'),
                released: p.script.outputs.some((o) => o.id === 'released') };
        });
        console.log('\n[1] registration', reg);
        check('l_plate registers with PlateScript, pressed + released outputs',
            reg.script === 'PlateScript' && reg.pressed && reg.released, reg);

        // Build a plate wired to a door (pressed->open, released->close) + a
        // press counter.
        const top = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const plate = app.findWorldObject('l_plate').createInstance();
            plate.position = new BABYLON.Vector3(50, 1, 50);
            plate.script._wasPlay = null; plate.script.update(true, pm);
            plate.computeWorldMatrix(true);
            const pTop = plate.getBoundingInfo().boundingBox.maximumWorld.y;
            const door = app.findWorldObject('pr_door').createInstance();
            door.position = new BABYLON.Vector3(56, 1.5, 50);
            door.script._wasPlay = null; door.script.update(true, pm);
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(50, 3, 54);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            plate.wires = [
                { event: 'pressed',  toWo: 'pr_door', toId: door.worldId, action: 'open' },
                { event: 'pressed',  toWo: 'l_counter', toId: cnt.worldId, action: 'increment' },
                { event: 'released', toWo: 'pr_door', toId: door.worldId, action: 'close' },
            ];
            window.__P = { plate, door, cnt, top: pTop, baseY: plate.script._baseY };
            return { pTop };
        });

        // --- 2. Stand on -> pressed once, sinks, door opens ---
        const press = await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__P;
            pm.player.position.copyFrom(new BABYLON.Vector3(50, P.top + 0.1, 50));   // on the plate
            for (let i = 0; i < 5; i++) P.plate.script.update(true, pm);   // idempotent: still 1 press
            return { down: P.plate.script._down, presses: P.cnt.script.count,
                sank: P.plate.position.y < P.baseY - 0.1 };
        });
        await h.waitFor(() => window.__P.door.script._t === 1, null, 20000);
        const doorOpen = await h.evaluate(() => window.__P.door.checkCollisions === false ||
            window.__P.door.script._t === 1);
        console.log('[2] press', { press, doorOpen });
        check('standing on the plate fires pressed once, sinks it, and opens the door',
            press.down && press.presses === 1 && press.sank && doorOpen, { press, doorOpen });
        await h.screenshot('plate');

        // --- 3. Step off -> released, rises, door closes (momentary) ---
        const release = await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__P;
            pm.player.position.copyFrom(new BABYLON.Vector3(80, 1, 80));   // step off
            for (let i = 0; i < 5; i++) P.plate.script.update(true, pm);
            return { up: P.plate.script._down === false, risen: Math.abs(P.plate.position.y - P.baseY) < 0.01 };
        });
        await h.waitFor(() => window.__P.door.script._t === 0, null, 20000);
        const doorShut = await h.evaluate(() => window.__P.door.checkCollisions === true ||
            window.__P.door.script._t === 0);
        console.log('[3] release', { release, doorShut });
        check('stepping off fires released, rises the plate, and closes the door (momentary)',
            release.up && release.risen && doorShut, { release, doorShut });

        // --- 4. Latch mode stays pressed after stepping off ---
        const latch = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const plate = app.findWorldObject('l_plate').createInstance();
            plate.position = new BABYLON.Vector3(60, 1, 60);
            plate.params = { latch: 'yes' };
            plate.script._wasPlay = null; plate.script.update(true, pm);
            plate.computeWorldMatrix(true);
            const top = plate.getBoundingInfo().boundingBox.maximumWorld.y;
            pm.player.position.copyFrom(new BABYLON.Vector3(60, top + 0.1, 60));
            plate.script.update(true, pm);
            const pressedOn = plate.script._down;
            pm.player.position.copyFrom(new BABYLON.Vector3(90, 1, 90));   // step off
            for (let i = 0; i < 5; i++) plate.script.update(true, pm);
            return { pressedOn, stillDown: plate.script._down === true };
        });
        console.log('[4] latch', latch);
        check('a latch plate stays pressed after you step off', latch.pressedOn && latch.stillDown, latch);

        // --- 5. Play reset lifts it back up ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__P;
            pm.player.position.copyFrom(new BABYLON.Vector3(50, P.top + 0.1, 50));
            P.plate.script.update(true, pm);   // press it down again
            const wasDown = P.plate.script._down;
            P.plate.script.onPlayReset(pm);
            return { wasDown, up: P.plate.script._down === false &&
                Math.abs(P.plate.position.y - P.baseY) < 0.01 };
        });
        console.log('[5] reset', reset);
        check('a play reset lifts the plate back up', reset.wasDown && reset.up, reset);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the pressure plate', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — stand to press, step off to release; hold the door yourself.'
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
