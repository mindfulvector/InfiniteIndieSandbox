/*
 * Play Set purchase gating test
 * -----------------------------
 * Verifies locked gallery worlds:
 *   - The Glowlands carries a price and starts locked; free worlds are
 *     always "owned",
 *   - the Share screen renders the lock + price on its row,
 *   - picking it broke leaves the world unloaded and pixels untouched,
 *   - picking it with funds pays once, unlocks (persisted through the
 *     purchasedSet economy), and imports straight into build mode,
 *   - a later pick needs no re-payment,
 *   - the unlock survives an economy reload,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7063 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_quest']);

        // --- 1. The Glowlands is priced and starts locked ---
        await h.tapUntil('6', () => window.app.menu.state === 15);   // Share (fetches gallery)
        await h.waitFor(() => Array.isArray(window.app.gallery), null, 20000);
        const locked = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 0;
            app.purchasedSet.delete('playset_glowlands.json');
            app.saveEconomy();
            app.menu.renderedState = -1;
            const glow = app.gallery.find((g) => g.file === 'glowlands.json');
            const free = app.gallery.find((g) => g.file === 'tiny-arena.json');
            window.__idx = app.orderedGallery().indexOf(glow);
            return {
                price: glow.price,
                lockedNow: !app.playsetOwned(glow),
                freeOwned: app.playsetOwned(free),
            };
        });
        console.log('\n[1] locked state', locked);
        check('The Glowlands is priced (150) and starts locked',
            locked.price === 150 && locked.lockedNow && locked.freeOwned, locked);

        // --- 2. The lock renders on the Share row ---
        await h.waitFrames(4);
        const row = await h.evaluate(() => {
            const controls = window.app.gui.getDescendants ? window.app.gui.getDescendants() : [];
            const btn = controls.find((c) => c.name === 'btnGallery_' + window.__idx);
            const label = btn && btn.getDescendants
                ? (btn.getDescendants().find((d) => d.text !== undefined) || {}).text
                : null;
            return { label };
        });
        console.log('[2] row', row);
        check('the Share row shows the lock and price',
            typeof row.label === 'string' && row.label.indexOf('🔒') >= 0 &&
            row.label.indexOf('150 px') >= 0, row);
        await h.screenshot('locked-playset');

        // --- 3. Broke: the pick refuses, nothing imports ---
        const broke = await h.evaluate(() => {
            const app = window.app;
            app.triggerMenuItem(15, 3 + window.__idx);
            return {
                pixels: app.pixels,
                stillShare: app.menu.state === 15,
                quests: app.findWorldObject('l_quest').instances.filter(Boolean).length,
            };
        });
        await h.waitFrames(6);
        const brokeAfter = await h.evaluate(() => ({
            mode: window.app.activeMode ? window.app.activeMode.constructor.name : null,
            quests: window.app.findWorldObject('l_quest').instances.filter(Boolean).length,
        }));
        console.log('[3] broke pick', { broke, brokeAfter });
        check('a broke pick refuses: no import, no charge',
            broke.pixels === 0 && broke.stillShare && brokeAfter.quests === 0, { broke, brokeAfter });

        // --- 4. Funded: pays once, unlocks, imports ---
        await h.evaluate(() => {
            window.app.pixels = 200;
            window.app.triggerMenuItem(15, 3 + window.__idx);
        });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        const bought = await h.evaluate(() => ({
            pixels: window.app.pixels,
            owned: window.app.purchasedSet.has('playset_glowlands.json'),
            quests: window.app.findWorldObject('l_quest').instances.filter(Boolean).length,
        }));
        console.log('[4] bought', bought);
        check('a funded pick pays 150, unlocks, and imports the campaign',
            bought.pixels === 50 && bought.owned && bought.quests === 3, bought);

        // --- 5. No re-payment; unlock survives an economy reload ---
        const again = await h.evaluate(() => {
            const app = window.app;
            app.loadEconomy();   // reload from storage
            const glow = app.gallery.find((g) => g.file === 'glowlands.json');
            const ownedAfterReload = app.playsetOwned(glow);
            app.pixels = 10;
            const rebuy = app.buyPlayset(glow);   // should be a free no-op
            return { ownedAfterReload, rebuy, pixels: app.pixels };
        });
        console.log('[5] re-pick', again);
        check('the unlock persists and later picks are free',
            again.ownedAfterReload && again.rebuy && again.pixels === 10, again);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during gating', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — Play Sets lock, charge exactly once, and stay unlocked.'
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
