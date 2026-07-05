/*
 * Server-link watchdog test
 * -------------------------
 * The game is served by a local HTTP server (run.sh: `php -S localhost:7001`).
 * App pings it on a heartbeat (HEAD ./index.html, cache-bypassed) and shows a
 * persistent red HUD banner while it is unreachable. Verifies:
 *   - boots connected: serverConnected true, banner hidden,
 *   - two consecutive failed pings flip serverConnected false, toast the
 *     player, and show the banner (requests are aborted via Playwright
 *     routing to simulate the server process dying),
 *   - the first successful ping after the server "returns" restores the
 *     flag and hides the banner,
 *   - no unexpected page errors (the aborted heartbeat fetches themselves
 *     are expected and handled).
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7153 });
    try {
        await h.start();
        await h.waitForReady([]);

        // -- baseline: connected, no banner --------------------------------
        const before = await h.evaluate(() => ({
            connected: window.app.serverConnected,
            warnVisible: window.app.hud.serverWarn.isVisible,
            hasTimer: !!window.app._heartbeatTimer,
        }));
        check('boots with serverConnected = true', before.connected === true, before);
        check('banner hidden while connected', before.warnVisible === false, before);
        check('heartbeat interval is armed', before.hasTimer === true, before);

        // -- server dies: all requests abort -------------------------------
        await h.page.route('**/*', (r) => r.abort());
        const down = await h.evaluate(async () => {
            // Drive the heartbeat directly instead of waiting out the 4s
            // interval. A ping overlapping the interval's own in-flight ping
            // no-ops (busy guard), so loop until the state flips.
            for (let i = 0; i < 8 && window.app.serverConnected; i++) {
                await window.app._pingServer();
            }
            return {
                connected: window.app.serverConnected,
                toast: window.app.message ? window.app.message.text : '',
            };
        });
        check('two failed pings mark the server disconnected', down.connected === false, down);
        check('player is toasted about the disconnect', /disconnected/i.test(down.toast), down);
        await h.waitFrames(3);
        const warnShown = await h.evaluate(() => window.app.hud.serverWarn.isVisible);
        check('banner visible while disconnected', warnShown === true);
        await h.screenshot('server-offline-banner');

        // -- server returns: first good ping recovers -----------------------
        await h.page.unroute('**/*');
        const up = await h.evaluate(async () => {
            for (let i = 0; i < 8 && !window.app.serverConnected; i++) {
                await window.app._pingServer();
            }
            return {
                connected: window.app.serverConnected,
                toast: window.app.message ? window.app.message.text : '',
                fails: window.app._heartbeatFails,
            };
        });
        check('one good ping reconnects', up.connected === true, up);
        check('player is toasted about the recovery', /reconnected/i.test(up.toast), up);
        check('failure streak reset', up.fails === 0, up);
        await h.waitFrames(3);
        const warnHidden = await h.evaluate(() => window.app.hud.serverWarn.isVisible);
        check('banner hidden again after recovery', warnHidden === false);
        await h.screenshot('server-recovered');

        // -- hygiene ---------------------------------------------------------
        // Aborted heartbeat/asset requests surface as fetch failures; the
        // watchdog handles those. Anything else is a real error.
        const errs = h.pageErrors.filter((e) => !h._isExpectedError(e))
            .filter((e) => !/Failed to fetch|ERR_FAILED|NetworkError|aborted|net::/i.test(e));
        check('no unexpected page errors', errs.length === 0, errs.slice(0, 3));
    } catch (err) {
        failures += 1;
        console.log('  FAIL  harness error :: ' + (err && err.stack || err));
        try { await h.screenshot('error-state'); } catch (_) {}
        h.dumpDiagnostics();
    } finally {
        await h.stop();
    }
    console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`);
    process.exit(failures === 0 ? 0 : 1);
}

main();
