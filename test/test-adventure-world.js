/*
 * Aether Ruins adventure-world test
 * ---------------------------------
 * A flagship world that stitches the newest toys together: a combat AND
 * gate (turret + wave), checkpoints, a teleporter puzzle, gates, and a
 * vault. Verifies end to end:
 *   - imports with turret, spawner(wave), 2 gates, 2 checkpoints, 2
 *     teleport pads, a key-star, and the vault chest, all wired,
 *   - STAGE 1: door 1 stays shut until BOTH the turret is destroyed AND the
 *     wave is cleared (the AND gate),
 *   - a checkpoint past door 1 moves the respawn point,
 *   - STAGE 2: the teleport pad warps the player to the key-star ledge; the
 *     star opens door 2,
 *   - STAGE 3: the vault chest pays the scoreboard and finishes the quest,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7116 });
    try {
        await h.start();
        await h.waitForReady(['en_turret', 'l_checkpoint', 'l_teleport', 'l_gate', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/aether-ruins.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const gates = live('l_gate');
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                window.__A = {
                    turret: live('en_turret')[0],
                    spawner: live('l_spawner').find((s) => s.params.wave === 3),
                    gate1: gates.find((g) => g.params.mode === 'all'),
                    gate2: gates.find((g) => g.params.mode === 'any'),
                    door1: live('pr_door').find((d) => Math.abs(d.position.z - 6.02) < 0.5),
                    door2: live('pr_door').find((d) => Math.abs(d.position.z - 22.02) < 0.5),
                    cps: live('l_checkpoint'),
                    tels: live('l_teleport'),
                    star: live('pk_star')[0],
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                };
                const A = window.__A;
                A.gate1.script.onPlayReset(app.activeMode);
                A.gate2.script.onPlayReset(app.activeMode);
                return { ok,
                    hasAll: !!(A.turret && A.spawner && A.gate1 && A.gate2 && A.door1 && A.door2 &&
                        A.cps.length === 2 && A.tels.length === 2 && A.star && A.chest),
                    turretWired: A.turret.wires.some((w) => w.toWo === 'l_gate'),
                    gate1Needs2: A.gate1.params.need === 2 };
            }));
        console.log('\n[1] inventory', inv);
        check('the adventure imports with all stages wired (turret+wave AND, teleporters, checkpoints, vault)',
            inv.ok && inv.hasAll && inv.turretWired && inv.gate1Needs2, inv);
        await h.waitFrames(5);

        const doorShut = (which) => h.evaluate((w) => {
            const pm = window.app.activeMode, D = window.__A[w].position;
            return pm.projectileBlocked(
                new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5));
        }, which);

        // --- 2. STAGE 1: door 1 needs BOTH turret defeated AND wave cleared ---
        const d1Before = await doorShut('door1');
        // Only the turret defeated: door stays shut.
        await h.evaluate(() => {
            const pm = window.app.activeMode, A = window.__A;
            A.turret.script.onInput && 0;
            pm.defeatEnemy(A.turret, window.app.findWorldObject('en_turret'));
            A.gate1.script.update(true, pm);
        });
        const d1TurretOnly = await doorShut('door1');
        // Now clear the wave too (fire the spawner's cleared into the gate).
        await h.evaluate(() => {
            const pm = window.app.activeMode, A = window.__A;
            A.gate1.script.onInput('on', A.spawner);   // simulate wave cleared
            A.gate1.script.update(true, pm);
        });
        await h.waitFor(() => window.__A.door1.script._t === 1, null, 20000);
        console.log('[2] stage1', { d1Before, d1TurretOnly });
        check('door 1 stays shut with only the turret defeated',
            d1Before && d1TurretOnly, { d1Before, d1TurretOnly });
        const d1Now = await doorShut('door1');
        check('destroying the turret AND clearing the wave opens door 1', !d1Now, { d1Now });
        await h.screenshot('aether-stage1');

        // --- 3. Checkpoint 1 moves the respawn point ---
        const cp = await h.evaluate(() => {
            const pm = window.app.activeMode, A = window.__A;
            const cp1 = A.cps.find((c) => Math.abs(c.position.z - 9) < 1);
            pm.player.position.copyFrom(cp1.position);
            cp1.script.update(true, pm);
            return { active: cp1.script._active,
                spawnAtCp: BABYLON.Vector3.Distance(pm.spawnPoint, cp1.position) < 2 };
        });
        console.log('[3] checkpoint', cp);
        check('the stage-1 checkpoint moves the respawn point', cp.active && cp.spawnAtCp, cp);

        // --- 4. STAGE 2: teleport to the key-star, which opens door 2 ---
        const d2Before = await doorShut('door2');
        const tele = await h.evaluate(() => {
            const pm = window.app.activeMode, A = window.__A;
            const padA = A.tels.find((t) => Math.abs(t.position.z - 16) < 1 && t.position.x < 10);
            const padB = A.tels.find((t) => t.position.x > 10);
            pm._teleportCool = 0;
            pm.player.position.copyFrom(padA.position);
            padA.script.update(true, pm);
            const warped = BABYLON.Vector3.Distance(pm.player.position, padB.position) < 2.5;
            // On the ledge now: collect the key-star.
            A.star.script._collected = false;
            pm.player.position.copyFrom(A.star.position);
            A.star.script.update(true, pm);
            A.gate2.script.update(true, pm);
            return { warped };
        });
        await h.waitFor(() => window.__A.door2.script._t === 1, null, 20000);
        const d2Open = await doorShut('door2');
        console.log('[4] stage2', { d2Before, tele, d2Open });
        check('the teleport pad warps the player to the key-star ledge', tele.warped, tele);
        check('collecting the key-star opens door 2', d2Before && !d2Open, { d2Before, d2Open });

        // --- 5. STAGE 3: the vault chest pays out and finishes the quest ---
        const vault = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, A = window.__A;
            // Checkpoint 2, then open the vault chest.
            const cp2 = A.cps.find((c) => Math.abs(c.position.z - 25) < 1);
            pm.player.position.copyFrom(cp2.position); cp2.script.update(true, pm);
            pm.player.position.copyFrom(A.chest.position);
            A.chest.script._wasPlay = null; A.chest.script.update(true, pm);   // settle
            A.chest.script.update(true, pm);                                   // walk-up open
            return { chestOpen: A.chest.script._open,
                score: A.board.script.score != null ? A.board.script.score : A.board.script.count,
                questSteps: A.quest.script._done.size };
        });
        console.log('[5] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 3, vault);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the adventure', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — fight the gate, warp to the key, and loot the ruins.'
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
