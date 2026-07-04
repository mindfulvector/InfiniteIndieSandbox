/*
 * Death-penalty test
 * ------------------
 * Dying costs 10% of the current pixels and resets the run:
 *   - pixels drop by exactly 10% (floored) and HP/position restore,
 *   - counters and scoreboards zero, timers/spawners re-arm,
 *   - collected pickups come back,
 *   - a trigger the player was standing in can fire again.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_counter', 'l_scoreboard', 'l_timer', 'pk_star', 'l_trigger']);
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // Build some run state: pixels, a counter mid-count, a score, a running
        // timer stopped by a wire, and a collected pickup.
        const before = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            app.pixels = 100; app.saveEconomy();

            const counter = app.findWorldObject('l_counter').createInstance();
            counter.position = new BABYLON.Vector3(4, 1, 4);
            counter.params.threshold = 50;
            counter.script.onInput('increment');
            counter.script.onInput('increment');

            const board = app.findWorldObject('l_scoreboard').createInstance();
            board.position = new BABYLON.Vector3(-4, 1, 4);
            board.script.onInput('add5');

            const timer = app.findWorldObject('l_timer').createInstance();
            timer.position = new BABYLON.Vector3(0, 1, 5);
            timer.params.startActive = 'no';
            timer.script.onInput('start');   // running now, but startActive says no

            const star = app.findWorldObject('pk_star').createInstance();
            star.position = new BABYLON.Vector3(9, 1, 9);
            star.script._collected = true;   // as if already collected this run
            star.isVisible = false;

            const trig = app.findWorldObject('l_trigger').createInstance();
            trig.position = new BABYLON.Vector3(9, 1, -9);
            trig.script.state.entered['x'] = true;
            trig.script.state.activated = true;

            window.__ids = { counter: counter.worldId, board: board.worldId,
                timer: timer.worldId, star: star.worldId, trig: trig.worldId };
            return { px: app.pixels, count: counter.script.count, score: board.script.score,
                timerActive: timer.script._active, hp0: pm.playerHp };
        });
        console.log('\n[1] run state before death', before);
        check('run state armed (count 2, score 5, timer running)',
            before.count === 2 && before.score === 5 && before.timerActive === true, before);

        // --- Die MID-COMBAT: live walkers and in-flight projectiles make the
        // respawn reset happen while the enemy loops have work in hand (the
        // e.kind / pr.mesh crash regression). ---
        await h.evaluate(() => {
            const pm = window.app.activeMode, em = pm.enemyManager;
            em.spawnWalker(); em.spawnWalker();
            em.enemies.forEach((rec) => {
                rec.speed = 0; rec.fade = 0;
                rec.mesh.position = pm.player.position.add(new BABYLON.Vector3(6, 0.2, 0));
                em.fireProjectile(rec, pm.player.position.clone());
            });
            pm.hurtCooldown = 0;
            pm.damagePlayer(99999);
        });
        await h.waitFrames(10);
        const after = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, ids = window.__ids;
            const get = (n, id) => app.findInstance(n, id);
            const star = get('pk_star', ids.star);
            const trig = get('l_trigger', ids.trig);
            return {
                px: app.pixels,
                hp: pm.playerHp, maxHp: pm.playerMaxHp,
                atSpawn: BABYLON.Vector3.Distance(pm.player.position, pm.spawnPoint) < 4,
                count: get('l_counter', ids.counter).script.count,
                score: get('l_scoreboard', ids.board).script.score,
                timerActive: get('l_timer', ids.timer).script._active,
                starVisible: star.isVisible && star.script._collected === false,
                trigReset: trig.script.state.activated === false &&
                           Object.keys(trig.script.state.entered).length === 0,
            };
        });
        console.log('\n[2] after death', after);
        check('death costs exactly 10% of pixels (100 -> 90)', after.px === 90, after);
        check('HP restores to full at the spawn point', after.hp === after.maxHp && after.atSpawn, after);
        check('the counter resets to 0', after.count === 0, after);
        check('the scoreboard resets to 0', after.score === 0, after);
        check('the timer re-arms to its start state (off)', after.timerActive === false, after);
        check('collected pickups come back', after.starVisible === true, after);
        check('triggers forget the player (can fire again)', after.trigReset === true, after);
        const deathCrash = h.pageErrors.filter((e) => /e\.kind|pr\.mesh|TypeError/.test(e));
        check('dying mid-combat causes no crash (no enemy-loop TypeErrors)',
            deathCrash.length === 0, { errors: deathCrash.slice(0, 3) });
        await h.screenshot('after-death-reset');

        // --- 10% is of the CURRENT pixels (floored) ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            app.pixels = 7;
            pm.hurtCooldown = 0;
            pm.damagePlayer(99999);
        });
        await h.waitFrames(8);   // the (deferred) respawn runs next frame
        const again = await h.evaluate(() => ({ px: window.app.pixels }));
        console.log('\n[3] small balance', again);
        check('a 7-pixel balance loses 0 (floor of 0.7)', again.px === 7, again);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — death costs 10% of pixels and fully resets the run.'
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
