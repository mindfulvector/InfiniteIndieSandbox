/*
 * Charger enemy test
 * ------------------
 * Verifies en_charger:
 *   - registers with ChargerScript, isEnemy, a `charged` output,
 *   - it idles out of range, winds up when the player comes within range,
 *     then DASHES along the locked line (moving a real distance) and fires
 *     `charged`,
 *   - the charge hurts the player on contact,
 *   - a DODGE (i-frames) passes through the charge unharmed,
 *   - melee defeats it (drops out of the world, isEnemy plumbing),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7126 });
    try {
        await h.start();
        await h.waitForReady(['en_charger', 'l_counter']);
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

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const c = window.app.findWorldObject('en_charger').createInstance();
            c.position = new BABYLON.Vector3(300, 1, 300);
            return { script: c.script.constructor.name, isEnemy: c.isEnemy === true,
                out: c.script.outputs.some((o) => o.id === 'charged') };
        });
        console.log('\n[1] registration', reg);
        check('en_charger registers with ChargerScript, isEnemy, a charged output',
            reg.script === 'ChargerScript' && reg.isEnemy && reg.out, reg);

        // --- 2. Idle out of range; wind up + charge when the player is near ---
        const charge = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const c = app.findWorldObject('en_charger').createInstance();
            c.position = new BABYLON.Vector3(40, 1, 40);
            c.params = { toughness: 5, range: 10, speed: 12 };
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(40, 1, 44);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            c.wires = [{ event: 'charged', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            c.script._wasPlay = null; c.script.update(true, pm);
            window.__C = { c, cnt };

            // Player far away: charger idles.
            pm.player.position.copyFrom(new BABYLON.Vector3(40 + 30, 1, 40));
            for (let i = 0; i < 10; i++) c.script.update(true, pm);
            const idled = c.script._state === 'idle';

            // Player close: it winds up (~40f) then charges.
            pm.player.position.copyFrom(new BABYLON.Vector3(43, 1, 40));
            const startX = c.position.x;
            let states = new Set();
            for (let i = 0; i < 80; i++) { c.script.update(true, pm); states.add(c.script._state); }
            const moved = Math.abs(c.position.x - startX);
            return { idled, woundUp: states.has('windup'), charged: states.has('charge'),
                moved, chargedCount: cnt.script.count };
        });
        console.log('[2] charge', charge);
        check('the charger idles far away, then winds up and dashes when the player is near',
            charge.idled && charge.woundUp && charge.charged && charge.moved > 1 && charge.chargedCount >= 1,
            charge);
        await h.screenshot('charger');

        // --- 3. The charge hurts the player on contact ---
        const hurt = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const c = app.findWorldObject('en_charger').createInstance();
            c.position = new BABYLON.Vector3(60, 1, 60);
            c.params = { range: 20, speed: 12 };
            c.script._wasPlay = null; c.script.update(true, pm);
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 0;
            pm.player.position.copyFrom(new BABYLON.Vector3(62, 1, 60));   // right in the path
            const hp0 = pm.playerHp;
            for (let i = 0; i < 120 && pm.playerHp === hp0; i++) {
                pm.hurtCooldown = 0; c.script.update(true, pm);
                // Keep the player in the charger's path.
                pm.player.position.copyFrom(new BABYLON.Vector3(c.position.x + 0.5, 1, c.position.z));
            }
            const took = pm.playerHp < hp0;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { took };
        });
        console.log('[3] contact', hurt);
        check('the charge damages the player on contact', hurt.took, hurt);

        // --- 4. A dodge passes through the charge unharmed ---
        const dodged = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const c = app.findWorldObject('en_charger').createInstance();
            c.position = new BABYLON.Vector3(80, 1, 80);
            c.params = { range: 20, speed: 12 };
            c.script._wasPlay = null; c.script.update(true, pm);
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 300;   // rolling the whole time
            pm.player.position.copyFrom(new BABYLON.Vector3(82, 1, 80));
            const hp0 = pm.playerHp;
            for (let i = 0; i < 120; i++) {
                pm.hurtCooldown = 0; c.script.update(true, pm);
                pm.player.position.copyFrom(new BABYLON.Vector3(c.position.x + 0.5, 1, c.position.z));
            }
            pm.dodgeFrames = 0;
            const unharmed = pm.playerHp === hp0;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { unharmed };
        });
        console.log('[4] dodge', dodged);
        check('a dodge (i-frames) passes through the charge unharmed', dodged.unharmed, dodged);

        // --- 5. Melee defeats it ---
        const killed = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, wo = app.findWorldObject('en_charger');
            const c = window.__C.c;
            const before = wo.instances.filter(Boolean).length;
            pm.player.position.copyFrom(c.position.add(new BABYLON.Vector3(0, 0, -1.4)));
            for (let i = 0; i < 12 && !c.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(c.position);
            }
            return { defeated: c.defeated, gone: wo.instances.filter(Boolean).length < before };
        });
        console.log('[5] kill', killed);
        check('melee defeats the charger', killed.defeated && killed.gone, killed);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the charger', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — it winds up, it dashes, and a roll slips right past it.'
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
