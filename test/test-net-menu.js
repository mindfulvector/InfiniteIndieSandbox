/*
 * Online co-op menu test
 * ----------------------
 * Verifies the Online screen (RTC itself is proven by test-netlink; here
 * the App-level net calls are stubbed so the MENU flow is what's tested):
 *   - main menu item 8 opens the Online screen,
 *   - Host: item 1 creates and shares the invite code (lastNetCode),
 *   - Host: item 2 prompts for the answer (test hook) and finishes,
 *   - Guest: item 3 prompts for the invite and shares the answer code,
 *   - guest world receipt loads the world AND enters play mode,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7094 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_counter']);

        // --- 1. The Online screen opens from the main menu ---
        await h.evaluate(() => { window.app.triggerMenuItem(1, 8); });
        await h.waitFor(() => window.app.menu.state === 19, null, 20000);
        console.log('\n[1] online screen open');
        check('main menu item 8 opens the Online screen', true);
        await h.screenshot('online-menu');

        // --- 2. Host + guest flows over stubbed net calls ---
        const flows = await h.evaluate(async () => {
            const app = window.app;
            const calls = [];
            app.netCreateOffer = async () => { calls.push('offer'); return 'OFFER-BLOB'; };
            app.netAcceptOffer = async (o) => { calls.push('accept:' + o); return 'ANSWER-BLOB'; };
            app.netFinish = async (a) => { calls.push('finish:' + a); };

            app.triggerMenuItem(19, 1);                       // host: create invite
            await new Promise((r) => setTimeout(r, 50));
            const invite = app.lastNetCode;

            app.testPromptValue = 'PASTED-ANSWER';
            app.triggerMenuItem(19, 2);                       // host: paste answer
            await new Promise((r) => setTimeout(r, 50));

            app.testPromptValue = 'PASTED-OFFER';
            app.triggerMenuItem(19, 3);                       // guest: paste invite
            await new Promise((r) => setTimeout(r, 50));
            const answer = app.lastNetCode;

            return { calls, invite, answer };
        });
        console.log('[2] flows', flows);
        check('hosting shares the invite code',
            flows.calls.includes('offer') && flows.invite === 'OFFER-BLOB', flows);
        check('the pasted answer reaches netFinish',
            flows.calls.includes('finish:PASTED-ANSWER'), flows);
        check('joining accepts the invite and shares the answer',
            flows.calls.includes('accept:PASTED-OFFER') && flows.answer === 'ANSWER-BLOB', flows);

        // --- 3. Guest world receipt loads AND enters play ---
        await h.evaluate(() => { window.app.triggerMenuItem(19, 0); });   // back
        const landed = await h.evaluate(() => {
            const app = window.app;
            // A fake transport feeding the guest link a world message while
            // no mode is active (fresh guest at the menus).
            const t = { send: () => {}, onMessage: null };
            const link = new NetLink(app, t, false);
            const world = { format: 'iis-world', version: 1, objects: [
                { wo: 't_tile', id: 1, po: { x: 0, y: 0, z: 0 } },
                { wo: 'l_counter', id: 2, po: { x: 2, y: 1, z: 0 } },
            ] };
            t.onMessage(JSON.stringify({ t: 'world', data: world }));
            return { log: link.log.slice() };
        });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode', null, 20000);
        const guest = await h.evaluate(() => ({
            counters: window.app.findWorldObject('l_counter').instances.filter(Boolean).length,
        }));
        console.log('[3] guest landing', { landed, guest });
        check('a received world loads and drops the guest into play mode',
            landed.log[0].objects === 2 && guest.counters === 1, { landed, guest });

        // --- 4. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during the online menus', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — two codes traded through menus, and the guest lands in the host\'s world.'
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
