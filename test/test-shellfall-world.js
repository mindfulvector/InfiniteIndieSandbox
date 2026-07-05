/*
 * Shellfall bombardment-world test
 * --------------------------------
 * A cover-and-artillery combat world. Verifies:
 *   - imports with a checkpoint, a turret, a spitter, cover pillars, a wave
 *     spawner (wired to the vault), a regen field, the vault door + chest,
 *   - the in-world spitter lobs an arcing shot whose peak clears the 2-tall
 *     cover pillars (the "rains over cover" premise),
 *   - the regen field heals a hurt player,
 *   - clearing the wave opens the vault and steps the quest,
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
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7149 });
    try {
        await h.start();
        await h.waitForReady(['en_turret', 'en_spitter', 'l_spawner', 'l_regen', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/shellfall.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                window.__G = {
                    cp: live('l_checkpoint')[0],
                    turret: live('en_turret')[0],
                    spitter: live('en_spitter')[0],
                    spawner: live('l_spawner').find((s) => s.params.wave === 6),
                    regen: live('l_regen')[0],
                    pillars: live('t_block_4'),
                    gate: live('pr_door').find((d) => Math.abs(d.position.z - 16.02) < 0.5),
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                };
                const G = window.__G;
                return { ok,
                    hasAll: !!(G.cp && G.turret && G.spitter && G.spawner && G.regen && G.gate && G.chest && G.quest),
                    pillars: G.pillars.length,
                    spawnerWired: G.spawner && G.spawner.wires.some((w) => w.toWo === 'pr_door') };
            }));
        console.log('\n[1] inventory', inv);
        check('Shellfall imports: checkpoint, turret, spitter, cover pillars, wave→vault, regen, vault',
            inv.ok && inv.hasAll && inv.pillars > 10 && inv.spawnerWired, inv);
        await h.waitFrames(5);

        // --- 2. The in-world spitter lobs a shot that arcs over the pillars ---
        const arc = await h.evaluate(() => {
            const pm = window.app.activeMode, s = window.__G.spitter;
            s.script._wasPlay = null; s.script.update(true, pm);
            s.params = Object.assign({}, s.params, { cadence: 1, range: 40 });
            pm.player.position.copyFrom(s.getAbsolutePosition().add(new BABYLON.Vector3(0, -3, 10)));
            s.script._cool = 0; s.script.update(true, pm);   // lob
            const shot = s.script._shots[0];
            let peak = -99;
            for (let i = 0; i < 25 && s.script._shots.length; i++) {
                s.script.update(true, pm);
                if (shot && shot.mesh) peak = Math.max(peak, shot.mesh.position.y);
            }
            // Cover pillars are 2-tall blocks: tops around y=3-4. The arc peak
            // must clear that to "rain over cover".
            return { fired: !!shot, peak };
        });
        console.log('[2] arc', arc);
        check('the spitter lobs a shot that arcs high over the 2-tall cover pillars',
            arc.fired && arc.peak > 5, arc);
        await h.screenshot('shellfall');

        // --- 3. The regen field heals a hurt player ---
        const regen = await h.evaluate(() => {
            const pm = window.app.activeMode, G = window.__G;
            pm.playerMaxHp = 100; pm.playerHp = 40;
            const p = G.regen.getAbsolutePosition ? G.regen.getAbsolutePosition() : G.regen.position;
            pm.player.position.copyFrom(new BABYLON.Vector3(p.x, p.y, p.z));
            const hp0 = pm.playerHp;
            for (let i = 0; i < 80; i++) G.regen.script.update(true, pm);
            const gained = pm.playerHp - hp0;
            pm.playerMaxHp = 10000; pm.playerHp = 10000;
            return { gained };
        });
        console.log('[3] regen', regen);
        check('the regen field heals a hurt player under fire', regen.gained > 0, regen);

        // --- 4. Wave clear opens the vault + steps the quest ---
        const gateShut = await h.evaluate(() => window.__G.gate.checkCollisions === true);
        const cleared = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, G = window.__G;
            const q0 = G.quest.script._done.size;
            app.fireEvent(G.spawner, 'cleared');   // the wave mechanic is proven in test-dungeon
            return { qStepped: G.quest.script._done.size > q0 };
        });
        await h.waitFor(() => window.__G.gate.script._t === 1, null, 20000);
        const gateOpen = await h.evaluate(() => window.__G.gate.checkCollisions === false ||
            window.__G.gate.script._t === 1);
        console.log('[4] wave clear', { gateShut, cleared, gateOpen });
        check('clearing the wave opens the vault and steps the quest',
            gateShut && cleared.qStepped && gateOpen, { gateShut, cleared, gateOpen });

        // --- 5. The vault chest pays out ---
        const vault = await h.evaluate(() => {
            const pm = window.app.activeMode, G = window.__G;
            pm.player.position.copyFrom(G.chest.position);
            G.chest.script._wasPlay = null; G.chest.script.update(true, pm);
            G.chest.script.update(true, pm);
            return { chestOpen: G.chest.script._open,
                score: G.board.script.score != null ? G.board.script.score : G.board.script.count,
                questSteps: G.quest.script._done.size };
        });
        console.log('[5] vault', vault);
        check('the vault chest opens, pays the scoreboard, and advances the quest',
            vault.chestOpen && vault.score >= 5 && vault.questSteps >= 2, vault);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors through Shellfall', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — duck the turret, dance the shells, crack the vault.'
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
