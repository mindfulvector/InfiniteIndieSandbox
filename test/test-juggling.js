/*
 * Aerial juggling test
 * --------------------
 * Verifies launcher attacks and air combos:
 *   - the launcher (R) knocks a walker airborne: upward velocity + stun,
 *     and it rises above its starting height over the next frames,
 *   - a stunned walker doesn't melee the player even at point-blank range,
 *   - hits on an airborne walker deal +1 damage and re-pop it (juggle),
 *   - juggleHits counts the chain and resets once everything lands,
 *   - the launcher pops a flyer (ballistic rise, contact attacks paused),
 *   - the launcher cooldown gates a second swing,
 *   - the real R keypress path triggers the launcher,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7036 });
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
        await h.waitFrames(20);

        // --- 1. Launcher knocks a walker airborne ---
        const launch = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.spawnWalker();
            const rec = em.enemies[0];
            rec.hp = 50; rec.speed = 0; rec.fade = 0;
            rec.mesh.position = pm.player.position.add(pm.playerForward().scale(1.6));
            window.__rec = rec;
            pm.launcherCooldown = 0;
            const hp0 = rec.hp;
            pm.launcherAttack();
            return { vy: rec.body.vy, stun: rec.stun, dmg: hp0 - rec.hp, y0: rec.mesh.position.y };
        });
        console.log('\n[1] launch', launch);
        check('the launcher gives the walker upward velocity', launch.vy >= 6, launch);
        check('the launcher stuns the walker', launch.stun >= 40, launch);
        check('the launcher deals its damage', launch.dmg >= 1, launch);

        // Wait for the rise by CONDITION: at unthrottled headless fps a few
        // frames cover almost no wall-clock time (dt-based physics barely move).
        await h.waitFor((y0) => window.__rec.mesh.position.y > y0 + 0.4, launch.y0, 20000);
        const rise = await h.evaluate(() => ({
            y: window.__rec.mesh.position.y,
            airborne: window.app.activeMode.enemyManager.isAirborne(window.__rec),
        }));
        console.log('[1b] rise', { y0: launch.y0, y: rise.y, airborne: rise.airborne });
        check('the walker rises above its launch height', rise.y > launch.y0 + 0.4, { launch, rise });
        check('the walker counts as airborne mid-flight', rise.airborne === true, rise);
        await h.screenshot('walker-launched');

        // --- 2. A stunned walker can't melee even at point-blank ---
        const noHit = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0;
            const hp0 = pm.playerHp;
            window.__rec.meleeCd = 0;   // would swing instantly if allowed
            return { hp0 };
        });
        await h.waitFrames(6);
        const noHit1 = await h.evaluate(() => ({ hp: window.app.activeMode.playerHp, stun: window.__rec.stun }));
        console.log('[2] stunned no-melee', { noHit, noHit1 });
        check('a stunned walker deals no melee damage', noHit1.hp >= noHit.hp0, { noHit, noHit1 });

        // --- 3. Airborne hits deal +1 and count the juggle ---
        const juggle = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            const rec = window.__rec;
            const airborne = em.isAirborne(rec);
            const hp0 = rec.hp;
            const j0 = pm.juggleHits;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            // Swing at the airborne walker (aim at its ground shadow).
            pm.meleeAttack(new BABYLON.Vector3(rec.mesh.position.x, pm.player.position.y, rec.mesh.position.z));
            return {
                airborne,
                dmg: hp0 - rec.hp,
                juggleDelta: pm.juggleHits - j0,
                vyAfter: rec.body.vy,
            };
        });
        console.log('[3] airborne hit', juggle);
        check('the target was still airborne when swung at', juggle.airborne === true, juggle);
        check('an airborne hit deals +1 damage (2 total at level 1)', juggle.dmg === 2, juggle);
        check('the juggle counter increments', juggle.juggleDelta === 1, juggle);
        check('the hit re-pops the walker (vy boosted)', juggle.vyAfter >= 3.4, juggle);

        // --- 4. The chain resets once everything lands ---
        await h.waitFor(() => {
            const em = window.app.activeMode.enemyManager;
            return !em.anyAirborne() && window.app.activeMode.juggleHits === 0;
        }, null, 30000);
        console.log('[4] chain reset after landing: ok');
        check('juggleHits resets when nothing is airborne', true);

        // --- 5. The launcher pops a flyer ---
        const flyer = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            // Clear the walker, bring in a flyer.
            em.enemies.forEach((e) => e.mesh.dispose(false, false)); em.enemies = [];
            em.spawnEnemy(pm.player.position.add(pm.playerForward().scale(1.6)).add(new BABYLON.Vector3(0, -1.6, 0)));
            const rec = em.enemies[0];
            rec.hp = 50; rec.speed = 0; rec.fade = 0; rec.attackCd = 0;
            window.__fly = rec;
            pm.launcherCooldown = 0;
            pm.launcherAttack();
            return { airborne: rec.airborne, vy: rec.launchVy, y0: rec.mesh.position.y };
        });
        await h.waitFor((y0) => window.__fly.mesh.position.y > y0 + 0.3, flyer.y0, 20000);
        const flyRise = await h.evaluate(() => ({ y: window.__fly.mesh.position.y }));
        console.log('[5] flyer pop', { flyer, flyRise });
        check('the launcher pops the flyer (airborne timer + upward speed)',
            flyer.airborne >= 40 && flyer.vy > 0.2, flyer);
        check('the flyer rises while popped', flyRise.y > flyer.y0 + 0.3, { flyer, flyRise });

        // --- 6. The cooldown gates a second swing ---
        const cd = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const rec = window.__fly;
            const hp0 = rec.hp;
            pm.launcherAttack();   // cooldown from step 5 still running
            return { dmg: hp0 - rec.hp, cooldown: pm.launcherCooldown };
        });
        console.log('[6] cooldown', cd);
        check('a second launch during the cooldown does nothing', cd.dmg === 0 && cd.cooldown > 0, cd);

        // --- 7. The real R keypress path triggers the launcher ---
        const prevCd = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.launcherCooldown = 0;
            return pm.launcherCooldown;
        });
        await h.tapUntil('r', () => window.app.activeMode.launcherCooldown > 0);
        console.log('[7] R key path: cooldown armed');
        check('pressing R triggers the launcher through the real input path', true);

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during juggling', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — launchers pop enemies airborne and air hits juggle for bonus damage.'
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
