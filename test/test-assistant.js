/*
 * Build assistant test (local generative builder)
 * -----------------------------------------------
 * Verifies the offline intent-parser builder:
 *   - unknown requests are refused with guidance,
 *   - "a walled arena" builds a floor + walls AND wires a trigger to a
 *     spawner (a real battleground, not just blocks),
 *   - "a star trail with 4 stars" respects the count and wires the stars
 *     into a counter -> scoreboard,
 *   - "a patrol" builds a looped path chain with a blob wired to it,
 *   - a "snow" modifier swaps in themed terrain,
 *   - the K key in build mode runs a request (prompt test-hooked),
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7098 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_trigger', 'l_spawner', 'pk_star']);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => { window.app.activeMode.enemyManager.autoSpawn = false; });
        await h.waitFrames(10);

        // --- 1. Unknown request refused ---
        const unknown = await h.evaluate(() => window.app.assistant.run('make me a sandwich'));
        console.log('\n[1] unknown', unknown);
        check('an unrecognized request is refused with guidance',
            !unknown.ok && /Try:/.test(unknown.message), unknown);

        // --- 2. Arena: floor + walls + wired spawner ---
        const arena = await h.evaluate(() => {
            const app = window.app;
            const t0 = app.findWorldObject('l_trigger').instances.filter(Boolean).length;
            const r = app.assistant.run('build a walled arena');
            const trig = app.findWorldObject('l_trigger').instances.filter(Boolean).slice(-1)[0];
            const wiredSpawner = trig && (trig.wires || []).some((w) => w.toWo === 'l_spawner');
            return { r, made: r.made, wiredSpawner,
                tiles: app.findWorldObject('t_tile').instances.filter(Boolean).length };
        });
        console.log('[2] arena', arena);
        check('"a walled arena" builds many objects and wires a spawner',
            arena.r.ok && arena.r.recipe === 'arena' && arena.made > 20 && arena.wiredSpawner, arena);
        await h.screenshot('assistant-arena');

        // --- 3. Star trail: count respected + wired scoring ---
        const stars = await h.evaluate(() => {
            const app = window.app;
            const s0 = app.findWorldObject('pk_star').instances.filter(Boolean).length;
            const r = app.assistant.run('a star trail with 4 stars');
            const s1 = app.findWorldObject('pk_star').instances.filter(Boolean).length;
            const star = app.findWorldObject('pk_star').instances.filter(Boolean).slice(-1)[0];
            const wiredCounter = star && (star.wires || []).some((w) => w.toWo === 'l_counter');
            const counter = app.findWorldObject('l_counter').instances.filter(Boolean).slice(-1)[0];
            const wiredBoard = counter && (counter.wires || []).some((w) => w.toWo === 'l_scoreboard');
            return { added: s1 - s0, wiredCounter, wiredBoard, opts: r.opts };
        });
        console.log('[3] stars', stars);
        check('"...with 4 stars" makes exactly 4 stars wired to a counter+board',
            stars.added === 4 && stars.opts.count === 4 && stars.wiredCounter && stars.wiredBoard, stars);

        // --- 4. Patrol: looped path chain + wired blob ---
        const patrol = await h.evaluate(() => {
            const app = window.app;
            const r = app.assistant.run('add a patrol with three nodes');
            const nodes = app.findWorldObject('l_pathnode').instances.filter(Boolean);
            const chained = nodes.slice(-3).every((n) => (n.wires || []).some((w) => w.action === 'chain'));
            const blob = app.findWorldObject('en_blob').instances.filter(Boolean).slice(-1)[0];
            const wiredBlob = blob && (blob.wires || []).some((w) => w.event === 'patrol');
            return { recipe: r.recipe, chained, wiredBlob, count: r.opts.count };
        });
        console.log('[4] patrol', patrol);
        check('"a patrol with three nodes" chains a loop and wires a blob to it',
            patrol.recipe === 'patrol' && patrol.count === 3 && patrol.chained && patrol.wiredBlob, patrol);

        // --- 5. Theme modifier swaps terrain ---
        const themed = await h.evaluate(() => {
            const app = window.app;
            const s0 = app.findWorldObject('t_snow').instances.filter(Boolean).length;
            app.assistant.run('a small snow platform');
            const s1 = app.findWorldObject('t_snow').instances.filter(Boolean).length;
            return { snowAdded: s1 - s0 };
        });
        console.log('[5] themed', themed);
        check('a "snow" request builds with themed terrain', themed.snowAdded > 0, themed);

        // --- 6. The K key runs the assistant in build mode ---
        await h.evaluate(() => window.app.goto_buildMode());
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'BuildMode', null, 20000);
        const before = await h.evaluate(() =>
            window.app.findWorldObject('t_block_2').instances.filter(Boolean).length);
        await h.evaluate((n) => { window.app.testPromptValue = 'a tall tower'; window.__towerBefore = n; }, before);
        await h.tapUntil('k', () => {
            const n = window.app.findWorldObject('t_block_2').instances.filter(Boolean).length;
            return n > window.__towerBefore;
        });
        const after = await h.evaluate(() =>
            window.app.findWorldObject('t_block_2').instances.filter(Boolean).length);
        console.log('[6] K key', { before, after });
        check('the K key runs an assistant request in build mode', after > before, { before, after });

        // --- 7. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the assistant', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — ask for a thing, and the toy box builds it.'
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
