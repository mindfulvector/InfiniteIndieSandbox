// PhaserScript
// -----------
// en_phaser: a ghost that PHASES in and out. It cycles between a SOLID
// window (tangible: it drifts at you, contact-damages, and can be hit) and
// a PHASED window (intangible: it turns ghostly, passes through your blows,
// and can't hurt you). The dynamic is timing -- you can only damage it while
// it's solid, so you wait for it to materialise and strike then. Invulner-
// ability reuses the shielder's blocksHit hook (return true while phased),
// so every attack path already respects it. Fires `phased`/`solidified`.
class PhaserScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 3;
        inst.hp = 3;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'toughness', label: 'Hits to kill', type: 'number', options: [2, 3, 5],    default: 3 },
            { key: 'speed',     label: 'Speed',        type: 'number', options: [3, 5, 8],     default: 5 },
            { key: 'solidTime', label: 'Solid frames', type: 'number', options: [60, 90, 120], default: 90 },
            { key: 'phaseTime', label: 'Phased frames',type: 'number', options: [60, 90, 120], default: 90 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'phased',     label: 'Turned Ghostly' },
            { id: 'solidified', label: 'Turned Solid' },
        ];

        this._solid = true;
        this._t = 0;
        this._cool = 0;
        this._home = null;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    // Invulnerable while phased -- PlayMode consults this at every damage site.
    blocksHit() { return !this._solid && !this.inst.defeated; }

    _setSolid(v) {
        this._solid = v;
        this._t = 0;
        this.inst.visibility = v ? 1 : 0.3;
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => { m.visibility = v ? 1 : 0.3; });
        this.app.fireEvent(this.inst, v ? 'solidified' : 'phased');
    }

    onPlayReset(mode) {
        if (this.inst.defeated) return;
        this._solid = true; this._t = 0; this._cool = 0;
        this.inst.visibility = 1;
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => { m.visibility = 1; });
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
                inst.visibility = 1;
            }
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
            inst.maxHp = this.getParam('toughness') || 3;
            inst.hp = inst.maxHp;
            this._solid = true; this._t = 0; inst.visibility = 1;
        }
        if (inst.defeated) return;

        // Cycle solid <-> phased on the timers.
        this._t++;
        const dwell = this._solid ? (this.getParam('solidTime') || 90) : (this.getParam('phaseTime') || 90);
        if (this._t >= dwell) this._setSolid(!this._solid);

        if (this._cool > 0) this._cool--;

        const player = mode && mode.player;
        if (!player) return;
        const to = player.position.subtract(inst.position); to.y = 0;
        const dist = to.length();
        if (dist > 0.001) {
            inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(to.x, to.z), 0, 0);
            // Drift toward the player (a bit faster while solid and closing in).
            to.scaleInPlace(1 / dist);
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            const step = (this.getParam('speed') || 5) * dt;
            inst.position.x += to.x * step;
            inst.position.z += to.z * step;
        }

        // Contact damage ONLY while solid (a ghost can't touch you).
        if (this._solid && this._cool <= 0 && dist <= 1.5) {
            mode.damagePlayer(2, inst.position);
            this._cool = 40;
        }
    }
}
