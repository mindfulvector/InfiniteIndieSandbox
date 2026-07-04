/*
 * Crop farming test
 * -----------------
 * Verifies farm plots and sidekick food:
 *   - pr_plot registers with its crop child,
 *   - a plot sows itself on play start and grows dt-based through stages,
 *   - the ripe crop scales up and turns glowberry-gold (per-instance
 *     material — other plots and the template stay untouched),
 *   - walking over a ripe plot harvests: +2 food, `harvested` fires a wired
 *     counter, and autoReplant immediately sows the next crop,
 *   - feeding prefers food (1 → 15 XP, pixels untouched) and falls back to
 *     pixels when the pantry is empty,
 *   - food persists across a loadEconomy round-trip,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7049 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pr_plot', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            window.app.pixels = 0;
            window.app.sidekickFood = 0;
            window.app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. Plant a fast plot + a second control plot + harvest counter ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const mk = (dx) => {
                const p = app.findWorldObject('pr_plot').createInstance();
                p.position = pm.player.position.add(new BABYLON.Vector3(dx, 1, 6));
                p.script._wasPlay = null;
                return p;
            };
            const plot = mk(0);
            plot.params.growTime = 5; plot.params.autoReplant = 'yes';
            const slow = mk(4);
            slow.params.growTime = 40;
            const c = app.findWorldObject('l_counter').createInstance();
            c.position = pm.player.position.add(new BABYLON.Vector3(-4, 1, 6));
            c.params.threshold = 10; c.params.autoReset = 'no';
            plot.wires.push({ event: 'harvested', toWo: 'l_counter', toId: c.worldId, action: 'increment' });
            window.__F = { plot, slow, c };
        });
        await h.waitFrames(5);
        const growing = await h.evaluate(() => ({
            stage: window.__F.plot.script.stage,
            progress: window.__F.plot.script.progress,
        }));
        console.log('\n[1] sown', growing);
        check('the plot sows itself on play start and grows', growing.stage >= 1, growing);

        // --- 2. It ripens (dt-based) and paints gold; the slow plot lags ---
        await h.waitFor(() => window.__F.plot.script.stage === 2, null, 30000);
        const ripe = await h.evaluate(() => {
            const s = window.__F.plot.script;
            const crop = s._crop;
            return {
                scale: crop.scaling.x,
                gold: s._cropMat.emissiveColor.r > 0.9 && s._cropMat.emissiveColor.g > 0.6,
                slowStage: window.__F.slow.script.stage,
                slowProgress: window.__F.slow.script.progress,
                ownMat: crop.material !== window.app.findWorldObject('pr_plot').mesh.getChildMeshes()[0].material,
            };
        });
        console.log('[2] ripe', ripe);
        check('the ripe crop scales up and turns glowberry-gold', ripe.scale > 1.2 && ripe.gold, ripe);
        check('the crop material is per-instance (template untouched)', ripe.ownMat === true, ripe);
        check('the slow plot is still growing (dt-scaled, not instant)',
            ripe.slowStage === 1 && ripe.slowProgress < 0.9, ripe);
        await h.screenshot('ripe-glowberries');

        // --- 3. Walking over the ripe plot harvests + replants ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__F.plot.position.add(new BABYLON.Vector3(0, 0.8, 0)));
        });
        await h.waitFor(() => window.app.sidekickFood >= 2, null, 20000);
        const harvested = await h.evaluate(() => ({
            food: window.app.sidekickFood,
            counted: window.__F.c.script.count,
            stage: window.__F.plot.script.stage,
            progress: window.__F.plot.script.progress,
        }));
        console.log('[3] harvest', harvested);
        check('walking the ripe plot harvests +2 food', harvested.food === 2, harvested);
        check('`harvested` fired the wired counter once', harvested.counted === 1, harvested);
        check('autoReplant sows the next crop immediately',
            harvested.stage === 1 && harvested.progress < 0.5, harvested);

        // --- 4. Feeding prefers food; pixels untouched; falls back when empty ---
        const feed = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 100;
            app.ownedSidekicks.add('wisp');
            app.activeSidekick = 'wisp';
            window.localStorage.removeItem('iis_sk_wisp_level');
            window.localStorage.removeItem('iis_sk_wisp_xp');
            const xp0 = app.sidekickXpOf('wisp');
            app.feedSidekick();                      // uses 1 of the 2 food
            const afterFood = {
                food: app.sidekickFood, pixels: app.pixels,
                xp: app.sidekickXpOf('wisp') - xp0,
            };
            app.feedSidekick();                      // uses the last food
            app.feedSidekick();                      // pantry empty: pixels
            return {
                afterFood,
                finalFood: app.sidekickFood,
                finalPixels: app.pixels,
            };
        });
        console.log('[4] feeding', feed);
        check('food feeding grants 15 XP and leaves pixels untouched',
            feed.afterFood.xp === 15 && feed.afterFood.pixels === 100 && feed.afterFood.food === 1, feed);
        check('an empty pantry falls back to the 10-pixel meal',
            feed.finalFood === 0 && feed.finalPixels === 90, feed);

        // --- 5. Food persists across reload ---
        const persist = await h.evaluate(() => {
            const app = window.app;
            app.addSidekickFood(3);
            app.loadEconomy();
            return { food: app.sidekickFood };
        });
        console.log('[5] persistence', persist);
        check('sidekick food survives a loadEconomy round-trip', persist.food === 3, persist);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during farming', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — crops grow, harvests feed the pantry, and food feeds the sidekick best.'
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
