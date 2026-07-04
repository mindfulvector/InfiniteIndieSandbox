/*
 * Campaign figures test
 * ---------------------
 * Verifies characters locked to campaigns, usable in the Sandbox:
 *   - campaign figures exist and are NOT pixel-buyable,
 *   - buying the Play Set grants its hero into the (shared) collection,
 *   - inside the campaign world, switching to an outside figure is refused
 *     while the campaign hero is selectable,
 *   - back in a sandbox world, the campaign hero remains fully usable and
 *     outside figures select freely again,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7095 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_quest']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.enemyManager.autoSpawn = false;
            app.ownedFigures.delete('wick');
            app.purchasedSet.delete('playset_glowlands.json');
            app.pixels = 500;
            app.saveEconomy();
        });

        // --- 1. Not pixel-buyable; granted by the Play Set ---
        const grant = await h.evaluate(() => {
            const app = window.app;
            const buy = app.buyFigure('wick');
            const notSold = !buy && !app.ownsFigure('wick') && app.pixels === 500;
            app.gallery = app.gallery || [];
            const entry = { file: 'glowlands.json', name: 'The Glowlands', price: 150 };
            app.buyPlayset(entry);
            return { notSold, owned: app.ownsFigure('wick'), pixels: app.pixels };
        });
        console.log('\n[1] grant', grant);
        check('the campaign hero is not pixel-buyable', grant.notSold, grant);
        check('buying the Play Set grants its hero (shared collection)',
            grant.owned && grant.pixels === 350, grant);

        // --- 2. Inside the campaign: outsiders refused, the hero selects ---
        await h.evaluate(() => window.app.importWorldFromUrl('./assets/worlds/glowlands.json'));
        await h.waitFor(() => window.app.currentWorldFile === 'glowlands.json', null, 20000);
        const locked = await h.evaluate(() => {
            const app = window.app;
            const before = app.activeFigure;
            const scoutRefused = app.selectFigure('scout') === false || app.activeFigure === before
                ? !(app.activeFigure === 'scout' && before !== 'scout') : false;
            const scoutBlocked = !app.figureAllowed('scout');
            const heroOk = app.selectFigure('wick');
            return { scoutBlocked, scoutRefused, heroOk, active: app.activeFigure };
        });
        console.log('[2] in-campaign', locked);
        check('inside the campaign, outside figures cannot be switched to',
            locked.scoutBlocked, locked);
        check('the campaign\'s own hero selects fine', locked.heroOk && locked.active === 'wick', locked);

        // --- 3. Back in the Sandbox: everyone plays ---
        await h.evaluate(() => {
            const app = window.app;
            app.world.buildTemplate('flat');
            return true;
        });
        await h.waitFor(() => window.app.currentWorldFile === null, null, 20000);
        const sandbox = await h.evaluate(() => {
            const app = window.app;
            const heroAllowed = app.figureAllowed('wick');
            const scoutOk = app.selectFigure('scout');
            const heroOk = app.selectFigure('wick');
            return { heroAllowed, scoutOk, heroOk, active: app.activeFigure };
        });
        console.log('[3] sandbox', sandbox);
        check('in the Sandbox the campaign hero and everyone else select freely',
            sandbox.heroAllowed && sandbox.scoutOk && sandbox.heroOk && sandbox.active === 'wick', sandbox);

        // --- 4. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during campaign figures', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — Play Set heroes guard their homelands and roam the Sandbox.'
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
