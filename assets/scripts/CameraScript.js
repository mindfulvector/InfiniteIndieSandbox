// CameraScript
// ------------
// A logic-toy camera. When a wire activates it in play mode, the view cuts
// smoothly to this camera for `duration` seconds -- tracking the player or
// looking the way the camera faces -- while player input pauses (a cutaway),
// then returns to the normal follow camera. Fires `started` when the cut
// begins and `finished` when the view returns, so cameras can be chained
// into simple cinematics (camera1.finished -> camera2.activate).
//
//   params:  duration (s), focus ('player' tracks the player, 'fixed' looks
//            where the camera points)
//   inputs:  activate / release (end the cut early)
//   outputs: started / finished
class CameraScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isLogicToy = true;

        this.paramDefs = [
            { key: 'duration', label: 'Duration', type: 'number', options: [2, 3, 5, 8], default: 3, unit: 's' },
            { key: 'focus',    label: 'Focus',    type: 'enum',   options: ['player', 'fixed'], default: 'player' },
        ];
        this.eventDefs = [];

        this.inputs = [
            { id: 'activate', label: 'Cut To This Camera' },
            { id: 'release',  label: 'End Cut Early' },
        ];
        this.outputs = [
            { id: 'started',  label: 'Cut Started' },
            { id: 'finished', label: 'Cut Finished' },
        ];

        this._activateRequested = false;
        this._released = false;
        this._active = false;
        this._timeLeft = 0;
        this._saved = null;      // follow-camera pose to restore
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    createMaterial() {
        const m = new BABYLON.StandardMaterial('cameraToyMat', this.app.scene);
        m.diffuseColor = new BABYLON.Color3(0.22, 0.26, 0.38);
        m.emissiveColor = new BABYLON.Color3(0.35, 0.42, 0.62);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        m.alpha = 0.95;
        return m;
    }

    onInput(action, from) {
        switch (action) {
        case 'activate': this._activateRequested = true; break;
        case 'release':  this._released = true;          break;
        }
    }

    // World point this camera looks at in 'fixed' focus: a spot ahead of its
    // own facing (placement rotation aims the shot).
    fixedLookPoint() {
        const m = this.inst.getWorldMatrix();
        const fwd = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, 1), m);
        fwd.y = 0;
        if (fwd.lengthSquared() < 0.0001) fwd.set(0, 0, 1);
        fwd.normalize();
        return this.inst.getAbsolutePosition().add(fwd.scale(8));
    }

    begin(pm) {
        const cam = this.app.camera;
        // One cutaway at a time: ignore activations while another camera runs.
        if (pm._cameraToyActive && pm._cameraToyActive !== this) return;
        pm._cameraToyActive = this;
        this._saved = {
            alpha: cam.alpha, beta: cam.beta, radius: cam.radius,
            target: cam.target ? cam.target.clone() : BABYLON.Vector3.Zero(),
        };
        if (pm.cc) pm.cc.stop();     // pause player input/motion for the cutaway
        this._active = true;
        this._released = false;
        this._timeLeft = this.getParam('duration');
        this.app.fireEvent(this.inst, 'started');
    }

    finish(pm) {
        const cam = this.app.camera;
        if (this._saved) {
            cam.setTarget(this._saved.target);
            cam.alpha = this._saved.alpha;
            cam.beta = this._saved.beta;
            cam.radius = this._saved.radius;
        }
        this._saved = null;
        this._active = false;
        this._released = false;
        if (pm && pm.cc) pm.cc.start();
        if (pm) pm._cameraToyActive = null;
        this.app.fireEvent(this.inst, 'finished');
    }

    update(isPlayMode, pm) {
        if (!isPlayMode) {
            // Leaving play mode tears the mode down; just drop any cut state.
            this._active = false;
            this._activateRequested = false;
            this._saved = null;
            this.inst.isVisible = true;    // visible/editable in build mode
            return;
        }
        this.inst.isVisible = true;        // cameras stay visible as props

        if (this._activateRequested) {
            this._activateRequested = false;
            if (pm && pm.player) this.begin(pm);
        }
        if (!this._active) return;

        const cam = this.app.camera;
        const dt = Math.min(0.1, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._timeLeft -= dt;

        // Ease the view to the camera's spot; aim per the focus parameter.
        const pos = this.inst.getAbsolutePosition().add(new BABYLON.Vector3(0, 0.6, 0));
        const look = (this.getParam('focus') === 'player' && pm.player)
            ? pm.player.position.add(new BABYLON.Vector3(0, 1.2, 0))
            : this.fixedLookPoint();
        cam.setPosition(BABYLON.Vector3.Lerp(cam.position, pos, 0.18));
        cam.setTarget(BABYLON.Vector3.Lerp(cam.target, look, 0.25));

        if (this._timeLeft <= 0 || this._released) this.finish(pm);
    }
}
