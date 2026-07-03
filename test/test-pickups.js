/*
 * Pickup system test
 * ------------------
 * Verifies the PickupScript-driven pickups (pk_health / pk_pixels / pk_star):
 *   - a health pickup restores HP by its amount and (respawn 'no' default) is
 *     disposed for good once collected,
 *   - a pixels pickup grants exactly its amount of currency,
 *   - a pickup with respawn = 5 hides on collect and reappears after ~5s,
 *   - pickups bob (animate) while waiting to be collected,
 *   - a star pickup increments the star counter and its 'collected' wiring
 *     output can drive a spawner's 'spawn' input.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7021 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pk_health', 'pk_pixels', 'pk_star', 'l_spawner']);

        // Reset the economy so pixel assertions are exact.
        await h.evaluate(() => { window.app.pixels = 0; window.app.saveEconomy(); });

        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        // Suppress ambient enemies so nothing else awards pixels or hits the player.
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // --- 1. HEALTH: restores HP by its amount, then disposes (respawn 'no') ---
        const hpSetup = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.playerHp = 40;
            const wo = window.app.findWorldObject('pk_health');
            const inst = wo.createInstance();
            inst.position = pm.player.position.clone();
            return { hp0: pm.playerHp, worldId: inst.worldId, params: inst.params };
        });
        console.log('\n[1] health pickup', hpSetup);
        await h.waitFor(() => window.app.activeMode.playerHp >= 60, null, 20000);
        const hpRes = await h.evaluate(() => ({
            hp: window.app.activeMode.playerHp,
            live: window.app.findWorldObject('pk_health').instances.filter(Boolean).length,
        }));
        console.log('[1] after collect', hpRes);
        check('health pickup restores ~amount HP (40 -> >=60, <=72 allowing regen)',
            hpRes.hp >= 60 && hpRes.hp <= 72, hpRes);
        check('collected health pickup is disposed (default respawn \'no\')',
            hpRes.live === 0, hpRes);

        // --- 2. PIXELS: grants exactly its amount ---
        const pxSetup = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const wo = window.app.findWorldObject('pk_pixels');
            const px0 = window.app.pixels;
            const inst = wo.createInstance();
            inst.position = pm.player.position.clone();
            return { px0, amount: inst.params.amount };
        });
        console.log('\n[2] pixels pickup', pxSetup);
        await h.waitFor((px0) => window.app.pixels >= px0 + 10, pxSetup.px0, 20000);
        const pxRes = await h.evaluate(() => ({
            px: window.app.pixels,
            live: window.app.findWorldObject('pk_pixels').instances.filter(Boolean).length,
        }));
        console.log('[2] after collect', pxRes);
        check('pixels pickup grants exactly +10 pixels (no other sources active)',
            pxRes.px === pxSetup.px0 + 10, { px0: pxSetup.px0, px1: pxRes.px });

        // --- 3. RESPAWN: respawn=5 hides the pickup, then it reappears ---
        const rsSetup = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const wo = window.app.findWorldObject('pk_health');
            const inst = wo.createInstance();
            inst.position = pm.player.position.clone();
            inst.params.respawn = 5;
            return { worldId: inst.worldId, hp: pm.playerHp };
        });
        console.log('\n[3] respawning pickup', rsSetup);
        // Wait for the touch-collect (hp may be full; collection still happens).
        await h.waitFor((id) => {
            const inst = window.app.findInstance('pk_health', id);
            return !!inst && (inst.script._collected === true || inst.isVisible === false);
        }, rsSetup.worldId, 20000);
        // Move it out of collect range while hidden so the reappearance is
        // stable (otherwise it would be re-collected the frame it respawns,
        // which low-fps polling can miss entirely).
        await h.evaluate((id) => {
            const inst = window.app.findInstance('pk_health', id);
            inst.position.x -= 8;
        }, rsSetup.worldId);
        await h.waitFor((id) => {
            const inst = window.app.findInstance('pk_health', id);
            return !!inst && inst.isVisible === true && inst.script._collected === false;
        }, rsSetup.worldId, 30000);
        const rsRes = await h.evaluate((id) => {
            const inst = window.app.findInstance('pk_health', id);
            return { alive: !!inst, visible: inst ? inst.isVisible : null,
                collected: inst ? inst.script._collected : null };
        }, rsSetup.worldId);
        console.log('[3] after respawn', rsRes);
        check('respawn=5 pickup reappears after its delay', rsRes.alive && rsRes.visible === true, rsRes);
        check('respawned pickup instance is still alive (not disposed)', rsRes.alive, rsRes);

        // --- 4. BOB: an uncollected pickup animates (position.y oscillates) ---
        const starId = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const wo = window.app.findWorldObject('pk_star');
            const inst = wo.createInstance();
            inst.position = pm.player.position.add(new BABYLON.Vector3(6, 0, 0)); // outside collect range
            return inst.worldId;
        });
        await h.waitFrames(5);
        await h.screenshot('pickups-visible');
        const ys = await h.sampleSeries((id) => {
            const inst = window.app.findInstance('pk_star', id);
            return inst ? Math.round(inst.position.y * 100000) / 100000 : null;
        }, { samples: 8, everyFrames: 3, arg: starId });
        const distinctY = new Set(ys).size;
        console.log('\n[4] bob samples', ys);
        check('pickup bobs while idle (>= 3 distinct y values over 8 samples)',
            distinctY >= 3, { ys, distinctY });

        // --- 5. STAR + WIRING: collect increments stars and fires 'collected' wire ---
        const wireSetup = await h.evaluate((id) => {
            const app = window.app, pm = app.activeMode;
            const swo = app.findWorldObject('l_spawner');
            const sp = swo.createInstance();
            sp.position = pm.player.position.add(new BABYLON.Vector3(3, 0, 3));
            sp.params.enemyType = 'flyer';
            sp.params.limit = 1;
            sp.params.startActive = 'no';
            sp.params.frequency = 1;
            const star = app.findInstance('pk_star', id);
            app.addWire(star, 'collected', 'l_spawner', sp.worldId, 'spawn');
            // Move the star onto the player to collect it.
            star.position = pm.player.position.clone();
            return { spawnerId: sp.worldId, stars0: pm.starsCollected || 0,
                enemies0: pm.enemyManager.enemies.length };
        }, starId);
        console.log('\n[5] star + wire setup', wireSetup);
        await h.waitFor(() => {
            const pm = window.app.activeMode;
            return (pm.starsCollected || 0) >= 1 && pm.enemyManager.enemies.length >= 1;
        }, null, 20000);
        const wireRes = await h.evaluate(() => ({
            stars: window.app.activeMode.starsCollected,
            enemies: window.app.activeMode.enemyManager.enemies.length,
            kinds: window.app.activeMode.enemyManager.enemies.map((e) => e.kind),
            starLive: window.app.findWorldObject('pk_star').instances.filter(Boolean).length,
        }));
        console.log('[5] after collect', wireRes);
        check('collecting the star increments starsCollected', wireRes.stars >= 1, wireRes);
        check('the collected wire fired the spawner (an enemy spawned)', wireRes.enemies >= 1, wireRes);
        check('the collected star is disposed (default respawn \'no\')', wireRes.starLive === 0, wireRes);
        await h.screenshot('star-wire-spawned');

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — pickups heal, pay, respawn, bob, and fire their collected wiring.'
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
