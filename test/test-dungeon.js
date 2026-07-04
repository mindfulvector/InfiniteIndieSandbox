/*
 * Dungeon crawl test (wave-clear primitive + The Deepvault)
 * --------------------------------------------------------
 * Verifies the "clear the room" spawner primitive and the dungeon world
 * built on it:
 *   - a wave spawner (wave=3) spawns its whole quota then STOPS, and fires
 *     `cleared` exactly once when the last spawn is defeated (not before),
 *   - a play reset re-arms the wave,
 *   - The Deepvault imports with its chamber chain wired (gate->spawner1,
 *     spawner1.cleared->door1+quest, ...boss.defeated->vault+scoreboard),
 *   - clearing chamber 1's wave opens door 1 and steps the quest,
 *   - deposing the boss opens the loot vault and pays the scoreboard,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7100 });
    try {
        await h.start();
        await h.waitForReady(['l_spawner', 'l_counter', 'en_boss', 'pr_door']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
        });
        await h.waitFrames(10);

        // --- 1. The wave-clear primitive ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const sp = app.findWorldObject('l_spawner').createInstance();
            sp.position = pm.player.position.add(new BABYLON.Vector3(0, 1, 20));
            sp.params = { enemyType: 'walker', frequency: 0.1, limit: 3, startActive: 'yes', wave: 3 };
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = sp.position.add(new BABYLON.Vector3(0, 0, 3));
            cnt.params.threshold = 10; cnt.params.autoReset = 'no';
            sp.wires.push({ event: 'cleared', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' });
            sp.script._wasPlay = null; sp.script.onPlayReset(pm);
            window.__W = { sp, cnt };
        });
        // Let it spawn the whole quota of 3.
        await h.waitFor(() => window.__W.sp.script._totalSpawned >= 3, null, 20000);
        const quota = await h.evaluate(() => {
            const app = window.app;
            const em = app.activeMode.enemyManager;
            return {
                spawned: window.__W.sp.script._totalSpawned,
                alive: em.enemies.length,
                clearedYet: window.__W.cnt.script.count,
            };
        });
        console.log('\n[1] quota', quota);
        check('the wave spawns its full quota (3) then stops',
            quota.spawned === 3, quota);
        check('`cleared` has NOT fired while enemies remain',
            quota.alive > 0 && quota.clearedYet === 0, quota);

        // Kill them all -> cleared fires once.
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            for (let i = em.enemies.length - 1; i >= 0; i--) em.defeat(i);
        });
        await h.waitFor(() => window.__W.cnt.script.count >= 1, null, 20000);
        await h.waitFrames(20);   // give any spurious re-fire a chance
        const cleared = await h.evaluate(() => ({ count: window.__W.cnt.script.count }));
        console.log('[2] cleared', cleared);
        check('`cleared` fires exactly once when the room empties', cleared.count === 1, cleared);

        // --- 3. Reset re-arms the wave ---
        const rearm = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.__W.sp.script.onPlayReset(pm);
            return { total: window.__W.sp.script._totalSpawned, fired: window.__W.sp.script._clearedFired };
        });
        console.log('[3] rearm', rearm);
        check('a play reset re-arms the wave (quota and edge reset)',
            rearm.total === 0 && !rearm.fired, rearm);

        // --- 4. The Deepvault imports wired ---
        const world = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/deepvault.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const sps = live('l_spawner');
                const sp1 = sps.find((s) => s.params.wave === 3);
                const gate = live('l_trigger').find((t) =>
                    (t.wires || []).some((w) => w.toWo === 'l_spawner'));
                const boss = live('en_boss')[0];
                window.__D = { sp1, gate, boss,
                    door1: live('pr_door').find((d) => Math.abs(d.position.z - 6.02) < 0.5),
                    vault: live('pr_door').find((d) => Math.abs(d.position.z - 38.02) < 0.5),
                    quest: live('l_quest')[0], board: live('l_scoreboard')[0] };
                const D = window.__D;
                return {
                    ok,
                    spCleared: D.sp1 && D.sp1.wires.some((w) => w.event === 'cleared' && w.toWo === 'pr_door'),
                    bossVault: D.boss && D.boss.wires.some((w) => w.event === 'defeated' && w.toWo === 'pr_door'),
                    stars: live('pk_star').length,
                };
            }));
        console.log('[4] deepvault', world);
        check('the dungeon imports with its chamber chain wired',
            world.ok && world.spCleared && world.bossVault && world.stars === 3, world);
        await h.evaluate(() => {
            window.app.activeMode.playerMaxHp = 10000; window.app.activeMode.playerHp = 10000;
            window.__D.sp1.script._wasPlay = null;
        });
        await h.waitFrames(5);

        // --- 5. Clearing chamber 1 opens door 1 + steps the quest ---
        const shut1 = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D.door1.position;
            return pm.projectileBlocked(
                new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5));
        });
        await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D;
            pm.player.position.copyFrom(D.gate.position);   // trip the gate -> arm wave 1
        });
        await h.waitFor(() => window.__D.sp1.script._totalSpawned >= 3, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            for (let i = em.enemies.length - 1; i >= 0; i--) em.defeat(i);
        });
        await h.waitFor(() => window.__D.door1.script._t === 1, null, 20000);
        const open1 = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D.door1.position;
            return {
                doorOpen: !pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                questSteps: window.__D.quest.script._done.size,
            };
        });
        console.log('[5] chamber 1', { shut1, open1 });
        check('door 1 blocks before the wave, opens when the room clears, steps the quest',
            shut1 && open1.doorOpen && open1.questSteps >= 2, { shut1, open1 });
        await h.screenshot('dungeon-cleared');

        // --- 6. Deposing the boss opens the vault + pays the scoreboard ---
        const win = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, D = window.__D;
            pm.player.position.copyFrom(D.boss.position.add(new BABYLON.Vector3(0, 0.3, -2.2)));
            D.boss.hp = 1;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(D.boss.position);
            return true;
        });
        await h.waitFor(() => window.__D.vault.script._t === 1, null, 20000);
        const vault = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D.vault.position;
            const board = window.__D.board.script;
            return {
                open: !pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                score: board.score != null ? board.score : board.count,
                bossDown: window.__D.boss.defeated,
            };
        });
        console.log('[6] vault', vault);
        check('deposing the boss opens the loot vault and pays the scoreboard',
            vault.open && vault.score >= 5 && vault.bossDown, vault);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the dungeon', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — clear the rooms, fell the boss, loot the vault.'
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
