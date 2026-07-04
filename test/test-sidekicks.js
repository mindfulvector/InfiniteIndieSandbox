/*
 * Sidekicks test
 * --------------
 * Verifies the adoptable companions:
 *   - a fresh economy has none; adopting broke is refused,
 *   - adopting Wisp deducts 50, owns it, makes it follow, and its aura adds
 *     +2 max HP (level 1),
 *   - the follower mesh exists in play mode and closes distance when the
 *     player teleports away,
 *   - the sidekick earns half the player's XP and levels on its own curve
 *     (aura grows to +4 at level 2, live-applied),
 *   - feeding costs 10 pixels for 10 sidekick XP,
 *   - re-selecting the active sidekick dismisses it (mesh removed, aura off),
 *   - per-sidekick progress persists across a loadEconomy round-trip,
 *   - the Collection digit path adopts (row 5) and feeds (row 8),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7045 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.evaluate(() => {
            const app = window.app;
            app.pixels = 0;
            app.ownedSidekicks = new Set();
            app.activeSidekick = null;
            ['wisp', 'pebble', 'spark'].forEach((id) => {
                window.localStorage.removeItem('iis_sk_' + id + '_level');
                window.localStorage.removeItem('iis_sk_' + id + '_xp');
            });
            app.playerLevel = 1; app.playerXp = 0;
            app.saveEconomy();
        });

        // --- 1. Broke adoption refused; paid adoption follows + buffs ---
        const adopt = await h.evaluate(() => {
            const app = window.app;
            const broke = app.adoptSidekick('wisp');
            const hp0 = app.maxHpForLevel();
            app.pixels = 100;
            const ok = app.adoptSidekick('wisp');
            return {
                broke, ok, pixels: app.pixels,
                active: app.activeSidekick,
                hp0, hp1: app.maxHpForLevel(),
            };
        });
        console.log('\n[1] adoption', adopt);
        check('a broke adoption is refused', adopt.broke === false, adopt);
        check('adopting Wisp deducts 50 and makes it follow',
            adopt.ok && adopt.pixels === 50 && adopt.active === 'wisp', adopt);
        check('the level-1 aura adds +2 max HP', adopt.hp1 === adopt.hp0 + 2, adopt);

        // --- 2. The follower mesh exists in play mode and follows ---
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFor(() => !!window.app.activeMode.sidekickMesh, null, 20000);
        await h.screenshot('sidekick-following');
        const farPos = await h.evaluate(() => {
            const pm = window.app.activeMode;
            // Stay ON the terrain (the default grid is only ~20x20): off-world
            // the player falls forever and the follower can never catch up.
            pm.player.position.addInPlace(new BABYLON.Vector3(8, 0, 0));
            return BABYLON.Vector3.Distance(pm.sidekickMesh.position, pm.player.position);
        });
        await h.waitFor(() => {
            const pm = window.app.activeMode;
            return BABYLON.Vector3.Distance(pm.sidekickMesh.position, pm.player.position) < 3.5;
        }, null, 20000);
        console.log('[2] follow', { distanceAfterTeleport: farPos });
        check('the follower closes the teleport gap', farPos > 5, { farPos });

        // --- 3. XP share: half the player's XP, leveling the aura live ---
        const share = await h.evaluate(() => {
            const app = window.app;
            const xp0 = app.sidekickXpOf('wisp');
            app.addXp(10);                       // sidekick gets floor(10/2) = 5
            const xp1 = app.sidekickXpOf('wisp');
            const hpBefore = app.maxHpForLevel();
            // Push it over the level-1 threshold (20): 15 more XP via addXp share.
            app.addXp(30);                       // +15 -> 20 total -> level 2
            return {
                gained: xp1 - xp0,
                level: app.sidekickLevelOf('wisp'),
                aura: app.sidekickBonus(),
                hpBefore, hpAfter: app.maxHpForLevel(),
            };
        });
        console.log('[3] xp share', share);
        check('the sidekick earns half the player\'s XP', share.gained === 5, share);
        // hpAfter also includes the PLAYER's own level-up from the same XP
        // (+5/level), so assert the aura precisely and the HP delta loosely.
        check('it levels on its own curve and the aura grows to +4',
            share.level === 2 && share.aura === 4 && share.hpAfter >= share.hpBefore + 2, share);

        // --- 4. Feeding: 10 pixels -> 10 sidekick XP ---
        const feed = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 50;
            const xp0 = app.sidekickXpOf('wisp');
            const ok = app.feedSidekick();
            return { ok, pixels: app.pixels, gained: app.sidekickXpOf('wisp') - xp0 };
        });
        console.log('[4] feeding', feed);
        check('feeding costs 10 pixels and grants 10 XP',
            feed.ok && feed.pixels === 40 && feed.gained === 10, feed);

        // --- 5. Re-selecting dismisses; the aura and mesh go away ---
        const dismiss = await h.evaluate(() => {
            const app = window.app;
            const hp0 = app.maxHpForLevel();
            app.selectSidekick('wisp');   // toggle off
            return { active: app.activeSidekick, hp0, hp1: app.maxHpForLevel() };
        });
        await h.waitFor(() => window.app.activeMode.sidekickMesh === null, null, 20000);
        console.log('[5] dismiss', dismiss);
        check('re-selecting dismisses the sidekick (aura off, mesh gone)',
            dismiss.active === null && dismiss.hp1 === dismiss.hp0 - 4, dismiss);

        // --- 6. Per-sidekick progress persists across reload ---
        const persist = await h.evaluate(() => {
            const app = window.app;
            app.selectSidekick('wisp');   // re-follow
            app.loadEconomy();
            return {
                active: app.activeSidekick,
                owned: [...app.ownedSidekicks],
                level: app.sidekickLevelOf('wisp'),
            };
        });
        console.log('[6] persistence', persist);
        check('ownership, choice, and level survive a reload',
            persist.active === 'wisp' && persist.owned.includes('wisp') && persist.level === 2, persist);

        // --- 7. Menu path: row 6 adopts Pebble; row 8 opens Sidekick Care,
        // whose row 1 feeds ---
        const menu = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 100;
            app.sidekickFood = 0;         // force the pixel meal for exact math
            app.triggerMenuItem(12, 6);   // adopt Pebble (row 5=wisp, 6=pebble)
            const adopted = app.activeSidekick === 'pebble' && app.ownsSidekick('pebble');
            const xp0 = app.sidekickXpOf('pebble');
            app.triggerMenuItem(12, 8);   // open Sidekick Care
            const careOpen = app.menu.state === 16;
            app.triggerMenuItem(16, 1);   // feed
            return { adopted, careOpen, fed: app.sidekickXpOf('pebble') - xp0, pixels: app.pixels };
        });
        console.log('[7] menu path', menu);
        check('the digits adopt (12/6), open Care (12/8), and feed (16/1)',
            menu.adopted && menu.careOpen && menu.fed === 10 && menu.pixels === 100 - 50 - 10, menu);

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during sidekicks', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — sidekicks adopt, follow, level, feed, and persist.'
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
