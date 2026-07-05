/*
 * The Warded Hall combat-world test
 * ---------------------------------
 * A priority-target fight showcasing the mender + regen field. Verifies:
 *   - imports with a checkpoint, a regen field, a shielder+charger front
 *     line, the mender (wired to the vault), the vault door + chest,
 *   - the in-world mender heals a wounded front-line ally,
 *   - the regen field heals a hurt player standing in it,
 *   - defeating the mender opens the vault ward and steps the quest,
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
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7138 });
    try {
        await h.start();
        await h.waitForReady(['en_mender', 'en_shielder', 'en_charger', 'l_regen', 'pr_chest']);
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
            window.app.importWorldFromUrl('./assets/worlds/warded-hall.json').then((ok) => {
                const app = window.app;
                const live = (n) => app.findWorldObject(n).instances.filter(Boolean);
                app.activeMode.enemyManager.autoSpawn = false;
                app.activeMode.playerMaxHp = 10000; app.activeMode.playerHp = 10000;
                window.__G = {
                    cp: live('l_checkpoint')[0],
                    regen: live('l_regen')[0],
                    shielders: live('en_shielder'),
                    charger: live('en_charger')[0],
                    mender: live('en_mender')[0],
                    vault: live('pr_door').find((d) => Math.abs(d.position.z - 10.02) < 0.5),
                    chest: live('pr_chest')[0],
                    board: live('l_scoreboard')[0],
                    quest: live('l_quest')[0],
                };
                const G = window.__G;
                return { ok,
                    hasAll: !!(G.cp && G.regen && G.charger && G.mender && G.vault && G.chest && G.quest) &&
                        G.shielders.length === 2,
                    menderWiresVault: G.mender.wires.some((w) => w.toWo === 'pr_door') };
            }));
        console.log('\n[1] inventory', inv);
        check('the hall imports: checkpoint, regen, 2 shielders + charger, mender→vault, vault + chest',
            inv.ok && inv.hasAll && inv.menderWiresVault, inv);
        await h.waitFrames(5);

        // --- 2. The in-world mender heals a wounded front-line ally ---
        const heals = await h.evaluate(() => {
            const pm = window.app.activeMode, G = window.__G;
            const ally = G.shielders[0];
            ally.script._wasPlay = null; ally.script.update(true, pm);
            ally.hp = 1;
            G.mender.script._wasPlay = null;
            G.mender.params = Object.assign({}, G.mender.params, { interval: 1, range: 20 });
            const hp0 = ally.hp;
            for (let i = 0; i < 60; i++) G.mender.script.update(true, pm);
            return { hp0, hp1: ally.hp, healed: ally.hp > hp0 };
        });
        console.log('[2] mender heals', heals);
        check('the in-world mender heals a wounded front-line ally', heals.healed, heals);
        await h.screenshot('warded-hall');

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
        check('the regen field heals a hurt player standing in it', regen.gained > 0, regen);

        // --- 4. Defeating the mender opens the vault + steps the quest ---
        const vaultShut = await h.evaluate(() => window.__G.vault.checkCollisions === true);
        const kill = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, G = window.__G;
            const q0 = G.quest.script._done.size;
            // Drop the mender via the real defeat path (its onDefeated fires
            // `defeated`, which is wired to the vault).
            pm.defeatEnemy(G.mender, app.findWorldObject('en_mender'));
            return { qStepped: G.quest.script._done.size > q0, defeated: G.mender.defeated };
        });
        await h.waitFor(() => window.__G.vault.script._t === 1, null, 20000);
        const vaultOpen = await h.evaluate(() => window.__G.vault.checkCollisions === false ||
            window.__G.vault.script._t === 1);
        console.log('[4] kill', { vaultShut, kill, vaultOpen });
        check('defeating the mender opens the vault ward and steps the quest',
            vaultShut && kill.defeated && kill.qStepped && vaultOpen, { vaultShut, kill, vaultOpen });

        // --- 5. The vault chest pays out ---
        const vault = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, G = window.__G;
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
        check('no page errors through the warded hall', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — cut down the healer and the ward falls.'
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
