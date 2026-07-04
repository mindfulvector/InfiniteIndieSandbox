/*
 * Interiors test: room kit, sliding door, decoration
 * --------------------------------------------------
 * Verifies the interior building kit and the wirable sliding door:
 *   - the in_* kit and d_* furniture register with the right categories,
 *   - multi-prim objects clone as hierarchies (children visible + collidable),
 *   - a solid in_wall blocks projectiles (projectileBlocked),
 *   - in_wall_door blocks through its segments/lintel but NOT through the
 *     doorway gap,
 *   - pr_door's panel blocks the gap when closed; the `open` input slides the
 *     panel clear (ray passes) and fires the `opened` output into a wired
 *     counter exactly once,
 *   - onPlayReset (via respawn) returns the door to its startOpen state,
 *   - a furnished room (floor, walls, door, table, chair, lamp, rug) builds
 *     and screenshots without errors,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7033 });
    try {
        await h.start();
        await h.waitForReady(['in_wall', 'in_wall_door', 'in_floor', 'd_table', 'pr_door']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            window.app.pixels = 0; window.app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. Registration + categories ---
        const cats = await h.evaluate(() => ({
            in_wall: window.app.objectCategory('in_wall'),
            in_floor: window.app.objectCategory('in_floor'),
            d_table: window.app.objectCategory('d_table'),
            pr_door: window.app.objectCategory('pr_door'),
            all: ['in_wall', 'in_wall_door', 'in_wall_window', 'in_floor',
                  'd_table', 'd_chair', 'd_lamp', 'd_rug', 'pr_door']
                .map((n) => !!window.app.findWorldObject(n)),
        }));
        console.log('\n[1] registration', cats);
        check('all interior kit + furniture objects are registered', cats.all.every(Boolean), cats);
        check('in_* maps to the INTERIOR category', cats.in_wall === 'INTERIOR' && cats.in_floor === 'INTERIOR', cats);
        check('furniture maps to DECOR, the door stays in PROPS',
            cats.d_table === 'DECOR' && cats.pr_door === 'PROPS', cats);

        // --- 2. Multi-prim objects clone as hierarchies ---
        const hier = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const base = pm.player.position;
            const mk = (name, dx, dy, dz) => {
                const wo = app.findWorldObject(name);
                const inst = wo.createInstance();
                inst.position = base.add(new BABYLON.Vector3(dx, dy, dz));
                return inst;
            };
            window.__wallDoor = mk('in_wall_door', 10, 1.5, 6);
            window.__table = mk('d_table', -6, 0.5, 6);
            const kidsOf = (inst) => (inst.getChildMeshes ? inst.getChildMeshes() : []);
            const wd = kidsOf(window.__wallDoor), tb = kidsOf(window.__table);
            return {
                wallDoorKids: wd.length,
                wallDoorAllVisible: window.__wallDoor.isVisible && wd.every((m) => m.isVisible),
                wallDoorAllCollide: window.__wallDoor.checkCollisions && wd.every((m) => m.checkCollisions),
                tableKids: tb.length,
            };
        });
        console.log('[2] hierarchy', hier);
        check('in_wall_door clones with its 2 child prims', hier.wallDoorKids === 2, hier);
        check('all wall-door prims are visible and collidable',
            hier.wallDoorAllVisible && hier.wallDoorAllCollide, hier);
        check('d_table clones with its 4 leg children', hier.tableKids === 4, hier);
        // Child world matrices only settle once a frame renders -- rays fired
        // in the same evaluate as creation would miss the children.
        await h.waitFrames(3);

        // --- 3. A solid wall blocks projectiles ---
        const wallBlock = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const wall = app.findWorldObject('in_wall').createInstance();
            wall.position = pm.player.position.add(new BABYLON.Vector3(-10, 1.5, 6));
            wall.computeWorldMatrix(true);
            // projectileBlocked's ray only reaches |vel| + 0.25 ahead, so the
            // probe velocity must span the 3-unit gap to the wall plane.
            const W = wall.position;
            const hit = pm.projectileBlocked(new BABYLON.Vector3(W.x, W.y, W.z - 3), new BABYLON.Vector3(0, 0, 3.5));
            const miss = pm.projectileBlocked(new BABYLON.Vector3(W.x, W.y + 8, W.z - 3), new BABYLON.Vector3(0, 0, 3.5));
            return { hit, miss };
        });
        console.log('[3] wall blocking', wallBlock);
        check('a shot into in_wall is blocked', wallBlock.hit === true, wallBlock);
        check('a shot over the wall is not blocked', wallBlock.miss === false, wallBlock);

        // --- 4. The doorway wall blocks segments/lintel but not the gap ---
        // Geometry (relative to the root segment centre): gap spans x 0.625..2.125,
        // bottom -1.5 up to 0.75; lintel fills 0.75..1.5 above the gap.
        const doorway = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const Q = window.__wallDoor.position;
            const ray = (dx, dy) => pm.projectileBlocked(
                new BABYLON.Vector3(Q.x + dx, Q.y + dy, Q.z - 3), new BABYLON.Vector3(0, 0, 3.5));
            return {
                segment: ray(0, 0),        // through the root segment
                gap: ray(1.375, 0),        // through the doorway opening
                lintel: ray(1.375, 1.2),   // above the opening
            };
        });
        console.log('[4] doorway', doorway);
        check('the wall segment blocks', doorway.segment === true, doorway);
        check('the doorway gap lets shots through', doorway.gap === false, doorway);
        check('the lintel above the gap blocks', doorway.lintel === true, doorway);

        // --- 5. The sliding door: closed blocks, open passes + fires `opened` once ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const door = app.findWorldObject('pr_door').createInstance();
            door.position = pm.player.position.add(new BABYLON.Vector3(0, 1.5, -8));
            window.__door = door;
            const counter = app.findWorldObject('l_counter').createInstance();
            counter.position = door.position.add(new BABYLON.Vector3(3, 0, 0));
            window.__counter = counter;
            door.wires.push({ event: 'opened', toWo: 'l_counter', toId: counter.worldId, action: 'increment' });
        });
        await h.waitFrames(3);   // let the clone's child matrices settle
        const doorSetup = await h.evaluate(() => {
            const pm = window.app.activeMode;
            // Panel centre sits at +0.675 from the root jamb.
            const D = window.__door.position;
            const blockedClosed = pm.projectileBlocked(
                new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5));
            window.__door.script.onInput('open');
            return { blockedClosed, count0: window.__counter.script.count };
        });
        console.log('[5] door setup', doorSetup);
        check('the closed door panel blocks the gap', doorSetup.blockedClosed === true, doorSetup);
        await h.waitFor(() => window.__door.script._t === 1, null, 20000);
        await h.waitFrames(3);   // panel matrix settles at its slid position
        const doorOpen = await h.evaluate(() => {
            const pm = window.app.activeMode;
            const D = window.__door.position;
            const panel = window.__door.getChildMeshes().find((m) => m.name.indexOf('panel') >= 0);
            return {
                blockedOpen: pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                panelX: panel ? panel.position.x : null,
                count: window.__counter.script.count,
            };
        });
        console.log('[5b] door open', doorOpen);
        check('the open door lets shots through the gap', doorOpen.blockedOpen === false, doorOpen);
        check('the panel slid sideways (x ~ 1.825)', Math.abs(doorOpen.panelX - 1.825) < 0.01, doorOpen);
        check('the `opened` output fired the wired counter exactly once', doorOpen.count === 1, doorOpen);

        // --- 6. onPlayReset returns the door to its startOpen state ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.respawn();   // broadcasts onPlayReset to every script
            const panel = window.__door.getChildMeshes().find((m) => m.name.indexOf('panel') >= 0);
            return { t: window.__door.script._t, panelX: panel.position.x };
        });
        console.log('[6] play reset', reset);
        check('respawn shuts the door back to startOpen=no', reset.t === 0 && Math.abs(reset.panelX - 0.675) < 0.01, reset);

        // --- 7. Build and screenshot a furnished room around the player ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const c = pm.player.position.clone(); c.y += 0.01;
            const mk = (name, dx, dy, dz, rotY) => {
                const inst = app.findWorldObject(name).createInstance();
                inst.position = new BABYLON.Vector3(c.x + dx, c.y + dy, c.z + dz);
                if (rotY) inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(rotY, 0, 0);
                return inst;
            };
            mk('in_floor', 0, 0, 0);
            mk('in_wall', 0, 1.5, 2);                                  // back wall
            mk('in_wall_window', -1.375, 1.5, -2);                     // front wall w/ window
            mk('in_wall', -2, 1.5, 0, Math.PI / 2);                    // left wall
            mk('in_wall_door', 2, 1.5, -1.375, Math.PI / 2);           // right wall w/ doorway
            mk('d_table', -0.6, 0.8, 0.8);
            mk('d_chair', -0.6, 0.6, -0.2);
            mk('d_lamp', -1.5, 0.85, 1.4);
            mk('d_rug', 0.3, 0.06, -0.3);
        });
        await h.waitFrames(15);
        await h.screenshot('furnished-room');

        // --- 8. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during interiors', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — walls block, doorways pass, the sliding door wires up, and rooms furnish.'
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
