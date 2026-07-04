/*
 * Gatekeeper's Vault puzzle-world test
 * ------------------------------------
 * A demo world that exercises the logic gate (OR + AND), chest, counter,
 * and floaters end to end. Verifies:
 *   - the world imports with its OR gate, AND gate, and chests wired,
 *   - Room A: touching EITHER button opens door 1 (OR),
 *   - Room B: the AND gate opens door 2 only after BOTH the chest is opened
 *     AND the 3-star counter is reached (not one alone),
 *   - the AND gate steps the quest,
 *   - Room C: a floating barrel rides the vault pool,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7109 });
    try {
        await h.start();
        await h.waitForReady(['l_gate', 'pr_chest', 'pk_star', 'pr_barrel']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });

        // --- 1. Import + wiring inventory ---
        const inv = await h.evaluate(() =>
            window.app.importWorldFromUrl('./assets/worlds/gatekeeper-vault.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                const gates = live('l_gate');
                const orGate = gates.find((g) => g.params.mode === 'any');
                const andGate = gates.find((g) => g.params.mode === 'all');
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                window.__W = {
                    orGate, andGate,
                    btns: live('l_trigger'),
                    chestB: live('pr_chest').find((c) => c.params.loot === 25),
                    counter: live('l_counter')[0],
                    stars: live('pk_star'),
                    quest: live('l_quest')[0],
                    door1: live('pr_door').find((d) => Math.abs(d.position.z - 6.02) < 0.5),
                    door2: live('pr_door').find((d) => Math.abs(d.position.z - 22.02) < 0.5),
                    barrel: live('pr_barrel')[0],
                };
                const W = window.__W;
                return { ok,
                    orWired: W.orGate && W.orGate.wires.some((w) => w.toWo === 'pr_door'),
                    andWired: W.andGate && W.andGate.wires.some((w) => w.toWo === 'pr_door'),
                    andNeeds2: W.andGate && (W.andGate.params.need === 2),
                    stars: W.stars.length };
            }));
        console.log('\n[1] inventory', inv);
        check('the puzzle world imports with OR + AND gates wired, 3 stars',
            inv.ok && inv.orWired && inv.andWired && inv.andNeeds2 && inv.stars === 3, inv);
        await h.evaluate(() => {
            window.__W.orGate.script.onPlayReset(window.app.activeMode);
            window.__W.andGate.script.onPlayReset(window.app.activeMode);
        });
        await h.waitFrames(5);

        // --- 2. Room A: either button opens door 1 (OR) ---
        const doorShut = (d) => h.evaluate((name) => {
            const pm = window.app.activeMode;
            const D = window.__W[name].position;
            return pm.projectileBlocked(
                new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5));
        }, d);
        const door1Before = await doorShut('door1');
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__W.btns[0].position);   // stand on button A
        });
        await h.waitFor(() => window.__W.door1.script._t === 1, null, 20000);
        const door1After = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__W.door1.position;
            return { open: !pm.projectileBlocked(
                new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)) };
        });
        console.log('[2] OR door', { door1Before, door1After });
        check('Room A: touching one button opens door 1 (OR gate)',
            door1Before && door1After.open, { door1Before, door1After });

        // --- 3. Room B: AND needs the chest AND the stars ---
        // First open the chest only -> door 2 must stay shut.
        await h.evaluate(() => {
            const pm = window.app.activeMode, W = window.__W;
            pm.player.position.copyFrom(W.chestB.position);   // walk up: auto-opens
        });
        await h.waitFor(() => window.__W.chestB.script._open === true, null, 20000);
        await h.waitFrames(10);
        const afterChest = await h.evaluate(() => ({
            gateOn: window.__W.andGate.script._state,
            door2Shut: window.app.activeMode.projectileBlocked(
                new BABYLON.Vector3(window.__W.door2.position.x + 0.675, window.__W.door2.position.y,
                    window.__W.door2.position.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
        }));
        check('Room B: opening the chest alone does NOT open door 2',
            !afterChest.gateOn && afterChest.door2Shut, afterChest);

        // Now collect all 3 stars -> counter reaches -> AND fires -> door 2 opens.
        await h.evaluate(() => {
            const pm = window.app.activeMode, W = window.__W;
            // Drive the star collection directly (walk onto each).
            W.stars.forEach((s) => {
                s.script._collected = false;
                pm.player.position.copyFrom(s.position);
                s.script.update(true, pm);   // proximity collect
            });
        });
        await h.waitFor(() => window.__W.andGate.script._state === true, null, 20000);
        await h.waitFor(() => window.__W.door2.script._t === 1, null, 20000);
        const solved = await h.evaluate(() => {
            const pm = window.app.activeMode, D = window.__W.door2.position;
            return {
                door2Open: !pm.projectileBlocked(
                    new BABYLON.Vector3(D.x + 0.675, D.y, D.z - 3), new BABYLON.Vector3(0, 0, 3.5)),
                counter: window.__W.counter.script.count,
                questSteps: window.__W.quest.script._done.size,
            };
        });
        console.log('[3] AND solve', solved);
        check('Room B: chest + 3 stars fire the AND gate and open door 2',
            solved.door2Open && solved.counter >= 3, solved);
        check('the AND gate steps the quest', solved.questSteps >= 1, solved);
        await h.screenshot('puzzle-solved');

        // --- 4. Room C: the vault barrel floats on the pool ---
        const floated = await h.evaluate(() => new Promise((resolve) => {
            const pm = window.app.activeMode, b = window.__W.barrel;
            let n = 0;
            const tick = () => {
                n++;
                pm.updateFloaters();
                if (n > 180) return resolve({ y: b.position.y, floating: b._floating });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[4] vault barrel', floated);
        check('Room C: the vault barrel rides the pool', floated.floating && floated.y < 6, floated);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the puzzle world', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — OR opens the way, AND guards the vault, the barrel bobs.'
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
