// SpeederScript
// -------------
// Makes pr_speeder the "Speeder", a fast hover-bike on the shared vehicle
// seat (PlayMode.mountKart/updateDriving). Where the kart is the armed
// combat cruiser, the Speeder is the pure-speed TRAVERSAL machine: a high
// base speed, an aggressive Shift BOOST (the fastest thing in the sandbox),
// nimble steering, and no guns. It LEANS hard into turns -- borrowing the
// Sky-Wing's banking idiom (reading inst._lastSteer, which the seat records)
// but on the ground, scaled by speed so a parked bike sits upright. Same
// walk-up mount handshake and home/restPos parking as the kart.
class SpeederScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [];

        // Fast and nimble, with the sandbox's strongest boost. Unarmed
        // (the kart owns drive-by combat); Space hops out.
        this.vehicleProfile = {
            armed: false,
            max: 16, accel: 16, turn: 3.2, seatY: 0.9,
            boostMax: 26, boostAccel: 34,
            canJump: false, turnInPlace: false,
            hint: 'Ride the Speeder!  WASD drives · Shift BOOSTS · Space hops out',
        };

        this._home = null;
        this._homeYaw = 0;
        this._wasPlay = null;
        inst._mountCooldown = 0;
    }

    onPlayReset(mode) {
        if (mode && mode.driving === this.inst && mode.dismountKart) mode.dismountKart();
        if (this._home) {
            this.inst.position.copyFrom(this._home);
            this.inst.rotationQuaternion = null;
            this.inst.rotation.y = this._homeYaw || 0;
            this.inst.rotation.z = 0;
        }
        this.inst._kartSpeed = 0;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) {
                    inst.position.copyFrom(this._home);
                    inst.rotationQuaternion = null;
                    inst.rotation.y = this._homeYaw || 0;
                    inst.rotation.z = 0;
                }
                inst._kartSpeed = 0;
            }
            // Build-mode pose is home; restPos keeps saves clean mid-ride.
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

        // Lean into turns while riding, scaled by speed so a crawling or
        // parked bike stays upright; level out otherwise. A boosting rider
        // leans a touch deeper for drama.
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        const riding = mode && mode.driving === inst;
        const speedFrac = Math.min(1, Math.abs(inst._kartSpeed || 0) / (this.vehicleProfile.max * 0.5));
        const leanScale = inst._boosting ? 0.5 : 0.4;
        const targetLean = riding ? -(inst._lastSteer || 0) * leanScale * speedFrac : 0;
        inst.rotation.z += (targetLean - inst.rotation.z) * Math.min(1, 8 * dt);

        // Walk-up mount: hand the player to PlayMode's driving seat.
        const player = mode && mode.player;
        if (player && !mode.driving && inst._mountCooldown <= 0 && mode.mountKart) {
            const d = BABYLON.Vector3.Distance(player.position, inst.position);
            if (d < 1.5) mode.mountKart(inst);
        }
    }
}
