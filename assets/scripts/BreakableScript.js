// BreakableScript
// ---------------
// t_breakable: a destructible block. It's a SOLID wall you can smash with
// melee, bolts or specials -- it shares the isEnemy damage plumbing (so
// every attack that hits an enemy hits it too), but it's flagged
// isBreakable so lock-on and auto-aim ignore it (a wall isn't a target).
// On break it goes intangible + invisible (RESETTABLE, like the boss),
// drops a small pixel reward, and fires `broken` for wiring -- so a hidden
// passage, a buried chest, or a shortcut opens when the wall comes down. A
// play reset rebuilds it. Attack-power tunes how many hits it takes.
class BreakableScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        inst.isEnemy = true;       // reuse the damage sweeps...
        inst.isBreakable = true;   // ...but stay out of targeting.
        inst.defeated = false;

        this.paramDefs = [
            { key: 'toughness', label: 'Hits to break', type: 'number', options: [1, 2, 3, 5], default: 2 },
            { key: 'loot',      label: 'Pixel reward',  type: 'number', options: [0, 5, 10, 25], default: 5 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'break', label: 'Force Break' },
        ];
        this.outputs = [
            { id: 'broken', label: 'Broken' },
        ];

        this._wasPlay = null;
        this._wantForce = false;
        inst.maxHp = 2; inst.hp = 2;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) { if (action === 'break') this._wantForce = true; }

    _setSolid(solid) {
        this.inst.checkCollisions = solid;
        this.inst.isVisible = solid;
        this.inst.isPickable = solid;
        (this.inst.getChildMeshes ? this.inst.getChildMeshes() : []).forEach((m) => {
            m.checkCollisions = solid; m.isVisible = solid;
        });
    }

    // PlayMode.defeatEnemy calls this instead of disposing (script-owned
    // defeat, the boss/turret pattern): rubble, loot, wiring, resettable hide.
    onDefeated(mode) {
        this._setSolid(false);
        const pos = (this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position).clone();
        const loot = this.getParam('loot') || 0;
        if (loot > 0 && mode && mode.spawnPixelBurst) mode.spawnPixelBurst(pos, Math.min(loot, 12));
        else if (mode && mode.enemyManager && mode.enemyManager.spawnFlash) {
            mode.enemyManager.spawnFlash(pos, new BABYLON.Color3(0.7, 0.6, 0.5), 10);
        }
        this.app.sound.play('shot-blocked');
        this.app.toasty('Smashed!');
        this.app.fireEvent(this.inst, 'broken');
    }

    onPlayReset(mode) {
        this.inst.defeated = false;
        this.inst.hp = this.inst.maxHp;
        this._wantForce = false;
        this._setSolid(true);
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false; inst.defeated = false; this._setSolid(true);
            }
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            inst.maxHp = this.getParam('toughness') || 2;
            inst.hp = inst.maxHp;
            inst.defeated = false;
            this._setSolid(true);
        }
        if (inst.defeated) return;

        // A wired `break` smashes it regardless of hp.
        if (this._wantForce && mode) {
            this._wantForce = false;
            inst.defeated = true;
            this.onDefeated(mode);
        }
    }
}
