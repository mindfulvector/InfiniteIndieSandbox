/*
 * Teleporter pad test
 * -------------------
 * Verifies l_teleport:
 *   - registers with TeleportScript, a `link` output + `here` input + `used`,
 *   - stepping on pad A (linked to pad B) whisks the player to pad B and
 *     fires `used`,
 *   - the far pad does NOT bounce the player back (shared cooldown), but
 *     after the cooldown a two-way link teleports back,
 *   - an unlinked pad does nothing,
 *   - a vehicle rider is not teleported,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7115 });
    try {
        await h.start();
        await h.waitForReady(['l_teleport', 'l_counter', 'pr_kart']);
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

        // --- 1. Registration ---
        const reg = await h.evaluate(() => {
            const t = window.app.findWorldObject('l_teleport').createInstance();
            t.position = new BABYLON.Vector3(300, 2, 300);
            return { script: t.script.constructor.name,
                link: t.script.outputs.some((o) => o.id === 'link'),
                here: t.script.inputs.some((i) => i.id === 'here'),
                used: t.script.outputs.some((o) => o.id === 'used') };
        });
        console.log('\n[1] registration', reg);
        check('l_teleport registers with a link output, a here input, and a used output',
            reg.script === 'TeleportScript' && reg.link && reg.here && reg.used, reg);

        // --- 2. Two-way portal: A -> B, then back after cooldown ---
        const ported = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const A = app.findWorldObject('l_teleport').createInstance();
            const B = app.findWorldObject('l_teleport').createInstance();
            A.position = new BABYLON.Vector3(10, 1, 5);
            B.position = new BABYLON.Vector3(50, 1, 40);
            A.wires = [{ event: 'link', toWo: 'l_teleport', toId: B.worldId, action: 'here' }];
            B.wires = [{ event: 'link', toWo: 'l_teleport', toId: A.worldId, action: 'here' }];
            const cnt = app.findWorldObject('l_counter').createInstance();
            cnt.position = new BABYLON.Vector3(10, 1, 8);
            cnt.params.threshold = 99; cnt.params.autoReset = 'no';
            A.wires.push({ event: 'used', toWo: 'l_counter', toId: cnt.worldId, action: 'increment' });
            window.__T = { A, B, cnt };
            pm._teleportCool = 0;
            // Step on A.
            pm.player.position.copyFrom(A.position);
            A.script.update(true, pm); B.script.update(true, pm);
            const atB = BABYLON.Vector3.Distance(pm.player.position, B.position) < 2;
            // Immediately: the far pad B must NOT bounce us back (cooldown).
            B.script.update(true, pm);
            const stillB = BABYLON.Vector3.Distance(pm.player.position, B.position) < 2;
            const coolNow = pm._teleportCool;
            // Wait out the cooldown, then B sends us back to A.
            pm._teleportCool = 0;
            B.script.update(true, pm);
            const backAtA = BABYLON.Vector3.Distance(pm.player.position, A.position) < 2;
            return { atB, stillB, coolNow, backAtA, used: cnt.script.count };
        });
        console.log('[2] portal', ported);
        check('stepping on pad A teleports to pad B and fires used',
            ported.atB && ported.used === 1, ported);
        check('the far pad does not bounce you back while the cooldown holds',
            ported.stillB && ported.coolNow > 0, ported);
        check('after the cooldown a two-way link teleports back', ported.backAtA, ported);
        await h.screenshot('teleport');

        // --- 3. An unlinked pad does nothing ---
        const solo = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const S = app.findWorldObject('l_teleport').createInstance();
            S.position = new BABYLON.Vector3(80, 1, 80);
            pm._teleportCool = 0;
            pm.player.position.copyFrom(S.position);
            const before = pm.player.position.clone();
            for (let i = 0; i < 5; i++) S.script.update(true, pm);
            return { moved: BABYLON.Vector3.Distance(pm.player.position, before) > 2 };
        });
        console.log('[3] unlinked', solo);
        check('an unlinked pad does nothing', !solo.moved, solo);

        // --- 4. A vehicle rider is not teleported ---
        const inKart = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode, T = window.__T;
            const kart = app.findWorldObject('pr_kart').createInstance();
            pm.driving = kart;                    // pretend we're driving
            pm._teleportCool = 0;
            pm.player.position.copyFrom(T.A.position);
            const before = pm.player.position.clone();
            T.A.script.update(true, pm);
            pm.driving = null;
            return { moved: BABYLON.Vector3.Distance(pm.player.position, before) > 2 };
        });
        console.log('[4] vehicle', inKart);
        check('a vehicle rider is not teleported', !inKart.moved, inKart);

        // --- 5. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during teleport', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — step on, blink across, and the far pad plays fair.'
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
