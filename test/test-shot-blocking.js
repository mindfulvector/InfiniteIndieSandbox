/*
 * Shot-blocking + terrain-block test
 * ----------------------------------
 * Action-driven checks with screenshots:
 *   - a player shot is stopped by a collidable block (the enemy behind it
 *     survives; the projectile is removed),
 *   - with the wall gone the same shot defeats the enemy,
 *   - an enemy shot is stopped by the wall too (player HP untouched),
 *   - the new terrain blocks (t_block_4/2/1) exist, wear the real grass/dirt
 *     atlas, and have collision when placed.
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
        await h.waitForReady(['t_tile', 't_block_4', 't_block_2', 't_block_1', 'en_blob']);
        // Flat template for clean sight lines.
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

        // --- 1. The new terrain blocks exist with the atlas + collision ---
        const blocks = await h.evaluate(() => {
            const out = {};
            ['t_block_4', 't_block_2', 't_block_1'].forEach((n) => {
                const wo = window.app.findWorldObject(n);
                out[n] = wo ? {
                    tex: wo.mesh.material && wo.mesh.material.diffuseTexture
                        ? wo.mesh.material.diffuseTexture.name : null,
                } : null;
            });
            return out;
        });
        console.log('\n[1] terrain blocks', blocks);
        ['t_block_4', 't_block_2', 't_block_1'].forEach((n) => {
            check(`${n} wears the real grass/dirt atlas`,
                blocks[n] && blocks[n].tex === 'grassDirtAtlas', blocks[n]);
        });

        // --- 2. A wall blocks the player's shot ---
        const blocked = await h.evaluate(async () => {
            const app = window.app, pm = app.activeMode;
            // Wall: a 2x2x2 block midway to the target (covers the shot line).
            const wall = app.findWorldObject('t_block_2').createInstance();
            wall.position = pm.player.position.add(new BABYLON.Vector3(4, 1.0, 0));
            const wallCollides = wall.checkCollisions === true;
            // Enemy behind the wall.
            const e = app.findWorldObject('en_blob').createInstance();
            e.position = pm.player.position.add(new BABYLON.Vector3(8, 1.3, 0));
            e.hp = 1;
            window.__ids = { wall: wall.worldId, blob: e.worldId };
            pm.rangedCooldown = 0;
            pm.rangedAttack(e.position.clone());
            const fired = pm.playerProjectiles.length;
            await new Promise((r) => { let n = 0; const t = () => (++n >= 60 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            const alive = app.findWorldObject('en_blob').instances.filter(Boolean)
                .filter((i) => !i.defeated).length;
            return { wallCollides, fired, alive, projectilesLeft: pm.playerProjectiles.length };
        });
        console.log('\n[2] wall blocks the shot', blocked);
        check('a placed terrain block has collision', blocked.wallCollides === true, blocked);
        check('the shot was fired', blocked.fired >= 1, blocked);
        check('the wall stopped the shot (enemy survives, projectile gone)',
            blocked.alive === 1 && blocked.projectilesLeft === 0, blocked);
        await h.screenshot('shot-blocked');

        // --- 3. Without the wall the same shot connects ---
        const open = await h.evaluate(async () => {
            const app = window.app, pm = app.activeMode, ids = window.__ids;
            const wallWo = app.findWorldObject('t_block_2');
            wallWo.disposeInstance(app.findInstance('t_block_2', ids.wall));
            const e = app.findInstance('en_blob', ids.blob);
            pm.rangedCooldown = 0;
            pm.rangedAttack(e.getAbsolutePosition().clone());
            await new Promise((r) => { let n = 0; const t = () => (++n >= 60 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            const alive = app.findWorldObject('en_blob').instances.filter(Boolean)
                .filter((i) => !i.defeated).length;
            return { alive };
        });
        console.log('\n[3] open shot', open);
        check('with the wall gone the shot defeats the enemy', open.alive === 0, open);

        // --- 4. Enemy shots are blocked too ---
        const enemyShot = await h.evaluate(async () => {
            const app = window.app, pm = app.activeMode, em = pm.enemyManager;
            // Fresh wall between a walker and the player.
            const wall = app.findWorldObject('t_block_2').createInstance();
            wall.position = pm.player.position.add(new BABYLON.Vector3(4, 1.0, 0));
            em.spawnWalker();
            const rec = em.enemies[0];
            rec.speed = 0; rec.fade = 0; rec.rangedCd = 9999;   // we fire manually
            rec.mesh.position = pm.player.position.add(new BABYLON.Vector3(8, 0.2, 0));
            pm.playerHp = pm.playerMaxHp; pm.hurtCooldown = 0;
            const hp0 = pm.playerHp;
            em.fireProjectile(rec, pm.player.position.clone());
            const fired = em.projectiles.length;
            await new Promise((r) => { let n = 0; const t = () => (++n >= 60 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { fired, hp0: Math.round(hp0), hp1: Math.round(pm.playerHp),
                projectilesLeft: em.projectiles.length };
        });
        console.log('\n[4] enemy shot blocked', enemyShot);
        check('the enemy fired', enemyShot.fired >= 1, enemyShot);
        check('the wall stopped the enemy shot (player HP untouched)',
            enemyShot.hp1 >= enemyShot.hp0 - 1 && enemyShot.projectilesLeft === 0, enemyShot);
        await h.screenshot('enemy-shot-blocked');

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — walls stop shots both ways, and the grass/dirt terrain blocks are in.'
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
