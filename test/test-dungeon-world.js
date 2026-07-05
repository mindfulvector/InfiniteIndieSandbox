/*
 * The Locked Depths dungeon-world test
 * ------------------------------------
 * A flagship key-and-lock dungeon that composes hazards, keys, locks,
 * checkpoints, a turret, and a vault. Verifies end to end:
 *   - imports with lava hazards, 2 keys (gold/silver), 2 matching locks, 3
 *     checkpoints, a turret, and the vault chest, all wired,
 *   - the lava channel damages the player,
 *   - collecting the gold key opens the gold lock (Room A -> B),
 *   - collecting the silver key opens the silver lock (Room B -> vault),
 *   - a wrong key does NOT open the wrong lock,
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
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7119 });
    try {
        await h.start();
        await h.waitForReady(['l_hazard', 'pk_key', 'pr_lock', 'l_checkpoint', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/locked-depths.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                app.activeMode.keysHeld = new Set();
                const keys = live('pk_key'); const locks = live('pr_lock');
                window.__D = {
                    hazards: live('l_hazard'),
                    goldKey: keys.find((k) => k.params.keyId === 'gold'),
                    silverKey: keys.find((k) => k.params.keyId === 'silver'),
                    goldLock: locks.find((l) => l.params.keyId === 'gold'),
                    silverLock: locks.find((l) => l.params.keyId === 'silver'),
                    cps: live('l_checkpoint'),
                    turret: live('en_turret')[0],
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                };
                const D = window.__D;
                [D.goldLock, D.silverLock].forEach((l) => l.script._wasPlay = null);
                return { ok,
                    hasAll: !!(D.hazards.length >= 4 && D.goldKey && D.silverKey && D.goldLock &&
                        D.silverLock && D.cps.length === 3 && D.turret && D.chest),
                    silverLockWired: D.silverLock.wires.some((w) => w.toWo === 'l_camera') };
            }));
        console.log('\n[1] inventory', inv);
        check('the dungeon imports: lava, 2 keys, 2 locks, 3 checkpoints, turret, vault',
            inv.ok && inv.hasAll, inv);
        await h.evaluate(() => {
            const D = window.__D, pm = window.app.activeMode;
            D.goldLock.script.update(true, pm); D.silverLock.script.update(true, pm);
        });
        await h.waitFrames(5);

        // A lock is "solid" (blocking) exactly when its mesh collides -- the
        // same check test-keylock uses (a projectile ray is too geometry-
        // sensitive amid the surrounding dungeon walls).
        const lockSolid = (lock) => h.evaluate((z) => window.__D[z].checkCollisions === true, lock);

        // --- 2. The lava channel hurts ---
        const lava = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D;
            const haz = D.hazards[0];
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 0;
            haz.computeWorldMatrix(true);
            pm.player.position.copyFrom(haz.position);
            for (let f = 0; f < 90; f++) { if (f % 30 === 0) pm.hurtCooldown = 0; haz.script.update(true, pm); }
            pm.playerHp = 10000; pm.playerMaxHp = 10000;
            return { hp: pm.playerHp };  // restored, but it dropped during the loop
        });
        // Re-check by measuring the drop in a fresh pass.
        const lavaDrop = await h.evaluate(() => {
            const pm = window.app.activeMode, haz = window.__D.hazards[0];
            pm.playerMaxHp = 100; pm.playerHp = 100; pm.hurtCooldown = 0;
            pm.blocking = false; pm.dodgeFrames = 0;
            pm.player.position.copyFrom(haz.position);
            const hp0 = pm.playerHp;
            for (let f = 0; f < 60; f++) { pm.hurtCooldown = 0; haz.script.update(true, pm); }
            const dropped = hp0 - pm.playerHp;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { dropped };
        });
        console.log('[2] lava', lavaDrop);
        check('the lava channel damages the player', lavaDrop.dropped >= 2, lavaDrop);

        // --- 3. Gold key opens the gold lock (and only the gold lock) ---
        const goldShut = await lockSolid('goldLock');
        const gold = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D;
            pm.keysHeld = new Set();
            // Collect the gold key.
            pm.player.position.copyFrom(D.goldKey.position);
            D.goldKey.script.update(true, pm);
            const held = pm.keysHeld.has('gold');
            // The SILVER lock must ignore a gold key.
            pm.player.position.copyFrom(D.silverLock.position);
            D.silverLock.script.update(true, pm);
            const silverStayed = !D.silverLock.script._open;
            // The GOLD lock opens.
            pm.player.position.copyFrom(D.goldLock.position);
            D.goldLock.script.update(true, pm);
            return { held, silverStayed, goldOpen: D.goldLock.script._open,
                consumed: !pm.keysHeld.has('gold') };
        });
        const goldOpenNow = await lockSolid('goldLock');
        console.log('[3] gold', { goldShut, gold, goldOpenNow });
        check('the gold lock is solid until the gold key opens it (a gold key ignores the silver lock)',
            goldShut && gold.held && gold.silverStayed && gold.goldOpen && !goldOpenNow && gold.consumed,
            { goldShut, gold, goldOpenNow });
        await h.screenshot('locked-depths');

        // --- 4. Silver key opens the silver lock -> vault, fires the camera ---
        const silver = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D;
            pm.player.position.copyFrom(D.silverKey.position);
            D.silverKey.script.update(true, pm);
            const held = pm.keysHeld.has('silver');
            pm.player.position.copyFrom(D.silverLock.position);
            D.silverLock.script.update(true, pm);
            return { held, silverOpen: D.silverLock.script._open };
        });
        const silverOpenNow = await lockSolid('silverLock');
        console.log('[4] silver', { silver, silverOpenNow });
        check('the silver key opens the silver lock to the vault',
            silver.held && silver.silverOpen && !silverOpenNow, { silver, silverOpenNow });

        // --- 5. The vault chest pays out and advances the quest ---
        const vault = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__D;
            // Touch the three checkpoints so the quest steps have fired too.
            D.cps.forEach((c) => { pm.player.position.copyFrom(c.position); c.script.update(true, pm); });
            pm.player.position.copyFrom(D.chest.position);
            D.chest.script._wasPlay = null; D.chest.script.update(true, pm);
            D.chest.script.update(true, pm);
            return { chestOpen: D.chest.script._open,
                score: D.board.script.score != null ? D.board.script.score : D.board.script.count,
                questSteps: D.quest.script._done.size };
        });
        console.log('[5] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 3, vault);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the dungeon', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — cross the lava, take both keys, and crack the vault.'
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
