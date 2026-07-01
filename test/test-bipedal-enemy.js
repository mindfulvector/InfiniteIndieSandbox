/*
 * Bipedal-enemy test
 * ------------------
 * Verifies the bipedal TRON walker:
 *   - uses the shared GravityBody (falls from spawn and lands on the terrain),
 *   - walks toward the player,
 *   - lands a melee hit when adjacent,
 *   - fires a ranged projectile that damages the player at mid range,
 *   - is defeatable for pixels.
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
        // Turn off ambient spawning and clear the field so nothing interferes
        // (e.g. the player standing on an auto-spawned enemy).
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);   // let the player settle onto the terrain

        // --- 1. Spawn a walker; it uses GravityBody and lands on the terrain ---
        const land = await h.evaluate(async () => {
            const pm = window.app.activeMode;
            // clear any auto-spawned enemies for a clean read
            pm.enemyManager.enemies.forEach((x) => x.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.enemyManager.spawnWalker();
            const e = pm.enemyManager.enemies[0];
            // Drop it straight down onto the terrain, away from the player, so we
            // isolate gravity/landing (no walking onto the player's collider).
            const p = pm.player.position;
            e.speed = 0;
            e.mesh.position = new BABYLON.Vector3(p.x + 2.5, p.y + 4, p.z + 2.5);
            const y0 = e.mesh.position.y;
            const usesGravity = !!(e.body && typeof e.body.step === 'function' && typeof e.body.grounded === 'boolean');
            await new Promise((r) => { let n = 0; const t = () => (++n >= 90 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            const alive = pm.enemyManager.enemies.indexOf(e) >= 0;
            return { kind: e.kind, usesGravity, y0: Math.round(y0 * 100) / 100,
                y1: alive ? Math.round(e.mesh.position.y * 100) / 100 : null,
                grounded: alive ? e.body.grounded : null, playerY: Math.round(pm.player.position.y * 100) / 100 };
        });
        console.log('\n[1] gravity/landing', land);
        check('walker is a bipedal (walker) enemy', land.kind === 'walker', land);
        check('walker uses the shared GravityBody', land.usesGravity === true, land);
        check('walker fell from spawn and settled on the terrain',
            land.y1 !== null && land.y1 < land.y0 && land.grounded === true && land.y1 < 1.5, land);
        await h.waitFrames(4);
        await h.screenshot('bipedal-enemy');

        // --- 2. It walks toward the player ---
        const walk = await h.evaluate(async () => {
            const pm = window.app.activeMode;
            let e = pm.enemyManager.enemies.find((x) => x.kind === 'walker');
            if (!e) { pm.enemyManager.spawnWalker(); e = pm.enemyManager.enemies.find((x) => x.kind === 'walker'); }
            // Place it a clear distance beyond melee range (on the platform).
            const p = pm.player.position;
            e.speed = 3;   // (an earlier step may have zeroed it)
            e.mesh.position = new BABYLON.Vector3(p.x + 4.0, p.y + 0.2, p.z);
            const horiz = () => Math.hypot(e.mesh.position.x - pm.player.position.x, e.mesh.position.z - pm.player.position.z);
            const d0 = horiz();
            await new Promise((r) => { let n = 0; const t = () => (++n >= 60 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { d0: Math.round(d0 * 100) / 100, d1: Math.round(horiz() * 100) / 100 };
        });
        console.log('[2] chase', walk);
        check('walker moves toward the player', walk.d1 < walk.d0, walk);

        // --- 3. Melee: adjacent walker damages the player ---
        const melee = await h.evaluate(async () => {
            const pm = window.app.activeMode;
            pm.playerHp = pm.playerMaxHp; pm.hurtCooldown = 0;
            let e = pm.enemyManager.enemies.find((x) => x.kind === 'walker');
            if (!e) { pm.enemyManager.spawnWalker(); e = pm.enemyManager.enemies.find((x) => x.kind === 'walker'); }
            e.meleeCd = 0; e.fade = 0;
            e.mesh.position = pm.player.position.add(new BABYLON.Vector3(1.2, 0, 0));
            const hp0 = pm.playerHp;
            await new Promise((r) => { let n = 0; const t = () => (++n >= 20 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { hp0: Math.round(hp0), hp1: Math.round(pm.playerHp) };
        });
        console.log('[3] melee', melee);
        check('walker melee damages the player when adjacent', melee.hp1 < melee.hp0, melee);

        // --- 4. Ranged: a mid-range walker fires a projectile that hurts the player ---
        const ranged = await h.evaluate(async () => {
            const pm = window.app.activeMode;
            pm.playerHp = pm.playerMaxHp; pm.hurtCooldown = 0;
            pm.enemyManager.projectiles.forEach((pr) => pr.mesh.dispose()); pm.enemyManager.projectiles = [];
            let e = pm.enemyManager.enemies.find((x) => x.kind === 'walker');
            if (!e) { pm.enemyManager.spawnWalker(); e = pm.enemyManager.enemies.find((x) => x.kind === 'walker'); }
            e.rangedCd = 0; e.fade = 0;
            e.mesh.position = pm.player.position.add(new BABYLON.Vector3(7, 0, 0)); // mid range
            const hp0 = pm.playerHp;
            let firedMax = 0;
            await new Promise((r) => { let n = 0; const t = () => { firedMax = Math.max(firedMax, pm.enemyManager.projectiles.length); return (++n >= 90 ? r() : requestAnimationFrame(t)); }; requestAnimationFrame(t); });
            return { hp0: Math.round(hp0), hp1: Math.round(pm.playerHp), firedMax };
        });
        console.log('[4] ranged', ranged);
        check('walker fires a ranged projectile', ranged.firedMax > 0, ranged);
        check('the projectile damages the player', ranged.hp1 < ranged.hp0, ranged);

        // --- 5. Defeatable for pixels ---
        const kill = await h.evaluate(async () => {
            const pm = window.app.activeMode;
            const px0 = window.app.pixels;
            let e = pm.enemyManager.enemies.find((x) => x.kind === 'walker');
            if (!e) { pm.enemyManager.spawnWalker(); e = pm.enemyManager.enemies.find((x) => x.kind === 'walker'); }
            e.hp = 1;
            const n0 = pm.enemyManager.enemies.length;
            pm.enemyManager.damageNear(e.mesh.position, 1.0, 5);   // direct hit
            const n1 = pm.enemyManager.enemies.length;
            await new Promise((r) => { let n = 0; const t = () => (++n >= 60 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { n0, n1, gainedPixels: window.app.pixels > px0 };
        });
        console.log('[5] defeat', kill);
        check('walker can be defeated', kill.n1 < kill.n0, kill);
        check('defeating the walker awards pixels', kill.gainedPixels === true, kill);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — bipedal TRON walker uses gravity, walks, melees, shoots, and drops pixels.'
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
