/*
 * Prop settle-to-floor test
 * -------------------------
 * Build mode lets props hover wherever the grid raised them; entering play
 * mode drops every prop/decor instance onto the surface beneath it
 * (PlayMode.settlePropsToFloor). Verifies:
 *   - a floating chest and table settle onto the terrain below them,
 *   - a floating two-chest stack lands in order (upper rests on lower),
 *   - a grind rail keeps its authored height (aerial by design),
 *   - settling is idempotent (re-entering play mode moves nothing),
 *   - no unexpected page errors.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7154 });
    try {
        await h.start();
        await h.waitForReady(['pr_chest', 'd_table', 'pr_rail']);

        // Boot into play mode from the menu (builds the default rolling
        // terrain), then hop to build mode to author floating props.
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(5);

        // Author: everything floating well above the rolling terrain
        // (tile tops undulate around y≈0.5; 4+ units up is clearly airborne).
        const pre = await h.evaluate(() => {
            const app = window.app;
            const mk = (name, x, y, z) => {
                const wo = app.findWorldObject(name);
                const inst = wo.createInstance();
                inst.position = new BABYLON.Vector3(x, y, z);
                inst.computeWorldMatrix(true);
                return inst.worldId;
            };
            window.__ids = {
                chest:   { wo: 'pr_chest', id: mk('pr_chest', 2, 6, 2) },
                table:   { wo: 'd_table',  id: mk('d_table', 4, 5, -3) },
                stackLo: { wo: 'pr_chest', id: mk('pr_chest', -5, 4, 5) },
                stackHi: { wo: 'pr_chest', id: mk('pr_chest', -5, 8, 5) },
                rail:    { wo: 'pr_rail',  id: mk('pr_rail', 6, 6, -6) },
            };
            const out = {};
            Object.keys(window.__ids).forEach((k) => {
                const r = window.__ids[k];
                const inst = app.findInstance(r.wo, r.id);
                out[k] = { y: inst.position.y, baseY: app.computeWorldBBox(inst).min.y };
            });
            return out;
        });

        // Enter play mode: the settle pass runs in the PlayMode constructor.
        await h.evaluate(() => window.app.goto_playMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode', null, 20000);
        await h.waitFrames(5);

        const post = await h.evaluate(() => {
            const app = window.app;
            const out = {};
            Object.keys(window.__ids).forEach((k) => {
                const r = window.__ids[k];
                const inst = app.findInstance(r.wo, r.id);
                const bb = app.computeWorldBBox(inst);
                // The gap to whatever lies under the base (excluding self):
                const origin = new BABYLON.Vector3(bb.center.x, bb.min.y + 0.25, bb.center.z);
                const ray = new BABYLON.Ray(origin, BABYLON.Vector3.Down(), 200);
                const pick = app.scene.pickWithRay(ray, (m) =>
                    m.checkCollisions && m.isEnabled() && m !== inst &&
                    !(m.isDescendantOf && m.isDescendantOf(inst)));
                out[k] = {
                    y: inst.position.y,
                    baseY: bb.min.y,
                    topY: bb.max.y,
                    gap: (pick && pick.hit) ? (bb.min.y - pick.pickedPoint.y) : null,
                };
            });
            return out;
        });

        check('chest dropped', post.chest.baseY < pre.chest.baseY - 1, { pre: pre.chest, post: post.chest });
        check('chest rests on the surface below', post.chest.gap !== null && Math.abs(post.chest.gap) < 0.05, post.chest);
        check('table dropped', post.table.baseY < pre.table.baseY - 1, { pre: pre.table, post: post.table });
        check('table rests on the surface below', post.table.gap !== null && Math.abs(post.table.gap) < 0.05, post.table);
        check('lower stack chest rests on the surface', post.stackLo.gap !== null && Math.abs(post.stackLo.gap) < 0.05, post.stackLo);
        check('upper chest landed on the lower chest',
            Math.abs(post.stackHi.baseY - post.stackLo.topY) < 0.1,
            { hiBase: post.stackHi.baseY, loTop: post.stackLo.topY });
        check('grind rail kept its authored height',
            Math.abs(post.rail.y - pre.rail.y) < 0.001, { pre: pre.rail, post: post.rail });
        await h.screenshot('props-settled');

        // Idempotence: a second play entry must not move anything further.
        await h.evaluate(() => window.app.goto_playMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode', null, 20000);
        const again = await h.evaluate(() => {
            const app = window.app;
            const out = {};
            Object.keys(window.__ids).forEach((k) => {
                const r = window.__ids[k];
                out[k] = app.findInstance(r.wo, r.id).position.y;
            });
            return out;
        });
        const drift = Object.keys(again).filter((k) => Math.abs(again[k] - post[k].y) > 0.01);
        check('second play entry moves nothing', drift.length === 0, { drift, again });

        const errs = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no unexpected page errors', errs.length === 0, errs.slice(0, 3));
    } catch (err) {
        failures += 1;
        console.log('  FAIL  harness error :: ' + (err && err.stack || err));
        try { await h.screenshot('error-state'); } catch (_) {}
        h.dumpDiagnostics();
    } finally {
        await h.stop();
    }
    console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`);
    process.exit(failures === 0 ? 0 : 1);
}

main();
