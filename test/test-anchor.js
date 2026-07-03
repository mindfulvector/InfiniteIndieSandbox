/*
 * Placement anchor test
 * ---------------------
 * Verifies the per-object "snap" anchor:
 *   - terrain (anchor:'below') snaps its TOP to the cursor, so tiles of
 *     different thicknesses (a thin floor panel, a full cube, the prim tile)
 *     share one seamless top walking surface,
 *   - everything else (anchor:'above', e.g. a door/tree) snaps its BASE to the
 *     cursor so it rests on the surface,
 *   - in both cases the footprint stays centred on the cursor.
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
        await h.waitForReady(['t_tile', 't_cube_1x1', 't_floor_1x1', 'pr_door']);
        // New Game -> play, then into build mode (BuildMode owns anchorInstance).
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.world, null, 10000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFrames(5);

        // Anchor one instance of each object at a known cursor height and read back
        // where its top / base / centre ended up.
        const res = await h.evaluate((names) => {
            const app = window.app, bm = app.activeMode;
            const CY = 5;                                   // cursor height
            const anchor = new BABYLON.Vector3(0, CY, 0);
            const out = {};
            names.forEach((name) => {
                const wo = app.findWorldObject(name);
                const inst = wo.createInstance();
                bm.anchorInstance(inst, anchor);
                const bb = bm.computeWorldBBox(inst);
                out[name] = {
                    anchorMode: wo.anchor,
                    top: Math.round(bb.max.y * 1000) / 1000,
                    base: Math.round(bb.min.y * 1000) / 1000,
                    cx: Math.round(bb.center.x * 1000) / 1000,
                    cz: Math.round(bb.center.z * 1000) / 1000,
                };
                wo.disposeInstance(inst);
            });
            return { CY, out };
        }, ['t_tile', 't_cube_1x1', 't_floor_1x1', 'pr_door']);
        console.log('\nanchor results:', JSON.stringify(res, null, 1));

        const CY = res.CY, o = res.out, near = (a, b) => Math.abs(a - b) < 0.06;

        // Terrain objects: top snaps to the cursor.
        ['t_tile', 't_cube_1x1', 't_floor_1x1'].forEach((n) => {
            check(`${n} is anchored 'below' (top to cursor)`, o[n].anchorMode === 'below', o[n]);
            check(`${n} top sits at the cursor height`, near(o[n].top, CY), { top: o[n].top, CY });
        });

        // The whole point: their tops line up, so placing them side by side gives
        // a seamless walking surface regardless of thickness.
        check('terrain tops align across cube / floor / tile (seamless surface)',
            near(o.t_cube_1x1.top, o.t_floor_1x1.top) && near(o.t_floor_1x1.top, o.t_tile.top),
            { cube: o.t_cube_1x1.top, floor: o.t_floor_1x1.top, tile: o.t_tile.top });

        // A door is anchored 'above': its base rests on the cursor.
        check('pr_door is anchored \'above\' (base to cursor)', o.pr_door.anchorMode === 'above', o.pr_door);
        check('pr_door base sits at the cursor height', near(o.pr_door.base, CY), { base: o.pr_door.base, CY });

        // Footprint centred on the cursor for all of them.
        const centred = ['t_tile', 't_cube_1x1', 't_floor_1x1', 'pr_door'].every((n) => near(o[n].cx, 0) && near(o[n].cz, 0));
        check('every object footprint stays centred on the cursor', centred, o);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — terrain tops snap to the cursor (seamless surface); props rest their base on it.'
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
