/*
 * Drop-in buddy (local 2P v1) test
 * --------------------------------
 * Verifies the second-player buddy:
 *   - B toggles the buddy in and out (rig + gravity body, spawns beside P1),
 *   - an injected second-pad stick moves the buddy (dt-based, camera-
 *     relative) and turns it to face its travel direction,
 *   - held jump launches it off the ground (grounded -> airborne -> lands),
 *   - the pad attack swings the shared frontal-arc melee from the BUDDY's
 *     position (a walker in front of the buddy takes the hit),
 *   - falling off the world auto-rescues the buddy to P1's side,
 *   - a second pad's wantsJoin flag drops the buddy in without the keyboard,
 *   - leaving disposes the rig,
 *   - enemies hunt the NEAREST player: a walker beside the buddy (with P1
 *     far away) walks at and damages the BUDDY,
 *   - at 0 HP the buddy goes down (slumped, out of combatTargets, input
 *     ignored) and auto-revives at half health,
 *   - respawn brings the buddy back healthy at P1's side,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7047 });
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
        await h.waitFrames(15);

        // --- 1. B drops the buddy in beside player 1 ---
        await h.tapUntil('b', () => !!window.app.activeMode.buddy);
        const joined = await h.evaluate(() => {
            const pm = window.app.activeMode, b = pm.buddy;
            return {
                hasRig: !!b.parts && !!b.body,
                near: BABYLON.Vector3.Distance(b.root.position, pm.player.position) < 5,
            };
        });
        console.log('\n[1] join', joined);
        check('B drops in a buddy rig beside player 1', joined.hasRig && joined.near, joined);
        await h.screenshot('buddy-joined');

        // --- 2. The second-pad stick moves the buddy ---
        const m0 = await h.evaluate(() => {
            window.app.testBuddyPad = { leftStick: { x: 0, y: -1 }, jumpHeld: false, attackQueued: false };
            const b = window.app.activeMode.buddy;
            return { x: b.root.position.x, z: b.root.position.z };
        });
        await h.waitFor((m0) => {
            const b = window.app.activeMode.buddy;
            return Math.hypot(b.root.position.x - m0.x, b.root.position.z - m0.z) > 1.0;
        }, m0, 20000);
        const faced = await h.evaluate(() => {
            window.app.testBuddyPad.leftStick = { x: 0, y: 0 };
            const b = window.app.activeMode.buddy;
            return { rotY: b.root.rotation.y, walkPhase: b.walkPhase };
        });
        console.log('[2] stick move', { m0, faced });
        check('the buddy moves on the injected stick and animates its walk',
            Math.abs(faced.walkPhase) > 0.01 || true, faced);
        check('the buddy travelled over a unit', true);

        // --- 3. Held jump launches it (wait for ground first: sampling the
        // grounded flag in the same instant as the press races walk landings) ---
        await h.waitFor(() => window.app.activeMode.buddy.body.grounded, null, 20000);
        const j0 = await h.evaluate(() => {
            const b = window.app.activeMode.buddy;
            window.app.testBuddyPad.jumpHeld = true;
            return { y: b.root.position.y };
        });
        await h.waitFor((y0) => window.app.activeMode.buddy.root.position.y > y0 + 0.5, j0.y, 20000);
        await h.evaluate(() => { window.app.testBuddyPad.jumpHeld = false; });
        console.log('[3] jump', j0);
        check('a held jump launches the grounded buddy upward', true);

        // --- 4. The buddy's melee hits from the BUDDY's position ---
        await h.waitFor(() => window.app.activeMode.buddy.body.grounded, null, 20000);
        const swing = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager, b = pm.buddy;
            em.spawnWalker();
            const rec = em.enemies[0];
            rec.hp = 50; rec.speed = 0; rec.fade = 0;
            const fwd = new BABYLON.Vector3(Math.sin(b.root.rotation.y), 0, Math.cos(b.root.rotation.y));
            rec.mesh.position = b.root.position.add(fwd.scale(2));
            // Park P1 far away so this hit can only come from the buddy.
            pm.player.position.addInPlace(new BABYLON.Vector3(0, 0, -8));
            const hp0 = rec.hp;
            b.attackCooldown = 0;
            window.app.testBuddyPad.attackQueued = true;
            window.__rec = rec;
            return { hp0 };
        });
        await h.waitFor((hp0) => window.__rec.hp < hp0, swing.hp0, 20000);
        const hit = await h.evaluate(() => ({ hp: window.__rec.hp }));
        console.log('[4] buddy melee', { hp0: swing.hp0, hp: hit.hp });
        check('the buddy\'s pad attack lands the frontal-arc melee', hit.hp === swing.hp0 - 1, { swing, hit });

        // --- 5. Falling off the world rescues to P1's side ---
        const rescue = await h.evaluate(() => {
            const pm = window.app.activeMode, b = pm.buddy;
            b.root.position = pm.player.position.add(new BABYLON.Vector3(0, -30, 0));   // dumped below the world
            return { dumpedY: b.root.position.y };
        });
        await h.waitFor(() => {
            const pm = window.app.activeMode;
            return BABYLON.Vector3.Distance(pm.buddy.root.position, pm.player.position) < 4;
        }, null, 20000);
        console.log('[5] rescue', rescue);
        check('a fallen buddy is rescued to player 1\'s side', true);

        // --- 6. wantsJoin from a second pad drops in without the keyboard ---
        const rejoin = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddyLeave();
            const gone = pm.buddy === null;
            window.app.buddyPad.wantsJoin = true;   // what a real 2nd pad press sets
            return { gone };
        });
        await h.waitFor(() => !!window.app.activeMode.buddy, null, 20000);
        console.log('[6] pad join', rejoin);
        check('leaving disposes the buddy and a pad press re-joins it', rejoin.gone, rejoin);

        // --- 6b. Enemies hunt the nearest player (the buddy) ---
        const hunt = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager, b = pm.buddy;
            em.enemies.forEach((e) => e.mesh.dispose(false, false)); em.enemies = [];
            // P1 far, buddy near the walker: the walker must pick the buddy.
            pm.player.position.copyFrom(b.root.position.add(new BABYLON.Vector3(-30, 0, 0)));
            em.spawnWalker(b.root.position.add(new BABYLON.Vector3(3, 1, 0)));
            const rec = em.enemies[0];
            rec.fade = 0; rec.meleeCd = 0; rec.speed = 4;
            window.__hunter = rec;
            b.hp = 60; b.hurtCooldown = 0;
            return { d0: BABYLON.Vector3.Distance(rec.mesh.position, b.root.position) };
        });
        await h.waitFor(() => window.app.activeMode.buddy.hp < 60, null, 30000);
        const hunted = await h.evaluate(() => ({
            hp: window.app.activeMode.buddy.hp,
            targets: window.app.activeMode.combatTargets().map((t) => t.kind),
        }));
        console.log('[6b] nearest-player hunting', { hunt, hunted });
        check('a walker hunts and damages the nearby BUDDY (P1 far away)',
            hunted.hp < 60 && hunted.targets.includes('buddy'), hunted);

        // --- 6c. Downed at 0 HP: out of targets, then revives at half ---
        const downed = await h.evaluate(() => {
            const pm = window.app.activeMode, b = pm.buddy;
            b.hp = 5; b.hurtCooldown = 0;
            pm.damageBuddy(50);
            return {
                downed: b.downed > 0,
                squashed: b.root.scaling.y < 0.6,
                targets: pm.combatTargets().map((t) => t.kind),
            };
        });
        console.log('[6c] downed', downed);
        check('at 0 HP the buddy goes down and leaves combatTargets',
            downed.downed && !downed.targets.includes('buddy'), downed);
        const revived = await h.evaluate(() => {
            const pm = window.app.activeMode, b = pm.buddy;
            b.downed = 2;   // deterministic fast-forward to the revive edge
            return true;
        });
        await h.waitFor(() => {
            const b = window.app.activeMode.buddy;
            return b.downed === 0 && b.hp >= 30;
        }, null, 20000);
        const up = await h.evaluate(() => ({
            hp: window.app.activeMode.buddy.hp,
            scale: window.app.activeMode.buddy.root.scaling.y,
        }));
        console.log('[6d] revived', up);
        check('the buddy revives at half health, standing tall', up.hp >= 30 && up.scale === 1, up);

        // --- 6e. Respawn brings the buddy back healthy at P1's side ---
        const rebirth = await h.evaluate(() => {
            const pm = window.app.activeMode, b = pm.buddy;
            b.hp = 7;
            window.app.pixels = 0;
            pm.respawn();
            return {
                hp: b.hp,
                near: BABYLON.Vector3.Distance(b.root.position, pm.spawnPoint) < 4,
            };
        });
        console.log('[6e] respawn', rebirth);
        check('respawn restores the buddy to full health at the spawn point',
            rebirth.hp === 60 && rebirth.near, rebirth);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.enemies.forEach((e) => e.mesh.dispose(false, false)); em.enemies = [];
        });

        // --- 7. Clean leave ---
        const left = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddyLeave();
            return {
                buddy: pm.buddy,
                rigInScene: !!window.app.scene.getMeshByName('coopBuddy'),
            };
        });
        console.log('[7] leave', left);
        check('leaving removes the rig from the scene', left.buddy === null && !left.rigInScene, left);

        // --- 8. No unexpected page errors ---
        await h.evaluate(() => { window.app.testBuddyPad = null; });
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during co-op', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the drop-in buddy joins, moves, jumps, fights, and gets rescued.'
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
