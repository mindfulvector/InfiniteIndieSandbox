// QuestScript
// -----------
// A multi-step goal with a pixel reward. Wire ANY event sources into its
// `step` input -- a trigger's entered, a counter's reached, a race's
// finished, a cell door's entered -- and the quest completes when enough
// DISTINCT sources have fired (the same source never counts twice, so a
// quest is "do these N different things", not "do one thing N times").
//
//   params:  steps (how many distinct sources the quest needs),
//            reward (pixels paid on completion)
//   inputs:  step / reset
//   outputs: progress (edge per newly-counted step),
//            complete (edge, once per run; a play reset re-arms it)
//
// Completion pays the reward through addPixels (so Fortune applies) and
// toasts. onPlayReset re-arms the quest for the next run.
class QuestScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isLogicToy = true;

        this.paramDefs = [
            { key: 'steps',  label: 'Steps',  type: 'number', options: [1, 2, 3, 5], default: 3 },
            { key: 'reward', label: 'Reward', type: 'number', options: [0, 10, 25, 50, 100], default: 25 },
        ];
        this.eventDefs = [];
        this.inputs = [
            { id: 'step',  label: 'Quest Step Done' },
            { id: 'reset', label: 'Reset Quest' },
        ];
        this.outputs = [
            { id: 'progress', label: 'Step Counted' },
            { id: 'complete', label: 'Quest Complete' },
        ];

        this._done = new Set();    // 'wo#id' keys of step sources counted
        this._complete = false;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _need() { return this.getParam('steps') || 1; }

    _rearm() {
        this._done = new Set();
        this._complete = false;
    }

    onInput(action, from) {
        if (action === 'reset') { this._rearm(); return; }
        if (action !== 'step' || this._complete) return;
        const id = from ? ((from.worldObject ? from.worldObject.name : '?') + '#' + from.worldId)
                        : ('anon#' + this._done.size);
        if (this._done.has(id)) return;
        this._done.add(id);
        this.app.fireEvent(this.inst, 'progress');
        if (this._done.size >= this._need()) {
            this._complete = true;
            const reward = this.getParam('reward') || 0;
            if (reward > 0) this.app.addPixels(reward);
            this.app.fireEvent(this.inst, 'complete');
            this.app.toasty('QUEST COMPLETE!' + (reward > 0 ? '  +' + reward + ' pixels' : ''));
        } else {
            this.app.toasty('Quest: ' + this._done.size + ' / ' + this._need());
        }
    }

    onPlayReset(mode) { this._rearm(); }

    update(isPlayMode, mode) {
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._rearm();
            }
            return;
        }
        if (this._wasPlay !== true) this._wasPlay = true;
    }
}
