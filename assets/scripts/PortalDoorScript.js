// PortalDoorScript
// ----------------
// A Portal Door leads to a NAMED SUB-LEVEL stored inside the current world's
// save -- the Disney-Infinity pattern: if the level behind the door doesn't
// exist yet, it is created (and named) on first entry. Walking into the
// glowing panel swaps the WHOLE scene to the sub-world; the sub-world's own
// exit portal swaps back. Because the sub-level is a real world, everything
// just works inside it: build mode, wiring, saves -- even more portal doors.
//
//   params:  mode  - 'portal' (leads to a sub-level; the default) or
//                    'exit' (returns to the parent world)
//            world - the sub-level's name; set by the naming prompt on first
//                    entry (pre-set it on authored worlds to skip the prompt)
//   outputs: entered / exited  (fire on the door in the PARENT world)
//
// The actual swap is deferred to PlayMode.doPortal (top of the next update):
// it disposes every instance in the scene, so it must never run from inside
// the script-update loop that this update() is part of.
class PortalDoorScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'mode', label: 'Direction', type: 'enum', options: ['portal', 'exit'], default: 'portal' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'entered', label: 'Player Entered' },
            { id: 'exited',  label: 'Player Exited' },
        ];

        this._cooldown = 0;
        this._prompting = false;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    // The starter room a brand-new sub-level is seeded with: an 8x8 furnished
    // den whose north wall carries the exit portal. Plain instance data --
    // the same records a save file holds -- so the seed loads like any world.
    static starterRoomData() {
        const Y90 = { x: 0, y: 0.7071067811865476, z: 0, w: 0.7071067811865476 };
        const objects = [];
        let ids = {};
        const add = (wo, x, y, z, ro, pr) => {
            ids[wo] = (ids[wo] || 0) + 1;
            const rec = { wo: wo, id: ids[wo], po: { x: x, y: y, z: z } };
            if (ro) rec.ro = ro;
            if (pr) rec.pr = pr;
            objects.push(rec);
        };
        for (const fx of [-2, 2]) for (const fz of [-2, 2]) add('in_floor', fx, 0, fz);
        for (const w of [-2, 2]) {
            add('in_wall', w, 1.5, 4);
            add('in_wall', w, 1.5, -4);
            add('in_wall', 4, 1.5, w, Y90);
            add('in_wall', -4, 1.5, w, Y90);
        }
        add('d_table', 1.5, 0.905, 1.5);
        add('d_chair', 0.3, 0.675, 1.5);
        add('d_rug', 0, 0.15, -0.5);
        add('d_lamp', -3.2, 0.155, 3.2);
        // The way home, centred against the north wall.
        add('pr_door_cell', -0.8, 1.5, 3.4, null, { mode: 'exit' });
        return { objects: objects };
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            this._wasPlay = false;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            this._cooldown = 20;   // never trigger in the same instant play starts
        }
        if (this._cooldown > 0) { this._cooldown--; return; }

        const pm = mode;
        const player = pm && pm.player;
        if (!player || pm.pendingPortal) return;

        const doorPos = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
        const d = BABYLON.Vector3.Distance(
            new BABYLON.Vector3(player.position.x, doorPos.y, player.position.z), doorPos);
        if (d >= 1.3) return;

        if (this.getParam('mode') === 'exit') {
            // The way back up: only meaningful inside a sub-level.
            if (!this.app.worldStack.length) return;
            this._cooldown = 30;
            pm.pendingPortal = { type: 'exit' };
            return;
        }

        // A portal into a sub-level: name it on first use (creating a
        // sub-level names it, exactly like naming a root save).
        let name = this.getParam('world');
        if (!name) {
            if (this._prompting) return;
            this._prompting = true;
            this.app.promptText('Name this sub-level:', 'Hidden Room', (v) => {
                this._prompting = false;
                this._cooldown = 45;   // cancelled or accepted: don't re-prompt instantly
                if (!v) return;
                if (!this.inst.params) this.inst.params = {};
                this.inst.params.world = v;   // serialized with the door ('pr')
            });
            return;
        }
        this._cooldown = 30;
        this.app.fireEvent(inst, 'entered');   // parent-world wiring reacts first
        pm.pendingPortal = {
            type: 'enter',
            name: name,
            seed: PortalDoorScript.starterRoomData(),
            doorId: inst.worldId,
        };
    }
}
