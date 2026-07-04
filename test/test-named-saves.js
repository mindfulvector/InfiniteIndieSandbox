/*
 * Named worlds + progression slots test (user request)
 * ----------------------------------------------------
 * Verifies the save rework:
 *   - progression slots isolate pixels/levels while the COLLECTION is
 *     shared (a disc bought in slot 1 is owned in slot 2; pixels are not),
 *   - switching back restores each slot's own progression,
 *   - a world saves under a NAME from the pause path mid-session (prompt
 *     test-hooked), appears in namedWorlds, and loads back mid-session
 *     restoring the world state,
 *   - the overwrite path saves onto an existing name,
 *   - legacy numbered world saves migrate to "Slot N" names,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7086 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_counter']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.enemyManager.autoSpawn = false;
        });

        // --- 1. Slot isolation with a shared collection ---
        const slots = await h.evaluate(() => {
            const app = window.app;
            // Slot 1: rich, buys a disc (ownership = collection = shared).
            if (app.saveSlot !== 1) app.selectSlot(1);
            app.pixels = 500;
            app.buyDisc('ember');
            app.pixels = 111;
            app.saveEconomy();
            app.selectSlot(2);
            const s2 = { pixels: app.pixels, emberOwned: app.ownedDiscs.has('ember') };
            app.pixels = 222;
            app.saveEconomy();
            app.selectSlot(1);
            const s1 = { pixels: app.pixels };
            app.selectSlot(2);
            const s2b = { pixels: app.pixels };
            app.selectSlot(1);
            return { s2, s1, s2b };
        });
        console.log('\n[1] slots', slots);
        check('a fresh slot starts with its own pixels but the SHARED collection',
            slots.s2.pixels === 0 && slots.s2.emberOwned === true, slots);
        check('each slot keeps its own progression across switches',
            slots.s1.pixels === 111 && slots.s2b.pixels === 222, slots);

        // --- 2. Save the world under a NAME from the pause path ---
        await h.evaluate(() => {
            const app = window.app;
            // A marker object so the load can prove restoration.
            const c = app.findWorldObject('l_counter').createInstance();
            c.position = new BABYLON.Vector3(3, 2, 3);
            window.__marker = app.findWorldObject('l_counter').instances.filter(Boolean).length;
            app.testPromptValue = 'Test Grove';
            app.menu.prevState = 2;          // pause
            app.menu.state = 3;              // MENU_SAVE
            app.triggerMenuItem(3, 1);       // save as new name (prompt hooked)
        });
        const saved = await h.evaluate(() => ({
            names: window.app.namedWorlds(),
            stored: !!window.localStorage.getItem('iis_world_Test Grove'),
            backAtPause: window.app.menu.state === 2,
        }));
        console.log('[2] named save', saved);
        check('the world saves under a typed name from the pause path',
            saved.names.includes('Test Grove') && saved.stored && saved.backAtPause, saved);

        // --- 3. Mutate, then load the name back mid-session ---
        const restored = await h.evaluate(() => {
            const app = window.app;
            // Mutate: add extra counters the save does not contain.
            for (let i = 0; i < 3; i++) {
                const c = app.findWorldObject('l_counter').createInstance();
                c.position = new BABYLON.Vector3(5 + i, 2, 5);
            }
            const mutated = app.findWorldObject('l_counter').instances.filter(Boolean).length;
            const idx = app.namedWorlds().indexOf('Test Grove');
            app.menu.prevState = 2;
            app.menu.state = 4;              // MENU_LOAD
            app.triggerMenuItem(4, idx + 1); // load "Test Grove"
            return { mutated };
        });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' &&
            window.app.menu.state === 0, null, 20000);
        const counts = await h.evaluate(() => ({
            counters: window.app.findWorldObject('l_counter').instances.filter(Boolean).length,
            marker: window.__marker,
        }));
        console.log('[3] load restores', { restored, counts });
        check('loading the named world mid-session restores its state',
            counts.counters === counts.marker && restored.mutated > counts.marker, { restored, counts });

        // --- 4. Overwrite an existing name ---
        const over = await h.evaluate(() => {
            const app = window.app;
            const names0 = app.namedWorlds();
            const idx = names0.indexOf('Test Grove');
            app.menu.prevState = 2;
            app.menu.state = 3;
            app.triggerMenuItem(3, idx + 2);   // overwrite row (saving offsets by 2)
            return { names0, names1: app.namedWorlds(), atPause: app.menu.state === 2 };
        });
        console.log('[4] overwrite', over);
        check('overwriting an existing name saves in place (no new entry)',
            over.names1.length === over.names0.length && over.atPause, over);

        // --- 5. Legacy numbered saves migrate to names ---
        const legacy = await h.evaluate(() => {
            const app = window.app;
            window.localStorage.setItem('saveSlot_7', JSON.stringify({ format: 'iis-world', version: 1, objects: [] }));
            window.localStorage.removeItem('iis_worlds_migrated');
            app._migrateLegacyWorlds();
            return { names: app.namedWorlds() };
        });
        console.log('[5] migration', legacy);
        check('legacy numbered saves migrate to "Slot N" names',
            legacy.names.includes('Slot 7'), legacy);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during save rework', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — worlds have names, slots keep progression, the collection is one.'
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
