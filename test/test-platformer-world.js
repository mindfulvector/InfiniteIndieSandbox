/*
 * Skyward Steps puzzle-platformer test
 * ------------------------------------
 * The platformer campaign-type: it composes the trampoline, ladder, moving
 * platform, gate, star, and chest into a jump-and-solve course. Verifies:
 *   - the world imports with the tramp, ladder, moving platform, a 2-input
 *     AND gate, a star, and a chest all present and wired,
 *   - the moving-platform sweeper travels along its chain (autoStart),
 *   - the trampoline launches the player upward,
 *   - the AND gate opens the goal door only after BOTH the trampoline is
 *     bounced AND the sky-star is collected (one alone won't do it),
 *   - the gate steps the quest,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7111 });
    try {
        await h.start();
        await h.waitForReady(['t_tramp', 'pr_ladder', 'pr_platform_moving', 'l_gate', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/skyward-steps.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const gate = live('l_gate').find((g) => g.params.mode === 'all');
                const tramp = live('t_tramp')[0];
                const star = live('pk_star')[0];
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                window.__P = {
                    gate, tramp, star,
                    mp: live('pr_platform_moving')[0],
                    ladder: live('pr_ladder')[0],
                    chest: live('pr_chest')[0],
                    quest: live('l_quest')[0],
                    goalDoor: live('pr_door').find((d) => Math.abs(d.position.z - 23.02) < 0.5),
                };
                const P = window.__P;
                return { ok,
                    hasAll: !!(P.gate && P.tramp && P.star && P.mp && P.ladder && P.chest && P.goalDoor),
                    trampWired: P.tramp && P.tramp.wires.some((w) => w.toWo === 'l_gate'),
                    starWired: P.star && P.star.wires.some((w) => w.toWo === 'l_gate'),
                    gateNeeds2: P.gate && P.gate.params.need === 2,
                    gateOpensDoor: P.gate && P.gate.wires.some((w) => w.toWo === 'pr_door') };
            }));
        console.log('\n[1] inventory', inv);
        check('the platformer imports with tramp+ladder+platform+AND gate+star+chest, wired',
            inv.ok && inv.hasAll && inv.trampWired && inv.starWired && inv.gateNeeds2 && inv.gateOpensDoor, inv);
        await h.evaluate(() => window.__P.gate.script.onPlayReset(window.app.activeMode));
        await h.waitFrames(5);

        // --- 2. The moving-platform sweeper travels its chain ---
        const swept = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, mp = window.__P.mp;
            const z0 = mp.position.z, x0 = mp.position.x;
            let n = 0, maxMove = 0;
            const tick = () => {
                n++;
                maxMove = Math.max(maxMove, Math.hypot(mp.position.x - x0, mp.position.z - z0));
                if (n > 120) return resolve({ maxMove });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] sweeper', swept);
        check('the moving-platform sweeper travels along its chain', swept.maxMove > 1.0, swept);

        // --- 3. The trampoline launches the player upward ---
        // Mirror the traversal-toys pattern: park the player ON the pad and
        // let the GAME loop's tramp update fire the bounce (the CC borrows a
        // jump). Waiting on the rise CONDITION keeps it fps-independent.
        const top = await h.evaluate(() => {
            const pm = window.app.activeMode, t = window.__P.tramp;
            pm.player.position.copyFrom(t.position.add(new BABYLON.Vector3(0, 0.35, 0)));
            return t.position.y + 0.25;
        });
        let bounced = { rose: 0 };
        try {
            await h.waitFor((tp) => window.app.activeMode.player.position.y > tp + 3, top, 25000);
            bounced = await h.evaluate((tp) => ({ rose: window.app.activeMode.player.position.y - tp }), top);
        } catch (e) { /* leave rose 0 -> fails below with context */ }
        console.log('[3] bounce', bounced);
        check('the trampoline launches the player upward', bounced.rose > 3.0, bounced);
        await h.screenshot('platformer');

        // --- 4. The AND gate needs BOTH the bounce and the star ---
        await h.evaluate(() => window.__P.gate.script.onPlayReset(window.app.activeMode));
        // Only the trampoline bounce (source 1).
        const oneOnly = await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__P;
            P.gate.script.onInput('on', P.tramp);   // bounced
            P.gate.script.update(true, pm);
            return { gateOn: P.gate.script._state,
                doorShut: pm.projectileBlocked(
                    new BABYLON.Vector3(P.goalDoor.position.x + 0.675, P.goalDoor.position.y,
                        P.goalDoor.position.z - 3), new BABYLON.Vector3(0, 0, 3.5)) };
        });
        check('bouncing alone does NOT open the goal (AND needs both)',
            !oneOnly.gateOn && oneOnly.doorShut, oneOnly);

        // Add the star (source 2) -> gate opens the door.
        await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__P;
            P.gate.script.onInput('on', P.star);   // collected
            P.gate.script.update(true, pm);
        });
        await h.waitFor(() => window.__P.goalDoor.script._t === 1, null, 20000);
        const solved = await h.evaluate(() => {
            const pm = window.app.activeMode, P = window.__P;
            return {
                doorOpen: !pm.projectileBlocked(
                    new BABYLON.Vector3(P.goalDoor.position.x + 0.675, P.goalDoor.position.y,
                        P.goalDoor.position.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                questSteps: P.quest.script._done.size,
            };
        });
        console.log('[4] solve', { oneOnly, solved });
        check('bounce + star fire the AND gate and open the goal door',
            solved.doorOpen, solved);
        check('the gate steps the quest', solved.questSteps >= 1, solved);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the platformer', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — jump, bounce, grab the star, and the gate yields.'
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
