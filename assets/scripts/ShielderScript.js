// ShielderScript
// -------------
// en_shielder: a shielded enemy you must FLANK. It carries a shield on its
// front and turns to face the player -- but SLOWLY, so a quick dash-around
// (dodge!) gets you behind the guard. Frontal melee, bolts and specials
// clang off the shield (PlayMode consults blocksHit); hits from behind or
// the sides land. It shares the isEnemy damage plumbing otherwise (drops
// pixels + XP on defeat) and stays put -- a defensive wall, not a chaser.
class ShielderScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.isShielder = true;   // keep it out of lock-on's "get behind me" isn't needed; it's a real target
        inst.maxHp = 3;
        inst.hp = 3;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'toughness', label: 'Hits to kill', type: 'number', options: [2, 3, 5], default: 3 },
            { key: 'guard',     label: 'Guard arc',    type: 'enum',   options: ['narrow', 'wide'], default: 'wide' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'flanked', label: 'Hit From Behind' },
        ];

        this._facing = 0;      // current shield yaw
        this._home = null;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) {
        if (this.inst.defeated) return;   // a defeated shielder stays down this run
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    // Forward = shield facing, from _facing yaw (avatar-front basis is +z).
    _forward() {
        return new BABYLON.Vector3(Math.sin(this._facing), 0, Math.cos(this._facing));
    }

    // Called by PlayMode when a hit lands: block it if the attacker is inside
    // the frontal guard arc (dot of shield-forward with the direction to the
    // attacker exceeds the arc threshold).
    blocksHit(fromPos) {
        if (!fromPos || this.inst.defeated) return false;
        const to = fromPos.subtract(this.inst.getAbsolutePosition
            ? this.inst.getAbsolutePosition() : this.inst.position);
        to.y = 0;
        const d = to.length();
        if (d < 0.001) return false;
        to.scaleInPlace(1 / d);
        const f = this._forward();
        const dot = to.x * f.x + to.z * f.z;
        const threshold = this.getParam('guard') === 'narrow' ? 0.5 : 0.15;   // ~120deg / ~160deg
        const blocked = dot >= threshold;
        if (!blocked) this.app.fireEvent(this.inst, 'flanked');
        return blocked;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
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
            inst.maxHp = this.getParam('toughness') || 3;
            inst.hp = inst.maxHp;
        }
        if (inst.defeated) return;

        const player = mode && mode.player;
        if (!player) return;
        // Turn SLOWLY toward the player -- the whole point is you can outflank
        // the guard by circling faster than it tracks.
        const dx = player.position.x - inst.position.x;
        const dz = player.position.z - inst.position.z;
        if (dx * dx + dz * dz > 0.0001) {
            const want = Math.atan2(dx, dz);
            let diff = want - this._facing;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = 0.02;   // radians/frame -- deliberately sluggish
            this._facing += Math.max(-turn, Math.min(turn, diff));
            inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(this._facing, 0, 0);
        }
    }
}
