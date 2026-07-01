// EnemyScript
// -----------
// Turns a world object into an attackable enemy. The heavy lifting (taking
// damage, dying, dropping pixels) is driven by PlayMode, which enumerates every
// instance flagged `isEnemy`; this script just tags the instance, gives it a
// look, and adds a little life (bobbing + facing the player) in play mode.
class EnemyScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 3;
        inst.hp = 3;
        inst.defeated = false;

        this.eventDefs = [];
        this._phase = ((inst.worldId || 1) * 1.7) % (Math.PI * 2);
        this._baseY = null;
        this._t = 0;
    }

    update(isPlayMode, modeObject) {
        const inst = this.inst;
        if (!isPlayMode) {
            // In build mode it's just a placeable prop.
            return;
        }
        if (inst.defeated) return;

        this._t += 1;

        // Remember the resting height the first time we run in play mode.
        if (this._baseY === null) this._baseY = inst.position.y;

        // Gentle bob so it reads as "alive".
        inst.position.y = this._baseY + Math.sin(this._t * 0.08 + this._phase) * 0.12;

        // Face the player (yaw only).
        const player = modeObject && modeObject.player;
        if (player) {
            const dx = player.position.x - inst.position.x;
            const dz = player.position.z - inst.position.z;
            if (dx * dx + dz * dz > 0.0001) {
                const yaw = Math.atan2(dx, dz);
                inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(yaw, 0, 0);
            }
        }
    }
}
