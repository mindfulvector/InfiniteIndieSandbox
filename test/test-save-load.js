/*
 * Save/Load test
 * --------------
 * Verifies a world survives a save -> clear -> load round trip:
 *   - every object comes back (same count, no spurious duplicate terrain cube),
 *   - positions, rotations and scales are restored faithfully (the bug: they
 *     were assigned from raw JSON instead of rebuilt as Vector3/Quaternion).
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

// In-page: place known transforms, snapshot, save->clear->load, snapshot again.
const ROUNDTRIP = function () {
    const app = window.app;
    const r = (v) => Math.round(v * 1000) / 1000;
    const snap = () => {
        const out = [];
        app.BuildableObjectList.forEach((wo) => {
            (wo.instances || []).filter(Boolean).forEach((inst) => {
                const q = inst.rotationQuaternion;
                out.push({
                    wo: wo.name, id: inst.worldId,
                    po: { x: r(inst.position.x), y: r(inst.position.y), z: r(inst.position.z) },
                    ro: q ? { x: r(q.x), y: r(q.y), z: r(q.z), w: r(q.w) } : null,
                    sc: { x: r(inst.scaling.x), y: r(inst.scaling.y), z: r(inst.scaling.z) },
                });
            });
        });
        return out.sort((a, b) => (a.wo + a.id).localeCompare(b.wo + b.id));
    };

    // Place a couple of doors with distinct, non-trivial transforms (the origin
    // terrain cube from New Game is already present).
    const door = app.findWorldObject('pr_door');
    const a = door.createInstance();
    a.position = new BABYLON.Vector3(2, 0.5, -3);
    a.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0.7, 0, 0);
    a.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
    const b = door.createInstance();
    b.position = new BABYLON.Vector3(-4, 2, 1);

    const before = snap();
    const saved = app.world.saveToSlot(2);
    app.world.clearWorld();
    const cleared = snap().length;
    const loaded = app.world.loadFromSlot(2);
    const after = snap();
    return { before, after, saved, cleared, loaded };
};

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0' });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', 'pr_door']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.world, null, 10000);
        await h.waitFrames(5);

        const res = await h.evaluate(ROUNDTRIP);
        console.log('\nbefore:', JSON.stringify(res.before));
        console.log('after :', JSON.stringify(res.after));

        check('saved a non-empty world', res.saved >= 3, { saved: res.saved });
        check('clearWorld emptied the scene', res.cleared === 0, { cleared: res.cleared });
        check('loadFromSlot reported success', res.loaded === true);
        check('same number of objects after load (no duplicate cube)',
            res.after.length === res.before.length, { before: res.before.length, after: res.after.length });

        // Compare transforms object-by-object (matched by wo+id via the sort).
        const eq = (a, b, e = 0.01) => Math.abs(a - b) <= e;
        let mismatches = [];
        for (let i = 0; i < Math.min(res.before.length, res.after.length); i++) {
            const x = res.before[i], y = res.after[i];
            const posOk = eq(x.po.x, y.po.x) && eq(x.po.y, y.po.y) && eq(x.po.z, y.po.z);
            const scOk = eq(x.sc.x, y.sc.x) && eq(x.sc.y, y.sc.y) && eq(x.sc.z, y.sc.z);
            const roOk = (!x.ro && !y.ro) || (x.ro && y.ro &&
                eq(x.ro.x, y.ro.x) && eq(x.ro.y, y.ro.y) && eq(x.ro.z, y.ro.z) && eq(x.ro.w, y.ro.w));
            if (!posOk || !scOk || !roOk) mismatches.push({ wo: x.wo, id: x.id, before: x, after: y });
        }
        check('positions, rotations and scales restored faithfully', mismatches.length === 0, mismatches);

        // Regression guard: instances recreated by loadFromSlot must collide —
        // loaded terrain tiles used to come back without checkCollisions, so the
        // player fell straight through the ground of a loaded world.
        const collide = await h.evaluate(() => {
            const tiles = window.app.findWorldObject('t_tile').instances.filter(Boolean);
            return { tiles: tiles.length, colliding: tiles.filter((t) => t.checkCollisions === true).length };
        });
        check('loaded terrain tiles have collision enabled',
            collide.tiles > 0 && collide.colliding === collide.tiles, collide);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — world round-trips through save/load with transforms intact.'
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
