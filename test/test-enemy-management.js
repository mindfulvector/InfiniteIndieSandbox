/*
 * Enemy-management test
 * ---------------------
 * Verifies the auto-spawning TRON enemy system:
 *   - enemies spawn automatically in play mode,
 *   - they chase the player (distance closes over time),
 *   - attacking one defeats it and awards pixels,
 *   - an enemy in range damages the player's health,
 *   - leaving play mode disposes all enemies.
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
        await h.waitForReady(['t_cube_1x1', 'en_blob']);
        await h.evaluate(() => { window.app.pixels = 0; window.app.saveEconomy(); });

        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        // Ambient wave spawning is off by default (blank sandboxes stay empty);
        // this test exercises that wave system, so switch it on explicitly.
        await h.evaluate(() => { window.app.activeMode.enemyManager.autoSpawn = true; });
        await h.waitFrames(10);

        // --- 1. Enemies auto-spawn ---
        await h.waitFor(() => window.app.activeMode.enemyManager.enemies.length > 0, null, 15000).catch(() => {});
        const spawned = await h.evaluate(() => window.app.activeMode.enemyManager.enemies.length);
        console.log('\n[1] auto-spawn', { spawned });
        check('enemies spawn automatically in play mode', spawned > 0, { spawned });
        await h.waitFrames(30);
        await h.screenshot('tron-enemies');

        // From here on, control the enemy set explicitly (ambient spawning off).
        await h.evaluate(() => { window.app.activeMode.enemyManager.autoSpawn = false; });

        // --- 2. They chase the player ---
        const chase = await h.evaluate(async () => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.enemies.forEach((x) => x.mesh.dispose(false, false)); em.enemies = [];
            const e = em.spawnEnemy();          // a flyer
            const p = pm.player.position;
            e.fade = 0;
            e.mesh.position = new BABYLON.Vector3(p.x + 8, p.y + 2, p.z);   // known far distance
            const d0 = BABYLON.Vector3.Distance(e.mesh.position, pm.player.position);
            await new Promise((r) => { let n = 0; const t = () => (++n >= 45 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            const d1 = (em.enemies.indexOf(e) >= 0)
                ? BABYLON.Vector3.Distance(e.mesh.position, pm.player.position) : 0;
            return { d0: Math.round(d0 * 100) / 100, d1: Math.round(d1 * 100) / 100 };
        });
        console.log('[2] chase', chase);
        check('an enemy moves toward the player', chase.d1 < chase.d0, chase);

        // --- 3. Attacking defeats an enemy and awards pixels ---
        const beforeKill = await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.enemies.forEach((x) => x.mesh.dispose(false, false)); em.enemies = [];
            const e = em.spawnEnemy(); e.hp = 1; e.fade = 0;
            e.mesh.position = pm.player.position.add(new BABYLON.Vector3(1.5, 0.5, 0));
            return { n: em.enemies.length, px: window.app.pixels };
        });
        await h.tapKey('F');
        await h.waitFor((n) => window.app.activeMode.enemyManager.enemies.length < n, beforeKill.n, 8000).catch(() => {});
        await h.waitFor((px) => window.app.pixels > px, beforeKill.px, 12000).catch(() => {});
        await h.waitFrames(10);
        const afterKill = await h.evaluate(() => ({ n: window.app.activeMode.enemyManager.enemies.length, px: window.app.pixels }));
        console.log('[3] attack', { beforeKill, afterKill });
        check('attacking defeated an enemy', afterKill.n < beforeKill.n, { beforeKill, afterKill });
        check('defeating a TRON enemy awarded pixels', afterKill.px > beforeKill.px, { beforeKill, afterKill });

        // --- 4. An enemy in range damages the player ---
        const hurt = await h.evaluate(async () => {
            const pm = window.app.activeMode;
            pm.playerHp = pm.playerMaxHp;
            pm.hurtCooldown = 0;
            // Use a fresh flyer right on top of the player, ready to strike.
            pm.enemyManager.enemies.forEach((x) => x.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.enemyManager.spawnEnemy();
            const e = pm.enemyManager.enemies[0];
            e.attackCd = 0;
            e.fade = 0;
            e.mesh.position = pm.player.position.add(new BABYLON.Vector3(1.0, 0, 0));
            const hp0 = pm.playerHp;
            await new Promise((r) => { let n = 0; const t = () => (++n >= 30 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { hp0: Math.round(hp0), hp1: Math.round(pm.playerHp) };
        });
        console.log('[4] player damage', hurt);
        check('an adjacent enemy damages the player', hurt.hp1 < hurt.hp0, hurt);

        // --- 5. Leaving play mode disposes enemies ---
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode');
        await h.waitFrames(4);
        const tron = await h.evaluate(() => window.app.scene.meshes.filter((m) => m.name === 'tronEnemy').length);
        console.log('[5] cleanup', { tronMeshes: tron });
        check('enemies are disposed when leaving play mode', tron === 0, { tron });

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — TRON enemies spawn, chase, are defeatable for pixels, and hurt the player.'
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
