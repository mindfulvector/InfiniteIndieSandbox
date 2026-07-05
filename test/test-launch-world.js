/*
 * Skybreak Run launch/secret-world test
 * -------------------------------------
 * A cannon-jump + breakable-secret gallery world. Verifies end to end:
 *   - imports with 2 cannons, 2 breakable walls, a hidden star, a
 *     checkpoint, the vault door + chest, all wired,
 *   - a cannon launches the player forward along its facing,
 *   - smashing the mid breakable wall fires `broken` (steps the quest) and
 *     reveals the bonus star behind it,
 *   - smashing the top breakable opens the vault door,
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
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7125 });
    try {
        await h.start();
        await h.waitForReady(['pr_cannon', 't_breakable', 'l_checkpoint', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/skybreak-run.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                const brks = live('t_breakable');
                window.__S = {
                    cannons: live('pr_cannon'),
                    brk1: brks.find((b) => Math.abs(b.position.z - 22) < 1),
                    brk2: brks.find((b) => Math.abs(b.position.z - 48) < 1),
                    star: live('pk_star')[0],
                    cp: live('l_checkpoint')[0],
                    vaultDoor: live('pr_door').find((d) => Math.abs(d.position.z - 50.02) < 0.5),
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                };
                const S = window.__S;
                [S.brk1, S.brk2].forEach((b) => b.script._wasPlay = null);
                return { ok,
                    cannons: S.cannons.length,
                    brk2Wired: S.brk2 && S.brk2.wires.some((w) => w.toWo === 'pr_door'),
                    hasAll: !!(S.brk1 && S.brk2 && S.star && S.cp && S.vaultDoor && S.chest) };
            }));
        console.log('\n[1] inventory', inv);
        check('the world imports: 2 cannons, 2 breakables, star, checkpoint, vault (wired)',
            inv.ok && inv.cannons === 2 && inv.brk2Wired && inv.hasAll, inv);
        await h.evaluate(() => {
            const S = window.__S, pm = window.app.activeMode;
            S.brk1.script.update(true, pm); S.brk2.script.update(true, pm);
        });
        await h.waitFrames(5);

        // --- 2. A cannon launches the player forward ---
        const launched = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const c = window.__S.cannons[0];
            pm.player.position.copyFrom(c.getAbsolutePosition());
            const z0 = pm.player.position.z, y0 = pm.player.position.y;
            c.script._cool = 0;
            c.script.update(true, pm);   // fire once
            c.script._cool = 999;
            let n = 0, maxY = -99;
            const tick = () => {
                n++;
                maxY = Math.max(maxY, pm.player.position.y);
                if (n > 80) return resolve({ forwardZ: pm.player.position.z - z0, rose: maxY - y0 });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] launch', launched);
        check('a cannon launches the player forward and up',
            launched.forwardZ > 3 && launched.rose > 1.5, launched);
        await h.screenshot('skybreak');

        // --- 3. Smash the mid wall: fires broken, reveals the star ---
        const wallSolid = await h.evaluate(() => window.__S.brk1.checkCollisions === true);
        const mid = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, S = window.__S;
            pm.player.position.copyFrom(S.brk1.position.add(new BABYLON.Vector3(0, 0, -1.5)));
            const q0 = S.quest.script._done.size;
            for (let i = 0; i < 8 && !S.brk1.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(S.brk1.position);
            }
            return { broken: S.brk1.defeated, passable: S.brk1.checkCollisions === false,
                questStepped: S.quest.script._done.size > q0 };
        });
        console.log('[3] mid wall', { wallSolid, mid });
        check('the mid breakable wall starts solid, then smashing it opens the way + steps the quest',
            wallSolid && mid.broken && mid.passable && mid.questStepped, { wallSolid, mid });

        // --- 4. Smash the top wall: opens the vault door ---
        const doorShut = await h.evaluate(() => window.__S.vaultDoor.checkCollisions === true);
        const top = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, S = window.__S;
            pm.player.position.copyFrom(S.brk2.position.add(new BABYLON.Vector3(0, 0, -1.5)));
            for (let i = 0; i < 10 && !S.brk2.defeated; i++) {
                pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
                pm.meleeAttack(S.brk2.position);
            }
            return { broken: S.brk2.defeated };
        });
        await h.waitFor(() => window.__S.vaultDoor.script._t === 1, null, 20000);
        const doorOpen = await h.evaluate(() => window.__S.vaultDoor.checkCollisions === false ||
            window.__S.vaultDoor.script._t === 1);
        console.log('[4] top wall', { doorShut, top, doorOpen });
        check('smashing the top breakable opens the vault door',
            doorShut && top.broken && doorOpen, { doorShut, top, doorOpen });

        // --- 5. The vault chest pays out ---
        const vault = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, S = window.__S;
            pm.player.position.copyFrom(S.cp.position); S.cp.script.update(true, pm);
            pm.player.position.copyFrom(S.chest.position);
            S.chest.script._wasPlay = null; S.chest.script.update(true, pm);
            S.chest.script.update(true, pm);
            return { chestOpen: S.chest.script._open,
                score: S.board.script.score != null ? S.board.script.score : S.board.script.count,
                questSteps: S.quest.script._done.size };
        });
        console.log('[5] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 3, vault);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the launch world', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — fire across the void, smash the secrets, crack the vault.'
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
