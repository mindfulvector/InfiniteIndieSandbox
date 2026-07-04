/*
 * Treasure chest test
 * -------------------
 * Verifies the loot chest:
 *   - pr_chest registers with a hinged 'lid' child,
 *   - the `open` input pops the lid, pays the pixel reward as a homing
 *     burst (credited through the pixel loop), and fires `opened` once,
 *   - a chest can only be opened once per run (re-opening does nothing),
 *   - a play reset closes and re-arms it,
 *   - walking up opens an auto chest; a no-auto chest ignores proximity
 *     until wired,
 *   - a big reward (100) pays in full (burst capped, overflow credited),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7106 });
    try {
        await h.start();
        await h.waitForReady(['pr_chest', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const kids = window.app.findWorldObject('pr_chest').mesh.getChildMeshes();
            return { lid: kids.some((m) => m.name.indexOf('lid') >= 0), prims: kids.length };
        });
        console.log('\n[1] registration', reg);
        check('the chest registers with a hinged lid child', reg.lid && reg.prims >= 3, reg);

        // --- 2. Wired open: reward + lid + `opened` fires once ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const chest = app.findWorldObject('pr_chest').createInstance();
            chest.position = pm.player.position.add(new BABYLON.Vector3(8, 1, 0));
            chest.params = { loot: 25, auto: 'no' };   // no-auto so proximity is ignored
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = chest.position.add(new BABYLON.Vector3(0, 0, 3));
            cnt.params.threshold = 10; cnt.params.autoReset = 'no';
            chest.wires.push({ event: 'opened', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' });
            chest.script._wasPlay = null;
            app.pixels = 0;
            window.__CH = { chest, cnt };
        });
        await h.waitFrames(3);
        // A no-auto chest ignores the player standing next to it.
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__CH.chest.position);
        });
        await h.waitFrames(10);
        const proximity = await h.evaluate(() => ({ open: window.__CH.chest.script._open }));
        check('a no-auto chest ignores proximity', !proximity.open, proximity);

        const opened = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode, ch = window.__CH.chest;
            ch.script.onInput('open');
            let n = 0;
            const tick = () => {
                n++;
                // Let the burst home in and credit.
                if (app.pixels >= 25 || n > 400) {
                    return resolve({
                        pixels: app.pixels,
                        openedCount: window.__CH.cnt.script.count,
                        lidBack: ch.script._lidAngle < -0.5,
                        isOpen: ch.script._open,
                    });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] opened', opened);
        check('the open input pays 25 pixels, pops the lid, and fires `opened`',
            opened.pixels === 25 && opened.openedCount === 1 && opened.lidBack && opened.isOpen, opened);
        await h.screenshot('chest-open');

        // --- 3. Re-opening does nothing ---
        const reopen = await h.evaluate(() => {
            const app = window.app, ch = window.__CH.chest;
            const p0 = app.pixels;
            ch.script.onInput('open');
            ch.script.update(true, app.activeMode);
            return { pixels: app.pixels, spent: app.pixels - p0, count: window.__CH.cnt.script.count };
        });
        console.log('[3] reopen', reopen);
        check('an opened chest cannot be re-looted', reopen.spent === 0 && reopen.count === 1, reopen);

        // --- 4. Play reset re-arms it ---
        const rearm = await h.evaluate(() => {
            const pm = window.app.activeMode, ch = window.__CH.chest;
            ch.script.onPlayReset(pm);
            return { open: ch.script._open, lid: ch.script._lidAngle };
        });
        console.log('[4] rearm', rearm);
        check('a play reset closes and re-arms the chest', !rearm.open && rearm.lid === 0, rearm);

        // --- 5. Auto chest opens on walk-up ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const chest = app.findWorldObject('pr_chest').createInstance();
            chest.position = new BABYLON.Vector3(30, 2, 30);
            chest.params = { loot: 10, auto: 'yes' };
            chest.script._wasPlay = null;
            window.__A = chest;
            app.pixels = 0;
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(new BABYLON.Vector3(30, 2, 30));
        });
        await h.waitFor(() => window.__A.script._open === true, null, 20000);
        console.log('[5] auto opened');
        check('an auto chest opens when the player walks up', true);

        // --- 6. A 100-pixel chest pays in full ---
        const big = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const chest = app.findWorldObject('pr_chest').createInstance();
            chest.position = new BABYLON.Vector3(-30, 2, -30);
            chest.params = { loot: 100, auto: 'no' };
            chest.script._wasPlay = null;
            chest.script.update(true, pm);   // settle the play transition first
            // Clear any still-homing bursts from earlier sections so only THIS
            // chest's payout is counted (full-suite load can leave stragglers).
            pm.pixelBursts.forEach((pb) => pb.mesh.dispose());
            pm.pixelBursts.length = 0;
            app.pixels = 0;
            chest.script.onInput('open');
            chest.script.update(true, pm);
            let n = 0;
            const tick = () => {
                n++;
                if (app.pixels >= 100 || n > 600) return resolve({ pixels: app.pixels });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[6] big', big);
        check('a 100-pixel chest pays in full (burst capped, overflow credited)',
            big.pixels === 100, big);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during chests', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the lid pops, the pixels pour, and it only pays once.'
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
