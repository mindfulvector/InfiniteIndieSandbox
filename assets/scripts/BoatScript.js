// BoatScript
// ----------
// Makes pr_boat a drivable WATERCRAFT. Identical mount/rest handshake to the
// kart (walk-up mount, restPos home, park-on-reset), but its vehicleProfile
// carries `watercraft: true`, which makes PlayMode.updateDriving ride it on
// the water surface (see the watercraft branch there, reusing waterTopAt).
// It belongs on the water -- beach it on dry land and it just sits there.
class BoatScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [];

        this.vehicleProfile = {
            watercraft: true,
            max: 9, accel: 9, turn: 2.0, seatY: 1.1,
            canJump: false, turnInPlace: false,
            hint: 'Cast off!  WASD sails on water · Space hops out',
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

        const player = mode && mode.player;
        if (player && !mode.driving && inst._mountCooldown <= 0 && mode.mountKart) {
            const d = BABYLON.Vector3.Distance(player.position, inst.position);
            if (d < 1.6) mode.mountKart(inst);
        }
    }
}
