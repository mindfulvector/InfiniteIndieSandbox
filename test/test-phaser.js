/*
 * Phaser (phasing ghost) enemy test
 * ---------------------------------
 * Verifies en_phaser + the "strike it while solid" timing dynamic:
 *   - registers with PhaserScript, isEnemy, blocksHit, phased/solidified,
 *   - it CYCLES solid -> phased -> solid on its timers (visibility + events),
 *   - blocksHit is FALSE while solid, TRUE while phased (invulnerable),
 *   - a melee hit while PHASED does no damage; while SOLID it lands,
 *   - it contact-damages the player only while solid,
 *   - a solid-window melee kill drops it from the world,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7152 });
    try {
        await h.start();
        await h.waitForReady(['en_phaser', 'l_counter']);
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
            const p = window.app.findWorldObject('en_phaser').createInstance();
            p.position = new BABYLON.Vector3(300, 1, 300);
            return { script: p.script.constructor.name, isEnemy: p.isEnemy === true,
                hasBlocks: typeof p.script.blocksHit === 'function',
                outs: p.script.outputs.map((o) => o.id).sort().join(',') };
        });
        console.log('\n[1] registration', reg);
        check('en_phaser registers with PhaserScript, isEnemy, blocksHit + phased/solidified',
            reg.script === 'PhaserScript' && reg.isEnemy && reg.hasBlocks && reg.outs === 'phased,solidified',
            reg);

        // Build one with fast cycles, wired to a phase counter.
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const p = app.findWorldObject('en_phaser').createInstance();
            p.position = new BABYLON.Vector3(50, 1, 50);
            p.params = { toughness: 3, speed: 0, solidTime: 5, phaseTime: 5 };
            p.script._wasPlay = null; p.script.update(true, pm);
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(50, 3, 54);
            cnt.params.threshold = 999; cnt.params.autoReset = 'no';
            p.wires = [{ event: 'phased', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            window.__P = { p, cnt };
        });

        // --- 2. It cycles solid -> phased -> solid, blocksHit tracks the phase ---
        const cycle = await h.evaluate(() => {
            const pm = window.app.activeMode, p = window.__P.p;
            const startSolid = p.script._solid, blkSolid = p.script.blocksHit();
            // Run past the solid window into the phased window.
            for (let i = 0; i < 8; i++) p.script.update(true, pm);
            const nowPhased = p.script._solid === false, blkPhased = p.script.blocksHit();
            const ghostly = p.visibility < 0.9;
            const phaseEvents = window.__P.cnt.script.count;
            // Run over more than a full cycle; it must re-solidify at some point
            // (exact landing frame is timing-dependent, so track "was solid seen").
            let backSolid = false;
            for (let i = 0; i < 14; i++) { p.script.update(true, pm); if (p.script._solid) backSolid = true; }
            return { startSolid, blkSolid, nowPhased, blkPhased, ghostly, phaseEvents, backSolid };
        });
        console.log('[2] cycle', cycle);
        check('it starts solid (hittable), phases to ghostly/invulnerable, then re-solidifies',
            cycle.startSolid && cycle.blkSolid === false && cycle.nowPhased && cycle.blkPhased === true &&
            cycle.ghostly && cycle.phaseEvents >= 1 && cycle.backSolid, cycle);
        await h.screenshot('phaser');

        // --- 3. Melee: no damage while phased, lands while solid ---
        const melee = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const p = app.findWorldObject('en_phaser').createInstance();
            p.position = pm.player.position.add(new BABYLON.Vector3(0, 0, 2));
            p.params = { toughness: 5, speed: 0, solidTime: 999, phaseTime: 999 };
            p.script._wasPlay = null; p.script.update(true, pm);
            const swing = () => {
                const hp0 = p.hp;
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(p.position);
                return hp0 - p.hp;
            };
            // Force phased: no damage.
            p.script._solid = false;
            const phasedDmg = swing();
            // Force solid: damage lands.
            p.script._solid = true;
            const solidDmg = swing();
            return { phasedDmg, solidDmg };
        });
        console.log('[3] melee', melee);
        check('a melee hit does nothing while phased but lands while solid',
            melee.phasedDmg === 0 && melee.solidDmg > 0, melee);

        // --- 4. Contact damages the player only while solid ---
        const contact = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const p = app.findWorldObject('en_phaser').createInstance();
            p.position = pm.player.position.add(new BABYLON.Vector3(0, 0, 0.5));
            p.params = { toughness: 3, speed: 0, solidTime: 999, phaseTime: 999 };
            p.script._wasPlay = null; p.script.update(true, pm);
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.dodgeFrames = 0; pm.blocking = false;
            // Phased: passes through, no damage.
            p.script._solid = false; p.script._cool = 0;
            const hpA = pm.playerHp; for (let i = 0; i < 10; i++) { pm.hurtCooldown = 0; p.script.update(true, pm); }
            const phasedHurt = hpA - pm.playerHp;
            // Solid: contact hurts.
            p.script._solid = true; p.script._cool = 0;
            const hpB = pm.playerHp; for (let i = 0; i < 10; i++) { pm.hurtCooldown = 0; p.script.update(true, pm); }
            const solidHurt = hpB - pm.playerHp;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { phasedHurt, solidHurt };
        });
        console.log('[4] contact', contact);
        check('it contact-damages the player only while solid',
            contact.phasedHurt === 0 && contact.solidHurt >= 2, contact);

        // --- 5. A solid-window melee kill drops it ---
        const kill = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, wo = app.findWorldObject('en_phaser');
            const p = wo.createInstance();
            p.position = pm.player.position.add(new BABYLON.Vector3(0, 0, 1.4));
            p.params = { toughness: 1, speed: 0, solidTime: 999, phaseTime: 999 };
            p.script._wasPlay = null; p.script.update(true, pm);
            p.script._solid = true;
            const before = wo.instances.filter(Boolean).length;
            pm.player.position.copyFrom(p.position.add(new BABYLON.Vector3(0, 0, -1.2)));
            for (let i = 0; i < 12 && !p.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(p.position);
            }
            return { defeated: p.defeated, gone: wo.instances.filter(Boolean).length < before };
        });
        console.log('[5] kill', kill);
        check('a melee kill during its solid window drops the phaser', kill.defeated && kill.gone, kill);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the phaser', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — wait for the ghost to solidify, then land your blow.'
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
