// KartScript
// ----------
// Makes pr_kart a drivable hover-kart. The script owns the kart's rest pose
// and the mount handshake; the actual DRIVING lives in PlayMode
// (mountKart / updateDriving / dismountKart), which is where the player,
// controller, and camera live.
//
// Mounting is walk-up: stand within 1.4 units in play mode and you're in
// (with a re-mount cooldown after hopping out, the cell-door pattern).
// The rest pose uses restPos so mid-drive saves store the parked spot, and
// build mode / play resets park it back.
class KartScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [];

        // The shared seat's kart tuning (explicit, though it matches the
        // seat defaults): fast, speed-scaled steering, Space dismounts.
        this.vehicleProfile = {
            armed: true,
            max: 10, accel: 12, turn: 2.4, seatY: 1.0,
            canJump: false, turnInPlace: false,
            hint: 'Hop in!  WASD drives · F/LMB guns · Space hops out',
        };

        this._home = null;
        this._wasPlay = null;
        inst._mountCooldown = 0;
    }

    onPlayReset(mode) {
        // Death mid-drive: PlayMode dismounts (it broadcasts after its own
        // respawn bookkeeping); we just park the kart back at home.
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
            // Build-mode pose is home; restPos keeps saves clean mid-drive.
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

        // Walk-up mount: hand the player to PlayMode's driving seat.
        const player = mode && mode.player;
        if (player && !mode.driving && inst._mountCooldown <= 0 && mode.mountKart) {
            const d = BABYLON.Vector3.Distance(player.position, inst.position);
            if (d < 1.4) mode.mountKart(inst);
        }
    }
}
