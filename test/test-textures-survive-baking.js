/*
 * Texture-survival test
 * ---------------------
 * Regression guard for a thumbnail-baking bug: the thumbnail renderer used to
 * dispose a cloned mesh together with its materials/textures, but clones SHARE
 * those by reference, so baking stripped the textures off every real object and
 * the whole scene went white.
 *
 * This test records the scene's textures after load, enters build mode (which
 * bakes a thumbnail per object), and asserts that no pre-existing texture was
 * disposed out from under the live objects.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

// IDs of "real" (non render-target) textures currently in the scene.
const SNAPSHOT = function () {
    return window.app.scene.textures
        .filter((t) => t.getClassName && t.getClassName().indexOf('RenderTargetTexture') === -1)
        .map((t) => t.uniqueId);
};

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0' });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', 'pr_door', 'd_christmas_tree']);
        // Spawn the world so its textures (terrain, etc.) are present.
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(10);

        const before = await h.page.evaluate(SNAPSHOT);
        console.log(`\n[1] ${before.length} real textures present before baking`);
        check('scene has textures to protect', before.length > 0, { count: before.length });

        // Enter build mode -> bakes a thumbnail for every object.
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app._baking === false &&
            window.app.BuildableObjectList.every((wo) => typeof wo.thumbUrl === 'string'), null, 30000).catch(() => {});
        await h.waitFrames(5);

        const after = await h.page.evaluate(SNAPSHOT);
        const afterSet = new Set(after);
        const lost = before.filter((id) => !afterSet.has(id));
        console.log(`[2] ${after.length} real textures present after baking; ${lost.length} disposed`);
        check('no pre-existing texture was disposed by thumbnail baking', lost.length === 0, { lost });

        // Sanity: the rendered scene isn't a white-out (textures actually applied).
        // Sample the framebuffer centre-ish and ensure it isn't near-white everywhere.
        await h.evaluate(() => { if (window.app.activeMode.currentInstance) window.app.showBoundingBoxAll(window.app.activeMode.currentInstance, false); });
        await h.waitFrames(3);
        const notWhite = await h.evaluate(() => {
            const c = document.getElementById('gameCanvas');
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            const w = gl.drawingBufferWidth, ht = gl.drawingBufferHeight;
            const px = new Uint8Array(4);
            let nonWhite = 0, samples = 0;
            for (let i = 0; i < 200; i++) {
                const x = Math.floor(w * (0.2 + 0.6 * (i % 20) / 20));
                const y = Math.floor(ht * (0.3 + 0.4 * Math.floor(i / 20) / 10));
                gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                samples++;
                if (!(px[0] > 235 && px[1] > 235 && px[2] > 235)) nonWhite++;
            }
            return { nonWhite, samples };
        });
        console.log('[3] framebuffer sample', notWhite);
        check('scene renders with real (non-white) shading', notWhite.nonWhite > notWhite.samples * 0.3, notWhite);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — textures survive thumbnail baking; scene renders correctly.'
            : `RESULT: FAIL — ${failures} assertion(s) failed.`);
        console.log('========================================');
        if (h.pageErrors.length) h.dumpDiagnostics();
    } catch (err) {
        failures += 1;
        console.error('\nHARNESS ERROR:', err && err.stack ? err.stack : err);
        h.dumpDiagnostics();
    } finally {
        await h.stop();
    }
    process.exit(failures === 0 ? 0 : 1);
}

main();
