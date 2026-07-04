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
        check('the world snapshot crosses the wire intact (after the welcome)',
            wire.guestLog.some((l) => l.t === 'welcome') &&
            wire.guestLog.some((l) => l.t === 'world' && l.objects === wire.expected), wire);

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
                const g = app.scene.meshes.find((m) => m.name.indexOf('netGhost') === 0);
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

        // --- 2b. Live edit streaming across the wire ---
        const edits = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app;
            const before = app.findWorldObject('l_counter').instances.filter(Boolean).length;
            // Simulate the host's BuildMode placement commit.
            const placed = app.findWorldObject('l_counter').createInstance();
            placed.position = new BABYLON.Vector3(5, 4, 5);
            placed.params.threshold = 7;
            window.__host.sendAdd(placed);
            setTimeout(() => {
                const midway = app.findWorldObject('l_counter').instances.filter(Boolean).length;
                const remote = window.__guest.remoteIds['l_counter#' + placed.worldId];
                const remoteOk = remote && remote !== placed &&
                    Math.abs(remote.position.x - 5) < 0.01 &&
                    remote.params && remote.params.threshold === 7;
                window.__host.sendDel(placed);
                setTimeout(() => {
                    const after = app.findWorldObject('l_counter').instances.filter(Boolean).length;
                    resolve({ before, midway, after,
                        remoteOk: !!remoteOk,
                        addLogged: window.__guest.log.some((l) => l.t === 'add'),
                        delLogged: window.__guest.log.some((l) => l.t === 'del'),
                        mapCleared: !window.__guest.remoteIds['l_counter#' + placed.worldId] });
                }, 300);
            }, 300);
        }));
        console.log('[2b] edits', edits);
        check('a placed object crosses the wire (fresh local id, params intact)',
            edits.remoteOk && edits.midway === edits.before + 2 && edits.addLogged, edits);
        check('a deletion crosses the wire and clears the remote mapping',
            edits.after === edits.midway - 1 && edits.delLogged && edits.mapCleared, edits);

        // --- 2c. Wire streaming with remote-id resolution ---
        const wires = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app;
            // Stream TWO placements host->guest, then wire them by the
            // HOST's ids: the guest must resolve both endpoints to ITS
            // fresh-id copies and land the wire there.
            const a = app.findWorldObject('l_trigger').createInstance();
            a.position = new BABYLON.Vector3(9, 4, 9);
            const b = app.findWorldObject('l_spawner').createInstance();
            b.position = new BABYLON.Vector3(11, 4, 9);
            window.__host.sendAdd(a);
            window.__host.sendAdd(b);
            setTimeout(() => {
                app.net = window.__host;   // hooks stream the HOST side
                app.addWire(a, 'entered', 'l_spawner', b.worldId, 'spawn');
                setTimeout(() => {
                    const ga = window.__guest.remoteIds['l_trigger#' + a.worldId];
                    const gb = window.__guest.remoteIds['l_spawner#' + b.worldId];
                    const landed = ga && gb && ga.wires && ga.wires.length === 1 &&
                        ga.wires[0].toId === gb.worldId && ga.wires[0].action === 'spawn';
                    const distinct = ga !== a && (!ga || ga.wires !== a.wires);
                    const echo = window.__host.log.some((l) => l.t === 'wire');
                    app.removeWire(a, 'entered', 'l_spawner', b.worldId, 'spawn');
                    setTimeout(() => {
                        resolve({ landed: !!landed, distinct, echo,
                            removedRemotely: ga ? ga.wires.length === 0 : false,
                            hostWires: a.wires.length });
                    }, 300);
                }, 300);
            }, 300);
        }));
        console.log('[2c] wires', wires);
        check('a wire streams and resolves to the guest\'s own copies',
            wires.landed && wires.distinct, wires);
        check('wire removal streams too, and the apply never echoes back',
            wires.removedRemotely && wires.hostWires === 0 && !wires.echo, wires);

        // --- 3. Goodbye disposes the ghost ---
        await h.evaluate(() => { window.__host.close(); });
        await h.waitFor(() => !window.app.scene.meshes.find((m) => m.name.indexOf('netGhost') === 0) &&
            window.__guest.log.some((l) => l.t === 'bye'), null, 20000);
        console.log('[3] bye');
        check('close() says bye across the wire and the ghost is disposed', true);
        await h.evaluate(() => { window.app.net = null; });

        // --- 3b. A dropped link tears down and flags reconnect ---
        const drop = await h.evaluate(() => {
            const app = window.app;
            const t = { send: () => {}, onMessage: null };
            const link = new NetLink(app, t, true);
            link.remoteIds['x#1'] = {};
            link.ghostTargets['x'] = { p: [0, 1, 0], ry: 0 };
            link.tick(app.activeMode);            // grows a ghost
            const hadGhost = !!app.scene.meshes.find((m) => m.name.indexOf('netGhost') === 0);
            link._dropped();
            app.net = link;
            return {
                hadGhost,
                ghostGone: !app.scene.meshes.find((m) => m.name.indexOf('netGhost') === 0),
                mapCleared: Object.keys(link.remoteIds).length === 0,
                closed: link.closed, dropped: link.dropped,
            };
        });
        console.log('[3b] drop', drop);
        check('a dropped link disposes its ghost, clears its map, and flags reconnect',
            drop.hadGhost && drop.ghostGone && drop.mapCleared && drop.closed && drop.dropped, drop);

        // --- 3c. Mode switch never strands a frozen ghost ---
        const strand = await h.evaluate(() => {
            const app = window.app;
            const t = { send: () => {}, onMessage: null };
            const link = new NetLink(app, t, true);
            app.net = link;
            link.ghostTargets['x'] = { p: [2, 1, 2], ry: 0 };
            link.tick(app.activeMode);
            const before = !!app.scene.meshes.find((m) => m.name.indexOf('netGhost') === 0);
            app.goto_buildMode();
            return { before, after: !!app.scene.meshes.find((m) => m.name.indexOf('netGhost') === 0) };
        });
        await h.evaluate(() => { window.app.net = null; window.app.goto_playMode(); });
        await h.waitFor(() => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode', null, 20000);
        console.log('[3c] strand', strand);
        check('switching to build mode disposes the net ghost (no frozen stray)',
            strand.before && !strand.after, strand);

        // --- 3d. Three players: the host's hub relays guest traffic ---
        const star = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app;
            // Two fake pipes host<->g1 and host<->g2 (the RTC wire itself is
            // proven above; the star logic is transport-agnostic).
            const pipe = () => {
                const a = { send: null, onMessage: null }, b = { send: null, onMessage: null };
                a.send = (s) => { if (b.onMessage) b.onMessage(s); };
                b.send = (s) => { if (a.onMessage) a.onMessage(s); };
                return [a, b];
            };
            const [h1, g1t] = pipe();
            const [h2, g2t] = pipe();
            const hub = new NetHub(app);
            const hl1 = new NetLink(app, h1, true);
            const hl2 = new NetLink(app, h2, true);
            hub.addLink(hl1);
            hub.addLink(hl2);
            const guest1 = new NetLink(app, g1t, false, { applyWorld: false });
            const guest2 = new NetLink(app, g2t, false, { applyWorld: false });
            hl1.start(); hl2.start();
            // guest1 speaks: a transform + a placement.
            guest1.transport.send(JSON.stringify({ t: 'tf', who: guest1.selfId, p: [3, 1, 3], ry: 0 }));
            const c = app.findWorldObject('l_counter').createInstance();
            c.position = new BABYLON.Vector3(4, 4, 4);
            guest1.sendAdd(c);
            setTimeout(() => {
                resolve({
                    ids: [guest1.selfId, guest2.selfId],
                    hostSaw: !!hub.links[0].ghostTargets['g1'],
                    relayedTf: !!guest2.ghostTargets['g1'],
                    relayedAdd: guest2.log.some((l) => l.t === 'add'),
                    tints: ['g1', 'g2'].map((w) => guest1._ghostTint(w).r),
                });
            }, 300);
        }));
        console.log('[3d] star', star);
        check('the host welcomes guests with distinct player ids',
            star.ids[0] === 'g1' && star.ids[1] === 'g2', star);
        check('guest traffic reaches the host AND relays to the other guest',
            star.hostSaw && star.relayedTf && star.relayedAdd, star);

        // --- 3e. Ghost name tags in the player's tint ---
        const tags = await h.evaluate(() => new Promise((resolve) => {
            const app = window.app, pm = app.activeMode;
            const t = { send: () => {}, onMessage: null };
            const link = new NetLink(app, t, true);
            link.ghostTargets['g2'] = { p: [1, 1, 1], ry: 0 };
            link.tick(pm);
            const tag = app.scene.getMeshByName('netTag_g2');
            const out = { tag: !!tag, billboard: tag && tag.billboardMode === BABYLON.Mesh.BILLBOARDMODE_ALL };
            link._disposeGhost();
            out.gone = !app.scene.getMeshByName('netTag_g2');
            resolve(out);
        }));
        console.log('[3e] tags', tags);
        check('ghosts wear billboard name tags that dispose with them',
            tags.tag && tags.billboard && tags.gone, tags);

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
