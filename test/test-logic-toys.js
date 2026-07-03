/*
 * Logic-toys test (counter + timer)
 * ---------------------------------
 * Verifies the counter and timer logic toys and their wiring interplay:
 *   - a counter wired reached->spawn gates a spawner behind N events,
 *     with autoReset zeroing the count when the threshold fires,
 *   - counter increment/decrement/reset math is synchronous and correct,
 *   - a repeating timer wired tick->spawn drives spawns while active,
 *     and 'stop' really stops it,
 *   - a non-repeating timer fires exactly once then deactivates,
 *   - a self-wired counter (changed -> its own increment) is stopped by
 *     App.fireEvent's depth guard instead of hanging or crashing the game,
 *   - counter params (threshold) and wires persist through save/load (slot 7).
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7022 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_counter', 'l_timer', 'l_spawner', 'en_blob']);

        // New game -> play mode, controller ready, ambient wave spawner off.
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // --- 1. Counter gates a spawner: reached -> spawn after 3 increments ---
        const ids = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const counter = app.findWorldObject('l_counter').createInstance();
            counter.position = pm.player.position.add(new BABYLON.Vector3(4, 1, 4));
            counter.params.threshold = 3;
            counter.params.autoReset = 'yes';
            const spawner = app.findWorldObject('l_spawner').createInstance();
            spawner.position = pm.player.position.add(new BABYLON.Vector3(-4, 0.25, 4));
            spawner.params.enemyType = 'flyer';
            spawner.params.limit = 5;
            spawner.params.startActive = 'no';
            spawner.params.frequency = 1;
            return { counterId: counter.worldId, spawnerId: spawner.worldId };
        });
        await h.waitFrames(5);
        const gate = await h.evaluate((s) => {
            const app = window.app, pm = app.activeMode;
            const counter = app.findInstance('l_counter', s.counterId);
            app.addWire(counter, 'reached', 'l_spawner', s.spawnerId, 'spawn');
            counter.script.onInput('increment');
            counter.script.onInput('increment');
            const countAt2 = counter.script.count;
            const enemiesAt2 = pm.enemyManager.enemies.length;
            counter.script.onInput('increment');   // hits threshold 3 -> reached
            const countAfterReached = counter.script.count;
            return { countAt2, enemiesAt2, countAfterReached };
        }, ids);
        console.log('\n[1] counter gates spawner', gate);
        check('two increments raise the count to 2', gate.countAt2 === 2, gate);
        check('below the threshold nothing spawns', gate.enemiesAt2 === 0, gate);
        check('reaching the threshold auto-resets the count to 0', gate.countAfterReached === 0, gate);
        await h.waitFor(() => window.app.activeMode.enemyManager.enemies.length >= 1, null, 20000);
        await h.waitFrames(10);   // let any further spawner updates settle
        const spawned = await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            return { count: em.enemies.length, kinds: em.enemies.map((e) => e.kind) };
        });
        console.log('[1] reached -> spawn', spawned);
        check('the reached event spawned exactly one enemy', spawned.count === 1, spawned);
        check('the spawned enemy is the configured type (flyer)',
            spawned.kinds.length === 1 && spawned.kinds[0] === 'flyer', spawned);
        await h.screenshot('counter-gated-spawn');

        // --- 2. Counter math is synchronous: increment/decrement/reset ---
        const math = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const c2 = app.findWorldObject('l_counter').createInstance();
            c2.position = pm.player.position.add(new BABYLON.Vector3(6, 1, -4));
            c2.params.threshold = 10;   // stay well below the threshold
            const s = c2.script;
            const steps = {};
            s.onInput('increment'); steps.afterInc1 = s.count;
            s.onInput('decrement'); steps.afterDec = s.count;
            s.onInput('increment'); s.onInput('increment'); steps.afterInc2 = s.count;
            s.onInput('reset'); steps.afterReset = s.count;
            return steps;
        });
        console.log('\n[2] counter math', math);
        check('increment: 0 -> 1', math.afterInc1 === 1, math);
        check('decrement: 1 -> 0', math.afterDec === 0, math);
        check('increment x2: 0 -> 2', math.afterInc2 === 2, math);
        check('reset: -> 0', math.afterReset === 0, math);

        // --- 3. A repeating timer drives spawns; stop stops it ---
        const timerIds = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            const timer = app.findWorldObject('l_timer').createInstance();
            timer.position = pm.player.position.add(new BABYLON.Vector3(4, 1, -6));
            timer.params.interval = 1;
            timer.params.repeat = 'yes';
            timer.params.startActive = 'no';
            const sp2 = app.findWorldObject('l_spawner').createInstance();
            sp2.position = pm.player.position.add(new BABYLON.Vector3(-6, 0.25, -4));
            sp2.params.enemyType = 'flyer';
            sp2.params.limit = 3;
            sp2.params.startActive = 'no';
            sp2.params.frequency = 1;
            app.addWire(timer, 'tick', 'l_spawner', sp2.worldId, 'spawn');
            return { timerId: timer.worldId, sp2Id: sp2.worldId };
        }, null);
        await h.waitFrames(30);
        const idle = await h.evaluate(() => window.app.activeMode.enemyManager.enemies.length);
        console.log('\n[3] timer idle enemy count', idle);
        check('an inactive timer spawns nothing', idle === 0, { idle });

        await h.evaluate((s) =>
            window.app.findInstance('l_timer', s.timerId).script.onInput('start'), timerIds);
        await h.waitFor(() => window.app.activeMode.enemyManager.enemies.length >= 1, null, 30000);
        await h.evaluate((s) =>
            window.app.findInstance('l_timer', s.timerId).script.onInput('stop'), timerIds);
        await h.waitFrames(10);   // let any in-flight tick/spawn settle
        const n1 = await h.evaluate(() => window.app.activeMode.enemyManager.enemies.length);
        await h.waitFrames(60);
        const n2 = await h.evaluate(() => window.app.activeMode.enemyManager.enemies.length);
        console.log('[3] timer start/stop', { n1, n2 });
        check('a started timer ticks the wired spawner', n1 >= 1, { n1 });
        check('stopping the timer stops further spawns', n2 === n1, { n1, n2 });
        await h.screenshot('timer-driven-spawns');

        // --- 4. One-shot timer (repeat no) fires exactly once ---
        const oneShotIds = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            const t2 = app.findWorldObject('l_timer').createInstance();
            t2.position = pm.player.position.add(new BABYLON.Vector3(-4, 1, -6));
            t2.params.interval = 1;
            t2.params.repeat = 'no';
            t2.params.startActive = 'no';
            const sp3 = app.findWorldObject('l_spawner').createInstance();
            sp3.position = pm.player.position.add(new BABYLON.Vector3(6, 0.25, 4));
            sp3.params.enemyType = 'flyer';
            sp3.params.limit = 5;
            sp3.params.startActive = 'no';
            sp3.params.frequency = 1;
            app.addWire(t2, 'tick', 'l_spawner', sp3.worldId, 'spawn');
            t2.script.onInput('start');
            return { t2Id: t2.worldId };
        });
        await h.waitFor(() => window.app.activeMode.enemyManager.enemies.length >= 1, null, 30000);
        const oneShotActive = await h.evaluate((s) =>
            window.app.findInstance('l_timer', s.t2Id).script._active, oneShotIds);
        await h.waitFrames(60);
        const oneShotCount = await h.evaluate(() => window.app.activeMode.enemyManager.enemies.length);
        console.log('\n[4] one-shot timer', { oneShotActive, oneShotCount });
        check('a non-repeating timer deactivates after its tick', oneShotActive === false, { oneShotActive });
        check('a one-shot timer spawns exactly one enemy', oneShotCount === 1, { oneShotCount });

        // --- 5. Wire loop guard: counter wired changed -> its own increment ---
        const loop = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const c3 = app.findWorldObject('l_counter').createInstance();
            c3.position = pm.player.position.add(new BABYLON.Vector3(-6, 1, 6));
            app.addWire(c3, 'changed', 'l_counter', c3.worldId, 'increment');   // self-loop!
            c3.script.onInput('increment');   // must return, not hang
            return { count: c3.script.count };
        });
        console.log('\n[5] wire loop guard', loop);
        check('a self-wired counter returns instead of hanging (finite count)',
            Number.isFinite(loop.count), loop);
        check('the depth guard stopped the cascade (count <= 12)', loop.count <= 12, loop);
        await h.waitFrames(5);   // the game keeps running after the loop
        const looped = await h.evaluate(() => ({ mode: window.app.activeMode.constructor.name }));
        check('the game keeps running after the wire loop', looped.mode === 'PlayMode', looped);
        const overflow = h.pageErrors.filter((e) => /RangeError|stack size|stack overflow/i.test(e));
        check('no RangeError / stack overflow page errors', overflow.length === 0, { overflow });

        // --- 6. Persistence: counter params + wires survive save/load (slot 7) ---
        const persist = await h.evaluate((s) => {
            const app = window.app;
            const counter = app.findInstance('l_counter', s.counterId);
            counter.params.threshold = 5;
            app.world.saveToSlot(7);
            app.world.clearWorld();
            app.world.loadFromSlot(7);
            const counters = app.findWorldObject('l_counter').instances.filter(Boolean);
            const restored = counters.find((c) => (c.wires || []).some((w) =>
                w.event === 'reached' && w.toWo === 'l_spawner' && w.action === 'spawn'));
            return {
                counters: counters.length,
                found: !!restored,
                threshold: restored ? restored.params.threshold : null,
                wires: restored ? restored.wires : null,
            };
        }, ids);
        console.log('\n[6] persistence', persist);
        check('the reached->spawn wire survives save/load', persist.found === true, persist);
        check('the edited threshold (5) survives save/load', persist.threshold === 5, persist);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — counters gate spawners, count math is exact, timers drive and stop spawns, wire loops are guarded, and params/wires persist.'
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
