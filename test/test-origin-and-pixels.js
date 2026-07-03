/*
 * Origin-collision + pixel-lifetime regression test
 * -------------------------------------------------
 * Two bug fixes:
 *   1. WorldObject TEMPLATE meshes (invisible, only ever cloned/instanced) must
 *      NOT contribute to collision -- otherwise they sit at the world origin as
 *      invisible obstacles the player bumps into. Asserts no invisible colliding
 *      mesh remains near the origin.
 *   2. Pixel-burst cubes must not orbit the player forever -- they have a hard
 *      lifetime cap and a growing collect radius, so every pixel is collected
 *      within a few seconds. Asserts a burst fully drains (and all pixels are
 *      credited) even when the player never moves.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7028 });
    try {
        await h.start();
        // Include christmas/cyberpunk prim objects (their multi-mesh templates
        // with colliderMeshes were the invisible origin obstacles).
        await h.waitForReady(['t_tile', 'en_blob', 'd_christmas_tree', 'cp_platform_2x2']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(15);

        // --- 1. No invisible colliding mesh near the origin ---
        const originColliders = await h.evaluate(() => {
            const out = [];
            window.app.scene.meshes.forEach((m) => {
                if (!m.checkCollisions) return;
                const p = m.getAbsolutePosition ? m.getAbsolutePosition() : m.position;
                // Only flag meshes that are INVISIBLE (a real placed/visible
                // object at the origin, like a terrain tile, is legitimate) and
                // actually near the origin and carry geometry.
                if (m.isVisible === false && Math.abs(p.x) < 2 && Math.abs(p.z) < 2 &&
                    m.getTotalVertices && m.getTotalVertices() > 0) {
                    out.push({ name: m.name, verts: m.getTotalVertices() });
                }
            });
            return out;
        });
        console.log('\n[1] invisible colliders near origin:', JSON.stringify(originColliders));
        check('no invisible template mesh collides at the world origin', originColliders.length === 0, originColliders);

        // Also assert every world-object TEMPLATE tree is collision-free.
        const collidingTemplates = await h.evaluate(() => {
            const walk = (n, acc) => {
                if (n.checkCollisions) acc.push(n.name);
                (n.getChildMeshes ? n.getChildMeshes() : []).forEach((c) => { if (c.checkCollisions) acc.push(c.name); });
                return acc;
            };
            return window.app.BuildableObjectList
                .map((wo) => ({ wo: wo.name, nodes: walk(wo.mesh, []) }))
                .filter((t) => t.nodes.length > 0);
        });
        console.log('[1] colliding templates:', JSON.stringify(collidingTemplates));
        check('no world-object template has collisions enabled', collidingTemplates.length === 0, collidingTemplates);
        await h.screenshot('origin-clear');

        // A placed instance still collides (regression guard: the fix must not
        // strip collisions from real objects). Terrain tiles are placed with
        // collisions, so at least one visible colliding mesh must exist.
        const visibleColliders = await h.evaluate(() =>
            window.app.scene.meshes.filter((m) => m.checkCollisions && m.isVisible !== false).length);
        console.log('[1] visible colliders (should be > 0):', visibleColliders);
        check('real (visible) objects still collide', visibleColliders > 0, { visibleColliders });

        // --- 2. Pixel bursts drain within their lifetime (no eternal orbit) ---
        const px0 = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.pixels = 0;
            pm.pixelBursts.forEach((b) => b.mesh && b.mesh.dispose());
            pm.pixelBursts = [];
            // Spawn a burst offset from the player so the cubes must home in.
            const p = pm.player.position.add(new BABYLON.Vector3(3, 0, 3));
            pm.spawnPixelBurst(p, 14);
            return { bursts: pm.pixelBursts.length, pixels: window.app.pixels };
        });
        console.log('\n[2] pixel burst spawned:', px0);
        check('a pixel burst spawned cubes', px0.bursts >= 10, px0);

        // Within the lifetime cap (~300 frames) every cube must be gone.
        await h.waitFor(() => window.app.activeMode.pixelBursts.length === 0, null, 30000);
        const px1 = await h.evaluate(() => ({
            remaining: window.app.activeMode.pixelBursts.length,
            pixels: window.app.pixels,
            liveMeshes: window.app.scene.meshes.filter((m) => m.name === 'pixel').length,
        }));
        console.log('[2] after draining:', px1);
        check('all pixel cubes are collected within their lifetime (no eternal orbit)',
            px1.remaining === 0 && px1.liveMeshes === 0, px1);
        check('every collected pixel was credited', px1.pixels === px0.bursts, px1);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — no invisible origin colliders; pixel bursts always drain (no eternal orbit).'
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
