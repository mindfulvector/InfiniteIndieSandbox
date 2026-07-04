// GateScript
// ----------
// l_gate: a Boolean LOGIC gate for puzzle wiring -- the missing combinator.
// It listens to `on`/`off` from any number of wired sources (each source
// identified by the `from` instance passed to onInput), tracks which are
// currently active, and edge-fires its own `on`/`off` outputs when the
// gate's condition flips:
//   all (AND)  -- on when every source that has EVER signalled is active,
//   any (OR)   -- on when at least one source is active,
//   not (NOT)  -- on when a source has signalled but none are active.
// Wire two triggers' entered->on and exited->off into an `all` gate, and
// its `on` fires only when BOTH plates are occupied: a real puzzle.
class GateScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'mode', label: 'Logic', type: 'enum', options: ['all', 'any', 'not'], default: 'all' },
            { key: 'need', label: 'Inputs (AND)', type: 'number', options: [2, 3, 4], default: 2 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'on',    label: 'Signal On' },
            { id: 'off',   label: 'Signal Off' },
            { id: 'reset', label: 'Reset' },
        ];
        this.outputs = [
            { id: 'on',  label: 'Gate Opens' },
            { id: 'off', label: 'Gate Closes' },
        ];

        this._active = new Set();   // source ids currently on
        this._seen = new Set();     // every source id that has ever signalled
        this._state = false;        // last evaluated gate output
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) {
        this._active.clear();
        this._seen.clear();
        this._state = false;
    }

    _srcId(from) {
        if (from && from.worldId != null) return from.worldId;
        return '?';   // an unidentified source still counts as one bucket
    }

    onInput(action, from) {
        if (action === 'reset') {
            this._active.clear(); this._seen.clear();
            return;
        }
        if (action !== 'on' && action !== 'off') return;
        const id = this._srcId(from);
        this._seen.add(id);
        if (action === 'on') this._active.add(id);
        else this._active.delete(id);
    }

    _evaluate() {
        const mode = this.getParam('mode');
        if (mode === 'any') return this._active.size > 0;
        if (mode === 'not') return this._seen.size > 0 && this._active.size === 0;
        // all (AND): at least `need` distinct sources are active at once. A
        // learn-only "every seen source" rule can't require an input it has
        // never heard from, so an explicit count makes a 2-plate door real.
        const need = this.getParam('need') || 2;
        return this._active.size >= need;
    }

    update(isPlayMode, mode) {
        if (!isPlayMode) return;
        const now = this._evaluate();
        if (now !== this._state) {
            this._state = now;
            this.app.fireEvent(this.inst, now ? 'on' : 'off');
        }
    }
}
