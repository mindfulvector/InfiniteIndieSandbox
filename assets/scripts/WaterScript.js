// WaterScript
// -----------
// Makes t_water a SWIM VOLUME: a translucent block you can walk (fall)
// into. It must neither collide (you enter it) nor be pickable (the CC's
// ground ray would read the surface as floor and let you walk on water --
// the pocket-room lesson, inverted). The swimming itself lives in
// PlayMode.updateSwimming: low gravity while submerged, halved move speed,
// and held-Space strokes upward capped just under the surface.
class WaterScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [];
        this._prepped = false;
    }

    update(isPlayMode, mode) {
        if (this._prepped) return;
        this._prepped = true;
        const inst = this.inst;
        inst.checkCollisions = false;
        inst.isPickable = false;
        (inst.getChildMeshes ? inst.getChildMeshes() : []).forEach((m) => {
            m.checkCollisions = false;
            m.isPickable = false;
        });
        // The template material is shared by every water block -- which is
        // exactly right: all water is equally translucent. Idempotent.
        if (inst.material && inst.material.alpha > 0.6) {
            inst.material.alpha = 0.55;
            inst.material.backFaceCulling = false;
        }
    }
}
