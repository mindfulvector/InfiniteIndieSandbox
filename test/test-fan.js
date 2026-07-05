/*
 * Wind / updraft fan test
 * -----------------------
 * Verifies l_fan:
 *   - registers with FanScript, isFan, on/off inputs,
 *   - an UP fan lifts the player while they stand in it (in-page frame loop),
 *   - a horizontal (east) fan pushes the player sideways,
 *   - stepping OUT of the volume stops the force,
 *   - a wired `off` disables the fan; `on` re-enables it,
 *   - a play reset re-enables it,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7120 });
    try {
        await h.start();
        await h.waitForReady(['l_fan', 't_block_4']);
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
            const f = window.app.findWorldObject('l_fan').createInstance();
            f.position = new BABYLON.Vector3(300, 5, 300);
            return { script: f.script.constructor.name, isFan: f.isFan === true,
                on: f.script.inputs.some((i) => i.id === 'on'),
                off: f.script.inputs.some((i) => i.id === 'off') };
        });
        console.log('\n[1] registration', reg);
        check('l_fan registers with FanScript, isFan, and on/off inputs',
            reg.script === 'FanScript' && reg.isFan && reg.on && reg.off, reg);

        // --- 2. An UP fan lifts the player ---
        const lifted = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const f = app.findWorldObject('l_fan').createInstance();
            f.position = new BABYLON.Vector3(40, 5, 40);   // tall column (spans ~3..7)
            f.params = { dir: 'up', strength: 8 };
            f.script._active = null;
            window.__F = f;
            pm.player.position.copyFrom(new BABYLON.Vector3(40, 4, 40));
            const y0 = pm.player.position.y;
            let n = 0;
            const tick = () => {
                n++;
                f.script.update(true, pm);
                if (pm.player.position.y - y0 > 1.5 || n > 300) {
                    return resolve({ rose: pm.player.position.y - y0 });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] updraft', lifted);
        check('an up fan lifts the player', lifted.rose > 1.5, lifted);
        await h.screenshot('fan');

        // --- 3. A horizontal (east) fan pushes sideways ---
        const blown = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const f = app.findWorldObject('l_fan').createInstance();
            f.position = new BABYLON.Vector3(80, 3, 80);
            f.params = { dir: 'east', strength: 8 };
            f.script._active = null;
            window.__E = f;
            pm.player.position.copyFrom(new BABYLON.Vector3(80, 3, 80));
            const x0 = pm.player.position.x;
            let n = 0;
            const tick = () => {
                n++;
                f.script.update(true, pm);
                if (pm.player.position.x - x0 > 1.0 || n > 300) {
                    return resolve({ pushed: pm.player.position.x - x0 });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[3] gust', blown);
        check('an east fan pushes the player sideways', blown.pushed > 1.0, blown);

        // --- 4. Stepping out stops the force ---
        const out = await h.evaluate(() => {
            const pm = window.app.activeMode, f = window.__F;
            pm.player.position.copyFrom(new BABYLON.Vector3(120, 3, 120));   // far from any fan
            const y0 = pm.player.position.y;
            for (let i = 0; i < 30; i++) f.script.update(true, pm);
            return { unchanged: Math.abs(pm.player.position.y - y0) < 0.01 };
        });
        console.log('[4] out', out);
        check('leaving the fan stops the force', out.unchanged, out);

        // --- 5. A wired off disables it; on re-enables ---
        const toggle = await h.evaluate(() => {
            const pm = window.app.activeMode, f = window.__F;
            pm.player.position.copyFrom(f.position.add(new BABYLON.Vector3(0, -1, 0)));
            f.script.onInput('off');
            const yA = pm.player.position.y;
            for (let i = 0; i < 20; i++) f.script.update(true, pm);
            const offHeld = Math.abs(pm.player.position.y - yA) < 0.01;
            f.script.onInput('on');
            const yB = pm.player.position.y;
            for (let i = 0; i < 20; i++) f.script.update(true, pm);
            const onLifts = pm.player.position.y > yB + 0.2;
            return { offHeld, onLifts };
        });
        console.log('[5] toggle', toggle);
        check('a wired off disables the fan and on re-enables it',
            toggle.offHeld && toggle.onLifts, toggle);

        // --- 6. A play reset re-enables it ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, f = window.__F;
            f.script.onInput('off');
            f.script.onPlayReset(pm);
            return { active: f.script._active === true };
        });
        console.log('[6] reset', reset);
        check('a play reset re-enables the fan', reset.active, reset);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the fan', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the updraft lifts, the gust shoves, and the switch cuts it.'
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
