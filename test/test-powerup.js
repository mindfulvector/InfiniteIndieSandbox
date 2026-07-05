/*
 * Power-up pickup test
 * --------------------
 * Verifies pk_powerup + the PlayMode buff hooks:
 *   - registers with PowerUpScript + a `collected` output,
 *   - a 'power' power-up: collecting it doubles melee damage for its
 *     duration, then the buff fades and damage returns to normal,
 *   - a 'shield' power-up: while active the player takes NO damage; after
 *     it fades, damage lands again,
 *   - the pickup hides on collect and comes back on a play reset (which
 *     also clears the buff),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7128 });
    try {
        await h.start();
        await h.waitForReady(['pk_powerup', 'en_blob', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerLevel = 1;   // no meleeBonus, clean damage math
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const u = window.app.findWorldObject('pk_powerup').createInstance();
            u.position = new BABYLON.Vector3(300, 2, 300);
            return { script: u.script.constructor.name,
                out: u.script.outputs.some((o) => o.id === 'collected') };
        });
        console.log('\n[1] registration', reg);
        check('pk_powerup registers with PowerUpScript and a collected output',
            reg.script === 'PowerUpScript' && reg.out, reg);

        // --- 2. Power: doubles melee damage, then fades ---
        const power = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const dummy = () => {
                const e = app.findWorldObject('en_blob').createInstance();
                e.position = pm.player.position.add(new BABYLON.Vector3(0, 0, 2));
                e.hp = 1000; return e;
            };
            const swing = (e) => {
                const hp0 = e.hp;
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(e.position);
                return hp0 - e.hp;
            };
            // Baseline melee (no buff): 1 damage at level 1.
            pm._powerKind = null; pm._powerTimer = 0;
            const base = swing(dummy());
            // Collect a power pickup.
            const u = app.findWorldObject('pk_powerup').createInstance();
            u.position = pm.player.position.add(new BABYLON.Vector3(0.2, 1, 0));
            u.params = { kind: 'power', duration: 8 };
            u.script.update(true, pm);   // walk-up collect
            const active = pm._powerKind === 'power' && pm._powerTimer > 0;
            const boosted = swing(dummy());
            // Expire it.
            pm._powerTimer = 1; pm.attackCooldown = 0; pm.rangedCooldown = 0;
            pm.update(1);   // decrement -> fade
            const faded = pm._powerKind === null;
            const afterFade = swing(dummy());
            return { base, active, boosted, faded, afterFade, hidden: u.isVisible === false };
        });
        console.log('[2] power', power);
        check('a power power-up doubles melee damage while active, then fades',
            power.base === 1 && power.active && power.boosted === 2 && power.faded && power.afterFade === 1,
            power);
        check('the power-up hides on collect', power.hidden, power);
        await h.screenshot('powerup');

        // --- 3. Shield: negates incoming damage while active ---
        const shield = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 0;
            const u = app.findWorldObject('pk_powerup').createInstance();
            u.position = pm.player.position.add(new BABYLON.Vector3(0.2, 1, 0));
            u.params = { kind: 'shield', duration: 8 };
            u.script.update(true, pm);
            const active = pm._powerKind === 'shield';
            // Hit while shielded: no damage.
            pm.hurtCooldown = 0; pm.damagePlayer(30);
            const whileShielded = pm.playerHp;
            // Expire and hit again: damage lands.
            pm._powerKind = null; pm._powerTimer = 0;
            pm.hurtCooldown = 0; pm.damagePlayer(30);
            const afterFade = pm.playerHp;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { active, whileShielded, afterFade };
        });
        console.log('[3] shield', shield);
        check('a shield power-up negates incoming damage, then damage lands after it fades',
            shield.active && shield.whileShielded === 100 && shield.afterFade === 70, shield);

        // --- 4. Play reset restores the pickup and clears the buff ---
        const reset = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const u = app.findWorldObject('pk_powerup').createInstance();
            u.position = pm.player.position.add(new BABYLON.Vector3(0.2, 1, 0));
            u.params = { kind: 'power', duration: 8 };
            u.script.update(true, pm);
            const collected = u.isVisible === false && pm._powerKind === 'power';
            pm.respawn();               // death clears the buff
            u.script.onPlayReset(pm);   // pickup comes back
            return { collected, buffCleared: pm._powerKind === null, back: u.isVisible === true };
        });
        console.log('[4] reset', reset);
        check('respawn clears the buff and a play reset restores the pickup',
            reset.collected && reset.buffCleared && reset.back, reset);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during power-ups', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — grab it to hit twice as hard or shrug off the hits.'
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
