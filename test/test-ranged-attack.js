/*
 * Ranged / mouse combat test
 * --------------------------
 * Verifies the mouse-driven combat added to play mode:
 *   - a ranged attack fires a projectile from the player that travels and
 *     defeats an enemy (awarding pixels),
 *   - firing turns the player's upper body to aim (aim pose engaged),
 *   - a right-click fires a ranged shot and a left-click swings a melee attack,
 *   - the melee path (F / left click) still defeats adjacent enemies.
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
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.evaluate(() => { window.app.pixels = 0; window.app.saveEconomy(); });
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // --- 1. Ranged attack: projectile travels and defeats an enemy ---
        // Use a static en_blob at shot height so the test isolates the projectile
        // (no gravity / rolling-terrain height mismatch).
        const ranged = await h.evaluate(async () => {
            const pm = window.app.activeMode;
            pm.playerProjectiles.forEach((pr) => pr.mesh.dispose()); pm.playerProjectiles = [];
            const wo = window.app.findWorldObject('en_blob');
            wo.instances.filter(Boolean).forEach((i) => wo.disposeInstance(i));
            const e = wo.createInstance();
            e.hp = 1;
            const target = pm.player.position.add(new BABYLON.Vector3(6, 1.3, 0));
            e.position = target.clone();
            const px0 = window.app.pixels;
            const n0 = wo.instances.filter(Boolean).length;
            pm.rangedCooldown = 0;
            pm.rangedAttack(target);
            const firedNow = pm.playerProjectiles.length;
            const aiming = pm.aimTimer;
            let maxProj = firedNow;
            await new Promise((r) => { let n = 0; const t = () => { maxProj = Math.max(maxProj, pm.playerProjectiles.length); return (++n >= 60 ? r() : requestAnimationFrame(t)); }; requestAnimationFrame(t); });
            return { firedNow, aiming, maxProj, n0, n1: wo.instances.filter(Boolean).length, px0, px1: window.app.pixels };
        });
        console.log('\n[1] ranged', ranged);
        check('ranged attack spawns a projectile', ranged.firedNow >= 1 && ranged.maxProj >= 1, ranged);
        check('firing engages the aim pose (upper body turns)', ranged.aiming > 0, ranged);
        check('the projectile defeats the enemy', ranged.n1 < ranged.n0, ranged);
        check('defeating with a ranged shot awards pixels', ranged.px1 > ranged.px0, ranged);
        await h.screenshot('ranged-attack');

        // --- 2. Right-click fires ranged; left-click swings melee ---
        const canvasBox = await h.evaluate(() => {
            const c = window.app.engine.getRenderingCanvas().getBoundingClientRect();
            return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
        });
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.playerProjectiles.forEach((pr) => pr.mesh.dispose()); pm.playerProjectiles = [];
            pm.attackFxList.forEach((fx) => fx.mesh.dispose()); pm.attackFxList = [];
            pm.rangedCooldown = 0; pm.attackCooldown = 0;
        });
        // Right-click -> ranged shot.
        await h.page.mouse.click(canvasBox.x, canvasBox.y, { button: 'right' });
        await h.waitFrames(2);
        const afterRight = await h.evaluate(() => window.app.activeMode.playerProjectiles.length);
        // Left-click -> melee swing.
        await h.evaluate(() => { window.app.activeMode.attackCooldown = 0; window.app.activeMode.attackFxList.forEach((fx) => fx.mesh.dispose()); window.app.activeMode.attackFxList = []; });
        await h.page.mouse.click(canvasBox.x, canvasBox.y, { button: 'left' });
        await h.waitFrames(2);
        const afterLeft = await h.evaluate(() => window.app.activeMode.attackFxList.length);
        console.log('[2] mouse', { afterRight, afterLeft });
        check('right-click fires a ranged projectile', afterRight >= 1, { afterRight });
        check('left-click swings a melee attack', afterLeft >= 1, { afterLeft });

        // --- 3. Melee still defeats an adjacent enemy (F / left click path) ---
        const melee = await h.evaluate(async () => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.enemies.forEach((e) => e.mesh.dispose(false, false)); em.enemies = [];
            em.spawnWalker(); const e = em.enemies[0]; e.hp = 1; e.speed = 0;
            e.mesh.position = pm.player.position.add(new BABYLON.Vector3(1.4, 0, 0));
            const n0 = em.enemies.length;
            pm.attackCooldown = 0;
            pm.meleeAttack();
            await new Promise((r) => { let n = 0; const t = () => (++n >= 10 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { n0, n1: em.enemies.length };
        });
        console.log('[3] melee', melee);
        check('melee defeats an adjacent enemy', melee.n1 < melee.n0, melee);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — ranged shots fire from the player and defeat enemies; mouse buttons drive melee/ranged.'
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
