// CheckpointScript
// ----------------
// l_checkpoint: a respawn flag. Touch it in play mode and it becomes your
// active respawn point -- die after that and you come back HERE instead of
// the world spawn. Only one checkpoint is active at a time (touching a new
// one takes over and lowers the others). The flag RAISES up its pole when
// active (a per-instance local offset, so it's instancing-safe -- no shared
// material toggling), and it fires `reached` once per activation for wiring
// (chime, counter, camera). Respawn persistence is the whole point, so a
// play reset does NOT clear the active checkpoint; only a fresh session
// (world load) recaptures the world spawn.
class CheckpointScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'radius', label: 'Reach radius', type: 'number', options: [2, 3, 4], default: 3 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'reached', label: 'Checkpoint Reached' },
        ];

        this._active = false;
        this._flag = null;
        this._raise = 0;      // 0 = flag down, 1 = flag up
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _flagMesh() {
        if (this._flag) return this._flag;
        const kids = this.inst.getChildMeshes ? this.inst.getChildMeshes() : [];
        this._flag = kids.find((m) => m.name && m.name.indexOf('flag') >= 0) || null;
        if (this._flag) this._flagBaseY = this._flag.position.y;
        return this._flag;
    }

    _activate(mode) {
        if (this._active) return;
        // Only one active checkpoint: lower every sibling first.
        (this.wo.instances || []).forEach((other) => {
            if (other && other.script && other.script !== this) other.script._active = false;
        });
        this._active = true;
        const p = this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position;
        mode.spawnPoint = p.add(new BABYLON.Vector3(0, 1.5, 0));
        this.app.sound.play('levelup');
        this.app.toasty('Checkpoint reached!');
        this.app.fireEvent(this.inst, 'reached');
    }

    onPlayReset(mode) {
        // Deliberately keep the active checkpoint through a death -- that is
        // the feature. (mode.spawnPoint already points here.)
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        const flag = this._flagMesh();
        if (isPlayMode && mode && mode.player && !this._active) {
            const p = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
            const d = BABYLON.Vector3.Distance(mode.player.position, p);
            if (d < (this.getParam('radius') || 3)) this._activate(mode);
        }
        if (!isPlayMode) this._active = false;   // build mode: flags start lowered

        // Ease the flag up (active) or down (inactive) along its pole.
        const target = this._active ? 1 : 0;
        this._raise += (target - this._raise) * 0.2;
        if (flag && this._flagBaseY != null) flag.position.y = this._flagBaseY + this._raise * 1.4;
    }
}
