/*
 * Sentry turret test
 * ------------------
 * Verifies en_turret:
 *   - registers as an attackable enemy (isEnemy + hp) with TurretScript,
 *   - tracks the player (yaw) and fires enemy projectiles on its cadence
 *     when the player is in range (sighted in-page as the shot crosses),
 *   - stays silent when the player is out of range,
 *   - is defeated by melee (hides resettably, drops loot XP, fires
 *     `defeated`) rather than being disposed,
 *   - a play reset re-arms it (health + visibility restored),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7110 });
    try {
        await h.start();
        await h.waitForReady(['en_turret', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000; pm.playerHp = 10000;   // survive its shots
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const t = window.app.findWorldObject('en_turret').createInstance();
            t.position = new BABYLON.Vector3(300, 2, 300);   // parked alone
            return { enemy: t.isEnemy === true, hp: t.hp, script: t.script.constructor.name,
                out: t.script.outputs.some((o) => o.id === 'defeated') };
        });
        console.log('\n[1] registration', reg);
        check('en_turret registers as an attackable enemy with a defeated output',
            reg.enemy && reg.hp > 0 && reg.script === 'TurretScript' && reg.out, reg);

        // --- 2. Fires at an in-range player, tracks yaw ---
        const fired = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const t = app.findWorldObject('en_turret').createInstance();
            t.position = new BABYLON.Vector3(50, 1, 50);
            t.params = { range: 12, cadence: 40 };
            t.script._wasPlay = null;
            t.script.update(true, pm);   // settle play transition
            pm.player.position.copyFrom(new BABYLON.Vector3(55, 1, 50));   // 5 units away, in range
            pm.enemyManager.projectiles.length = 0;
            window.__T = t;
            let n = 0, sawShot = false;
            const tick = () => {
                n++;
                t.script.update(true, pm);
                if (pm.enemyManager.projectiles.length > 0) sawShot = true;
                if (n >= 60) {
                    // Yaw should point roughly +x (toward the player).
                    const q = t.rotationQuaternion || BABYLON.Quaternion.Identity();
                    const fwd = new BABYLON.Vector3(0, 0, 1).rotateByQuaternionToRef(q, new BABYLON.Vector3());
                    return resolve({ sawShot, aimX: fwd.x });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] fires', fired);
        check('an in-range turret fires and aims at the player',
            fired.sawShot && fired.aimX > 0.7, fired);
        await h.screenshot('turret');

        // --- 3. Silent when out of range ---
        const silent = await h.evaluate(() => {
            const pm = window.app.activeMode, t = window.__T;
            pm.player.position.copyFrom(new BABYLON.Vector3(50 + 40, 1, 50));   // 40 units: out of range
            t.script._cool = 0;
            pm.enemyManager.projectiles.length = 0;
            for (let i = 0; i < 30; i++) t.script.update(true, pm);
            return { shots: pm.enemyManager.projectiles.length };
        });
        console.log('[3] silent', silent);
        check('a turret holds fire when the player is out of range', silent.shots === 0, silent);

        // --- 4. Defeated by melee: resettable hide + loot + `defeated` ---
        const killed = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, t = window.__T;
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(50, 1, 53);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            t.wires = [{ event: 'defeated', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__CNT = cnt;
            // Stand next to it and swing until it falls.
            pm.player.position.copyFrom(t.position.add(new BABYLON.Vector3(0, 0, -1.5)));
            const xp0 = app.playerXp;
            for (let i = 0; i < 8 && !t.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(t.position);
            }
            return { defeated: t.defeated, hidden: t.isVisible === false,
                counted: cnt.script.count, xpGained: app.playerXp - xp0,
                disposedGone: app.findWorldObject('en_turret').instances.indexOf(t) };
        });
        console.log('[4] killed', killed);
        check('melee defeats the turret: hidden (not disposed), loot XP, fires `defeated`',
            killed.defeated && killed.hidden && killed.counted === 1 &&
            killed.xpGained >= 6 && killed.disposedGone >= 0, killed);

        // --- 5. Play reset re-arms it ---
        const rearm = await h.evaluate(() => {
            const pm = window.app.activeMode, t = window.__T;
            t.script.onPlayReset(pm);
            return { defeated: t.defeated, hp: t.hp, visible: t.isVisible };
        });
        console.log('[5] rearm', rearm);
        check('a play reset re-arms the turret (health + visibility)',
            !rearm.defeated && rearm.hp === 4 && rearm.visible === true, rearm);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the turret', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the sentry tracks, fires, falls, and stands again.'
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
