/*
 * Animation / motion test
 * -----------------------
 * Single screenshots can't tell a living scene from a frozen one, so this test
 * samples the game a few frames per second and asserts that things actually move
 * and animate over time:
 *   - a walker enemy closes the distance to the player (AI + locomotion),
 *   - the walker's legs swing as it moves (procedural animation),
 *   - the rendered scene visibly changes across a captured filmstrip (not frozen),
 *   - defeated enemies produce pixel cubes that animate/home to the player.
 *
 * It also reports (without failing) whether the player avatar's own skeleton is
 * animating, to surface the known "avatar is a static pose" gap.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

// Sum every bone's local matrix — a single number that changes iff the skeleton
// is being animated. Used as an informational probe of the avatar's animation.
const boneSum = () => {
    const pm = window.app.activeMode, sk = pm && pm.player && pm.player.skeleton;
    if (!sk) return null;
    let s = 0;
    sk.bones.forEach((b) => { const m = b.getLocalMatrix().m; for (let i = 0; i < 16; i++) s += m[i]; });
    return Math.round(s * 1000) / 1000;
};

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.evaluate(() => { window.app.pixels = 0; window.app.saveEconomy(); });
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        // Deterministic field: no ambient spawns, empty enemy list.
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // --- Informational: is the player avatar's skeleton animating? ---
        const idle = await h.sampleSeries(boneSum, { samples: 8, everyFrames: 4 });
        const idleDistinct = new Set(idle.filter((v) => v !== null)).size;
        console.log('\n[info] player avatar skeleton distinct pose samples:', idleDistinct,
            idleDistinct > 1 ? '(animating)' : '(STATIC — avatar animations not wired up yet)');

        // --- 1 & 2. A walker moves toward the player and swings its legs ---
        const walk = await h.sampleSeries(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            let e = em.enemies.find((x) => x.kind === 'walker');
            if (!e) {
                em.spawnWalker();
                e = em.enemies.find((x) => x.kind === 'walker');
                const p = pm.player.position;
                e.mesh.position = new BABYLON.Vector3(p.x + 6, p.y + 0.2, p.z);
                e.speed = 3;
            }
            const leg = e.mesh.getChildren ? e.mesh.getChildren().find((n) => /lhip/i.test(n.name)) : null;
            const dist = Math.hypot(e.mesh.position.x - pm.player.position.x, e.mesh.position.z - pm.player.position.z);
            return {
                dist: Math.round(dist * 100) / 100,
                pos: [Math.round(e.mesh.position.x * 100) / 100, Math.round(e.mesh.position.z * 100) / 100],
                legRot: leg ? Math.round((leg.rotation.x || 0) * 1000) / 1000 : null,
            };
        }, { samples: 8, everyFrames: 4 });
        console.log('[1/2] walker series:', JSON.stringify(walk));
        const dFirst = walk[0].dist, dLast = walk[walk.length - 1].dist;
        const movedPositions = new Set(walk.map((s) => s.pos.join(','))).size;
        const distinctLegRots = new Set(walk.map((s) => s.legRot)).size;
        check('walker closes the distance to the player over time', dLast < dFirst - 1.0, { dFirst, dLast });
        check('walker actually changes position frame to frame', movedPositions >= 4, { movedPositions });
        check('walker legs swing as it walks (procedural animation)', distinctLegRots >= 3, { distinctLegRots, rots: walk.map((s) => s.legRot) });

        // --- 3. Defeated enemies produce animating pixel cubes (numeric) ---
        // Pixel bursts spawn at the player and home to it, so they're reliably
        // on-screen -- ideal for both the numeric check here and the filmstrip.
        const spawnBurst = () => h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.pixelBursts.forEach((b) => b.mesh && b.mesh.dispose()); pm.pixelBursts = [];
            const e = window.app.findWorldObject('en_blob').createInstance();
            e.position = pm.player.position.add(new BABYLON.Vector3(1.6, 0, 0));
            e.hp = 1;
            pm.attack();   // defeat it -> spawns a pixel burst
            return { bursts: pm.pixelBursts.length };
        });
        const burst = await spawnBurst();
        const burstSeries = await h.sampleSeries(() => {
            const pm = window.app.activeMode;
            let sx = 0; pm.pixelBursts.forEach((b) => { if (b.mesh) sx += b.mesh.position.x + b.mesh.position.y; });
            return { n: pm.pixelBursts.length, posSum: Math.round(sx * 100) / 100, px: window.app.pixels };
        }, { samples: 10, everyFrames: 2 });
        console.log('[3] burst spawn:', burst, 'series:', JSON.stringify(burstSeries));
        const peak = Math.max(...burstSeries.map((s) => s.n));
        const distinctPosSums = new Set(burstSeries.map((s) => s.posSum)).size;
        const finalPx = burstSeries[burstSeries.length - 1].px;
        check('defeating an enemy spawns pixel cubes', peak > 0, { peak });
        check('the pixel cubes animate (move/collect) over time', distinctPosSums >= 3, { distinctPosSums });
        check('collected pixels are counted', finalPx > 0, { finalPx });

        // --- 4. The rendered scene visibly changes across a filmstrip ---
        // Capture while a fresh burst is homing (guaranteed on-screen motion), so
        // a frozen render would show as byte-identical frames.
        await spawnBurst();
        const strip = await h.filmstrip('animation', { frames: 6, everyFrames: 2 });
        check('the rendered scene changes across the filmstrip (not frozen)',
            strip.distinctFrames >= 3, strip);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — sampled over time: enemies move & animate, the scene is live, and pixels animate to the player.'
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
