/*
 * Sidekick gear test
 * ------------------
 * Verifies the food-crafted wardrobe:
 *   - crafting without food is refused,
 *   - the Tiny Top Hat costs 5 food, auto-wears, and adds +2 aura HP,
 *   - the follower mesh redresses with the hat accessory (name + child),
 *   - the Silver Bell makes the XP share round UP,
 *   - the Micro Cape replaces the bell in the trinket slot (bell stays
 *     owned) and boosts meals by +5 XP,
 *   - outfits are per sidekick (a fresh sidekick is naked; switching back
 *     restores the outfit),
 *   - ownership and outfits survive a loadEconomy round-trip,
 *   - the Sidekick Care digits craft/wear,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7054 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.evaluate(() => {
            const app = window.app;
            app.pixels = 0;
            app.sidekickFood = 0;
            app.ownedGear = new Set();
            app.ownedSidekicks = new Set(['wisp', 'pebble']);
            app.activeSidekick = 'wisp';
            ['wisp', 'pebble'].forEach((id) => {
                window.localStorage.removeItem('iis_sk_' + id + '_gear');
                window.localStorage.removeItem('iis_sk_' + id + '_level');
                window.localStorage.removeItem('iis_sk_' + id + '_xp');
            });
            app.playerLevel = 1; app.playerXp = 0;
            app.saveEconomy();
        });

        // --- 1. No food, no hat ---
        const broke = await h.evaluate(() => {
            const app = window.app;
            const ok = app.buyOrWearGear('tophat');
            return { ok, owned: [...app.ownedGear] };
        });
        console.log('\n[1] broke crafting', broke);
        check('crafting without food is refused', !broke.ok && broke.owned.length === 0, broke);

        // --- 2. The hat: 5 food, auto-worn, +2 aura HP ---
        const hat = await h.evaluate(() => {
            const app = window.app;
            app.addSidekickFood(12);
            const hp0 = app.maxHpForLevel();
            const ok = app.buyOrWearGear('tophat');
            return {
                ok, food: app.sidekickFood,
                worn: app.gearWorn('tophat'),
                hp0, hp1: app.maxHpForLevel(),
            };
        });
        console.log('[2] top hat', hat);
        check('the hat costs 5 food and auto-wears', hat.ok && hat.food === 7 && hat.worn, hat);
        check('the worn hat adds +2 aura HP', hat.hp1 === hat.hp0 + 2, hat);

        // --- 3. The follower redresses with the accessory ---
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFor(() => {
            const m = window.app.activeMode.sidekickMesh;
            return m && m.name.indexOf('tophat') >= 0 && m.getChildMeshes().length === 1;
        }, null, 20000);
        console.log('[3] follower redressed with the hat');
        check('the follower mesh redresses with the hat accessory', true);
        await h.screenshot('hatted-wisp');

        // --- 4. The bell rounds the XP share up ---
        const bell = await h.evaluate(() => {
            const app = window.app;
            app.buyOrWearGear('bell');           // 4 food -> 3 left
            const xp0 = app.sidekickXpOf('wisp');
            app.addXp(5);                        // share: ceil(2.5) = 3 with the bell
            return {
                food: app.sidekickFood,
                worn: app.gearWorn('bell'),
                share: app.sidekickXpOf('wisp') - xp0,
            };
        });
        console.log('[4] silver bell', bell);
        check('the bell wears into the trinket slot (4 food)', bell.worn && bell.food === 3, bell);
        check('the XP share rounds UP with the bell (5 XP → 3 share)', bell.share === 3, bell);

        // --- 5. The cape replaces the bell; meals gain +5 XP ---
        const cape = await h.evaluate(() => {
            const app = window.app;
            app.addSidekickFood(10);             // afford the cape + a meal
            app.buyOrWearGear('cape');           // 6 food; replaces bell in the slot
            // Total progression must account for level-ups: raw XP wraps when
            // a meal crosses the threshold (xpToNext(1) = 20).
            const lvl0 = app.sidekickLevelOf('wisp'), xp0 = app.sidekickXpOf('wisp');
            app.feedSidekick();                  // 1 food -> 15 + 5 XP
            const lvl1 = app.sidekickLevelOf('wisp'), xp1 = app.sidekickXpOf('wisp');
            let gained = xp1 - xp0;
            for (let l = lvl0; l < lvl1; l++) gained += app.sidekickXpToNext(l);
            return {
                capeWorn: app.gearWorn('cape'),
                bellWorn: app.gearWorn('bell'),
                bellOwned: app.ownsGear('bell'),
                mealXp: gained,
            };
        });
        console.log('[5] micro cape', cape);
        check('the cape replaces the bell (which stays owned)',
            cape.capeWorn && !cape.bellWorn && cape.bellOwned, cape);
        check('a caped meal grants 20 XP', cape.mealXp === 20, cape);

        // --- 6. Outfits are per sidekick and restore on switch-back ---
        const outfits = await h.evaluate(() => {
            const app = window.app;
            app.selectSidekick('pebble');
            const pebbleNaked = !app.gearWorn('tophat') && !app.gearWorn('cape');
            app.selectSidekick('wisp');
            return {
                pebbleNaked,
                wispRestored: app.gearWorn('tophat') && app.gearWorn('cape'),
            };
        });
        console.log('[6] per-sidekick outfits', outfits);
        check('outfits are per sidekick and restore on switch-back',
            outfits.pebbleNaked && outfits.wispRestored, outfits);

        // --- 7. Persistence round-trip ---
        const persist = await h.evaluate(() => {
            const app = window.app;
            app.loadEconomy();
            return {
                owned: [...app.ownedGear].sort(),
                hatWorn: app.gearWorn('tophat'),
            };
        });
        console.log('[7] persistence', persist);
        check('gear ownership and the outfit survive reload',
            JSON.stringify(persist.owned) === JSON.stringify(['bell', 'cape', 'tophat']) && persist.hatWorn, persist);

        // --- 8. The Care screen digits craft/wear ---
        const menu = await h.evaluate(() => {
            const app = window.app;
            app.triggerMenuItem(16, 3);   // row 3 = bell: owned -> toggle it on (replaces cape)
            return { bellWorn: app.gearWorn('bell'), capeWorn: app.gearWorn('cape') };
        });
        console.log('[8] care digits', menu);
        check('the Care screen digit wears an owned trinket', menu.bellWorn && !menu.capeWorn, menu);

        // --- 9. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during gear', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — gear crafts from food, dresses the follower, and buffs the pair.'
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
