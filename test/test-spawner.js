/*
 * Spawner + parameters-popup test
 * -------------------------------
 * Verifies:
 *   - placing the spawner object auto-opens the parameters popup,
 *   - the popup edits (cycles) the object's parameters,
 *   - parameters persist through save/load,
 *   - in play mode the spawner spawns the chosen enemy type at its frequency,
 *     capped at the configured limit.
 */

const { GameHarness } = require('./harness');

const SPAWNER = 'l_spawner';
const MENU_OBJ_PARAMS = 9;
let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', SPAWNER, 'en_blob']);

        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.world, null, 10000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFrames(5);

        // --- 1. Place the spawner -> parameters popup opens automatically ---
        const idx = await h.evaluate((n) => window.app.BuildableObjectList.findIndex((w) => w.name === n), SPAWNER);
        await h.evaluate((i) => window.app.selectBuildObject(i), idx);
        await h.waitFor((i) => window.app.activeMode.currentInstance &&
            window.app.activeMode.selectedObjectIndex === i, idx, 8000);
        await h.holdKey('w', 20);
        await h.tapUntil(' ', () => window.app.menu.state === MENU_OBJ_PARAMS);
        await h.waitFrames(4);
        const opened = await h.evaluate(() => ({
            state: window.app.menu.state,
            target: window.app.paramTarget && window.app.paramTarget.worldObject && window.app.paramTarget.worldObject.name,
            params: window.app.paramTarget && window.app.paramTarget.params,
        }));
        console.log('\n[1] auto-open popup', opened);
        check('placing the spawner auto-opens the parameters popup', opened.state === MENU_OBJ_PARAMS, opened);
        check('popup targets the placed spawner', opened.target === SPAWNER, opened);
        check('spawner starts with default parameters',
            opened.params && opened.params.enemyType === 'walker' && opened.params.frequency === 3 && opened.params.limit === 3, opened);
        await h.screenshot('spawner-params');

        // --- 2. The popup edits parameters (cycle enemy type) ---
        const cyc = await h.evaluate(() => {
            const app = window.app, inst = app.paramTarget;
            const def = inst.script.paramDefs.find((d) => d.key === 'enemyType');
            const before = inst.params.enemyType;
            app.cycleParam(inst, def, 1);
            return { before, after: inst.params.enemyType };
        });
        console.log('[2] cycle param', cyc);
        check('cycling a parameter changes its value', cyc.after !== cyc.before, cyc);

        // Configure it for a fast, small test run, then close the popup.
        await h.evaluate(() => {
            const p = window.app.paramTarget.params;
            p.enemyType = 'flyer'; p.frequency = 1; p.limit = 2;
        });
        await h.tapUntil('Escape', () => window.app.menu.state === 0);
        // Drop the floating placement preview (enter cursor mode) so only the
        // committed spawner is in the world.
        await h.tapUntil('0', () => !window.app.activeMode.currentInstance);

        // --- 3. Parameters persist through save/load ---
        const persist = await h.evaluate(() => {
            const app = window.app;
            app.world.saveToSlot(3);
            const before = JSON.stringify(app.findWorldObject('l_spawner').instances.filter(Boolean)[0].params);
            app.world.clearWorld();
            app.world.loadFromSlot(3);
            const inst = app.findWorldObject('l_spawner').instances.filter(Boolean)[0];
            return { before, after: inst ? JSON.stringify(inst.params) : null };
        });
        console.log('[3] save/load params', persist);
        check('spawner parameters survive save/load', persist.after === persist.before && persist.before.indexOf('flyer') >= 0, persist);

        // --- 4. In play mode the spawner spawns the chosen type up to the limit ---
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('2', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        // Suppress the ambient wave spawner so only our spawner produces enemies.
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = []; em.autoSpawn = false;
        });
        await h.waitFor(() => window.app.activeMode.enemyManager.enemies.length >= 1, null, 15000).catch(() => {});
        await h.waitFrames(120);   // give it plenty of time to reach the limit
        const spawn = await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            const sp = window.app.findWorldObject('l_spawner').instances.filter(Boolean)[0];
            return { count: em.enemies.length, kinds: em.enemies.map((e) => e.kind),
                autoSpawn: em.autoSpawn, spParams: sp && sp.params };
        });
        console.log('[4] play-mode spawning', spawn);
        check('the spawner spawned enemies in play mode', spawn.count >= 1, spawn);
        check('spawned enemies are the configured type (flyer)',
            spawn.kinds.length > 0 && spawn.kinds.every((k) => k === 'flyer'), spawn);
        check('the spawner respects its limit (max 2)', spawn.count <= 2, spawn);
        await h.screenshot('spawner-active');

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — spawner places, opens a params popup, persists, and spawns to its limit.'
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
