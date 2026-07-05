// RegenScript
// -----------
// l_regen: a healing zone -- the benevolent twin of l_hazard. Stand in the
// glowing field and it restores HP over time (up to your max), so it's a
// place to retreat and recover mid-fight rather than a one-shot pickup.
// Intangible (walk through it). Fires `healed` only when it actually tops
// you up (not when you're already full), and `full` once when you cap out.
class RegenScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'amount',   label: 'Heal',   type: 'number', options: [1, 2, 3, 5], default: 2 },
            { key: 'interval', label: 'Every',  type: 'number', options: [15, 30, 45, 60], default: 30, unit: 'f' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'healed', label: 'Healed Player' },
            { id: 'full',   label: 'Fully Healed' },
        ];

        this._cool = 0;
        this._wasFull = false;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) { this._cool = 0; this._wasFull = false; }

    createMaterial() {
        const m = new BABYLON.StandardMaterial('regenMaterial', this.app.scene);
        m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        m.alpha = 0.35;
        m.diffuseColor = new BABYLON.Color3(0.3, 1.0, 0.5);
        m.emissiveColor = new BABYLON.Color3(0.15, 0.7, 0.3);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        return m;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            inst.isVisible = true; inst.isPickable = true; inst.checkCollisions = false;
            return;
        }
        // Play: intangible and faintly glowing.
        inst.isVisible = true; inst.visibility = 0.35; inst.isPickable = false; inst.checkCollisions = false;

        if (this._cool > 0) this._cool--;
        const player = mode && mode.player;
        if (!player || mode.playerHp == null || mode.playerMaxHp == null) return;

        // AABB containment of the player (the hazard/water pattern).
        inst.computeWorldMatrix(true);
        const bb = inst.getBoundingInfo().boundingBox;
        const mn = bb.minimumWorld, mx = bb.maximumWorld;
        const p = player.position;
        const inside = p.x > mn.x && p.x < mx.x && p.z > mn.z && p.z < mx.z &&
            p.y + 1.2 > mn.y && p.y - 0.2 < mx.y;
        if (!inside) return;

        if (this._cool <= 0 && mode.playerHp < mode.playerMaxHp) {
            mode.playerHp = Math.min(mode.playerMaxHp, mode.playerHp + (this.getParam('amount') || 2));
            this._cool = this.getParam('interval') || 30;
            this.app.sound.play('pickup');
            this.app.fireEvent(inst, 'healed');
            if (mode.playerHp >= mode.playerMaxHp && !this._wasFull) {
                this._wasFull = true;
                this.app.fireEvent(inst, 'full');
            }
        }
        if (mode.playerHp < mode.playerMaxHp) this._wasFull = false;
    }
}
