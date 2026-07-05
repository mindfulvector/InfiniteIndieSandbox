/*
 * In-game text entry test
 * -----------------------
 * app.promptText now opens a styled in-game modal (Babylon GUI InputText)
 * instead of window.prompt -- reusable for every text ask in the game
 * (world names, sub-level names, builder requests, co-op codes). Verifies:
 *   - the modal opens with the label + prefilled default and freezes the
 *     world (mode updates stop, the CharacterController stops),
 *   - confirming returns the (trimmed) text and unfreezes; typed-in keys
 *     never leak into game actions (keysPressed cleared),
 *   - cancelling returns null; confirming an empty field returns null,
 *   - only one modal opens at a time (a second ask cancels immediately),
 *   - the real save-world call site works end to end through the modal.
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
        await h.waitForReady(['t_tile']);
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('2', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(20);

        // --- 1. Opening: modal appears, world freezes ---
        const opened = await h.evaluate(() => {
            const app = window.app;
            window.__result = 'unset';
            app.promptText('Name your creation:', 'Prefilled', (v) => { window.__result = v; });
            return {
                open: app.textEntryOpen === true,
                hasModal: !!app._textEntry,
                prefill: app._textEntry ? app._textEntry.input.text : null,
                frame0: app.activeMode.enemyManager.frame,
            };
        });
        await h.waitFrames(20);
        const frozen = await h.evaluate(() => ({
            frame1: window.app.activeMode.enemyManager.frame,
        }));
        console.log('\n[1] modal open', { opened, frozen });
        check('the modal opens with the prefilled default',
            opened.open && opened.hasModal && opened.prefill === 'Prefilled', opened);
        check('the world freezes while the field is open (no enemy frames tick)',
            frozen.frame1 === opened.frame0, { opened, frozen });
        await h.screenshot('text-entry-open');

        // --- 2. Confirming returns the trimmed text and unfreezes ---
        const confirmed = await h.evaluate(() => {
            const app = window.app;
            app.keysPressed['W'] = true;   // as if WASD was typed into the field
            app._textEntry.input.text = '  Typed Name  ';
            app._textEntry.confirm();
            return {
                result: window.__result,
                open: app.textEntryOpen,
                modalGone: !app._textEntry,
                wCleared: app.keysPressed['W'] !== true,
                frame0: app.activeMode.enemyManager.frame,
            };
        });
        await h.waitFrames(20);
        const thawed = await h.evaluate(() => ({
            frame1: window.app.activeMode.enemyManager.frame,
        }));
        console.log('\n[2] confirmed', { confirmed, thawed });
        check('confirm returns the trimmed text', confirmed.result === 'Typed Name', confirmed);
        check('the modal closes and typed keys never fire game actions',
            !confirmed.open && confirmed.modalGone && confirmed.wCleared, confirmed);
        check('the world unfreezes after closing', thawed.frame1 > confirmed.frame0, { confirmed, thawed });

        // --- 3. Cancel and empty-confirm both return null ---
        const nulls = await h.evaluate(() => {
            const app = window.app;
            let cancelled = 'unset', empty = 'unset';
            app.promptText('Cancel me:', 'x', (v) => { cancelled = v; });
            app._textEntry.cancel();
            app.promptText('Empty me:', '', (v) => { empty = v; });
            app._textEntry.input.text = '   ';
            app._textEntry.confirm();
            return { cancelled, empty, open: app.textEntryOpen };
        });
        console.log('\n[3] cancel/empty', nulls);
        check('cancelling returns null', nulls.cancelled === null, nulls);
        check('confirming an empty field returns null', nulls.empty === null && !nulls.open, nulls);

        // --- 4. One modal at a time ---
        const single = await h.evaluate(() => {
            const app = window.app;
            let first = 'unset', second = 'unset';
            app.promptText('First:', 'a', (v) => { first = v; });
            app.promptText('Second:', 'b', (v) => { second = v; });   // must cancel instantly
            const secondCancelled = second === null;
            app._textEntry.input.text = 'kept';
            app._textEntry.confirm();
            return { first, secondCancelled };
        });
        console.log('\n[4] single modal', single);
        check('a second ask while one is open cancels immediately, first survives',
            single.secondCancelled && single.first === 'kept', single);

        // --- 5. The real save-world call site, end to end ---
        await h.tapUntil('Escape', () => window.app.menu.state === 2);
        await h.evaluate(() => { window.app.triggerMenuItem(2 /* MENU_PAUSE */, 3); });   // Save World
        await h.waitFor(() => window.app.menu.state === 3, null, 20000);
        await h.evaluate(() => { window.app.triggerMenuItem(3 /* MENU_SAVE */, 1); });    // new name…
        await h.waitFor(() => !!window.app._textEntry, null, 20000);
        const saved = await h.evaluate(() => {
            const app = window.app;
            app._textEntry.input.text = 'Field Named World';
            app._textEntry.confirm();
            return {
                stored: !!window.localStorage.getItem('iis_world_Field Named World'),
                open: app.textEntryOpen,
            };
        });
        console.log('\n[5] save-world via the field', saved);
        check('naming a world through the in-game field saves it', saved.stored && !saved.open, saved);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — one styled in-game text field serves every text ask, freezing the world while open.'
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
