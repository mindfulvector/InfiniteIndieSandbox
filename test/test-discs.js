/*
 * Power discs test
 * ----------------
 * Verifies the round power-disc loadout:
 *   - a fresh economy owns/equips nothing; buying broke is refused,
 *   - buying a disc deducts pixels, auto-equips it, and its buff applies
 *     (+1 melee for Ember),
 *   - two DIFFERENT discs stack (Ember + Aegis: melee AND max HP up),
 *   - a third equip is refused (two slots), unequip frees the slot,
 *   - Swift shortens the dodge cooldown through the existing derivation,
 *   - Fortune pays +25% pixels via the fractional accumulator (16 singles
 *     yield exactly 20),
 *   - Sage boosts XP by 25% (rounded),
 *   - discs are global: switching figures keeps the loadout,
 *   - the loadout survives a loadEconomy round-trip,
 *   - the menu path Collection -> 9 opens the Discs screen and digit keys
 *     buy/toggle,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7041 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.evaluate(() => {
            const app = window.app;
            app.pixels = 0;
            app.ownedDiscs = new Set();
            app.equippedDiscs = [];
            app.ownedFigures = new Set(['scout']);
            app.activeFigure = 'scout';
            app.playerLevel = 1; app.playerXp = 0;
            app.saveEconomy();
        });

        // --- 1. Fresh economy: nothing owned, broke purchase refused ---
        const fresh = await h.evaluate(() => {
            const app = window.app;
            const ok = app.buyDisc('ember');
            return { ok, owned: [...app.ownedDiscs], melee0: app.meleeBonus() };
        });
        console.log('\n[1] fresh', fresh);
        check('a broke purchase is refused', !fresh.ok && fresh.owned.length === 0, fresh);

        // --- 2. Buying Ember deducts, auto-equips, and buffs melee ---
        const ember = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 500;
            const ok = app.buyDisc('ember');
            return {
                ok, pixels: app.pixels,
                equipped: [...app.equippedDiscs],
                melee: app.meleeBonus(),
            };
        });
        console.log('[2] ember', ember);
        check('buying Ember deducts 100 and auto-equips',
            ember.ok && ember.pixels === 400 && ember.equipped.includes('ember'), ember);
        check('Ember adds +1 melee damage', ember.melee === fresh.melee0 + 1, { fresh, ember });

        // --- 3. Two different discs stack; a third equip is refused ---
        const stack = await h.evaluate(() => {
            const app = window.app;
            const hp0 = app.maxHpForLevel();
            app.buyDisc('aegis');
            const hp1 = app.maxHpForLevel();
            app.buyDisc('swift');   // owned, but both slots are full
            return {
                hp0, hp1,
                melee: app.meleeBonus(),
                equipped: [...app.equippedDiscs],
                ownsSwift: app.ownsDisc('swift'),
                swiftEquipped: app.discEquipped('swift'),
                dodge: app.dodgeCooldownFrames(),
            };
        });
        console.log('[3] stacking', stack);
        check('Aegis stacks with Ember (+20 HP while melee stays buffed)',
            stack.hp1 === stack.hp0 + 20 && stack.melee === fresh.melee0 + 1, stack);
        check('a third equip is refused but the disc is owned',
            stack.ownsSwift && !stack.swiftEquipped && stack.equipped.length === 2, stack);
        check('unequipped Swift does not shorten the dodge', stack.dodge === 40, stack);

        // --- 4. Unequip frees a slot; Swift then applies ---
        const swift = await h.evaluate(() => {
            const app = window.app;
            app.toggleDisc('aegis');    // unequip
            app.toggleDisc('swift');    // equip into the freed slot
            return {
                equipped: [...app.equippedDiscs],
                dodge: app.dodgeCooldownFrames(),
                hp: app.maxHpForLevel(),
            };
        });
        console.log('[4] swift', swift);
        check('unequip frees the slot and Swift shortens the dodge (32)',
            swift.equipped.includes('swift') && !swift.equipped.includes('aegis') && swift.dodge === 32, swift);

        // --- 5. Fortune: +25% pixels via the fractional accumulator ---
        const fortune = await h.evaluate(() => {
            const app = window.app;
            app.toggleDisc('ember');       // free a slot
            app.pixels = 500;
            app.buyDisc('fortune');        // 150, auto-equips
            const p0 = app.pixels;
            app._pixelFrac = 0;
            for (let i = 0; i < 16; i++) app.addPixels(1);   // 16 singles
            return { p0, gained: app.pixels - p0 };
        });
        console.log('[5] fortune', fortune);
        check('Fortune pays 16 singles out as exactly 20 (+25%)', fortune.gained === 20, fortune);

        // --- 6. Sage: +25% XP (rounded) ---
        const sage = await h.evaluate(() => {
            const app = window.app;
            app.toggleDisc('swift');       // free a slot
            app.pixels = 500;
            app.buyDisc('sage');
            app.playerLevel = 1; app.playerXp = 0;
            app.addXp(8);                  // 8 * 1.25 = 10
            return { xp: app.playerXp, equipped: [...app.equippedDiscs] };
        });
        console.log('[6] sage', sage);
        check('Sage turns 8 XP into 10', sage.xp === 10, sage);

        // --- 7. Discs are global across figures + survive reload ---
        const persist = await h.evaluate(() => {
            const app = window.app;
            app.ownedFigures.add('volt');
            app.selectFigure('volt');
            const afterSwitch = [...app.equippedDiscs];
            app.loadEconomy();
            return { afterSwitch, afterReload: [...app.equippedDiscs], owned: [...app.ownedDiscs].sort() };
        });
        console.log('[7] persistence', persist);
        check('switching figures keeps the disc loadout',
            JSON.stringify(persist.afterSwitch) === JSON.stringify(persist.afterReload) &&
            persist.afterSwitch.length === 2, persist);
        check('ownership survives a localStorage round-trip',
            JSON.stringify(persist.owned) === JSON.stringify(['aegis', 'ember', 'fortune', 'sage', 'swift']), persist);

        // --- 8. Menu path: Collection -> 9 -> digit toggles ---
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);   // MENU_PAUSE
        await h.tapUntil('8', () => window.app.menu.state === 12);       // MENU_COLLECTION
        await h.tapUntil('9', () => window.app.menu.state === 14);       // MENU_DISCS
        await h.waitFrames(4);
        await h.screenshot('discs-screen');
        const menuToggle = await h.evaluate(() => {
            const app = window.app;
            // Both slots are full (fortune + sage), so toggle an EQUIPPED disc:
            // unequipping always succeeds; equipping a third is (correctly)
            // refused, which is not what this step is probing.
            const was = app.discEquipped('fortune');
            app.triggerMenuItem(14, 4);   // Fortune row
            return { was, now: app.discEquipped('fortune'), state: app.menu.state };
        });
        console.log('[8] menu toggle', menuToggle);
        check('the Discs screen digit path toggles an owned disc',
            menuToggle.was === true && menuToggle.now === false && menuToggle.state === 14, menuToggle);
        await h.tapUntil('0', () => window.app.menu.state === 12);
        check('0 returns from Discs to the Collection',
            await h.evaluate(() => window.app.menu.state === 12));

        // --- 9. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during discs', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — power discs buy, equip, stack, buff, and persist.'
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
