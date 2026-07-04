/*
 * Hover-kart test
 * ---------------
 * Verifies the drivable vehicle v1:
 *   - pr_kart registers as a premium (shop-priced) multi-prim prop,
 *   - walking up to it mounts the player (driving set, controller stopped),
 *   - holding W drives it forward with momentum (speed builds, position
 *     moves along its facing) and the seated player rides along,
 *   - steering with D changes the kart's yaw while moving,
 *   - releasing the throttle bleeds speed off (drag),
 *   - Space dismounts beside the kart with a re-mount cooldown,
 *   - respawn while driving dismounts and parks the kart back at home,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7048 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pr_kart']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            window.app.pixels = 0; window.app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. Registration: premium multi-prim prop ---
        const reg = await h.evaluate(() => ({
            exists: !!window.app.findWorldObject('pr_kart'),
            price: window.app.priceOf('pr_kart'),
            cat: window.app.objectCategory('pr_kart'),
        }));
        console.log('\n[1] registration', reg);
        check('the kart registers as a priced PROPS object',
            reg.exists && reg.price === 60 && reg.cat === 'PROPS', reg);

        // --- 2. Walk-up mounting stops the controller ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const kart = app.findWorldObject('pr_kart').createInstance();
            kart.position = pm.player.position.add(new BABYLON.Vector3(4, 0.5, 0));
            window.__kart = kart;
            kart.script._wasPlay = null;   // play-transition snap for mid-play creation
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            // Step into mount range.
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__kart.position.add(new BABYLON.Vector3(0.5, 0.8, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__kart, null, 20000);
        console.log('[2] mounted');
        check('walking up to the kart mounts it', true);
        await h.screenshot('kart-mounted');

        // --- 3. W drives forward with momentum; the player rides along ---
        const d0 = await h.evaluate(() => {
            window.app.keysPressed['W'] = true;
            const k = window.__kart;
            return { x: k.position.x, z: k.position.z, yaw: k.rotation.y };
        });
        await h.waitFor((d0) => {
            const k = window.__kart;
            return Math.hypot(k.position.x - d0.x, k.position.z - d0.z) > 2.0;
        }, d0, 20000);
        const riding = await h.evaluate(() => {
            const pm = window.app.activeMode, k = window.__kart;
            return {
                speed: k._kartSpeed,
                playerDist: BABYLON.Vector3.Distance(pm.player.position, k.position),
            };
        });
        console.log('[3] driving', riding);
        check('holding W builds real speed', riding.speed > 2, riding);
        check('the seated player rides the kart', riding.playerDist < 1.5, riding);

        // --- 4. Steering changes yaw while moving ---
        const yaw0 = await h.evaluate(() => {
            window.app.keysPressed['D'] = true;
            return window.__kart.rotation.y;
        });
        await h.waitFor((yaw0) => Math.abs(window.__kart.rotation.y - yaw0) > 0.3, yaw0, 20000);
        await h.evaluate(() => { window.app.keysPressed['D'] = false; });
        console.log('[4] steering turned the kart');
        check('steering with D turns the kart while moving', true);

        // --- 5. Releasing the throttle bleeds speed (drag) ---
        const s0 = await h.evaluate(() => {
            window.app.keysPressed['W'] = false;
            return window.__kart._kartSpeed;
        });
        await h.waitFor((s0) => window.__kart._kartSpeed < s0 * 0.5, s0, 20000);
        console.log('[5] drag', { s0 });
        check('drag bleeds speed off after releasing the throttle', true);

        // --- 6. Space dismounts with a re-mount cooldown ---
        await h.evaluate(() => { window.app.keysPressed[' '] = true; });
        await h.waitFor(() => window.app.activeMode.driving === null, null, 20000);
        const off = await h.evaluate(() => {
            window.app.keysPressed[' '] = false;
            const pm = window.app.activeMode, k = window.__kart;
            return {
                cooldown: k._mountCooldown,
                nearKart: BABYLON.Vector3.Distance(pm.player.position, k.position) < 4,
            };
        });
        console.log('[6] dismount', off);
        check('Space dismounts beside the kart with a re-mount cooldown',
            off.cooldown > 0 && off.nearKart, off);

        // --- 7. Respawn mid-drive dismounts and parks the kart home ---
        await h.waitFor(() => window.__kart._mountCooldown === 0, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__kart.position.add(new BABYLON.Vector3(0.4, 0.8, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__kart, null, 20000);
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, k = window.__kart;
            const home = k.script._home;
            window.app.pixels = 0;
            pm.respawn();
            return {
                driving: pm.driving,
                atHome: home ? BABYLON.Vector3.Distance(k.position, home) < 0.01 : null,
            };
        });
        console.log('[7] respawn mid-drive', reset);
        check('respawn dismounts and parks the kart back at home',
            reset.driving === null && reset.atHome === true, reset);

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during driving', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the hover-kart mounts, drives with momentum, steers, and parks.'
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
