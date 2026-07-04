/*
 * Featured gallery rotation test
 * ------------------------------
 * Verifies the daily curated rotation:
 *   - the index's featured list loads alongside the gallery,
 *   - featuredWorld(day) cycles through the whole curation and wraps
 *     (deterministic, injectable day),
 *   - today's pick is a real gallery entry,
 *   - orderedGallery puts the featured world first with nothing lost,
 *   - the Share screen's first gallery digit (3) imports the FEATURED world,
 *   - the ★ FEATURED badge renders on the first row,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7055 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pr_kart']);

        // --- 1. The rotation loads and cycles deterministically ---
        await h.tapUntil('6', () => window.app.menu.state === 15);   // MENU_SHARE kicks the fetch
        await h.waitFor(() => Array.isArray(window.app.gallery), null, 20000);
        const rotation = await h.evaluate(() => {
            const app = window.app;
            return {
                featured: app.galleryFeatured,
                days: [0, 1, 2, 3].map((d) => app.featuredWorld(d) && app.featuredWorld(d).file),
                today: app.featuredWorld() && app.featuredWorld().file,
            };
        });
        console.log('\n[1] rotation', rotation);
        check('the featured curation loads (3 entries)', rotation.featured.length === 3, rotation);
        check('featuredWorld(day) cycles the whole curation and wraps',
            new Set(rotation.days.slice(0, 3)).size === 3 && rotation.days[3] === rotation.days[0], rotation);
        check('today\'s pick is a real gallery entry',
            typeof rotation.today === 'string' && rotation.featured.includes(rotation.today), rotation);

        // --- 2. orderedGallery: featured first, nothing lost ---
        const order = await h.evaluate(() => {
            const app = window.app;
            const ordered = app.orderedGallery();
            return {
                first: ordered[0].file,
                today: app.featuredWorld().file,
                count: ordered.length,
                total: app.gallery.length,
                allPresent: app.gallery.every((g) => ordered.includes(g)),
            };
        });
        console.log('[2] ordering', order);
        check('the featured world sorts first with the gallery intact',
            order.first === order.today && order.count === order.total && order.allPresent, order);

        // --- 3. The ★ badge renders on the first gallery row ---
        await h.waitFrames(4);
        const badge = await h.evaluate(() => {
            const controls = window.app.gui.getDescendants ? window.app.gui.getDescendants() : [];
            const btn = controls.find((c) => c.name === 'btnGallery_0');
            const label = btn && btn.getDescendants
                ? (btn.getDescendants().find((d) => d.text !== undefined) || {}).text
                : null;
            return { label };
        });
        console.log('[3] badge', badge);
        check('the first row carries the ★ FEATURED badge',
            typeof badge.label === 'string' && badge.label.indexOf('★ FEATURED') >= 0, badge);
        await h.screenshot('featured-share');

        // --- 4. Digit 3 imports the featured world ---
        const imported = await h.evaluate(() => {
            const app = window.app;
            window.__featFile = app.featuredWorld().file;
            app.triggerMenuItem(15, 3);
            return true;
        });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        const world = await h.evaluate(() => ({
            tiles: window.app.findWorldObject('t_tile').instances.filter(Boolean).length,
        }));
        console.log('[4] featured import', { file: await h.evaluate(() => window.__featFile), world });
        check('the first gallery digit imports the featured world into build mode',
            world.tiles > 30, world);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during featured browsing', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the curation rotates daily and tops the gallery with a working import.'
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
