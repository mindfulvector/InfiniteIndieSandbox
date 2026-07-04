// RaceScript
// ----------
// The race controller: packages a start gate, checkpoints, and a finish line
// into one logic toy. Wire trigger `entered` events into its inputs:
//
//   start      -- the starting gate: (re)arms the clock at zero
//   checkpoint -- each checkpoint trigger; DISTINCT SOURCES are tracked, so
//                 re-entering the same checkpoint never double-counts
//   finish     -- the finish line: only completes the race when every
//                 checkpoint has been hit (else it nags and keeps timing)
//   reset      -- abandon the run
//
//   outputs: started / checkpointHit / finished / record (a new best
//            time -- wire it to celebrate: camera cut, spawner, scoreboard)
//
// The stopwatch accumulates real dt (fps-independent, like every mover) and
// shows top-centre on the HUD while a run is live. The `checkpoints` param
// says how many the course has. The best time persists in
// inst.params.bestTime, which rides the world save ('pr'), so records
// belong to the course in that save slot -- not just the session.
class RaceScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isLogicToy = true;

        this.paramDefs = [
            { key: 'checkpoints', label: 'Checkpoints', type: 'number', options: [0, 1, 2, 3, 5], default: 2 },
        ];
        this.eventDefs = [];
        this.inputs = [
            { id: 'start',      label: 'Start Gate' },
            { id: 'checkpoint', label: 'Checkpoint' },
            { id: 'finish',     label: 'Finish Line' },
            { id: 'reset',      label: 'Abandon Run' },
        ];
        this.outputs = [
            { id: 'started',       label: 'Race Started' },
            { id: 'checkpointHit', label: 'Checkpoint Hit' },
            { id: 'finished',      label: 'Race Finished' },
            { id: 'record',        label: 'New Best Time' },
        ];

        this._racing = false;
        this._elapsed = 0;
        this._hit = new Set();     // 'wo#id' keys of checkpoint sources hit
        // Best finish in seconds. Loaded lazily from params.bestTime (the
        // constructor runs BEFORE createInstance applies saved params, so it
        // can't be read here) -- see _loadBest.
        this._best = null;
        this._bestLoaded = false;
        this._wasPlay = null;
    }

    _loadBest() {
        if (this._bestLoaded) return;
        this._bestLoaded = true;
        const saved = this.inst.params && this.inst.params.bestTime;
        if (typeof saved === 'number' && saved > 0) this._best = saved;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _need() { return this.getParam('checkpoints') || 0; }

    onInput(action, from) {
        if (action === 'start') {
            this._racing = true;
            this._elapsed = 0;
            this._hit = new Set();
            this.app.fireEvent(this.inst, 'started');
            this.app.toasty('GO!');
        } else if (action === 'checkpoint' && this._racing) {
            const id = from ? ((from.worldObject ? from.worldObject.name : '?') + '#' + from.worldId)
                            : ('anon#' + this._hit.size);
            if (!this._hit.has(id)) {
                this._hit.add(id);
                this.app.fireEvent(this.inst, 'checkpointHit');
                this.app.toasty('Checkpoint ' + this._hit.size + ' / ' + this._need());
            }
        } else if (action === 'finish' && this._racing) {
            if (this._hit.size >= this._need()) {
                this._loadBest();   // in case no play frame ran yet
                this._racing = false;
                const t = this._elapsed;
                this.app.fireEvent(this.inst, 'finished');
                let msg = 'FINISH!  ' + t.toFixed(2) + 's';
                if (this._best === null || t < this._best) {
                    this._best = t;
                    // Persist with the course: params ride the world save.
                    if (this.inst.params) this.inst.params.bestTime = t;
                    this.app.fireEvent(this.inst, 'record');
                    msg += '  — new best!';
                }
                this.app.toasty(msg);
                this._hideClock();
            } else {
                this.app.toasty('Keep going — checkpoints ' + this._hit.size + ' / ' + this._need());
            }
        } else if (action === 'reset') {
            this._racing = false;
            this._elapsed = 0;
            this._hit = new Set();
            this._hideClock();
        }
    }

    onPlayReset(mode) {
        this._racing = false;
        this._elapsed = 0;
        this._hit = new Set();
        this._hideClock();
    }

    _hideClock() {
        if (this.app.hud && this.app.hud.raceText) this.app.hud.raceText.isVisible = false;
    }

    update(isPlayMode, mode) {
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._racing = false;
                this._elapsed = 0;
                this._hit = new Set();
                this._hideClock();
            }
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            this._loadBest();   // saved params are applied by now
        }
        if (!this._racing) return;

        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._elapsed += dt;
        const hud = this.app.hud && this.app.hud.raceText;
        if (hud) {
            hud.text = 'RACE  ' + this._elapsed.toFixed(1) + 's   ·   CP ' +
                this._hit.size + ' / ' + this._need() +
                (this._best !== null ? '   ·   best ' + this._best.toFixed(2) + 's' : '');
            hud.isVisible = true;
        }
    }
}
