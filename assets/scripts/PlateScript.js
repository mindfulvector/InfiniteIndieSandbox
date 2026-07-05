// PlateScript
// -----------
// l_plate: a pressure plate -- a floor button you activate by WEIGHT, not by
// entering a volume (that's l_trigger). Stand on it and it sinks and fires
// `pressed`; step off and it rises and fires `released`. In momentary mode
// (default) it holds only while occupied -- perfect for "stand here to keep
// the door open" -- while latch mode stays down once triggered. Reuses the
// crumble/conveyor top-face test. Edge-triggered, resets on a play reset.
class PlateScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'latch', label: 'Stay pressed', type: 'enum', options: ['no', 'yes'], default: 'no' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'pressed',  label: 'Pressed' },
            { id: 'released', label: 'Released' },
        ];

        this._down = false;
        this._home = null;
        this._baseY = null;
        this.SINK = 0.18;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _rise() {
        if (this._baseY != null) this.inst.position.y = this._baseY;
        this._down = false;
    }

    onPlayReset(mode) {
        if (this._home) this.inst.position.copyFrom(this._home);
        this._baseY = this.inst.position.y;
        this._rise();
    }

    _onTop(player) {
        this.inst.computeWorldMatrix(true);
        const bb = this.inst.getBoundingInfo().boundingBox;
        const mn = bb.minimumWorld, mx = bb.maximumWorld;
        const p = player.position;
        return p.x > mn.x && p.x < mx.x && p.z > mn.z && p.z < mx.z &&
            p.y >= mx.y - 0.5 && p.y <= mx.y + 0.9;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        inst.checkCollisions = true; inst.isVisible = true;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
            }
            this._home = inst.position.clone();
            this._baseY = inst.position.y;
            inst.isPickable = true;
            this._down = false;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); }
            this._baseY = this._home.y;
            this._rise();
        }
        inst.isPickable = false;

        const player = mode && mode.player;
        const on = !!(player && this._onTop(player));

        if (on && !this._down) {
            this._down = true;
            inst.position.y = this._baseY - this.SINK;
            this.app.sound.play('click');
            this.app.fireEvent(inst, 'pressed');
        } else if (!on && this._down && this.getParam('latch') !== 'yes') {
            this._down = false;
            inst.position.y = this._baseY;
            this.app.sound.play('click');
            this.app.fireEvent(inst, 'released');
        }
    }
}
