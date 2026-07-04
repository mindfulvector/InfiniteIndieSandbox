// EnemyScript
// -----------
// Turns a world object into an attackable enemy. The heavy lifting (taking
// damage, dying, dropping pixels) is driven by PlayMode, which enumerates every
// instance flagged `isEnemy`; this script tags the instance, gives it a little
// life (bobbing + facing the player), and can PATROL: wire the enemy's
// `patrol` output to an l_pathnode's `chain` input and it walks the node chain
// in play mode (loop or ping-pong), pausing to stare whenever the player comes
// close. Patrol progress tracks a logical path position (_pathPos) separate
// from the rendered position, so the bob never accumulates into the route.
class EnemyScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 3;
        inst.hp = 3;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'patrolSpeed', label: 'Patrol speed', type: 'number', options: [1, 2, 3], default: 2 },
            { key: 'patrolMode',  label: 'Patrol mode',  type: 'enum',   options: ['loop', 'pingpong'], default: 'loop' },
        ];
        // The defaults are right unless a patrol is wired -- don't interrupt
        // placement with a popup (same rationale as the door).
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'patrol', label: 'Patrol Path From' },
        ];

        this._phase = ((inst.worldId || 1) * 1.7) % (Math.PI * 2);
        this._t = 0;
        this._baseY = null;     // stationary-bob rest height
        this._home = null;      // placed position (build-mode pose)
        this._path = null;      // resolved patrol node positions
        this._pathPos = null;   // logical position along the route (no bob)
        this._idx = 0;
        this._dir = 1;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onPlayReset(mode) {
        if (this.inst.defeated) return;
        this._startRun();
    }

    _startRun() {
        const chain = this.app.resolvePathChain(this.inst, 'patrol');
        this._path = chain.points;
        this._idx = 0;
        this._dir = 1;
        this._baseY = null;
        // Only patrolling blobs are repositioned; a pathless blob stays put so
        // external moves (build-mode grabs, tests) always stick.
        if (this._path.length > 1) {
            this._pathPos = this._path[0].clone();
            this.inst.position.copyFrom(this._pathPos);
            this._idx = 1;
        } else {
            this._pathPos = null;
        }
    }

    _advance() {
        const n = this._path.length;
        if (this.getParam('patrolMode') === 'pingpong') {
            if (this._idx + this._dir >= n || this._idx + this._dir < 0) this._dir = -this._dir;
            this._idx += this._dir;
        } else {
            this._idx = (this._idx + 1) % n;
        }
    }

    update(isPlayMode, modeObject) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
            }
            // Build-mode pose is home; restPos keeps saves clean mid-patrol
            // (and mid-bob, which the old restY-less bobbing never was).
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (inst.defeated) return;

        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
            this._startRun();
            return;
        }

        this._t += 1;
        const player = modeObject && modeObject.player;
        const bob = Math.sin(this._t * 0.08 + this._phase) * 0.12;
        const patrolling = !!(this._pathPos && this._path && this._path.length > 1);

        if (patrolling) {
            // Walk the chain unless the player is close enough to watch.
            const playerNear = player &&
                BABYLON.Vector3.Distance(player.position, this._pathPos) < 6;
            if (!playerNear) {
                const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
                const step = (this.getParam('patrolSpeed') || 2) * dt;
                const target = this._path[this._idx];
                const to = target.subtract(this._pathPos);
                const dist = to.length();
                if (dist <= step) {
                    this._pathPos.copyFrom(target);
                    this._advance();
                } else {
                    this._pathPos.addInPlace(to.scale(step / dist));
                }
            }
            // Rendered position = logical route position + the bob.
            inst.position.copyFrom(this._pathPos);
            inst.position.y += bob;

            // Face the player when near, otherwise face along the walk.
            let dx, dz;
            if (playerNear && player) {
                dx = player.position.x - inst.position.x;
                dz = player.position.z - inst.position.z;
            } else {
                const target = this._path[this._idx];
                dx = target.x - this._pathPos.x;
                dz = target.z - this._pathPos.z;
            }
            if (dx * dx + dz * dz > 0.0001) {
                inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(dx, dz), 0, 0);
            }
            return;
        }

        // No patrol: the original stationary blob -- bob in place (y only, so
        // external repositioning sticks) and face the player.
        if (this._baseY === null) this._baseY = inst.position.y;
        inst.position.y = this._baseY + bob;
        if (player) {
            const dx = player.position.x - inst.position.x;
            const dz = player.position.z - inst.position.z;
            if (dx * dx + dz * dz > 0.0001) {
                inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(dx, dz), 0, 0);
            }
        }
    }
}
