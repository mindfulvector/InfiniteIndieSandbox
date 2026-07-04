// RailScript
// ----------
// Makes pr_rail a grind rail: wire its `path` output to the first
// l_pathnode (the same topology platforms, patrols, and ghost karts use via
// App.resolvePathChain) and stepping onto the rail head carries the player
// hands-free along the chain at grind speed. Fires `grindStart` when the
// ride begins and `grindEnd` when it lets go -- wire those to counters,
// doors, cameras, whatever the course needs.
class RailScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'path', label: 'Rail Path To' },
            { id: 'grindStart', label: 'Grind Started' },
            { id: 'grindEnd', label: 'Grind Ended' },
        ];

        this._active = false;
        this._cool = 0;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            this._active = false;
            this._cool = 0;
            return;
        }
        if (this._cool > 0) this._cool--;

        // Attribution watch: fire the edges as OUR ride starts/ends.
        const riding = !!(mode && mode.grinding && mode.grinding.rail === inst);
        if (riding && !this._active) {
            this._active = true;
            this.app.fireEvent(inst, 'grindStart');
        } else if (!riding && this._active) {
            this._active = false;
            this._cool = 40;   // step-off breather before re-boarding
            this.app.fireEvent(inst, 'grindEnd');
        }

        // Board: the player walking onto the rail head starts the ride.
        const player = mode && mode.player;
        if (player && !mode.driving && !mode.grinding && this._cool <= 0) {
            const d = BABYLON.Vector3.Distance(player.position, inst.position);
            if (d < 1.5) {
                const chain = this.app.resolvePathChain(inst, 'path');
                if (chain.points.length) {
                    mode.startGrind(inst, [inst.position.clone()].concat(chain.points));
                }
            }
        }
    }
}
