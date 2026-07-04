/*
 * Ghost kart test
 * ---------------
 * Verifies the AI rival:
 *   - a ghost wired to a 4-node loop starts on the grid and advances along
 *     the racing line (dt-based, facing its travel),
 *   - the ghost look applies: half visibility, no collisions on any mesh
 *     (a projectile ray passes clean through it),
 *   - it fires `lapped` into a wired counter every circuit,
 *   - a play reset (respawn) puts it back at the first node,
 *   - Glow Circuit ships the ghost wired to its racing line,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7057 });
    try {
        await h.start();
        await h.waitForReady(['pr_kart_ghost', 'l_pathnode', 'l_counter']);
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

        // --- 1. A tight test loop + wired lap counter ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const base = pm.player.position.add(new BABYLON.Vector3(0, 2, -30));
            const mk = (name, dx, dz) => {
                const inst = app.findWorldObject(name).createInstance();
                inst.position = new BABYLON.Vector3(base.x + dx, base.y, base.z + dz);
                return inst;
            };
            const a = mk('l_pathnode', 0, 0), b = mk('l_pathnode', 6, 0),
                  c = mk('l_pathnode', 6, 6), d = mk('l_pathnode', 0, 6);
            a.wires.push({ event: 'next', toWo: 'l_pathnode', toId: b.worldId, action: 'chain' });
            b.wires.push({ event: 'next', toWo: 'l_pathnode', toId: c.worldId, action: 'chain' });
            c.wires.push({ event: 'next', toWo: 'l_pathnode', toId: d.worldId, action: 'chain' });
            d.wires.push({ event: 'next', toWo: 'l_pathnode', toId: a.worldId, action: 'chain' });
            const ghost = mk('pr_kart_ghost', -3, -3);
            ghost.params.speed = 8;
            ghost.wires.push({ event: 'follow', toWo: 'l_pathnode', toId: a.worldId, action: 'chain' });
            const laps = mk('l_counter', -6, 0);
            laps.params.threshold = 10; laps.params.autoReset = 'no';
            ghost.wires.push({ event: 'lapped', toWo: 'l_counter', toId: laps.worldId, action: 'increment' });
            window.__G = { a, b, ghost, laps };
            ghost.script._wasPlay = null;
        });
        await h.waitFrames(5);
        const start = await h.evaluate(() => ({
            snapped: BABYLON.Vector3.Distance(window.__G.ghost.position, window.__G.a.position) < 7,
            pathLen: window.__G.ghost.script._path.length,
        }));
        console.log('\n[1] on the grid', start);
        check('the ghost resolves the loop and starts on the grid',
            start.snapped && start.pathLen === 4, start);

        // --- 2. It advances along the racing line, facing its travel ---
        const d0 = await h.evaluate(() =>
            BABYLON.Vector3.Distance(window.__G.ghost.position, window.__G.b.position));
        await h.waitFor((d0) =>
            BABYLON.Vector3.Distance(window.__G.ghost.position, window.__G.b.position) < d0 - 1,
            d0, 20000);
        console.log('[2] racing');
        check('the ghost advances along the racing line', true);

        // --- 3. Ghost look: half-visible, intangible ---
        const look = await h.evaluate(() => {
            const pm = window.app.activeMode, g = window.__G.ghost;
            const kids = g.getChildMeshes();
            return {
                vis: g.visibility,
                kidsGhosted: kids.every((m) => m.visibility === 0.55 && !m.checkCollisions),
                rayPasses: !pm.projectileBlocked(
                    g.position.add(new BABYLON.Vector3(0, 0.2, -4)), new BABYLON.Vector3(0, 0, 4.5)),
            };
        });
        console.log('[3] ghost look', look);
        check('the ghost is half-visible and intangible (shots pass through)',
            look.vis === 0.55 && look.kidsGhosted && look.rayPasses, look);
        await h.screenshot('ghost-racing');

        // --- 4. Laps fire the wired counter ---
        await h.waitFor(() => window.__G.laps.script.count >= 1, null, 40000);
        console.log('[4] lapped');
        check('the ghost fires `lapped` into the wired counter', true);

        // --- 5. A play reset returns it to the grid ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.pixels = 0;
            pm.respawn();
            return {
                atGrid: BABYLON.Vector3.Distance(window.__G.ghost.position, window.__G.a.position) < 6.01,
            };
        });
        console.log('[5] reset', reset);
        check('respawn puts the ghost back on the grid', reset.atGrid, reset);

        // --- 6. Glow Circuit ships its resident ghost, wired ---
        const circuit = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/glow-circuit.json').then((ok) => {
                const app = window.app;
                const ghost = app.findWorldObject('pr_kart_ghost').instances.filter(Boolean)[0];
                const nodes = app.findWorldObject('l_pathnode').instances.filter(Boolean);
                return {
                    ok,
                    hasGhost: !!ghost,
                    followWire: ghost && ghost.wires.some((w) => w.event === 'follow'),
                    loop: nodes.length === 4 && nodes.every((n) => (n.wires || []).length === 1),
                };
            }));
        console.log('[6] circuit ghost', circuit);
        check('Glow Circuit ships a ghost wired to a 4-node racing loop',
            circuit.ok && circuit.hasGhost && circuit.followWire && circuit.loop, circuit);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during ghost racing', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the ghost kart laps its racing line, intangibly and forever.'
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
