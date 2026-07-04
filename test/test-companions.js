/*
 * Companion system test (user request)
 * ------------------------------------
 * Verifies dialog-tree hiring and slot-bound companions:
 *   - approaching a recruit opens its dialog (speaker, text, choices),
 *   - choices navigate nodes; the free hire adds Fern to the roster,
 *     closes the dialog, fires the recruit's wired `hired` edge, and a
 *     follower rig spawns and follows the player,
 *   - a paid hire refuses while broke (conversation stays open, no charge)
 *     and succeeds funded (-40 px),
 *   - companions live on the PROGRESSION SLOT: switching slots despawns
 *     them, switching back respawns them (the user's core requirement),
 *   - talking to a hired companion's recruit offers dismissal, which works,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7087 });
    try {
        await h.start();
        await h.waitForReady(['pr_recruit', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            if (app.saveSlot !== 1) app.selectSlot(1);
            app.hiredCompanions = [];
            app.pixels = 0;
            app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. Approach opens the dialog ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const r = app.findWorldObject('pr_recruit').createInstance();
            r.position = pm.player.position.add(new BABYLON.Vector3(5, 1.0, 0));
            const hiredCount = app.findWorldObject('l_counter').createInstance();
            hiredCount.position = r.position.add(new BABYLON.Vector3(2, 0, 2));
            hiredCount.params.threshold = 10; hiredCount.params.autoReset = 'no';
            r.wires.push({ event: 'hired', toWo: 'l_counter', toId: hiredCount.worldId, action: 'increment' });
            window.__RC = { r, hiredCount };
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__RC.r.position.add(new BABYLON.Vector3(1.2, 0.3, 0)));
        });
        await h.waitFor(() => window.app.menu.state === 18, null, 20000);
        const dlg = await h.evaluate(() => ({
            speaker: window.app.dialog.tree.speaker,
            node: window.app.dialog.node,
            choices: window.app.dialog.tree.nodes[window.app.dialog.node].choices.length,
        }));
        console.log('\n[1] dialog opened', dlg);
        check('approaching a recruit opens its dialog tree',
            dlg.speaker === 'Fern' && dlg.node === 'start' && dlg.choices === 3, dlg);
        await h.screenshot('recruit-dialog');

        // --- 2. Navigate, then hire free -> follower spawns + wired edge ---
        const hired = await h.evaluate(() => {
            const app = window.app;
            app.triggerMenuItem(18, 1);   // "Who are you?"
            const about = app.dialog.node;
            app.triggerMenuItem(18, 1);   // hire (free)
            return {
                about,
                hired: app.companionHired('fern'),
                closed: app.menu.state === 0,
            };
        });
        await h.waitFor(() => !!window.app.scene.getMeshByName('companion_fern'), null, 20000);
        // The recruit's `hired` edge fires on its NEXT update (a hired-state
        // watch), so wait on the wired counter rather than sampling inline.
        await h.waitFor(() => window.__RC.hiredCount.script.count === 1, null, 20000);
        hired.edge = 1;
        console.log('[2] hired Fern', hired);
        check('choices navigate and the free hire joins + closes + fires `hired`',
            hired.about === 'about' && hired.hired && hired.closed && hired.edge === 1, hired);

        // --- 3. The follower follows ---
        const f0 = await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.addInPlace(new BABYLON.Vector3(-9, 0.5, -6));
            const c = window.app.scene.getMeshByName('companion_fern');
            return BABYLON.Vector3.Distance(c.position, pm.player.position);
        });
        await h.waitFor((d0) => {
            const c = window.app.scene.getMeshByName('companion_fern');
            return BABYLON.Vector3.Distance(c.position,
                window.app.activeMode.player.position) < Math.min(5, d0 - 1);
        }, f0, 20000);
        console.log('[3] follower follows');
        check('the hired companion follows the player', true);

        // --- 4. Paid hire: broke refuses in-conversation; funded pays ---
        const paid = await h.evaluate(() => {
            const app = window.app;
            app.pixels = 10;
            app.openDialog(app.recruitTree(app.companionById('rusty')));
            app.triggerMenuItem(18, 2);   // hire (40 px) -- refused
            const refused = {
                stillOpen: app.menu.state === 18,
                notHired: !app.companionHired('rusty'),
                pixels: app.pixels,
            };
            app.pixels = 50;
            app.triggerMenuItem(18, 2);   // hire again -- funded
            return { refused, hired: app.companionHired('rusty'), pixels: app.pixels };
        });
        console.log('[4] paid hire', paid);
        check('a broke hire refuses without charging (conversation stays open)',
            paid.refused.stillOpen && paid.refused.notHired && paid.refused.pixels === 10, paid);
        check('a funded hire pays 40 and joins', paid.hired && paid.pixels === 10, paid);
        await h.waitFor(() => !!window.app.scene.getMeshByName('companion_rusty'), null, 20000);

        // --- 5. Companions ride the progression slot ---
        await h.evaluate(() => { window.app.selectSlot(2); });
        await h.waitFor(() => !window.app.scene.getMeshByName('companion_fern') &&
            !window.app.scene.getMeshByName('companion_rusty'), null, 20000);
        const slot2 = await h.evaluate(() => ({
            roster: window.app.hiredCompanions.slice(),
        }));
        await h.evaluate(() => { window.app.selectSlot(1); });
        await h.waitFor(() => !!window.app.scene.getMeshByName('companion_fern') &&
            !!window.app.scene.getMeshByName('companion_rusty'), null, 20000);
        console.log('[5] slot-bound', slot2);
        check('switching slots despawns the crew; switching back respawns them',
            slot2.roster.length === 0, slot2);

        // --- 6. Dismissal through the hired dialog ---
        const bye = await h.evaluate(() => {
            const app = window.app;
            app.openDialog(app.recruitTree(app.companionById('fern')));
            const startChoices = app.dialog.tree.nodes.start.choices.map((c) => c.text);
            app.triggerMenuItem(18, 2);   // "Time to part ways…"
            app.triggerMenuItem(18, 1);   // "Dismiss Fern"
            return { startChoices, hired: app.companionHired('fern'), closed: app.menu.state === 0 };
        });
        await h.waitFor(() => !window.app.scene.getMeshByName('companion_fern'), null, 20000);
        console.log('[6] dismissed', bye);
        check('a hired companion\'s dialog offers parting, and dismissal works',
            !bye.hired && bye.closed && bye.startChoices.length === 2, bye);

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during companions', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — companions talk, hire, follow, and belong to their save slot.'
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
