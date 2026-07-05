/*
 * Shielder enemy test
 * -------------------
 * Verifies en_shielder + PlayMode.blocksHit:
 *   - registers with ShielderScript, isEnemy, a `flanked` output,
 *   - blocksHit() blocks an attacker in the frontal guard arc and lets a
 *     rear attacker through (firing `flanked`),
 *   - a frontal melee swing does NO damage (clangs); a swing from behind
 *     lands,
 *   - the shield turns SLOWLY toward the player (eases, does not snap),
 *   - enough rear hits defeat it,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7131 });
    try {
        await h.start();
        await h.waitForReady(['en_shielder', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            pm.playerLevel = 1;   // clean melee damage (1)
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const s = window.app.findWorldObject('en_shielder').createInstance();
            s.position = new BABYLON.Vector3(300, 1, 300);
            return { script: s.script.constructor.name, isEnemy: s.isEnemy === true,
                out: s.script.outputs.some((o) => o.id === 'flanked'),
                hasBlocks: typeof s.script.blocksHit === 'function' };
        });
        console.log('\n[1] registration', reg);
        check('en_shielder registers with ShielderScript, isEnemy, blocksHit + flanked',
            reg.script === 'ShielderScript' && reg.isEnemy && reg.out && reg.hasBlocks, reg);

        // --- 2. blocksHit: front blocked, rear passes (fires flanked) ---
        const guard = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const s = app.findWorldObject('en_shielder').createInstance();
            s.position = new BABYLON.Vector3(40, 1, 40);
            s.params = { guard: 'wide' };
            s.script._facing = 0;   // shield faces +z
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(40, 1, 44);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            s.wires = [{ event: 'flanked', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__S = { s, cnt };
            const front = s.script.blocksHit(new BABYLON.Vector3(40, 1, 45));   // +z -> front
            const rear = s.script.blocksHit(new BABYLON.Vector3(40, 1, 35));    // -z -> behind
            return { front, rear, flankedCount: cnt.script.count };
        });
        console.log('[2] guard', guard);
        check('a frontal attacker is blocked; a rear attacker gets through (fires flanked)',
            guard.front === true && guard.rear === false && guard.flankedCount === 1, guard);

        // --- 3. Melee: frontal swing clangs, rear swing lands ---
        const melee = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const s = app.findWorldObject('en_shielder').createInstance();
            s.position = pm.player.position.add(new BABYLON.Vector3(0, 0, 0));
            s.params = { toughness: 5, guard: 'wide' };
            s.script._wasPlay = null; s.script.update(true, pm);   // init hp
            s.position.copyFrom(pm.player.position.add(new BABYLON.Vector3(0, 0, 2)));
            // Shield faces the player (-z from the shield): frontal.
            s.script._facing = Math.PI;   // faces -z (toward the player at -z)
            const hp0 = s.hp;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(s.position);
            const afterFront = s.hp;
            // Now flip the shield to face AWAY (+z): the player's hit is from behind.
            s.script._facing = 0;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(s.position);
            const afterRear = s.hp;
            return { hp0, blockedFront: afterFront === hp0, landedRear: afterRear < afterFront };
        });
        console.log('[3] melee', melee);
        check('a frontal melee swing is blocked (no damage), a rear swing lands',
            melee.hp0 === 5 && melee.blockedFront && melee.landedRear, melee);
        await h.screenshot('shielder');

        // --- 4. The shield turns slowly (eases, not instant) ---
        const turn = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, s = window.__S.s;
            s.script._facing = 0;
            // Player straight behind (-z, yaw PI): a snap would jump _facing to PI.
            pm.player.position.copyFrom(s.position.add(new BABYLON.Vector3(0, 0, -8)));
            s.script.update(true, pm);
            const afterOne = Math.abs(s.script._facing);
            for (let i = 0; i < 30; i++) s.script.update(true, pm);
            const afterMany = Math.abs(s.script._facing);
            return { afterOne, afterMany };
        });
        console.log('[4] turn', turn);
        check('the shield turns slowly toward the player (small step, then more)',
            turn.afterOne > 0 && turn.afterOne < 0.1 && turn.afterMany > turn.afterOne, turn);

        // --- 5. Enough rear hits defeat it ---
        const kill = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, wo = app.findWorldObject('en_shielder');
            const s = window.__S.s;
            s.script._wasPlay = null; s.script.update(true, pm);
            const before = wo.instances.filter(Boolean).length;
            pm.player.position.copyFrom(s.position.add(new BABYLON.Vector3(0, 0, -1.4)));
            for (let i = 0; i < 12 && !s.defeated; i++) {
                s.script._facing = 0;   // keep the shield facing away from the player
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(s.position);
            }
            return { defeated: s.defeated, gone: wo.instances.filter(Boolean).length < before };
        });
        console.log('[5] kill', kill);
        check('enough rear hits defeat the shielder', kill.defeated && kill.gone, kill);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the shielder', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the guard holds the front; get behind it to strike.'
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
