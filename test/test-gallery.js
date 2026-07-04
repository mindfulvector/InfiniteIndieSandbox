/*
 * World gallery test
 * ------------------
 * Verifies gallery browsing (bundled worlds, fetched over HTTP like any
 * future remote gallery would be):
 *   - fetchGallery loads the index (2+ entries) and the Share screen lists
 *     them once loaded,
 *   - importWorldFromUrl pulls Starter Parkour in: tiles, stars wired to the
 *     counter, and the counter wired to the scoreboard all arrive,
 *   - a bad URL resolves false with the world untouched,
 *   - the Share screen digit path imports Tiny Arena and lands in build mode
 *     (trigger wired to its spawner),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7050 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pk_star', 'l_spawner']);

        // --- 1. The Share screen fetches and lists the gallery ---
        await h.tapUntil('6', () => window.app.menu.state === 15);   // MENU_SHARE (kicks fetch)
        await h.waitFor(() => Array.isArray(window.app.gallery), null, 20000);
        const idx = await h.evaluate(() => window.app.gallery.map((g) => g.file));
        await h.waitFrames(4);
        await h.screenshot('share-gallery');
        console.log('\n[1] gallery index', idx);
        check('the gallery index loads with both bundled worlds',
            idx.length >= 2 && idx.includes('starter-parkour.json') && idx.includes('tiny-arena.json'), idx);

        // --- 2. importWorldFromUrl pulls Starter Parkour in ---
        const parkour = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/starter-parkour.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const star = live('pk_star')[0];
                const counter = live('l_counter')[0];
                return {
                    ok,
                    tiles: live('t_tile').length,
                    stars: live('pk_star').length,
                    starWire: star && star.wires.length === 1 && star.wires[0].toWo === 'l_counter',
                    counterWire: counter && counter.wires.length === 1 && counter.wires[0].toWo === 'l_scoreboard',
                    threshold: counter ? counter.params.threshold : null,
                };
            }));
        console.log('[2] parkour import', parkour);
        check('Starter Parkour imports over HTTP', parkour.ok && parkour.tiles === 68 && parkour.stars === 4, parkour);
        check('its wires arrive intact (stars→counter→scoreboard, threshold 4)',
            parkour.starWire && parkour.counterWire && parkour.threshold === 4, parkour);

        // --- 3. A bad URL fails gracefully, world untouched ---
        const bad = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/does-not-exist.json').then((ok) => ({
                ok,
                tiles: window.app.findWorldObject('t_tile').instances.filter(Boolean).length,
            })));
        console.log('[3] bad url', bad);
        check('a bad URL resolves false and leaves the world untouched',
            bad.ok === false && bad.tiles === 68, bad);

        // --- 4. The Share digit path imports Tiny Arena into build mode ---
        const arena = await h.evaluate(() => {
            // Row 3 is the first gallery entry; Tiny Arena is second -> row 4.
            window.app.triggerMenuItem(15, 4);
            return true;
        });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        const arenaWorld = await h.evaluate(() => {
            const app = window.app;
            const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
            const trig = live('l_trigger')[0];
            return {
                spawners: live('l_spawner').length,
                trigWire: trig && trig.wires.length === 1 && trig.wires[0].action === 'spawn',
            };
        });
        console.log('[4] arena via menu', arenaWorld);
        check('the gallery digit imports Tiny Arena and lands in build mode',
            arenaWorld.spawners === 1 && arenaWorld.trigWire === true, arenaWorld);
        await h.waitFrames(10);
        await h.screenshot('tiny-arena-imported');

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during gallery browsing', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the gallery lists, fetches, and imports shared worlds over HTTP.'
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
