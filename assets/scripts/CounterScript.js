// CounterScript
// -------------
// A logic toy that counts wired events. Wire event sources (triggers, pickups,
// timers) into its inputs; when the count reaches the `threshold` parameter it
// fires its `reached` output — e.g. "after 3 stars are collected, open the
// spawner". The live count resets when a play session starts.
//
//   inputs:  increment / decrement / reset
//   outputs: reached (count hit the threshold), changed (any count change)
//
// Note on `changed`: wiring is player-editable, so a player CAN wire
// changed -> increment on the same counter. App.fireEvent's depth guard stops
// that loop instead of hanging the game.
class CounterScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isLogicToy = true;

        this.paramDefs = [
            { key: 'threshold', label: 'Target',     type: 'number', options: [1, 2, 3, 5, 10], default: 3 },
            { key: 'autoReset', label: 'Auto reset', type: 'enum',   options: ['yes', 'no'],    default: 'yes' },
        ];
        this.eventDefs = [];

        this.inputs = [
            { id: 'increment', label: 'Count +1' },
            { id: 'decrement', label: 'Count -1' },
            { id: 'reset',     label: 'Reset' },
        ];
        this.outputs = [
            { id: 'reached', label: 'Target Reached' },
            { id: 'changed', label: 'Count Changed' },
        ];

        this.count = 0;
        // null = unknown (just created); the play-session reset below only fires
        // on a build->play TRANSITION, so a counter created mid-play (or its
        // wired-up count) isn't wiped by its first update frame.
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    createMaterial() {
        const m = new BABYLON.StandardMaterial('counterMat', this.app.scene);
        m.diffuseColor = new BABYLON.Color3(0.10, 0.25, 0.60);
        m.emissiveColor = new BABYLON.Color3(0.15, 0.35, 0.90);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        m.alpha = 0.9;
        return m;
    }

    onInput(action, from) {
        switch (action) {
        case 'increment': this.setCount(this.count + 1); break;
        case 'decrement': this.setCount(this.count - 1); break;
        case 'reset':     this.setCount(0);              break;
        }
    }

    setCount(v) {
        if (v === this.count) return;
        this.count = v;
        this.app.fireEvent(this.inst, 'changed');
        if (this.count >= this.getParam('threshold')) {
            this.app.fireEvent(this.inst, 'reached');
            if (this.getParam('autoReset') === 'yes') this.count = 0;
        }
    }

    update(isPlayMode, mode) {
        // Fresh count each play session so saved worlds behave deterministically.
        // Only on an observed build->play transition (see constructor note).
        if (isPlayMode && this._wasPlay === false) this.count = 0;
        this._wasPlay = isPlayMode;
    }
}
