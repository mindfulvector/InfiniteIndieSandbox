/*
 * Hex disc (world theme) test
 * ---------------------------
 * Verifies the hex world-theme discs:
 *   - a fresh economy owns only 'classic' (free) and it is active,
 *   - buying broke is refused,
 *   - buying Midnight Vale deducts, owns, selects, and APPLIES the theme:
 *     scene.clearColor becomes the disc's sky and the terrain atlas material
 *     takes the tint,
 *   - selecting classic restores the captured default sky exactly and a
 *     white tint,
 *   - ownership and the active choice survive a loadEconomy round-trip
 *     (which also re-applies the theme, as boot does),
 *   - the Discs screen's hex rows buy/select by digit (row 6 = classic+1),
 *   - a screenshot of a themed world for the eyeball check,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

const near = (a, b) => Math.abs(a - b) < 0.001;

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7044 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.evaluate(() => {
            const app = window.app;
            app.pixels = 0;
            app.ownedHex = new Set(['classic']);
            app.activeHexDisc = 'classic';
            app.applyHexTheme();
            app.saveEconomy();
        });

        // --- 1. Fresh state + broke refusal ---
        const fresh = await h.evaluate(() => {
            const app = window.app;
            const ok = app.buyHexDisc('midnight');
            return {
                ok,
                active: app.activeHexDisc,
                owned: [...app.ownedHex],
                defaultSky: {
                    r: app.scene.clearColor.r, g: app.scene.clearColor.g, b: app.scene.clearColor.b },
            };
        });
        console.log('\n[1] fresh', fresh);
        check('a fresh economy owns only classic, active, and broke buys are refused',
            !fresh.ok && fresh.active === 'classic' &&
            JSON.stringify(fresh.owned) === JSON.stringify(['classic']), fresh);

        // --- 2. Buying Midnight applies sky + tint ---
        const midnight = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 200;
            const ok = app.buyHexDisc('midnight');
            const mat = app.terrainAtlasMaterial();
            return {
                ok, pixels: app.pixels, active: app.activeHexDisc,
                sky: { r: app.scene.clearColor.r, g: app.scene.clearColor.g, b: app.scene.clearColor.b },
                tint: { r: mat.diffuseColor.r, g: mat.diffuseColor.g, b: mat.diffuseColor.b },
            };
        });
        console.log('[2] midnight', midnight);
        check('buying Midnight deducts 80 and makes it active',
            midnight.ok && midnight.pixels === 120 && midnight.active === 'midnight', midnight);
        check('the sky takes the disc colour',
            near(midnight.sky.r, 0.05) && near(midnight.sky.g, 0.06) && near(midnight.sky.b, 0.16), midnight);
        check('the terrain atlas takes the tint',
            near(midnight.tint.r, 0.55) && near(midnight.tint.g, 0.62) && near(midnight.tint.b, 0.95), midnight);

        // --- 3. Themed world screenshot ---
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(15);
        await h.screenshot('midnight-theme');

        // --- 4. Classic restores the captured default exactly ---
        const classic = await h.evaluate(() => {
            const app = window.app;
            app.selectHexDisc('classic');
            const mat = app.terrainAtlasMaterial();
            return {
                sky: { r: app.scene.clearColor.r, g: app.scene.clearColor.g, b: app.scene.clearColor.b },
                tint: { r: mat.diffuseColor.r, g: mat.diffuseColor.g, b: mat.diffuseColor.b },
            };
        });
        console.log('[4] classic restore', { classic, defaultSky: fresh.defaultSky });
        check('classic restores the default sky exactly',
            near(classic.sky.r, fresh.defaultSky.r) && near(classic.sky.g, fresh.defaultSky.g) &&
            near(classic.sky.b, fresh.defaultSky.b), { classic, fresh });
        check('classic restores a white terrain tint',
            near(classic.tint.r, 1) && near(classic.tint.g, 1) && near(classic.tint.b, 1), classic);

        // --- 5. Persistence round-trip re-applies the active theme ---
        const persist = await h.evaluate(() => {
            const app = window.app;
            app.selectHexDisc('midnight');
            app.loadEconomy();   // reload from storage; also re-applies (as boot does)
            return {
                active: app.activeHexDisc,
                owned: [...app.ownedHex].sort(),
                sky: { r: app.scene.clearColor.r, g: app.scene.clearColor.g, b: app.scene.clearColor.b },
            };
        });
        console.log('[5] persistence', persist);
        check('ownership + active theme survive reload and re-apply',
            persist.active === 'midnight' &&
            JSON.stringify(persist.owned) === JSON.stringify(['classic', 'midnight']) &&
            near(persist.sky.r, 0.05), persist);

        // --- 6. The Discs screen hex rows work by digit ---
        const menuHex = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 200;
            // Row layout: 1-5 round discs, 6 = classic, 7 = midnight, 8 = emberfall.
            app.triggerMenuItem(14, 8);   // buy + select Emberfall
            return { active: app.activeHexDisc, owns: app.ownsHexDisc('emberfall'), pixels: app.pixels };
        });
        console.log('[6] menu hex row', menuHex);
        check('the hex row digit buys and selects Emberfall',
            menuHex.active === 'emberfall' && menuHex.owns && menuHex.pixels === 120, menuHex);

        // --- 7. No unexpected page errors ---
        await h.evaluate(() => window.app.selectHexDisc('classic'));
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during hex discs', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — hex discs buy, select, theme the world, and persist.'
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
