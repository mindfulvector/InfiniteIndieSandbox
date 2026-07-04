/*
 * Co-op campaign packaging test (Twin Trials)
 * -------------------------------------------
 * Verifies split-screen campaign packaging:
 *   - a co-op world (coop:true envelope) sets app.coopWorld and auto-joins
 *     player 2 when a play session starts,
 *   - the co-op trigger gate fires `entered` only when TWO party members
 *     stand inside (not one), opening the gated vault door,
 *   - a normal single-player world clears the coop flag,
 *   - Twin Trials imports with its co-op plate + arena wiring,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7103 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_trigger', 'pr_door']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            window.app.activeMode.enemyManager.autoSpawn = false;
            window.app.activeMode.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            window.app.activeMode.enemyManager.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. The co-op flag + auto-join on entry ---
        const joined = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/twin-trials.json').then((ok) => {
                const app = window.app;
                app.goto_playMode();
                return { ok, coopFlag: app.coopWorld };
            }));
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' &&
            !!window.app.activeMode.cc, null, 20000);
        await h.waitFor(() => !!window.app.activeMode.buddies[0], null, 20000);
        const auto = await h.evaluate(() => ({
            buddy: !!window.app.activeMode.buddies[0],
            coop: window.app.coopWorld,
        }));
        console.log('\n[1] auto-join', { joined, auto });
        check('a co-op world sets the flag and auto-joins player 2',
            joined.ok && joined.coopFlag && auto.buddy && auto.coop, { joined, auto });
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            // Re-run the co-op door script's wasPlay so it re-arms cleanly.
            const plate = window.app.findWorldObject('l_trigger').instances
                .filter(Boolean).find((t) => t.params.coop === 'yes');
            window.__C = { plate,
                door: window.app.findWorldObject('pr_door').instances.filter(Boolean)
                    .find((d) => Math.abs(d.position.z - 5.02) < 0.5),
                quest: window.app.findWorldObject('l_quest').instances.filter(Boolean)[0] };
        });
        await h.waitFrames(5);

        // --- 2. The co-op plate needs BOTH players ---
        const shut = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__C.door.position;
            return pm.projectileBlocked(
                new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5));
        });
        // Only the player on the plate: must NOT open.
        await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__C.plate.position;
            pm.player.position.copyFrom(P);
            pm.buddies[0].root.position.copyFrom(P.add(new BABYLON.Vector3(20, 0, 0)));   // buddy far away
        });
        await h.waitFrames(15);
        const soloState = await h.evaluate(() => ({
            coopIn: window.__C.plate.script._coopIn,
            questSteps: window.__C.quest.script._done.size,
        }));
        // Now bring the buddy onto the plate too.
        await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__C.plate.position;
            pm.buddies[0].root.position.copyFrom(P.add(new BABYLON.Vector3(0.5, 0, 0)));
        });
        await h.waitFor(() => window.__C.plate.script._coopIn === true, null, 20000);
        await h.waitFor(() => window.__C.door.script._t === 1, null, 20000);
        const bothState = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__C.door.position;
            return {
                doorOpen: !pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                questSteps: window.__C.quest.script._done.size,
            };
        });
        console.log('[2] plate', { shut, soloState, bothState });
        check('the door blocks and the plate ignores a single player',
            shut && !soloState.coopIn && soloState.questSteps === 0, { shut, soloState });
        check('both players on the plate opens the vault and steps the quest',
            bothState.doorOpen && bothState.questSteps >= 1, bothState);
        await h.screenshot('coop-plate');

        // --- 3. A single-player world clears the co-op flag ---
        const single = await h.evaluate(() => {
            const app = window.app;
            app.importWorldData(JSON.stringify({ format: 'iis-world', version: 1, objects: [
                { wo: 't_tile', id: 1, po: { x: 0, y: 0, z: 0 } },
            ] }));
            return { coop: app.coopWorld };
        });
        console.log('[3] single', single);
        check('a normal world clears the co-op flag', !single.coop, single);

        // --- 4. Twin Trials wiring inventory ---
        await h.evaluate(() => window.app.importWorldFromUrl('./assets/worlds/twin-trials.json'));
        await h.waitFor(() => window.app.coopWorld === true, null, 20000);
        const inv = await h.evaluate(() => {
            const app = window.app;
            const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
            const plate = live('l_trigger').find((t) => t.params.coop === 'yes');
            const sp = live('l_spawner').find((s) => s.params.wave === 4);
            return {
                plateWired: plate && plate.wires.some((w) => w.toWo === 'pr_door'),
                arenaWired: sp && sp.wires.some((w) => w.event === 'cleared'),
                stars: live('pk_star').length,
            };
        });
        console.log('[4] inventory', inv);
        check('Twin Trials ships the co-op plate + cleared-gated arena',
            inv.plateWired && inv.arenaWired && inv.stars === 3, inv);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during co-op packaging', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — two players join, stand together, and clear the trials.'
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
