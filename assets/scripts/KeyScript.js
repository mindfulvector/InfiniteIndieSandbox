// KeyScript
// --------
// pk_key: a collectible KEY for the key-and-lock adventure mechanic. Walk
// over it and it joins your key ring (mode.keysHeld -- a Set of keyIds) for
// the rest of the run; a matching pr_lock then opens when you approach it.
// Like every pickup it hides on collect and comes back on a play reset (and
// the reset also empties the whole key ring, since locks consume keys).
// Fires `collected` for wiring. keyId groups a key with its lock.
class KeyScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'keyId', label: 'Key ID', type: 'enum', options: ['gold', 'silver', 'bronze'], default: 'gold' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'collected', label: 'Collected' },
        ];

        this._collected = false;
        this._baseY = null;
        this._t = ((inst.worldId || 1) * 1.3) % (Math.PI * 2);
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
        // A fresh run empties the key ring (locks consume keys mid-run).
        if (mode) mode.keysHeld = new Set();
    }

    _showChildren(v) {
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => { m.isVisible = v; });
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        inst.checkCollisions = false;
        if (!isPlayMode) {
            if (this._collected) { this._collected = false; }
            inst.isVisible = true; this._showChildren(true);
            if (this._baseY !== null) { inst.position.y = this._baseY; inst.restY = null; this._baseY = null; }
            return;
        }
        if (this._collected) return;

        // Float + spin so it reads as collectable.
        if (this._baseY === null) { this._baseY = inst.position.y; inst.restY = this._baseY; }
        this._t += 0.05;
        inst.position.y = this._baseY + Math.sin(this._t) * 0.12;
        inst.rotation.y += 0.05;

        const player = mode && mode.player;
        if (!player) return;
        const p = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
        if (BABYLON.Vector3.Distance(p, player.position.add(new BABYLON.Vector3(0, 1, 0))) <= 1.6) {
            this._collected = true;
            inst.isVisible = false; this._showChildren(false);
            if (!mode.keysHeld) mode.keysHeld = new Set();
            mode.keysHeld.add(this.getParam('keyId'));
            this.app.sound.play('pickup-star');
            this.app.toasty(this.getParam('keyId') + ' key collected!');
            this.app.fireEvent(inst, 'collected');
        }
    }
}
