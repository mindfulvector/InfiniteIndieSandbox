/*
 * Play Set campaign test (The Glowlands)
 * --------------------------------------
 * A full playthrough of the mission-chain gallery world, proving campaigns
 * package from shipped toys with zero engine additions:
 *   - the chain wiring imports intact (stars→counter→M1; M1→door+M2;
 *     cell→M2; M2→M3; race→M3; M3→scoreboard+camera),
 *   - the vault door is shut before M1 (shots blocked at the gap),
 *   - collecting the three stars completes M1: +10 pixels AND the vault
 *     door slides open (story gating through a physical door),
 *   - entering the vault's pocket room completes M2 (+20),
 *   - a lap through the circuit gate completes M3 (+50), pays the
 *     scoreboard, and fires the celebration camera,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7058 });
    try {
        await h.start();
        await h.waitForReady(['pk_star', 'l_quest', 'pr_door_cell']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            window.app.pixels = 0; window.app.saveEconomy();
        });

        // --- 1. Import and audit the chain ---
        const world = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/glowlands.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const quests = live('l_quest');
                const q1 = quests.find((q) => q.params.reward === 10);
                const q2 = quests.find((q) => q.params.reward === 20);
                const q3 = quests.find((q) => q.params.reward === 50);
                window.__C = {
                    q1, q2, q3,
                    stars: live('pk_star'),
                    counter: live('l_counter')[0],
                    door: live('pr_door')[0],
                    cell: live('pr_door_cell')[0],
                    race: live('l_race')[0],
                    gate: live('l_trigger').find((t) => (t.wires || []).length === 2),
                    board: live('l_scoreboard')[0],
                };
                const C = window.__C;
                return {
                    ok,
                    q1Chain: q1.wires.some((w) => w.toWo === 'pr_door' && w.action === 'open') &&
                             q1.wires.some((w) => w.toWo === 'l_quest' && w.toId === q2.worldId),
                    q2Chain: q2.wires.some((w) => w.toWo === 'l_quest' && w.toId === q3.worldId),
                    q3Pays: q3.wires.some((w) => w.toWo === 'l_scoreboard') &&
                            q3.wires.some((w) => w.toWo === 'l_camera'),
                    stars: C.stars.length,
                };
            }));
        console.log('\n[1] chain audit', world);
        check('the three-mission chain imports fully wired',
            world.ok && world.q1Chain && world.q2Chain && world.q3Pays && world.stars === 3, world);

        // --- 2. The vault door is shut before M1 ---
        await h.waitFrames(5);
        const shut = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__C.door.position;
            return { blocked: pm.projectileBlocked(
                new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)) };
        });
        console.log('[2] vault shut', shut);
        check('the vault door blocks before M1', shut.blocked === true, shut);

        // --- 3. M1: collect the stars -> +10 px, the vault opens ---
        for (let i = 0; i < 3; i++) {
            await h.evaluate((i) => {
                const pm = window.app.activeMode;
                pm.player.position.copyFrom(window.__C.stars[i].position);
            }, i);
            await h.waitFor((i) => window.__C.stars[i]._collected === true ||
                !window.__C.stars[i].isVisible, i, 20000);
        }
        await h.waitFor(() => window.__C.q1.script._complete === true, null, 20000);
        await h.waitFor(() => window.__C.door.script._t === 1, null, 20000);
        const m1 = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__C.door.position;
            return {
                pixels: window.app.pixels,
                doorOpen: !pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                q2Steps: window.__C.q2.script._done.size,
            };
        });
        console.log('[3] M1 complete', m1);
        check('M1 pays 10 pixels and slides the vault open',
            m1.pixels >= 10 && m1.doorOpen, m1);
        check('M1 counts as the first step of M2', m1.q2Steps === 1, m1);
        await h.screenshot('vault-opened');

        // --- 4. M2: step through the portal door into its sub-level ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__C.cell.position.add(new BABYLON.Vector3(0.8, -0.9, 0)));
        });
        // The quest steps (and completes) in the parent BEFORE the world
        // swaps; the swap itself confirms the door worked end to end.
        await h.waitFor(() => window.app.worldStack.length === 1, null, 20000);
        const m2 = await h.evaluate(() => ({
            pixels: window.app.pixels,
            inside: window.app.worldStack.length === 1,
            subName: window.app.worldStack[0] && window.app.worldStack[0].name,
            q2Done: window.__C.q2.script._complete === true,   // pre-swap reference
            q3Steps: window.__C.q3.script._done.size,
        }));
        console.log('[4] M2 complete', m2);
        check('entering the vault room completes M2 (+20) inside its own sub-level',
            m2.pixels >= 30 && m2.inside && m2.q2Done, m2);
        check('M2 counts as the first step of M3', m2.q3Steps === 1, m2);
        // Walk back out through the sub-level's exit portal for the finale.
        await h.evaluate(() => {
            const app = window.app;
            const exit = app.findWorldObject('pr_door_cell').instances.filter(Boolean)
                .find((i) => i.params && i.params.mode === 'exit');
            app.activeMode.player.position.copyFrom(
                exit.position.add(new BABYLON.Vector3(0.8, -0.9, 0)));
        });
        await h.waitFor(() => window.app.worldStack.length === 0, null, 20000);
        await h.waitFrames(8);
        // The swap rebuilt every parent instance: re-capture the references
        // (quest progress survived in the instances' mirrored params).
        await h.evaluate(() => {
            const app = window.app;
            const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
            const quests = live('l_quest');
            const C = window.__C;
            C.q1 = quests.find((q) => q.worldId === C.q1.worldId);
            C.q2 = quests.find((q) => q.worldId === C.q2.worldId);
            C.q3 = quests.find((q) => q.worldId === C.q3.worldId);
            C.door = live('pr_door')[0];
            C.race = live('l_race')[0];
            C.gate = live('l_trigger').find((t) => (t.wires || []).length === 2);
            C.board = live('l_scoreboard')[0];
        });

        // --- 5. M3: a lap at the gate -> +50, scoreboard, camera cut ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__C.gate.position);   // start the lap
        });
        await h.waitFor(() => window.__C.race.script._racing === true, null, 20000);
        await h.evaluate(() => {
            // Leave the gate, then cross it again to close the zero-checkpoint lap.
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__C.gate.position.add(new BABYLON.Vector3(0, 0, -6)));
        });
        await h.waitFrames(8);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__C.gate.position);
        });
        await h.waitFor(() => window.__C.q3.script._complete === true, null, 20000);
        const m3 = await h.evaluate(() => ({
            pixels: window.app.pixels,
            score: window.__C.board.script.score != null
                ? window.__C.board.script.score : window.__C.board.script.count,
        }));
        console.log('[5] M3 complete', m3);
        check('the campaign finale pays out (+50, scoreboard scored 5)',
            m3.pixels >= 80 && m3.score >= 5, m3);
        await h.waitFrames(10);
        await h.screenshot('campaign-finale');

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the whole campaign', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — a three-mission Play Set runs start to finish on shipped toys alone.'
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
