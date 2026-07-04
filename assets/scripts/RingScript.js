// RingScript
// ----------
// Makes l_ring an aerial checkpoint hoop: it fires `flown` (edge-triggered
// -- leave the zone before it can fire again) when the player OR the
// vehicle they're riding passes through. Wire rings straight into l_race
// (start / checkpoint / finish) and you have a fly-through course with the
// stock race machinery. The glowing torus is a per-instance script mesh
// with its own material (clone children share the template's -- the known
// trap), standing upright with the placed yaw, flashing on a fly-through.
class RingScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'flown', label: 'Flown Through' },
        ];

        this._inside = false;
        this._torus = null;
        this._flash = 0;
        this._pulse = 0;
    }

    _ensureVisual() {
        if (this._torus) return;
        const inst = this.inst;
        const torus = BABYLON.MeshBuilder.CreateTorus('ringTorus' + inst.worldId,
            { diameter: 4.2, thickness: 0.22, tessellation: 24 }, this.app.scene);
        const mat = new BABYLON.StandardMaterial('ringMat' + inst.worldId, this.app.scene);
        mat.emissiveColor = new BABYLON.Color3(0.25, 0.85, 0.95);
        mat.disableLighting = true;
        mat.alpha = 0.85;
        torus.material = mat;
        torus.isPickable = false;
        torus.checkCollisions = false;
        torus.parent = inst;
        torus.rotation.x = Math.PI / 2;   // stand the hoop upright
        this._torus = torus;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        this._ensureVisual();

        // Ambient glow pulse; a fly-through flash decays back to it.
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._pulse += dt * 2.5;
        const mat = this._torus.material;
        if (this._flash > 0) {
            this._flash--;
            mat.emissiveColor = new BABYLON.Color3(0.7, 1.0, 1.0);
            mat.alpha = 1.0;
        } else {
            mat.emissiveColor = new BABYLON.Color3(0.25, 0.85, 0.95);
            mat.alpha = 0.7 + 0.2 * Math.sin(this._pulse);
        }

        if (!isPlayMode) { this._inside = false; return; }
        if (!mode || !mode.player) return;

        // The player, or the vehicle carrying them (the kart-trigger
        // lesson: a seated rider's own mesh floats above trigger volumes).
        const probes = [mode.player.position];
        if (mode.driving) probes.push(mode.driving.position);
        const near = probes.some((p) =>
            BABYLON.Vector3.Distance(p, inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position) < 2.2);
        if (near && !this._inside) {
            this._inside = true;
            this._flash = 18;
            this.app.fireEvent(inst, 'flown');
        } else if (!near) {
            this._inside = false;
        }
    }
}
