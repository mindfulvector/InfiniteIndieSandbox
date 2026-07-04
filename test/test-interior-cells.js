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
            // Approach like a real player (from one side, on the ground) so the
            // captured return spot is a genuine standing spot -- entering ON
            // the door made returnSpot equal doorPos, degenerating the exit
            // push into a mid-air drop on sloped ground.
            pm.player.position.copyFrom(C.door.position.add(new BABYLON.Vector3(1.1, 0.2, 0)));
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
                // The room is REAL instances near the cell origin now.
                roomObjects: (() => {
                    const o = C.door.script._cellOrigin();
                    let n = 0;
                    window.app.BuildableObjectList.forEach((wo) => wo.instances.forEach((i) => {
                        if (i && i !== C.door && BABYLON.Vector3.DistanceSquared(i.position, o) < 144) n++;
                    }));
                    return n;
                })(),
                walkerPos: { x: C.rec.mesh.position.x, z: C.rec.mesh.position.z },
            };
        });
        console.log('\n[2] entered', inside);
        check('walking into the door teleports the player to the far cell',
            inside.insideCell && inside.far, inside);
        check('the room was furnished from REAL world objects', inside.roomObjects >= 12, inside);
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

        // --- 3b. The player can WALK inside the cell. Regression: the cell
        // floor used to be isPickable=false, and the CC's ground check is
        // pickWithRay -- an unpickable floor read as a bottomless pit, so
        // the CC wiped its walk flags into permanent free-fall and the
        // player stood frozen in the room (user-reported).
        const stroll = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            const p0 = pm.player.position.clone();
            // Stroll from the cell CENTER: the walk direction is camera-
            // relative (unpredictable), and 60 frames from the center can't
            // reach the exit pad -- an accidental mid-stroll exit would
            // corrupt every downstream section's state.
            const o = window.__C.door.script._cellOrigin();
            pm.player.position.copyFrom(new BABYLON.Vector3(o.x, o.y + 0.5, o.z));
            const pC = pm.player.position.clone();
            cc._onKeyDown({ key: 'w' });
            let n = 0;
            const tick = () => {
                n++;
                if (n === 60) {
                    cc._onKeyUp({ key: 'w' });
                    cc.idle();   // clear ALL residual action state: any leftover
                                 // walk intent would march the player back into
                                 // the door radius during the yo-yo wait below
                    const moved = BABYLON.Vector3.Distance(pC, pm.player.position);
                    const inside = pm.insideCell;
                    // Park back on the entry spot so the downstream exit/yo-yo
                    // sections see the exact scripted position they expect.
                    pm.player.position.copyFrom(p0);
                    return resolve({ moved, stillInside: inside });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3b] stroll', stroll);
        check('the player can walk around inside the cell (pickable floor)',
            stroll.moved > 0.5 && stroll.stillInside, stroll);

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
        const doorDist = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            return Math.hypot(pm.player.position.x - C.door.position.x,
                pm.player.position.z - C.door.position.z);
        });
        check('the exit pad returns the player outside, clear of the door',
            !back.insideCell && doorDist > 1.35 && doorDist < 6, { back, doorDist });
        check('`exited` fired the wired counter', back.exited === 1, back);

        // --- 5. No yo-yo: the exit placed us clear of the trigger radius, so
        // even after the cooldown expires the door must NOT swallow us again.
        await h.waitFrames(45);
        const noBounce = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            return {
                inside: pm.insideCell,
                distToDoor: BABYLON.Vector3.Distance(pm.player.position, C.door.position),
                p: { x: Math.round(pm.player.position.x * 100) / 100,
                     y: Math.round(pm.player.position.y * 100) / 100,
                     z: Math.round(pm.player.position.z * 100) / 100 },
                walk: pm.cc._act._walk,
                entered: C.cIn.script.count,
                freeFall: pm.cc._inFreeFall,
            };
        });
        console.log('[5] no yo-yo', noBounce);
        check('the exit placement prevents a bounce back inside (even past the cooldown)',
            noBounce.inside === false && noBounce.distToDoor > 1.3, noBounce);

        // --- 6. Dying inside returns to spawn and unfreezes the world ---
        await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            C.door.script._cooldown = 0;
            pm.player.position.copyFrom(C.door.position.add(new BABYLON.Vector3(1.1, 0.2, 0)));   // go back in
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

        // --- 7. The room PERSISTS: build-mode return keeps it (only the
        // exit-pad mechanism goes), it rides the world save, and re-entering
        // NEVER refurnishes over the player's room (_roomExists guard).
        const persist = await h.evaluate(() => {
            const C = window.__C, app = window.app;
            const script = C.door.script;
            const countRoom = () => {
                const o = script._cellOrigin();
                let n = 0;
                app.BuildableObjectList.forEach((wo) => wo.instances.forEach((i) => {
                    if (i && i !== C.door && BABYLON.Vector3.DistanceSquared(i.position, o) < 144) n++;
                }));
                return n;
            };
            const before = countRoom();
            script.update(false, null);   // play->build transition
            const padGone = script._cellMeshes.length === 0;
            const afterBuild = countRoom();
            // The save carries the room: objects far from the world center.
            const data = app.world.serialize();
            const savedRoom = data.objects.filter((ob) => ob.po && ob.po.x > 4000).length;
            // Back to play + re-enter: the guard must not duplicate a stick.
            script.update(true, app.activeMode);
            script._buildCell();
            const afterReenter = countRoom();
            return { before, padGone, afterBuild, savedRoom, afterReenter };
        });
        console.log('[7] persistence', persist);
        check('build mode keeps the room (only the pad mechanism goes)',
            persist.padGone && persist.afterBuild === persist.before, persist);
        check('the room rides the world save (far objects serialized)',
            persist.savedRoom >= 12, persist);
        check('re-entering never refurnishes over the player\'s room',
            persist.afterReenter === persist.before, persist);

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
