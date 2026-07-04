/*
 * 4P party test
 * -------------
 * Verifies the three-buddy party on top of the (regression-covered) single
 * buddy:
 *   - B joins buddies into slots until the party is full; a 4th join is
 *     refused; with a full party B disbands everyone,
 *   - each slot's pad flag joins ITS buddy (slot 1's wantsJoin fills slot 1),
 *   - per-slot test pads drive their own buddy independently,
 *   - combatTargets lists P1 + every live buddy, and a downed buddy drops
 *     out alone,
 *   - a full party splits into a 2x2 quadrant grid when someone roams
 *     (four cameras, quarter viewports), and the pane count re-layouts when
 *     a buddy leaves mid-split,
 *   - respawn restores the whole party at spawn,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7059 });
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
            // Landing pad far east for the roaming-split step.
            const wo = window.app.findWorldObject('t_tile');
            for (let gx = 13; gx <= 16; gx++)
                for (let gz = -1; gz <= 1; gz++) {
                    const t = wo.createInstance();
                    t.position = new BABYLON.Vector3(gx * 2, 0, gz * 2);
                    t.checkCollisions = true;
                }
        });
        await h.waitFrames(10);

        // --- 1. Fill the party via slot-1 pad flag + two B joins ---
        await h.evaluate(() => { window.app.buddyPads[1].wantsJoin = true; });
        await h.waitFor(() => !!window.app.activeMode.buddies[1], null, 20000);
        const padJoin = await h.evaluate(() => ({
            slots: window.app.activeMode.buddies.map((b) => !!b),
        }));
        console.log('\n[1] pad-slot join', padJoin);
        check('slot 1\'s pad flag joins slot 1 specifically',
            JSON.stringify(padJoin.slots) === JSON.stringify([false, true, false]), padJoin);
        await h.tapUntil('b', () => !!window.app.activeMode.buddies[0]);
        await h.tapUntil('b', () => !!window.app.activeMode.buddies[2]);
        const full = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const before = pm.buddies.filter(Boolean).length;
            pm.buddyJoin();   // 4th: refused
            return { before, after: pm.buddies.filter(Boolean).length };
        });
        console.log('[1b] full party', full);
        check('B fills the remaining slots and a 4th join is refused',
            full.before === 3 && full.after === 3, full);

        // --- 2. Per-slot pads drive their own buddy ---
        const drive = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.testBuddyPads[1] = { leftStick: { x: 0, y: -1 }, jumpHeld: false, attackQueued: false };
            const b1 = pm.buddies[1], b0 = pm.buddies[0];
            return {
                b1: { x: b1.root.position.x, z: b1.root.position.z },
                b0: { x: b0.root.position.x, z: b0.root.position.z },
            };
        });
        await h.waitFor((d) => {
            const b1 = window.app.activeMode.buddies[1];
            return Math.hypot(b1.root.position.x - d.b1.x, b1.root.position.z - d.b1.z) > 1;
        }, drive, 20000);
        const drove = await h.evaluate(() => {
            window.app.testBuddyPads[1].leftStick = { x: 0, y: 0 };
            const b0 = window.app.activeMode.buddies[0];
            return { b0: { x: b0.root.position.x, z: b0.root.position.z } };
        });
        const b0Still = Math.hypot(drove.b0.x - drive.b0.x, drove.b0.z - drive.b0.z) < 0.5;
        console.log('[2] per-slot drive', { drive, drove, b0Still });
        check('slot 1\'s stick moves buddy 1 while buddy 0 stands still', b0Still, { drive, drove });

        // --- 3. combatTargets: the whole party; a downed buddy drops out ---
        const targets = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const all = pm.combatTargets().map((t) => t.kind);
            pm.damageBuddy(pm.buddies[1], 999);
            const afterDown = pm.combatTargets().length;
            return { all, afterDown, downed: pm.buddies[1].downed > 0 };
        });
        console.log('[3] targets', targets);
        check('combatTargets lists P1 + all three buddies',
            targets.all.length === 4 && targets.all.filter((k) => k === 'buddy').length === 3, targets);
        check('a downed buddy drops out of targeting alone',
            targets.afterDown === 3 && targets.downed, targets);
        await h.evaluate(() => {   // stand them back up for the split step
            const b = window.app.activeMode.buddies[1];
            b.downed = 1;
        });
        await h.waitFor(() => window.app.activeMode.buddies[1].downed === 0, null, 20000);

        // --- 4. A full party splits into a 2x2 quadrant grid ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddies[2].root.position = new BABYLON.Vector3(29, 1.5, 0);
            pm.buddies[2].body.vy = 0;
        });
        await h.waitFor(() => window.app.activeMode._split === true, null, 20000);
        await h.waitFrames(6);
        const grid = await h.evaluate(() => {
            const pm = window.app.activeMode, scene = window.app.scene;
            const vps = scene.activeCameras.map((c) =>
                [c.viewport.x, c.viewport.y, c.viewport.width, c.viewport.height]);
            return { cams: scene.activeCameras.length, panes: pm._splitPanes, vps };
        });
        console.log('[4] quadrants', grid);
        check('a full party splits into four quarter panes',
            grid.cams === 4 && grid.panes === 4 &&
            grid.vps.every((v) => v[2] === 0.5 && v[3] === 0.5), grid);
        await h.screenshot('four-way-split');

        // --- 4b. A leave mid-split re-layouts to three panes ---
        await h.evaluate(() => window.app.activeMode.buddyLeave());   // removes slot 2 (the roamer)
        await h.waitFrames(6);
        const relayout = await h.evaluate(() => ({
            split: window.app.activeMode._split,
            cams: window.app.scene.activeCameras ? window.app.scene.activeCameras.length : 0,
        }));
        console.log('[4b] re-layout', relayout);
        check('losing the roamer mid-split merges (nobody far remains)',
            relayout.split === false && relayout.cams === 0, relayout);

        // --- 5. Respawn restores the whole party at spawn ---
        const reborn = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.buddies[0].hp = 3;
            window.app.pixels = 0;
            pm.respawn();
            return {
                hps: pm.buddies.filter(Boolean).map((b) => b.hp),
                near: pm.buddies.filter(Boolean).every((b) =>
                    BABYLON.Vector3.Distance(b.root.position, pm.spawnPoint) < 5),
            };
        });
        console.log('[5] respawn', reborn);
        check('respawn restores every buddy healthy at spawn',
            reborn.hps.every((hp) => hp === 60) && reborn.near, reborn);

        // --- 6. Full-party B disbands everyone ---
        await h.evaluate(() => window.app.activeMode.buddyJoin());   // refill slot 2
        await h.tapUntil('b', () => window.app.activeMode.buddies.every((b) => !b));
        check('with a full party, B disbands everyone',
            await h.evaluate(() => window.app.activeMode.buddies.every((b) => !b)));

        // --- 7. No unexpected page errors ---
        await h.evaluate(() => { window.app.testBuddyPads = [null, null, null]; });
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during 4P', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — three buddies join, fight, split into quadrants, and respawn as a party.'
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
