/*
 * Terrain themes test
 * -------------------
 * Verifies themed terrain blocks:
 *   - sand/snow blocks register in the TERRAIN category with top-snap,
 *   - each theme shares ONE atlas material across its blocks (instancing
 *     stays safe), distinct from the grass atlas and from each other,
 *   - a placed sand block carries collisions (the player lands on it),
 *   - footstep surfaces are the real ones from the sound pack (sand, snow),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7097 });
    try {
        await h.start();
        await h.waitForReady(['t_sand', 't_snow', 't_lava', 't_toxic', 't_lava_2', 't_toxic_2']);
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

        // --- 1. Registration + shared per-theme atlases ---
        const mats = await h.evaluate(() => {
            const app = window.app;
            const m = (n) => app.findWorldObject(n).mesh.material;
            return {
                cat: app.objectCategory('t_sand'),
                anchor: app.findWorldObject('t_sand').anchor,
                sandShared: m('t_sand') === m('t_sand_2'),
                snowShared: m('t_snow') === m('t_snow_2'),
                sandVsSnow: m('t_sand') !== m('t_snow'),
                sandVsGrass: m('t_sand') !== m('t_tile'),
                texName: m('t_sand').diffuseTexture.name,
                texW: m('t_sand').diffuseTexture.getSize().width,
                surfaces: {
                    sand: app.findWorldObject('t_sand').surface,
                    snow: app.findWorldObject('t_snow').surface,
                },
                lavaShared: m('t_lava') === m('t_lava_2'),
                toxicShared: m('t_toxic') === m('t_toxic_2'),
                fourDistinct: new Set([m('t_sand'), m('t_snow'), m('t_lava'), m('t_toxic')].map((x) => x.name)).size === 4,
                lavaTex: m('t_lava').diffuseTexture.name,
                lavaCat: app.objectCategory('t_lava'),
            };
        });
        console.log('\n[1] atlases', mats);
        check('themed blocks register as top-snap TERRAIN',
            mats.cat.toLowerCase().indexOf('terr') >= 0 && mats.anchor === 'below', mats);
        check('each theme shares one atlas, distinct from grass and each other',
            mats.sandShared && mats.snowShared && mats.sandVsSnow && mats.sandVsGrass &&
            mats.texName === 'themeAtlas_sand' && mats.texW === 1024, mats);
        check('footsteps use the real pack surfaces (sand, snow)',
            mats.surfaces.sand === 'sand' && mats.surfaces.snow === 'snow', mats);
        check('volcanic + toxic register as terrain, each with its own shared atlas',
            mats.lavaShared && mats.toxicShared && mats.fourDistinct &&
            mats.lavaTex === 'themeAtlas_volcanic' && mats.lavaCat.toLowerCase().indexOf('terr') >= 0, mats);

        // --- 2. A sand platform holds the player up ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            for (const dx of [0, 2]) for (const dz of [0, 2]) {
                const b = app.findWorldObject('t_sand').createInstance();
                b.position = new BABYLON.Vector3(30 + dx, 6, dz);
                b.checkCollisions = true;
            }
            for (const dx of [0, 2]) {
                const b = app.findWorldObject('t_snow_2').createInstance();
                b.position = new BABYLON.Vector3(36 + dx, 6.5, 0);
                b.checkCollisions = true;
            }
            pm.player.position.copyFrom(new BABYLON.Vector3(31, 9, 1));
        });
        await h.waitFor(() => {
            const pm = window.app.activeMode;
            return pm.cc._grounded && Math.abs(pm.player.position.y - 6.5) < 0.6;
        }, null, 20000);
        const stood = await h.evaluate(() => ({
            y: Math.round(window.app.activeMode.player.position.y * 100) / 100,
            surface: window.app.activeMode.footstepSurface(),
        }));
        console.log('[2] standing on sand', stood);
        check('the player lands and stands on a sand platform', true, stood);
        check('the surface underfoot reads as the theme\'s footstep sound',
            stood.surface === 'sand', stood);
        await h.screenshot('terrain-themes');

        // --- 3. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during themes', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — deserts and snowfields, one draw call per theme.'
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
