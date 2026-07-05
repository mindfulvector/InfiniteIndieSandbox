// HazardScript
// ------------
// l_hazard: a damage volume -- lava, spikes, a poison cloud. In play mode
// it's an intangible translucent-red zone that hurts the player on a tick
// while they stand in it (via PlayMode.damagePlayer, so dodge i-frames roll
// you through and death defers-and-respawns at your last checkpoint). It
// fires `hurt` only when damage actually lands (not when dodged/blocked),
// so you can wire a hazard to a counter, an alarm, or a camera. In build
// mode it stays visible/pickable so you can place and size it.
class HazardScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isHazard = true;

        this.paramDefs = [
            { key: 'damage',   label: 'Damage',    type: 'number', options: [1, 2, 3, 5], default: 2 },
            { key: 'interval', label: 'Every',     type: 'number', options: [15, 30, 45, 60], default: 30, unit: 'f' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'hurt', label: 'Damaged Player' },
        ];

        this._cool = 0;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) { this._cool = 0; }

    // A translucent danger-red material (the trigger-volume pattern).
    createMaterial() {
        const m = new BABYLON.StandardMaterial('hazardMaterial', this.app.scene);
        m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        m.alpha = 0.45;
        m.diffuseColor = new BABYLON.Color3(1.0, 0.25, 0.1);
        m.emissiveColor = new BABYLON.Color3(0.65, 0.12, 0.03);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        return m;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            inst.isVisible = true;
            inst.isPickable = true;
            inst.checkCollisions = false;
            return;
        }
        // Play: intangible, faintly glowing, and dangerous.
        inst.isVisible = true;
        inst.visibility = 0.4;
        inst.isPickable = false;
        inst.checkCollisions = false;

        if (this._cool > 0) this._cool--;
        const player = mode && mode.player;
        if (!player) return;

        // AABB containment of the player position (robust regardless of
        // when world matrices last updated -- the water/floater approach).
        inst.computeWorldMatrix(true);
        const bb = inst.getBoundingInfo().boundingBox;
        const mn = bb.minimumWorld, mx = bb.maximumWorld;
        const p = player.position;
        const inside = p.x > mn.x && p.x < mx.x && p.z > mn.z && p.z < mx.z &&
            p.y + 1.2 > mn.y && p.y - 0.2 < mx.y;
        if (this._cool <= 0 && inside) {
            const before = mode.playerHp;
            const center = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
            mode.damagePlayer(this.getParam('damage') || 2, center);
            this._cool = this.getParam('interval') || 30;
            // Only fire `hurt` if the hit actually connected (dodge/block ate
            // it otherwise). A respawn zeroes-then-refills HP, so guard that.
            if (mode.playerHp < before) this.app.fireEvent(inst, 'hurt');
        }
    }
}
