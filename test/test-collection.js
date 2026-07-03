/*
 * Collection / digital-figures test
 * ---------------------------------
 * Action-driven checks with screenshots:
 *   - the roster exists with the free default figure owned and active,
 *   - the Collection screen opens from the pause menu,
 *   - a locked figure can't be taken without pixels; buying it with pixels
 *     unlocks and selects it (colorway tint applied to the live avatar),
 *   - figure stats apply (Blaze: +1 melee at level 1),
 *   - level/XP progress is tracked PER FIGURE and survives switching.
 */

const { GameHarness } = require('./harness');

const MENU_PAUSE = 2, MENU_COLLECTION = 12;
let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        // Fresh account: no pixels, only the default figure, level 1.
        await h.evaluate(() => {
            const app = window.app;
            app.pixels = 0;
            app.ownedFigures = new Set(['scout']);
            app.activeFigure = 'scout';
            app.playerLevel = 1; app.playerXp = 0;
            window.localStorage.removeItem('iis_fig_blaze_level');
            window.localStorage.removeItem('iis_fig_blaze_xp');
            app.saveEconomy();
        });

        // --- 1. Roster baseline ---
        const roster = await h.evaluate(() => ({
            n: window.app.figures().length,
            ids: window.app.figures().map((f) => f.id),
            active: window.app.activeFigure,
            ownsDefault: window.app.ownsFigure('scout'),
            ownsBlaze: window.app.ownsFigure('blaze'),
        }));
        console.log('\n[1] roster', roster);
        check('roster has 4 figures', roster.n === 4, roster);
        check('default figure is owned and active', roster.ownsDefault && roster.active === 'scout', roster);

        // --- 2. Into play mode; avatar wears the default (white) colorway ---
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(10);

        // --- 3. Open the Collection from the pause menu ---
        await h.tapUntil('Escape', () => window.app.menu.state === MENU_PAUSE);
        await h.tapUntil('8', () => window.app.menu.state === MENU_COLLECTION);
        await h.waitFrames(4);
        await h.screenshot('collection-screen');
        check('Collection opens from the pause menu', true);

        // --- 4. Can't take a locked figure without pixels ---
        await h.tapUntil('2', () => true, null, { tries: 1 });   // Blaze costs 150
        await h.waitFrames(4);
        const broke = await h.evaluate(() => ({
            active: window.app.activeFigure, owns: window.app.ownsFigure('blaze'), px: window.app.pixels,
        }));
        console.log('\n[4] broke attempt', broke);
        check('a locked figure stays locked without pixels', broke.owns === false && broke.active === 'scout', broke);

        // --- 5. Buy Blaze with pixels -> unlocked, selected, +1 melee ---
        await h.evaluate(() => { window.app.pixels = 200; });
        await h.tapUntil('2', () => window.app.activeFigure === 'blaze');
        await h.waitFrames(4);
        const bought = await h.evaluate(() => ({
            active: window.app.activeFigure, owns: window.app.ownsFigure('blaze'),
            px: window.app.pixels, melee: window.app.meleeBonus(), level: window.app.playerLevel,
        }));
        console.log('[5] bought blaze', bought);
        check('buying with pixels unlocks and selects the figure', bought.owns && bought.active === 'blaze', bought);
        check('the purchase deducted the price (200 - 150 = 50)', bought.px === 50, bought);
        check('figure stats apply (Blaze +1 melee at level 1)', bought.melee === 1, bought);

        // --- 6. Per-figure progress: Blaze levels up; Scout stays level 1 ---
        await h.evaluate(() => { window.app.addXp(30); });   // 25 needed -> Blaze hits LV 2
        const perFig = await h.evaluate(() => {
            const app = window.app;
            const blazeLvl = app.playerLevel;
            app.selectFigure('scout');
            const scoutLvl = app.playerLevel;
            app.selectFigure('blaze');
            return { blazeLvl, scoutLvl, backToBlaze: app.playerLevel };
        });
        console.log('\n[6] per-figure progress', perFig);
        check('XP levelled the active figure (Blaze -> LV 2)', perFig.blazeLvl === 2, perFig);
        check('other figures keep their own progress (Scout still LV 1)', perFig.scoutLvl === 1, perFig);
        check('switching back restores the figure\'s level (Blaze LV 2)', perFig.backToBlaze === 2, perFig);

        // --- 7. Back to play as Blaze; screenshot the tinted avatar + HUD ---
        await h.tapUntil('0', () => window.app.menu.state === MENU_PAUSE);
        await h.tapUntil('2', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(15);
        const inPlay = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            // Sample the tint ratio of a live avatar material vs its original color.
            let tinted = null;
            const mats = [];
            const collect = (m) => { if (!m) return; if (m.subMaterials) m.subMaterials.forEach((s) => s && mats.push(s)); else mats.push(m); };
            collect(pm.player.material);
            pm.player.getChildMeshes().forEach((c) => collect(c.material));
            const withOrig = mats.find((m) => m._origDiffuse && m.diffuseColor && m._origDiffuse.g > 0.05);
            if (withOrig) {
                tinted = {
                    r: Math.round(withOrig.diffuseColor.r / Math.max(0.001, withOrig._origDiffuse.r) * 100) / 100,
                    g: Math.round(withOrig.diffuseColor.g / Math.max(0.001, withOrig._origDiffuse.g) * 100) / 100,
                };
            }
            return { hud: app.hud.levelText.text, tinted };
        });
        console.log('\n[7] back in play', inPlay);
        check('the HUD badge names the active figure and level',
            /Blaze/.test(inPlay.hud) && /LV 2/.test(inPlay.hud), inPlay);
        check('the colorway tint is applied to the avatar (Blaze: full red, reduced green)',
            inPlay.tinted && Math.abs(inPlay.tinted.r - 1.0) < 0.05 && inPlay.tinted.g < 0.6, inPlay);
        await h.screenshot('blaze-colorway');

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — figures buy/select with pixels, tint the avatar, and level up independently.'
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
