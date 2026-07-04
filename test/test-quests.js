/*
 * Quest chain test
 * ----------------
 * Verifies the l_quest multi-step goal toy:
 *   - distinct wired sources count once each (the same source never twice),
 *   - `progress` fires per counted step,
 *   - completing all steps fires `complete` once and pays the pixel reward,
 *   - further steps after completion neither fire nor pay again,
 *   - `reset` re-arms; a play reset (respawn) also re-arms for the next run,
 *   - the hub template ships a "Tour the Park" quest wired to its three zone
 *     activities (yard trigger, climb counter, cell door),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7042 });
    try {
        await h.start();
        await h.waitForReady(['l_quest', 'l_trigger', 'l_counter']);
        // Build the HUB so the shipped tour quest is also verifiable.
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('5', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
            window.app.pixels = 0; window.app.saveEconomy();
        });
        await h.waitFrames(10);

        // --- 1. A standalone quest: dedup, progress, completion, reward ---
        const quest = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const mk = (name, dx) => {
                const inst = app.findWorldObject(name).createInstance();
                inst.position = pm.player.position.add(new BABYLON.Vector3(dx, 1, -30));
                return inst;
            };
            const q = mk('l_quest', 0);
            q.params.steps = 2; q.params.reward = 25;
            const srcA = mk('l_trigger', 3), srcB = mk('l_trigger', 6);
            const cProg = mk('l_counter', 9), cDone = mk('l_counter', 12);
            cProg.params.threshold = 10; cProg.params.autoReset = 'no';
            cDone.params.threshold = 10; cDone.params.autoReset = 'no';
            q.wires.push({ event: 'progress', toWo: 'l_counter', toId: cProg.worldId, action: 'increment' });
            q.wires.push({ event: 'complete', toWo: 'l_counter', toId: cDone.worldId, action: 'increment' });
            window.__Q = { q, srcA, srcB, cProg, cDone };
            q.script._wasPlay = null;

            const s = q.script;
            const px0 = app.pixels;
            s.onInput('step', srcA);
            const afterA = { done: s._done.size, prog: cProg.script.count };
            s.onInput('step', srcA);           // same source again: no count
            const afterDupe = { done: s._done.size, prog: cProg.script.count };
            s.onInput('step', srcB);           // second distinct source: complete
            return {
                px0, afterA, afterDupe,
                complete: s._complete,
                done: cDone.script.count,
                prog: cProg.script.count,
                pixels: app.pixels,
            };
        });
        console.log('\n[1] quest flow', quest);
        check('the first source counts and fires progress',
            quest.afterA.done === 1 && quest.afterA.prog === 1, quest);
        check('the same source never counts twice',
            quest.afterDupe.done === 1 && quest.afterDupe.prog === 1, quest);
        check('the second distinct source completes the quest',
            quest.complete && quest.done === 1 && quest.prog === 2, quest);
        check('completion pays the 25-pixel reward', quest.pixels === quest.px0 + 25, quest);

        // --- 2. Post-completion steps neither fire nor pay ---
        const after = await h.evaluate(() => {
            const app = window.app, Q = window.__Q, s = Q.q.script;
            const px0 = app.pixels;
            s.onInput('step', Q.srcA);
            s.onInput('step', Q.srcB);
            return { done: Q.cDone.script.count, pixels: app.pixels, px0 };
        });
        console.log('[2] after completion', after);
        check('a completed quest ignores further steps (no re-fire, no re-pay)',
            after.done === 1 && after.pixels === after.px0, after);

        // --- 3. reset re-arms; respawn (onPlayReset) also re-arms ---
        const rearm = await h.evaluate(() => {
            const Q = window.__Q, s = Q.q.script;
            s.onInput('reset');
            const armedAfterReset = !s._complete && s._done.size === 0;
            s.onInput('step', Q.srcA); s.onInput('step', Q.srcB);   // complete again
            const completedTwice = Q.cDone.script.count === 2;
            window.app.activeMode.respawn();                        // broadcasts onPlayReset
            return { armedAfterReset, completedTwice, armedAfterDeath: !s._complete && s._done.size === 0 };
        });
        console.log('[3] re-arm', rearm);
        check('`reset` re-arms the quest for another completion',
            rearm.armedAfterReset && rearm.completedTwice, rearm);
        check('a play reset (death) re-arms the quest', rearm.armedAfterDeath, rearm);

        // --- 4. The hub ships the Tour the Park quest, wired to 3 zones ---
        const hub = await h.evaluate(() => {
            const app = window.app;
            const quests = app.findWorldObject('l_quest').instances.filter(Boolean);
            const tour = quests[0];   // the hub's shipped quest (placed by the template)
            const wiresInto = (n) => app.findWorldObject(n).instances.filter(Boolean)
                .flatMap((i) => i.wires || [])
                .filter((w) => w.toWo === 'l_quest' && w.action === 'step').length;
            return {
                questCount: quests.length,
                steps: tour ? tour.params.steps : null,
                fromTrigger: wiresInto('l_trigger'),
                fromCounter: wiresInto('l_counter'),
                fromCellDoor: wiresInto('pr_door_cell'),
            };
        });
        console.log('[4] hub tour quest', hub);
        check('the hub ships a 3-step tour quest wired to yard + climb + cell door',
            hub.steps === 3 && hub.fromTrigger >= 1 && hub.fromCounter >= 1 && hub.fromCellDoor >= 1, hub);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during quests', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — quests count distinct steps, pay once, re-arm, and ship in the hub.'
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
