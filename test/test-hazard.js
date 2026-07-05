/*
 * Hazard damage-zone test
 * -----------------------
 * Verifies l_hazard:
 *   - registers with HazardScript + a `hurt` output,
 *   - standing in it drains HP on its interval (not every frame), firing
 *     `hurt` when damage lands,
 *   - stepping OUT stops the damage,
 *   - dodge i-frames roll you through unharmed,
 *   - enough ticks at 0 HP trigger the deferred respawn (to the checkpoint
 *     if one is set),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7117 });
    try {
        await h.start();
        await h.waitForReady(['l_hazard', 'l_counter', 'l_checkpoint']);
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
            const z = window.app.findWorldObject('l_hazard').createInstance();
            z.position = new BABYLON.Vector3(300, 2, 300);
            return { script: z.script.constructor.name, isHazard: z.isHazard === true,
                out: z.script.outputs.some((o) => o.id === 'hurt') };
        });
        console.log('\n[1] registration', reg);
        check('l_hazard registers with HazardScript, isHazard, and a hurt output',
            reg.script === 'HazardScript' && reg.isHazard && reg.out, reg);

        // --- 2. Standing in it drains HP on interval + fires hurt ---
        const bled = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const z = app.findWorldObject('l_hazard').createInstance();
            z.position = new BABYLON.Vector3(20, 1, 5);
            z.params = { damage: 2, interval: 30 };
            z.computeWorldMatrix(true);
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(20, 1, 8);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            z.wires = [{ event: 'hurt', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__Z = { z, cnt };
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 0;
            pm.player.position.copyFrom(z.position);
            let ticks = 0;
            // Run 90 frames (~3 intervals). Clear the player's own hurtCooldown
            // between so the hazard interval (not the 15f i-frame) sets pace.
            for (let f = 0; f < 90; f++) {
                if (f % 30 === 0) pm.hurtCooldown = 0;   // let each hazard tick land
                z.script.update(true, pm);
            }
            return { hp: pm.playerHp, hurts: cnt.script.count };
        });
        console.log('[2] bleed', bled);
        check('standing in the hazard drains HP on its interval and fires hurt',
            bled.hp < 100 && bled.hp >= 90 && bled.hurts >= 2, bled);

        // --- 3. Stepping out stops the damage ---
        const out = await h.evaluate(() => {
            const pm = window.app.activeMode, z = window.__Z.z;
            pm.player.position.copyFrom(new BABYLON.Vector3(60, 1, 60));   // far away
            pm.hurtCooldown = 0; z.script._cool = 0;
            const hp0 = pm.playerHp;
            for (let f = 0; f < 60; f++) { pm.hurtCooldown = 0; z.script.update(true, pm); }
            return { unchanged: pm.playerHp === hp0 };
        });
        console.log('[3] out', out);
        check('leaving the hazard stops the damage', out.unchanged, out);

        // --- 4. Dodge i-frames roll through unharmed ---
        const dodged = await h.evaluate(() => {
            const pm = window.app.activeMode, z = window.__Z.z;
            pm.player.position.copyFrom(z.position);
            pm.hurtCooldown = 0; z.script._cool = 0;
            pm.dodgeFrames = 200;   // rolling the whole time
            const hp0 = pm.playerHp;
            for (let f = 0; f < 60; f++) { pm.hurtCooldown = 0; z.script.update(true, pm); }
            pm.dodgeFrames = 0;
            return { unhurt: pm.playerHp === hp0 };
        });
        console.log('[4] dodge', dodged);
        check('dodge i-frames roll through the hazard unharmed', dodged.unhurt, dodged);

        // --- 5. Enough damage triggers the deferred respawn to a checkpoint ---
        const died = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, z = window.__Z.z;
            // Set a checkpoint so respawn has a destination we can check.
            const cp = app.findWorldObject('l_checkpoint').createInstance();
            cp.position = new BABYLON.Vector3(45, 1, 45);
            pm.player.position.copyFrom(cp.position); cp.script.update(true, pm);
            const spawn = pm.spawnPoint.clone();
            // Back into the hazard, low HP, and let it kill us.
            pm.player.position.copyFrom(z.position);
            pm.playerHp = 3; pm.hurtCooldown = 0; pm.dodgeFrames = 0; pm._pendingRespawn = false;
            for (let f = 0; f < 120 && !pm._pendingRespawn; f++) { pm.hurtCooldown = 0; z.script._cool = 0; z.script.update(true, pm); }
            const pending = pm._pendingRespawn;
            if (pending) pm.respawn();   // run the deferred respawn
            return { pending, atCheckpoint: BABYLON.Vector3.Distance(pm.player.position, spawn) < 2 };
        });
        console.log('[5] death', died);
        check('a hazard can kill the player and respawn them at the checkpoint',
            died.pending && died.atCheckpoint, died);
        await h.screenshot('hazard');

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during hazards', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the lava bites, the roll saves you, and death sends you back.'
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
