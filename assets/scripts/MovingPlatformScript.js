// MovingPlatformScript
// --------------------
// A platform that travels along a chain of path nodes in play mode. Wire the
// platform's `follow` output to the FIRST l_pathnode's `chain` input, then
// chain nodes with their `next` outputs. Movement is dt-based (units/second)
// so it is identical at any frame rate.
//
//   params:  speed (units/s), mode (loop / pingpong / once),
//            autoStart (start moving when the play session starts)
//   inputs:  start / stop / reset
//   outputs: follow    (topology: points at the first path node),
//            arrived   (fired at every node reached),
//            completed (fired once at the path's end in `once` mode)
//
// Riders are pushed by the platform's collision box but are NOT carried with
// it (the character controller owns the player's position) -- design moving
// floors as sweepers/barriers/elevated routes rather than passenger ferries
// for now. The placed (build-mode) position is the home pose: inst.restPos
// keeps saves clean while the platform is mid-route, and returning to build
// mode or a play reset puts it back.
class MovingPlatformScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'speed',     label: 'Speed',      type: 'number', options: [1, 2, 3, 5], default: 2 },
            { key: 'mode',      label: 'Path mode',  type: 'enum',   options: ['loop', 'pingpong', 'once'], default: 'loop' },
            { key: 'autoStart', label: 'Auto start', type: 'enum',   options: ['yes', 'no'], default: 'yes' },
        ];
        this.eventDefs = [];
        this.inputs = [
            { id: 'start', label: 'Start' },
            { id: 'stop',  label: 'Stop' },
            { id: 'reset', label: 'Reset' },
        ];
        this.outputs = [
            { id: 'follow',    label: 'Follow Path From' },
            { id: 'arrived',   label: 'Arrived At Node' },
            { id: 'completed', label: 'Path Completed' },
        ];

        this._home = null;      // placed transform (captured in build mode)
        this._path = null;      // resolved [{x,y,z}] node positions
        this._closed = false;   // last node chains back to the first
        this._idx = 0;          // index of the node we are travelling TOWARD
        this._dir = 1;          // pingpong direction
        this._moving = false;
        this._done = false;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) {
        if (action === 'start') { if (!this._done) this._moving = true; }
        else if (action === 'stop') this._moving = false;
        else if (action === 'reset') this._resetRun();
    }

    onPlayReset(mode) { this._resetRun(); }

    // Walk the wires into an ordered list of node positions. Stops when a node
    // repeats (that also detects a closed circuit) or the chain ends.
    _resolvePath() {
        const first = (this.inst.wires || []).find((w) => w.event === 'follow');
        const nodes = [];
        const seen = new Set();
        let node = first ? this.app.findInstance(first.toWo, first.toId) : null;
        while (node && !node.isDisposed() && !seen.has(node)) {
            seen.add(node);
            nodes.push(node);
            node = (node.script && node.script.nextNode) ? node.script.nextNode() : null;
        }
        this._closed = !!(node && seen.has(node) && nodes.length > 1 && node === nodes[0]);
        this._path = nodes.map((n) => n.position.clone());
    }

    _resetRun() {
        this._resolvePath();
        this._idx = 0;
        this._dir = 1;
        this._done = false;
        this._moving = this.getParam('autoStart') === 'yes';
        if (this._path && this._path.length) {
            this.inst.position.copyFrom(this._path[0]);
            this._idx = Math.min(1, this._path.length - 1);
        } else if (this._home) {
            this.inst.position.copyFrom(this._home);
        }
    }

    // Pick the next target index after arriving at this._idx.
    _advance() {
        const n = this._path.length;
        const mode = this.getParam('mode');
        if (mode === 'loop') {
            this._idx = (this._idx + 1) % n;
        } else if (mode === 'pingpong') {
            if (this._idx + this._dir >= n || this._idx + this._dir < 0) this._dir = -this._dir;
            this._idx += this._dir;
        } else {   // once
            if (this._idx >= n - 1) {
                this._moving = false;
                this._done = true;
                this.app.fireEvent(this.inst, 'completed');
            } else {
                this._idx += 1;
            }
        }
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                // Coming back from play: return to the placed pose.
                if (this._home) inst.position.copyFrom(this._home);
            }
            // The build-mode pose IS home; keep it fresh so moving the object
            // in build mode moves its home too. restPos keeps saves clean if
            // the world is saved while the platform is mid-route in play.
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
            this._resetRun();
            return;
        }
        if (!this._moving || !this._path || this._path.length < 2) return;

        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        const step = (this.getParam('speed') || 2) * dt;
        const target = this._path[this._idx];
        const to = target.subtract(inst.position);
        const dist = to.length();
        if (dist <= step) {
            inst.position.copyFrom(target);
            this.app.fireEvent(inst, 'arrived');
            this._advance();
        } else {
            inst.position.addInPlace(to.scale(step / dist));
        }
    }
}
