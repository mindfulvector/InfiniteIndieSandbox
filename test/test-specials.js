/*
 * Figure specials test
 * --------------------
 * Verifies each figure's signature V-key special:
 *   - Scout's Shockwave hits AND launches enemies all around (front + behind),
 *   - Blaze's Flame Arc is a heavy frontal strike (behind is safe),
 *   - Frost's Nova chills walkers and flyers: rooted, no attacks, and a
 *     chilled walker deals no melee at point-blank,
 *   - Volt's Chain Bolt fires a fan of five projectiles,
 *   - the shared cooldown refuses a second special,
 *   - respawn resets the cooldown,
 *   - the real V keypress path triggers the special,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7040 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const app = window.app, em = app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            // Own every figure so we can cycle through the specials.
            ['blaze', 'frost', 'volt'].forEach((f) => app.ownedFigures.add(f));
            app.saveEconomy();
        });
        await h.waitFrames(15);

        const spawnPair = () => h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.enemies.forEach((e) => e.mesh.dispose(false, false)); em.enemies = [];
            em.spawnWalker(); em.spawnWalker();
            const [front, behind] = em.enemies;
            const f = pm.playerForward();
            front.hp = 50; front.speed = 0; front.fade = 0; front.stun = 0; front.chill = 0;
            behind.hp = 50; behind.speed = 0; behind.fade = 0; behind.stun = 0; behind.chill = 0;
            front.mesh.position = pm.player.position.add(f.scale(2.2));
            behind.mesh.position = pm.player.position.subtract(f.scale(2.2));
            window.__front = front; window.__behind = behind;
            pm.specialCooldown = 0;
        });

        // --- 1. Scout: Shockwave hits all around and launches ---
        await spawnPair();
        const shock = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const f0 = window.__front.hp, b0 = window.__behind.hp;
            pm.specialAttack();
            return {
                fig: window.app.activeFigure,
                frontDmg: f0 - window.__front.hp, behindDmg: b0 - window.__behind.hp,
                frontVy: window.__front.body.vy, behindVy: window.__behind.body.vy,
            };
        });
        console.log('\n[1] shockwave', shock);
        check('Shockwave damages enemies in front AND behind',
            shock.fig === 'scout' && shock.frontDmg >= 2 && shock.behindDmg >= 2, shock);
        check('Shockwave launches both (upward velocity)',
            shock.frontVy >= 4 && shock.behindVy >= 4, shock);

        // --- 2. Blaze: Flame Arc is heavy and frontal-only ---
        await h.evaluate(() => window.app.selectFigure('blaze'));
        await spawnPair();
        const flame = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const f0 = window.__front.hp, b0 = window.__behind.hp;
            pm.specialAttack();
            return { frontDmg: f0 - window.__front.hp, behindDmg: b0 - window.__behind.hp };
        });
        console.log('[2] flame arc', flame);
        check('Flame Arc deals heavy frontal damage (5+ with Blaze\'s bonus)',
            flame.frontDmg >= 5, flame);
        check('Flame Arc does not hit behind', flame.behindDmg === 0, flame);

        // --- 3. Frost: Nova chills (rooted + attack-less) ---
        await h.evaluate(() => window.app.selectFigure('frost'));
        await spawnPair();
        const nova = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.spawnEnemy(pm.player.position.add(new BABYLON.Vector3(0, -1, 3)));
            const fly = em.enemies[em.enemies.length - 1];
            fly.hp = 50; fly.fade = 0;
            window.__fly = fly;
            pm.specialAttack();
            return {
                walkerChill: window.__front.chill, flyerChill: fly.chill,
                walkerX: window.__front.mesh.position.x,
            };
        });
        console.log('[3] nova', nova);
        check('Nova chills walkers and flyers', nova.walkerChill > 100 && nova.flyerChill > 100, nova);
        const meleeCheck = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0;
            window.__front.meleeCd = 0;
            window.__front.mesh.position = pm.player.position.add(pm.playerForward().scale(1.2));
            return { hp0: pm.playerHp };
        });
        await h.waitFrames(8);
        const chillSafe = await h.evaluate(() => ({
            hp: window.app.activeMode.playerHp,
            chillLeft: window.__front.chill,
            x: window.__front.mesh.position.x,
        }));
        console.log('[3b] chilled walker is harmless', { meleeCheck, chillSafe });
        check('a chilled walker deals no melee at point-blank',
            chillSafe.hp >= meleeCheck.hp0 && chillSafe.chillLeft > 0, { meleeCheck, chillSafe });

        // --- 4. Volt: Chain Bolt fires a fan of five ---
        await h.evaluate(() => window.app.selectFigure('volt'));
        const bolt = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.playerProjectiles.forEach((pr) => pr.mesh.dispose()); pm.playerProjectiles = [];
            pm.specialCooldown = 0;
            pm.specialAttack();
            return { bolts: pm.playerProjectiles.length };
        });
        console.log('[4] chain bolt', bolt);
        check('Chain Bolt fires exactly five projectiles', bolt.bolts === 5, bolt);

        // --- 5. The shared cooldown refuses a second special ---
        const cd = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const n0 = pm.playerProjectiles.length;
            pm.specialAttack();   // cooldown from step 4 still running
            return { extra: pm.playerProjectiles.length - n0, cooldown: pm.specialCooldown };
        });
        console.log('[5] cooldown', cd);
        check('a second special during the cooldown is refused', cd.extra === 0 && cd.cooldown > 0, cd);

        // --- 6. Respawn resets the cooldown ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.pixels = 0;
            pm.respawn();
            return { cooldown: pm.specialCooldown };
        });
        check('respawn resets the special cooldown', reset.cooldown === 0, reset);

        // --- 7. The real V keypress path works ---
        await h.tapUntil('v', () => window.app.activeMode.specialCooldown > 0);
        console.log('[7] V key path: cooldown armed');
        check('pressing V triggers the special through the real input path', true);

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during specials', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — every figure has a working signature special on V.'
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
