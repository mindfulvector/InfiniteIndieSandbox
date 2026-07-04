/*
 * Skill tree test
 * ---------------
 * Verifies spending level-up points on skills:
 *   - points earned are derived from the level (level - 1), unspent = earned - spent,
 *   - spending ranks changes the derived stats (max HP, melee damage, ranged
 *     cooldown, dodge cooldown) and live-applies max HP to the play session,
 *   - the dodge actually starts with the skill-shortened cooldown,
 *   - overspend is refused when no points remain,
 *   - a maxed skill refuses further ranks even with points available,
 *   - ranks persist per figure: switching figures swaps rank sets,
 *   - ranks survive a reload of the economy (localStorage round-trip),
 *   - reset refunds every point and restores baseline stats,
 *   - the Skills menu opens from the pause menu (Esc -> 9), renders, and the
 *     number keys spend points through the real menu path (NOTE: Esc disposes
 *     the active mode, so the menu-driven checks run last, with no live pm),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7032 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
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

        // --- 1. Point math: earned derives from level, fresh figure has 0 spent ---
        const math0 = await h.evaluate(() => {
            const app = window.app;
            app.resetSkills();                    // clean slate for the run
            app.playerLevel = 6; app.playerXp = 0; app.saveEconomy();
            return {
                earned: app.skillPointsEarned(),
                spent: app.skillPointsSpent(),
                unspent: app.skillPointsUnspent(),
                hp0: app.maxHpForLevel(),
                melee0: app.meleeBonus(),
                ranged0: app.rangedCooldownFrames(),
                dodge0: app.dodgeCooldownFrames(),
            };
        });
        console.log('\n[1] point math at level 6', math0);
        check('level 6 has earned 5 points, 0 spent, 5 unspent',
            math0.earned === 5 && math0.spent === 0 && math0.unspent === 5, math0);

        // --- 2. Spending points changes stats and live max HP (mode alive) ---
        const spend = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            app.spendSkillPoint('vitality');
            app.spendSkillPoint('vitality');
            app.spendSkillPoint('power');
            app.spendSkillPoint('trigger');
            app.spendSkillPoint('agility');
            return {
                ranks: Object.assign({}, app.skillRanks),
                unspent: app.skillPointsUnspent(),
                hp: app.maxHpForLevel(),
                melee: app.meleeBonus(),
                ranged: app.rangedCooldownFrames(),
                dodge: app.dodgeCooldownFrames(),
                liveMaxHp: pm.playerMaxHp,
            };
        });
        console.log('[2] after spending 5 points', spend);
        check('vitality x2 adds +20 max HP', spend.hp === math0.hp0 + 20, { spend, math0 });
        check('power x1 adds +1 melee damage', spend.melee === math0.melee0 + 1, { spend, math0 });
        check('trigger x1 shaves 2 frames off ranged cooldown', spend.ranged === math0.ranged0 - 2, { spend, math0 });
        check('agility x1 shaves 8 frames off dodge cooldown', spend.dodge === math0.dodge0 - 8, { spend, math0 });
        check('all 5 points are now spent (0 unspent)', spend.unspent === 0, spend);
        check('the live play session picked up the new max HP', spend.liveMaxHp === spend.hp, spend);

        // --- 2b. The dodge actually uses the shortened cooldown ---
        const dodgeCd = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.dodgeFrames = 0; pm.dodgeCooldown = 0;
            pm.startDodge();
            return { cooldown: pm.dodgeCooldown, expected: window.app.dodgeCooldownFrames() };
        });
        console.log('[2b] dodge cooldown', dodgeCd);
        check('startDodge uses the skill-shortened cooldown (32)',
            dodgeCd.cooldown === dodgeCd.expected && dodgeCd.cooldown === 32, dodgeCd);

        // --- 3. Overspend refused at 0 unspent ---
        const overspend = await h.evaluate(() => {
            const app = window.app;
            const before = app.skillRank('power');
            const ok = app.spendSkillPoint('power');
            return { ok, before, after: app.skillRank('power') };
        });
        console.log('[3] overspend', overspend);
        check('spending with 0 unspent points is refused', !overspend.ok && overspend.after === overspend.before, overspend);

        // --- 4. Max rank refused even with points available ---
        const maxed = await h.evaluate(() => {
            const app = window.app;
            app.playerLevel = 20; app.saveEconomy();       // plenty of points
            app.skillRanks.agility = 2;                    // agility max = 2
            const ok = app.spendSkillPoint('agility');
            return { ok, rank: app.skillRank('agility'), unspent: app.skillPointsUnspent() };
        });
        console.log('[4] max rank', maxed);
        check('a maxed skill refuses another rank even with points left',
            !maxed.ok && maxed.rank === 2 && maxed.unspent > 0, maxed);

        // --- 5. Ranks persist per figure: switching swaps rank sets ---
        const perFig = await h.evaluate(() => {
            const app = window.app;
            const scoutRanks = Object.assign({}, app.skillRanks);
            app.ownedFigures.add('volt');                   // grant for the test
            app.selectFigure('volt');
            const voltRanks = Object.assign({}, app.skillRanks);
            const voltSpent = app.skillPointsSpent();
            app.selectFigure('scout');
            return { scoutRanks, voltRanks, voltSpent, backRanks: Object.assign({}, app.skillRanks) };
        });
        console.log('[5] per-figure ranks', perFig);
        check('a fresh figure has no spent ranks', perFig.voltSpent === 0, perFig);
        check('switching back restores the original figure\'s ranks',
            JSON.stringify(perFig.backRanks) === JSON.stringify(perFig.scoutRanks) &&
            Object.keys(perFig.scoutRanks).length > 0, perFig);

        // --- 6. Ranks survive an economy reload (localStorage round-trip) ---
        const reload = await h.evaluate(() => {
            const app = window.app;
            const before = Object.assign({}, app.skillRanks);
            app.loadEconomy();
            return { before, after: Object.assign({}, app.skillRanks) };
        });
        console.log('[6] reload', reload);
        check('skill ranks survive loadEconomy (localStorage round-trip)',
            JSON.stringify(reload.after) === JSON.stringify(reload.before), reload);

        // --- 7. Reset refunds everything and restores baseline stats ---
        const reset = await h.evaluate(() => {
            const app = window.app;
            app.playerLevel = 6; app.saveEconomy();        // same level as the baseline
            app.resetSkills();
            return {
                ranks: Object.assign({}, app.skillRanks),
                unspent: app.skillPointsUnspent(),
                hp: app.maxHpForLevel(),
                melee: app.meleeBonus(),
                ranged: app.rangedCooldownFrames(),
                dodge: app.dodgeCooldownFrames(),
            };
        });
        console.log('[7] reset', reset);
        check('reset clears all ranks and refunds every point',
            Object.keys(reset.ranks).length === 0 && reset.unspent === 5, reset);
        check('stats return to the pre-skill baseline',
            reset.hp === math0.hp0 && reset.melee === math0.melee0 &&
            reset.ranged === math0.ranged0 && reset.dodge === math0.dodge0, { reset, math0 });

        // --- 8. Menu path: Esc -> 9 opens Skills; number keys spend for real ---
        // NOTE: Esc from the HUD disposes the active mode (pause = no live pm),
        // so this runs LAST. spendSkillPoint's live-apply safely no-ops then.
        await h.tapUntil('Escape', () => window.app.menu.state === 2);      // MENU_PAUSE
        await h.tapUntil('9', () => window.app.menu.state === 13);          // MENU_SKILLS
        await h.waitFrames(4);
        await h.screenshot('skills-menu');
        check('Esc -> 9 opens the Skills menu (state 13)',
            await h.evaluate(() => window.app.menu.state === 13));
        await h.tapUntil('1', () => window.app.skillRank('vitality') === 1); // spend via menu key
        const menuSpend = await h.evaluate(() => ({
            rank: window.app.skillRank('vitality'),
            unspent: window.app.skillPointsUnspent(),
            state: window.app.menu.state,
        }));
        console.log('[8] menu-key spend', menuSpend);
        check('pressing 1 in the Skills menu spends a vitality point',
            menuSpend.rank === 1 && menuSpend.unspent === 4 && menuSpend.state === 13, menuSpend);
        await h.waitFrames(3);
        await h.screenshot('skills-menu-after-spend');
        await h.tapUntil('0', () => window.app.menu.state === 2);            // back to pause
        check('0 returns from Skills to the pause menu',
            await h.evaluate(() => window.app.menu.state === 2));

        // --- 9. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during skill spending', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — level-up points buy persistent per-figure skill ranks that drive the derived stats.'
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
