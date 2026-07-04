// ChimeScript
// -----------
// Makes l_chime a wired sound toy. Every sound is SYNTHESIZED (WebAudio
// oscillators via App.playTones -- no asset files, keeping the game
// dependency-free). Wire anything's event into `play` and the chime sings
// its configured pattern; it fires `played` right after, so chimes can
// chain into counters, cameras, or more chimes.
//
// Patterns (chosen by the `sound` param):
//   jingle  -- a bright 4-note arpeggio (pickups, quest steps)
//   alarm   -- 3 urgent two-tone pairs (spawners, phase 2!)
//   gong    -- a deep 2-note strike (doors, boss defeats)
//   powerup -- a 5-note rising run (level-ups, unlocks)
class ChimeScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'sound', label: 'Sound', type: 'enum',
              options: ['jingle', 'alarm', 'gong', 'powerup'], default: 'jingle' },
            { key: 'volume', label: 'Volume', type: 'number',
              options: [0.2, 0.5, 1.0], default: 0.5 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'play', label: 'Play' },
        ];
        this.outputs = [
            { id: 'played', label: 'Played' },
        ];
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _pattern() {
        switch (this.getParam('sound')) {
        case 'alarm':
            // Three urgent two-tone pairs.
            return [0, 1, 2].map((i) => [
                { f: 880, t: i * 0.3, d: 0.12, type: 'square' },
                { f: 659, t: i * 0.3 + 0.14, d: 0.12, type: 'square' },
            ]).flat();
        case 'gong':
            // A deep strike and its fifth, ringing out.
            return [
                { f: 130.8, t: 0, d: 1.6, type: 'triangle' },
                { f: 196.0, t: 0.03, d: 1.2, type: 'triangle' },
            ];
        case 'powerup':
            // A five-note rising run.
            return [523, 587, 659, 784, 1046].map((f, i) =>
                ({ f, t: i * 0.07, d: 0.12, type: 'sine' }));
        case 'jingle':
        default:
            // A bright C-major arpeggio.
            return [523, 659, 784, 1046].map((f, i) =>
                ({ f, t: i * 0.09, d: 0.18, type: 'sine' }));
        }
    }

    onInput(action) {
        if (action !== 'play') return;
        if (this.app.playTones(this._pattern(), this.getParam('volume'))) {
            this.app.fireEvent(this.inst, 'played');
        }
    }

    update(isPlayMode, mode) { /* stateless: sounds only fire via wires */ }
}
