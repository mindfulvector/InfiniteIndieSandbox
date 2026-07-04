/*
 * Blocking + dodging test
 * -----------------------
 * Verifies the defensive moves in play mode:
 *   - an unguarded hit deals full damage (baseline),
 *   - holding G raises the guard: `blocking` goes true and the translucent
 *     'blockShield' mesh appears in front of the player,
 *   - a blocked FRONTAL hit deals no damage and increments blockedHits,
 *   - a hit from BEHIND still lands at full damage while blocking,
 *   - releasing G lowers the guard and disposes the shield (+ its material),
 *   - a dodge roll grants i-frames (damage mid-roll is ignored entirely,
 *     dodgedHits increments) and physically displaces the player,
 *   - the dodge cooldown refuses an immediate second roll,
 *   - the real C keypress path triggers a dodge (dodgeCount increments),
 *   - no page errors occur along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7031 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // --- 1. Baseline: an unguarded frontal hit deals full damage ---
        const baseline = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0; pm.dodgeFrames = 0;
            const hp0 = pm.playerHp;
            const front = pm.player.position.add(pm.playerForward().scale(3));
            pm.damagePlayer(5, front);
            return { lost: hp0 - pm.playerHp, blocking: pm.blocking };
        });
        console.log('\n[1] baseline hit', baseline);
        check('an unguarded frontal hit deals full damage', baseline.lost === 5, baseline);

        // --- 2. Holding G raises the guard and shows the shield ---
        await h.evaluate(() => { window.app.keysPressed['G'] = true; });
        await h.waitFrames(4);
        const guard = await h.evaluate(() => ({
            blocking: window.app.activeMode.blocking,
            shield: !!window.app.scene.getMeshByName('blockShield'),
        }));
        console.log('[2] guard up', guard);
        check('holding G sets blocking', guard.blocking, guard);
        check('the blockShield mesh appears while guarding', guard.shield, guard);
        await h.screenshot('block-stance');

        // --- 3. A blocked frontal hit deals NO damage ---
        const blocked = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0; pm.dodgeFrames = 0;
            const hp0 = pm.playerHp;
            const b0 = pm.blockedHits;
            const front = pm.player.position.add(pm.playerForward().scale(3)).add(new BABYLON.Vector3(0, 1, 0));
            pm.damagePlayer(8, front);
            return { lost: hp0 - pm.playerHp, blockedDelta: pm.blockedHits - b0 };
        });
        console.log('[3] frontal block', blocked);
        check('a blocked frontal hit deals no damage', blocked.lost === 0, blocked);
        check('blockedHits increments on a blocked hit', blocked.blockedDelta === 1, blocked);

        // --- 4. A hit from BEHIND lands at full damage while blocking ---
        const backstab = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0;
            const hp0 = pm.playerHp;
            const behind = pm.player.position.subtract(pm.playerForward().scale(3));
            pm.damagePlayer(8, behind);
            return { lost: hp0 - pm.playerHp, stillBlocking: pm.blocking };
        });
        console.log('[4] hit from behind', backstab);
        check('a hit from behind lands at full damage while blocking',
            backstab.lost === 8 && backstab.stillBlocking, backstab);

        // --- 5. Releasing G lowers the guard and disposes the shield ---
        await h.evaluate(() => { window.app.keysPressed['G'] = false; });
        await h.waitFrames(4);
        const lowered = await h.evaluate(() => ({
            blocking: window.app.activeMode.blocking,
            shield: !!window.app.scene.getMeshByName('blockShield'),
            mat: !!window.app.scene.getMaterialByName('blockShieldMat'),
        }));
        console.log('[5] guard down', lowered);
        check('releasing G clears blocking', !lowered.blocking, lowered);
        check('the shield mesh and its material are disposed', !lowered.shield && !lowered.mat, lowered);

        // --- 6. Dodge: i-frames ignore damage; the roll displaces the player ---
        const dodge = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0; pm.dodgeFrames = 0; pm.dodgeCooldown = 0;
            const p0 = pm.player.position;
            const hp0 = pm.playerHp;
            const d0 = pm.dodgedHits;
            pm.startDodge();
            const started = pm.dodgeFrames > 0;
            const front = pm.player.position.add(pm.playerForward().scale(2));
            pm.damagePlayer(50, front);
            return {
                started,
                lost: hp0 - pm.playerHp,
                dodgedDelta: pm.dodgedHits - d0,
                x0: p0.x, z0: p0.z,
            };
        });
        console.log('[6] dodge i-frames', dodge);
        check('startDodge begins a roll (dodgeFrames > 0)', dodge.started, dodge);
        check('damage during the roll is ignored (i-frames)', dodge.lost === 0, dodge);
        check('dodgedHits increments when a hit is dodged', dodge.dodgedDelta === 1, dodge);

        await h.waitFrames(20);   // let the 12-frame roll play out
        const after = await h.evaluate(() => {
            const pm = window.app.activeMode;
            return { x: pm.player.position.x, z: pm.player.position.z, rolling: pm.dodgeFrames > 0 };
        });
        const moved = Math.hypot(after.x - dodge.x0, after.z - dodge.z0);
        console.log('[6b] dodge displacement', { moved, after });
        check('the roll physically displaces the player (> 1 unit)', moved > 1.0, { moved, after });
        check('the roll has ended after 20 frames', !after.rolling, after);
        await h.screenshot('after-dodge');

        // --- 7. The dodge cooldown refuses an immediate second roll ---
        const cooldown = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.dodgeFrames = 0; pm.dodgeCooldown = 10;   // mid-cooldown
            const c0 = pm.dodgeCount;
            pm.startDodge();
            return { refused: pm.dodgeCount === c0, count: pm.dodgeCount };
        });
        console.log('[7] cooldown', cooldown);
        check('a second roll during the cooldown is refused', cooldown.refused, cooldown);

        // --- 8. The real C keypress triggers a dodge ---
        const prevCount = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.dodgeFrames = 0; pm.dodgeCooldown = 0;
            return pm.dodgeCount;
        });
        await h.tapUntil('c', (prev) => window.app.activeMode.dodgeCount > prev, prevCount);
        const keyed = await h.evaluate(() => window.app.activeMode.dodgeCount);
        console.log('[8] C key dodge', { prevCount, keyed });
        check('pressing C triggers a dodge through the real input path', keyed > prevCount, { prevCount, keyed });

        // --- 9. No unexpected page errors during any of it ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during blocking/dodging', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — blocking negates frontal hits and dodging grants i-frames + movement.'
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
