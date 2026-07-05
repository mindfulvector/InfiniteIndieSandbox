/*
 * Defeat-streak HUD indicator test
 * --------------------------------
 * Verifies the on-screen streak readout surfaces the scoring mechanic:
 *   - a hudStreak GUI element exists and is hidden with no chain,
 *   - it stays hidden at streak 1, appears at streak >= 2,
 *   - its text shows the streak count and, once the multiplier kicks in
 *     (streak 3+), the live "Mx PIXELS",
 *   - its colour heats up by tier (building -> gold -> orange -> red),
 *   - resetting the streak hides it again,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7144 });
    try {
        await h.start();
        await h.waitForReady(['en_charger']);
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

        // Read the HUD streak element's live state after letting the UI render.
        const readHud = async () => {
            await h.waitFrames(3);
            return h.evaluate(() => {
                const t = window.app.hud && window.app.hud.streakText;
                return t ? { visible: t.isVisible, text: t.text, color: t.color } : null;
            });
        };

        // --- 1. Element exists, hidden with no chain ---
        await h.evaluate(() => { window.app.activeMode.resetStreak(); });
        const none = await readHud();
        console.log('\n[1] no chain', none);
        check('a hudStreak element exists and is hidden with no chain',
            none && none.visible === false, none);

        // --- 2. Hidden at streak 1, shown at streak 2 (building, blue) ---
        await h.evaluate(() => { window.app.activeMode._streak = 1; });
        const one = await readHud();
        await h.evaluate(() => { window.app.activeMode._streak = 2; });
        const two = await readHud();
        console.log('[2] streak 1/2', { one, two });
        check('hidden at streak 1, appears at streak 2 (building, blue)',
            one.visible === false && two.visible === true &&
            two.text.indexOf('×2') >= 0 && two.color === '#8fd9ff', { one, two });

        // --- 3. At streak 3 the multiplier shows (gold) ---
        await h.evaluate(() => { window.app.activeMode._streak = 3; });
        const three = await readHud();
        console.log('[3] streak 3', three);
        check('at streak 3 the readout shows the 1.5x multiplier in gold',
            three.visible === true && three.text.indexOf('1.5× PIXELS') >= 0 && three.color === '#ffd23f',
            three);

        // --- 4. Colour heats up at the higher tiers ---
        await h.evaluate(() => { window.app.activeMode._streak = 6; });
        const six = await readHud();
        await h.evaluate(() => { window.app.activeMode._streak = 10; });
        const ten = await readHud();
        console.log('[4] tiers', { six, ten });
        check('colour heats up: orange at 2x (streak 6), red at 3x (streak 10)',
            six.color === '#ff9a3f' && six.text.indexOf('2× PIXELS') >= 0 &&
            ten.color === '#ff4a5b' && ten.text.indexOf('3× PIXELS') >= 0, { six, ten });
        await h.screenshot('streak-hud');

        // --- 5. Resetting hides it again ---
        await h.evaluate(() => { window.app.activeMode.resetStreak(); });
        const cleared = await readHud();
        console.log('[5] reset', cleared);
        check('resetting the streak hides the readout again', cleared.visible === false, cleared);

        // --- 6. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the streak HUD', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the streak and its multiplier read out live on the HUD.'
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
