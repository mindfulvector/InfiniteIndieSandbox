/*
 * Per-figure moveset test
 * -----------------------
 * Verifies the melee combo is figure-defined:
 *   - Scout: classic 3-hit chain, 3x finisher,
 *   - Volt: 2-hit chain whose finisher fires a free bolt,
 *   - Blaze: 4-hit chain (the 3rd swing is NOT a finisher),
 *   - Frost: the finisher chills an adjacent walker,
 *   - Wick: the finisher pops the walker airborne (launch),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7096 });
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
            app.currentWorldFile = null;
            ['blaze', 'frost', 'volt', 'wick'].forEach((id) => app.ownedFigures.add(id));
            app.playerLevel = 1;   // no level bonus: clean damage math
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            // A tough parked walker as the target dummy.
            pm.enemyManager.spawnWalker(pm.player.position.add(new BABYLON.Vector3(2, 1.5, 0)));
            const rec = pm.enemyManager.enemies[0];
            rec.speed = 0; rec.fade = 0; rec.meleeCd = 99999;
            window.__D = rec;
            // Swing helper: full chain in ONE synchronous burst (cooldowns
            // zeroed between swings; the combo window survives because no
            // frames elapse mid-burst).
            window.__chain = (n) => {
                const out = [];
                // Re-park the dummy each chain: melee knockback accumulates
                // synchronously across a burst and drifts it out of range.
                rec.mesh.position.copyFrom(pm.player.position.add(new BABYLON.Vector3(2, 0.5, 0)));
                if (rec.body) rec.body.vy = 0;
                pm.comboStage = 0; pm.comboTimer = 0;
                for (let i = 0; i < n; i++) {
                    pm.attackCooldown = 0;
                    const hp0 = rec.hp;
                    pm.meleeAttack(rec.mesh.position);
                    out.push(Math.round((hp0 - rec.hp) * 100) / 100);
                }
                return out;
            };
        });
        await h.waitFrames(10);

        // --- 1. Scout: 3-hit, 3x finisher ---
        const scout = await h.evaluate(() => {
            window.app.selectFigure('scout');
            window.__D.hp = 1000;
            return window.__chain(3);
        });
        console.log('\n[1] scout', scout);
        check('Scout: classic 1,1,3 chain', scout[0] === 1 && scout[1] === 1 && scout[2] === 3, scout);

        // --- 2. Volt: 2-hit, finisher fires a bolt ---
        const volt = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.selectFigure('volt');
            window.__D.hp = 1000;
            const bolts0 = pm.playerProjectiles ? pm.playerProjectiles.length : 0;
            const dmg = window.__chain(2);
            const bolts1 = pm.playerProjectiles ? pm.playerProjectiles.length : 0;
            return { dmg, boltFired: bolts1 > bolts0 };
        });
        console.log('[2] volt', volt);
        check('Volt: snappy 1,2 chain with a free bolt on the finisher',
            volt.dmg[0] === 1 && volt.dmg[1] === 2 && volt.boltFired, volt);

        // --- 3. Blaze: 4-hit (3rd is NOT the finisher) ---
        const blaze = await h.evaluate(() => {
            window.app.selectFigure('blaze');
            window.__D.hp = 1000;
            return window.__chain(4);
        });
        console.log('[3] blaze', blaze);
        // Blaze carries +1 meleeBonus on every swing: 2,2,2, then 2.5+1.
        check('Blaze: 4-hit pressure chain, finisher only on the 4th',
            blaze[0] === 2 && blaze[1] === 2 && blaze[2] === 2 && blaze[3] === 3.5, blaze);

        // --- 4. Frost: the finisher chills ---
        const frost = await h.evaluate(() => {
            window.app.selectFigure('frost');
            window.__D.hp = 1000; window.__D.chill = 0;
            const dmg = window.__chain(3);
            return { dmg, chill: window.__D.chill };
        });
        console.log('[4] frost', frost);
        check('Frost: the finisher chills the target', frost.chill > 0 && frost.dmg[2] === 2, frost);

        // --- 5. Wick: the finisher launches ---
        const wick = await h.evaluate(() => {
            window.app.selectFigure('wick');
            window.__D.hp = 1000; window.__D.chill = 0;
            const vy0 = window.__D.body ? window.__D.body.vy : 0;
            const dmg = window.__chain(4);
            return { dmg, vy: window.__D.body ? window.__D.body.vy : 0, vy0 };
        });
        console.log('[5] wick', wick);
        // dmg[3] = mult 2 + melee bonus 1 + juggle bonus 1: the launch fires
        // BEFORE the arc lands, so Wick's own finisher earns the airborne +1.
        check('Wick: the finisher pops the walker airborne (and self-juggles)',
            wick.vy > 3 && wick.dmg[3] === 4, wick);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during movesets', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — every figure fights with its own hands.'
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
