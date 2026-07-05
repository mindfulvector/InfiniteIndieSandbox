/*
 * Portal Door test
 * ----------------
 * A portal door leads to a NAMED SUB-LEVEL stored inside the current world's
 * save (the interior-cell replacement). Verifies:
 *   - first entry prompts for the sub-level's name (test-injected), and the
 *     whole scene swaps: the parent's terrain is gone, the seeded starter
 *     room (with its own exit portal) is what exists,
 *   - the sub-level is editable and edits persist across exit/re-entry,
 *   - exiting restores the parent world exactly (door keeps its name),
 *   - saving from INSIDE the sub-level stores the folded ROOT world with the
 *     sub-level nested under subWorlds,
 *   - dying inside respawns inside (the sub-level is a real world),
 *   - the door's `entered` wiring fires in the parent (quest step survives
 *     the round trip via the quest's params-mirrored state),
 *   - cancelling the naming prompt cancels the entry.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pr_door_cell', 'in_floor', 'in_wall', 'l_quest', 'd_lamp']);
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('2', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // Place a portal door + a quest wired to its `entered` output.
        const setup = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const door = app.findWorldObject('pr_door_cell').createInstance();
            door.position = pm.player.position.add(new BABYLON.Vector3(5, 1.5, 0));
            const quest = app.findWorldObject('l_quest').createInstance();
            quest.position = pm.player.position.add(new BABYLON.Vector3(-5, 1, 0));
            quest.params.steps = 2;   // stays incomplete after one step
            door.wires.push({ event: 'entered', toWo: 'l_quest', toId: quest.worldId, action: 'step' });
            window.__P = { doorId: door.worldId, questId: quest.worldId,
                tiles0: app.findWorldObject('t_tile').instances.filter(Boolean).length };
            return { tiles0: window.__P.tiles0 };
        });
        console.log('\n[0] parent world', setup);
        check('the flat template has its terrain grid', setup.tiles0 > 50, setup);

        // --- 1. Cancelled naming prompt = no entry ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            app.testPromptValue = null;   // "cancel"
            const door = app.findInstance('pr_door_cell', window.__P.doorId);
            pm.player.position.copyFrom(door.position.add(new BABYLON.Vector3(0.8, -0.9, 0)));
        });
        await h.waitFrames(30);
        const cancelled = await h.evaluate(() => ({
            stack: window.app.worldStack.length,
            named: (window.app.findInstance('pr_door_cell', window.__P.doorId).params || {}).world || null,
        }));
        console.log('\n[1] cancelled prompt', cancelled);
        check('cancelling the name prompt cancels the entry', cancelled.stack === 0 && !cancelled.named, cancelled);

        // --- 2. Naming + entering: the scene swaps to the seeded room ---
        await h.evaluate(() => {
            const app = window.app;
            app.testPromptValue = 'Vaultlet';
            // Step off and back on so the (cooled-down) door re-triggers.
            app.activeMode.player.position.x += 6;
        });
        await h.waitFrames(10);
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const door = app.findInstance('pr_door_cell', window.__P.doorId);
            pm.player.position.copyFrom(door.position.add(new BABYLON.Vector3(0.8, -0.9, 0)));
        });
        await h.waitFor(() => window.app.worldStack.length === 1, null, 20000);
        await h.waitFrames(10);
        const inside = await h.evaluate(() => {
            const app = window.app;
            const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
            const exits = live('pr_door_cell').filter((i) => i.params && i.params.mode === 'exit');
            return {
                stack: app.worldStack.length,
                stackName: app.worldStack[0] && app.worldStack[0].name,
                tiles: live('t_tile').length,
                floors: live('in_floor').length,
                walls: live('in_wall').length,
                exits: exits.length,
                playerY: Math.round(app.activeMode.player.position.y * 10) / 10,
            };
        });
        console.log('\n[2] inside the sub-level', inside);
        check('entering swaps the WHOLE scene (parent terrain gone)', inside.tiles === 0, inside);
        check('the sub-level is named on the stack', inside.stackName === 'Vaultlet', inside);
        check('the seeded starter room stands (floors, walls, an exit portal)',
            inside.floors === 4 && inside.walls === 8 && inside.exits === 1, inside);
        const facingIn = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const exit = app.findWorldObject('pr_door_cell').instances.filter(Boolean)
                .find((i) => i.params && i.params.mode === 'exit');
            const away = pm.player.position.subtract(exit.position);
            away.y = 0; away.normalize();
            const fwd = pm.playerForward();
            return { dot: Math.round((fwd.x * away.x + fwd.z * away.z) * 100) / 100 };
        });
        console.log('[2b] arrival facing', facingIn);
        check('the player arrives FACING AWAY from the exit door (no accidental re-entry)',
            facingIn.dot > 0.6, facingIn);
        await h.screenshot('inside-sub-level');

        // --- 3. Edit the room, then exit through the exit portal ---
        await h.evaluate(() => {
            const app = window.app;
            const lamp = app.findWorldObject('d_lamp').createInstance();
            lamp.position = new BABYLON.Vector3(3.2, 0.155, 3.2);
            const exit = app.findWorldObject('pr_door_cell').instances.filter(Boolean)
                .find((i) => i.params && i.params.mode === 'exit');
            app.activeMode.player.position.copyFrom(
                exit.position.add(new BABYLON.Vector3(0.8, -0.9, 0)));
        });
        await h.waitFor(() => window.app.worldStack.length === 0, null, 20000);
        await h.waitFrames(10);
        const back = await h.evaluate(() => {
            const app = window.app;
            const door = app.findInstance('pr_door_cell', window.__P.doorId) ||
                app.findWorldObject('pr_door_cell').instances.filter(Boolean)[0];
            const quest = app.findWorldObject('l_quest').instances.filter(Boolean)[0];
            window.__P.doorId = door.worldId;
            return {
                tiles: app.findWorldObject('t_tile').instances.filter(Boolean).length,
                doorName: (door.params || {}).world || null,
                sub: app.subWorlds && app.subWorlds['Vaultlet']
                    ? app.subWorlds['Vaultlet'].objects.length : 0,
                questSteps: ((quest.params || {}).qdone || []).length,
            };
        });
        const facingOut = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const door = app.findWorldObject('pr_door_cell').instances.filter(Boolean)
                .find((i) => !i.params || i.params.mode !== 'exit');
            const away = pm.player.position.subtract(door.position);
            away.y = 0; away.normalize();
            const fwd = pm.playerForward();
            return { dot: Math.round((fwd.x * away.x + fwd.z * away.z) * 100) / 100 };
        });
        console.log('\n[3a] return facing', facingOut);
        check('the player returns FACING AWAY from the door they came out of',
            facingOut.dot > 0.6, facingOut);
        console.log('\n[3] back in the parent', back);
        check('exiting restores the parent world (terrain back)', back.tiles === setup.tiles0, back);
        check('the door remembers its sub-level name', back.doorName === 'Vaultlet', back);
        check('the sub-level (with the placed lamp) is stored INSIDE the parent world',
            back.sub > 13, back);   // 4 floors + 8 walls + exit door + lamp
        check('the door\'s entered wiring stepped the quest (state survived the trip)',
            back.questSteps === 1, back);
        await h.screenshot('back-outside');

        // --- 4. Re-entering finds the edit ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const door = app.findInstance('pr_door_cell', window.__P.doorId);
            pm.player.position.copyFrom(door.position.add(new BABYLON.Vector3(0.8, -0.9, 0)));
        });
        await h.waitFor(() => window.app.worldStack.length === 1, null, 20000);
        await h.waitFrames(6);
        const again = await h.evaluate(() => ({
            lamps: window.app.findWorldObject('d_lamp').instances.filter(Boolean).length,
        }));
        console.log('\n[4] re-entry', again);
        // The starter room seeds one lamp; the edit added a second.
        check('the placed lamp persisted inside the sub-level', again.lamps === 2, again);

        // --- 5. Saving from INSIDE stores the folded root world ---
        const saved = await h.evaluate(() => {
            window.app.world.saveNamed('PortalRoot');
            const blob = JSON.parse(window.localStorage.getItem('iis_world_PortalRoot'));
            return {
                rootObjects: (blob.objects || []).length,
                hasSub: !!(blob.subWorlds && blob.subWorlds['Vaultlet']),
                subObjects: blob.subWorlds && blob.subWorlds['Vaultlet']
                    ? blob.subWorlds['Vaultlet'].objects.length : 0,
            };
        });
        console.log('\n[5] save from inside', saved);
        check('the save is the ROOT world (terrain-sized), not the room',
            saved.rootObjects > 50, saved);
        check('the sub-level rides inside the save under subWorlds',
            saved.hasSub && saved.subObjects > 13, saved);

        // --- 6. Dying inside respawns inside ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0;
            pm.damagePlayer(99999);
        });
        await h.waitFrames(12);
        const death = await h.evaluate(() => ({
            stack: window.app.worldStack.length,
            hp: window.app.activeMode.playerHp,
            floors: window.app.findWorldObject('in_floor').instances.filter(Boolean).length,
        }));
        console.log('\n[6] death inside', death);
        check('death inside the sub-level respawns INSIDE it',
            death.stack === 1 && death.hp > 0 && death.floors === 4, death);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — portal doors lead to named, editable sub-levels stored inside the world.'
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
