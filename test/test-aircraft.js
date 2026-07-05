/*
 * Flyable aircraft test
 * ---------------------
 * Verifies the Sky-Wing on the vehicle seat's canFly profile:
 *   - pr_wing registers with wings + tail, children collision-free once
 *     scripted (the mount lesson),
 *   - walking up boards it (and the rider is hidden while seated),
 *   - R throttle + held Space takes off (climbs well above the runway),
 *   - releasing Space glides: sink rate capped at -2.5 while airspeed
 *     holds (sampled in-page across frames),
 *   - it banks into a turn while airborne (rotation.z leans),
 *   - the W/S elevator pitches: S climbs (and the nose pitches up),
 *     W dives past the glide cap,
 *   - cutting throttle stalls it: speed decays and it settles back to
 *     grounded, leveling out,
 *   - C bails out,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7064 });
    try {
        await h.start();
        await h.waitForReady(['pr_wing', 'pr_kart']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Registration; scripted children go collision-free ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const wing = app.findWorldObject('pr_wing').createInstance();
            wing.position = pm.player.position.add(new BABYLON.Vector3(5, 0.8, 0));
            window.__W = wing;
            wing.script._wasPlay = null;
        });
        await h.waitFrames(5);
        const reg = await h.evaluate(() => {
            const kids = window.__W.getChildMeshes();
            return {
                // Child names carry the pr_wing parent prefix, so match the
                // specific wingL/wingR prim names.
                wings: kids.filter((m) => m.name.indexOf('wingL') >= 0 ||
                    m.name.indexOf('wingR') >= 0).length,
                tail: kids.some((m) => m.name.indexOf('tail') >= 0),
                kidsFree: kids.every((m) => !m.checkCollisions),
            };
        });
        console.log('\n[1] registration', reg);
        check('the Sky-Wing registers with collision-free wings + tail',
            reg.wings === 2 && reg.tail && reg.kidsFree, reg);

        // --- 2. Walk-up boarding ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__W.position.add(new BABYLON.Vector3(0.5, 1.0, 0)));
        });
        await h.waitFor(() => window.app.activeMode.driving === window.__W, null, 20000);
        console.log('[2] boarded');
        check('walking up boards the Sky-Wing', true);
        const rider = await h.evaluate(() => {
            const p = window.app.activeMode.player;
            return [p].concat(p.getChildMeshes()).filter((m) => m.isVisible).length;
        });
        check('the seated rider is hidden completely', rider === 0, { visibleMeshes: rider });

        // --- 3. Takeoff: R throttle + held Space climbs ---
        const y0 = await h.evaluate(() => {
            window.app.keysPressed['R'] = true;
            window.app.keysPressed[' '] = true;
            return window.__W.position.y;
        });
        await h.waitFor((y0) => window.__W.position.y > y0 + 3, y0, 30000);
        console.log('[3] airborne');
        check('R throttle + held Space takes off (+3 altitude)', true);
        await h.screenshot('sky-wing-airborne');

        // --- 4. Glide: release Space, sink rate capped while fast ---
        const glide = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed[' '] = false;   // keep R: airspeed holds
            const W = window.__W;
            let n = 0, minVy = 99, stillAir = true;
            const tick = () => {
                n++;
                if (n > 8) {   // let the climb bleed off first
                    minVy = Math.min(minVy, W._kartBody.vy);
                    if (W._kartBody.grounded) stillAir = false;
                }
                if (n >= 40) return resolve({ minVy, stillAir, speed: W._kartSpeed });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[4] glide', glide);
        // vy is clamped to -2.5 in updateDriving, but the sample reads it
        // AFTER GravityBody.step subtracts one gravity tick (up to 9.8 *
        // 0.05 at the dt cap), so the observable floor is -3.0, fps-dependent.
        check('the glide caps sink rate near -2.5 with airspeed',
            glide.minVy >= -3.0 && glide.stillAir && glide.speed > 2, glide);

        // --- 5. Banking into a turn while airborne ---
        const bank = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['D'] = true;
            const W = window.__W;
            let n = 0, maxLean = 0;
            const tick = () => {
                n++;
                maxLean = Math.max(maxLean, Math.abs(W.rotation.z));
                if (n >= 40 || maxLean > 0.15) {
                    window.app.keysPressed['D'] = false;
                    return resolve({ maxLean, airborne: !W._kartBody.grounded });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[5] bank', bank);
        check('the wing banks into airborne turns', bank.maxLean > 0.15, bank);

        // --- 5b. Elevator: S pulls up, W noses down (R still throttling) ---
        // Regain some altitude first so the dive has room to develop.
        await h.evaluate(() => { window.app.keysPressed[' '] = true; });
        await h.waitFrames(30);
        await h.evaluate(() => { window.app.keysPressed[' '] = false; });
        const pullUp = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['S'] = true;
            const W = window.__W;
            let n = 0, maxVy = -99, minPitch = 99;
            const tick = () => {
                n++;
                maxVy = Math.max(maxVy, W._kartBody.vy);
                minPitch = Math.min(minPitch, W.rotation.x);
                if (n >= 40 || (maxVy > 1 && minPitch < -0.1)) {
                    window.app.keysPressed['S'] = false;
                    return resolve({ maxVy, minPitch });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[5b] pull up', pullUp);
        check('S pulls the nose up (climbs, pitch pose leans back)',
            pullUp.maxVy > 1 && pullUp.minPitch < -0.1, pullUp);
        const dive = await h.evaluate(() => new Promise((resolve) => {
            window.app.keysPressed['W'] = true;
            const W = window.__W;
            let n = 0, minVy = 99;
            const tick = () => {
                n++;
                minVy = Math.min(minVy, W._kartBody.vy);
                if (n >= 40 || minVy < -3.5) {
                    window.app.keysPressed['W'] = false;
                    return resolve({ minVy });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[5b] dive', dive);
        // -3.5 sits clear of the glide floor's worst observable value (-3.0);
        // only the W dive can push vy this far down.
        check('W noses down past the glide cap (dive)', dive.minVy < -3.5, dive);

        // --- 6. Stall + settle: cut throttle, it lands and levels ---
        // All the airtime above may have carried the wing past the terrain
        // edge (the default grid only spans ±9); bring it back over solid
        // ground at altitude so "grounded" is physically reachable.
        await h.evaluate(() => {
            window.__W.position.x = 0;
            window.__W.position.z = 0;
        });
        await h.evaluate(() => { window.app.keysPressed['R'] = false; });
        await h.waitFor(() => window.__W._kartBody.grounded, null, 30000);
        await h.waitFor(() => Math.abs(window.__W.rotation.z) < 0.06, null, 20000);
        console.log('[6] landed + leveled');
        check('cutting throttle stalls, settles, and levels out', true);

        // --- 7. C bails out ---
        await h.evaluate(() => { window.app.keysPressed['C'] = true; });
        await h.waitFor(() => window.app.activeMode.driving === null, null, 20000);
        await h.evaluate(() => { window.app.keysPressed['C'] = false; });
        const off = await h.evaluate(() => ({ cooldown: window.__W._mountCooldown }));
        console.log('[7] bailed', off);
        check('C bails out with a re-mount cooldown', off.cooldown > 0, off);

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during flight', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the Sky-Wing takes off, glides, banks, stalls, and lands.'
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
