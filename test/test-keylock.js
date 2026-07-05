/*
 * Key + lock test
 * ---------------
 * Verifies the key-and-lock adventure mechanic:
 *   - pk_key registers with KeyScript + a collected output; pr_lock with
 *     LockScript + an unlock input + unlocked output,
 *   - a locked barrier starts SOLID (blocks the player),
 *   - walking into the lock WITHOUT the key does nothing,
 *   - collecting the matching key adds it to mode.keysHeld and fires
 *     collected,
 *   - approaching the lock WITH the key unlocks it (consumes the key, the
 *     barrier goes intangible, fires unlocked),
 *   - a wrong-color key does not open it,
 *   - a wired `unlock` force-opens without a key,
 *   - a play reset re-locks the barrier and empties the key ring,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7118 });
    try {
        await h.start();
        await h.waitForReady(['pk_key', 'pr_lock', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
            pm.enemyManager.enemies.forEach((e) => e.mesh.dispose(false, false));
            pm.enemyManager.enemies = [];
            pm.keysHeld = new Set();
        });
        await h.waitFrames(10);

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const k = window.app.findWorldObject('pk_key').createInstance();
            const l = window.app.findWorldObject('pr_lock').createInstance();
            k.position = new BABYLON.Vector3(300, 2, 300);
            l.position = new BABYLON.Vector3(310, 2, 300);
            return {
                keyScript: k.script.constructor.name,
                keyOut: k.script.outputs.some((o) => o.id === 'collected'),
                lockScript: l.script.constructor.name,
                lockIn: l.script.inputs.some((i) => i.id === 'unlock'),
                lockOut: l.script.outputs.some((o) => o.id === 'unlocked'),
            };
        });
        console.log('\n[1] registration', reg);
        check('pk_key + pr_lock register with the right scripts and ports',
            reg.keyScript === 'KeyScript' && reg.keyOut &&
            reg.lockScript === 'LockScript' && reg.lockIn && reg.lockOut, reg);

        // --- 2. The lock starts solid; the key opens it ---
        const flow = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            pm.keysHeld = new Set();
            const key = app.findWorldObject('pk_key').createInstance();
            key.position = new BABYLON.Vector3(10, 1, 5);
            key.params = { keyId: 'gold' };
            const lock = app.findWorldObject('pr_lock').createInstance();
            lock.position = new BABYLON.Vector3(20, 1, 5);
            lock.params = { keyId: 'gold' };
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(20, 1, 8);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            lock.wires = [{ event: 'unlocked', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' }];
            key.script._wasPlay = null; lock.script._wasPlay = null;
            key.script.update(true, pm); lock.script.update(true, pm);
            window.__K = { key, lock, cnt };
            const solid = lock.checkCollisions === true;

            // Approach the lock WITHOUT the key: stays solid.
            pm.player.position.copyFrom(lock.position);
            lock.script.update(true, pm);
            const stillLocked = !lock.script._open;

            // Collect the key.
            pm.player.position.copyFrom(key.position);
            key.script.update(true, pm);
            const held = pm.keysHeld.has('gold');
            const keyGone = key.isVisible === false;

            // Approach the lock WITH the key: unlocks, consumes the key.
            pm.player.position.copyFrom(lock.position);
            lock.script.update(true, pm);
            return { solid, stillLocked, held, keyGone,
                open: lock.script._open, intangible: lock.checkCollisions === false,
                consumed: !pm.keysHeld.has('gold'), unlockedCount: cnt.script.count };
        });
        console.log('[2] flow', flow);
        check('a locked barrier starts solid and ignores an approach without the key',
            flow.solid && flow.stillLocked, flow);
        check('collecting the matching key adds it to the ring and hides the key',
            flow.held && flow.keyGone, flow);
        check('approaching with the key unlocks it, consumes the key, fires unlocked',
            flow.open && flow.intangible && flow.consumed && flow.unlockedCount === 1, flow);
        await h.screenshot('keylock');

        // --- 3. A wrong-color key does not open it ---
        const wrong = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const lock = app.findWorldObject('pr_lock').createInstance();
            lock.position = new BABYLON.Vector3(40, 1, 5);
            lock.params = { keyId: 'silver' };
            lock.script._wasPlay = null; lock.script.update(true, pm);
            pm.keysHeld = new Set(['gold']);   // wrong color
            pm.player.position.copyFrom(lock.position);
            lock.script.update(true, pm);
            return { open: lock.script._open };
        });
        console.log('[3] wrong key', wrong);
        check('a wrong-color key does not open the lock', !wrong.open, wrong);

        // --- 4. A wired unlock force-opens without a key ---
        const forced = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const lock = app.findWorldObject('pr_lock').createInstance();
            lock.position = new BABYLON.Vector3(60, 1, 5);
            lock.params = { keyId: 'bronze' };
            lock.script._wasPlay = null; lock.script.update(true, pm);
            pm.keysHeld = new Set();   // no keys
            pm.player.position.copyFrom(new BABYLON.Vector3(90, 1, 90));   // far away
            lock.script.onInput('unlock');
            lock.script.update(true, pm);
            return { open: lock.script._open, intangible: lock.checkCollisions === false };
        });
        console.log('[4] force', forced);
        check('a wired unlock force-opens without a key', forced.open && forced.intangible, forced);

        // --- 5. A play reset re-locks and empties the ring ---
        const reset = await h.evaluate(() => {
            const pm = window.app.activeMode, K = window.__K;
            pm.keysHeld = new Set(['gold', 'silver']);
            K.lock.script.onPlayReset(pm);
            K.key.script.onPlayReset(pm);
            return { relocked: K.lock.checkCollisions === true && !K.lock.script._open,
                ringEmpty: pm.keysHeld.size === 0,
                keyBack: K.key.isVisible === true };
        });
        console.log('[5] reset', reset);
        check('a play reset re-locks the barrier and empties the key ring',
            reset.relocked && reset.ringEmpty && reset.keyBack, reset);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during key/lock', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — grab the key, and the matching lock swings wide.'
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
