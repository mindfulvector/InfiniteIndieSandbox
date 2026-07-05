/*
 * Conveyor-belt test
 * ------------------
 * Verifies l_conveyor:
 *   - registers with ConveyorScript + a carrying output and on/off inputs,
 *   - a rider standing ON TOP is carried along the belt direction (east ->
 *     +x), firing `carrying` when they step aboard,
 *   - a player standing beside/off the belt is NOT carried,
 *   - the direction param changes the carry axis (north -> +z),
 *   - switching it off stops the carry,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7134 });
    try {
        await h.start();
        await h.waitForReady(['l_conveyor', 'l_counter']);
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
            const c = window.app.findWorldObject('l_conveyor').createInstance();
            c.position = new BABYLON.Vector3(300, 1, 300);
            return { script: c.script.constructor.name,
                out: c.script.outputs.some((o) => o.id === 'carrying'),
                ins: c.script.inputs.map((i) => i.id).sort().join(',') };
        });
        console.log('\n[1] registration', reg);
        check('l_conveyor registers with ConveyorScript, carrying output + on/off inputs',
            reg.script === 'ConveyorScript' && reg.out && reg.ins === 'off,on', reg);

        // Helper: place a belt at a fixed spot; return its top Y.
        const setup = await h.evaluate(() => {
            const app = window.app;
            const c = app.findWorldObject('l_conveyor').createInstance();
            c.position = new BABYLON.Vector3(50, 1, 50);
            c.params = { dir: 'east', speed: 6 };
            c.script._wasPlay = null; c.script.update(false, app.activeMode);
            c.computeWorldMatrix(true);
            const top = c.getBoundingInfo().boundingBox.maximumWorld.y;
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(50, 3, 54);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            c.wires = [{ event: 'carrying', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__C = { c, cnt, top };
            return { top };
        });

        // --- 2. On top -> carried east (+x), fires carrying ---
        const carried = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            pm.driving = null;
            pm.player.position.copyFrom(new BABYLON.Vector3(50, C.top + 0.1, 50));
            const x0 = pm.player.position.x, z0 = pm.player.position.z;
            for (let i = 0; i < 60; i++) C.c.script.update(true, pm);
            return { dx: pm.player.position.x - x0, dz: pm.player.position.z - z0,
                fired: C.cnt.script.count };
        });
        console.log('[2] carry east', carried);
        check('a rider on the belt is carried east (+x) and fires carrying',
            carried.dx > 1 && Math.abs(carried.dz) < 0.5 && carried.fired === 1, carried);
        await h.screenshot('conveyor');

        // --- 3. Off the belt -> not carried ---
        const beside = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            pm.player.position.copyFrom(new BABYLON.Vector3(50, C.top + 0.1, 60));   // off the footprint (z far)
            const x0 = pm.player.position.x;
            for (let i = 0; i < 60; i++) C.c.script.update(true, pm);
            return { dx: Math.abs(pm.player.position.x - x0) };
        });
        console.log('[3] beside', beside);
        check('a player off the belt is not carried', beside.dx < 0.2, beside);

        // --- 4. Direction param changes the axis (north -> +z) ---
        const north = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            C.c.params.dir = 'north';
            pm.player.position.copyFrom(new BABYLON.Vector3(50, C.top + 0.1, 50));
            const x0 = pm.player.position.x, z0 = pm.player.position.z;
            for (let i = 0; i < 60; i++) C.c.script.update(true, pm);
            return { dx: pm.player.position.x - x0, dz: pm.player.position.z - z0 };
        });
        console.log('[4] carry north', north);
        check('the direction param changes the carry axis (north -> +z)',
            north.dz > 1 && Math.abs(north.dx) < 0.5, north);

        // --- 5. Switched off -> no carry ---
        const off = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            C.c.params.dir = 'east';
            C.c.script.onInput('off');
            pm.player.position.copyFrom(new BABYLON.Vector3(50, C.top + 0.1, 50));
            const x0 = pm.player.position.x;
            for (let i = 0; i < 60; i++) C.c.script.update(true, pm);
            C.c.script.onInput('on');
            return { dx: Math.abs(pm.player.position.x - x0) };
        });
        console.log('[5] off', off);
        check('switching the belt off stops the carry', off.dx < 0.2, off);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the conveyor', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — stand on the belt and it carries you along.'
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
