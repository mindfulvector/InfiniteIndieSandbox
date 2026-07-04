/*
 * Traversal toys test (grind rails + trampolines)
 * -----------------------------------------------
 * Verifies the two traversal toys:
 *   - a trampoline launches the player well above normal jump height,
 *     squashes on launch, fires `bounced` into a wired counter, and hands
 *     the CC's stock jump speed back after liftoff,
 *   - a rail wired to a node chain carries the player hands-free to the end
 *     of the line (CC suspended during the ride, restarted after),
 *   - grindStart/grindEnd fire exactly once per ride,
 *   - respawning mid-grind ends the ride cleanly,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7065 });
    try {
        await h.start();
        await h.waitForReady(['t_tramp', 'pr_rail', 'l_pathnode', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Trampoline: launch, squash, wired bounce, speed restore ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const pad = app.findWorldObject('t_tramp').createInstance();
            pad.position = pm.player.position.add(new BABYLON.Vector3(4, -0.4, 0));
            pad.params.power = 14;
            const laps = app.findWorldObject('l_counter').createInstance();
            laps.position = pad.position.add(new BABYLON.Vector3(0, 0, 4));
            laps.params.threshold = 10; laps.params.autoReset = 'no';
            pad.wires.push({ event: 'bounced', toWo: 'l_counter', toId: laps.worldId, action: 'increment' });
            window.__T = { pad, laps };
        });
        await h.waitFrames(5);
        const launch = await h.evaluate(() => {
            const pm = window.app.activeMode, pad = window.__T.pad;
            // The squash recovers in ~14 frames (wall-clock milliseconds at
            // headless fps), so record its minimum in-page from the start.
            window.__sqMin = 1;
            const watch = () => {
                window.__sqMin = Math.min(window.__sqMin, pad.scaling.y);
                if (window.__sqMin > 0.99) requestAnimationFrame(watch);
            };
            requestAnimationFrame(watch);
            pm.player.position.copyFrom(pad.position.add(new BABYLON.Vector3(0, 0.35, 0)));
            return { top: pad.position.y + 0.25 };
        });
        await h.waitFor((t) => window.app.activeMode.player.position.y > t.top + 4, launch, 30000);
        const sprung = await h.evaluate(() => ({
            squash: window.__sqMin < 0.6,
            count: window.__T.laps.script.count,
        }));
        console.log('\n[1] trampoline', sprung);
        check('the pad launches the player past +4 (normal jumps cannot)', true);
        check('the pad squashes and fires `bounced` into the counter',
            sprung.squash && sprung.count >= 1, sprung);
        await h.screenshot('trampoline-launch');
        await h.waitFor(() => window.app.activeMode._bounceRestore === 0 &&
            window.app.activeMode.cc._actionMap.idleJump.speed === 6, null, 20000);
        console.log('[1b] jump speed restored');
        check('the CC\'s stock jump speed comes back after liftoff', true);

        // --- 2. The rail carries the player to the end of the line ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            // Park the player away from the pad first.
            pm.player.position = window.__T.pad.position.add(new BABYLON.Vector3(-8, 1.5, -8));
            const base = pm.player.position.add(new BABYLON.Vector3(0, 0.5, 6));
            const mk = (name, dx, dz) => {
                const inst = app.findWorldObject(name).createInstance();
                inst.position = new BABYLON.Vector3(base.x + dx, base.y, base.z + dz);
                return inst;
            };
            const rail = mk('pr_rail', 0, 0);
            const b = mk('l_pathnode', 0, 5), c = mk('l_pathnode', 4, 8);
            rail.wires.push({ event: 'path', toWo: 'l_pathnode', toId: b.worldId, action: 'chain' });
            b.wires.push({ event: 'next', toWo: 'l_pathnode', toId: c.worldId, action: 'chain' });
            const starts = mk('l_counter', -3, 0), ends = mk('l_counter', -3, 2);
            [starts, ends].forEach((k) => { k.params.threshold = 10; k.params.autoReset = 'no'; });
            rail.wires.push({ event: 'grindStart', toWo: 'l_counter', toId: starts.worldId, action: 'increment' });
            rail.wires.push({ event: 'grindEnd', toWo: 'l_counter', toId: ends.worldId, action: 'increment' });
            window.__R = { rail, b, c, starts, ends };
        });
        await h.waitFrames(5);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__R.rail.position.add(new BABYLON.Vector3(0.3, 1.0, 0)));
        });
        await h.waitFor(() => !!window.app.activeMode.grinding, null, 20000);
        const started = await h.evaluate(() => ({ starts: window.__R.starts.script.count }));
        console.log('[2] grinding', started);
        check('stepping onto the rail head starts the ride (grindStart wired)',
            started.starts === 1, started);
        await h.screenshot('grinding');
        await h.waitFor(() => window.app.activeMode.grinding === null, null, 30000);
        // grindEnd fires on the rail script's NEXT update after the ride
        // ends -- wait on the wired counter, not on the same frame.
        await h.waitFor(() => window.__R.ends.script.count >= 1, null, 20000);
        const done = await h.evaluate(() => {
            const pm = window.app.activeMode;
            return {
                nearEnd: BABYLON.Vector3.Distance(pm.player.position, window.__R.c.position) < 3,
                starts: window.__R.starts.script.count,
                ends: window.__R.ends.script.count,
            };
        });
        console.log('[3] end of the line', done);
        check('the rail carries the player to the last node and lets go',
            done.nearEnd, done);
        check('grindStart/grindEnd fired exactly once each',
            done.starts === 1 && done.ends === 1, done);

        // --- 4. Respawn mid-grind ends the ride cleanly ---
        await h.waitFor(() => window.__R.rail.script._cool === 0, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__R.rail.position.add(new BABYLON.Vector3(0.3, 1.0, 0)));
        });
        await h.waitFor(() => !!window.app.activeMode.grinding, null, 20000);
        await h.evaluate(() => {
            window.app.pixels = 0;
            window.app.activeMode.respawn();
        });
        const after = await h.evaluate(() => ({
            grinding: window.app.activeMode.grinding,
            atSpawn: BABYLON.Vector3.Distance(
                window.app.activeMode.player.position, window.app.activeMode.spawnPoint) < 4,
        }));
        console.log('[4] respawn mid-grind', after);
        check('respawning mid-grind ends the ride at spawn',
            after.grinding === null && after.atSpawn, after);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during traversal', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — trampolines launch and rails carry, with clean wiring edges.'
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
