/*
 * Mender (healer) enemy test
 * --------------------------
 * Verifies en_mender + the "kill the healer first" tactic:
 *   - registers with MenderScript, isEnemy, a `mended` output,
 *   - it heals the nearest WOUNDED ally over time (fires `mended`), capped
 *     at that ally's maxHp,
 *   - it never heals a full-HP ally, itself, or one out of range,
 *   - melee defeats the mender (drops from the world), and once it's gone
 *     the ally stops being healed,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7137 });
    try {
        await h.start();
        await h.waitForReady(['en_mender', 'en_charger', 'l_counter']);
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
            const m = window.app.findWorldObject('en_mender').createInstance();
            m.position = new BABYLON.Vector3(300, 1, 300);
            return { script: m.script.constructor.name, isEnemy: m.isEnemy === true,
                out: m.script.outputs.some((o) => o.id === 'mended') };
        });
        console.log('\n[1] registration', reg);
        check('en_mender registers with MenderScript, isEnemy, a mended output',
            reg.script === 'MenderScript' && reg.isEnemy && reg.out, reg);

        // Place a mender + a wounded charger ally nearby, wired mended->counter.
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const m = app.findWorldObject('en_mender').createInstance();
            m.position = new BABYLON.Vector3(60, 1, 60);
            m.params = { toughness: 3, range: 10, amount: 1, interval: 1 };
            m.script._wasPlay = null; m.script.update(true, pm);
            const ally = app.findWorldObject('en_charger').createInstance();
            ally.position = new BABYLON.Vector3(63, 1, 60);
            ally.script._wasPlay = null; ally.script.update(true, pm);
            ally.hp = 1;   // wounded (maxHp 3)
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(60, 3, 64);
            cnt.params.threshold = 999; cnt.params.autoReset = 'no';
            m.wires = [{ event: 'mended', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__M = { m, ally, cnt };
        });

        // --- 2. Heals the wounded ally over time, capped at its maxHp ---
        const healed = await h.evaluate(() => {
            const pm = window.app.activeMode, M = window.__M;
            const hp0 = M.ally.hp;
            for (let i = 0; i < 120; i++) M.m.script.update(true, pm);
            return { hp0, hp1: M.ally.hp, max: M.ally.maxHp,
                mendEvents: M.cnt.script.count, capped: M.ally.hp <= M.ally.maxHp };
        });
        console.log('[2] heal', healed);
        check('the mender heals its wounded ally over time (fires mended), capped at maxHp',
            healed.hp1 > healed.hp0 && healed.hp1 === healed.max && healed.mendEvents >= 1 && healed.capped,
            healed);
        await h.screenshot('mender');

        // --- 3. Never heals a full ally / itself / out of range ---
        const restraint = await h.evaluate(() => {
            const pm = window.app.activeMode, M = window.__M;
            M.ally.hp = M.ally.maxHp;            // full -> no target
            M.m.hp = 1;                          // mender itself hurt (must not self-heal)
            const before = M.cnt.script.count, selfBefore = M.m.hp;
            for (let i = 0; i < 60; i++) M.m.script.update(true, pm);
            const noneClose = M.cnt.script.count === before && M.m.hp === selfBefore;
            // Move the ally out of range and wound it: still no heal.
            M.ally.position.x = 90; M.ally.hp = 1;
            const before2 = M.cnt.script.count;
            for (let i = 0; i < 60; i++) M.m.script.update(true, pm);
            const outOfRange = M.cnt.script.count === before2;
            M.ally.position.x = 63;
            return { noneClose, outOfRange };
        });
        console.log('[3] restraint', restraint);
        check('the mender never heals a full ally, itself, or one out of range',
            restraint.noneClose && restraint.outOfRange, restraint);

        // --- 4. Melee defeats the mender; the ally then stops being healed ---
        const kill = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, wo = app.findWorldObject('en_mender');
            const M = window.__M;
            M.ally.hp = 1;   // wounded again
            const before = wo.instances.filter(Boolean).length;
            pm.player.position.copyFrom(M.m.position.add(new BABYLON.Vector3(0, 0, -1.2)));
            for (let i = 0; i < 12 && !M.m.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(M.m.position);
            }
            const gone = wo.instances.filter(Boolean).length < before;
            // With the mender gone, the ally no longer heals.
            const allyHp = M.ally.hp;
            const cntBefore = M.cnt.script.count;
            for (let i = 0; i < 60; i++) if (M.m.script && !M.m.defeated) M.m.script.update(true, pm);
            return { defeated: M.m.defeated, gone, noMoreHeals: M.cnt.script.count === cntBefore, allyHp };
        });
        console.log('[4] kill', kill);
        check('melee defeats the mender and the ally stops being healed',
            kill.defeated && kill.gone && kill.noMoreHeals, kill);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the mender', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — it keeps the pack alive, so take it down first.'
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
