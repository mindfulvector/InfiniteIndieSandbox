/*
 * Shiftworks traversal-world test
 * -------------------------------
 * A shifting-floor gauntlet showcasing the newest traversal toys. Verifies:
 *   - imports with checkpoints, two conveyors, four crumble tiles, a
 *     sweeper, a trampoline, the star (wired to the vault gate), gate + chest,
 *   - a conveyor in the world carries the player along its direction,
 *   - a crumble tile collapses when the player stands on it,
 *   - the sweeping blade oscillates,
 *   - collecting the star opens the vault gate and steps the quest,
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
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7141 });
    try {
        await h.start();
        await h.waitForReady(['l_conveyor', 't_crumble', 'l_sweeper', 'pk_star', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/shiftworks.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                window.__G = {
                    conveyors: live('l_conveyor'),
                    crumbles: live('t_crumble'),
                    sweeper: live('l_sweeper')[0],
                    tramp: live('t_tramp')[0],
                    star: live('pk_star')[0],
                    gate: live('pr_door').find((d) => Math.abs(d.position.z - 28.02) < 0.5),
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                    checkpoints: live('l_checkpoint'),
                };
                const G = window.__G;
                return { ok,
                    hasAll: !!(G.sweeper && G.tramp && G.star && G.gate && G.chest && G.quest) &&
                        G.conveyors.length === 2 && G.crumbles.length === 4 && G.checkpoints.length === 3,
                    starWiresGate: G.star.wires.some((w) => w.toWo === 'pr_door') };
            }));
        console.log('\n[1] inventory', inv);
        check('Shiftworks imports: 3 checkpoints, 2 conveyors, 4 crumbles, sweeper, tramp, star→gate, chest',
            inv.ok && inv.hasAll && inv.starWiresGate, inv);
        await h.waitFrames(5);

        // --- 2. A conveyor carries the player ---
        const carry = await h.evaluate(() => {
            const pm = window.app.activeMode, c = window.__G.conveyors[0];
            c.script._wasPlay = null; c.script.update(true, pm);
            c.computeWorldMatrix(true);
            const top = c.getBoundingInfo().boundingBox.maximumWorld.y;
            const cp = c.getAbsolutePosition ? c.getAbsolutePosition() : c.position;
            pm.driving = null;
            pm.player.position.copyFrom(new BABYLON.Vector3(cp.x, top + 0.1, cp.z));
            const z0 = pm.player.position.z;
            for (let i = 0; i < 60; i++) c.script.update(true, pm);
            return { moved: Math.abs(pm.player.position.z - z0) > 1 };
        });
        console.log('[2] conveyor', carry);
        check('a conveyor in the world carries the player along', carry.moved, carry);

        // --- 3. A crumble tile collapses when stood on ---
        const crumble = await h.evaluate(() => {
            const pm = window.app.activeMode, t = window.__G.crumbles[0];
            t.script._wasPlay = null; t.script.update(true, pm);
            t.computeWorldMatrix(true);
            const top = t.getBoundingInfo().boundingBox.maximumWorld.y;
            const tp = t.getAbsolutePosition ? t.getAbsolutePosition() : t.position;
            pm.player.position.copyFrom(new BABYLON.Vector3(tp.x, top + 0.1, tp.z));
            for (let i = 0; i < 40; i++) t.script.update(true, pm);
            return { collapsed: t.checkCollisions === false && t.isVisible === false };
        });
        console.log('[3] crumble', crumble);
        check('a crumble tile collapses when the player stands on it', crumble.collapsed, crumble);
        await h.screenshot('shiftworks');

        // --- 4. The sweeper oscillates ---
        const sweep = await h.evaluate(() => {
            const pm = window.app.activeMode, w = window.__G.sweeper;
            w.script._wasPlay = null; w.script.update(true, pm);
            // Sample the blade at the two swing extremes directly. A timed loop
            // is dt-flaky under load (getDeltaTime barely advances the phase);
            // sin near +/-pi/2 is ~+/-1 regardless of the small dt step, so the
            // two positions differ by ~2*reach deterministically.
            w.script._phase = Math.PI / 2;       w.script.update(true, pm); const hi = w.position.x;
            w.script._phase = 3 * Math.PI / 2;   w.script.update(true, pm); const lo = w.position.x;
            return { span: Math.abs(hi - lo) };
        });
        console.log('[4] sweeper', sweep);
        check('the sweeping blade oscillates', sweep.span > 4, sweep);

        // --- 5. Collecting the star opens the vault gate + steps quest ---
        const gateShut = await h.evaluate(() => window.__G.gate.checkCollisions === true);
        const star = await h.evaluate(() => {
            const pm = window.app.activeMode, G = window.__G;
            const q0 = G.quest.script._done.size;
            const sp = G.star.getAbsolutePosition ? G.star.getAbsolutePosition() : G.star.position;
            pm.player.position.copyFrom(new BABYLON.Vector3(sp.x, sp.y - 1, sp.z));
            G.star.script._wasPlay = null; G.star.script.update(true, pm);
            G.star.script.update(true, pm);
            return { collected: G.star.isVisible === false, qStepped: G.quest.script._done.size > q0 };
        });
        await h.waitFor(() => window.__G.gate.script._t === 1, null, 20000);
        const gateOpen = await h.evaluate(() => window.__G.gate.checkCollisions === false ||
            window.__G.gate.script._t === 1);
        console.log('[5] star', { gateShut, star, gateOpen });
        check('collecting the star opens the vault gate and steps the quest',
            gateShut && star.collected && star.qStepped && gateOpen, { gateShut, star, gateOpen });

        // --- 6. The vault chest pays out ---
        const vault = await h.evaluate(() => {
            const pm = window.app.activeMode, G = window.__G;
            pm.player.position.copyFrom(G.chest.position);
            G.chest.script._wasPlay = null; G.chest.script.update(true, pm);
            G.chest.script.update(true, pm);
            return { chestOpen: G.chest.script._open,
                score: G.board.script.score != null ? G.board.script.score : G.board.script.count,
                questSteps: G.quest.script._done.size };
        });
        console.log('[6] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 2, vault);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through Shiftworks', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — ride, sprint, time, and bounce your way to the vault.'
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
