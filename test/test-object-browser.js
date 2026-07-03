/*
 * Object-browser test
 * -------------------
 * Verifies the build-mode object browser: it appears in build mode, shows one
 * tile per buildable object, bakes a runtime thumbnail for each, and clicking a
 * tile selects that object for placement (spawning a preview of the correct
 * model). Captures screenshots along the way.
 *
 * Exit code 0 = all assertions passed.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) {
        console.log(`  PASS  ${label}`);
    } else {
        failures += 1;
        console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`);
    }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0' });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', 'pr_door', 'd_christmas_tree']);

        // Get into build mode the way a player does.
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFrames(5);

        // --- browser is present and shows the current category ---
        const info = await h.evaluate(() => {
            const app = window.app;
            const cat = app._objBrowserCat;
            const inCat = app.BuildableObjectList.filter((w) => app.objectCategory(w.name) === cat).length;
            return {
                visible: app.hud.objBar.isVisible,
                tiles: app._objTiles ? app._objTiles.length : 0,
                cat, inCat,
                objects: app.BuildableObjectList.length,
            };
        });
        console.log('\n[1] Object browser', info);
        check('object browser is visible in build mode', info.visible === true, info);
        check('the bar shows exactly the current category\'s objects',
            info.tiles === info.inCat && info.tiles > 0 && info.tiles < info.objects, info);

        // --- every displayed object gets a runtime thumbnail ---
        await h.waitFor(() => window.app._baking === false &&
            window.app._objTiles.every((t) => typeof t.wo.thumbUrl === 'string'),
            null, 30000).catch(() => {});
        const thumbs = await h.evaluate(() => window.app._objTiles.map((t) => ({
            name: t.wo.name,
            ok: typeof t.wo.thumbUrl === 'string' && t.wo.thumbUrl.startsWith('data:image/png'),
        })));
        console.log('\n[2] Thumbnails', thumbs);
        const baked = thumbs.filter((t) => t.ok).length;
        check('a PNG thumbnail was baked for every displayed object', baked === thumbs.length && baked > 0,
            { baked, total: thumbs.length });
        await h.screenshot('object-browser');

        // --- clicking a tile selects that object and spawns its preview ---
        // Use a free object (a premium/locked one couldn't be selected without buying).
        const TARGET = 't_cube_1x1';
        const objIdx = await h.evaluate((n) =>
            window.app.BuildableObjectList.findIndex((w) => w.name === n), TARGET);
        const before = await h.instanceCount(TARGET);
        await h.evaluate((i) => window.app.selectBuildObject(i), objIdx); // same path as a tile click
        await h.waitFor((a) => window.app.activeMode.currentWorldObject &&
            window.app.activeMode.currentWorldObject.name === a.name &&
            window.app.activeMode.selectedObjectIndex === a.i, { i: objIdx, name: TARGET }, 8000);
        await h.waitFrames(6);
        const after = await h.instanceCount(TARGET);
        const caption = await h.evaluate(() => ({
            name: window.app.hud.objName.text,
            cat: window.app.hud.objCat.text,
            sel: window.app._objBrowserSel,
        }));
        console.log('\n[3] Tile selection', { before, after, ...caption });
        check('selecting the tile made it the active build object',
            (await h.evaluate(() => window.app.activeMode.currentWorldObject.name)) === TARGET);
        check('a placement preview of the selected object was spawned', after === before + 1, { before, after });
        check('caption + category updated to the selection',
            caption.name === 'Cube 1x1' && caption.cat.indexOf('TERRAIN') === 0, caption);
        check('the clicked tile is highlighted', caption.sel === objIdx, caption);
        await h.screenshot('object-browser-tile-selected');

        console.log('\n========================================');
        console.log(failures === 0
            ? `RESULT: PASS — browser shows ${baked} thumbnailed objects and click-to-select works.`
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
