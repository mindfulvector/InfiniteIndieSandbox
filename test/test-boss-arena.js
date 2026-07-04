/*
 * Nightfall Crown test (boss-arena Play Set)
 * ------------------------------------------
 * Plays the boss-arena gallery world end to end, proving the new toys
 * (boss, sun, rings-era wiring patterns) choreograph with stock wires:
 *   - the world imports with its full wiring inventory (boss->spawner/
 *     camera/door/quest, sun->spawner, gate->camera/quest),
 *   - the loot-vault door blocks before the fight,
 *   - the sun runs (captured baseline, clock live),
 *   - walking the gate completes Q1 (+25) and steps Q2,
 *   - phase 2 makes the wired spawner muster adds,
 *   - deposing the boss opens the vault, completes Q2 (+100), and pays
 *     the scoreboard,
 *   - the vault stars collect,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7073 });
    try {
        await h.start();
        await h.waitForReady(['en_boss', 'l_sun', 'pk_star']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.playerMaxHp = 10000;   // the boss-test lesson: stay alive
            pm.playerHp = 10000;
            window.app.pixels = 0; window.app.saveEconomy();
        });

        // --- 1. Import + wiring inventory ---
        const world = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/nightfall-crown.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const boss = live('en_boss')[0];
                const sun = live('l_sun')[0];
                const gate = live('l_trigger')[0];
                const quests = live('l_quest');
                window.__A = {
                    boss, sun, gate,
                    q1: quests.find((q) => q.params.reward === 25),
                    q2: quests.find((q) => q.params.reward === 100),
                    door: live('pr_door')[0],
                    spawner: live('l_spawner')[0],
                    board: live('l_scoreboard')[0],
                    stars: live('pk_star'),
                };
                const A = window.__A;
                const has = (inst, ev, wo) => inst.wires.some((w) => w.event === ev && w.toWo === wo);
                return {
                    ok,
                    bossWires: has(A.boss, 'phase2', 'l_spawner') && has(A.boss, 'phase3', 'l_camera') &&
                               has(A.boss, 'defeated', 'pr_door') && has(A.boss, 'defeated', 'l_quest'),
                    sunWire: has(A.sun, 'midnight', 'l_spawner'),
                    gateWires: has(A.gate, 'entered', 'l_camera') && has(A.gate, 'entered', 'l_quest'),
                    stars: A.stars.length,
                };
            }));
        console.log('\n[1] wiring inventory', world);
        check('the arena imports with its full choreography wired',
            world.ok && world.bossWires && world.sunWire && world.gateWires && world.stars === 3, world);

        // --- 2. The vault door blocks; the sun's clock is live ---
        await h.evaluate(() => { window.__A.sun.script._wasPlay = null; window.__A.boss.script._wasPlay = null; });
        await h.waitFor(() => window.__A.sun.script._wasPlay === true, null, 20000);
        const preFight = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__A.door.position;
            return {
                doorShut: pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                sunLive: window.__A.sun.script._dayClear !== null,
            };
        });
        console.log('[2] pre-fight', preFight);
        check('the vault blocks and the sun keeps the clock', preFight.doorShut && preFight.sunLive, preFight);

        // --- 3. The gate: Q1 completes (+25), Q2 steps ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__A.gate.position);
        });
        await h.waitFor(() => window.__A.q1.script._complete === true, null, 20000);
        const gate = await h.evaluate(() => ({
            pixels: window.app.pixels,
            q2Steps: window.__A.q2.script._done.size,
        }));
        console.log('[3] gate', gate);
        check('facing the crown completes Q1 (+25) and steps Q2',
            gate.pixels >= 25 && gate.q2Steps === 1, gate);
        await h.screenshot('arena-entry');

        // --- 4. Phase 2 musters adds through the wired spawner ---
        const adds0 = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__A.boss.position.add(new BABYLON.Vector3(0, 0.3, -5)));
            window.__A.boss.hp = 20;
            return pm.enemyManager.enemies.length;
        });
        await h.waitFor(() => window.__A.boss.script._phase === 2, null, 20000);
        await h.waitFor((n) => window.app.activeMode.enemyManager.enemies.length > n, adds0, 20000);
        console.log('[4] adds mustered');
        check('phase 2 musters adds through the wired spawner', true);

        // --- 5. Depose: vault opens, Q2 completes (+100), scoreboard pays ---
        await h.evaluate(() => {
            const pm = window.app.activeMode, B = window.__A.boss;
            // Clear the adds so they can't interfere with the kill swing.
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.player.position.copyFrom(B.position.add(new BABYLON.Vector3(0, 0.3, -2.2)));
            B.hp = 1;
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(B.position);
        });
        await h.waitFor(() => window.__A.q2.script._complete === true, null, 20000);
        await h.waitFor(() => window.__A.door.script._t === 1, null, 20000);
        const victory = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__A.door.position;
            const board = window.__A.board.script;
            return {
                pixels: window.app.pixels,
                doorOpen: !pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                score: board.score != null ? board.score : board.count,
                bossDown: window.__A.boss.defeated && !window.__A.boss.isEnabled(),
            };
        });
        console.log('[5] victory', victory);
        check('deposing the crown opens the vault, pays Q2 and the scoreboard',
            victory.pixels >= 25 + 100 + 25 && victory.doorOpen &&
            victory.score >= 5 && victory.bossDown, victory);

        // --- 6. Loot: a vault star collects ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__A.stars[0].position);
        });
        await h.waitFor(() => window.__A.stars[0]._collected === true ||
            !window.__A.stars[0].isVisible, null, 20000);
        console.log('[6] looted');
        check('the vault stars collect after victory', true);
        await h.screenshot('vault-looted');

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the arena', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the crown falls, the vault opens, and every wire pulled its weight.'
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
