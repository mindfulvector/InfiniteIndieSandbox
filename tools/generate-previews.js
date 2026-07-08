#!/usr/bin/env node
/*
 * generate-previews.js — backend preview cache for the DI-style grid menus.
 * ---------------------------------------------------------------------------
 * Renders (once) and caches:
 *   assets/previews/worlds/<file>.png   — one per gallery world (level)
 *   assets/previews/figures/<id>.png    — one portrait per playable figure
 *
 * Only MISSING previews are generated, so this can run on every deploy /
 * server start and cost nothing when the cache is warm:
 *      node tools/generate-previews.js            # fill gaps
 *      node tools/generate-previews.js --force    # regenerate everything
 *
 * Uses the same headless harness the test suites run on (php server +
 * headless Chromium + SwiftShader), so previews match the real in-game look.
 */
const fs = require('fs');
const path = require('path');
const { GameHarness } = require('../test/harness');

const ROOT = path.join(__dirname, '..');
const WORLDS_DIR = path.join(ROOT, 'assets/previews/worlds');
const FIGS_DIR = path.join(ROOT, 'assets/previews/figures');
const FORCE = process.argv.includes('--force');

// Square crop from the 1280x720 viewport, centered on the action.
const CLIP = { x: 280, y: 0, width: 720, height: 720 };

async function main() {
    fs.mkdirSync(WORLDS_DIR, { recursive: true });
    fs.mkdirSync(FIGS_DIR, { recursive: true });

    const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/worlds/index.json'), 'utf8'));
    const worlds = index.gallery.filter((g) => {
        const out = path.join(WORLDS_DIR, g.file.replace(/\.json$/, '') + '.png');
        return FORCE || !fs.existsSync(out);
    });

    // Figure list comes from the live app (it owns FIGURES).
    const h = new GameHarness({ headless: true, port: parseInt(process.env.IIS_PORT || '7085', 10) });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'pr_door']);
        const figures = await h.evaluate(() => FIGURES.map((f) => ({ id: f.id, tint: f.tint })));
        const figsTodo = figures.filter((f) =>
            FORCE || !fs.existsSync(path.join(FIGS_DIR, f.id + '.png')));

        if (!worlds.length && !figsTodo.length) {
            console.log('preview cache is warm — nothing to generate');
            return;
        }
        console.log('generating ' + worlds.length + ' world preview(s), ' +
            figsTodo.length + ' figure portrait(s)');

        // ---- figure portraits ------------------------------------------------
        // The avatar on a figure-tinted backdrop card (the tint IS the
        // figure's identity colour — the model itself is shared).
        for (const fig of figsTodo) {
            await h.evaluate((f) => {
                const app = window.app;
                app.ownedFigures.add(f.id);       // preview-only: render, don't sell
                app.selectFigure(f.id);
                app.goto_playMode();
            }, fig);
            await h.waitFor(() => window.app.activeMode &&
                window.app.activeMode.constructor.name === 'PlayMode' &&
                !!window.app.activeMode.cc, null, 30000);
            await h.evaluate((f) => {
                const app = window.app, pm = app.activeMode;
                pm.enemyManager.autoSpawn = false;
                pm.enemyManager.enemies.forEach((e) => { try { e.mesh.dispose(false, false); } catch (_) {} });
                pm.enemyManager.enemies = [];
                app.gui.rootContainer.isVisible = false;
                if (pm.cc) pm.cc.stop();
                app.camera.lockedTarget = null;
                // Portrait backdrop: hide the world, tint the sky card.
                app.scene.meshes.forEach((m) => {
                    if (m !== pm.player && !(m.isDescendantOf && m.isDescendantOf(pm.player)) &&
                        m.name !== 'skyDome') m.isVisible = false;
                });
                if (app.skyDome) app.skyDome.isVisible = false;
                app.scene.clearColor = new BABYLON.Color4(
                    f.tint[0] * 0.45 + 0.1, f.tint[1] * 0.45 + 0.14, f.tint[2] * 0.45 + 0.22, 1);
                const p = pm.player.position;
                app.camera.target = new BABYLON.Vector3(p.x, p.y + 0.55, p.z);
                app.camera.alpha = -Math.PI / 2;
                app.camera.beta = 1.35;
                app.camera.radius = 3.6;
            }, fig);
            await h.waitFrames(15);
            await h.page.screenshot({ path: path.join(FIGS_DIR, fig.id + '.png'), clip: CLIP });
            console.log('  figure ' + fig.id + '.png');
        }

        // ---- world previews --------------------------------------------------
        for (const g of worlds) {
            const ok = await h.evaluate(async (file) => {
                const app = window.app;
                // Reset to the default look first: a previous world's hex
                // theme (e.g. Glowlands' purple sky) must not leak into the
                // next preview. A world with its own theme re-applies it
                // during import.
                app.activeHexDisc = 'classic';
                app.applyHexTheme();
                const r = await app.importWorldFromUrl('./assets/worlds/' + file);
                if (!r) return false;
                app.goto_buildMode();
                return true;
            }, g.file);
            if (!ok) { console.log('  SKIP ' + g.file + ' (import failed)'); continue; }
            await h.waitFrames(20);   // let models/textures stream in
            await h.evaluate(() => {
                const app = window.app;
                app.gui.rootContainer.isVisible = false;
                app.camera.lockedTarget = null;
                // Frame the whole build from a raised hero angle.
                let min = null, max = null;
                app.BuildableObjectList.forEach((wo) => wo.instances.filter(Boolean).forEach((inst) => {
                    const p = inst.position;
                    if (!min) { min = p.clone(); max = p.clone(); }
                    else {
                        min = BABYLON.Vector3.Minimize(min, p);
                        max = BABYLON.Vector3.Maximize(max, p);
                    }
                }));
                if (!min) return;
                const c = min.add(max).scale(0.5);
                const span = Math.max(max.subtract(min).length(), 10);
                app.camera.target = new BABYLON.Vector3(c.x, c.y + 1, c.z);
                app.camera.alpha = -Math.PI / 2 + 0.5;
                app.camera.beta = 0.95;
                app.camera.radius = Math.min(60, span * 0.85 + 8);
            });
            await h.waitFrames(20);
            const out = path.join(WORLDS_DIR, g.file.replace(/\.json$/, '') + '.png');
            await h.page.screenshot({ path: out, clip: CLIP });
            console.log('  world ' + path.basename(out));
        }
    } finally {
        await h.stop();
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
