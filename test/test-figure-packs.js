/*
 * Figure packs / Play Set bundles test
 * ------------------------------------
 * Verifies pack bundles in the shop:
 *   - packs are defined with contents that all exist (figures + objects),
 *   - every pack is cheaper than its à-la-carte value (it IS a bundle),
 *   - buying with insufficient pixels is refused (nothing granted/charged),
 *   - buying the Hero Pack grants all three figures and deducts the price,
 *   - a pack counts as owned once all its contents are owned (however they
 *     were acquired), and re-buying an owned pack is refused,
 *   - a Play Set pack grants BOTH its figure and its premium object (the
 *     object then shows owned in premiumObjects),
 *   - grants persist through a loadEconomy round-trip,
 *   - the shop menu digit path buys a pack (packs number AFTER the premium
 *     objects so existing object indices never shift),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7034 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'cp_platform_2x2']);
        // Fresh economy: no pixels, only the free figure, nothing purchased.
        await h.evaluate(() => {
            const app = window.app;
            app.pixels = 0;
            app.purchasedSet = new Set();
            app.ownedFigures = new Set(['scout']);
            app.activeFigure = 'scout';
            app.saveEconomy();
        });

        // --- 1. Pack definitions are coherent ---
        const defs = await h.evaluate(() => {
            const app = window.app;
            return app.packs().map((p) => ({
                id: p.id,
                price: p.price,
                value: app.packValue(p.id),
                figuresExist: p.figures.every((f) => !!app.figureById(f)),
                objectsExist: p.objects.every((o) => !!app.findWorldObject(o) && app.priceOf(o) > 0),
                owned: app.packOwned(p.id),
            }));
        });
        console.log('\n[1] pack definitions', defs);
        check('all pack contents exist (figures + priced objects)',
            defs.every((d) => d.figuresExist && d.objectsExist), defs);
        check('every pack is cheaper than its à-la-carte value',
            defs.every((d) => d.price < d.value), defs);
        check('no pack is owned on a fresh economy', defs.every((d) => !d.owned), defs);

        // --- 2. Insufficient pixels: refused, nothing granted or charged ---
        const poor = await h.evaluate(() => {
            const app = window.app;
            const ok = app.buyPack('hero_pack');
            return { ok, pixels: app.pixels, figures: [...app.ownedFigures] };
        });
        console.log('[2] insufficient pixels', poor);
        check('buying without pixels is refused and grants nothing',
            !poor.ok && poor.pixels === 0 && poor.figures.length === 1, poor);

        // --- 3. Hero Pack grants all three figures at the flat price ---
        const hero = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 500;
            const ok = app.buyPack('hero_pack');
            return {
                ok, pixels: app.pixels,
                owned: ['blaze', 'frost', 'volt'].map((f) => app.ownsFigure(f)),
                packOwned: app.packOwned('hero_pack'),
            };
        });
        console.log('[3] hero pack', hero);
        check('the Hero Pack purchase succeeds and deducts 400',
            hero.ok && hero.pixels === 100, hero);
        check('all three premium figures are granted', hero.owned.every(Boolean), hero);
        check('the pack now counts as owned', hero.packOwned, hero);

        // --- 4. Re-buying an owned pack is refused ---
        const rebuy = await h.evaluate(() => {
            const app = window.app;
            const ok = app.buyPack('hero_pack');
            return { ok, pixels: app.pixels };
        });
        console.log('[4] re-buy', rebuy);
        check('re-buying an owned pack is refused (no charge)',
            !rebuy.ok && rebuy.pixels === 100, rebuy);

        // --- 5. A Play Set grants its figure AND its premium object ---
        const playset = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 300;
            const ok = app.buyPack('neon_set');   // volt (already owned) + cp_platform_2x2
            const obj = app.premiumObjects().find((o) => o.name === 'cp_platform_2x2');
            return { ok, pixels: app.pixels, objOwned: obj ? obj.owned : null, packOwned: app.packOwned('neon_set') };
        });
        console.log('[5] play set', playset);
        check('the Play Set purchase succeeds (260 deducted)',
            playset.ok && playset.pixels === 40, playset);
        check('the bundled premium object is now owned', playset.objOwned === true, playset);
        check('the Play Set counts as owned', playset.packOwned, playset);

        // --- 6. Pack ownership is derived: owning contents à la carte = owned ---
        const derived = await h.evaluate(() => {
            const app = window.app;
            // winter_set = frost (owned via hero pack) + d_christmas_tree.
            const before = app.packOwned('winter_set');
            app.pixels += 25;
            app.buy('d_christmas_tree');
            return { before, after: app.packOwned('winter_set') };
        });
        console.log('[6] derived ownership', derived);
        check('a pack becomes owned when its contents are owned à la carte',
            !derived.before && derived.after, derived);

        // --- 7. Grants persist through a loadEconomy round-trip ---
        const reload = await h.evaluate(() => {
            const app = window.app;
            app.loadEconomy();
            return {
                figures: ['blaze', 'frost', 'volt'].map((f) => app.ownsFigure(f)),
                obj: app.isPurchased('cp_platform_2x2'),
            };
        });
        console.log('[7] reload', reload);
        check('pack grants survive a localStorage round-trip',
            reload.figures.every(Boolean) && reload.obj, reload);

        // --- 8. The shop menu digit path buys a pack ---
        await h.evaluate(() => {
            const app = window.app;
            // Reset to a fresh economy with funds, then open the shop.
            app.pixels = 500;
            app.purchasedSet = new Set();
            app.ownedFigures = new Set(['scout']);
            app.saveEconomy();
        });
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);   // MENU_PAUSE
        await h.tapUntil('6', () => window.app.menu.state === 8);        // MENU_SHOP
        await h.waitFrames(4);
        await h.screenshot('shop-with-packs');
        const menuBuy = await h.evaluate(() => {
            const app = window.app;
            const heroIndex = app.premiumObjects().length + 1;   // first pack row
            app.triggerMenuItem(8 /* MENU_SHOP */, heroIndex);
            return {
                owned: ['blaze', 'frost', 'volt'].map((f) => app.ownsFigure(f)),
                pixels: app.pixels,
                state: app.menu.state,
            };
        });
        console.log('[8] menu-path buy', menuBuy);
        check('the shop digit path buys the first pack (all figures granted, 400 deducted)',
            menuBuy.owned.every(Boolean) && menuBuy.pixels === 100 && menuBuy.state === 8, menuBuy);
        await h.waitFrames(4);
        await h.screenshot('shop-pack-owned');

        // --- 9. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during pack purchases', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — packs bundle figures + objects at a discount and grant everything on purchase.'
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
