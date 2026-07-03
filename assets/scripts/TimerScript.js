// TimerScript
// -----------
// A logic toy that fires its `tick` output on a schedule while active in play
// mode. Wire tick into anything — spawner.spawn for waves, counter.increment
// for time limits. Runs from level start when `startActive` is yes, or waits to
// be started by another wire (e.g. trigger.entered -> timer.start).
//
//   params:  interval (seconds), repeat (yes/no), startActive (yes/no)
//   inputs:  start / stop / reset
//   outputs: tick
class TimerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isLogicToy = true;

        this.paramDefs = [
            { key: 'interval',    label: 'Every',    type: 'number', options: [1, 2, 3, 5, 10], default: 3, unit: 's' },
            { key: 'repeat',      label: 'Repeat',   type: 'enum',   options: ['yes', 'no'],    default: 'yes' },
            { key: 'startActive', label: 'Start on', type: 'enum',   options: ['yes', 'no'],    default: 'yes' },
        ];
        this.eventDefs = [];

        this.inputs = [
            { id: 'start', label: 'Start' },
            { id: 'stop',  label: 'Stop' },
            { id: 'reset', label: 'Reset' },
        ];
        this.outputs = [
            { id: 'tick', label: 'Tick' },
        ];

        this._active = null;   // lazily initialised from startActive
        this._acc = 0;
        // null = unknown (just created); the play-session reset below only fires
        // on a build->play TRANSITION, so a timer created mid-play that was
        // start()ed by a wire isn't reset by its first update frame.
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    createMaterial() {
        const m = new BABYLON.StandardMaterial('timerMat', this.app.scene);
        m.diffuseColor = new BABYLON.Color3(0.08, 0.45, 0.45);
        m.emissiveColor = new BABYLON.Color3(0.10, 0.70, 0.70);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        m.alpha = 0.9;
        return m;
    }

    onInput(action, from) {
        switch (action) {
        case 'start': this._active = true;  break;
        case 'stop':  this._active = false; break;
        case 'reset': this._acc = 0; this._active = (this.getParam('startActive') !== 'no'); break;
        }
    }

    update(isPlayMode, mode) {
        if (!isPlayMode) { this._wasPlay = false; return; }

        // Fresh run each play session (only on an observed build->play
        // transition -- see constructor note).
        if (this._wasPlay === false) {
            this._acc = 0;
            this._active = (this.getParam('startActive') !== 'no');
        }
        this._wasPlay = true;
        if (this._active === null) this._active = (this.getParam('startActive') !== 'no');
        if (!this._active) return;

        const dt = Math.min(0.1, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._acc += dt;
        if (this._acc >= this.getParam('interval')) {
            this._acc = 0;
            this.app.fireEvent(this.inst, 'tick');
            if (this.getParam('repeat') === 'no') this._active = false;
        }
    }
}
