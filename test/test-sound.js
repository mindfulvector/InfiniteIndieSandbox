/*
 * Sound toy test
 * --------------
 * Verifies the synthesized chime:
 *   - the audio layer lazily builds one context + master gain,
 *   - `play` schedules the jingle pattern (4 notes) and fires `played`
 *     into a wired counter,
 *   - each sound param selects a distinct pattern (alarm 6, gong 2,
 *     powerup 5 notes) and the volume param rides along,
 *   - a trigger wired into `play` sounds the chime from world events
 *     (lastChime.seq is the marker -- currentTime freezes while a headless
 *     context stays suspended),
 *   - repeated plays keep firing `played` (edge per play),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7074 });
    try {
        await h.start();
        await h.waitForReady(['l_chime', 'l_trigger', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(10);

        // --- 1. Play the default jingle; audio layer + played edge ---
        const jingle = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const chime = app.findWorldObject('l_chime').createInstance();
            chime.position = pm.player.position.add(new BABYLON.Vector3(4, 1, 4));
            const count = app.findWorldObject('l_counter').createInstance();
            count.position = chime.position.add(new BABYLON.Vector3(2, 0, 0));
            count.params.threshold = 50; count.params.autoReset = 'no';
            chime.wires.push({ event: 'played', toWo: 'l_counter', toId: count.worldId, action: 'increment' });
            window.__C = { chime, count };
            chime.script.onInput('play');
            return {
                ctx: !!app._audioCtx,
                master: app._masterGain ? app._masterGain.gain.value : null,
                chime: app.lastChime,
                played: count.script.count,
            };
        });
        console.log('\n[1] jingle', jingle);
        check('the audio layer builds lazily (context + 0.6 master gain)',
            jingle.ctx && Math.abs(jingle.master - 0.6) < 0.001, jingle);   // float32 param
        check('`play` schedules the 4-note jingle and fires `played`',
            jingle.chime.count === 4 && jingle.chime.seq === 1 && jingle.played === 1, jingle);

        // --- 2. Pattern + volume selection per param ---
        const patterns = await h.evaluate(() => {
            const app = window.app, c = window.__C.chime;
            const out = {};
            [['alarm', 1.0], ['gong', 0.2], ['powerup', 0.5]].forEach(([s, v]) => {
                c.params.sound = s;
                c.params.volume = v;
                c.script.onInput('play');
                out[s] = { count: app.lastChime.count, volume: app.lastChime.volume };
            });
            return out;
        });
        console.log('[2] patterns', patterns);
        check('each sound selects its pattern (alarm 6, gong 2, powerup 5) with its volume',
            patterns.alarm.count === 6 && patterns.alarm.volume === 1.0 &&
            patterns.gong.count === 2 && patterns.gong.volume === 0.2 &&
            patterns.powerup.count === 5 && patterns.powerup.volume === 0.5, patterns);

        // --- 3. A world event sounds the chime through a wire ---
        await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const trig = app.findWorldObject('l_trigger').createInstance();
            trig.position = pm.player.position.add(new BABYLON.Vector3(-6, 1.2, 0));
            trig.wires.push({ event: 'entered', toWo: 'l_chime',
                toId: window.__C.chime.worldId, action: 'play' });
            window.__T = { trig, seq0: app.lastChime.seq };
        });
        await h.waitFrames(3);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position.copyFrom(window.__T.trig.position);
        });
        await h.waitFor(() => window.app.lastChime.seq > window.__T.seq0, null, 20000);
        const wired = await h.evaluate(() => ({
            seq: window.app.lastChime.seq,
            played: window.__C.count.script.count,
        }));
        console.log('[3] wired chime', wired);
        check('a trigger wired into `play` sounds the chime (and `played` chains)',
            wired.seq === 5 && wired.played === 5, wired);
        await h.screenshot('chime-toy');

        // --- 4. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during sounds', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — chimes synthesize, patterns select, and world events make music.'
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
