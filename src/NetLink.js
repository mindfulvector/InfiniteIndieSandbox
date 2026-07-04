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
        this.ghostTarget = null;  // latest remote transform
        this.ghost = null;
        this._sendTimer = 0;
        this.closed = false;
        transport.onMessage = (raw) => this._recv(raw);
    }

    start() {
        if (this.isHost && this.app.world) {
            const data = this.app.world.serialize();
            this.transport.send(JSON.stringify({ t: 'world', data: data, name: 'shared' }));
        }
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
        if (msg.t === 'world') {
            this.log.push({ t: 'world', objects: msg.data.objects.length });
            if (this.applyWorld && this.app.world) {
                this.app.world.loadFromData(msg.data);
                this.app.toasty('Joined the shared world!');
            }
        } else if (msg.t === 'tf') {
            this.ghostTarget = { p: msg.p, ry: msg.ry };
        } else if (msg.t === 'bye') {
            this.log.push({ t: 'bye' });
            this._disposeGhost();
            this.closed = true;
        }
    }

    _ensureGhost(mode) {
        if (this.ghost || !mode || !mode.enemyManager) return;
        const root = BABYLON.MeshBuilder.CreateBox('netGhost',
            { width: 0.5, height: 0.2, depth: 0.5 }, this.app.scene);
        root.isVisible = false;
        root.checkCollisions = false;
        const parts = mode.enemyManager.buildBipedal(root, new BABYLON.Color3(0.4, 0.9, 1.0));
        (root.getChildMeshes ? root.getChildMeshes() : []).forEach((m) => {
            m.checkCollisions = false;
            m.isPickable = false;
        });
        this.ghost = { root, parts, walkPhase: 0 };
    }

    _disposeGhost() {
        if (this.ghost) { this.ghost.root.dispose(false, false); this.ghost = null; }
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
                    t: 'tf', p: [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100,
                                 Math.round(p.z * 100) / 100], ry: Math.round(ry * 100) / 100 }));
                this.sent++;
            } catch (e) { /* channel closing */ }
        }
        if (this.ghostTarget) {
            this._ensureGhost(mode);
            if (this.ghost) {
                const g = this.ghost.root;
                const t = this.ghostTarget;
                const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
                const target = new BABYLON.Vector3(t.p[0], t.p[1], t.p[2]);
                const before = g.position.clone();
                g.position = BABYLON.Vector3.Lerp(g.position, target, Math.min(1, 8 * dt));
                g.rotation.y += (t.ry - g.rotation.y) * Math.min(1, 8 * dt);
                // Leg swing scaled by actual glide speed, so the ghost walks
                // when its player walks and stands when they stand.
                const speed = BABYLON.Vector3.Distance(before, g.position) / Math.max(dt, 0.001);
                if (speed > 0.5) this.ghost.walkPhase += 0.24; else this.ghost.walkPhase *= 0.8;
                const sw = Math.sin(this.ghost.walkPhase) * 0.5;
                this.ghost.parts.leftHip.rotation.x = sw;
                this.ghost.parts.rightHip.rotation.x = -sw;
                this.ghost.parts.leftSh.rotation.x = -sw * 0.8;
                this.ghost.parts.rightSh.rotation.x = sw * 0.8;
            }
        }
    }
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
        channel.onopen = () => { link.start(); app.toasty(isHost ? 'Friend connected!' : 'Connected to host!'); };
        app.net = link;
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
