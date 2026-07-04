/*
 * Gadget hex test (equippable passive perks)
 * ------------------------------------------
 * Verifies the gadget half of the hex-disc row:
 *   - gadgets exist; 'none' is free, others are priced and start unowned,
 *   - buying deducts pixels, grants into the collection, and selects
 *     (persisted; active choice survives a reload),
 *   - Boost Boots raise the CC jump speed on session apply (and the stock
 *     baseline, so a trampoline restore can't erase it),
 *   - Pixel Magnet makes a burst reach the player far faster than default,
 *   - Guardian Ward absorbs the first hit each life and recharges on
 *     respawn; the second hit lands,
 *   - the Discs screen shows the gadget rows and the digit selects one,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7101 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            app.ownedGadgets = new Set(['none']);
            app.activeGadgetHex = 'none';
            app.applyGadgetToSession();
            app.pixels = 500;
            app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. Roster + buy/select/persist ---
        const buy = await h.evaluate(() => {
            const app = window.app;
            const list = app.gadgetHexes().map((g) => g.id);
            const p0 = app.pixels;
            const ok = app.buyGadgetHex('booster');
            const persisted = window.localStorage.getItem('iis_gadget_active');
            app.loadEconomy();   // reload from storage
            return { list, ok, spent: p0 - app.pixels, owned: app.ownsGadget('booster'),
                active: app.activeGadgetHex, persisted };
        });
        console.log('\n[1] buy', buy);
        check('gadgets exist (none + three perks)',
            buy.list.length === 4 && buy.list[0] === 'none', buy);
        check('buying deducts pixels, grants, selects, and persists',
            buy.ok && buy.spent === 90 && buy.owned && buy.active === 'booster' && buy.persisted === 'booster', buy);

        // --- 2. Boost Boots raise the jump speed ---
        const boost = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            app.selectGadgetHex('none'); app.applyGadgetToSession();
            const base = pm.cc._actionMap.idleJump.speed;
            app.selectGadgetHex('booster'); app.applyGadgetToSession();
            return { base, boosted: pm.cc._actionMap.idleJump.speed, normal: pm._normalJumpSpeed };
        });
        console.log('[2] boost', boost);
        check('Boost Boots raise the CC jump speed and the stock baseline',
            boost.base === 6 && boost.boosted === 9 && boost.normal === 9, boost);

        // Own the rest so select can switch to them below.
        await h.evaluate(() => { window.app.ownedGadgets.add('magnet'); window.app.ownedGadgets.add('guardian'); });

        // --- 3. Pixel Magnet: bursts reach the player far faster ---
        const timeTo = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const run = (gadget) => new Promise((res) => {
                app.selectGadgetHex(gadget); app.applyGadgetToSession();
                pm.pixelBursts.forEach((pb) => pb.mesh.dispose());
                pm.pixelBursts.length = 0;
                pm.spawnPixelBurst(pm.player.position.add(new BABYLON.Vector3(6, 0.5, 6)), 6);
                let n = 0;
                const tick = () => {
                    n++;
                    pm.updatePixelBursts();
                    if (pm.pixelBursts.length === 0 || n > 600) return res(n);
                    requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
            run('none').then((plain) => run('magnet').then((mag) =>
                resolve({ plain, mag })));
        }));
        console.log('[3] magnet', timeTo);
        check('Pixel Magnet collects a burst faster than default',
            timeTo.mag < timeTo.plain && timeTo.mag < 90, timeTo);

        // --- 4. Guardian Ward absorbs the first hit, recharges on respawn ---
        const ward = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            app.selectGadgetHex('guardian'); app.applyGadgetToSession();
            pm.playerMaxHp = 200; pm.playerHp = 200; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 0;
            pm.damagePlayer(20);                 // absorbed
            const afterFirst = pm.playerHp;
            pm.hurtCooldown = 0;
            pm.damagePlayer(20);                 // lands
            const afterSecond = pm.playerHp;
            app.pixels = 100; pm.respawn();      // recharge
            pm.hurtCooldown = 0; pm.playerHp = 200;
            pm.damagePlayer(20);                 // absorbed again
            const afterRespawn = pm.playerHp;
            return { afterFirst, afterSecond, afterRespawn };
        });
        console.log('[4] ward', ward);
        check('Guardian Ward absorbs hit 1, hit 2 lands, and it recharges on respawn',
            ward.afterFirst === 200 && ward.afterSecond === 180 && ward.afterRespawn === 200, ward);

        // --- 5. Discs screen shows the gadget rows; a digit selects ---
        await h.evaluate(() => {
            const app = window.app;
            app.selectGadgetHex('none');
            app.menu.prevState = 2; app.menu.state = 14 /* MENU_DISCS */;
            app.menu.renderedState = -1;
        });
        await h.waitFrames(6);
        const row = await h.evaluate(() => ({
            hasRow: !!window.app.gui.getControlByName('btnGadget_magnet'),
        }));
        const pickRow = await h.evaluate(() => {
            // magnet is the 2nd gadget: DISCS + HEX + 2.
            const app = window.app;
            const idx = app.discs().length + app.hexDiscs().length + 2;
            app.triggerMenuItem(14, idx);
            return { active: app.activeGadgetHex };
        });
        console.log('[5] disc row', { row, pickRow });
        check('the Discs screen lists gadgets and a digit selects one',
            row.hasRow && pickRow.active === 'magnet', { row, pickRow });

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during gadgets', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — magnets pull, boots leap, and the ward takes the first blow.'
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
