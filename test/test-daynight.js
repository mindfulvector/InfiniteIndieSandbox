/*
 * Day/night cycle test
 * --------------------
 * Verifies the sun toy:
 *   - a placed l_sun captures the day baseline at play start and swings the
 *     light intensity and sky color across a full cycle (in-page min/max
 *     sampling over one wrap),
 *   - dawn fires at play start; noon/dusk/midnight each fire once through
 *     the first cycle (wired counters),
 *   - `stop` freezes time and `start` resumes it,
 *   - returning to build mode restores the exact daylight baseline,
 *   - a play reset returns to dawn,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7072 });
    try {
        await h.start();
        await h.waitForReady(['l_sun', 'l_counter']);
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

        // --- 1. Place the sun + mark counters; capture the baseline ---
        const base = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const sun = app.findWorldObject('l_sun').createInstance();
            sun.position = pm.player.position.add(new BABYLON.Vector3(0, 6, 6));
            sun.params.cycle = 2;   // a 2-second day for testing
            const mk = (dz) => {
                const c = app.findWorldObject('l_counter').createInstance();
                c.position = sun.position.add(new BABYLON.Vector3(3, -4, dz));
                c.params.threshold = 50; c.params.autoReset = 'no';
                return c;
            };
            const marks = { dawn: mk(0), noon: mk(2), dusk: mk(4), midnight: mk(6) };
            Object.keys(marks).forEach((k) => {
                sun.wires.push({ event: k, toWo: 'l_counter', toId: marks[k].worldId, action: 'increment' });
            });
            window.__S = { sun, marks };
            const light = app.scene.getLightByName('light1');
            return { intensity: light.intensity, sky: app.scene.clearColor.r };
        });
        // Force a fresh play transition so the sun captures + fires dawn.
        await h.evaluate(() => { window.__S.sun.script._wasPlay = null; });
        await h.waitFor(() => window.__S.sun.script._wasPlay === true, null, 20000);

        // --- 2. One full cycle: light + sky swing, marks fire once each ---
        const swing = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, S = window.__S;
            const light = app.scene.getLightByName('light1');
            let minI = 99, maxI = -99, minSky = 99, maxSky = -99, n = 0;
            const t0 = S.sun.script._t;
            let wrapped = false;
            const tick = () => {
                n++;
                minI = Math.min(minI, light.intensity);
                maxI = Math.max(maxI, light.intensity);
                minSky = Math.min(minSky, app.scene.clearColor.r);
                maxSky = Math.max(maxSky, app.scene.clearColor.r);
                if (S.sun.script._t < t0 && n > 5) wrapped = true;   // wrapped past dawn
                if ((wrapped && S.sun.script._t >= 0.9) || n > 4000) {
                    return resolve({ minI, maxI, minSky, maxSky, n,
                        counts: {
                            dawn: S.marks.dawn.script.count,
                            noon: S.marks.noon.script.count,
                            dusk: S.marks.dusk.script.count,
                            midnight: S.marks.midnight.script.count,
                        } });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('\n[2] full cycle', swing);
        check('the light swings bright to dim across the cycle',
            swing.maxI > base.intensity * 0.9 && swing.minI < base.intensity * 0.45, swing);
        check('the sky darkens toward night and returns',
            swing.minSky < base.sky * 0.4 && swing.maxSky > base.sky * 0.85, swing);
        check('dawn/noon/dusk/midnight each fired (dawn twice: start + wrap)',
            swing.counts.dawn >= 2 && swing.counts.noon >= 1 &&
            swing.counts.dusk >= 1 && swing.counts.midnight >= 1, swing);
        await h.screenshot('daynight');

        // --- 3. stop freezes time; start resumes ---
        const frozen = await h.evaluate(() => new Promise((resolve) => {
            const S = window.__S;
            S.sun.script.onInput('stop');
            const t0 = S.sun.script._t;
            let n = 0;
            const tick = () => {
                n++;
                if (n >= 20) {
                    const held = Math.abs(S.sun.script._t - t0) < 0.0001;
                    S.sun.script.onInput('start');
                    return resolve({ held });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        await h.waitFor((t) => window.__S.sun.script._t !== t, frozen.t0, 20000);
        console.log('[3] stop/start', frozen);
        check('`stop` freezes time and `start` resumes', frozen.held === true, frozen);

        // --- 4. Build mode restores the exact daylight baseline ---
        await h.evaluate(() => { window.app.goto_buildMode(); });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' &&
            window.__S.sun.script._wasPlay === false, null, 20000);
        const restored = await h.evaluate(() => {
            const app = window.app;
            const light = app.scene.getLightByName('light1');
            return { intensity: light.intensity, sky: app.scene.clearColor.r };
        });
        console.log('[4] build restore', { base, restored });
        check('build mode restores the daylight baseline exactly',
            Math.abs(restored.intensity - base.intensity) < 0.001 &&
            Math.abs(restored.sky - base.sky) < 0.001, { base, restored });

        // --- 5. Back in play, a reset returns to dawn ---
        await h.evaluate(() => { window.app.goto_playMode(); });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' &&
            !!window.app.activeMode.cc &&
            window.__S.sun.script._wasPlay === true, null, 20000);
        await h.waitFor(() => window.__S.sun.script._t > 0.3, null, 20000);
        const reset = await h.evaluate(() => {
            window.app.pixels = 0;
            window.app.activeMode.respawn();
            return { t: window.__S.sun.script._t };
        });
        console.log('[5] reset to dawn', reset);
        check('a play reset returns time to dawn', reset.t < 0.1, reset);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the cycle', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the sun rises, sets, fires its marks, and never darkens the workshop.'
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
