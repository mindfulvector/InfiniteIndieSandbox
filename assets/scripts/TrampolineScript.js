// TrampolineScript
// ----------------
// Makes t_tramp a bouncy pad: a player landing on (or falling just past)
// the pad surface gets launched at the configured power through the CC's
// own jump (PlayMode.bouncePlayer borrows the jump speed and hands it
// back). The pad squashes on launch for feel. Fires `bounced` for wiring.
class TrampolineScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'power', label: 'Bounce Power', type: 'number', options: [8, 11, 14], default: 11 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'bounced', label: 'Bounced' },
        ];

        this._cool = 0;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        // Squash recovery runs in every mode so build previews settle too.
        if (inst.scaling.y < 1) inst.scaling.y = Math.min(1, inst.scaling.y + 0.04);
        if (!isPlayMode) { this._cool = 0; return; }
        if (this._cool > 0) { this._cool--; return; }

        const player = mode && mode.player;
        if (!player || mode.driving || mode.grinding) return;
        const top = inst.position.y + 0.25;   // pad surface (0.5-tall box)
        const dx = Math.abs(player.position.x - inst.position.x);
        const dz = Math.abs(player.position.z - inst.position.z);
        const dy = player.position.y - top;
        if (dx < 1.1 && dz < 1.1 && dy > -0.4 && dy < 0.5) {
            mode.bouncePlayer(this.getParam('power') || 11);
            inst.scaling.y = 0.45;   // squash!
            this._cool = 25;
            this.app.fireEvent(inst, 'bounced');
        }
    }
}
