// MenderScript
// -----------
// en_mender: a SUPPORT enemy -- the first that doesn't attack you. It's a
// hovering healer drone that periodically tops up the nearest WOUNDED enemy
// within range (never itself, never a full-HP one). On its own it's
// harmless, but it keeps a pack of chargers/shielders alive forever, so the
// tactic it creates is "kill the mender first". It's an ordinary attackable
// enemy (shares the isEnemy plumbing; melee/bolts/specials drop it for
// pixels + XP) and fires `mended` each time it heals an ally.
class MenderScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 3;
        inst.hp = 3;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'toughness', label: 'Hits to kill', type: 'number', options: [2, 3, 5],   default: 3 },
            { key: 'range',     label: 'Heal range',   type: 'number', options: [6, 10, 16],  default: 10 },
            { key: 'amount',    label: 'Heal',         type: 'number', options: [1, 2, 3],    default: 1 },
            { key: 'interval',  label: 'Every',        type: 'number', options: [30, 60, 90], default: 60, unit: 'f' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'mended', label: 'Healed an Ally' },
        ];

        this._cool = 0;
        this._home = null;
        this._t = ((inst.worldId || 1) * 0.7) % (Math.PI * 2);
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) {
        if (this.inst.defeated) return;   // a downed mender stays down this run
        this._cool = 0;
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    // Nearest wounded enemy in range (not itself, not a breakable, not full).
    _findPatient() {
        const self = this.inst;
        const range = this.getParam('range') || 10;
        const here = self.getAbsolutePosition ? self.getAbsolutePosition() : self.position;
        let best = null, bestD = range * range;
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (!inst || inst === self) return;
                if (!inst.isEnemy || inst.defeated || inst.isBreakable) return;
                if (inst.hp == null || inst.maxHp == null || inst.hp >= inst.maxHp) return;
                const p = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                const dx = p.x - here.x, dy = p.y - here.y, dz = p.z - here.z;
                const d = dx * dx + dy * dy + dz * dz;
                if (d < bestD) { bestD = d; best = inst; }
            });
        });
        return best;
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

        // Gentle hover so it reads as a drone.
        this._t += 0.05;
        if (this._home) inst.position.y = this._home.y + Math.sin(this._t) * 0.2;

        if (this._cool > 0) this._cool--;
        if (this._cool <= 0) {
            const patient = this._findPatient();
            if (patient) {
                patient.hp = Math.min(patient.maxHp, patient.hp + (this.getParam('amount') || 1));
                this._cool = this.getParam('interval') || 60;
                const pp = patient.getAbsolutePosition ? patient.getAbsolutePosition() : patient.position;
                const em = mode && mode.enemyManager;
                if (em && em.spawnFlash) em.spawnFlash(pp.add(new BABYLON.Vector3(0, 1, 0)), new BABYLON.Color3(0.3, 1, 0.5), 8);
                this.app.sound.play('pickup');
                this.app.fireEvent(inst, 'mended');
            }
        }
    }
}
