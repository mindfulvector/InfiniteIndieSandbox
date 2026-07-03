/*
 * Placement-consistency test
 * --------------------------
 * Verifies the build-mode placement/camera behaviour is consistent across every
 * buildable object, regardless of the object's mesh pivot:
 *   - every object's SNAP SURFACE meets the anchor at the same height -- the
 *     base for normal props (anchor:'above'), the top for terrain (anchor:'below'),
 *   - every object's footprint is CENTRED on the same anchor point,
 *   - the camera is aimed at each object's visual centre (so it stays framed).
 *
 * This is the regression guard for the "door was buried / not visible" and
 * "objects jump around when cycling" problems.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

// In-page: select an object and report its anchored geometry + camera framing.
const PROBE = function (index) {
    return new Promise((resolve) => {
        const app = window.app;
        app.selectBuildObject(index);
        // Let the request be consumed and a few frames of anchoring settle.
        let n = 0;
        const tick = () => {
            n += 1;
            const bm = app.activeMode;
            const ready = bm.currentInstance && bm.selectedObjectIndex === index && n > 6;
            if (!ready && n < 60) return requestAnimationFrame(tick);
            const bb = bm.computeWorldBBox(bm.currentInstance);
            const r = (v) => Math.round(v * 1000) / 1000;
            const focus = bm.camFocus.position;
            const wo = bm.currentWorldObject;
            // The surface that snaps to the anchor: base for 'above', top for 'below'.
            const snapY = bb ? (wo && wo.anchor === 'below' ? bb.max.y : bb.min.y) : null;
            resolve({
                name: wo ? wo.name : '?',
                anchorMode: wo ? wo.anchor : '?',
                baseY: bb ? r(bb.min.y) : null,
                topY: bb ? r(bb.max.y) : null,
                snapY: snapY !== null ? r(snapY) : null,
                centerX: bb ? r(bb.center.x) : null,
                centerZ: bb ? r(bb.center.z) : null,
                centerY: bb ? r(bb.center.y) : null,
                focus: { x: r(focus.x), y: r(focus.y), z: r(focus.z) },
                lockedIsFocus: app.camera.lockedTarget === bm.camFocus,
            });
        };
        requestAnimationFrame(tick);
    });
};

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0' });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', 'pr_door', 'd_christmas_tree']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode' && window.app.menu.state === 0);
        await h.waitFrames(5);

        const names = await h.evaluate(() => window.app.BuildableObjectList.map((w) => w.name));
        const rows = [];
        for (let i = 0; i < names.length; i++) {
            rows.push(await h.page.evaluate(PROBE, i));
        }
        console.table ? console.table(rows) : console.log(rows);

        const withGeom = rows.filter((r) => r.baseY !== null);
        check('every object resolved renderable geometry', withGeom.length === rows.length,
            { resolved: withGeom.length, total: rows.length });

        // 1) Each object's snap surface meets the anchor at the same height (base
        //    for 'above' props, top for 'below' terrain), so different objects
        //    line up consistently on the surface.
        const snaps = withGeom.map((r) => r.snapY);
        const snapSpread = Math.max(...snaps) - Math.min(...snaps);
        check('every object snaps its surface to the same anchor height', snapSpread < 0.05,
            { snaps: withGeom.map((r) => ({ name: r.name, mode: r.anchorMode, snapY: r.snapY })), snapSpread });

        // 2) Footprints centred on the anchor (x,z near 0).
        const offCenter = withGeom.filter((r) => Math.abs(r.centerX) > 0.3 || Math.abs(r.centerZ) > 0.3);
        check('every object footprint is centred on the anchor', offCenter.length === 0,
            offCenter.map((r) => ({ name: r.name, x: r.centerX, z: r.centerZ })));

        // 3) Camera focus tracks each object's visual centre.
        const badFocus = withGeom.filter((r) =>
            !r.lockedIsFocus ||
            Math.abs(r.focus.x - r.centerX) > 0.2 ||
            Math.abs(r.focus.y - r.centerY) > 0.2 ||
            Math.abs(r.focus.z - r.centerZ) > 0.2);
        check('camera is centred on every object', badFocus.length === 0,
            badFocus.map((r) => ({ name: r.name, focus: r.focus, center: { x: r.centerX, y: r.centerY, z: r.centerZ } })));

        console.log('\n========================================');
        console.log(failures === 0
            ? `RESULT: PASS — all ${rows.length} objects snap-align, centre, and stay framed consistently.`
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
