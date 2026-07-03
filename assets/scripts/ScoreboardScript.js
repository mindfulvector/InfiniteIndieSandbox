// ScoreboardScript
// ----------------
// A logic toy that keeps a visible score for custom game rules. Wire events
// into its inputs (trigger.entered -> add1, star.collected -> add5, ...) and
// the score shows on the play-mode HUD. When the score crosses the `target`
// parameter it fires its `reached` output (edge-triggered, like the counter)
// -- e.g. "at 10 points, stop the spawners".
//
//   params:  target (points)
//   inputs:  add1 / add5 / subtract / reset
//   outputs: reached, changed
// The score resets at the start of each play session.
class ScoreboardScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isLogicToy = true;
        inst.isScoreboard = true;

        this.paramDefs = [
            { key: 'target', label: 'Target', type: 'number', options: [5, 10, 25, 50, 100], default: 10 },
        ];
        this.eventDefs = [];

        this.inputs = [
            { id: 'add1',     label: '+1 Point' },
            { id: 'add5',     label: '+5 Points' },
            { id: 'subtract', label: '-1 Point' },
            { id: 'reset',    label: 'Reset' },
        ];
        this.outputs = [
            { id: 'reached', label: 'Target Reached' },
            { id: 'changed', label: 'Score Changed' },
        ];

        this.score = 0;
        // null = unknown (just created); reset only on an observed build->play
        // transition so a scoreboard created mid-play keeps wired-up points.
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    createMaterial() {
        const m = new BABYLON.StandardMaterial('scoreboardMat', this.app.scene);
        m.diffuseColor = new BABYLON.Color3(0.55, 0.35, 0.05);
        m.emissiveColor = new BABYLON.Color3(0.85, 0.55, 0.10);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        m.alpha = 0.9;
        return m;
    }

    onInput(action, from) {
        switch (action) {
        case 'add1':     this.setScore(this.score + 1);              break;
        case 'add5':     this.setScore(this.score + 5);              break;
        case 'subtract': this.setScore(Math.max(0, this.score - 1)); break;
        case 'reset':    this.setScore(0);                           break;
        }
    }

    setScore(v) {
        if (v === this.score) return;
        const prev = this.score;
        this.score = v;
        this.app.fireEvent(this.inst, 'changed');
        // Edge-triggered: fire only when the score crosses the target from below.
        const target = this.getParam('target');
        if (v >= target && prev < target) {
            this.app.fireEvent(this.inst, 'reached');
        }
    }

    update(isPlayMode, mode) {
        if (isPlayMode && this._wasPlay === false) this.score = 0;
        this._wasPlay = isPlayMode;
    }
}
