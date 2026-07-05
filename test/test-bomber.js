/*
 * Bomber (kamikaze) enemy test
 * ----------------------------
 * Verifies en_bomber:
 *   - registers with BomberScript, isEnemy, a `detonated` output,
 *   - it CHASES the player (moves toward them),
 *   - on contact it DETONATES, dealing blast damage to a nearby player
 *     (fires `detonated`) and then hides (defeated),
 *   - killing it at RANGE detonates it harmlessly (far player takes nothing),
 *   - a dodge (i-frames) survives the blast unharmed,
 *   - a play reset re-arms it,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7142 });
    try {
        await h.start();
        await h.waitForReady(['en_bomber', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000; pm.playerHp = 10000; pm.playerLevel = 1;
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const b = window.app.findWorldObject('en_bomber').createInstance();
            b.position = new BABYLON.Vector3(300, 1, 300);
            return { script: b.script.constructor.name, isEnemy: b.isEnemy === true,
                out: b.script.outputs.some((o) => o.id === 'detonated') };
        });
        console.log('\n[1] registration', reg);
        check('en_bomber registers with BomberScript, isEnemy, a detonated output',
            reg.script === 'BomberScript' && reg.isEnemy && reg.out, reg);

        // --- 2. It chases the player ---
        const chase = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const b = app.findWorldObject('en_bomber').createInstance();
            b.position = new BABYLON.Vector3(50, 1, 40);
            b.params = { toughness: 1, speed: 9, blast: 3, damage: 3 };
            b.script._wasPlay = null; b.script.update(true, pm);
            pm.player.position.copyFrom(new BABYLON.Vector3(50, 1, 50));   // 10 ahead in z
            const d0 = BABYLON.Vector3.Distance(b.position, pm.player.position);
            for (let i = 0; i < 20; i++) b.script.update(true, pm);
            const d1 = BABYLON.Vector3.Distance(b.position, pm.player.position);
            window.__B = { b };
            return { d0, d1, closed: d1 < d0 - 1 };
        });
        console.log('[2] chase', chase);
        check('the bomber chases the player (closes distance)', chase.closed, chase);
        await h.screenshot('bomber');

        // --- 3. Contact detonates + damages a nearby player, then hides ---
        const contact = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const b = app.findWorldObject('en_bomber').createInstance();
            b.position = new BABYLON.Vector3(60, 1, 60);
            b.params = { toughness: 1, speed: 0, blast: 3, damage: 3 };
            b.script._wasPlay = null; b.script.update(true, pm);
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(60, 3, 64);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            b.wires = [{ event: 'detonated', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0; pm.dodgeFrames = 0; pm.blocking = false;
            pm.player.position.copyFrom(new BABYLON.Vector3(60, 1, 60.5));   // right on top
            const hp0 = pm.playerHp;
            b.script.update(true, pm);   // contact -> detonate
            return { hurt: hp0 - pm.playerHp, detonated: cnt.script.count,
                hidden: b.isVisible === false && b.defeated === true };
        });
        console.log('[3] contact', contact);
        check('contact detonates: a nearby player takes blast damage, then it hides (fires detonated)',
            contact.hurt >= 3 && contact.detonated === 1 && contact.hidden, contact);

        // --- 4. Killing it at range is harmless ---
        const ranged = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, wo = app.findWorldObject('en_bomber');
            const b = wo.createInstance();
            b.position = new BABYLON.Vector3(70, 1, 70);
            b.params = { toughness: 1, speed: 0, blast: 3, damage: 3 };
            b.script._wasPlay = null; b.script.update(true, pm);
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.player.position.copyFrom(new BABYLON.Vector3(90, 1, 90));   // far away
            const hp0 = pm.playerHp;
            pm.defeatEnemy(b, wo);   // pop it at range via the real defeat path
            return { blownSafely: b.defeated === true && pm.playerHp === hp0 };
        });
        console.log('[4] ranged', ranged);
        check('killing the bomber at range detonates it harmlessly', ranged.blownSafely, ranged);

        // --- 5. A dodge survives the blast ---
        const dodge = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const b = app.findWorldObject('en_bomber').createInstance();
            b.position = new BABYLON.Vector3(80, 1, 80);
            b.params = { toughness: 1, speed: 0, blast: 3, damage: 3 };
            b.script._wasPlay = null; b.script.update(true, pm);
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.dodgeFrames = 300;   // rolling through the blast
            pm.player.position.copyFrom(new BABYLON.Vector3(80, 1, 80.5));
            const hp0 = pm.playerHp;
            b.script.update(true, pm);
            pm.dodgeFrames = 0;
            return { unharmed: pm.playerHp === hp0, detonated: b.defeated };
        });
        console.log('[5] dodge', dodge);
        check('a dodge roll survives the blast unharmed', dodge.unharmed && dodge.detonated, dodge);

        // --- 6. Play reset re-arms it ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, b = window.__B.b;
            b.script._detonate(pm);   // blow it
            const wasBlown = b.defeated === true;
            b.script.onPlayReset(pm);
            return { wasBlown, rearmed: b.defeated === false && b.isVisible === true && b.hp >= 1 };
        });
        console.log('[6] reset', reset);
        check('a play reset re-arms the bomber', reset.wasBlown && reset.rearmed, reset);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the bomber', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — it rushes in to blow up; pop it before it reaches you.'
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
