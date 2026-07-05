// BuoyScript
// ----------
// Marks a prop buoyant so PlayMode.updateFloaters bobs it on the water
// surface instead of letting it sink. The script itself is tiny: it flags
// the instance and records its half-height (so the prop rides mostly
// submerged), then remembers the prop's resting spot so a play reset drops
// it back where it started. All the floating math lives in PlayMode
// (updateFloaters + the shared waterSurfaceAt helper).
class BuoyScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.buoyant = true;
        this._home = null;
        this._homeSet = false;
    }

    _measure() {
        if (this.inst._floatHalf != null) return;
        try {
            this.inst.computeWorldMatrix(true);
            // Model-based props root at a TransformNode with no bounds of its
            // own: aggregate the whole hierarchy (root mesh AND children).
            let min = null, max = null;
            const meshes = [this.inst].concat(
                this.inst.getChildMeshes ? this.inst.getChildMeshes() : []);
            meshes.forEach((m) => {
                if (!m.getBoundingInfo || !m.getTotalVertices || !m.getTotalVertices()) return;
                m.computeWorldMatrix(true);
                const bb = m.getBoundingInfo().boundingBox;
                if (min == null) { min = bb.minimumWorld.y; max = bb.maximumWorld.y; }
                else {
                    min = Math.min(min, bb.minimumWorld.y);
                    max = Math.max(max, bb.maximumWorld.y);
                }
            });
            this.inst._floatHalf = min != null ? (max - min) / 2 : 0.4;
            if (!(this.inst._floatHalf > 0)) this.inst._floatHalf = 0.4;
        } catch (e) { this.inst._floatHalf = 0.4; }
    }

    // Remember where the prop was placed so a run reset restores it (a
    // floater can drift off its start over a long play session).
    onPlayReset(mode) {
        if (this._home) {
            this.inst.position.copyFrom(this._home);
            this.inst.rotation.y = 0;
            this.inst._floating = false;
        }
    }

    update(isPlayMode, mode) {
        this.inst.buoyant = true;
        this._measure();
        if (!this._homeSet) {
            this._home = this.inst.position.clone();
            this._homeSet = true;
        }
    }
}
