/*
 * Spitter (artillery) enemy test
 * ------------------------------
 * Verifies en_spitter + its arcing shots:
 *   - registers with SpitterScript, isEnemy, lobbed/impact outputs,
 *   - it LOBS a shot at the player when in range (fires `lobbed`), and the
 *     shot ARCS (rises above the straight line to its target),
 *   - a shot that lands on the player splash-damages them (fires `impact`),
 *   - moving away before it lands dodges it (no damage) — cover you can't hide,
 *   - melee defeats it and cleans up its in-flight shots,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7147 });
    try {
        await h.start();
        await h.waitForReady(['en_spitter', 'l_counter']);
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
            const s = window.app.findWorldObject('en_spitter').createInstance();
            s.position = new BABYLON.Vector3(300, 1, 300);
            return { script: s.script.constructor.name, isEnemy: s.isEnemy === true,
                lobbed: s.script.outputs.some((o) => o.id === 'lobbed'),
                impact: s.script.outputs.some((o) => o.id === 'impact') };
        });
        console.log('\n[1] registration', reg);
        check('en_spitter registers with SpitterScript, isEnemy, lobbed + impact outputs',
            reg.script === 'SpitterScript' && reg.isEnemy && reg.lobbed && reg.impact, reg);

        // --- 2. It lobs an arcing shot at the player in range ---
        const lob = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const s = app.findWorldObject('en_spitter').createInstance();
            s.position = new BABYLON.Vector3(50, 1, 40);
            s.params = { toughness: 2, range: 16, cadence: 1, splash: 3, damage: 3 };
            s.script._wasPlay = null; s.script.update(true, pm);
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(50, 4, 44);
            cnt.params.threshold = 999; cnt.params.autoReset = 'no';
            s.wires = [{ event: 'lobbed', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            pm.player.position.copyFrom(new BABYLON.Vector3(50, 1, 50));   // 10 away, in range
            s.script._cool = 0;
            s.script.update(true, pm);   // fires a shot
            const fired = cnt.script.count >= 1 && s.script._shots.length >= 1;
            // Advance a few frames and check the shot rose above the straight
            // line between muzzle and target (an arc, not a laser).
            const shot = s.script._shots[0];
            const midU = () => {
                const u = 0.5;
                return shot.from.y + (shot.to.y - shot.from.y) * u;   // straight-line mid height
            };
            let peak = -99;
            for (let i = 0; i < 25; i++) { s.script.update(true, pm); if (shot.mesh) peak = Math.max(peak, shot.mesh.position.y); }
            window.__S = { s, cnt };
            return { fired, arced: peak > midU() + 1 };
        });
        console.log('[2] lob', lob);
        check('the spitter lobs a shot in range and it arcs above the straight line',
            lob.fired && lob.arced, lob);
        await h.screenshot('spitter');

        // --- 3. A shot landing on the player splash-damages them ---
        const hit = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const s = app.findWorldObject('en_spitter').createInstance();
            s.position = new BABYLON.Vector3(60, 1, 55);
            s.params = { toughness: 2, range: 20, cadence: 1, splash: 3, damage: 3 };
            s.script._wasPlay = null; s.script.update(true, pm);
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0; pm.dodgeFrames = 0; pm.blocking = false;
            pm.player.position.copyFrom(new BABYLON.Vector3(60, 1, 62));
            s.script._cool = 0; s.script.update(true, pm);   // lob at current pos
            const hp0 = pm.playerHp;
            // Stand still: the shot lands on us.
            for (let i = 0; i < 60 && s.script._shots.length; i++) { pm.hurtCooldown = 0; s.script.update(true, pm); }
            return { hurt: hp0 - pm.playerHp };
        });
        console.log('[3] impact', hit);
        check('a shot that lands on the player splash-damages them', hit.hurt >= 3, hit);

        // --- 4. Moving away dodges the shot ---
        const dodge = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const s = app.findWorldObject('en_spitter').createInstance();
            s.position = new BABYLON.Vector3(70, 1, 65);
            s.params = { toughness: 2, range: 20, cadence: 1, splash: 3, damage: 3 };
            s.script._wasPlay = null; s.script.update(true, pm);
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0; pm.dodgeFrames = 0;
            pm.player.position.copyFrom(new BABYLON.Vector3(70, 1, 72));
            s.script._cool = 0; s.script.update(true, pm);   // shot aimed at (70,72)
            const hp0 = pm.playerHp;
            // Run far away before it lands: the shot hits empty ground.
            pm.player.position.copyFrom(new BABYLON.Vector3(120, 1, 120));
            for (let i = 0; i < 60 && s.script._shots.length; i++) { pm.hurtCooldown = 0; s.script.update(true, pm); }
            return { unharmed: pm.playerHp === hp0 };
        });
        console.log('[4] dodge', dodge);
        check('moving away before the shot lands dodges it (no cover needed)', dodge.unharmed, dodge);

        // --- 5. Melee defeats it + cleans up shots ---
        const kill = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, wo = app.findWorldObject('en_spitter');
            const s = window.__S.s;
            const before = wo.instances.filter(Boolean).length;
            pm.player.position.copyFrom(s.position.add(new BABYLON.Vector3(0, 0, -1.2)));
            for (let i = 0; i < 12 && !s.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(s.position);
            }
            return { defeated: s.defeated, gone: wo.instances.filter(Boolean).length < before,
                shotsCleared: s.script._shots.length === 0 };
        });
        console.log('[5] kill', kill);
        check('melee defeats the spitter and clears its in-flight shots',
            kill.defeated && kill.gone && kill.shotsCleared, kill);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the spitter', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — it rains shots over the wall; keep moving to survive.'
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
