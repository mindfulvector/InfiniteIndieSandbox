// SpitterScript
// -------------
// en_spitter: an ARTILLERY enemy. Where the turret fires flat bolts you can
// duck behind a wall to avoid, the spitter LOBS arcing shots that sail over
// cover and rain down on where you're standing -- so the counter isn't cover,
// it's to keep MOVING (the shot lands where you *were*). It's stationary and
// fragile; rush it or pick it off. Manages its own parabolic projectiles (no
// enemyManager array touched), splash-damages on impact within a radius,
// fires `lobbed` on launch and `impact` on landing. Ordinary attackable enemy.
class SpitterScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 2;
        inst.hp = 2;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'toughness', label: 'Hits to kill', type: 'number', options: [2, 3, 5],    default: 2 },
            { key: 'range',     label: 'Fire range',   type: 'number', options: [10, 16, 24],  default: 16 },
            { key: 'cadence',   label: 'Every',        type: 'number', options: [60, 90, 120], default: 90, unit: 'f' },
            { key: 'splash',    label: 'Splash',       type: 'number', options: [2, 3, 4],     default: 3 },
            { key: 'damage',    label: 'Damage',       type: 'number', options: [2, 3, 5],     default: 3 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'lobbed', label: 'Fired a Shot' },
            { id: 'impact', label: 'Shot Landed' },
        ];

        this._cool = 0;
        this._shots = [];
        this._home = null;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _clearShots() {
        this._shots.forEach((s) => { if (s.mesh) s.mesh.dispose(); });
        this._shots = [];
    }

    onPlayReset(mode) {
        if (this.inst.defeated) { this._clearShots(); return; }
        this._cool = 0;
        this._clearShots();
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    // Killed by the player: clean up in-flight shots, then the normal loot drop.
    onDefeated(mode) {
        this._clearShots();
        const pos = (this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position).clone();
        if (mode && mode.spawnPixelBurst) mode.spawnPixelBurst(pos, 12);
        if (this.app.addXp) this.app.addXp(5);
        this.wo.disposeInstance(this.inst);
    }

    // Launch an arcing shot at a ground target point.
    _lob(from, to) {
        const dur = 42;
        let mesh = null;
        if (BABYLON.MeshBuilder) {
            mesh = BABYLON.MeshBuilder.CreateSphere('spit', { diameter: 0.5 }, this.app.scene);
            const m = new BABYLON.StandardMaterial('spitMat', this.app.scene);
            m.diffuseColor = new BABYLON.Color3(0.7, 0.9, 0.3);
            m.emissiveColor = new BABYLON.Color3(0.4, 0.6, 0.15);
            m.disableLighting = true;
            mesh.material = m;
            mesh.isPickable = false; mesh.checkCollisions = false;
            mesh.position.copyFrom(from);
        }
        this._shots.push({ mesh: mesh, from: from.clone(), to: to.clone(), t: 0, dur: dur });
        this.app.sound.play('enemy-shot');
        this.app.fireEvent(this.inst, 'lobbed');
    }

    _advanceShots(mode) {
        const arcH = 5;
        for (let i = this._shots.length - 1; i >= 0; i--) {
            const s = this._shots[i];
            s.t++;
            const u = Math.min(1, s.t / s.dur);
            const x = s.from.x + (s.to.x - s.from.x) * u;
            const y = s.from.y + (s.to.y - s.from.y) * u + arcH * 4 * u * (1 - u);
            const z = s.from.z + (s.to.z - s.from.z) * u;
            if (s.mesh) s.mesh.position.set(x, y, z);
            if (s.t >= s.dur) {
                // Impact: splash damage if the player is within the radius of
                // where the shot came down (you dodge by not being there).
                const player = mode && mode.player;
                if (player) {
                    const d = BABYLON.Vector3.Distance(s.to, player.position);
                    if (d <= (this.getParam('splash') || 3)) mode.damagePlayer(this.getParam('damage') || 3, s.to);
                }
                const em = mode && mode.enemyManager;
                if (em && em.spawnFlash) em.spawnFlash(s.to.add(new BABYLON.Vector3(0, 0.3, 0)), new BABYLON.Color3(0.7, 0.9, 0.3), 10);
                this.app.sound.play('break');
                this.app.fireEvent(this.inst, 'impact');
                if (s.mesh) s.mesh.dispose();
                this._shots.splice(i, 1);
            }
        }
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._clearShots();
                if (this._home) inst.position.copyFrom(this._home);
            }
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
            inst.maxHp = this.getParam('toughness') || 2;
            inst.hp = inst.maxHp;
        }

        // Shots keep flying even after the spitter is gone this frame; advance
        // them first so an in-flight lob still lands.
        this._advanceShots(mode);
        if (inst.defeated) return;

        const player = mode && mode.player;
        if (!player) return;
        const to = player.position.subtract(inst.position); to.y = 0;
        const dist = to.length();
        if (dist > 0.001) inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(to.x, to.z), 0, 0);

        if (this._cool > 0) this._cool--;
        if (this._cool <= 0 && dist <= (this.getParam('range') || 16)) {
            const muzzle = (inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position).add(new BABYLON.Vector3(0, 1, 0));
            this._lob(muzzle, player.position.clone());   // aim where you ARE now
            this._cool = this.getParam('cadence') || 90;
        }
    }
}
