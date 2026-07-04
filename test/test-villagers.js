/*
 * Villager test
 * -------------
 * Verifies ambient NPCs:
 *   - the villager rigs itself (legs, hidden bubble) and WANDERS on a
 *     leash around home (moves, stays close),
 *   - approaching stops it, shows the talk bubble, and edge-fires `talked`
 *     into a wired counter; hovering close doesn't re-fire; leaving hides
 *     the bubble and returning greets again with the NEXT line,
 *   - the `say` input forces a timed bubble from afar,
 *   - two villagers wired into a 2-step quest complete it (distinct-source
 *     quest hooks),
 *   - a play reset sends it home with the bubble hidden,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7091 });
    try {
        await h.start();
        await h.waitForReady(['pr_villager', 'l_quest', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Rig + wander on a leash ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const v = app.findWorldObject('pr_villager').createInstance();
            v.position = pm.player.position.add(new BABYLON.Vector3(8, 1.2, 0));
            const talks = app.findWorldObject('l_counter').createInstance();
            talks.position = v.position.add(new BABYLON.Vector3(0, 0, 3));
            talks.params.threshold = 10; talks.params.autoReset = 'no';
            v.wires.push({ event: 'talked', toWo: 'l_counter', toId: talks.worldId, action: 'increment' });
            window.__V = { v, talks };
            v.script._wasPlay = null;
        });
        await h.waitFrames(5);
        const rig = await h.evaluate(() => ({
            legs: window.__V.v.script._legs.length,
            bubbleHidden: window.__V.v.script._bubble.isVisible === false,
        }));
        console.log('\n[1] rig', rig);
        check('the villager rigs itself (legs + hidden bubble)',
            rig.legs === 2 && rig.bubbleHidden, rig);

        const wander = await h.evaluate(() => new Promise((resolve) => {
            const v = window.__V.v, home = v.script._home;
            const p0 = v.position.clone();
            let n = 0, moved = 0, maxLeash = 0;
            const tick = () => {
                n++;
                moved = Math.max(moved, BABYLON.Vector3.Distance(v.position, p0));
                maxLeash = Math.max(maxLeash, BABYLON.Vector3.Distance(v.position, home));
                if ((moved > 1 && n > 60) || n > 2000) return resolve({ moved, maxLeash });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] wander', wander);
        check('it wanders (moves >1) while staying leashed near home (<8)',
            wander.moved > 1 && wander.maxLeash < 8, wander);

        // --- 2. Greet: bubble + wired `talked`, edge semantics ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__V.v.position.add(new BABYLON.Vector3(1.2, 0.3, 0)));
        });
        await h.waitFor(() => window.__V.talks.script.count === 1, null, 20000);
        const greet = await h.evaluate(() => ({
            bubble: window.__V.v.script._bubble.isVisible,
            lineIdx: window.__V.v.script._lineIdx,
        }));
        await h.waitFrames(15);   // hover: must not re-fire
        const hover = await h.evaluate(() => ({ count: window.__V.talks.script.count }));
        console.log('[3] greet', { greet, hover });
        check('greeting shows the bubble and fires `talked` once',
            greet.bubble && greet.lineIdx === 1 && hover.count === 1, { greet, hover });
        await h.screenshot('villager-greet');

        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__V.v.script._home.add(new BABYLON.Vector3(6, 0.5, 6)));
        });
        await h.waitFor(() => window.__V.v.script._near === false &&
            window.__V.v.script._bubble.isVisible === false, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__V.v.position.add(new BABYLON.Vector3(1.0, 0.3, 0)));
        });
        await h.waitFor(() => window.__V.talks.script.count === 2, null, 20000);
        const second = await h.evaluate(() => ({ lineIdx: window.__V.v.script._lineIdx }));
        console.log('[4] re-greet', second);
        check('leaving hides the bubble; returning greets with the NEXT line',
            second.lineIdx === 2, second);

        // --- 3. `say` forces a timed bubble from afar ---
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__V.v.script._home.add(new BABYLON.Vector3(8, 0.5, 8)));
        });
        await h.waitFor(() => window.__V.v.script._near === false, null, 20000);
        await h.evaluate(() => { window.__V.v.script.onInput('say'); });
        const said = await h.evaluate(() => ({
            bubble: window.__V.v.script._bubble.isVisible,
            timed: window.__V.v.script._bubbleTimer <= 180,
        }));
        console.log('[5] say', said);
        check('`say` forces a timed bubble from afar', said.bubble && said.timed, said);

        // --- 4. Quest hook: talk to two villagers ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const v2 = app.findWorldObject('pr_villager').createInstance();
            v2.position = pm.player.position.add(new BABYLON.Vector3(-6, 1.2, 3));
            v2.params.mood = 'grumpy';
            v2.script._wasPlay = null;
            const q = app.findWorldObject('l_quest').createInstance();
            q.position = v2.position.add(new BABYLON.Vector3(0, 0, 3));
            q.params.steps = 2; q.params.reward = 15;
            window.__V.v.wires.push({ event: 'talked', toWo: 'l_quest', toId: q.worldId, action: 'step' });
            v2.wires.push({ event: 'talked', toWo: 'l_quest', toId: q.worldId, action: 'step' });
            window.__V.v2 = v2; window.__V.q = q;
            app.pixels = 0;
        });
        await h.waitFrames(5);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__V.v2.position.add(new BABYLON.Vector3(1.0, 0.3, 0)));
        });
        await h.waitFor(() => window.__V.q.script._done.size === 1, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__V.v.position.add(new BABYLON.Vector3(1.0, 0.3, 0)));
        });
        await h.waitFor(() => window.__V.q.script._complete === true, null, 20000);
        const quest = await h.evaluate(() => ({ pixels: window.app.pixels }));
        console.log('[6] quest hook', quest);
        check('talking to two villagers completes a 2-step quest (+15)',
            quest.pixels >= 15, quest);

        // --- 5. Reset sends it home, bubble hidden ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode;
            window.app.pixels = 100;
            pm.respawn();
            const v = window.__V.v;
            return {
                nearHome: BABYLON.Vector3.Distance(v.position, v.script._home) < 2,
                bubbleHidden: v.script._bubble.isVisible === false,
                lineIdx: v.script._lineIdx,
            };
        });
        console.log('[7] reset', reset);
        check('a play reset sends the villager home with the bubble hidden',
            reset.nearHome && reset.bubbleHidden && reset.lineIdx === 0, reset);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during villagers', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the neighborhood wanders, chats, and hands out quest credit.'
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
