/*
 * Shop + purchase-gating test
 * ---------------------------
 * Verifies:
 *   - a premium object is locked (can't be placed, grabbed, or deleted in build
 *     mode) while unowned,
 *   - buying it in the shop deducts pixels and marks it owned,
 *   - once owned it can be edited (grabbed) in build mode.
 * (Unowned objects still exist/render — they're only blocked from *editing*.)
 */

const { GameHarness } = require('./harness');

const PREMIUM = 'cp_platform_2x2';
const MENU_SHOP = 8;
let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', PREMIUM, 'd_christmas_tree']);
        await h.evaluate(() => { window.app.pixels = 0; window.app.purchasedSet = new Set(); window.app.saveEconomy(); });

        // Into build mode.
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app._objTiles && window.app._objTiles.length > 0 &&
            window.app.BuildableObjectList.every((w) => w.thumbUrl), null, 30000).catch(() => {});
        await h.waitFrames(4);
        await h.screenshot('build-locked');

        const idx = await h.evaluate((n) => window.app.BuildableObjectList.findIndex((w) => w.name === n), PREMIUM);
        const info = await h.evaluate((n) => ({ purchased: window.app.isPurchased(n), price: window.app.priceOf(n) }), PREMIUM);
        console.log('\n[1] locked state', info);
        check('premium object is locked while unowned', info.purchased === false, info);
        check('premium object has a price', info.price > 0, info);

        // Clicking a locked tile with no pixels must not place it.
        await h.evaluate((i) => window.app.selectBuildObject(i), idx);
        await h.waitFrames(4);
        const s2 = await h.evaluate((n) => ({
            hasPreview: !!window.app.activeMode.currentInstance,
            placed: window.app.findWorldObject(n).instances.filter(Boolean).length,
            pixels: window.app.pixels,
        }), PREMIUM);
        console.log('[2] click locked tile, broke', s2);
        check('locked object cannot be placed without buying', s2.placed === 0 && s2.pixels === 0, s2);

        // Simulate a world that already contains the (unowned) premium object.
        await h.evaluate((n) => {
            const wo = window.app.findWorldObject(n);
            const inst = wo.createInstance();
            inst.position = new BABYLON.Vector3(3, 0, 0);
            window.__premId = inst.worldId;
        }, PREMIUM);
        // Cursor mode, hover it, try to grab (Enter) -> blocked.
        await h.tapUntil('0', () => !window.app.activeMode.currentInstance);
        await h.waitFrames(3);
        await h.evaluate((n) => {
            const wo = window.app.findWorldObject(n);
            window.app.activeMode.selection = [wo.instances.filter(Boolean).slice(-1)[0]];
        }, PREMIUM);
        await h.tapKey('Enter');
        await h.waitFrames(4);
        const s3 = await h.evaluate((n) => ({
            grabbed: window.app.activeMode.grabbed,
            placed: window.app.findWorldObject(n).instances.filter(Boolean).length,
        }), PREMIUM);
        console.log('[3] try to grab locked placed object', s3);
        check('locked placed object cannot be grabbed/edited', s3.grabbed === false && s3.placed === 1, s3);

        // Buy it in the shop.
        await h.evaluate(() => { window.app.pixels = 100; });
        const shopIdx = await h.evaluate((n) => window.app.premiumObjects().findIndex((it) => it.name === n), PREMIUM);
        await h.evaluate((args) => window.app.triggerMenuItem(args.m, args.i), { m: MENU_SHOP, i: shopIdx + 1 });
        await h.waitFrames(3);
        const s4 = await h.evaluate((n) => ({ purchased: window.app.isPurchased(n), pixels: window.app.pixels }), PREMIUM);
        console.log('[4] after buying in shop', s4);
        check('buying in the shop marks it owned', s4.purchased === true, s4);
        check('buying deducted the price in pixels', s4.pixels === 100 - info.price, s4);

        // Now it can be grabbed/edited.
        await h.evaluate((n) => {
            const wo = window.app.findWorldObject(n);
            window.app.activeMode.selection = [wo.instances.filter(Boolean).slice(-1)[0]];
        }, PREMIUM);
        await h.tapUntil('Enter', () => window.app.activeMode.grabbed);
        const s5 = await h.evaluate(() => ({ grabbed: window.app.activeMode.grabbed }));
        console.log('[5] grab after purchase', s5);
        check('owned object can now be edited (grabbed)', s5.grabbed === true, s5);
        await h.evaluate(() => window.app.activeMode.placeCurrent());

        // Capture the shop menu.
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('6', () => window.app.menu.state === MENU_SHOP);
        await h.waitFrames(4);
        await h.screenshot('shop-menu');

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — premium objects are gated in build mode and unlock via the shop.'
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
