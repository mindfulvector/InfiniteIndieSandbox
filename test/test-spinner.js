/*
 * Rotating-platform (spinner) test
 * --------------------------------
 * Verifies t_spinner:
 *   - registers with SpinnerScript + a spun output and on/off inputs,
 *   - the disc rotates over time,
 *   - a rider on the disc is carried AROUND the pivot: their offset from the
 *     centre rotates (cw = clockwise) while its magnitude is preserved (an
 *     orbit, not a drift),
 *   - a rider near the RIM swings a wider arc than one near the hub,
 *   - the direction param reverses the orbit; a rider OFF the disc isn't carried,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7150 });
    try {
        await h.start();
        await h.waitForReady(['t_spinner']);
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

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const s = window.app.findWorldObject('t_spinner').createInstance();
            s.position = new BABYLON.Vector3(300, 1, 300);
            return { script: s.script.constructor.name,
                spun: s.script.outputs.some((o) => o.id === 'spun'),
                ins: s.script.inputs.map((i) => i.id).sort().join(',') };
        });
        console.log('\n[1] registration', reg);
        check('t_spinner registers with SpinnerScript, spun output + on/off inputs',
            reg.script === 'SpinnerScript' && reg.spun && reg.ins === 'off,on', reg);

        // Helper: build a spinner at a spot, return its centre + top Y.
        const build = (x, z, params) => h.evaluate((a) => {
            const app = window.app, pm = app.activeMode;
            const s = app.findWorldObject('t_spinner').createInstance();
            s.position = new BABYLON.Vector3(a.x, 1, a.z);
            s.params = a.params;
            s.script._wasPlay = null; s.script.update(false, pm); s.script.update(true, pm);
            s.computeWorldMatrix(true);
            const top = s.getBoundingInfo().boundingBox.maximumWorld.y;
            window.__S = s;
            return { cx: a.x, cz: a.z, top };
        }, { x, z, params });

        // --- 2. The disc rotates ---
        await build(50, 50, { speed: 2, dir: 'cw' });
        const spin2 = await h.evaluate(() => {
            const pm = window.app.activeMode, s = window.__S;
            const r0 = s.rotation.y;
            for (let i = 0; i < 30; i++) s.script.update(true, pm);
            return { turned: Math.abs(s.rotation.y - r0) > 0.02 };
        });
        console.log('[2] rotate', spin2);
        check('the disc rotates over time', spin2.turned, spin2);

        // --- 3. A rider is carried around the pivot (cw), magnitude preserved ---
        const carry = await h.evaluate(() => {
            const pm = window.app.activeMode, s = window.__S;
            const c = s.getAbsolutePosition();
            pm.driving = null;
            const top = s.getBoundingInfo().boundingBox.maximumWorld.y;
            pm.player.position.copyFrom(new BABYLON.Vector3(c.x + 2, top + 0.1, c.z));
            const ox = pm.player.position.x - c.x, oz = pm.player.position.z - c.z;
            // A SHORT run: over <180deg the cross product's sign reliably gives
            // the spin direction (past pi it would wrap and flip).
            for (let i = 0; i < 15; i++) { s.script.update(true, pm); }
            const nx = pm.player.position.x - c.x, nz = pm.player.position.z - c.z;
            const mag0 = Math.hypot(ox, oz), mag1 = Math.hypot(nx, nz);
            const cross = ox * nz - oz * nx;   // >0 ccw, <0 cw
            return { mag0, mag1, cross, magPreserved: Math.abs(mag1 - mag0) < 0.6, rotatedCW: cross < -0.05 };
        });
        console.log('[3] carry', carry);
        check('a rider is carried around the pivot clockwise, keeping its radius (orbit not drift)',
            carry.magPreserved && carry.rotatedCW, carry);
        await h.screenshot('spinner');

        // --- 4. Rim swings wider than the hub ---
        const differential = await h.evaluate(() => {
            const pm = window.app.activeMode, s = window.__S;
            const c = s.getAbsolutePosition();
            const top = s.getBoundingInfo().boundingBox.maximumWorld.y;
            const run = (offX) => {
                pm.player.position.copyFrom(new BABYLON.Vector3(c.x + offX, top + 0.1, c.z));
                const p0 = pm.player.position.clone();
                for (let i = 0; i < 40; i++) s.script.update(true, pm);
                return BABYLON.Vector3.Distance(pm.player.position, p0);
            };
            const hub = run(0.3);
            const rim = run(2.2);
            return { hub, rim, wider: rim > hub + 0.05 };
        });
        console.log('[4] differential', differential);
        check('a rider near the rim swings a wider arc than one near the hub',
            differential.wider, differential);

        // --- 5. Direction reverses; off the disc isn't carried ---
        const dir = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const s = app.findWorldObject('t_spinner').createInstance();
            s.position = new BABYLON.Vector3(70, 1, 70);
            s.params = { speed: 2, dir: 'ccw' };
            s.script._wasPlay = null; s.script.update(true, pm);
            const c = s.getAbsolutePosition();
            const top = s.getBoundingInfo().boundingBox.maximumWorld.y;
            pm.player.position.copyFrom(new BABYLON.Vector3(c.x + 2, top + 0.1, c.z));
            const ox = pm.player.position.x - c.x, oz = pm.player.position.z - c.z;
            for (let i = 0; i < 15; i++) s.script.update(true, pm);   // short run: sign stays reliable
            const nx = pm.player.position.x - c.x, nz = pm.player.position.z - c.z;
            const ccwCross = ox * nz - oz * nx;   // should be > 0 for ccw
            // Now stand OFF the disc: no carry.
            pm.player.position.copyFrom(new BABYLON.Vector3(200, 1, 200));
            const off0 = pm.player.position.clone();
            for (let i = 0; i < 40; i++) s.script.update(true, pm);
            const offMoved = BABYLON.Vector3.Distance(pm.player.position, off0);
            return { ccwCross, reversed: ccwCross > 0.05, offStill: offMoved < 0.1 };
        });
        console.log('[5] dir', dir);
        check('ccw reverses the orbit, and a rider off the disc is not carried',
            dir.reversed && dir.offStill, dir);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the spinner', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — ride the disc and it carries you round; the rim swings widest.'
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
