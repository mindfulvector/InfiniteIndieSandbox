// BossScript
// ----------
// Makes en_boss a multi-phase arena boss. It plugs into the SAME damage
// plumbing as the blobs (inst.isEnemy + inst.hp, swept by melee arcs,
// specials, and player bolts) but owns its defeat via onDefeated: rewards,
// a wired `defeated` edge, and a resettable hide instead of disposal.
//
// Phases by remaining HP (30 total):
//   1 (>20): slow stomps toward the nearest party member, contact hits.
//   2 (<=20): faster, plus ranged volleys through the enemy projectile
//             system. Fires the `phase2` wiring edge once.
//   3 (<=10): enraged -- faster still, close-range shockwave slams.
//             Fires `phase3` once.
// The aura sphere (a per-instance mesh with its own material -- clone
// children share the template material, the known trap) shows the phase:
// violet / orange / red. Wire phase2/phase3/defeated to spawners, doors,
// scoreboards to choreograph the arena. `reset` (or a play reset) re-arms
// the whole fight at full health back at the spawn pose.
class BossScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'reset', label: 'Reset Fight' },
        ];
        this.outputs = [
            { id: 'phase2', label: 'Phase 2 Began' },
            { id: 'phase3', label: 'Phase 3 Began' },
            { id: 'defeated', label: 'Defeated' },
        ];

        this.maxHp = 30;
        inst.isEnemy = true;
        inst.hp = this.maxHp;
        inst.defeated = false;

        this._phase = 1;
        this._fired2 = false;
        this._fired3 = false;
        this._home = null;
        this._homeYaw = 0;
        this._wasPlay = null;
        this._body = null;
        this._aura = null;
        this._kidsFreed = false;
        this._contactCd = 0;
        this._volleyCd = 0;
        this._waveCd = 0;
    }

    onInput(action) {
        if (action === 'reset') this._reset();
    }

    onPlayReset(mode) { this._reset(); }

    _reset() {
        const inst = this.inst;
        inst.defeated = false;
        inst.hp = this.maxHp;
        this._phase = 1;
        this._fired2 = false;
        this._fired3 = false;
        this._contactCd = 0; this._volleyCd = 0; this._waveCd = 0;
        inst.setEnabled(true);
        if (this._home) {
            inst.position.copyFrom(this._home);
            inst.rotationQuaternion = null;
            inst.rotation.y = this._homeYaw;
        }
        if (this._body) this._body.vy = 0;
        this._tintAura();
    }

    // The boss's defeat, called by PlayMode.defeatEnemy through the script
    // hook: rewards + wiring edge + a hide that _reset can undo.
    onDefeated(mode) {
        const inst = this.inst;
        mode.spawnPixelBurst(inst.position.clone(), 30);
        this.app.addPixels(25);
        this.app.addXp(20);
        this.app.fireEvent(inst, 'defeated');
        this.app.toasty('Boss defeated!  (+25 px, +20 XP)');
        inst.setEnabled(false);
    }

    _tintAura() {
        if (!this._aura) return;
        const colors = {
            1: new BABYLON.Color3(0.75, 0.4, 1.0),
            2: new BABYLON.Color3(1.0, 0.6, 0.2),
            3: new BABYLON.Color3(1.0, 0.25, 0.25),
        };
        this._aura.material.emissiveColor = colors[this._phase];
    }

    _ensureRig() {
        const inst = this.inst;
        if (!this._kidsFreed) {
            this._kidsFreed = true;
            // Root ellipsoid is the body; children must not collide (the
            // mount lesson -- your own children can pin you in place).
            (inst.getChildMeshes ? inst.getChildMeshes() : [])
                .forEach((m) => { m.checkCollisions = false; });
        }
        if (!this._body) {
            this._body = new GravityBody(this.app.scene, inst, {
                ellipsoid: new BABYLON.Vector3(1.0, 1.1, 1.0),
                ellipsoidOffset: new BABYLON.Vector3(0, 1.1, 0),
            });
        }
        if (!this._aura) {
            const aura = BABYLON.MeshBuilder.CreateSphere(
                'bossAura' + inst.worldId, { diameter: 3.4, segments: 10 }, this.app.scene);
            const mat = new BABYLON.StandardMaterial('bossAuraMat' + inst.worldId, this.app.scene);
            mat.alpha = 0.18;
            mat.disableLighting = true;
            aura.material = mat;
            aura.isPickable = false;
            aura.checkCollisions = false;
            aura.parent = inst;
            aura.position = new BABYLON.Vector3(0, 1.1, 0);
            this._aura = aura;
            this._tintAura();
        }
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._reset();
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
        if (inst.defeated) return;
        this._ensureRig();

        // Phase watch: HP thirds, each edge fired exactly once per fight.
        if (inst.hp <= 10 && this._phase < 3) {
            this._phase = 3;
            this._tintAura();
            if (!this._fired3) { this._fired3 = true; this.app.fireEvent(inst, 'phase3'); }
            this.app.toasty('The boss is ENRAGED!');
        } else if (inst.hp <= 20 && this._phase < 2) {
            this._phase = 2;
            this._tintAura();
            if (!this._fired2) { this._fired2 = true; this.app.fireEvent(inst, 'phase2'); }
        }

        if (this._contactCd > 0) this._contactCd--;
        if (this._volleyCd > 0) this._volleyCd--;
        if (this._waveCd > 0) this._waveCd--;

        // Hunt the nearest party member (P1 or a live buddy).
        const targets = (mode && mode.combatTargets) ? mode.combatTargets() : [];
        if (!targets.length || !mode) { if (this._body) this._body.step(0, 0); return; }
        let t = targets[0], best = Infinity;
        targets.forEach((c) => {
            const d = BABYLON.Vector3.Distance(c.pos, inst.position);
            if (d < best) { best = d; t = c; }
        });

        const SPEEDS = { 1: 1.2, 2: 1.9, 3: 2.6 };
        const to = t.pos.subtract(inst.position);
        to.y = 0;
        const d = to.length();
        let vx = 0, vz = 0;
        if (d > 2.0) {
            to.scaleInPlace(1 / d);
            vx = to.x * SPEEDS[this._phase];
            vz = to.z * SPEEDS[this._phase];
        }
        if (d > 0.3) {
            inst.rotationQuaternion = null;
            inst.rotation.y = Math.atan2(to.x * d, to.z * d);
        }
        this._body.step(vx, vz);

        // Contact stomp.
        if (d < 2.6 && this._contactCd <= 0) {
            this._contactCd = 55;
            mode.damageTarget(t, 12, inst.position);
        }

        // Phase 2+: ranged volleys through the enemy projectile system.
        if (this._phase >= 2 && this._volleyCd <= 0) {
            this._volleyCd = 70;
            mode.enemyManager.fireProjectile(
                { mesh: inst, color: this._aura.material.emissiveColor }, t.pos);
        }

        // Phase 3: close-range shockwave slams.
        if (this._phase >= 3 && d < 4.5 && this._waveCd <= 0) {
            this._waveCd = 90;
            mode.damageTarget(t, 8, inst.position);
            if (this._aura) this._aura.scaling.setAll(1.6);
        }
        if (this._aura && this._aura.scaling.x > 1) {
            this._aura.scaling.setAll(Math.max(1, this._aura.scaling.x - 0.03));
        }
    }
}
