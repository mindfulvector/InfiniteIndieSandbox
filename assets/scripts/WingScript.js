// WingScript
// ----------
// Makes pr_wing the "Sky-Wing", a flyable glider on the shared vehicle seat
// (PlayMode.mountKart/updateDriving) via vehicleProfile.canFly: build speed
// on the runway, HOLD Space to climb once you have airspeed, release to
// glide (the seat caps the sink rate while you keep speed), slow down to
// stall and settle. C hops off. The whole wing banks into turns (reading
// inst._lastSteer, which the seat records) so flight reads alive. Same
// walk-up mount handshake and home/restPos parking as the kart and mount.
class WingScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [];

        this.vehicleProfile = {
            armed: true,
            max: 14,
            accel: 10,
            turn: 2.2,
            seatY: 1.1,
            canFly: true,
            hint: 'Take the Sky-Wing!  W speed · Space climb · F/LMB guns · C bails',
        };

        this._home = null;
        this._homeYaw = 0;
        this._wasPlay = null;
        this._kidsFreed = false;
        inst._mountCooldown = 0;
    }

    onPlayReset(mode) {
        if (mode && mode.driving === this.inst && mode.dismountKart) mode.dismountKart();
        if (this._home) {
            this.inst.position.copyFrom(this._home);
            this.inst.rotationQuaternion = null;
            this.inst.rotation.y = this._homeYaw;
            this.inst.rotation.z = 0;
        }
        this.inst._kartSpeed = 0;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!this._kidsFreed) {
            // The root ellipsoid is the airframe; children must not collide
            // (the mount lesson: moveWithCollisions doesn't exclude your own
            // children, and a wing overlapping the ellipsoid pins you down).
            this._kidsFreed = true;
            (inst.getChildMeshes ? inst.getChildMeshes() : [])
                .forEach((m) => { m.checkCollisions = false; });
        }
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) {
                    inst.position.copyFrom(this._home);
                    inst.rotationQuaternion = null;
                    inst.rotation.y = this._homeYaw;
                    inst.rotation.z = 0;
                }
                inst._kartSpeed = 0;
            }
            this._home = inst.position.clone();
            this._homeYaw = inst.rotation ? inst.rotation.y : 0;
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) {
                this._home = inst.position.clone();
                this._homeYaw = inst.rotation ? inst.rotation.y : 0;
                inst.restPos = this._home;
            }
        }
        if (inst._mountCooldown > 0) inst._mountCooldown--;

        // Bank into turns while airborne; level out on the ground.
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        const flying = mode && mode.driving === inst &&
            inst._kartBody && !inst._kartBody.grounded;
        const targetBank = flying ? -(inst._lastSteer || 0) * 0.35 : 0;
        inst.rotation.z += (targetBank - inst.rotation.z) * Math.min(1, 6 * dt);

        // Walk-up mount, the kart handshake.
        const player = mode && mode.player;
        if (player && !mode.driving && inst._mountCooldown <= 0 && mode.mountKart) {
            const d = BABYLON.Vector3.Distance(player.position, inst.position);
            if (d < 1.6) mode.mountKart(inst);
        }
    }
}
