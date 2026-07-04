/*
 * Textures + category-filter test
 * -------------------------------
 * Action-driven checks with screenshots:
 *   - the terrain tile (and every other non-logic prim object) has a real
 *     texture on its material; logic toys stay flat-coloured,
 *   - the default sandbox terrain renders with the grass texture,
 *   - the bottom object bar shows only the current category; pressing Down
 *     switches category and re-filters the bar,
 *   - Left/Right cycles stay within the current category.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pr_door', 'en_blob', 'pk_health', 'pk_pixels', 'pk_star', 'l_counter']);

        // --- 1. Non-logic prim objects are textured; logic toys are not ---
        const texInfo = await h.evaluate(() => {
            const out = {};
            const texOf = (node) => {
                const meshes = [node].concat(node.getChildMeshes ? node.getChildMeshes() : []);
                for (const m of meshes) {
                    if (m.material && m.material.diffuseTexture) return true;
                    if (m.material && m.material.subMaterials &&
                        m.material.subMaterials.some((s) => s && s.diffuseTexture)) return true;
                }
                return false;
            };
            window.app.BuildableObjectList.forEach((wo) => { out[wo.name] = texOf(wo.mesh); });
            return out;
        });
        console.log('\n[1] textured templates', texInfo);
        ['t_tile', 't_block_4', 't_block_2', 't_block_1', 'pr_door', 'en_blob',
         'pk_health', 'pk_pixels', 'pk_star'].forEach((n) => {
            check(`${n} has a textured surface`, texInfo[n] === true, { [n]: texInfo[n] });
        });
        ['l_trigger', 'l_spawner', 'l_counter', 'l_timer', 'l_scoreboard'].forEach((n) => {
            check(`${n} (logic) stays flat-coloured`, texInfo[n] === false, { [n]: texInfo[n] });
        });

        // --- 2. Grass terrain renders in a new sandbox ---
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(12);
        const grass = await h.evaluate(() => {
            const wo = window.app.findWorldObject('t_tile');
            const mat = wo.mesh.material;
            return {
                tiles: wo.instances.filter(Boolean).length,
                texName: mat && mat.diffuseTexture ? mat.diffuseTexture.name : null,
            };
        });
        console.log('\n[2] grass terrain', grass);
        check('the default terrain uses the real grass/dirt atlas texture',
            grass.tiles === 100 && grass.texName === 'grassDirtAtlas', grass);
        await h.screenshot('grass-terrain');

        // --- 3. The bar shows one category; Down switches and re-filters ---
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFrames(8);
        const barState = () => h.evaluate(() => {
            const app = window.app;
            return {
                cat: app._objBrowserCat,
                tiles: app._objTiles.map((t) => t.wo.name),
                allSameCat: app._objTiles.every((t) => app.objectCategory(t.wo.name) === app._objBrowserCat),
                sel: app.activeMode.selectedObjectIndex,
                selName: app.BuildableObjectList[app.activeMode.selectedObjectIndex] &&
                         app.BuildableObjectList[app.activeMode.selectedObjectIndex].name,
            };
        });
        const bar0 = await barState();
        console.log('\n[3] initial bar', bar0);
        check('the bar shows a single category', bar0.allSameCat && bar0.tiles.length > 0, bar0);
        await h.screenshot('bar-category-初' .replace('初', 'initial'));

        // Press Down: category jumps, bar re-filters to the new category.
        const prevCat = bar0.cat;
        await h.tapUntil('ArrowDown', (prev) => window.app._objBrowserCat !== prev, prevCat);
        await h.waitFrames(6);
        const bar1 = await barState();
        console.log('[3] after Down', bar1);
        check('Down switches to another category', bar1.cat !== prevCat, { prevCat, now: bar1.cat });
        check('the bar re-filtered to the new category only', bar1.allSameCat && bar1.tiles.length > 0, bar1);
        check('the selection moved into the new category',
            bar1.selName && bar1.tiles.indexOf(bar1.selName) >= 0, bar1);
        await h.screenshot('bar-category-switched');

        // --- 4. Left/Right cycles stay within the current category ---
        const cycle = await h.evaluate(async () => {
            const app = window.app, bm = app.activeMode;
            const cats = new Set();
            for (let i = 0; i < 6; i++) {
                bm.selectedObjectIndex = bm.nextBuildableIndex(1);
                cats.add(app.objectCategory(app.BuildableObjectList[bm.selectedObjectIndex].name));
            }
            return { cats: Array.from(cats), cat: app._objBrowserCat };
        });
        console.log('\n[4] cycle', cycle);
        check('Left/Right cycling never leaves the current category',
            cycle.cats.length === 1 && cycle.cats[0] === cycle.cat, cycle);

        // --- 5. Locked-only categories are still browsable (discover + buy) ---
        // Fresh economy: nothing premium owned, so CYBERPUNK/DECOR are all-locked.
        await h.evaluate(() => {
            window.app.pixels = 0;
            window.app.purchasedSet = new Set();
            window.app.saveEconomy();
        });
        const seen = new Set();
        let lockedBrowse = null;
        for (let i = 0; i < 10 && !lockedBrowse; i++) {
            await h.tapUntil('ArrowDown', (prev) => window.app._objBrowserCat !== prev,
                await h.evaluate(() => window.app._objBrowserCat));
            await h.waitFrames(4);
            const s = await h.evaluate(() => ({
                cat: window.app._objBrowserCat,
                tiles: window.app._objTiles.map((t) => ({ name: t.wo.name, locked: t.locked })),
                sel: window.app.activeMode.selectedObjectIndex,
            }));
            seen.add(s.cat);
            if (s.tiles.length > 0 && s.tiles.every((t) => t.locked)) lockedBrowse = s;
        }
        console.log('\n[5] categories seen:', Array.from(seen), 'locked-only:', lockedBrowse && lockedBrowse.cat);
        check('Up/Down reaches categories whose objects are all locked (discover + buy path)',
            !!lockedBrowse, { seen: Array.from(seen) });
        check('browsing a locked-only category shows priced tiles with no selection',
            lockedBrowse && lockedBrowse.sel === -1 && lockedBrowse.tiles.every((t) => t.locked), lockedBrowse);
        await h.screenshot('locked-category-browse');

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — non-logic objects are textured, grass terrain renders, and the bar filters by category.'
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
