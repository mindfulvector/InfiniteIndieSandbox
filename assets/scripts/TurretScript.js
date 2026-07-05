// TurretScript
// ------------
// en_turret: a STATIONARY sentry enemy. It tracks the player, and when they
// come within `range` it fires enemy projectiles on a `cadence` (the same
// shots the boss and ranged walkers use -- blocked by walls, dodgeable,
// blockable). It's attackable like any enemy (isEnemy + hp), but instead of
// being disposed on defeat it hides RESETTABLY (like the boss) and fires a
// `defeated` output, so an arena can wire "destroy the turret -> open the
// door" and reset it on a new run.
class TurretScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 4;
        inst.hp = 4;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'range',   label: 'Sight range', type: 'number', options: [8, 12, 18], default: 12 },
            { key: 'cadence', label: 'Fire every',  type: 'number', options: [40, 70, 110], default: 70, unit: 'f' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'defeated', label: 'Turret Destroyed' },
        ];

        this._cool = 0;
        this._home = null;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _showAll(vis) {
        this.inst.isVisible = vis;
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => { m.isVisible = vis; });
    }

    // A new run re-arms the turret: restore health, reveal it, reset its
    // cooldown. (A turret killed last run comes back, like the boss.)
    onPlayReset(mode) {
        this.inst.defeated = false;
        this.inst.hp = this.inst.maxHp;
        this._cool = 0;
        this._showAll(true);
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    // PlayMode calls this instead of disposing: a resettable hide + loot +
    // wiring, mirroring the boss.
    onDefeated(mode) {
        this._showAll(false);
        const pos = (this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position).clone();
        if (mode && mode.spawnPixelBurst) mode.spawnPixelBurst(pos, 12);
        this.app.addXp(6);
        this.app.fireEvent(this.inst, 'defeated');
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
                this._showAll(true);
            }
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
        }
        if (inst.defeated) return;

        const player = mode && mode.player;
        if (!player) return;

        const dx = player.position.x - inst.position.x;
        const dz = player.position.z - inst.position.z;
        const flatDist = Math.hypot(dx, dz);

        // Track the player (yaw only; the turret is bolted down).
        if (dx * dx + dz * dz > 0.0001) {
            inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(dx, dz), 0, 0);
        }

        if (this._cool > 0) this._cool--;
        if (flatDist <= (this.getParam('range') || 12) && this._cool <= 0) {
            if (mode.enemyManager && mode.enemyManager.fireProjectile) {
                const color = new BABYLON.Color3(1.0, 0.4, 0.2);
                mode.enemyManager.fireProjectile({ mesh: inst, color: color }, player.position);
            }
            this._cool = this.getParam('cadence') || 70;
        }
    }
}
