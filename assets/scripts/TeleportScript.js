// TeleportScript
// --------------
// l_teleport: a teleporter pad. Wire one pad's `link` output to another
// pad's `here` input, and stepping onto the first whisks the player to the
// second (their position, lifted a little). Wire it both ways for a
// two-way portal, or many pads into a hub. A shared just-teleported
// cooldown (mode._teleportCool) stops the destination pad from bouncing
// you straight back. Fires `used` for wiring (count trips, cut a camera).
// The `link` wire is a POINTER, not an action -- the destination's `here`
// input is a no-op wire anchor (the moving-platform `follow` pattern).
class TeleportScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'radius', label: 'Step radius', type: 'number', options: [1.5, 2, 3], default: 2 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'here', label: 'Link Target' },   // no-op anchor for a link wire
        ];
        this.outputs = [
            { id: 'link', label: 'Teleport To' },
            { id: 'used', label: 'Teleported' },
        ];

        this._pulse = 0;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) { /* `here` is only a wire anchor */ }

    _destination() {
        const wire = (this.inst.wires || []).find((w) => w.event === 'link');
        if (!wire) return null;
        const dest = this.app.findInstance(wire.toWo, wire.toId);
        return (dest && !dest.isDisposed()) ? dest : null;
    }

    update(isPlayMode, mode) {
        if (!isPlayMode || !mode || !mode.player) return;
        // A shared post-teleport cooldown lives on the mode so no pad fires
        // while it counts down (keeps the exit pad from ping-ponging you).
        if (mode._teleportCool == null) mode._teleportCool = 0;
        if (mode._teleportCool > 0) mode._teleportCool--;

        // On foot only -- a vehicle isn't teleported.
        if (mode.driving) return;

        const p = this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position;
        const d = BABYLON.Vector3.Distance(mode.player.position, p);
        if (d < (this.getParam('radius') || 2) && mode._teleportCool <= 0) {
            const dest = this._destination();
            if (dest) {
                const dp = dest.getAbsolutePosition ? dest.getAbsolutePosition() : dest.position;
                mode.player.position.copyFrom(dp.add(new BABYLON.Vector3(0, 1.2, 0)));
                mode._teleportCool = 30;   // frames of grace at the far pad
                this.app.sound.play('lock-on');
                if (mode.enemyManager && mode.enemyManager.spawnFlash) {
                    mode.enemyManager.spawnFlash(p.add(new BABYLON.Vector3(0, 0.6, 0)),
                        new BABYLON.Color3(0.6, 0.4, 1.0), 8);
                    mode.enemyManager.spawnFlash(dp.add(new BABYLON.Vector3(0, 0.6, 0)),
                        new BABYLON.Color3(0.6, 0.4, 1.0), 8);
                }
                this.app.fireEvent(this.inst, 'used');
            }
        }
    }
}
