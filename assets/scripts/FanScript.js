// FanScript
// --------
// l_fan: a wind / updraft zone. In play mode it's an intangible translucent
// volume that pushes the player in a chosen direction while they stand in
// it -- an UP fan lifts you (a continuous jump-pad: float up a shaft to a
// ledge, no ladder needed), a horizontal fan blows you sideways (a gust
// across a gap, a conveyor in the air). It moves the player directly with
// moveWithCollisions (the water-stroke pattern), so walls still stop them.
// Toggle-able by wire (`on`/`off`); starts on. No damage -- pair with an
// l_hazard for a "don't get blown into the spikes" beat.
class FanScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isFan = true;

        this.paramDefs = [
            { key: 'dir', label: 'Blow toward', type: 'enum',
              options: ['up', 'north', 'south', 'east', 'west'], default: 'up' },
            { key: 'strength', label: 'Strength', type: 'number', options: [3, 5, 8, 12], default: 6 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'on',  label: 'Turn On' },
            { id: 'off', label: 'Turn Off' },
        ];
        this.outputs = [];

        this._active = null;   // lazily inits from startActive-equivalent (on)
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) {
        if (action === 'on') this._active = true;
        else if (action === 'off') this._active = false;
    }

    onPlayReset(mode) { this._active = true; }

    _vec(dt) {
        const s = (this.getParam('strength') || 6) * dt;
        switch (this.getParam('dir')) {
        case 'north': return new BABYLON.Vector3(0, 0, s);
        case 'south': return new BABYLON.Vector3(0, 0, -s);
        case 'east':  return new BABYLON.Vector3(s, 0, 0);
        case 'west':  return new BABYLON.Vector3(-s, 0, 0);
        default:      return new BABYLON.Vector3(0, s, 0);   // up
        }
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            inst.isVisible = true; inst.isPickable = true; inst.checkCollisions = false;
            return;
        }
        inst.isVisible = true; inst.visibility = 0.28; inst.isPickable = false; inst.checkCollisions = false;
        if (this._active === null) this._active = true;
        if (!this._active) return;

        const player = mode && mode.player;
        if (!player || mode.driving) return;   // vehicles ignore the draft

        // AABB containment (matrix-independent -- the hazard/water pattern).
        inst.computeWorldMatrix(true);
        const bb = inst.getBoundingInfo().boundingBox;
        const mn = bb.minimumWorld, mx = bb.maximumWorld;
        const p = player.position;
        const inside = p.x > mn.x && p.x < mx.x && p.z > mn.z && p.z < mx.z &&
            p.y + 1.2 > mn.y && p.y - 0.2 < mx.y;
        if (!inside) return;

        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        player.moveWithCollisions(this._vec(dt));
    }
}
