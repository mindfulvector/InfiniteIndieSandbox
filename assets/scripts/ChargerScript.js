// ChargerScript
// ------------
// en_charger: a dash-attacker enemy. Unlike the slow-approach walker or the
// stationary turret, it sits still until you come within `range`, TELEGRAPHS
// with a wind-up (swelling in place so you can read the tell), then DASHES in
// a straight line at your locked-in position -- overshooting past you -- and
// recovers before winding up again. The charge is dodgeable (roll through the
// i-frames) and blockable (a raised guard eats the frontal hit). It's an
// ordinary attackable enemy (shares the isEnemy damage plumbing; melee, bolts
// and specials all land) and drops pixels + XP when defeated.
class ChargerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 3;
        inst.hp = 3;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'toughness', label: 'Hits to kill', type: 'number', options: [2, 3, 5],  default: 3 },
            { key: 'range',     label: 'Aggro range', type: 'number', options: [6, 10, 16],  default: 10 },
            { key: 'speed',     label: 'Charge speed',type: 'number', options: [8, 12, 18],  default: 12 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'charged', label: 'Started a Charge' },
        ];

        this._state = 'idle';
        this._t = 0;
        this._chargeDir = null;
        this._home = null;
        this._wasPlay = null;
        this._hitThisCharge = false;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) {
        if (this.inst.defeated) return;   // a killed charger stays dead this run
        this._reset();
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    _reset() {
        this._state = 'idle'; this._t = 0; this._chargeDir = null; this._hitThisCharge = false;
        this.inst.scaling.set(1, 1, 1);
    }

    _faceToward(px, pz) {
        const dx = px - this.inst.position.x, dz = pz - this.inst.position.z;
        if (dx * dx + dz * dz > 0.0001) {
            this.inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(dx, dz), 0, 0);
        }
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
                this._reset();
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
            this._reset();
        }
        if (inst.defeated) return;

        const player = mode && mode.player;
        if (!player) return;
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._t++;

        if (this._state === 'idle') {
            this._faceToward(player.position.x, player.position.z);
            const d = BABYLON.Vector3.Distance(player.position, inst.position);
            if (d <= (this.getParam('range') || 10)) { this._state = 'windup'; this._t = 0; }
        } else if (this._state === 'windup') {
            this._faceToward(player.position.x, player.position.z);
            // Swell as a tell (per-instance scaling -- instancing-safe).
            const s = 1 + Math.min(0.4, this._t * 0.012);
            inst.scaling.set(s, s, s);
            if (this._t >= 40) {
                // Lock the charge line at the player's position now.
                const dir = player.position.subtract(inst.position); dir.y = 0;
                if (dir.lengthSquared() < 0.0001) dir.z = 1;
                this._chargeDir = dir.normalize();
                this._state = 'charge'; this._t = 0; this._hitThisCharge = false;
                inst.scaling.set(1, 1, 1);
                this.app.sound.play('enemy-shot');
                this.app.fireEvent(inst, 'charged');
            }
        } else if (this._state === 'charge') {
            const step = (this.getParam('speed') || 12) * dt;
            inst.position.x += this._chargeDir.x * step;
            inst.position.z += this._chargeDir.z * step;
            // Contact: one hit per charge (damagePlayer's cooldown also guards).
            if (!this._hitThisCharge &&
                    BABYLON.Vector3.Distance(player.position, inst.position) < 1.4) {
                this._hitThisCharge = true;
                mode.damagePlayer(2, inst.position);
            }
            if (this._t >= 26) { this._state = 'recover'; this._t = 0; }
        } else { // recover
            if (this._t >= 30) { this._state = 'idle'; this._t = 0; }
        }
    }
}
