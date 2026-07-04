/*
 * Trigger-wiring test
 * -------------------
 * Verifies the trigger-volume + event-wiring system and the overhead 3D wiring
 * view:
 *   - triggers expose output events and spawners expose input actions,
 *   - a wire delivers a trigger's event to a spawner's input (fireEvent),
 *   - a spawner spawns the wired enemy on the event, capped at its limit,
 *   - the player physically entering a trigger fires it,
 *   - wires persist through save/load,
 *   - the wiring view lifts the camera overhead, shows the interactive objects,
 *     draws 3D wire meshes, and click-to-wire (handlePick) connects objects.
 */

const { GameHarness } = require('./harness');

const MENU_WIRING = 10;
const MENU_PAUSE = 2;
let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_cube_1x1', 'l_trigger', 'l_spawner', 'en_blob']);

        // New game -> play mode.
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

        // Create a trigger and a spawner directly, positioned apart. Spawner is
        // configured NOT to free-run so every spawn is attributable to a wire.
        const setup = await h.evaluate(() => {
            const app = window.app;
            const trig = app.findWorldObject('l_trigger').createInstance();
            trig.position = new BABYLON.Vector3(4, 1, 4);
            const spawn = app.findWorldObject('l_spawner').createInstance();
            spawn.position = new BABYLON.Vector3(-4, 0.25, -4);
            spawn.params.enemyType = 'flyer';
            spawn.params.frequency = 1;
            spawn.params.limit = 2;
            spawn.params.startActive = 'no';
            return {
                trigId: trig.worldId, spawnId: spawn.worldId,
                outs: (trig.script.outputs || []).map((o) => o.id),
                ins: (spawn.script.inputs || []).map((i) => i.id),
            };
        });
        console.log('\n[1] I/O defs', setup);
        check('trigger exposes entered/exited outputs',
            setup.outs.length === 2 && setup.outs.indexOf('entered') >= 0 && setup.outs.indexOf('exited') >= 0, setup);
        check('spawner exposes spawn/enable/disable/toggle inputs',
            setup.ins.length === 4 && setup.ins.indexOf('spawn') >= 0, setup);

        // --- 2. Wire API: add / has / toggle ---
        const wireApi = await h.evaluate((s) => {
            const app = window.app;
            const trig = app.findInstance('l_trigger', s.trigId);
            app.addWire(trig, 'entered', 'l_spawner', s.spawnId, 'spawn');
            const has1 = app.hasWire(trig, 'entered', 'l_spawner', s.spawnId, 'spawn');
            const off = app.toggleWire(trig, 'entered', 'l_spawner', s.spawnId, 'spawn'); // removes
            const on = app.toggleWire(trig, 'entered', 'l_spawner', s.spawnId, 'spawn');  // re-adds
            return { has1, off, on, wires: trig.wires.length };
        }, setup);
        console.log('[2] wire api', wireApi);
        check('addWire/hasWire records a wire', wireApi.has1 === true, wireApi);
        check('toggleWire removes then re-adds', wireApi.off === false && wireApi.on === true, wireApi);

        // --- 3. fireEvent: trigger event -> spawner spawns the wired enemy ---
        const fired = await h.evaluate(async (s) => {
            const app = window.app, pm = app.activeMode;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            const trig = app.findInstance('l_trigger', s.trigId);
            app.fireEvent(trig, 'entered');   // as if the player entered
            await new Promise((r) => { let n = 0; const t = () => (++n >= 15 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { count: pm.enemyManager.enemies.length, kinds: pm.enemyManager.enemies.map((e) => e.kind) };
        }, setup);
        console.log('[3] fireEvent spawn', fired);
        check('a wired trigger event spawns from the spawner', fired.count >= 1, fired);
        check('the spawned enemy is the configured type (flyer)',
            fired.kinds.length > 0 && fired.kinds.every((k) => k === 'flyer'), fired);

        // --- 4. Respects the spawner limit under repeated events ---
        const capped = await h.evaluate(async (s) => {
            const app = window.app, pm = app.activeMode;
            const trig = app.findInstance('l_trigger', s.trigId);
            for (let i = 0; i < 6; i++) app.fireEvent(trig, 'entered');
            await new Promise((r) => { let n = 0; const t = () => (++n >= 20 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { count: pm.enemyManager.enemies.length };
        }, setup);
        console.log('[4] limit', capped);
        check('spawner respects its max-alive limit (2)', capped.count <= 2, capped);

        // --- 5. The player physically entering the trigger fires it ---
        const entered = await h.evaluate(async (s) => {
            const app = window.app, pm = app.activeMode;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            const trig = app.findInstance('l_trigger', s.trigId);
            trig.script.state.entered = [];   // reset edge detector
            trig.scaling = new BABYLON.Vector3(2, 2, 2);
            trig.position = pm.player.position.clone();
            await new Promise((r) => { let n = 0; const t = () => (++n >= 25 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); });
            return { activated: trig.script.state.activated, count: pm.enemyManager.enemies.length };
        }, setup);
        console.log('[5] player-enter', entered);
        check('the player entering the trigger fires it and spawns', entered.count >= 1, entered);

        // --- 6. Wires persist through save/load ---
        const persist = await h.evaluate((s) => {
            const app = window.app;
            app.world.saveToSlot(4);
            app.world.clearWorld();
            app.world.loadFromSlot(4);
            const trig = app.findWorldObject('l_trigger').instances.filter(Boolean)[0];
            return {
                trigId: trig ? trig.worldId : null,
                spawnId: app.findWorldObject('l_spawner').instances.filter(Boolean)[0] &&
                    app.findWorldObject('l_spawner').instances.filter(Boolean)[0].worldId,
                wires: trig ? trig.wires : null,
            };
        }, setup);
        console.log('[6] persistence', persist);
        check('wires survive save/load',
            persist.wires && persist.wires.some((w) => w.event === 'entered' && w.toWo === 'l_spawner' && w.action === 'spawn'),
            persist);

        // --- 7. Overhead wiring view (from build mode, plain camera) ---
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFrames(6);
        await h.evaluate(() => window.app.openWiring());
        await h.waitFrames(45);   // let the camera ease overhead
        const view = await h.evaluate(() => {
            const app = window.app, w = app.wiring, cam = app.camera;
            const label0 = w.wireLabels[0];
            return {
                state: app.menu.state, active: w.active,
                nodes: w.nodes.length, wireMeshes: w.wireMeshes.length,
                wireLabels: w.wireLabels.length,
                labelText: label0 && label0.children[0] ? label0.children[0].text : null,
                guide: !!app.gui.getControlByName('wiringGuide'),
                titleWrap: !!app.gui.getControlByName('wiringTitleWrap'),
                beta: Math.round(cam.beta * 1000) / 1000,
                hidden: w.hiddenMeshes.length,
            };
        });
        console.log('[7] wiring view', view);
        check('openWiring enters the wiring state', view.state === MENU_WIRING && view.active === true, view);
        check('wiring view shows the interactive objects', view.nodes >= 2, view);
        check('wiring view draws 3D wire meshes for existing wires', view.wireMeshes > 0, view);
        check('every wire carries a name label ("event → action")',
            view.wireLabels > 0 && /→/.test(view.labelText || ''), view);
        check('the right-side wiring guide panel is shown', view.guide === true, view);
        check('the title sits in an opaque pill (no hint bleeding through)', view.titleWrap === true, view);
        check('the camera eased to an overhead view (small beta)', view.beta < 0.4, view);
        await h.screenshot('wiring-view');

        // --- 8. Drag-to-wire with the event/action chooser ---
        const drag = await h.evaluate((s) => {
            const app = window.app, w = app.wiring;
            const trig = app.findInstance('l_trigger', s.trigId);
            const spawn = app.findInstance('l_spawner', s.spawnId);
            // Clear existing wires, then simulate the drag gesture.
            trig.wires = [];
            w.rebuild();
            w.startWireDrag(trig);                     // pointer-down on the trigger
            const dragging = !!w.drag && w.drag.src === trig;
            w.endWireDrag(spawn);                      // release over the spawner
            // Trigger has 2 outputs and the spawner 4 inputs -> chooser opens.
            const chooserOpen = !!w.pendingWire && w.chooserControls.length > 0;
            w.chooseOutput('entered');
            w.chooseAction('spawn');
            return {
                dragging, chooserOpen,
                wired: app.hasWire(trig, 'entered', 'l_spawner', spawn.worldId, 'spawn'),
                wireMeshes: w.wireMeshes.length,
                chooserClosed: w.chooserControls.length === 0,
            };
        }, { trigId: persist.trigId, spawnId: persist.spawnId }).catch((e) => ({ err: String(e) }));
        console.log('[8] drag-to-wire', drag);
        check('dragging starts from an output-capable object', drag.dragging === true, drag);
        check('releasing on a multi-port target opens the chooser', drag.chooserOpen === true, drag);
        check('choosing event + action creates the wire', drag.wired === true && drag.chooserClosed === true, drag);
        await h.screenshot('wiring-connected');

        // --- 8b. Clicking a wire deletes it ---
        const del = await h.evaluate((s) => {
            const app = window.app, w = app.wiring;
            const trig = app.findInstance('l_trigger', s.trigId);
            const before = trig.wires.length;
            const lineMesh = w.wireMeshes.find((m) => m._wire && m._wire.src === trig);
            w.deleteWire(lineMesh._wire.src, lineMesh._wire.wire);   // what a wire click does
            return { before, after: trig.wires.length, meshes: w.wireMeshes.length };
        }, { trigId: persist.trigId }).catch((e) => ({ err: String(e) }));
        console.log('[8b] delete wire', del);
        check('clicking a wire deletes it', del.before === 1 && del.after === 0 && del.meshes === 0, del);

        // --- 9. Exiting restores the scene and returns to the pause menu ---
        const exited = await h.evaluate(() => {
            const app = window.app;
            app.triggerMenuItem(10 /* MENU_WIRING */, 0);
            return { state: app.menu.state, active: app.wiring.active, hidden: app.wiring.hiddenMeshes.length };
        });
        console.log('[9] exit', exited);
        check('exiting the wiring view returns to the pause menu', exited.state === MENU_PAUSE, exited);
        check('exiting restores hidden scene objects', exited.active === false && exited.hidden === 0, exited);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — triggers fire wired events, spawners react, wires persist, and the overhead wiring view connects objects.'
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
