/*
 * Healing-zone test
 * -----------------
 * Verifies l_regen:
 *   - registers with RegenScript + healed/full outputs,
 *   - a hurt player standing inside is healed over time (and fires `healed`),
 *   - healing caps at playerMaxHp and fires `full` once,
 *   - a player OUTSIDE the zone is not healed,
 *   - an already-full player is not "healed" (no spurious events),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7136 });
    try {
        await h.start();
        await h.waitForReady(['l_regen', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const z = window.app.findWorldObject('l_regen').createInstance();
            z.position = new BABYLON.Vector3(300, 2, 300);
            return { script: z.script.constructor.name,
                healed: z.script.outputs.some((o) => o.id === 'healed'),
                full: z.script.outputs.some((o) => o.id === 'full') };
        });
        console.log('\n[1] registration', reg);
        check('l_regen registers with RegenScript, healed + full outputs',
            reg.script === 'RegenScript' && reg.healed && reg.full, reg);

        // Place a zone + wire healed/full to counters.
        await h.evaluate(() => {
            const app = window.app;
            const z = app.findWorldObject('l_regen').createInstance();
            z.position = new BABYLON.Vector3(60, 2, 60);
            z.params = { amount: 5, interval: 1 };   // fast heal for the test
            const healCnt = app.findWorldObject('l_counter').createInstance();
            healCnt.position = new BABYLON.Vector3(60, 4, 64);
            healCnt.params.threshold = 999; healCnt.params.autoReset = 'no';
            const fullCnt = app.findWorldObject('l_counter').createInstance();
            fullCnt.position = new BABYLON.Vector3(64, 4, 64);
            fullCnt.params.threshold = 999; fullCnt.params.autoReset = 'no';
            z.wires = [
                { event: 'healed', toWo: 'l_counter', toId: healCnt.worldId, action: 'increment' },
                { event: 'full',   toWo: 'l_counter', toId: fullCnt.worldId, action: 'increment' },
            ];
            window.__Z = { z, healCnt, fullCnt };
        });

        // --- 2. Hurt player inside is healed over time ---
        const healed = await h.evaluate(() => {
            const pm = window.app.activeMode, Z = window.__Z;
            pm.playerMaxHp = 100; pm.playerHp = 40;
            pm.player.position.copyFrom(new BABYLON.Vector3(60, 2, 60));
            const hp0 = pm.playerHp;
            for (let i = 0; i < 60; i++) Z.z.script.update(true, pm);
            return { hp0, hp1: pm.playerHp, gained: pm.playerHp - hp0, healEvents: Z.healCnt.script.count };
        });
        console.log('[2] heal', healed);
        check('a hurt player inside the zone is healed over time (fires healed)',
            healed.gained > 0 && healed.hp1 > healed.hp0 && healed.healEvents >= 1, healed);
        await h.screenshot('regen');

        // --- 3. Healing caps at max and fires full once ---
        const capped = await h.evaluate(() => {
            const pm = window.app.activeMode, Z = window.__Z;
            for (let i = 0; i < 200; i++) Z.z.script.update(true, pm);   // run to full
            const overheal = pm.playerHp;
            for (let i = 0; i < 60; i++) Z.z.script.update(true, pm);   // keep standing
            return { hp: pm.playerHp, max: pm.playerMaxHp,
                capped: pm.playerHp === pm.playerMaxHp, fullEvents: Z.fullCnt.script.count };
        });
        console.log('[3] cap', capped);
        check('healing caps at playerMaxHp and fires full exactly once',
            capped.capped && capped.hp === capped.max && capped.fullEvents === 1, capped);

        // --- 4. Player outside the zone is not healed ---
        const outside = await h.evaluate(() => {
            const pm = window.app.activeMode, Z = window.__Z;
            pm.playerHp = 30;
            pm.player.position.copyFrom(new BABYLON.Vector3(80, 2, 80));   // far away
            const hp0 = pm.playerHp;
            for (let i = 0; i < 60; i++) Z.z.script.update(true, pm);
            return { hp0, hp1: pm.playerHp, same: pm.playerHp === hp0 };
        });
        console.log('[4] outside', outside);
        check('a player outside the zone is not healed', outside.same, outside);

        // --- 5. Already-full player: no spurious heal events ---
        const alreadyFull = await h.evaluate(() => {
            const pm = window.app.activeMode, Z = window.__Z;
            pm.playerHp = pm.playerMaxHp;
            pm.player.position.copyFrom(new BABYLON.Vector3(60, 2, 60));
            const before = Z.healCnt.script.count;
            for (let i = 0; i < 60; i++) Z.z.script.update(true, pm);
            return { extra: Z.healCnt.script.count - before };
        });
        console.log('[5] alreadyFull', alreadyFull);
        check('an already-full player triggers no heal events', alreadyFull.extra === 0, alreadyFull);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the regen zone', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — stand in the field and your health climbs back up.'
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
