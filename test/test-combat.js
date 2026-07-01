/*
 * Combat / pixels test
 * --------------------
 * Verifies the enemy + attack + pixel-collection loop:
 *   - attacking (F) near an enemy damages it,
 *   - defeating it removes it and bursts pixels,
 *   - the pixels home to the player and increment the pixel count / HUD.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', 'en_blob']);
        // Reset pixels for a deterministic run.
        await h.evaluate(() => { window.app.pixels = 0; window.app.saveEconomy(); });

        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(10);

        // Spawn an enemy right next to the player (1 hp so a single hit kills it).
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            const wo = window.app.findWorldObject('en_blob');
            const e = wo.createInstance();
            e.position = pm.player.position.add(new BABYLON.Vector3(1.6, 0, 0));
            e.hp = 1;
            window.__enemyId = e.worldId;
        });
        await h.waitFrames(4);
        const before = await h.evaluate(() => ({ pixels: window.app.pixels, enemies: window.app.findWorldObject('en_blob').instances.filter(Boolean).length }));
        console.log('\n[1] before attack', before);
        check('an enemy exists to fight', before.enemies >= 1, before);
        check('pixels start at 0', before.pixels === 0, before);

        // Attack.
        await h.tapKey('F');
        await h.waitFrames(3);
        await h.screenshot('pixel-burst');   // capture the burst mid-flight

        // Enemy should be gone, and pixels should climb as cubes are collected.
        await h.waitFor(() => window.app.pixels >= 10, null, 15000).catch(() => {});
        await h.waitFrames(20);
        const after = await h.evaluate(() => ({ pixels: window.app.pixels, enemies: window.app.findWorldObject('en_blob').instances.filter(Boolean).length, hudText: window.app.hud.pixelText.text }));
        console.log('[2] after attack', after);
        check('the enemy was defeated (removed)', after.enemies === before.enemies - 1, after);
        check('defeating it awarded pixels', after.pixels >= 10, after);
        check('the HUD counter reflects the pixel count', after.hudText === String(after.pixels), after);
        await h.screenshot('pixels-collected');

        console.log('\n========================================');
        console.log(failures === 0
            ? `RESULT: PASS — enemy defeated, ${after.pixels} pixels collected and counted.`
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
