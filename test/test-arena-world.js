/*
 * The Gauntlet combat-arena world test
 * ------------------------------------
 * A wave-survival arena showcasing the charger + turret + spawner waves +
 * dodge/block. Verifies end to end:
 *   - imports with a checkpoint, arm-gate, wave spawner, a turret, two
 *     chargers, the exit door + vault chest, all wired,
 *   - a charger in the world aggros the player and dashes,
 *   - clearing the wave opens the exit door and steps the quest,
 *   - the vault chest pays out and advances the quest,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7127 });
    try {
        await h.start();
        await h.waitForReady(['en_charger', 'en_turret', 'l_spawner', 'pr_chest']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });

        // --- 1. Import + inventory ---
        const inv = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/the-gauntlet.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                window.__G = {
                    cp: live('l_checkpoint')[0],
                    gate: live('l_trigger').find((t) => t.wires.some((w) => w.toWo === 'l_spawner')),
                    spawner: live('l_spawner').find((s) => s.params.wave === 6),
                    turret: live('en_turret')[0],
                    chargers: live('en_charger'),
                    exitDoor: live('pr_door').find((d) => Math.abs(d.position.z - 8.02) < 0.5),
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                };
                const G = window.__G;
                return { ok,
                    hasAll: !!(G.cp && G.gate && G.spawner && G.turret && G.exitDoor && G.chest &&
                        G.chargers.length === 2),
                    spawnerWired: G.spawner && G.spawner.wires.some((w) => w.toWo === 'pr_door') };
            }));
        console.log('\n[1] inventory', inv);
        check('the arena imports: checkpoint, gate, wave spawner, turret, 2 chargers, vault (wired)',
            inv.ok && inv.hasAll && inv.spawnerWired, inv);
        await h.waitFrames(5);

        // --- 2. A charger in the world aggros and dashes at the player ---
        const dash = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, ch = window.__G.chargers[0];
            ch.script._wasPlay = null; ch.script.update(true, pm);
            pm.player.position.copyFrom(ch.getAbsolutePosition().add(new BABYLON.Vector3(2, 0, 0)));
            const startX = ch.position.x;
            const states = new Set();
            for (let i = 0; i < 80; i++) { ch.script.update(true, pm); states.add(ch.script._state); }
            return { woundUp: states.has('windup'), charged: states.has('charge'),
                moved: Math.abs(ch.position.x - startX) > 1 };
        });
        console.log('[2] charger', dash);
        check('an arena charger aggros the player and dashes', dash.woundUp && dash.charged && dash.moved, dash);
        await h.screenshot('gauntlet');

        // --- 3. Clearing the wave opens the exit door + steps the quest ---
        const doorShut = await h.evaluate(() => window.__G.exitDoor.checkCollisions === true);
        const cleared = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, G = window.__G;
            G.spawner.script._wasPlay = null; G.spawner.script.onPlayReset(pm);
            const q0 = G.quest.script._done.size;
            // Fire the wave-cleared edge directly (the wave mechanic is proven
            // in test-dungeon; here we exercise this world's WIRING).
            app.fireEvent(G.spawner, 'cleared');
            return { qStepped: G.quest.script._done.size > q0 };
        });
        await h.waitFor(() => window.__G.exitDoor.script._t === 1, null, 20000);
        const doorOpen = await h.evaluate(() => window.__G.exitDoor.checkCollisions === false ||
            window.__G.exitDoor.script._t === 1);
        console.log('[3] wave clear', { doorShut, cleared, doorOpen });
        check('clearing the wave opens the exit door and steps the quest',
            doorShut && cleared.qStepped && doorOpen, { doorShut, cleared, doorOpen });

        // --- 4. The vault chest pays out ---
        const vault = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, G = window.__G;
            pm.player.position.copyFrom(G.cp.position); G.cp.script.update(true, pm);
            pm.player.position.copyFrom(G.chest.position);
            G.chest.script._wasPlay = null; G.chest.script.update(true, pm);
            G.chest.script.update(true, pm);
            return { chestOpen: G.chest.script._open,
                score: G.board.script.score != null ? G.board.script.score : G.board.script.count,
                questSteps: G.quest.script._done.size };
        });
        console.log('[4] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 2, vault);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the arena', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the horde spawns, the brutes charge, and the vault opens.'
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
