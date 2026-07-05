/*
 * Gallery favorites test
 * ----------------------
 * Verifies local favourites for gallery worlds:
 *   - toggleFavorite(file) stars/unstars a world, isFavorite reflects it,
 *     and it persists to localStorage (survives loadEconomy),
 *   - orderedGallery floats favourites to the top (after the featured pick),
 *   - favourite mode makes a gallery pick STAR the world instead of loading
 *     it; with the mode off, the pick imports as usual,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7130 });
    try {
        await h.start();
        await h.waitForReady(['t_tile']);
        // Enter play so the world+economy are live, then open the gallery.
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.evaluate(() => window.app.fetchGallery());
        await h.waitFor(() => window.app.gallery && window.app.gallery.length >= 3, null, 20000);

        // --- 1. toggleFavorite + persistence ---
        const fav = await h.evaluate(() => {
            const app = window.app;
            app.favoriteWorlds = new Set();
            const file = app.gallery[app.gallery.length - 1].file;   // a non-featured world
            const on = app.toggleFavorite(file);
            const persisted = JSON.parse(window.localStorage.getItem('iis_fav_worlds') || '[]');
            app.loadEconomy();   // reload from storage
            const stillFav = app.isFavorite(file);
            const off = app.toggleFavorite(file);
            return { file, on, persisted: persisted.includes(file), stillFav, off };
        });
        console.log('\n[1] toggle', fav);
        check('toggleFavorite stars a world, persists it, and reloads as a favourite',
            fav.on === true && fav.persisted && fav.stillFav && fav.off === false, fav);

        // --- 2. orderedGallery floats favourites up ---
        const order = await h.evaluate(() => {
            const app = window.app;
            app.favoriteWorlds = new Set();
            // Star the LAST gallery world; it should jump near the top.
            const target = app.gallery[app.gallery.length - 1].file;
            const posBefore = app.orderedGallery().findIndex((g) => g.file === target);
            app.favoriteWorlds = new Set([target]);
            const posAfter = app.orderedGallery().findIndex((g) => g.file === target);
            const feat = app.featuredWorld();
            // With a featured pick, a favourite sits at index 1; else index 0.
            const expected = feat ? 1 : 0;
            return { posBefore, posAfter, expected, jumped: posAfter < posBefore };
        });
        console.log('[2] order', order);
        check('a favourited world floats to the top of the gallery order',
            order.jumped && order.posAfter === order.expected, order);

        // --- 3. Favourite mode: a gallery pick stars instead of loading ---
        const mode = await h.evaluate(() => {
            const app = window.app;
            app.favoriteWorlds = new Set();
            app._galleryFavMode = false;
            app.menu.prevState = 1; app.menu.state = 15 /* MENU_SHARE */;
            // Turn favourite mode ON (item 80).
            app.triggerMenuItem(15, 80);
            const modeOn = app._galleryFavMode === true;
            // Picking a gallery world now STARS it (does not switch to build mode).
            const beforeMode = app.activeMode && app.activeMode.constructor.name;
            const target = app.orderedGallery()[app.orderedGallery().length - 1];
            const idx = 3 + (app.orderedGallery().length - 1);
            app.triggerMenuItem(15, idx);
            return { modeOn, starred: app.isFavorite(target.file),
                stillOnMenu: app.menu.state === 15, beforeMode };
        });
        console.log('[3] fav mode', mode);
        check('favourite mode turns on, and a pick stars the world instead of loading it',
            mode.modeOn && mode.starred && mode.stillOnMenu, mode);

        // --- 4. Mode off: a pick imports as usual ---
        const load = await h.evaluate(() => {
            const app = window.app;
            app._galleryFavMode = false;
            app.menu.state = 15;
            // The first UNLOCKED, free (unpriced) gallery world imports.
            const g = app.orderedGallery().find((w) => !w.price);
            const idx = 3 + app.orderedGallery().indexOf(g);
            app.triggerMenuItem(15, idx);
            return { requested: !!g };
        });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        console.log('[4] load', load);
        check('with favourite mode off, a gallery pick imports and enters build mode', load.requested);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during favourites', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — star the worlds you love and they rise to the top.'
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
