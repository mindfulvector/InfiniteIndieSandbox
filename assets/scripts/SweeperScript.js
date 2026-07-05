// SweeperScript
// -------------
// l_sweeper: a MOVING damage hazard -- a swinging blade / sweeping laser
// that oscillates back and forth along an axis from its placed home. It
// hurts the player on contact like a static hazard (AABB + damagePlayer,
// so dodge i-frames roll you through), but because it MOVES you have to
// time your crossing. Params: axis, throw distance, speed, damage. A play
// reset parks it home. Fires `hurt` when a hit lands, and `swept` once per
// pass through centre (for wiring rhythms).
class SweeperScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'axis',   label: 'Sweep axis', type: 'enum',   options: ['x', 'z'], default: 'x' },
            { key: 'reach',  label: 'Throw',      type: 'number', options: [3, 5, 8],  default: 5 },
            { key: 'speed',  label: 'Speed',      type: 'number', options: [1, 2, 3],  default: 2 },
            { key: 'damage', label: 'Damage',     type: 'number', options: [1, 2, 3],  default: 2 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'hurt',  label: 'Damaged Player' },
            { id: 'swept', label: 'Passed Centre' },
        ];

        this._home = null;
        this._phase = 0;
        this._cool = 0;
        this._lastSin = 0;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) {
        this._phase = 0; this._cool = 0; this._lastSin = 0;
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    createMaterial() {
        const m = new BABYLON.StandardMaterial('sweeperMaterial', this.app.scene);
        m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        m.alpha = 0.5;
        m.diffuseColor = new BABYLON.Color3(1.0, 0.3, 0.5);
        m.emissiveColor = new BABYLON.Color3(0.7, 0.12, 0.2);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        return m;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
                this._phase = 0;
            }
            this._home = inst.position.clone();
            inst.restPos = this._home;
            inst.isVisible = true; inst.isPickable = true; inst.checkCollisions = false;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
        }
        inst.isVisible = true; inst.visibility = 0.5; inst.isPickable = false; inst.checkCollisions = false;

        // Oscillate along the chosen axis from home.
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._phase += dt * (this.getParam('speed') || 2);
        const s = Math.sin(this._phase);
        const off = s * (this.getParam('reach') || 5);
        if (this.getParam('axis') === 'z') inst.position.z = this._home.z + off;
        else inst.position.x = this._home.x + off;
        // `swept` edge-fires each time it crosses centre (sign flip).
        if (this._lastSin <= 0 && s > 0) this.app.fireEvent(inst, 'swept');
        this._lastSin = s;

        // Contact damage (AABB, the hazard pattern).
        if (this._cool > 0) this._cool--;
        const player = mode && mode.player;
        if (!player) return;
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
            this._cool = 20;
            if (mode.playerHp < before) this.app.fireEvent(inst, 'hurt');
        }
    }
}
