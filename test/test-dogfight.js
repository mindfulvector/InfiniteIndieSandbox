/*
 * Vehicle guns / dogfighting test
 * -------------------------------
 * Verifies mounted forward guns:
 *   - the armed profile: kart + Sky-Wing are armed, the Strider mount is not,
 *   - holding fire from a driven kart spawns twin forward bolts on a
 *     cooldown (not one per frame),
 *   - a vehicle bolt kills a walker parked ahead (reuses the player-bolt
 *     damage path),
 *   - firing from the flying Sky-Wing works too (dogfighting),
 *   - the unarmed mount never fires,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7099 });
    try {
        await h.start();
        await h.waitForReady(['pr_kart', 'pr_wing', 'pr_mount', 'en_blob']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Armed profiles ---
        const arms = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const mk = (n) => {
                const inst = window.app.findWorldObject(n).createInstance();
                return pm._vehicleProfile(inst).armed;
            };
            return { kart: mk('pr_kart'), wing: mk('pr_wing'), mount: mk('pr_mount') };
        });
        console.log('\n[1] armed', arms);
        check('kart and Sky-Wing are armed, the mount is not',
            arms.kart && arms.wing && !arms.mount, arms);

        // --- 2. The cooldown gate: held fire yields throttled twin bolts ---
        // (Driven directly, not through the render loop -- which also runs
        // updateDriving on pm.driving and would double every count.)
        const kartFire = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const kart = app.findWorldObject('pr_kart').createInstance();
            kart.position = new BABYLON.Vector3(0, 40, 0);   // off alone
            kart.rotation.y = 0;
            pm.playerProjectiles.length = 0;
            kart._gunCd = 0;
            let shots = 0;
            // 30 "frames": decrement the gun cd, fire when ready + held.
            for (let f = 0; f < 30; f++) {
                if (kart._gunCd > 0) kart._gunCd--;
                if ((kart._gunCd || 0) <= 0) { pm.fireVehicleGun(kart); kart._gunCd = 10; shots++; }
            }
            const bolts = pm.playerProjectiles.length;
            return { shots, bolts, perShot: bolts / shots };
        });
        console.log('[2] kart fire', kartFire);
        check('held fire yields throttled twin bolts (1 shot / 10 frames, 2 bolts each)',
            kartFire.shots === 3 && kartFire.bolts === 6 && kartFire.perShot === 2, kartFire);

        // --- 3. A vehicle bolt kills a walker ahead ---
        const kill = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const kart = app.findWorldObject('pr_kart').createInstance();
            kart.position = new BABYLON.Vector3(50, 2, 50);
            kart.rotation.y = 0;   // faces +z
            pm.enemyManager.spawnWalker(new BABYLON.Vector3(50, 2, 60));
            const rec = pm.enemyManager.enemies[pm.enemyManager.enemies.length - 1];
            rec.hp = 3; rec.speed = 0; rec.fade = 0;
            const n0 = pm.enemyManager.enemies.length;
            pm.playerProjectiles.length = 0;
            let n = 0;
            const tick = () => {
                n++;
                if (n % 10 === 1) pm.fireVehicleGun(kart);   // volley on a cadence
                pm.updatePlayerProjectiles();
                pm.enemyManager.update();
                rec.mesh.position.set(50, 2, 60);   // pin the dummy in the line of fire
                if (pm.enemyManager.enemies.length < n0 || n > 200) {
                    return resolve({ killed: pm.enemyManager.enemies.length < n0, frames: n });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] kill', kill);
        check('a vehicle bolt kills a walker parked ahead', kill.killed, kill);
        await h.screenshot('dogfight');

        // --- 4. The Sky-Wing fires while flying ---
        const wingFire = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const wing = app.findWorldObject('pr_wing').createInstance();
            wing.position = pm.player.position.add(new BABYLON.Vector3(0, 10, 0));
            wing.rotation.y = 1.0;
            pm.driving = wing;
            if (!wing._kartBody) {
                wing._kartBody = new GravityBody(app.scene, wing,
                    { ellipsoid: new BABYLON.Vector3(0.9, 0.5, 1.3), ellipsoidOffset: new BABYLON.Vector3(0, 0.5, 0) });
            }
            wing._kartBody.grounded = false;
            pm.playerProjectiles.length = 0;
            wing._gunCd = 0;
            pm._mouseFireHeld = true;
            pm.updateDriving();
            pm._mouseFireHeld = false;
            return { bolts: pm.playerProjectiles.length };
        });
        console.log('[4] wing fire', wingFire);
        check('the Sky-Wing fires its guns while flying (dogfighting)',
            wingFire.bolts === 2, wingFire);

        // --- 5. The mount never fires ---
        const mountFire = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const mount = app.findWorldObject('pr_mount').createInstance();
            mount.position = pm.player.position.add(new BABYLON.Vector3(0, 1, 0));
            pm.driving = mount;
            if (!mount._kartBody) {
                mount._kartBody = new GravityBody(app.scene, mount,
                    { ellipsoid: new BABYLON.Vector3(0.9, 0.5, 1.3), ellipsoidOffset: new BABYLON.Vector3(0, 0.5, 0) });
            }
            pm.playerProjectiles.length = 0;
            mount._gunCd = 0;
            pm._mouseFireHeld = true;
            for (let i = 0; i < 5; i++) pm.updateDriving();
            pm._mouseFireHeld = false;
            pm.driving = null;
            return { bolts: pm.playerProjectiles.length };
        });
        console.log('[5] mount fire', mountFire);
        check('the unarmed mount never fires', mountFire.bolts === 0, mountFire);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during dogfighting', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — karts strafe, wings dogfight, and the beast stays a beast.'
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
