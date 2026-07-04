/*
 * World sharing (export/import) test
 * ----------------------------------
 * Verifies world files:
 *   - the main menu's Share screen opens (6 -> state 15) and returns,
 *   - exporting with no world is refused,
 *   - exporting a built world produces a versioned iis-world envelope
 *     containing the placed objects (transforms, params, wires),
 *   - imports reject garbage JSON, foreign formats, and too-new versions,
 *     leaving the current world untouched,
 *   - a full export -> clear -> import round-trip restores objects with
 *     their positions, params, and wires,
 *   - downloadWorld runs the browser download path without errors,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7046 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_counter', 'l_spawner']);

        // --- 1. The Share screen opens from the main menu and returns ---
        await h.tapUntil('6', () => window.app.menu.state === 15);   // MENU_SHARE
        await h.waitFrames(4);
        await h.screenshot('share-screen');
        check('main menu 6 opens the Share screen (state 15)',
            await h.evaluate(() => window.app.menu.state === 15));
        const noWorld = await h.evaluate(() => window.app.exportWorld());
        check('exporting with no world is refused', noWorld === null, { noWorld });
        await h.tapUntil('0', () => window.app.menu.state === 1);    // back to MAIN

        // --- 2. Build a distinctive world and export it ---
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        const exported = await h.evaluate(() => {
            const app = window.app;
            const counter = app.findWorldObject('l_counter').createInstance();
            counter.position = new BABYLON.Vector3(3, 1, 7);
            counter.params.threshold = 5; counter.params.autoReset = 'no';
            const spawner = app.findWorldObject('l_spawner').createInstance();
            spawner.position = new BABYLON.Vector3(6, 1, 7);
            counter.wires.push({ event: 'reached', toWo: 'l_spawner', toId: spawner.worldId, action: 'spawn' });
            window.__ids = { counterId: counter.worldId, spawnerId: spawner.worldId };
            const json = app.exportWorld();
            const payload = JSON.parse(json);
            window.__exportJson = json;
            return {
                format: payload.format, version: payload.version,
                count: payload.objects.length,
                counter: payload.objects.find((o) => o.wo === 'l_counter' && o.id === counter.worldId),
            };
        });
        console.log('\n[2] export', { format: exported.format, version: exported.version, count: exported.count });
        check('the export is a versioned iis-world envelope',
            exported.format === 'iis-world' && exported.version === 1 && exported.count > 100, exported);
        check('exported objects carry position, params, and wires',
            exported.counter && exported.counter.po && exported.counter.pr.threshold === 5 &&
            exported.counter.wi.length === 1 && exported.counter.wi[0].event === 'reached', exported.counter);

        // --- 3. Bad files are rejected and change nothing ---
        const rejects = await h.evaluate(() => {
            const app = window.app;
            const live = () => app.findWorldObject('l_counter').instances.filter(Boolean).length;
            const before = live();
            return {
                garbage: app.importWorldData('{{{not json'),
                foreign: app.importWorldData('{"format":"other-game","objects":[]}'),
                tooNew: app.importWorldData('{"format":"iis-world","version":99,"objects":[]}'),
                untouched: live() === before,
            };
        });
        console.log('[3] rejections', rejects);
        check('garbage, foreign, and too-new files are all refused',
            !rejects.garbage && !rejects.foreign && !rejects.tooNew, rejects);
        check('a refused import leaves the world untouched', rejects.untouched, rejects);

        // --- 4. Round-trip: clear, import, everything restored ---
        const roundTrip = await h.evaluate(() => {
            const app = window.app;
            app.world.clearWorld();
            const emptied = app.findWorldObject('l_counter').instances.filter(Boolean).length === 0;
            const ok = app.importWorldData(window.__exportJson);
            const counter = app.findInstance('l_counter', window.__ids.counterId);
            return {
                emptied, ok,
                restored: !!counter,
                pos: counter ? { x: counter.position.x, z: counter.position.z } : null,
                threshold: counter ? counter.params.threshold : null,
                wire: counter && counter.wires.length === 1 &&
                    counter.wires[0].toId === window.__ids.spawnerId,
            };
        });
        console.log('[4] round trip', roundTrip);
        check('the import restores the cleared world', roundTrip.emptied && roundTrip.ok && roundTrip.restored, roundTrip);
        check('positions, params, and wires all survive the file',
            roundTrip.pos && Math.abs(roundTrip.pos.x - 3) < 0.001 && roundTrip.threshold === 5 && roundTrip.wire === true,
            roundTrip);

        // --- 5. The download path runs without exploding ---
        const dl = await h.evaluate(() => window.app.downloadWorld());
        check('downloadWorld runs the browser download path', dl === true, { dl });

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during sharing', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — worlds export to versioned files, reject bad files, and round-trip intact.'
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
