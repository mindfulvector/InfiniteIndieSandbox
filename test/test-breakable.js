/*
 * Breakable block test
 * --------------------
 * Verifies t_breakable:
 *   - registers with BreakableScript, isEnemy + isBreakable, a broken output,
 *   - it's a SOLID wall until broken (checkCollisions true),
 *   - melee attacks whittle its hp and, at 0, break it: intangible + a
 *     `broken` wiring edge (script-owned defeat, not disposed),
 *   - a wired `break` force-smashes it,
 *   - lock-on / auto-aim IGNORE it (not a target),
 *   - a play reset rebuilds it (hp restored, solid again),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7123 });
    try {
        await h.start();
        await h.waitForReady(['t_breakable', 'l_counter']);
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
            const b = window.app.findWorldObject('t_breakable').createInstance();
            b.position = new BABYLON.Vector3(300, 2, 300);
            b.script._wasPlay = null; b.script.update(true, window.app.activeMode);
            return { script: b.script.constructor.name, isEnemy: b.isEnemy === true,
                isBreakable: b.isBreakable === true, solid: b.checkCollisions === true,
                out: b.script.outputs.some((o) => o.id === 'broken') };
        });
        console.log('\n[1] registration', reg);
        check('t_breakable registers: BreakableScript, isEnemy+isBreakable, solid, broken output',
            reg.script === 'BreakableScript' && reg.isEnemy && reg.isBreakable && reg.solid && reg.out, reg);

        // --- 2. Melee whittles hp then breaks it ---
        const smashed = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const b = app.findWorldObject('t_breakable').createInstance();
            b.position = new BABYLON.Vector3(pm.player.position.x, pm.player.position.y, pm.player.position.z + 2);
            b.params = { toughness: 3, loot: 5 };
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = b.position.add(new BABYLON.Vector3(0, 0, 2));
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            b.wires = [{ event: 'broken', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            b.script._wasPlay = null; b.script.update(true, pm);   // init hp from toughness
            window.__B = { b, cnt };
            const hp0 = b.hp;
            // One swing.
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(b.position);
            const hp1 = b.hp;
            // Finish it off.
            for (let i = 0; i < 6 && !b.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(b.position);
            }
            return { hp0, dropped: hp0 - hp1 > 0, broken: b.defeated,
                intangible: b.checkCollisions === false, brokenCount: cnt.script.count };
        });
        console.log('[2] smash', smashed);
        check('melee whittles the block\'s hp (toughness respected)',
            smashed.hp0 === 3 && smashed.dropped, smashed);
        check('breaking it makes it intangible and fires `broken` (not disposed)',
            smashed.broken && smashed.intangible && smashed.brokenCount === 1, smashed);
        await h.screenshot('breakable');

        // --- 3. Lock-on / auto-aim ignore breakables ---
        const target = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            // Fresh intact breakable right in front, no enemies anywhere.
            const b = app.findWorldObject('t_breakable').createInstance();
            b.position = pm.player.position.add(new BABYLON.Vector3(0, 0, 3));
            b.script._wasPlay = null; b.script.update(true, pm);
            const nearest = pm.nearestEnemyPos ? pm.nearestEnemyPos(60) : null;
            return { noTarget: nearest == null };
        });
        console.log('[3] targeting', target);
        check('lock-on / auto-aim ignore a breakable (not a combat target)', target.noTarget, target);

        // --- 4. A wired break force-smashes it ---
        const forced = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const b = app.findWorldObject('t_breakable').createInstance();
            b.position = new BABYLON.Vector3(60, 2, 60);
            b.script._wasPlay = null; b.script.update(true, pm);
            b.script.onInput('break');
            b.script.update(true, pm);
            return { broken: b.defeated, intangible: b.checkCollisions === false };
        });
        console.log('[4] force', forced);
        check('a wired break force-smashes the block', forced.broken && forced.intangible, forced);

        // --- 5. Play reset rebuilds it ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, B = window.__B;
            B.b.script.onPlayReset(pm);
            return { rebuilt: !B.b.defeated && B.b.checkCollisions === true && B.b.hp === B.b.maxHp };
        });
        console.log('[5] reset', reset);
        check('a play reset rebuilds the block (solid, full hp)', reset.rebuilt, reset);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during breakable', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the wall holds, then shatters, then rebuilds for the next run.'
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
