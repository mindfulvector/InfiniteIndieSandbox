// EnemyManager
// ------------
// Drives auto-generated "TRON"-style enemies during play mode: dark faceted
// polyhedra with glowing neon edges that spawn in waves around the player,
// chase and attack, and — when destroyed — burst into collectable pixels via
// PlayMode's existing effect. Owned and ticked by PlayMode.
class EnemyManager {
    constructor(app, playMode) {
        this.app = app;
        this.pm = playMode;
        this.scene = app.scene;

        this.enemies = [];
        this.effects = [];       // transient spawn/hit flashes
        this.wave = 1;
        this.frame = 0;
        this.spawnTimer = 30;
        this.maxAlive = 5;
        this.enabled = true;
        this._matCache = {};

        // Neon TRON palette.
        this.palette = [
            new BABYLON.Color3(0.00, 0.90, 1.00), // cyan
            new BABYLON.Color3(1.00, 0.60, 0.00), // orange
            new BABYLON.Color3(1.00, 0.17, 0.84), // magenta
            new BABYLON.Color3(0.22, 1.00, 0.40), // green
            new BABYLON.Color3(0.30, 0.55, 1.00), // blue
        ];
    }

    pickColor() {
        return this.palette[Math.floor(Math.random() * this.palette.length)];
    }

    // Dark body material with a faint neon glow (edges carry the bright colour).
    neonBody(color) {
        const key = color.r + '_' + color.g + '_' + color.b;
        if (this._matCache[key]) return this._matCache[key];
        const m = new BABYLON.StandardMaterial('tronMat_' + key, this.scene);
        m.diffuseColor = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(color.r * 0.35, color.g * 0.35, color.b * 0.35);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        m.disableLighting = true;
        m.alpha = 0.9;
        this._matCache[key] = m;
        return m;
    }

    spawnFlash(pos, color, life) {
        const fx = BABYLON.MeshBuilder.CreateSphere('spawnFx', { diameter: 0.6, segments: 6 }, this.scene);
        fx.position = pos.clone();
        const m = new BABYLON.StandardMaterial('spawnFxMat', this.scene);
        m.emissiveColor = color;
        m.disableLighting = true;
        m.alpha = 0.6;
        fx.material = m;
        fx.isPickable = false;
        fx.checkCollisions = false;
        this.effects.push({ mesh: fx, life: life || 12, max: life || 12 });
    }

    spawnEnemy() {
        if (!this.pm.player) return;
        const color = this.pickColor();
        const type = Math.floor(Math.random() * 4);   // polyhedron variety
        const size = 1.0 + Math.random() * 0.5;
        const mesh = BABYLON.MeshBuilder.CreatePolyhedron('tronEnemy', { type: type, size: size }, this.scene);
        mesh.material = this.neonBody(color);
        mesh.enableEdgesRendering();
        mesh.edgesWidth = 6.0;
        mesh.edgesColor = new BABYLON.Color4(color.r, color.g, color.b, 1);
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.visibility = 0.0;

        // Materialise on a ring around the player.
        const p = this.pm.player.position;
        const ang = Math.random() * Math.PI * 2;
        const R = 11 + Math.random() * 5;
        const hover = 1.6 + Math.random() * 0.9;
        mesh.position = new BABYLON.Vector3(p.x + Math.cos(ang) * R, p.y + hover, p.z + Math.sin(ang) * R);
        this.spawnFlash(mesh.position, color, 14);

        const hp = 2 + Math.floor(this.wave / 2);
        this.enemies.push({
            mesh: mesh,
            hp: hp,
            maxHp: hp,
            speed: 0.06 + Math.min(0.07, this.wave * 0.004),
            hover: hover,
            bobPhase: Math.random() * Math.PI * 2,
            spin: (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.03),
            attackCd: 30,
            fade: 12,
            color: color,
        });
    }

    update() {
        if (!this.enabled || !this.pm.player) return;
        this.frame++;
        const p = this.pm.player.position;

        // Difficulty ramp: a new wave roughly every ~10s, raising the live cap.
        if (this.frame % 600 === 0) {
            this.wave++;
            this.maxAlive = Math.min(12, 4 + this.wave);
        }

        // Steady spawning up to the cap.
        this.spawnTimer--;
        if (this.enemies.length < this.maxAlive && this.spawnTimer <= 0) {
            this.spawnEnemy();
            this.spawnTimer = Math.max(20, 70 - this.wave * 4);
        }

        // Per-enemy AI.
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const m = e.mesh;
            if (e.fade > 0) { e.fade--; m.visibility = 1 - e.fade / 12; }

            // Spin (TRON idle motion).
            m.rotation.y += e.spin;
            m.rotation.x += e.spin * 0.5;

            // Chase on the horizontal plane; attack when close.
            const dx = p.x - m.position.x, dz = p.z - m.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 2.2) {
                const inv = e.speed / (dist || 1);
                m.position.x += dx * inv;
                m.position.z += dz * inv;
            } else if (e.attackCd <= 0) {
                this.pm.damagePlayer(6);
                e.attackCd = 60;
                this.spawnFlash(p.add(new BABYLON.Vector3(0, 1, 0)), e.color, 8);
            }
            if (e.attackCd > 0) e.attackCd--;

            // Hover + bob toward the player's height.
            const desiredY = p.y + e.hover + Math.sin(this.frame * 0.06 + e.bobPhase) * 0.25;
            m.position.y += (desiredY - m.position.y) * 0.1;
        }

        this.updateEffects();
    }

    updateEffects() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const fx = this.effects[i];
            fx.life--;
            const s = 1 + (fx.max - fx.life) * 0.5;
            fx.mesh.scaling.setAll(s);
            fx.mesh.material.alpha = Math.max(0, 0.6 * (fx.life / fx.max));
            if (fx.life <= 0) {
                fx.mesh.dispose();
                this.effects.splice(i, 1);
            }
        }
    }

    // Damage every enemy within `range` of `pos`. Returns the number hit.
    damageNear(pos, range, dmg) {
        let hits = 0;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (BABYLON.Vector3.Distance(e.mesh.position, pos) <= range) {
                e.hp -= dmg;
                hits++;
                if (e.hp <= 0) this.defeat(i);
                else this.spawnFlash(e.mesh.position, new BABYLON.Color3(1, 1, 1), 6);
            }
        }
        return hits;
    }

    defeat(index) {
        const e = this.enemies[index];
        if (!e) return;
        const pos = e.mesh.position.clone();
        this.spawnFlash(pos, e.color, 14);
        this.pm.spawnPixelBurst(pos, 12);   // reuse PlayMode's collectable pixels
        e.mesh.dispose();
        this.enemies.splice(index, 1);
    }

    // Clear the field and reset difficulty (e.g. after the player is defeated).
    reset() {
        this.enemies.forEach((e) => e.mesh.dispose());
        this.enemies = [];
        this.wave = 1;
        this.maxAlive = 5;
        this.spawnTimer = 60;
    }

    dispose() {
        this.enabled = false;
        this.enemies.forEach((e) => e.mesh.dispose());
        this.effects.forEach((fx) => fx.mesh.dispose());
        this.enemies = [];
        this.effects = [];
    }
}
