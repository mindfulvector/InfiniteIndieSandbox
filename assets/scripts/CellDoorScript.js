// CellDoorScript
// --------------
// A doorway into a pocket interior: walking into the glowing panel teleports
// the player to a small decorated room, and stepping onto the room's exit pad
// teleports them back to where they entered. The room is built from RAW scene
// meshes (never WorldObject instances) at a far-away cell origin unique to
// this door, so it can't pollute world saves or the build-mode object list;
// it is built on the first entry of a play session and disposed when the
// session leaves play mode.
//
//   params:  theme — 'cozy' (furnished den) or 'hall' (columned gallery)
//   outputs: entered / exited  (wire to counters, spawners, cameras...)
//
// While the player is inside, PlayMode.insideCell is true and the outdoor
// enemies freeze (EnemyManager checks the flag) -- the outside world politely
// waits, and nothing hunts a player who is 5000 units away in a pocket room.
class CellDoorScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'theme', label: 'Interior', type: 'enum', options: ['cozy', 'hall'], default: 'cozy' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'entered', label: 'Player Entered' },
            { id: 'exited',  label: 'Player Exited' },
        ];

        this._cellMeshes = [];
        this._inside = false;
        this._cooldown = 0;      // frames before the next teleport can fire
        this._returnSpot = null;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    // Each door instance gets its own far-away cell origin.
    _cellOrigin() {
        return new BABYLON.Vector3(5000 + (this.inst.worldId || 0) * 60, 0, 5000);
    }

    _box(name, w, hgt, d, pos, color, collide) {
        const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: hgt, depth: d }, this.app.scene);
        b.position = pos;
        const m = new BABYLON.StandardMaterial(name + 'Mat', this.app.scene);
        m.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
        m.emissiveColor = new BABYLON.Color3(color[0] * 0.25, color[1] * 0.25, color[2] * 0.25);
        b.material = m;
        b.checkCollisions = !!collide;
        b.isPickable = false;
        this._cellMeshes.push(b);
        return b;
    }

    // Build the interior at the cell origin. Walls/floor collide; the exit
    // pad is a glowing disc just inside the "door" wall.
    _buildCell() {
        if (this._cellMeshes.length) return;
        const o = this._cellOrigin();
        const V = (dx, dy, dz) => new BABYLON.Vector3(o.x + dx, o.y + dy, o.z + dz);
        const wood = [0.45, 0.30, 0.18], brick = [0.55, 0.28, 0.22], warm = [1.0, 0.85, 0.45];

        // No ceiling: the follow camera looks down into the room dollhouse-
        // style, which reads far better than fighting walls for a viewpoint.
        this._box('cellFloor', 10, 0.4, 10, V(0, -0.2, 0), wood, true);
        this._box('cellWallN', 10, 3.4, 0.3, V(0, 1.7, 5), brick, true);
        this._box('cellWallS', 10, 3.4, 0.3, V(0, 1.7, -5), brick, true);
        this._box('cellWallE', 0.3, 3.4, 10, V(5, 1.7, 0), brick, true);
        this._box('cellWallW', 0.3, 3.4, 10, V(-5, 1.7, 0), brick, true);

        if (this.getParam('theme') === 'hall') {
            for (let i = -1; i <= 1; i += 2) {
                for (let j = -1; j <= 1; j += 2) {
                    this._box('cellCol', 0.5, 3.4, 0.5, V(i * 2.6, 1.7, j * 2.6), [0.75, 0.72, 0.68], true);
                }
            }
        } else {
            this._box('cellTable', 1.8, 0.8, 1.0, V(1.5, 0.4, 1.5), wood, true);
            this._box('cellChair', 0.5, 1.0, 0.5, V(0.4, 0.5, 1.5), wood, true);
            this._box('cellRug', 3.0, 0.06, 2.0, V(0, 0.05, -0.5), [0.62, 0.22, 0.28], false);
            this._box('cellLampGlow', 0.5, 0.5, 0.5, V(-3.8, 2.2, 3.8), warm, false);
        }

        // Exit pad by the south wall: step on it to leave.
        const pad = this._box('cellExitPad', 1.6, 0.12, 1.6, V(0, 0.08, -4.0), [0.35, 0.85, 1.0], false);
        pad.material.emissiveColor = new BABYLON.Color3(0.30, 0.75, 0.95);
        this._exitSpot = V(0, 0.5, -4.0);
        this._entrySpot = V(0, 0.5, -2.6);   // arrive just in front of the pad
    }

    _disposeCell() {
        this._cellMeshes.forEach((m) => m.dispose(false, true));
        this._cellMeshes = [];
    }

    _setInside(pm, inside) {
        this._inside = inside;
        pm.insideCell = inside;
        this._cooldown = 30;
    }

    // Teleport the player AND drag the follow camera along by the same delta,
    // so the view arrives with them instead of flying 5000 units across the
    // world (or staring at the room from outside).
    _teleport(player, to) {
        const delta = to.subtract(player.position);
        player.position.copyFrom(to);
        if (this.app.camera && this.app.camera.position) {
            this.app.camera.position.addInPlace(delta);
        }
    }

    onPlayReset(mode) {
        // Death/reset while inside: respawn() already moved the player to the
        // world spawn point; just drop the inside state so the world unfreezes.
        if (this._inside) this._setInside(mode, false);
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._inside = false;
                this._disposeCell();
            }
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            this._inside = false;
            this._cooldown = 0;
        }
        if (this._cooldown > 0) this._cooldown--;

        const player = mode && mode.player;
        if (!player || this._cooldown > 0) return;

        if (!this._inside) {
            // Walk into the doorway: teleport in.
            const doorPos = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
            const d = BABYLON.Vector3.Distance(
                new BABYLON.Vector3(player.position.x, doorPos.y, player.position.z), doorPos);
            if (d < 1.3) {
                this._buildCell();
                this._returnSpot = player.position.clone();
                this._teleport(player, this._entrySpot);
                this._setInside(mode, true);
                this.app.fireEvent(inst, 'entered');
                this.app.toasty('You step inside...');
            }
        } else {
            // Step on the exit pad: teleport back out. The return spot was by
            // definition inside the door's trigger radius, so push it clear --
            // otherwise the door would swallow the player again as soon as
            // the cooldown expired (an endless yo-yo).
            if (this._exitSpot &&
                BABYLON.Vector3.Distance(player.position, this._exitSpot) < 1.1) {
                const doorPos = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                let out = (this._returnSpot || mode.spawnPoint).clone();
                const flat = new BABYLON.Vector3(out.x - doorPos.x, 0, out.z - doorPos.z);
                if (flat.lengthSquared() < 2.56) {   // within 1.6 of the door
                    const dir = flat.lengthSquared() > 0.0001
                        ? flat.normalize() : new BABYLON.Vector3(0, 0, -1);
                    out = new BABYLON.Vector3(
                        doorPos.x + dir.x * 2.0, out.y, doorPos.z + dir.z * 2.0);
                }
                this._teleport(player, out);
                this._setInside(mode, false);
                this.app.fireEvent(inst, 'exited');
                this.app.toasty('Back outside.');
            }
        }
    }
}
