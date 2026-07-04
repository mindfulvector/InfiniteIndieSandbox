/*
 * Aerial rings test
 * -----------------
 * Verifies the fly-through hoop and its race composition:
 *   - l_ring registers and grows its per-instance torus visual,
 *   - passing through fires `flown` once (edge: hovering inside doesn't
 *     re-fire; leaving and re-entering does),
 *   - a ridden VEHICLE trips the ring too (the kart-trigger lesson),
 *   - four rings wired start/checkpoint/checkpoint/finish run a whole
 *     aerial race on the stock l_race machinery -- with an early finish
 *     refused before the checkpoints,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7071 });
    try {
        await h.start();
        await h.waitForReady(['l_ring', 'l_race', 'pr_kart']);
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

        // --- 1. Ring + torus visual; edge-triggered flown ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const ring = app.findWorldObject('l_ring').createInstance();
            ring.position = pm.player.position.add(new BABYLON.Vector3(6, 3.5, 0));
            const count = app.findWorldObject('l_counter').createInstance();
            count.position = ring.position.add(new BABYLON.Vector3(0, -2, 3));
            count.params.threshold = 10; count.params.autoReset = 'no';
            ring.wires.push({ event: 'flown', toWo: 'l_counter', toId: count.worldId, action: 'increment' });
            window.__G = { ring, count };
        });
        await h.waitFrames(5);
        const vis = await h.evaluate(() => ({
            torus: !!window.__G.ring.script._torus,
        }));
        console.log('\n[1] ring visual', vis);
        check('the ring grows its torus visual', vis.torus, vis);

        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__G.ring.position);   // inside
        });
        await h.waitFor(() => window.__G.count.script.count === 1, null, 20000);
        await h.waitFrames(12);   // hover inside: must NOT re-fire
        const hover = await h.evaluate(() => ({ count: window.__G.count.script.count }));
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__G.ring.position.add(new BABYLON.Vector3(6, -3, 0)));
        });
        await h.waitFor(() => window.__G.ring.script._inside === false, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__G.ring.position);
        });
        await h.waitFor(() => window.__G.count.script.count === 2, null, 20000);
        console.log('[2] edge semantics', hover);
        check('flown fires once per pass (hover holds, re-entry re-fires)',
            hover.count === 1, hover);
        await h.screenshot('ring-flythrough');

        // --- 3. A ridden vehicle trips the ring ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.player.position.copyFrom(window.__G.ring.position.add(new BABYLON.Vector3(8, -3, 4)));
            const kart = app.findWorldObject('pr_kart').createInstance();
            kart.position = pm.player.position.add(new BABYLON.Vector3(3, 0.5, 0));
            kart.script._wasPlay = null;
            window.__K = kart;
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__K.position.add(new BABYLON.Vector3(0.4, 0.8, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__K, null, 20000);
        await h.evaluate(() => {
            // Drive the KART mesh through the hoop; the rider sits above it.
            window.__K.position.copyFrom(window.__G.ring.position);
            window.__K._kartBody.vy = 0;
        });
        await h.waitFor(() => window.__G.count.script.count === 3, null, 20000);
        await h.evaluate(() => {
            window.app.keysPressed[' '] = true;   // hop out
        });
        await h.waitFor(() => window.app.activeMode.driving === null, null, 20000);
        await h.evaluate(() => { window.app.keysPressed[' '] = false; });
        console.log('[3] vehicle fly-through counted');
        check('a ridden vehicle trips the ring', true);

        // --- 4. Four rings + l_race = an aerial course ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const base = pm.player.position.add(new BABYLON.Vector3(-10, 4, -10));
            const mk = (dx, dz) => {
                const r = app.findWorldObject('l_ring').createInstance();
                r.position = new BABYLON.Vector3(base.x + dx, base.y, base.z + dz);
                return r;
            };
            const race = app.findWorldObject('l_race').createInstance();
            race.position = base.add(new BABYLON.Vector3(0, -2, 0));
            race.params.checkpoints = 2;
            const fin = app.findWorldObject('l_counter').createInstance();
            fin.position = race.position.add(new BABYLON.Vector3(2, 0, 0));
            fin.params.threshold = 10; fin.params.autoReset = 'no';
            race.wires.push({ event: 'finished', toWo: 'l_counter', toId: fin.worldId, action: 'increment' });
            const r1 = mk(0, 0), r2 = mk(6, 0), r3 = mk(12, 0), r4 = mk(18, 0);
            r1.wires.push({ event: 'flown', toWo: 'l_race', toId: race.worldId, action: 'start' });
            r2.wires.push({ event: 'flown', toWo: 'l_race', toId: race.worldId, action: 'checkpoint' });
            r3.wires.push({ event: 'flown', toWo: 'l_race', toId: race.worldId, action: 'checkpoint' });
            r4.wires.push({ event: 'flown', toWo: 'l_race', toId: race.worldId, action: 'finish' });
            window.__C = { race, fin, rings: [r1, r2, r3, r4] };
        });
        await h.waitFrames(5);
        // Early finish refused: through the finish ring with no start.
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__C.rings[3].position);
        });
        await h.waitFrames(10);
        const early = await h.evaluate(() => ({
            fin: window.__C.fin.script.count,
            racing: window.__C.race.script._racing,
        }));
        console.log('[4] early finish', early);
        check('the finish ring is refused before the start', early.fin === 0 && !early.racing, early);

        // The full course, ring by ring.
        for (let i = 0; i < 4; i++) {
            await h.evaluate((i) => {
                const pm = window.app.activeMode;
                pm.player.position.copyFrom(window.__C.rings[i].position.add(new BABYLON.Vector3(0, 0, i % 2 ? 0.5 : -0.5)));
            }, i);
            if (i < 3) {
                await h.waitFor((i) => window.__C.rings[i].script._inside === true, i, 20000);
                // Step out of the ring zone before the next hop.
                await h.evaluate((i) => {
                    const pm = window.app.activeMode;
                    pm.player.position.copyFrom(window.__C.rings[i].position.add(new BABYLON.Vector3(3, -0.5, 3)));
                }, i);
                await h.waitFor((i) => window.__C.rings[i].script._inside === false, i, 20000);
            }
        }
        await h.waitFor(() => window.__C.fin.script.count === 1, null, 20000);
        const course = await h.evaluate(() => ({
            fin: window.__C.fin.script.count,
            racing: window.__C.race.script._racing,
        }));
        console.log('[5] aerial course', course);
        check('four wired rings run a full race on the stock machinery',
            course.fin === 1 && !course.racing, course);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during rings', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — hoops flash, edges hold, and the sky becomes a racetrack.'
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
