// NetLink — the online co-op exploration spike.
// ----------------------------------------------
// A tiny sync protocol over a pluggable transport ({send(str)} +
// .onMessage), so the protocol tests run over REAL WebRTC loopback pairs
// and the game runs over manually-signaled RTCDataChannels: no server, no
// dependencies -- the host copies an offer code to a friend, pastes back
// their answer, and the channel opens (console/API level for the spike:
// app.netCreateOffer / netAcceptOffer / netFinish).
//
// Protocol (JSON lines):
//   {t:'world', data, name}  host -> guest once on open: the whole world
//   {t:'tf', p:[x,y,z], ry}  ~10Hz transform stream, both directions
//   {t:'bye'}                clean disconnect
// The remote player renders as a lerped GHOST rig (no physics -- positions
// come from the wire; smoothing hides the packet cadence).
class NetLink {
    constructor(app, transport, isHost, opts) {
        this.app = app;
        this.transport = transport;
        this.isHost = !!isHost;
        this.applyWorld = !(opts && opts.applyWorld === false);
        this.log = [];            // received message summaries (tests read this)
        this.sent = 0;            // tf messages sent (throttle assertions)
        this.ghostTargets = {};   // who -> latest remote transform
        this.ghosts = {};         // who -> ghost rig
        this.selfId = isHost ? 'host' : null;   // guests learn theirs via welcome
        this.onRelay = null;      // hub hook: host relays guest traffic
        this.remoteIds = {};      // 'wo#remoteId' -> local instance (edit stream)
        this._sendTimer = 0;
        this.closed = false;
        transport.onMessage = (raw) => this._recv(raw);
    }

    start() {
        if (this.isHost && this.app.world) {
            // Assign the guest their player id, then ship the world.
            this.peerId = this.peerId || 'g1';
            this.transport.send(JSON.stringify({ t: 'welcome', you: this.peerId }));
            const data = this.app.world.serialize();
            this.transport.send(JSON.stringify({ t: 'world', data: data, name: 'shared' }));
        }
    }

    // ---- live edit streaming (BuildMode hooks call these) -----------------
    sendAdd(inst) {
        if (this.closed || !inst || !inst.worldObject) return;
        try {
            this.transport.send(JSON.stringify({
                t: 'add', wo: inst.worldObject.name, id: inst.worldId,
                po: { x: inst.position.x, y: inst.position.y, z: inst.position.z },
                ro: inst.rotationQuaternion || undefined,
                sc: inst.scaling || undefined,
                pr: inst.params || undefined,
            }));
        } catch (e) { /* channel closing */ }
    }

    sendDel(inst) {
        if (this.closed || !inst || !inst.worldObject) return;
        try {
            this.transport.send(JSON.stringify({
                t: 'del', wo: inst.worldObject.name, id: inst.worldId }));
        } catch (e) { /* channel closing */ }
    }

    sendWire(op, src, event, toWo, toId, action) {
        if (this.closed || !src || !src.worldObject) return;
        try {
            this.transport.send(JSON.stringify({
                t: 'wire', op: op, srcWo: src.worldObject.name, srcId: src.worldId,
                event: event, toWo: toWo, toId: toId, action: action }));
        } catch (e) { /* channel closing */ }
    }

    // Resolve a remote (wo, id) endpoint locally: streamed objects live in
    // the remote-id map (fresh local ids); snapshot-era objects kept their
    // ids on both sides, so findInstance covers them.
    _resolveRemote(wo, id) {
        return this.remoteIds[wo + '#' + id] || this.app.findInstance(wo, id) || null;
    }

    // The link DIED (channel closed / connection failed) rather than being
    // ended politely: tear down render state and tell the player how to
    // re-link. WebRTC links aren't resumable without a server -- reconnect
    // means trading fresh codes, and the host's start() re-ships the world.
    _dropped() {
        if (this.closed) return;
        this.closed = true;
        this._disposeGhost();
        this.remoteIds = {};
        this.dropped = true;
        this.app.toasty('Connection lost — open Online Co-op to re-link.');
    }

    close() {
        if (this.closed) return;
        try { this.transport.send(JSON.stringify({ t: 'bye' })); } catch (e) { /* gone */ }
        this._disposeGhost();
        this.closed = true;
    }

    _recv(raw) {
        let msg = null;
        try { msg = JSON.parse(raw); } catch (e) { return; }
        // Star topology: the host relays guest traffic to the other guests
        // (the hub sets onRelay; tf/add/del/wire fan out, world/welcome not).
        if (this.onRelay && (msg.t === 'tf' || msg.t === 'add' || msg.t === 'del' || msg.t === 'wire')) {
            this.onRelay(this, raw);
        }
        if (msg.t === 'welcome') {
            this.selfId = msg.you;
            this.log.push({ t: 'welcome', you: msg.you });
        } else if (msg.t === 'world') {
            this.log.push({ t: 'world', objects: msg.data.objects.length });
            // A guest sitting at the fresh main menu has no world yet --
            // create one to receive into (same as the Load path does).
            if (this.applyWorld && !this.app.world && typeof SandboxWorld !== 'undefined') {
                this.app.world = new SandboxWorld(this.app);
            }
            if (this.applyWorld && this.app.world) {
                this.app.world.loadFromData(msg.data);
                this.app.toasty('Joined the shared world!');
                // The guest lands straight in play mode beside the host.
                if (this.app.goto_playMode &&
                    (!this.app.activeMode ||
                     this.app.activeMode.constructor.name !== 'PlayMode')) {
                    this.app.goto_playMode();
                }
            }
        } else if (msg.t === 'add') {
            // A remote edit: create locally with a FRESH id (both sides mint
            // ids independently; the map below keys deletions instead).
            this.log.push({ t: 'add', wo: msg.wo });
            const wo = this.app.findWorldObject(msg.wo);
            if (wo) {
                const inst = wo.createInstance({ wo: msg.wo, po: msg.po,
                    ro: msg.ro, sc: msg.sc, pr: msg.pr });
                if (inst) this.remoteIds[msg.wo + '#' + msg.id] = inst;
            }
        } else if (msg.t === 'del') {
            this.log.push({ t: 'del', wo: msg.wo });
            const key = msg.wo + '#' + msg.id;
            const inst = this.remoteIds[key];
            if (inst) {
                delete this.remoteIds[key];
                const wo = this.app.findWorldObject(msg.wo);
                if (wo) wo.disposeInstance(inst);
            }
        } else if (msg.t === 'wire') {
            this.log.push({ t: 'wire', op: msg.op });
            const src = this._resolveRemote(msg.srcWo, msg.srcId);
            const dst = this._resolveRemote(msg.toWo, msg.toId);
            if (src && dst) {
                this.app._netMute = true;   // never echo a remote apply back
                try {
                    if (msg.op === 'add') {
                        this.app.addWire(src, msg.event, msg.toWo, dst.worldId, msg.action);
                    } else {
                        this.app.removeWire(src, msg.event, msg.toWo, dst.worldId, msg.action);
                    }
                } finally { this.app._netMute = false; }
            }
        } else if (msg.t === 'tf') {
            this.ghostTargets[msg.who || 'peer'] = { p: msg.p, ry: msg.ry };
        } else if (msg.t === 'bye') {
            this.log.push({ t: 'bye' });
            this._disposeGhost();
            this.closed = true;
        }
    }

    _ghostTint(who) {
        const palette = { host: [0.4, 0.9, 1.0], g1: [0.4, 1.0, 0.55], g2: [1.0, 0.65, 0.3], g3: [0.8, 0.5, 1.0] };
        const c = palette[who] || [0.9, 0.9, 0.5];
        return new BABYLON.Color3(c[0], c[1], c[2]);
    }

    _ensureGhost(mode, who) {
        if (this.ghosts[who] || !mode || !mode.enemyManager) return;
        const root = BABYLON.MeshBuilder.CreateBox('netGhost_' + who,
            { width: 0.5, height: 0.2, depth: 0.5 }, this.app.scene);
        root.isVisible = false;
        root.checkCollisions = false;
        const parts = mode.enemyManager.buildBipedal(root, this._ghostTint(who));
        (root.getChildMeshes ? root.getChildMeshes() : []).forEach((m) => {
            m.checkCollisions = false;
            m.isPickable = false;
        });
        this.ghosts[who] = { root, parts, walkPhase: 0 };
    }

    _disposeGhost() {
        Object.keys(this.ghosts).forEach((k) => this.ghosts[k].root.dispose(false, false));
        this.ghosts = {};
    }

    get ghost() {   // legacy single-ghost accessor (PlayMode teardown checks it)
        const k = Object.keys(this.ghosts)[0];
        return k ? this.ghosts[k] : null;
    }

    // Called from PlayMode.update each frame: stream our transform out on a
    // cadence and glide the ghost toward the latest remote transform.
    tick(mode) {
        if (this.closed || !mode || !mode.player) return;
        if (--this._sendTimer <= 0) {
            this._sendTimer = 6;   // ~10Hz at 60fps; cadence, not correctness
            const p = mode.player.position;
            const ry = mode.player.rotationQuaternion
                ? mode.player.rotationQuaternion.toEulerAngles().y
                : (mode.player.rotation ? mode.player.rotation.y : 0);
            try {
                this.transport.send(JSON.stringify({
                    t: 'tf', who: this.selfId || 'peer',
                    p: [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100,
                        Math.round(p.z * 100) / 100], ry: Math.round(ry * 100) / 100 }));
                this.sent++;
            } catch (e) { /* channel closing */ }
        }
        Object.keys(this.ghostTargets).forEach((who) => {
            this._ensureGhost(mode, who);
            const rig = this.ghosts[who];
            if (rig) {
                const g = rig.root;
                const t = this.ghostTargets[who];
                const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
                const target = new BABYLON.Vector3(t.p[0], t.p[1], t.p[2]);
                const before = g.position.clone();
                g.position = BABYLON.Vector3.Lerp(g.position, target, Math.min(1, 8 * dt));
                g.rotation.y += (t.ry - g.rotation.y) * Math.min(1, 8 * dt);
                // Leg swing scaled by actual glide speed, so the ghost walks
                // when its player walks and stands when they stand.
                const speed = BABYLON.Vector3.Distance(before, g.position) / Math.max(dt, 0.001);
                if (speed > 0.5) rig.walkPhase += 0.24; else rig.walkPhase *= 0.8;
                const sw = Math.sin(rig.walkPhase) * 0.5;
                rig.parts.leftHip.rotation.x = sw;
                rig.parts.rightHip.rotation.x = -sw;
                rig.parts.leftSh.rotation.x = -sw * 0.8;
                rig.parts.rightSh.rotation.x = sw * 0.8;
            }
        });
    }
}

// The host's hub: one NetLink per guest, relaying guest traffic to every
// other guest (star topology -- serverless WebRTC can't mesh without a
// signaling server, but a star needs only the codes the host already trades).
class NetHub {
    constructor(app) {
        this.app = app;
        this.links = [];
        this.isHost = true;
        this.dropped = false;
    }
    get closed() { return this.links.length > 0 && this.links.every((l) => l.closed); }
    addLink(link) {
        link.peerId = 'g' + (this.links.length + 1);
        link.onRelay = (from, raw) => {
            this.links.forEach((l) => {
                if (l !== from && !l.closed) {
                    try { l.transport.send(raw); } catch (e) { /* closing */ }
                }
            });
        };
        this.links.push(link);
    }
    tick(mode) { this.links.forEach((l) => l.tick(mode)); }
    close() { this.links.forEach((l) => l.close()); }
    get ghost() { const l = this.links.find((x) => x.ghost); return l ? l.ghost : null; }
    _disposeGhost() { this.links.forEach((l) => l._disposeGhost()); }
}

// ---- WebRTC glue (manual signaling; spike-level API) -----------------------
// Host:  const offer = await app.netCreateOffer();      // send to a friend
//        await app.netFinish(answerFromFriend);
// Guest: const answer = await app.netAcceptOffer(offer); // send back
// Both sides end with app.net live over the open data channel.
const NetRtc = {
    _wrap(app, pc, channel, isHost) {
        const transport = { send: (s) => channel.send(s), onMessage: null };
        channel.onmessage = (ev) => { if (transport.onMessage) transport.onMessage(ev.data); };
        const link = new NetLink(app, transport, isHost);
        if (isHost) {
            // Hosts collect links in a hub (star topology, N guests).
            if (!(app.net instanceof NetHub)) {
                const hub = new NetHub(app);
                if (app.net && !app.net.closed && app.net instanceof NetLink) hub.addLink(app.net);
                app.net = hub;
            }
            app.net.addLink(link);
        } else {
            app.net = link;
        }
        channel.onopen = () => { link.start(); app.toasty(isHost ? 'Friend connected!' : 'Connected to host!'); };
        channel.onclose = () => link._dropped();
        channel.onerror = () => link._dropped();
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') link._dropped();
        };
        app._netPc = pc;
        return link;
    },
    // Resolve the local description AFTER ICE gathering so the single
    // copy-paste blob carries the candidates too (no trickle channel).
    _gathered(pc) {
        return new Promise((resolve) => {
            if (pc.iceGatheringState === 'complete') return resolve();
            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') resolve();
            };
        });
    },
};
