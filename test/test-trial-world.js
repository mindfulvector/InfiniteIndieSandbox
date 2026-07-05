/*
 * Bladeworks skill-trial world test
 * ---------------------------------
 * A linear trial showcasing the newest toys: sweeping blades (timing), a
 * shielder gate (flank), power-ups, and the charger (dodge). Verifies end
 * to end:
 *   - imports with checkpoints, a shield + power power-up, three sweepers,
 *     the shielder wired to its gate, the charger, and the vault,
 *   - a blade in the world actually sweeps,
 *   - FLANKING the shielder (a rear hit) opens the gate and steps the quest,
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
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7133 });
    try {
        await h.start();
        await h.waitForReady(['l_sweeper', 'en_shielder', 'pk_powerup', 'en_charger', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/bladeworks.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                window.__G = {
                    sweepers: live('l_sweeper'),
                    shielder: live('en_shielder')[0],
                    gate: live('pr_door').find((d) => Math.abs(d.position.z - 14.02) < 0.5),
                    charger: live('en_charger')[0],
                    powerups: live('pk_powerup'),
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                    checkpoints: live('l_checkpoint'),
                };
                const G = window.__G;
                return { ok,
                    hasAll: !!(G.shielder && G.gate && G.charger && G.chest && G.quest) &&
                        G.sweepers.length === 3 && G.powerups.length === 2 && G.checkpoints.length === 3,
                    kinds: G.powerups.map((p) => p.params.kind).sort().join(','),
                    shielderWiresGate: G.shielder.wires.some((w) => w.toWo === 'pr_door') };
            }));
        console.log('\n[1] inventory', inv);
        check('Bladeworks imports: 3 checkpoints, 2 power-ups, 3 blades, shielder→gate, charger, vault',
            inv.ok && inv.hasAll && inv.kinds === 'power,shield' && inv.shielderWiresGate, inv);
        await h.waitFrames(5);

        // --- 2. A blade in the world sweeps ---
        const sweep = await h.evaluate(() => {
            const pm = window.app.activeMode, w = window.__G.sweepers[0];
            w.script._wasPlay = null; w.script.update(true, pm);
            let lo = 99, hi = -99;
            for (let i = 0; i < 200; i++) { w.script.update(true, pm); lo = Math.min(lo, w.position.x); hi = Math.max(hi, w.position.x); }
            return { span: hi - lo };
        });
        console.log('[2] sweep', sweep);
        check('a trial blade sweeps back and forth', sweep.span > 4, sweep);
        await h.screenshot('bladeworks');

        // --- 3. Flanking the shielder opens the gate + steps the quest ---
        const gateShut = await h.evaluate(() => window.__G.gate.checkCollisions === true);
        const flank = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, G = window.__G;
            G.shielder.script._wasPlay = null; G.shielder.script.update(true, pm);
            const q0 = G.quest.script._done.size;
            // A hit from BEHIND the guard: shield faces +z (facing 0), attacker at -z.
            G.shielder.script._facing = 0;
            const blockedFront = G.shielder.script.blocksHit(
                G.shielder.getAbsolutePosition().add(new BABYLON.Vector3(0, 0, 3)));
            const rearLands = !G.shielder.script.blocksHit(
                G.shielder.getAbsolutePosition().add(new BABYLON.Vector3(0, 0, -3)));
            return { blockedFront, rearLands, qStepped: G.quest.script._done.size > q0 };
        });
        await h.waitFor(() => window.__G.gate.script._t === 1, null, 20000);
        const gateOpen = await h.evaluate(() => window.__G.gate.checkCollisions === false ||
            window.__G.gate.script._t === 1);
        console.log('[3] flank', { gateShut, flank, gateOpen });
        check('the shielder blocks the front but a flank hit opens the gate and steps the quest',
            gateShut && flank.blockedFront && flank.rearLands && flank.qStepped && gateOpen,
            { gateShut, flank, gateOpen });

        // --- 4. The vault chest pays out ---
        const vault = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, G = window.__G;
            pm.player.position.copyFrom(G.chest.position);
            G.chest.script._wasPlay = null; G.chest.script.update(true, pm);
            G.chest.script.update(true, pm);
            return { chestOpen: G.chest.script._open,
                score: G.board.script.score != null ? G.board.script.score : G.board.script.count,
                questSteps: G.quest.script._done.size };
        });
        console.log('[4] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 2, vault);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through the trial', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — time the blades, flank the guard, and claim the vault.'
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
