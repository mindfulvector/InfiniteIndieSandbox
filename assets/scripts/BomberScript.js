// BomberScript
// -----------
// en_bomber: a kamikaze enemy whose DEATH is its attack. It's fragile and
// fast -- it charges straight at you, swelling and flashing as it closes,
// and DETONATES on contact, dealing area damage in a blast radius (so a
// dodge-roll's i-frames or simply backing off saves you). The counter is
// to pop it at RANGE: killing it far away detonates it harmlessly. Killed
// or self-destructed, it hides resettably (mirrors the turret/boss) rather
// than disposing, and re-arms on a play reset. Fires `detonated`.
class BomberScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;
        inst.maxHp = 1;
        inst.hp = 1;
        inst.defeated = false;

        this.paramDefs = [
            { key: 'toughness', label: 'Hits to kill', type: 'number', options: [1, 2, 3],   default: 1 },
            { key: 'speed',     label: 'Speed',        type: 'number', options: [6, 9, 13],   default: 9 },
            { key: 'blast',     label: 'Blast radius', type: 'number', options: [2, 3, 5],    default: 3 },
            { key: 'damage',    label: 'Blast damage', type: 'number', options: [2, 3, 5],    default: 3 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'detonated', label: 'Detonated' },
        ];

        this._home = null;
        this._t = 0;
        this._blown = false;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _showAll(vis) {
        this.inst.isVisible = vis;
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => { m.isVisible = vis; });
    }

    onPlayReset(mode) {
        this.inst.defeated = false;
        this.inst.hp = this.getParam('toughness') || 1;
        this._blown = false;
        this.inst.scaling.set(1, 1, 1);
        this._showAll(true);
        this.inst.checkCollisions = true;
        if (this._home) this.inst.position.copyFrom(this._home);
    }

    // The blast: AoE damage if the player is within the radius, a flash, then
    // a resettable hide. Shared by the contact path and being killed.
    _detonate(mode) {
        if (this._blown) return;
        this._blown = true;
        this.inst.defeated = true;
        const pos = (this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position).clone();
        const player = mode && mode.player;
        if (player) {
            const d = BABYLON.Vector3.Distance(pos, player.position);
            if (d <= (this.getParam('blast') || 3)) {
                mode.damagePlayer(this.getParam('damage') || 3, pos);
            }
        }
        const em = mode && mode.enemyManager;
        if (em && em.spawnFlash) em.spawnFlash(pos.add(new BABYLON.Vector3(0, 1, 0)), new BABYLON.Color3(1, 0.5, 0.15), 12);
        if (mode && mode.spawnPixelBurst) mode.spawnPixelBurst(pos, 10);
        this.app.addXp(4);
        this.app.sound.play('break');
        this.app.fireEvent(this.inst, 'detonated');
        this.inst.checkCollisions = false;
        this._showAll(false);
    }

    // Killed by the player: same blast (harmless if you popped it at range).
    onDefeated(mode) { this._detonate(mode); }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
                inst.scaling.set(1, 1, 1);
            }
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
            inst.maxHp = this.getParam('toughness') || 1;
            inst.hp = inst.maxHp;
        }
        if (inst.defeated || this._blown) return;

        const player = mode && mode.player;
        if (!player) return;
        const to = player.position.subtract(inst.position);
        to.y = 0;
        const dist = to.length();

        // Chase the player.
        if (dist > 0.001) {
            to.scaleInPlace(1 / dist);
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            const step = (this.getParam('speed') || 9) * dt;
            inst.position.x += to.x * step;
            inst.position.z += to.z * step;
            inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(to.x, to.z), 0, 0);
        }

        // Pulse faster as it closes in -- a readable "about to blow" tell.
        this._t += (dist < 4 ? 0.4 : 0.12);
        const s = 1 + Math.sin(this._t) * (dist < 4 ? 0.25 : 0.08);
        inst.scaling.set(s, s, s);

        // Contact: detonate.
        if (dist <= 1.4) this._detonate(mode);
    }
}
