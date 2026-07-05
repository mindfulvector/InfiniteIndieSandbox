// LockScript
// ---------
// pr_lock: a locked barrier for the key-and-lock mechanic. It's a SOLID,
// collidable wall until the player approaches holding the matching key
// (mode.keysHeld has its keyId) -- then it unlocks: the key is CONSUMED, the
// barrier goes intangible + invisible so you can pass, and it fires
// `unlocked`. A play reset re-locks it (solid again). Also openable by a
// wired `unlock` input (a master switch), which does not require a key.
class LockScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'keyId', label: 'Key ID', type: 'enum', options: ['gold', 'silver', 'bronze'], default: 'gold' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'unlock', label: 'Force Unlock' },
        ];
        this.outputs = [
            { id: 'unlocked', label: 'Unlocked' },
        ];

        this._open = false;
        this._wasPlay = null;
        this._wantForce = false;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) { if (action === 'unlock') this._wantForce = true; }

    onPlayReset(mode) {
        this._open = false;
        this._wantForce = false;
        this._setSolid(true);
    }

    _setSolid(solid) {
        this.inst.checkCollisions = solid;
        this.inst.isVisible = solid;
        this.inst.isPickable = solid;
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => {
            m.checkCollisions = solid;
            m.isVisible = solid;
        });
    }

    _unlock(mode) {
        if (this._open) return;
        this._open = true;
        this._setSolid(false);
        this.app.sound.play('purchase');
        this.app.toasty('Unlocked!');
        this.app.fireEvent(this.inst, 'unlocked');
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) { this._wasPlay = false; this._open = false; this._setSolid(true); }
            return;
        }
        if (this._wasPlay !== true) { this._wasPlay = true; this._open = false; this._setSolid(true); }
        if (this._open) return;

        // A wired force-unlock ignores the key requirement.
        if (this._wantForce) { this._unlock(mode); return; }

        const player = mode && mode.player;
        if (!player) return;
        const p = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
        const near = BABYLON.Vector3.Distance(player.position, p) < 2.4;
        if (near && mode.keysHeld && mode.keysHeld.has(this.getParam('keyId'))) {
            mode.keysHeld.delete(this.getParam('keyId'));   // consume the key
            this._unlock(mode);
        }
    }
}
