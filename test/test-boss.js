/*
 * Boss fight test
 * ---------------
 * Verifies the multi-phase arena boss:
 *   - en_boss registers, rigs itself (GravityBody, collision-free children,
 *     phase aura), and stomps toward the player,
 *   - real melee arcs damage it through the shared isEnemy plumbing,
 *   - phase 2 at <=20 HP: the wired `phase2` edge fires once and volleys
 *     appear in the enemy projectile system,
 *   - phase 3 at <=10 HP: `phase3` fires once and close-range shockwaves
 *     hurt the player,
 *   - defeat at 0 HP: `defeated` fires, rewards pay out, the boss hides
 *     WITHOUT being disposed,
 *   - a play reset re-arms the whole fight (full HP, phase 1, edges live
 *     again -- the phase2 counter reaches 2 on a second run),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7067 });
    try {
        await h.start();
        await h.waitForReady(['en_boss', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            const em = pm.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            // An effectively invincible player: a mid-test death would
            // auto-respawn and broadcast onPlayReset, silently zeroing the
            // wired counters and re-arming the boss under our feet.
            pm.playerMaxHp = 10000;
            pm.playerHp = 10000;
        });
        await h.waitFrames(10);

        // --- 1. Rig + stomp toward the player ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const boss = app.findWorldObject('en_boss').createInstance();
            boss.position = pm.player.position.add(new BABYLON.Vector3(9, 1.2, 0));
            const mk = (dz) => {
                const c = app.findWorldObject('l_counter').createInstance();
                c.position = boss.position.add(new BABYLON.Vector3(0, 0, dz));
                c.params.threshold = 10; c.params.autoReset = 'no';
                return c;
            };
            const p2 = mk(3), p3 = mk(5), dead = mk(7);
            boss.wires.push({ event: 'phase2', toWo: 'l_counter', toId: p2.worldId, action: 'increment' });
            boss.wires.push({ event: 'phase3', toWo: 'l_counter', toId: p3.worldId, action: 'increment' });
            boss.wires.push({ event: 'defeated', toWo: 'l_counter', toId: dead.worldId, action: 'increment' });
            window.__B = { boss, p2, p3, dead };
            boss.script._wasPlay = null;
        });
        await h.waitFrames(5);
        const d0 = await h.evaluate(() => {
            const pm = window.app.activeMode;
            return BABYLON.Vector3.Distance(window.__B.boss.position, pm.player.position);
        });
        await h.waitFor((d0) => {
            const pm = window.app.activeMode;
            return BABYLON.Vector3.Distance(window.__B.boss.position, pm.player.position) < d0 - 1.5;
        }, d0, 20000);
        const rig = await h.evaluate(() => ({
            aura: !!window.__B.boss.script._aura,
            kidsFree: window.__B.boss.getChildMeshes().every((m) => !m.checkCollisions),
            phase: window.__B.boss.script._phase,
        }));
        console.log('\n[1] stomping', rig);
        check('the boss rigs itself and stomps toward the player',
            rig.aura && rig.kidsFree && rig.phase === 1, rig);
        await h.screenshot('boss-phase1');

        // --- 2. Real melee arcs damage it ---
        const melee = await h.evaluate(() => {
            const pm = window.app.activeMode, B = window.__B.boss;
            pm.player.position.copyFrom(B.position.add(new BABYLON.Vector3(0, 0.3, -2.2)));
            pm.player.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
            const hp0 = B.hp;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(B.position);
            return { hp0, hp1: B.hp };
        });
        console.log('[2] melee lands', melee);
        check('real melee arcs damage the boss (shared isEnemy plumbing)',
            melee.hp1 < melee.hp0, melee);

        // --- 3. Phase 2: wired edge + volleys ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__B.boss.position.add(new BABYLON.Vector3(0, 0.3, -7)));
            pm.hurtCooldown = 0;
            window.__B.boss.hp = 20;   // through the phase gate
        });
        await h.waitFor(() => window.__B.boss.script._phase === 2, null, 20000);
        // Volleys cross the gap and despawn in wall-clock milliseconds at
        // headless fps -- a CDP poll misses them all. Sight one in-page.
        const volley = await h.evaluate(() => new Promise((resolve) => {
            const em = window.app.activeMode.enemyManager;
            let n = 0;
            const tick = () => {
                n++;
                if (em.projectiles.length > 0) return resolve({ sighted: true, frames: n });
                if (n > 600) return resolve({ sighted: false });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        const ph2 = await h.evaluate(() => ({ p2: window.__B.p2.script.count }));
        ph2.volley = volley.sighted;
        console.log('[3] phase 2', ph2);
        check('phase 2 fires its wired edge once and volleys begin',
            ph2.p2 === 1 && ph2.volley, ph2);

        // --- 4. Phase 3: edge + shockwave hurts the player ---
        const hpBefore = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.__B.boss.hp = 10;
            pm.hurtCooldown = 0;
            pm.player.position.copyFrom(window.__B.boss.position.add(new BABYLON.Vector3(0, 0.3, -3.5)));
            return pm.playerHp;
        });
        await h.waitFor(() => window.__B.boss.script._phase === 3, null, 20000);
        await h.waitFor((hp) => window.app.activeMode.playerHp < hp, hpBefore, 30000);
        const ph3 = await h.evaluate(() => ({ p3: window.__B.p3.script.count }));
        console.log('[4] phase 3', ph3);
        check('phase 3 fires its wired edge once and shockwaves land', ph3.p3 === 1, ph3);
        await h.screenshot('boss-enraged');

        // --- 5. Defeat: rewards, wired edge, hidden not disposed ---
        const defeat = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, B = window.__B.boss;
            app.pixels = 0;
            pm.player.position.copyFrom(B.position.add(new BABYLON.Vector3(0, 0.3, -2.2)));
            B.hp = 1;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(B.position);
            return {
                defeated: B.defeated,
                hidden: !B.isEnabled(),
                disposed: B.isDisposed ? B.isDisposed() : false,
                pixels: app.pixels,
                dead: window.__B.dead.script.count,
            };
        });
        console.log('[5] defeated', defeat);
        check('defeat fires the edge, pays out, and hides WITHOUT disposal',
            defeat.defeated && defeat.hidden && !defeat.disposed &&
            defeat.pixels >= 25 && defeat.dead === 1, defeat);

        // --- 6. A play reset re-arms the whole fight. The broadcast also
        // zeroes the wired counters (per-run state, by design), so the
        // re-fired phase2 edge shows as count 1 AGAIN -- proof of re-arm.
        await h.evaluate(() => {
            window.app.pixels = 100;   // absorb the respawn tithe
            window.app.activeMode.respawn();
            window.app.activeMode.playerHp = 10000;   // stay invincible
        });
        await h.waitFor(() => window.__B.boss.script._phase === 1 &&
            window.__B.boss.hp === 30 && window.__B.boss.isEnabled() &&
            window.__B.p2.script.count === 0, null, 20000);
        await h.evaluate(() => { window.__B.boss.hp = 20; });
        await h.waitFor(() => window.__B.p2.script.count === 1, null, 20000);
        console.log('[6] re-armed (phase2 edge fired again after reset)');
        check('a play reset re-arms the fight and the edges fire again', true);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the boss fight', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — three phases, wired edges, a payout, and a rematch.'
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
