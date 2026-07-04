/*
 * Traversal test: double jump + glide
 * -----------------------------------
 * Drives the CharacterController through its real key handlers (_onKeyDown /
 * _onKeyUp — headless synthetic keys can't focus the canvas, so we call the
 * handlers the canvas listener would call) and asserts the resulting motion:
 *   - a single jump reaches a normal apex and lands,
 *   - a second mid-air press (double jump) reaches clearly higher,
 *   - holding Space while falling glides (slow, constant descent),
 *   - landing restores the air jumps.
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
        await h.waitForReady(['t_tile']);
        // Flat template for clean height measurements.
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
        // Settle on the ground by CONDITION, not frame count: at unthrottled
        // headless frame rates a fixed frame wait covers almost no wall-clock
        // time, and capturing y0 mid-spawn-drop breaks the landing checks.
        await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode;
            let last = null, stable = 0, frames = 0;
            const tick = () => {
                frames++;
                if (frames > 900) return resolve();
                const y = pm.player.position.y;
                if (last !== null && Math.abs(y - last) < 0.001) stable++; else stable = 0;
                last = y;
                if (stable >= 5) return resolve();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));

        const cfg = await h.evaluate(() => ({
            maxJumps: window.app.activeMode.cc._maxJumps,
            glide: window.app.activeMode.cc._glideEnabled,
        }));
        console.log('\n[0] traversal config', cfg);
        check('double jump + glide are enabled in play mode', cfg.maxJumps === 2 && cfg.glide === true, cfg);

        // --- 1. Single jump: apex above ground, then lands ---
        const single = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            const y0 = pm.player.position.y;
            cc._onKeyDown({ key: ' ' });
            setTimeout(() => cc._onKeyUp({ key: ' ' }), 60);
            let maxY = y0, frames = 0;
            const t = () => {
                maxY = Math.max(maxY, pm.player.position.y);
                frames++;
                // done when back on the ground AND the controller has finished
                // the jump (_endJump runs one frame after touchdown; at high
                // fps resolving on the landing frame would leak
                // _act._jump=true into the next test step) — or safety cap
                if ((frames > 20 && Math.abs(pm.player.position.y - y0) < 0.05 && !cc._act._jump) || frames > 600) {
                    resolve({ h: Math.round((maxY - y0) * 100) / 100, landedY: Math.round(pm.player.position.y * 100) / 100, y0: Math.round(y0 * 100) / 100 });
                } else requestAnimationFrame(t);
            };
            requestAnimationFrame(t);
        }));
        console.log('\n[1] single jump', single);
        check('a single jump rises and lands back', single.h > 0.5 && Math.abs(single.landedY - single.y0) < 0.1, single);

        // --- 2. Double jump: mid-air press reaches clearly higher ---
        const dbl = await h.evaluate((h1) => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            const y0 = pm.player.position.y;
            cc._onKeyDown({ key: ' ' });
            setTimeout(() => cc._onKeyUp({ key: ' ' }), 60);
            // Second press near the first apex.
            setTimeout(() => { cc._onKeyDown({ key: ' ' }); setTimeout(() => cc._onKeyUp({ key: ' ' }), 60); }, 380);
            let maxY = y0, frames = 0;
            const t = () => {
                maxY = Math.max(maxY, pm.player.position.y);
                frames++;
                // wait for _endJump (one frame after touchdown) so
                // _jumpsUsed reflects the post-landing reset
                if ((frames > 40 && Math.abs(pm.player.position.y - y0) < 0.05 && !cc._act._jump) || frames > 900) {
                    resolve({ h1: h1, h2: Math.round((maxY - y0) * 100) / 100, jumpsUsedAfter: cc._jumpsUsed });
                } else requestAnimationFrame(t);
            };
            requestAnimationFrame(t);
        }), single.h);
        console.log('\n[2] double jump', dbl);
        check('the double jump reaches clearly higher than a single jump', dbl.h2 > dbl.h1 + 0.6, dbl);
        check('landing restores the air jumps', dbl.jumpsUsedAfter === 0, dbl);
        await h.screenshot('double-jump-landed');

        // --- 3. Glide: holding Space during the fall descends slowly ---
        const glide = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            const y0 = pm.player.position.y;
            // Jump and HOLD the key: normal ascent, glide after the apex.
            cc._onKeyDown({ key: ' ' });
            let apex = -Infinity, apexTime = 0, phase = 'rise';
            const samples = [];
            const start = performance.now();
            const t = () => {
                const y = pm.player.position.y, now = performance.now();
                if (phase === 'rise') {
                    if (y > apex) { apex = y; apexTime = now; }
                    else if (apex - y > 0.15) { phase = 'fall'; }
                    if (now - start > 8000) { phase = 'fall'; }
                } else {
                    samples.push({ y, t: now });
                    // measure over ~0.8s of descent
                    if (samples.length > 2 && (now - samples[0].t) > 800) {
                        cc._onKeyUp({ key: ' ' });   // release: normal fall to land
                        const dy = samples[0].y - samples[samples.length - 1].y;
                        const dt = (now - samples[0].t) / 1000;
                        return resolve({ apexH: Math.round((apex - y0) * 100) / 100,
                            fallSpeed: Math.round((dy / dt) * 100) / 100 });
                    }
                }
                requestAnimationFrame(t);
            };
            requestAnimationFrame(t);
        }));
        console.log('\n[3] glide', glide);
        check('holding Space glides: slow constant descent (< 2.5 m/s, ~1.6 expected)',
            glide.fallSpeed > 0.3 && glide.fallSpeed < 2.5, glide);
        // Control: normal (released) falling is much faster than the glide.
        const normalFall = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, cc = pm.cc;
            // Wait to land first, then a plain tap jump and measure post-apex fall.
            // The previous step resolves while the player is still mid-air after
            // the glide release, so "settled" must mean "y stopped changing"
            // (resting on the ground), not "y returned to its starting value".
            let frames = 0, lastY = null, stable = 0;
            const settle = () => {
                frames++;
                if (frames > 400) return resolve({ err: 'never settled' });
                const yNow = pm.player.position.y;
                if (lastY !== null && Math.abs(yNow - lastY) < 0.001) stable++; else stable = 0;
                lastY = yNow;
                if (stable < 5 || frames < 30 || cc._act._jump) return requestAnimationFrame(settle);
                cc._onKeyDown({ key: ' ' });
                setTimeout(() => cc._onKeyUp({ key: ' ' }), 60);
                let apex = -Infinity, phase = 'rise';
                const samples = [];
                const t = () => {
                    const y = pm.player.position.y, now = performance.now();
                    if (phase === 'rise') {
                        if (y > apex) apex = y;
                        else if (apex - y > 0.15) phase = 'fall';
                    } else {
                        samples.push({ y, t: now });
                        if (samples.length > 2 && (now - samples[0].t) > 400) {
                            const dy = samples[0].y - samples[samples.length - 1].y;
                            const dt = (now - samples[0].t) / 1000;
                            return resolve({ fallSpeed: Math.round((dy / dt) * 100) / 100 });
                        }
                    }
                    requestAnimationFrame(t);
                };
                requestAnimationFrame(t);
            };
            requestAnimationFrame(settle);
        }));
        console.log('[3] normal fall', normalFall);
        // Gravity is still ramping up right after the apex, so compare by ratio:
        // an accelerating fall averages well above the constant glide speed.
        check('a released fall is clearly faster than the glide (>1.3x)',
            normalFall.fallSpeed > glide.fallSpeed * 1.3, { glide: glide.fallSpeed, normal: normalFall.fallSpeed });

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — double jump gains height, gliding slows the fall, landing restores air jumps.'
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
