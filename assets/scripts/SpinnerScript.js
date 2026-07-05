// SpinnerScript
// -------------
// t_spinner: a rotating platform -- a solid disc that spins continuously and
// CARRIES its rider AROUND the pivot as it turns (the conveyor drifts you in
// a line, the sweeper oscillates, a moving platform follows a path; this one
// orbits you). Stand near the rim and you swing wide; stand at the hub and
// you barely move -- a genuinely different ride. Rider carry goes through
// moveWithCollisions so walls still stop you. Params: spin speed + direction.
// Fires `spun` once per full revolution. Resets its angle on a play reset.
class SpinnerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'speed', label: 'Spin speed', type: 'number', options: [0.5, 1, 2], default: 1 },
            { key: 'dir',   label: 'Direction',  type: 'enum',   options: ['cw', 'ccw'], default: 'cw' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'on',  label: 'Switch On' },
            { id: 'off', label: 'Switch Off' },
        ];
        this.outputs = [
            { id: 'spun', label: 'Full Turn' },
        ];

        this._active = null;
        this._angle = 0;
        this._home = null;
        this._baseRotY = 0;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) {
        if (action === 'on') this._active = true;
        else if (action === 'off') this._active = false;
    }

    onPlayReset(mode) {
        this._active = true;
        this._angle = 0;
        if (this._home) this.inst.position.copyFrom(this._home);
        this.inst.rotation.y = this._baseRotY;
    }

    _onTop(player) {
        this.inst.computeWorldMatrix(true);
        const bb = this.inst.getBoundingInfo().boundingBox;
        const mn = bb.minimumWorld, mx = bb.maximumWorld;
        const p = player.position;
        return p.x > mn.x && p.x < mx.x && p.z > mn.z && p.z < mx.z &&
            p.y >= mx.y - 0.5 && p.y <= mx.y + 0.9;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        inst.isVisible = true; inst.checkCollisions = true;
        if (!isPlayMode) {
            inst.isPickable = true;
            this._home = inst.position.clone();
            this._baseRotY = inst.rotation.y;
            this._angle = 0;
            return;
        }
        inst.isPickable = false;
        if (this._active === null) this._active = true;
        if (!this._active) return;
        if (!this._home) { this._home = inst.position.clone(); this._baseRotY = inst.rotation.y; }

        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        const sign = this.getParam('dir') === 'ccw' ? 1 : -1;
        const d = sign * (this.getParam('speed') || 1) * dt;

        // Carry a rider BEFORE spinning the disc: rotate their offset from the
        // pivot by the same angle, and move them by that delta (walls stop it).
        const player = mode && mode.player;
        if (player && !mode.driving && this._onTop(player)) {
            const c = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
            const ox = player.position.x - c.x, oz = player.position.z - c.z;
            const cs = Math.cos(d), sn = Math.sin(d);
            const nx = ox * cs - oz * sn, nz = ox * sn + oz * cs;
            player.moveWithCollisions(new BABYLON.Vector3(nx - ox, 0, nz - oz));
        }

        // Spin the disc visually and track full revolutions.
        inst.rotation.y += d;
        const prev = this._angle;
        this._angle += Math.abs(d);
        if (Math.floor(prev / (Math.PI * 2)) !== Math.floor(this._angle / (Math.PI * 2))) {
            this.app.fireEvent(inst, 'spun');
        }
    }
}
