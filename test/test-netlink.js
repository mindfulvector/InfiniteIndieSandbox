/*
 * Online co-op spike test (NetLink over REAL WebRTC)
 * --------------------------------------------------
 * Headless Chromium ships full WebRTC, so this runs a genuine loopback
 * peer pair in one page -- real RTCPeerConnections, real DataChannels,
 * real wire -- and drives the NetLink protocol over it:
 *   - the handshake opens a data channel (no server, direct signaling),
 *   - the host's world snapshot crosses the wire (object count intact;
 *     application suppressed since both ends share the test page),
 *   - the host streams throttled transforms; the guest grows a ghost rig
 *     that glides to the streamed position,
 *   - close() says bye and the ghost is disposed,
 *   - no page errors along the way.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: true, shotDir: process.env.IIS_SHOT_DIR, port: 7093 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'l_counter']);
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

        // --- 1. A real loopback RTC pair, NetLinks on both ends ---
        const wire = await h.evaluate(() => new Promise(async (resolve) => {
            const app = window.app;
            // Local-only pair: host candidates suffice for loopback, and
            // skipping STUN keeps gathering instant in offline CI.
            const pc1 = new RTCPeerConnection();
            const pc2 = new RTCPeerConnection();
            pc1.onicecandidate = (e) => { if (e.candidate) pc2.addIceCandidate(e.candidate); };
            pc2.onicecandidate = (e) => { if (e.candidate) pc1.addIceCandidate(e.candidate); };
            const ch1 = pc1.createDataChannel('iis');
            const guestReady = new Promise((res) => {
                pc2.ondatachannel = (ev) => {
                    const ch2 = ev.channel;
                    ch2.onopen = () => res(ch2);
                };
            });
            await pc1.setLocalDescription(await pc1.createOffer());
            await pc2.setRemoteDescription(pc1.localDescription);
            await pc2.setLocalDescription(await pc2.createAnswer());
            await pc1.setRemoteDescription(pc2.localDescription);
            const hostOpen = new Promise((res) => { ch1.onopen = () => res(); });
            const ch2 = await guestReady;
            await hostOpen;
            const mk = (ch) => {
                const t = { send: (s) => ch.send(s), onMessage: null };
                ch.onmessage = (ev) => { if (t.onMessage) t.onMessage(ev.data); };
                return t;
            };
            // Both links share this page's app; the guest must not re-apply
            // the world it already lives in.
            window.__host = new NetLink(app, mk(ch1), true);
            window.__guest = new NetLink(app, mk(ch2), false, { applyWorld: false });
            window.__host.start();
            const expected = app.world.serialize().objects.length;
            // Give the snapshot a beat to cross the (local) wire.
            setTimeout(() => resolve({
                open: ch1.readyState === 'open' && ch2.readyState === 'open',
                expected,
                guestLog: window.__guest.log.slice(),
            }), 400);
        }));
        console.log('\n[1] wire', wire);
        check('a real loopback RTC pair opens (no server, direct signaling)', wire.open, wire);
        check('the world snapshot crosses the wire intact',
            wire.guestLog.length === 1 && wire.guestLog[0].t === 'world' &&
            wire.guestLog[0].objects === wire.expected, wire);

        // --- 2. Transform stream -> ghost glides to the host's position ---
        const ghost = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            app.net = window.__host;      // PlayMode streams the host side
            // Park the player away from the origin so the ghost (born at
            // 0,0,0) has a REAL glide to make, and run a fixed window so
            // the throttle count is meaningful.
            pm.player.position.addInPlace(new BABYLON.Vector3(7, 0.5, 5));
            let n = 0, converged = 0;
            const tick = () => {
                n++;
                window.__guest.tick(pm);  // the guest renders its ghost here
                const g = app.scene.getMeshByName('netGhost');
                if (g && converged === 0 &&
                    BABYLON.Vector3.Distance(g.position, pm.player.position) < 1) converged = n;
                if (n >= 90) {
                    return resolve({
                        ghost: !!g,
                        dist: g ? Math.round(BABYLON.Vector3.Distance(g.position, pm.player.position) * 100) / 100 : null,
                        converged,
                        sent: window.__host.sent,
                        frames: n,
                    });
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        console.log('[2] ghost', ghost);
        check('the ghost rig appears and glides to the streamed position',
            ghost.ghost && ghost.dist !== null && ghost.dist < 1, ghost);
        check('transforms are throttled (~1 per 6 frames, not per frame)',
            ghost.sent >= 5 && ghost.sent <= Math.ceil(ghost.frames / 6) + 3, ghost);
        await h.screenshot('net-ghost');

        // --- 3. Goodbye disposes the ghost ---
        await h.evaluate(() => { window.__host.close(); });
        await h.waitFor(() => !window.app.scene.getMeshByName('netGhost') &&
            window.__guest.log.some((l) => l.t === 'bye'), null, 20000);
        console.log('[3] bye');
        check('close() says bye across the wire and the ghost is disposed', true);
        await h.evaluate(() => { window.app.net = null; });

        // --- 4. No unexpected page errors ---
        const realErrors = h.pageErrors.filter((e) => !h._isExpectedError(e));
        check('no page errors during netplay', realErrors.length === 0, realErrors.slice(0, 3));

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — a real WebRTC wire carries the world, the ghost, and the goodbye.'
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
