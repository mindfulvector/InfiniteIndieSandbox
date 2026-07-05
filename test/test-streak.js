/*
 * Defeat-streak pixel multiplier test
 * -----------------------------------
 * Verifies the streak scoring loop:
 *   - streakMult tiers rise with the streak (1 -> 1.5 -> 2 -> 3),
 *   - chaining defeats (via the real defeatEnemy path) raises the streak,
 *   - a multiplied defeat drops BONUS pixels on top of the base reward,
 *   - a landed hit BREAKS the streak, but a DODGED/blocked hit preserves it,
 *   - death (respawn) resets the streak,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7143 });
    try {
        await h.start();
        await h.waitForReady(['en_charger']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
        });
        await h.waitFrames(10);

        // --- 1. streakMult tiers ---
        const tiers = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.resetStreak();
            const at = (s) => { pm._streak = s; return pm.streakMult(); };
            const r = { m0: at(0), m2: at(2), m3: at(3), m5: at(5), m6: at(6), m9: at(9), m10: at(10), m15: at(15) };
            pm.resetStreak();
            return r;
        });
        console.log('\n[1] tiers', tiers);
        check('streakMult tiers rise 1 -> 1.5 -> 2 -> 3 with the streak',
            tiers.m0 === 1 && tiers.m2 === 1 && tiers.m3 === 1.5 && tiers.m5 === 1.5 &&
            tiers.m6 === 2 && tiers.m9 === 2 && tiers.m10 === 3 && tiers.m15 === 3, tiers);

        // --- 2. Chaining defeats raises the streak ---
        const chain = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, wo = app.findWorldObject('en_charger');
            pm.resetStreak();
            for (let i = 0; i < 4; i++) {
                const e = wo.createInstance();
                e.position = new BABYLON.Vector3(200 + i, 1, 200);
                e.script._wasPlay = null; e.script.update(true, pm);
                pm.defeatEnemy(e, wo);
            }
            return { streak: pm._streak, mult: pm.streakMult(), best: pm._bestStreak };
        });
        console.log('[2] chain', chain);
        check('chaining 4 defeats raises the streak to 4 (multiplier 1.5)',
            chain.streak === 4 && chain.mult === 1.5 && chain.best >= 4, chain);

        // --- 3. A multiplied defeat drops bonus pixels ---
        const bonus = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.resetStreak(); pm._streak = 2;   // next notch -> streak 3, mult 1.5
            const before = pm.pixelBursts.length;
            pm.notchDefeat(new BABYLON.Vector3(210, 1, 210));
            const gained = pm.pixelBursts.length - before;
            return { streak: pm._streak, mult: pm.streakMult(), gained };
        });
        console.log('[3] bonus', bonus);
        check('a defeat at multiplier 1.5 drops +5 bonus pixels',
            bonus.streak === 3 && bonus.mult === 1.5 && bonus.gained === 5, bonus);

        // --- 4. A landed hit breaks the streak ---
        const hit = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.resetStreak(); pm._streak = 5;
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.dodgeFrames = 0; pm.blocking = false; pm._powerKind = null;
            pm.damagePlayer(10);   // a real hit lands
            const broke = pm._streak === 0;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { broke, streak: pm._streak };
        });
        console.log('[4] hit', hit);
        check('a hit that lands breaks the streak', hit.broke, hit);

        // --- 5. A dodged hit preserves the streak ---
        const dodged = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.resetStreak(); pm._streak = 5;
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.dodgeFrames = 300;   // rolling -> the hit is dodged
            pm.damagePlayer(10);
            pm.dodgeFrames = 0;
            const kept = pm._streak === 5;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { kept, streak: pm._streak };
        });
        console.log('[5] dodged', dodged);
        check('a dodged hit preserves the streak (clean play is rewarded)', dodged.kept, dodged);

        // --- 6. Death resets the streak ---
        const death = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.resetStreak(); pm._streak = 8;
            pm.respawn();
            return { streak: pm._streak };
        });
        console.log('[6] death', death);
        check('death (respawn) resets the streak', death.streak === 0, death);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the streak system', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — chain your kills clean and the pixels pour in.'
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
