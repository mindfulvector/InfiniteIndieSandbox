// MountScript
// -----------
// Makes pr_mount a ridable creature ("Strider") on the shared vehicle seat
// (PlayMode.mountKart/updateDriving), customized through vehicleProfile:
// slower than the kart but it pivots in place, JUMPS on Space, and dismounts
// on C. The legs (children named mleg*) trot in proportion to speed, so the
// beast reads alive while ridden. Same walk-up mount handshake and home/
// restPos parking as the kart.
class MountScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [];

        this.vehicleProfile = {
            max: 7,
            accel: 16,
            turn: 3.4,
            seatY: 1.5,
            canJump: true,
            turnInPlace: true,
            hint: 'Saddle up!  WASD rides · Space jumps · C hops off',
        };

        this._home = null;
        this._homeYaw = 0;
        this._legs = null;
        this._trotPhase = 0;
        this._wasPlay = null;
        inst._mountCooldown = 0;
    }

    onPlayReset(mode) {
        if (mode && mode.driving === this.inst && mode.dismountKart) mode.dismountKart();
        if (this._home) {
            this.inst.position.copyFrom(this._home);
            this.inst.rotationQuaternion = null;
            this.inst.rotation.y = this._homeYaw;
        }
        this.inst._kartSpeed = 0;
    }

    _resolveLegs() {
        if (this._legs) return this._legs;
        const kids = this.inst.getChildMeshes ? this.inst.getChildMeshes() : [];
        // The ROOT's ellipsoid is the beast's physical body; the children
        // must not collide -- moveWithCollisions does NOT exclude your own
        // children, and the head (which sits inside the ellipsoid) was
        // blocking the mount's own jump: vy fired, rise stayed exactly 0.
        kids.forEach((m) => { m.checkCollisions = false; });
        this._legs = kids.filter((m) => m.name && m.name.indexOf('mleg') >= 0);
        return this._legs;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) {
                    inst.position.copyFrom(this._home);
                    inst.rotationQuaternion = null;
                    inst.rotation.y = this._homeYaw;
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

        // Trot the legs in proportion to riding speed; settle when parked.
        const legs = this._resolveLegs();
        const speed = Math.abs(inst._kartSpeed || 0);
        if (speed > 0.3) {
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            this._trotPhase += dt * (4 + speed * 1.6);
            legs.forEach((leg, i) => {
                leg.rotation.x = Math.sin(this._trotPhase + (i % 2 ? Math.PI : 0)) * 0.55;
            });
        } else {
            legs.forEach((leg) => { leg.rotation.x *= 0.8; });
        }

        // Walk-up mount, the kart handshake.
        const player = mode && mode.player;
        if (player && !mode.driving && inst._mountCooldown <= 0 && mode.mountKart) {
            const d = BABYLON.Vector3.Distance(player.position, inst.position);
            if (d < 1.6) mode.mountKart(inst);
        }
    }
}
