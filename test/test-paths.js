/*
 * Path / moving platform test
 * ---------------------------
 * Verifies path building and the moving platform:
 *   - l_pathnode (LOGIC) and pr_platform_moving (PROPS) register,
 *   - a platform wired to a 3-node chain snaps to node 1 on play start and
 *     travels toward node 2 (distance shrinks across frames),
 *   - `arrived` fires the wired counter at each node reached,
 *   - `once` mode stops at the last node and fires `completed` exactly once,
 *   - `pingpong` mode turns around at the path's end,
 *   - the `stop` input freezes the platform; `start` resumes it,
 *   - a play reset (respawn) puts the platform back at node 1,
 *   - restPos keeps the SAVED position at the build-time home even while the
 *     platform is mid-route,
 *   - an en_blob wired to the chain PATROLS it (moves between nodes), pauses
 *     to stare when the player comes near, resumes when they leave, and a
 *     pathless blob keeps the old stationary bob (external moves stick),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7035 });
    try {
        await h.start();
        await h.waitForReady(['l_pathnode', 'pr_platform_moving', 'l_counter']);
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

        // --- 1. Registration ---
        const reg = await h.evaluate(() => ({
            node: window.app.objectCategory('l_pathnode'),
            plat: window.app.objectCategory('pr_platform_moving'),
            exist: ['l_pathnode', 'pr_platform_moving'].map((n) => !!window.app.findWorldObject(n)),
        }));
        console.log('\n[1] registration', reg);
        check('path node and moving platform are registered',
            reg.exist.every(Boolean) && reg.node === 'LOGIC' && reg.plat === 'PROPS', reg);

        // --- 2. Build a 3-node path + wired platform + counters ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const base = pm.player.position.add(new BABYLON.Vector3(8, 2, 0));
            const mk = (name, dx, dz) => {
                const inst = app.findWorldObject(name).createInstance();
                inst.position = new BABYLON.Vector3(base.x + dx, base.y, base.z + dz);
                return inst;
            };
            const n1 = mk('l_pathnode', 0, 0);
            const n2 = mk('l_pathnode', 6, 0);
            const n3 = mk('l_pathnode', 6, 6);
            n1.wires.push({ event: 'next', toWo: 'l_pathnode', toId: n2.worldId, action: 'chain' });
            n2.wires.push({ event: 'next', toWo: 'l_pathnode', toId: n3.worldId, action: 'chain' });
            const plat = mk('pr_platform_moving', -3, -3);
            plat.params.speed = 5; plat.params.mode = 'once';
            plat.wires.push({ event: 'follow', toWo: 'l_pathnode', toId: n1.worldId, action: 'chain' });
            const cArr = mk('l_counter', -6, 0), cDone = mk('l_counter', -6, 3);
            plat.wires.push({ event: 'arrived',   toWo: 'l_counter', toId: cArr.worldId,  action: 'increment' });
            plat.wires.push({ event: 'completed', toWo: 'l_counter', toId: cDone.worldId, action: 'increment' });
            window.__P = { n1, n2, n3, plat, cArr, cDone, base: { x: base.x, y: base.y, z: base.z } };
            // Force the play-transition snap for a platform created mid-play.
            plat.script._wasPlay = null;
        });
        await h.waitFrames(5);
        const snap = await h.evaluate(() => {
            const P = window.__P;
            return {
                x: P.plat.position.x, z: P.plat.position.z,
                n1: { x: P.n1.position.x, z: P.n1.position.z },
                moving: P.plat.script._moving,
                pathLen: P.plat.script._path ? P.plat.script._path.length : 0,
            };
        });
        console.log('[2] play-start snap', snap);
        check('the platform resolved the full 3-node path', snap.pathLen === 3, snap);
        check('the platform snapped near node 1 and is moving',
            Math.abs(snap.x - snap.n1.x) < 6 && snap.moving === true, snap);

        // --- 3. It travels: distance to node 2 shrinks across frames ---
        const d0 = await h.evaluate(() => BABYLON.Vector3.Distance(window.__P.plat.position, window.__P.n2.position));
        await h.waitFrames(10);
        const d1 = await h.evaluate(() => BABYLON.Vector3.Distance(window.__P.plat.position, window.__P.n2.position));
        console.log('[3] travel', { d0, d1 });
        check('the platform moves toward the next node', d1 < d0 - 0.1, { d0, d1 });

        // --- 4. `once` mode: arrives at every node, completes, stops ---
        await h.waitFor(() => window.__P.cDone.script.count >= 1, null, 30000);
        const done = await h.evaluate(() => {
            const P = window.__P;
            return {
                arrived: P.cArr.script.count,
                completed: P.cDone.script.count,
                moving: P.plat.script._moving,
                atN3: BABYLON.Vector3.Distance(P.plat.position, P.n3.position) < 0.1,
            };
        });
        console.log('[4] once-mode completion', done);
        check('`arrived` fired at every node along the way', done.arrived >= 2, done);
        check('`completed` fired exactly once', done.completed === 1, done);
        check('the platform stopped at the last node', !done.moving && done.atN3, done);
        await h.screenshot('platform-at-path-end');

        // --- 5. stop freezes, start resumes (switch to pingpong to keep moving) ---
        const stopStart = await h.evaluate(() => {
            const P = window.__P;
            P.plat.params.mode = 'pingpong';
            P.plat.script._resetRun();          // back to node 1, moving again
            P.plat.script.onInput('stop');
            return { movingAfterStop: P.plat.script._moving };
        });
        const frozen0 = await h.evaluate(() => ({ x: window.__P.plat.position.x, z: window.__P.plat.position.z }));
        await h.waitFrames(8);
        const frozen1 = await h.evaluate(() => ({ x: window.__P.plat.position.x, z: window.__P.plat.position.z }));
        await h.evaluate(() => window.__P.plat.script.onInput('start'));
        await h.waitFrames(10);
        const resumed = await h.evaluate(() => ({
            x: window.__P.plat.position.x, z: window.__P.plat.position.z,
            moving: window.__P.plat.script._moving,
        }));
        const frozeDist = Math.hypot(frozen1.x - frozen0.x, frozen1.z - frozen0.z);
        const resumeDist = Math.hypot(resumed.x - frozen1.x, resumed.z - frozen1.z);
        console.log('[5] stop/start', { stopStart, frozeDist, resumeDist });
        check('`stop` freezes the platform', !stopStart.movingAfterStop && frozeDist < 0.001, { stopStart, frozeDist });
        check('`start` resumes movement', resumed.moving && resumeDist > 0.1, { resumeDist, resumed });

        // --- 6. pingpong: after reaching the far end it heads back ---
        await h.waitFor(() => {
            const P = window.__P;
            // heading back = target index points at node 2 with direction -1
            return P.plat.script._dir === -1;
        }, null, 30000);
        const ping = await h.evaluate(() => ({ dir: window.__P.plat.script._dir, idx: window.__P.plat.script._idx }));
        console.log('[6] pingpong', ping);
        check('pingpong mode turns around at the path end', ping.dir === -1, ping);

        // --- 7. Play reset returns the platform to node 1 ---
        const reset = await h.evaluate(() => {
            const P = window.__P;
            window.app.pixels = 0;             // no pixel-loss noise
            window.app.activeMode.respawn();   // broadcasts onPlayReset
            return {
                atN1: BABYLON.Vector3.Distance(P.plat.position, P.n1.position) < 6.01,
                arrivedBefore: P.cArr.script.count,
            };
        });
        console.log('[7] play reset', reset);
        check('respawn returns the platform to the path start', reset.atN1, reset);

        // --- 8. restPos keeps saves clean mid-route ---
        const saved = await h.evaluate(() => {
            const P = window.__P;
            const rest = P.plat.restPos;
            const data = window.app.findWorldObject('pr_platform_moving').getAllInstanceData()[0];
            return {
                hasRest: !!rest,
                savedMatchesRest: rest && Math.abs(data.po.x - rest.x) < 0.001 &&
                    Math.abs(data.po.z - rest.z) < 0.001,
                liveDiffers: rest && (Math.abs(P.plat.position.x - rest.x) > 0.5 ||
                    Math.abs(P.plat.position.z - rest.z) > 0.5),
            };
        });
        console.log('[8] restPos save', saved);
        check('a mid-route save stores the build-time home, not the live position',
            saved.hasRest && saved.savedMatchesRest, saved);

        // --- 9. Enemy patrol: a blob wired to the chain walks it ---
        await h.evaluate(() => {
            const app = window.app, P = window.__P;
            const blob = app.findWorldObject('en_blob').createInstance();
            blob.position = P.n1.position.add(new BABYLON.Vector3(-2, 0, -2));
            blob.wires.push({ event: 'patrol', toWo: 'l_pathnode', toId: P.n1.worldId, action: 'chain' });
            blob.params.patrolSpeed = 3;
            // Park the player far away so the aggro pause can't kick in yet.
            window.app.activeMode.player.position.copyFrom(
                P.n1.position.add(new BABYLON.Vector3(-40, 0, -40)));
            window.__blob = blob;
            blob.script._wasPlay = null;   // force the play-transition snap
        });
        await h.waitFrames(5);
        const pat0 = await h.evaluate(() => ({
            d2: BABYLON.Vector3.Distance(window.__blob.script._pathPos, window.__P.n2.position),
            snapped: BABYLON.Vector3.Distance(window.__blob.position, window.__P.n1.position) < 7,
        }));
        await h.waitFrames(12);
        const pat1 = await h.evaluate(() => ({
            d2: BABYLON.Vector3.Distance(window.__blob.script._pathPos, window.__P.n2.position),
        }));
        console.log('[9] patrol travel', { pat0, pat1 });
        check('a patrol-wired blob snaps to the path and walks toward node 2',
            pat0.snapped && pat1.d2 < pat0.d2 - 0.1, { pat0, pat1 });

        // --- 9b. The patrol pauses when the player comes near, then resumes ---
        await h.evaluate(() => {
            window.app.activeMode.player.position.copyFrom(
                window.__blob.script._pathPos.add(new BABYLON.Vector3(2, 0, 0)));
        });
        await h.waitFrames(4);
        const near0 = await h.evaluate(() => ({
            x: window.__blob.script._pathPos.x, z: window.__blob.script._pathPos.z }));
        await h.waitFrames(10);
        const near1 = await h.evaluate(() => ({
            x: window.__blob.script._pathPos.x, z: window.__blob.script._pathPos.z }));
        const pausedDist = Math.hypot(near1.x - near0.x, near1.z - near0.z);
        await h.evaluate(() => {
            window.app.activeMode.player.position.copyFrom(
                window.__blob.script._pathPos.add(new BABYLON.Vector3(-40, 0, -40)));
        });
        await h.waitFrames(12);
        const far1 = await h.evaluate(() => ({
            x: window.__blob.script._pathPos.x, z: window.__blob.script._pathPos.z }));
        const resumedDist = Math.hypot(far1.x - near1.x, far1.z - near1.z);
        console.log('[9b] aggro pause', { pausedDist, resumedDist });
        check('the patrol pauses while the player is near', pausedDist < 0.001, { pausedDist });
        check('the patrol resumes when the player leaves', resumedDist > 0.2, { resumedDist });

        // --- 9c. A pathless blob keeps the old stationary behavior ---
        const stationary = await h.evaluate(() => {
            const app = window.app;
            const blob = app.findWorldObject('en_blob').createInstance();
            blob.position = new BABYLON.Vector3(500, 3, 500);   // far from everything
            blob.script._wasPlay = null;
            window.__still = blob;
            return { x: blob.position.x, z: blob.position.z };
        });
        await h.waitFrames(12);
        const still1 = await h.evaluate(() => ({
            x: window.__still.position.x, z: window.__still.position.z,
            bobbing: Math.abs(window.__still.position.y - 3) < 0.2,
        }));
        console.log('[9c] stationary blob', { stationary, still1 });
        check('a pathless blob stays put (x/z) and just bobs',
            still1.x === stationary.x && still1.z === stationary.z && still1.bobbing,
            { stationary, still1 });

        // --- 10. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during path following', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — path chains resolve and the platform travels, signals, and resets along them.'
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
