// CannonScript
// -----------
// pr_cannon: a barrel cannon that flings the player along the way it faces.
// Step into its mouth and it fires you in a ballistic arc (height + a
// decaying forward impulse via PlayMode.launchPlayer) -- a big traversal
// blast across a chasm or up to a ledge, aimed by rotating the barrel in
// build mode. A per-cannon cooldown stops it re-firing the instant you
// land near it, and it fires `fired` for wiring. Rotate the barrel to aim:
// the launch direction is the cannon's local +z (its forward), same basis
// as the player avatar's front.
class CannonScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'power',  label: 'Launch power', type: 'number', options: [10, 14, 18], default: 14 },
            { key: 'reach',  label: 'Distance',     type: 'number', options: [15, 26, 40], default: 26 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'fired', label: 'Cannon Fired' },
        ];

        this._cool = 0;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) { this._cool = 0; }

    // The barrel's forward direction from its yaw (rotationQuaternion or the
    // euler .rotation.y), so aiming = rotating the cannon in build mode.
    _forward() {
        let yaw = 0;
        if (this.inst.rotationQuaternion) yaw = this.inst.rotationQuaternion.toEulerAngles().y;
        else if (this.inst.rotation) yaw = this.inst.rotation.y;
        return new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    }

    update(isPlayMode, mode) {
        // The barrel is intangible so the launch isn't stopped by its own
        // prims (you step in and fly out); the platform under it holds you up.
        this.inst.checkCollisions = false;
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => { m.checkCollisions = false; });
        if (!isPlayMode || !mode || !mode.player) return;
        if (this._cool > 0) { this._cool--; return; }
        if (mode.driving || mode.grinding) return;

        const p = this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position;
        if (BABYLON.Vector3.Distance(mode.player.position, p) < 1.6) {
            const fwd = this._forward();
            const power = this.getParam('power') || 14;
            const reach = this.getParam('reach') || 26;
            // Distance param scales both the forward speed and the flight time.
            mode.launchPlayer(fwd, power, 0.35 + reach * 0.012, Math.round(reach * 0.9));
            this._cool = 45;
            this.app.sound.play('jump');
            if (mode.enemyManager && mode.enemyManager.spawnFlash) {
                mode.enemyManager.spawnFlash(p.add(fwd.scale(1.2)).add(new BABYLON.Vector3(0, 0.8, 0)),
                    new BABYLON.Color3(1.0, 0.85, 0.3), 8);
            }
            this.app.fireEvent(this.inst, 'fired');
        }
    }
}
