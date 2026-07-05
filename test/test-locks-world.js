/*
 * The Warden's Locks puzzle-world test
 * ------------------------------------
 * A pressure-plate puzzle vault. Verifies end to end:
 *   - imports with a checkpoint, three latch plates, two doors, a counter
 *     (target 2), and the vault chest, all wired,
 *   - weighing down plate P1 opens door D1 and steps the quest,
 *   - pressing BOTH plates P2 and P3 trips the counter, which opens door D2
 *     and steps the quest (a single plate does NOT),
 *   - the vault chest pays out and advances the quest,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7146 });
    try {
        await h.start();
        await h.waitForReady(['l_plate', 'pr_door', 'l_counter', 'pr_chest']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });

        // --- 1. Import + inventory ---
        const inv = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/wardens-locks.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const plates = live('l_plate');
                window.__G = {
                    cp: live('l_checkpoint')[0],
                    p1: plates.find((p) => p.wires.some((w) => w.toWo === 'pr_door')),
                    others: plates.filter((p) => p.wires.some((w) => w.toWo === 'l_counter')),
                    counter: live('l_counter')[0],
                    d1: live('pr_door').find((d) => Math.abs(d.position.z - 0.02) < 0.5),
                    d2: live('pr_door').find((d) => Math.abs(d.position.z - 10.02) < 0.5),
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                };
                const G = window.__G;
                return { ok,
                    hasAll: !!(G.cp && G.p1 && G.counter && G.d1 && G.d2 && G.chest && G.quest) &&
                        plates.length === 3 && G.others.length === 2,
                    latch: plates.every((p) => p.params.latch === 'yes'),
                    target: G.counter.params.threshold };
            }));
        console.log('\n[1] inventory', inv);
        check('the vault imports: checkpoint, 3 latch plates, 2 doors, counter (target 2), chest',
            inv.ok && inv.hasAll && inv.latch && inv.target === 2, inv);
        await h.waitFrames(5);

        // Helper: stand the player on a plate and tick it.
        const stepOn = (which) => h.evaluate((sel) => {
            const pm = window.app.activeMode, G = window.__G;
            const p = sel === 'p1' ? G.p1 : (sel === 'p2' ? G.others[0] : G.others[1]);
            p.script._wasPlay = null; p.script.update(true, pm);
            p.computeWorldMatrix(true);
            const top = p.getBoundingInfo().boundingBox.maximumWorld.y;
            const pp = p.getAbsolutePosition ? p.getAbsolutePosition() : p.position;
            pm.player.position.copyFrom(new BABYLON.Vector3(pp.x, top + 0.1, pp.z));
            p.script.update(true, pm);
            return p.script._down;
        }, which);

        // --- 2. Plate P1 opens door D1 ---
        const d1Shut = await h.evaluate(() => window.__G.d1.checkCollisions === true);
        const q0 = await h.evaluate(() => window.__G.quest.script._done.size);
        await stepOn('p1');
        await h.waitFor(() => window.__G.d1.script._t === 1, null, 20000);
        const s2 = await h.evaluate(() => ({ d1Open: window.__G.d1.checkCollisions === false ||
            window.__G.d1.script._t === 1, qStepped: window.__G.quest.script._done.size }));
        console.log('[2] lock 1', { d1Shut, s2, q0 });
        check('weighing down plate P1 opens door D1 and steps the quest',
            d1Shut && s2.d1Open && s2.qStepped > q0, { d1Shut, s2, q0 });
        await h.screenshot('wardens-locks');

        // --- 3. Both plates trip the counter -> D2 (one alone does not) ---
        const d2Shut = await h.evaluate(() => window.__G.d2.checkCollisions === true);
        await stepOn('p2');
        const afterOne = await h.evaluate(() => ({ count: window.__G.counter.script.count,
            d2: window.__G.d2.script._t }));
        await stepOn('p3');
        await h.waitFor(() => window.__G.d2.script._t === 1, null, 20000);
        const afterBoth = await h.evaluate(() => ({ count: window.__G.counter.script.count,
            d2Open: window.__G.d2.checkCollisions === false || window.__G.d2.script._t === 1 }));
        console.log('[3] lock 2', { d2Shut, afterOne, afterBoth });
        check('one plate alone does not open D2, but pressing BOTH trips the counter and opens it',
            d2Shut && afterOne.d2 === 0 && afterOne.count === 1 &&
            afterBoth.count >= 2 && afterBoth.d2Open, { d2Shut, afterOne, afterBoth });

        // --- 4. The vault chest pays out ---
        const vault = await h.evaluate(() => {
            const pm = window.app.activeMode, G = window.__G;
            pm.player.position.copyFrom(G.chest.position);
            G.chest.script._wasPlay = null; G.chest.script.update(true, pm);
            G.chest.script.update(true, pm);
            return { chestOpen: G.chest.script._open,
                score: G.board.script.score != null ? G.board.script.score : G.board.script.count,
                questSteps: G.quest.script._done.size };
        });
        console.log('[4] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 3, vault);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the Warden’s Locks', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — weigh the plates, trip the counter, open the vault.'
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
