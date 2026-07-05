// ConveyorScript
// -------------
// l_conveyor: a SOLID belt you stand ON that carries you along a chosen
// compass direction -- a moving walkway. Unlike the fan (a volume that
// pushes you while you're inside it), the conveyor is a floor: it stays
// collidable so you walk on top, and only carries whatever is standing on
// its top face. Drift is applied via moveWithCollisions (walls still stop
// you). Params: direction + speed. Fires `carrying` when you step aboard.
class ConveyorScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'dir',   label: 'Carries',  type: 'enum',   options: ['north', 'south', 'east', 'west'], default: 'east' },
            { key: 'speed', label: 'Speed',    type: 'number', options: [2, 4, 6], default: 4 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'on',  label: 'Switch On' },
            { id: 'off', label: 'Switch Off' },
        ];
        this.outputs = [
            { id: 'carrying', label: 'Carrying Rider' },
        ];

        this._active = null;
        this._had = false;   // was carrying last frame (edge)
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

    onPlayReset(mode) { this._active = true; this._had = false; }

    _vec(dt) {
        const s = (this.getParam('speed') || 4) * dt;
        switch (this.getParam('dir')) {
        case 'north': return new BABYLON.Vector3(0, 0, s);
        case 'south': return new BABYLON.Vector3(0, 0, -s);
        case 'west':  return new BABYLON.Vector3(-s, 0, 0);
        default:      return new BABYLON.Vector3(s, 0, 0);   // east
        }
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        // Solid in BOTH modes -- it's a floor you stand on.
        inst.isVisible = true; inst.checkCollisions = true;
        if (!isPlayMode) { inst.isPickable = true; return; }
        inst.isPickable = false;
        if (this._active === null) this._active = true;

        const player = mode && mode.player;
        const carrying = this._active && player && !mode.driving && this._onTop(player);
        if (carrying) {
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            player.moveWithCollisions(this._vec(dt));
            if (!this._had) this.app.fireEvent(inst, 'carrying');
        }
        this._had = !!carrying;
    }

    // True when the player is standing on the belt's TOP face (within the
    // horizontal footprint, feet near the top y).
    _onTop(player) {
        this.inst.computeWorldMatrix(true);
        const bb = this.inst.getBoundingInfo().boundingBox;
        const mn = bb.minimumWorld, mx = bb.maximumWorld;
        const p = player.position;
        return p.x > mn.x && p.x < mx.x && p.z > mn.z && p.z < mx.z &&
            p.y >= mx.y - 0.4 && p.y <= mx.y + 0.7;
    }
}
