// PathNodeScript
// --------------
// A waypoint marker for building paths. Path nodes chain to each other in the
// wiring view: wire node A's `next` output to node B's `chain` input, and so
// on. The wires are pure TOPOLOGY -- nothing ever "fires" along them; movers
// (e.g. the moving platform) read the chain to know where to travel. A chain
// whose last node wires back to the first forms a closed circuit.
//
//   inputs:  chain  (a previous node, or a mover's `follow`, points here)
//   outputs: next   (wire to the following node)
class PathNodeScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isLogicToy = true;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [
            { id: 'chain', label: 'Chain From Previous' },
        ];
        this.outputs = [
            { id: 'next', label: 'Next Node' },
        ];
    }

    // The node this one chains to, or null at the end of the path.
    nextNode() {
        const w = (this.inst.wires || []).find((w) => w.event === 'next');
        return w ? this.app.findInstance(w.toWo, w.toId) : null;
    }

    onInput(action) { /* chain is topology, not a live signal */ }

    update(isPlayMode, mode) {
        if (!isPlayMode) {
            // Build/wiring: a solid little marker to place and wire.
            this.inst.isVisible = true;
            this.inst.visibility = 1;
            this.inst.isPickable = true;
        } else {
            // Play: faint ghost so paths are debuggable but not intrusive.
            this.inst.isVisible = true;
            this.inst.visibility = 0.15;
            this.inst.isPickable = false;
        }
        this.inst.checkCollisions = false;   // never a physical obstacle
    }
}
