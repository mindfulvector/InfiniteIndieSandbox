// GhostKartScript
// ---------------
// An AI rival: a translucent kart that races a wired path chain forever.
// Wire its `follow` output to the first l_pathnode (the same topology the
// moving platform and patrols use, resolved by the shared
// App.resolvePathChain so all followers traverse identically). It laps the
// circuit at its configured speed, faces its travel direction, and fires
// `lapped` every time it wraps back to the first node -- wire that to a
// scoreboard to keep score against the ghost.
//
// Ghosts are intangible (no collisions, ~half visibility): they are pace
// setters, not obstacles. onPlayReset puts them back on the grid.
class GhostKartScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'speed', label: 'Speed', type: 'number', options: [4, 6, 8], default: 6 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'follow', label: 'Race Path From' },
            { id: 'lapped', label: 'Lap Completed' },
        ];

        this._home = null;
        this._path = null;
        this._idx = 0;
        this._wasPlay = null;
        this._ghosted = false;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    // Half-visible and intangible, root and children alike.
    _applyGhostLook() {
        if (this._ghosted) return;
        this._ghosted = true;
        const all = [this.inst].concat(this.inst.getChildMeshes ? this.inst.getChildMeshes() : []);
        all.forEach((m) => {
            if (m.visibility !== undefined) m.visibility = 0.55;
            m.checkCollisions = false;
            m.isPickable = false;
        });
    }

    _startRun() {
        const chain = this.app.resolvePathChain(this.inst, 'follow');
        this._path = chain.points;
        this._idx = 0;
        if (this._path.length) {
            this.inst.position.copyFrom(this._path[0]);
            if (this._path.length > 1) this._idx = 1;
        } else if (this._home) {
            this.inst.position.copyFrom(this._home);
        }
    }

    onPlayReset(mode) { this._startRun(); }

    update(isPlayMode, mode) {
        const inst = this.inst;
        this._applyGhostLook();
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
            }
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
            this._startRun();
            return;
        }
        if (!this._path || this._path.length < 2) return;

        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        const step = (this.getParam('speed') || 6) * dt;
        const target = this._path[this._idx];
        const to = target.subtract(inst.position);
        const dist = to.length();
        if (dist <= step) {
            inst.position.copyFrom(target);
            const wrapped = (this._idx === 0 && this._path.length > 1);
            this._idx = (this._idx + 1) % this._path.length;
            if (wrapped) this.app.fireEvent(inst, 'lapped');
        } else {
            const dir = to.scale(1 / dist);
            inst.position.addInPlace(dir.scale(step));
            if (Math.abs(dir.x) > 0.001 || Math.abs(dir.z) > 0.001) {
                inst.rotationQuaternion = null;
                inst.rotation.y = Math.atan2(dir.x, dir.z);
            }
        }
    }
}
