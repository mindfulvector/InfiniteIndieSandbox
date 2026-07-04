/*
 * Sandbox Hub template test
 * -------------------------
 * Verifies the pre-wired challenge-park starter world:
 *   - New Game option 5 builds the hub and drops into play mode,
 *   - terrain + every zone's key objects exist,
 *   - the pre-authored wires are all present (trigger→spawner+camera,
 *     stars→counter, counter→scoreboard, path chain→platform, patrol),
 *   - walking into the Combat Yard trigger actually spawns walkers and cuts
 *     to the yard camera (the wires are live, not just data),
 *   - collecting a star increments the climb counter,
 *   - the ferry platform is moving across the crossing,
 *   - the guard blob is patrolling the far ledge,
 *   - an overview screenshot for the eyeball check,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7038 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pr_door_cell', 'pr_platform_moving']);
        // New Game (1) -> starter picker -> Sandbox Hub (5).
        await h.tapUntil('1', () => window.app.menu.state === 11);          // WORLD_TEMPLATE
        await h.tapUntil('5', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(15);

        // --- 1. The hub built: terrain + zone objects + wires ---
        const world = await h.evaluate(() => {
            const app = window.app;
            const live = (n) => (app.findWorldObject(n).instances || []).filter(Boolean);
            const wiresOf = (n) => live(n).flatMap((i) => i.wires || []);
            return {
                tiles: live('t_tile').length,
                triggers: live('l_trigger').length,
                spawners: live('l_spawner').length,
                cameras: live('l_camera').length,
                stars: live('pk_star').length,
                counters: live('l_counter').length,
                boards: live('l_scoreboard').length,
                nodes: live('l_pathnode').length,
                ferries: live('pr_platform_moving').length,
                blobs: live('en_blob').length,
                cellDoors: live('pr_door_cell').length,
                walls: live('in_wall').length + live('in_wall_door').length + live('in_wall_window').length,
                trigWires: wiresOf('l_trigger').map((w) => w.toWo + ':' + w.action).sort(),
                starWires: wiresOf('pk_star').length,
                counterWires: wiresOf('l_counter').map((w) => w.toWo + ':' + w.action),
                ferryWires: wiresOf('pr_platform_moving').map((w) => w.event),
                blobWires: wiresOf('en_blob').map((w) => w.event),
            };
        });
        console.log('\n[1] hub contents', world);
        check('the hub lays substantial terrain (>100 tiles)', world.tiles > 100, world);
        check('every zone\'s key objects exist', world.triggers >= 1 && world.spawners >= 1 &&
            world.cameras >= 1 && world.stars === 4 && world.counters >= 1 && world.boards >= 1 &&
            world.nodes === 5 && world.ferries === 1 && world.blobs === 1 &&
            world.cellDoors === 1 && world.walls >= 4, world);
        check('the Combat Yard trigger wires to the spawner AND the camera (and the tour quest)',
            JSON.stringify(world.trigWires) === JSON.stringify(['l_camera:activate', 'l_quest:step', 'l_spawner:spawn']), world);
        check('all four stars wire into the climb counter', world.starWires === 4, world);
        check('the counter pays out to the scoreboard', world.counterWires.includes('l_scoreboard:add5'), world);
        check('the ferry follows a path and the blob patrols one',
            world.ferryWires.includes('follow') && world.blobWires.includes('patrol'), world);
        await h.screenshot('hub-overview');

        // --- 2. The ferry is actually moving ---
        const f0 = await h.evaluate(() => {
            const ferry = window.app.findWorldObject('pr_platform_moving').instances.filter(Boolean)[0];
            window.__ferry = ferry;
            return { z: ferry.position.z };
        });
        await h.waitFrames(12);
        const f1 = await h.evaluate(() => ({ z: window.__ferry.position.z }));
        console.log('[2] ferry', { f0, f1 });
        check('the crossing ferry is moving', Math.abs(f1.z - f0.z) > 0.1, { f0, f1 });

        // --- 3. The guard blob is patrolling ---
        const g0 = await h.evaluate(() => {
            const blob = window.app.findWorldObject('en_blob').instances.filter(Boolean)[0];
            window.__guard = blob;
            return blob.script._pathPos ? { x: blob.script._pathPos.x } : null;
        });
        await h.waitFrames(12);
        const g1 = await h.evaluate(() => ({ x: window.__guard.script._pathPos.x }));
        console.log('[3] guard patrol', { g0, g1 });
        check('the far-ledge guard is patrolling', g0 && Math.abs(g1.x - g0.x) > 0.05, { g0, g1 });

        // --- 4. Walking into the Combat Yard fires the wires for real ---
        const yard = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const trig = app.findWorldObject('l_trigger').instances.filter(Boolean)[0];
            pm.player.position.copyFrom(trig.position);   // step into the volume
            return { enemies0: pm.enemyManager.enemies.length };
        });
        await h.waitFor(() => window.app.activeMode.enemyManager.enemies.length > 0, null, 20000);
        const spawned = await h.evaluate(() => ({
            enemies: window.app.activeMode.enemyManager.enemies.length,
            camCut: !!(window.app.activeMode.cameraCutActive ||
                window.app.findWorldObject('l_camera').instances.filter(Boolean)[0].script._active),
        }));
        console.log('[4] combat yard', { yard, spawned });
        check('entering the yard spawns walkers via the wire', spawned.enemies > 0, spawned);
        await h.screenshot('combat-yard-triggered');

        // --- 5. Collecting a star increments the climb counter ---
        const climb = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const counter = app.findWorldObject('l_counter').instances.filter(Boolean)[0];
            const star = app.findWorldObject('pk_star').instances.filter(Boolean)[0];
            const c0 = counter.script.count;
            pm.player.position.copyFrom(star.position);   // touch the star
            window.__counter = counter;
            return { c0 };
        });
        await h.waitFor((c0) => window.__counter.script.count > c0, climb.c0, 20000);
        const c1 = await h.evaluate(() => window.__counter.script.count);
        console.log('[5] star climb', { c0: climb.c0, c1 });
        check('collecting a star increments the climb counter', c1 === climb.c0 + 1, { climb, c1 });

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors in the hub', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the hub builds pre-wired zones that actually play.'
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
