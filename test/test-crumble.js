/*
 * Crumbling-platform test
 * -----------------------
 * Verifies t_crumble:
 *   - registers with CrumbleScript + collapsed/reformed outputs,
 *   - stays solid (collidable, visible) when nobody stands on it,
 *   - stepping on it starts the fuse and it COLLAPSES after the fuse
 *     (intangible + invisible), firing `collapsed`,
 *   - it REFORMS (solid again) after the respawn delay, firing `reformed`,
 *   - a play reset snaps it back to solid immediately,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7140 });
    try {
        await h.start();
        await h.waitForReady(['t_crumble', 'l_counter']);
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
            const c = window.app.findWorldObject('t_crumble').createInstance();
            c.position = new BABYLON.Vector3(300, 1, 300);
            return { script: c.script.constructor.name,
                collapsed: c.script.outputs.some((o) => o.id === 'collapsed'),
                reformed: c.script.outputs.some((o) => o.id === 'reformed') };
        });
        console.log('\n[1] registration', reg);
        check('t_crumble registers with CrumbleScript, collapsed + reformed outputs',
            reg.script === 'CrumbleScript' && reg.collapsed && reg.reformed, reg);

        // Place a crumble tile + wire collapsed/reformed to counters.
        const top = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const c = app.findWorldObject('t_crumble').createInstance();
            c.position = new BABYLON.Vector3(50, 1, 50);
            c.params = { fuse: 15, respawn: 60 };
            c.script._wasPlay = null; c.script.update(true, pm);
            c.computeWorldMatrix(true);
            const cTop = c.getBoundingInfo().boundingBox.maximumWorld.y;
            const colCnt = app.findWorldObject('l_counter').createInstance();
            colCnt.position = new BABYLON.Vector3(50, 3, 54);
            colCnt.params.threshold = 999; colCnt.params.autoReset = 'no';
            const refCnt = app.findWorldObject('l_counter').createInstance();
            refCnt.position = new BABYLON.Vector3(54, 3, 54);
            refCnt.params.threshold = 999; refCnt.params.autoReset = 'no';
            c.wires = [
                { event: 'collapsed', toWo: 'l_counter', toId: colCnt.worldId, action: 'increment' },
                { event: 'reformed',  toWo: 'l_counter', toId: refCnt.worldId, action: 'increment' },
            ];
            window.__C = { c, colCnt, refCnt, top: cTop };
            return { cTop };
        });

        // --- 2. Stays solid when nobody stands on it ---
        const idle = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            pm.player.position.copyFrom(new BABYLON.Vector3(90, 2, 90));   // far away
            for (let i = 0; i < 40; i++) C.c.script.update(true, pm);
            return { solid: C.c.checkCollisions === true && C.c.isVisible === true,
                state: C.c.script._state, collapses: C.colCnt.script.count };
        });
        console.log('[2] idle', idle);
        check('the platform stays solid when nobody stands on it',
            idle.solid && idle.state === 'solid' && idle.collapses === 0, idle);

        // --- 3. Stepping on it fuses then collapses (fires collapsed) ---
        const collapse = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            pm.player.position.copyFrom(new BABYLON.Vector3(50, C.top + 0.1, 50));   // stand on it
            let fused = false;
            for (let i = 0; i < 20; i++) {
                C.c.script.update(true, pm);
                if (C.c.script._state === 'fusing') fused = true;
            }
            return { fused, gone: C.c.checkCollisions === false && C.c.isVisible === false,
                state: C.c.script._state, collapses: C.colCnt.script.count };
        });
        console.log('[3] collapse', collapse);
        check('stepping on it fuses, then it collapses (intangible + invisible, fires collapsed)',
            collapse.fused && collapse.gone && collapse.state === 'gone' && collapse.collapses === 1,
            collapse);
        await h.screenshot('crumble');

        // --- 4. It reforms after the respawn delay ---
        const reform = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            pm.player.position.copyFrom(new BABYLON.Vector3(90, 2, 90));   // step away
            for (let i = 0; i < 70; i++) C.c.script.update(true, pm);
            return { solid: C.c.checkCollisions === true && C.c.isVisible === true,
                state: C.c.script._state, reforms: C.refCnt.script.count };
        });
        console.log('[4] reform', reform);
        check('it reforms (solid again) after the respawn delay, firing reformed',
            reform.solid && reform.state === 'solid' && reform.reforms === 1, reform);

        // --- 5. Play reset snaps it back to solid ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, C = window.__C;
            // Knock it into 'gone' first, then reset.
            pm.player.position.copyFrom(new BABYLON.Vector3(50, C.top + 0.1, 50));
            for (let i = 0; i < 20; i++) C.c.script.update(true, pm);
            const wasGone = C.c.script._state === 'gone';
            C.c.script.onPlayReset(pm);
            return { wasGone, solid: C.c.checkCollisions === true && C.c.isVisible === true,
                state: C.c.script._state };
        });
        console.log('[5] reset', reset);
        check('a play reset snaps the platform back to solid',
            reset.wasGone && reset.solid && reset.state === 'solid', reset);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the crumble platform', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — step on it and keep moving, it will not hold you.'
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
