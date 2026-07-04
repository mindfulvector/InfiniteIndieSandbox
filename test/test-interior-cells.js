/*
 * Interior cells test
 * -------------------
 * Verifies the pocket-interior door (pr_door_cell):
 *   - walking into the door teleports the player to the far-away cell (a
 *     decorated room built from raw meshes, not world instances),
 *   - insideCell freezes the outdoor enemies (positions hold still),
 *   - `entered` fires a wired counter,
 *   - stepping on the exit pad teleports the player back to where they
 *     entered and fires `exited`,
 *   - the teleport cooldown prevents an instant re-trigger bounce,
 *   - dying inside returns the player to the world spawn and clears the
 *     inside state (world unfreezes),
 *   - returning to build mode disposes every cell mesh,
 *   - the world save contains no cell meshes (raw meshes never serialize),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7037 });
    try {
        await h.start();
        await h.waitForReady(['pr_door_cell', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            window.app.pixels = 0; window.app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. Place the door + wired counters + a frozen-check walker ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const door = app.findWorldObject('pr_door_cell').createInstance();
            door.position = pm.player.position.add(new BABYLON.Vector3(6, 0, 0));
            const cIn = app.findWorldObject('l_counter').createInstance();
            cIn.position = door.position.add(new BABYLON.Vector3(0, 0, 4));
            const cOut = app.findWorldObject('l_counter').createInstance();
            cOut.position = door.position.add(new BABYLON.Vector3(2, 0, 4));
            door.wires.push({ event: 'entered', toWo: 'l_counter', toId: cIn.worldId, action: 'increment' });
            door.wires.push({ event: 'exited',  toWo: 'l_counter', toId: cOut.worldId, action: 'increment' });
            // A walker far to the side: it should freeze while we're inside.
            const em = pm.enemyManager;
            em.spawnWalker(pm.player.position.add(new BABYLON.Vector3(-15, 2, 0)));
            const rec = em.enemies[0];
            rec.speed = 3; rec.fade = 0;
            window.__C = { door, cIn, cOut, rec };
            door.script._wasPlay = null;   // play-transition snap for mid-play creation
        });
        await h.waitFrames(8);   // let the walker land and start walking

        // --- 2. Walk into the door: teleport in ---
        const outsidePos = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            const p0 = { x: pm.player.position.x, z: pm.player.position.z };
            pm.player.position.copyFrom(C.door.position);   // step into the doorway
            return p0;
        });
        await h.waitFrames(4);
        const inside = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            return {
                insideCell: pm.insideCell,
                far: BABYLON.Vector3.Distance(pm.player.position,
                    new BABYLON.Vector3(0, 0, 0)) > 1000,
                entered: C.cIn.script.count,
                cellMeshes: C.door.script._cellMeshes.length,
                walkerPos: { x: C.rec.mesh.position.x, z: C.rec.mesh.position.z },
            };
        });
        console.log('\n[2] entered', inside);
        check('walking into the door teleports the player to the far cell',
            inside.insideCell && inside.far, inside);
        check('the cell room was built (meshes exist)', inside.cellMeshes >= 8, inside);
        check('`entered` fired the wired counter', inside.entered === 1, inside);
        await h.screenshot('inside-the-cell');

        // --- 3. Outdoor enemies freeze while inside ---
        await h.waitFrames(12);
        const frozen = await h.evaluate(() => {
            const C = window.__C;
            return { x: C.rec.mesh.position.x, z: C.rec.mesh.position.z };
        });
        const frozeDist = Math.hypot(frozen.x - inside.walkerPos.x, frozen.z - inside.walkerPos.z);
        console.log('[3] frozen walker', { before: inside.walkerPos, after: frozen, frozeDist });
        check('outdoor enemies freeze while the player is inside', frozeDist < 0.001, { frozeDist });

        // --- 4. The exit pad teleports back and fires `exited` ---
        await h.evaluate(() => {
            const C = window.__C;
            window.app.activeMode.player.position.copyFrom(C.door.script._exitSpot);
        });
        // Wait on the condition, not counted frames: the 30-frame teleport
        // cooldown from entry may still be running at high fps.
        await h.waitFor(() => window.app.activeMode.insideCell === false, null, 20000);
        const back = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            return {
                insideCell: pm.insideCell,
                x: pm.player.position.x, z: pm.player.position.z,
                exited: C.cOut.script.count,
            };
        });
        console.log('[4] exited', { back, outsidePos });
        check('the exit pad returns the player outside (near the door)',
            !back.insideCell && Math.hypot(back.x - outsidePos.x, back.z - outsidePos.z) < 8, { back, outsidePos });
        check('`exited` fired the wired counter', back.exited === 1, back);

        // --- 5. No yo-yo: the exit placed us clear of the trigger radius, so
        // even after the cooldown expires the door must NOT swallow us again.
        await h.waitFrames(45);
        const noBounce = await h.evaluate(() => ({
            inside: window.app.activeMode.insideCell,
            distToDoor: BABYLON.Vector3.Distance(
                window.app.activeMode.player.position, window.__C.door.position),
        }));
        console.log('[5] no yo-yo', noBounce);
        check('the exit placement prevents a bounce back inside (even past the cooldown)',
            noBounce.inside === false && noBounce.distToDoor > 1.3, noBounce);

        // --- 6. Dying inside returns to spawn and unfreezes the world ---
        await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            C.door.script._cooldown = 0;
            pm.player.position.copyFrom(C.door.position);   // go back in
        });
        await h.waitFor(() => window.app.activeMode.insideCell === true, null, 20000);
        const died = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.respawn();   // simulates death: broadcasts onPlayReset
            return {
                insideCell: pm.insideCell,
                nearSpawn: BABYLON.Vector3.Distance(pm.player.position, pm.spawnPoint) < 3,
            };
        });
        console.log('[6] died inside', died);
        check('dying inside clears the cell state and respawns outside',
            !died.insideCell && died.nearSpawn, died);

        // --- 7. Build-mode return disposes the cell; saves stay clean ---
        const cleanup = await h.evaluate(() => {
            const C = window.__C;
            // Simulate the play->build transition the way the mode switch does.
            C.door.script.update(false, null);
            const meshesLeft = C.door.script._cellMeshes.length;
            const cellInScene = !!window.app.scene.getMeshByName('cellFloor');
            const doorData = window.app.findWorldObject('pr_door_cell').getAllInstanceData();
            return { meshesLeft, cellInScene, savedInstances: doorData.length };
        });
        console.log('[7] cleanup', cleanup);
        check('returning to build mode disposes every cell mesh',
            cleanup.meshesLeft === 0 && !cleanup.cellInScene, cleanup);
        check('the door itself serializes (1 instance), the cell never does',
            cleanup.savedInstances === 1, cleanup);

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during interior cells', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the cell door teleports in/out, freezes the outdoors, wires its events, and cleans up.'
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
