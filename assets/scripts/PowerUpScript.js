// PowerUpScript
// -------------
// pk_powerup: a timed COMBAT BUFF pickup. Walk over it and, for a set
// duration, you either hit for DOUBLE damage ('power') or shrug off all
// incoming hits ('shield') -- via PlayMode.grantPowerUp, which owns the
// timer and the combat hooks (powerMultiplier + the damagePlayer shield
// check). Like every pickup it floats/spins, hides on collect, and comes
// back on a play reset; fires `collected` for wiring. Colour and duration
// come from the kind.
class PowerUpScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'kind',     label: 'Buff',     type: 'enum',   options: ['power', 'shield'], default: 'power' },
            { key: 'duration', label: 'Seconds',  type: 'number', options: [5, 8, 12],          default: 8 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'collected', label: 'Collected' },
        ];

        this._collected = false;
        this._baseY = null;
        this._t = ((inst.worldId || 1) * 1.1) % (Math.PI * 2);
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) {
        this._collected = false;
        this.inst.isVisible = true;
        this._showChildren(true);
    }

    _showChildren(v) {
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => { m.isVisible = v; });
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        inst.checkCollisions = false;
        if (!isPlayMode) {
            if (this._collected) this._collected = false;
            inst.isVisible = true; this._showChildren(true);
            if (this._baseY !== null) { inst.position.y = this._baseY; inst.restY = null; this._baseY = null; }
            return;
        }
        if (this._collected) return;

        if (this._baseY === null) { this._baseY = inst.position.y; inst.restY = this._baseY; }
        this._t += 0.06;
        inst.position.y = this._baseY + Math.sin(this._t) * 0.15;
        inst.rotation.y += 0.07;

        const player = mode && mode.player;
        if (!player) return;
        const p = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
        if (BABYLON.Vector3.Distance(p, player.position.add(new BABYLON.Vector3(0, 1, 0))) <= 1.6) {
            this._collected = true;
            inst.isVisible = false; this._showChildren(false);
            const kind = this.getParam('kind');
            const frames = Math.round((this.getParam('duration') || 8) * 60);
            if (mode.grantPowerUp) mode.grantPowerUp(kind, frames);
            this.app.sound.play('levelup');
            this.app.toasty((kind === 'shield' ? 'SHIELD' : 'POWER') + ' up!');
            this.app.fireEvent(inst, 'collected');
        }
    }
}
