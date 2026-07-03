/*
 * Melee combo + lock-on targeting test
 * ------------------------------------
 * Verifies the melee combo chain and the lock-on system in play mode:
 *   - three synchronous swings advance the combo 0 -> 1 -> 2 and the stage-2
 *     finisher (damage 3) plus two stage hits (1+1) kill a 5 hp walker,
 *   - the defeat awards pixels once the burst is collected,
 *   - forcing the combo window (comboTimer) to expire resets the chain to 0,
 *   - T locks onto the NEAREST enemy (an en_blob instance) and shows the
 *     'lockMarker' mesh,
 *   - a no-argument ranged attack uses the lock, kills the target, and the
 *     lock auto-clears (marker disposed) when the target dies,
 *   - a second T press toggles the lock off,
 *   - with no lock, an explicitly aimed ranged attack still fires.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7023 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.evaluate(() => { window.app.pixels = 0; window.app.saveEconomy(); });
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

        // --- 1. Combo chain: three synchronous swings = stages 0,1,2 and 5 dmg ---
        // All swings happen inside ONE evaluate so no frame runs in between and
        // the 36-frame combo window cannot expire.
        const combo = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.spawnWalker();
            const rec = em.enemies[0];
            rec.hp = 5; rec.speed = 0; rec.fade = 0;
            rec.mesh.position = pm.player.position.add(new BABYLON.Vector3(1.4, 0, 0));
            const px0 = window.app.pixels;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            const stages = [];
            pm.meleeAttack(); stages.push(pm.comboStage);
            pm.attackCooldown = 0;
            pm.meleeAttack(); stages.push(pm.comboStage);
            pm.attackCooldown = 0;
            pm.meleeAttack(); stages.push(pm.comboStage);
            return { stages, enemiesLeft: em.enemies.length, px0 };
        });
        console.log('\n[1] combo chain', combo);
        check('combo stages advance 0 -> 1 -> 2 across three chained swings',
            JSON.stringify(combo.stages) === JSON.stringify([0, 1, 2]), combo);
        check('chained swings (1+1+3 dmg) kill the 5 hp walker synchronously',
            combo.enemiesLeft === 0, combo);
        let pixelsAwarded = true;
        try {
            await h.waitFor(() => window.app.pixels > 0, null, 20000);
        } catch (_) { pixelsAwarded = false; }
        check('combo kill awards pixels once the burst is collected', pixelsAwarded,
            { pixels: await h.evaluate(() => window.app.pixels) });
        await h.screenshot('combo-kill');

        // --- 2. Window expiry: forcing comboTimer to 0 resets the chain ---
        const expiry = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.spawnWalker();
            const rec = em.enemies[em.enemies.length - 1];
            rec.hp = 10; rec.speed = 0; rec.fade = 0;
            rec.mesh.position = pm.player.position.add(new BABYLON.Vector3(1.4, 0, 0));
            pm.attackCooldown = 0; pm.comboTimer = 0;
            pm.meleeAttack();                       // stage 0, opens the window
            const stageAfterFirst = pm.comboStage;
            pm.comboTimer = 0;                      // force the window expired
            pm.attackCooldown = 0;
            pm.meleeAttack();                       // must NOT advance the chain
            const stageAfterSecond = pm.comboStage;
            // Clean up the surviving walker.
            const idx = em.enemies.indexOf(rec);
            if (idx >= 0) em.enemies.splice(idx, 1);
            rec.mesh.dispose(false, false);
            return { stageAfterFirst, stageAfterSecond, enemiesLeft: em.enemies.length };
        });
        console.log('[2] window expiry', expiry);
        check('an expired combo window resets the chain (stage stays 0)',
            expiry.stageAfterSecond === 0, expiry);

        // --- 3. Lock-on acquires the NEAREST enemy and shows the marker ---
        const ids = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            // Clear all enemies: walkers and any pre-existing en_blob instances.
            em.enemies.forEach((e) => e.mesh.dispose(false, false)); em.enemies = [];
            pm.clearLockOn();
            const wo = window.app.findWorldObject('en_blob');
            wo.instances.filter(Boolean).forEach((i) => wo.disposeInstance(i));
            const a = wo.createInstance();
            a.hp = 1;
            a.position = pm.player.position.add(new BABYLON.Vector3(4, 1.3, 0));
            const b = wo.createInstance();
            b.hp = 5;
            b.position = pm.player.position.add(new BABYLON.Vector3(8, 1.3, 0));
            return { aId: a.worldId, bId: b.worldId };
        });
        await h.waitFrames(5);
        await h.tapUntil('t', () => !!window.app.activeMode.lockTarget);
        const lock = await h.evaluate(() => {
            const pm = window.app.activeMode;
            return {
                type: pm.lockTarget ? pm.lockTarget.type : null,
                instId: pm.lockTarget && pm.lockTarget.inst ? pm.lockTarget.inst.worldId : null,
                hasMarker: !!window.app.scene.getMeshByName('lockMarker'),
            };
        });
        console.log('[3] lock-on acquire', { ids, lock });
        check('lock-on targets an en_blob instance', lock.type === 'inst', lock);
        check('lock-on picks the NEAREST enemy (blob A)', lock.instId === ids.aId, { ids, lock });
        check('the lockMarker mesh exists while locked', lock.hasMarker, lock);
        await h.waitFrames(3);
        await h.screenshot('lock-on-marker');

        // --- 4. A no-argument ranged shot uses the lock and kills A;
        //        the lock auto-clears when the target dies ---
        const fired = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.playerProjectiles.forEach((pr) => pr.mesh.dispose()); pm.playerProjectiles = [];
            pm.rangedCooldown = 0;
            pm.rangedAttack();   // NO argument: must aim via the lock-on target
            return { projectiles: pm.playerProjectiles.length };
        });
        console.log('[4] locked ranged shot', fired);
        check('a locked ranged attack (no aim argument) fires a projectile',
            fired.projectiles >= 1, fired);
        let aDied = true;
        try {
            await h.waitFor(() => {
                const wo = window.app.findWorldObject('en_blob');
                return wo.instances.filter((i) => i && !i.defeated).length === 1;
            }, null, 20000);
        } catch (_) { aDied = false; }
        check('the locked shot defeats blob A (one live blob remains)', aDied,
            await h.evaluate(() => {
                const wo = window.app.findWorldObject('en_blob');
                return { live: wo.instances.filter((i) => i && !i.defeated).length };
            }));
        let autoUnlocked = true;
        try {
            await h.waitFor(() => window.app.activeMode.lockTarget === null &&
                window.app.scene.getMeshByName('lockMarker') === null, null, 20000);
        } catch (_) { autoUnlocked = false; }
        check('the lock auto-clears (target + marker gone) when the target dies',
            autoUnlocked, await h.evaluate(() => ({
                lockTarget: !!window.app.activeMode.lockTarget,
                marker: !!window.app.scene.getMeshByName('lockMarker'),
            })));

        // --- 5. T toggles the lock off again ---
        await h.tapUntil('t', () => !!window.app.activeMode.lockTarget);
        const relock = await h.evaluate(() => {
            const pm = window.app.activeMode;
            return {
                instId: pm.lockTarget && pm.lockTarget.inst ? pm.lockTarget.inst.worldId : null,
                hasMarker: !!window.app.scene.getMeshByName('lockMarker'),
            };
        });
        console.log('[5] toggle', { relock, bId: ids.bId });
        check('a fresh T press locks the remaining blob (B)',
            relock.instId === ids.bId && relock.hasMarker, { relock, ids });
        await h.tapUntil('t', () => window.app.activeMode.lockTarget === null);
        const afterOff = await h.evaluate(() => ({
            lockTarget: !!window.app.activeMode.lockTarget,
            hasMarker: !!window.app.scene.getMeshByName('lockMarker'),
        }));
        check('a second T press toggles the lock off and removes the marker',
            !afterOff.lockTarget && !afterOff.hasMarker, afterOff);

        // --- 6. Ranged fallback: explicit aim still fires with no lock ---
        const fallback = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.playerProjectiles.forEach((pr) => pr.mesh.dispose()); pm.playerProjectiles = [];
            pm.rangedCooldown = 0;
            pm.rangedAttack(pm.player.position.add(new BABYLON.Vector3(6, 1.3, 0)));
            return { projectiles: pm.playerProjectiles.length, locked: !!pm.lockTarget };
        });
        console.log('[6] ranged fallback', fallback);
        check('an explicitly aimed ranged attack fires with no lock active',
            fallback.projectiles >= 1 && !fallback.locked, fallback);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — melee combos chain to a finisher and lock-on drives ranged targeting.'
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
