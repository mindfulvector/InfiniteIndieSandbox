// CrumbleScript
// -------------
// t_crumble: a crumbling platform. Stand on it and a short FUSE starts --
// it shakes as a warning, then COLLAPSES (goes intangible + invisible) so
// you drop through, forcing you to keep moving. After a respawn delay it
// reforms, so a route stays replayable in a single run. A play reset snaps
// it back to solid. Fires `collapsed` when it drops and `reformed` when it
// returns. States: solid -> fusing -> gone -> (respawn) -> solid.
class CrumbleScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'fuse',    label: 'Fuse',    type: 'number', options: [15, 30, 45], default: 30, unit: 'f' },
            { key: 'respawn', label: 'Reforms', type: 'number', options: [60, 120, 999], default: 120, unit: 'f' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'collapsed', label: 'Collapsed' },
            { id: 'reformed',  label: 'Reformed' },
        ];

        this._state = 'solid';   // solid | fusing | gone
        this._t = 0;
        this._home = null;
        this._baseX = null;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _solidify() {
        const inst = this.inst;
        inst.isVisible = true; inst.visibility = 1; inst.checkCollisions = true;
        this._state = 'solid'; this._t = 0;
        if (this._baseX != null) inst.position.x = this._baseX;
    }

    onPlayReset(mode) {
        if (this._home) this.inst.position.copyFrom(this._home);
        this._baseX = this.inst.position.x;
        this._solidify();
    }

    _onTop(player) {
        this.inst.computeWorldMatrix(true);
        const bb = this.inst.getBoundingInfo().boundingBox;
        const mn = bb.minimumWorld, mx = bb.maximumWorld;
        const p = player.position;
        return p.x > mn.x && p.x < mx.x && p.z > mn.z && p.z < mx.z &&
            p.y >= mx.y - 0.4 && p.y <= mx.y + 0.9;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
                this._solidify();
            }
            this._home = inst.position.clone();
            this._baseX = inst.position.x;
            inst.isVisible = true; inst.visibility = 1; inst.checkCollisions = true; inst.isPickable = true;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); }
            this._baseX = this._home.x;
            this._solidify();
        }
        inst.isPickable = false;

        const player = mode && mode.player;
        if (this._state === 'solid') {
            if (player && this._onTop(player)) {
                this._state = 'fusing';
                this._t = 0;
            }
        } else if (this._state === 'fusing') {
            this._t++;
            // Shake: jitter x around the base to telegraph the collapse.
            inst.position.x = this._baseX + Math.sin(this._t * 1.7) * 0.06;
            if (this._t >= (this.getParam('fuse') || 30)) {
                // Collapse: drop through.
                inst.position.x = this._baseX;
                inst.checkCollisions = false; inst.isVisible = false;
                this._state = 'gone'; this._t = 0;
                this.app.sound.play('break');
                this.app.fireEvent(inst, 'collapsed');
            }
        } else if (this._state === 'gone') {
            this._t++;
            if (this._t >= (this.getParam('respawn') || 120)) {
                this._solidify();
                this.app.sound.play('place');
                this.app.fireEvent(inst, 'reformed');
            }
        }
    }
}
