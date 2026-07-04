/*
 * Build/wiring UX test (user-feedback batch)
 * ------------------------------------------
 * Verifies the selection overhaul:
 *   - the left sidebar lists the browsed category with the selection
 *     highlighted, and clicking a row selects that object for placement,
 *   - Shift+Space in cursor mode opens the highlighted object's properties
 *     (Space alone grabs -- covered by test-move-object),
 *   - a real mouse TAP on a placed object selects it in cursor mode,
 *   - in the wiring view, a mouse tap on an object opens its inspector
 *     card (ports + wires), a tap on a wire opens the wire card with the
 *     wire highlighted, and the card's Delete removes exactly that wire,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

// Project a world position to screen pixels (in-page helper source).
const PROJECT = `(function (pos) {
    const app = window.app, scene = app.scene, engine = scene.getEngine();
    const p = BABYLON.Vector3.Project(pos, BABYLON.Matrix.Identity(),
        scene.getTransformMatrix(),
        app.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
    return { x: p.x, y: p.y };
})`;

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7076 });
    try {
        await h.start();
        await h.waitForReady(['t_tramp', 'l_trigger', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        await h.waitFrames(10);

        // --- 1. The sidebar lists the category; a row click selects ---
        const sidebar = await h.evaluate(() => {
            const gui = window.app.gui;
            const panel = gui.getControlByName('buildSidebar');
            const rows = panel ? panel.children.filter((c) => c.name && c.name.indexOf('sbRow_') === 0) : [];
            return { exists: !!panel, rows: rows.length };
        });
        console.log('\n[1] sidebar', sidebar);
        check('the left sidebar lists the browsed category', sidebar.exists && sidebar.rows >= 3, sidebar);

        const picked = await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const row = app.gui.getControlByName('sbRow_t_tramp');
            if (!row) return { row: false };
            row.onPointerUpObservable.notifyObservers();
            return { row: true };
        });
        await h.waitFor(() => {
            const bm = window.app.activeMode;
            return bm.currentInstance && bm.currentWorldObject &&
                bm.currentWorldObject.name === 't_tramp';
        }, null, 20000);
        console.log('[2] row click selected the trampoline');
        check('clicking a sidebar row selects that object for placement', picked.row, picked);
        await h.screenshot('sidebar');

        // --- 2. Place it, then Shift+Space opens its properties ---
        await h.tapKey(' ');   // place the tramp (noAutoParams: no popup)
        await h.waitFrames(4);
        await h.tapUntil('0', () => !window.app.activeMode.currentInstance);   // cursor mode
        await h.evaluate(() => {
            const bm = window.app.activeMode;
            window.__tramp = bm.placedInstances[bm.placedInstances.length - 1].inst;
            bm.selection = [window.__tramp];
            window.app.keysPressed['SHIFT'] = true;
        });
        await h.tapUntil(' ', () => window.app.menu.state === 9);
        await h.evaluate(() => { window.app.keysPressed['SHIFT'] = false; });
        const params = await h.evaluate(() => ({
            state: window.app.menu.state,
            target: window.app.paramTarget === window.__tramp,
        }));
        console.log('[3] shift+space params', params);
        check('Shift+Space opens the highlighted object\'s properties',
            params.state === 9 && params.target, params);
        await h.evaluate(() => { window.app.triggerMenuItem(9, 0); });   // close

        // --- 3. A real mouse tap selects a placed object ---
        await h.evaluate(() => {
            const bm = window.app.activeMode;
            bm.selection = [];   // clear; the click must do the selecting
        });
        await h.waitFrames(3);
        const pt = await h.evaluate((src) => {
            return eval(src)(window.__tramp.getAbsolutePosition());
        }, PROJECT);
        await h.page.mouse.click(Math.round(pt.x), Math.round(pt.y));
        await h.waitFor(() => {
            const bm = window.app.activeMode;
            return bm.selection && bm.selection.length > 0 && bm.selection[0] === window.__tramp;
        }, null, 20000);
        console.log('[4] mouse tap selected the trampoline');
        check('a mouse tap selects a placed object in cursor mode', true);

        // --- 4. Wiring: tap an object -> inspector; tap a wire -> wire card ---
        await h.evaluate(() => {
            const app = window.app, bm = app.activeMode;
            const trig = app.findWorldObject('l_trigger').createInstance();
            trig.position = window.__tramp.position.add(new BABYLON.Vector3(4, 0.5, 0));
            const count = app.findWorldObject('l_counter').createInstance();
            count.position = trig.position.add(new BABYLON.Vector3(4, 0, 0));
            app.addWire(trig, 'entered', 'l_counter', count.worldId, 'increment');
            window.__W = { trig, count };
            app.openWiring();
        });
        await h.waitFor(() => window.app.wiring && window.app.wiring.active &&
            window.app.wiring.wireMeshes.length > 0, null, 20000);
        await h.waitFrames(50);   // let the camera settle overhead

        const nodePt = await h.evaluate((src) => {
            return eval(src)(window.__W.trig.getAbsolutePosition());
        }, PROJECT);
        await h.page.mouse.click(Math.round(nodePt.x), Math.round(nodePt.y));
        await h.waitFor(() => !!window.app.gui.getControlByName('wireInspector'), null, 20000);
        console.log('[5] object inspector opened');
        check('tapping a wiring object opens its inspector card', true);
        await h.screenshot('wiring-inspector');

        const wirePt = await h.evaluate((src) => {
            const w = window.app.wiring;
            const mesh = w.wireMeshes.find((m) => m._wire);
            window.__wireMesh = mesh;
            return eval(src)(mesh.getAbsolutePosition());
        }, PROJECT);
        await h.page.mouse.click(Math.round(wirePt.x), Math.round(wirePt.y));
        await h.waitFor(() => !!window.app.gui.getControlByName('wireInspectorWire'), null, 20000);
        const wireCard = await h.evaluate(() => ({
            glow: window.__wireMesh.scaling.y > 2,
            wires: window.__W.trig.wires.length,
        }));
        console.log('[6] wire card', wireCard);
        check('tapping a wire opens its card with the wire highlighted',
            wireCard.glow && wireCard.wires === 1, wireCard);

        // Delete from inside the card.
        await h.evaluate(() => {
            const panel = window.app.gui.getControlByName('wireInspectorWire');
            const btns = panel.getDescendants(false).filter((c) =>
                c.textBlock && c.textBlock.text === '[ Delete Wire ]');
            btns[0].onPointerUpObservable.notifyObservers();
        });
        await h.waitFor(() => window.__W.trig.wires.length === 0, null, 20000);
        console.log('[7] wire deleted from the card');
        check('the card\'s Delete removes exactly that wire', true);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the UX flows', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — one-thumb keys, clickable worlds, and explorable wiring.'
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
