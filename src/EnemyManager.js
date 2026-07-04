// EnemyManager
// ------------
// Drives auto-generated "TRON"-style enemies during play mode. Two kinds:
//   - flyers: dark faceted polyhedra with glowing neon edges that hover and
//     home in on the player (melee only);
//   - walkers: bipedal neon figures that fall/walk on the terrain using the
//     shared GravityBody (the same ellipsoid + moveWithCollisions gravity the
//     player uses), animate their legs, and do both melee and ranged attacks.
// Both spawn in waves, and when destroyed burst into collectable pixels via
// PlayMode's existing effect. Owned and ticked by PlayMode.
class EnemyManager {
    constructor(app, playMode) {
        this.app = app;
        this.pm = playMode;
        this.scene = app.scene;

        this.enemies = [];
        this.effects = [];        // transient spawn/hit flashes
        this.projectiles = [];    // walker ranged shots
        this.wave = 1;
        this.frame = 0;
        this.spawnTimer = 30;
        this.maxAlive = 5;
        this.enabled = true;
        // Ambient wave spawning is OFF by default: a blank sandbox has no enemies
        // and nothing spawns until the player places a Spawner object. (The wave
        // system is still here and can be switched on by setting autoSpawn = true.)
        this.autoSpawn = false;
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

    // A neon box with glowing edges, optionally parented/positioned.
    neonBox(name, w, h, d, color, parent, pos) {
        const box = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
        box.material = this.neonBody(color);
        box.enableEdgesRendering();
        box.edgesWidth = 5.0;
        box.edgesColor = new BABYLON.Color4(color.r, color.g, color.b, 1);
        box.isPickable = false;
        box.checkCollisions = false;
        if (parent) box.parent = parent;
        if (pos) box.position = pos;
        return box;
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

    // ---- flying enemy -------------------------------------------------------

    // Spawn a flying enemy. If `pos` is given it materialises there (used by the
    // spawner object); otherwise it appears on a ring around the player. Returns
    // the enemy record.
    spawnEnemy(pos) {
        if (!this.pm.player && !pos) return null;
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

        const hover = 1.6 + Math.random() * 0.9;
        if (pos) {
            mesh.position = new BABYLON.Vector3(pos.x, pos.y + hover, pos.z);
        } else {
            const p = this.pm.player.position;
            const ang = Math.random() * Math.PI * 2;
            const R = 11 + Math.random() * 5;
            mesh.position = new BABYLON.Vector3(p.x + Math.cos(ang) * R, p.y + hover, p.z + Math.sin(ang) * R);
        }
        this.spawnFlash(mesh.position, color, 14);

        const hp = 2 + Math.floor(this.wave / 2);
        const rec = {
            kind: 'flyer', mesh: mesh, hp: hp, maxHp: hp,
            speed: 0.06 + Math.min(0.07, this.wave * 0.004),
            hover: hover, bobPhase: Math.random() * Math.PI * 2,
            spin: (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.03),
            attackCd: 30, fade: 12, color: color,
        };
        this.enemies.push(rec);
        return rec;
    }

    // Spawn a walker or flyer at a specific world position (used by spawners).
    spawnAt(kind, pos) {
        if (!pos) return null;
        return (kind === 'flyer') ? this.spawnEnemy(pos) : this.spawnWalker(pos);
    }

    // ---- bipedal walker -----------------------------------------------------

    buildBipedal(root, color) {
        // Origin at the feet; parts built upward (matches the GravityBody ellipsoid).
        this.neonBox('w_torso', 0.5, 0.65, 0.28, color, root, new BABYLON.Vector3(0, 1.1, 0));
        this.neonBox('w_head', 0.34, 0.34, 0.34, color, root, new BABYLON.Vector3(0, 1.62, 0));

        const V = BABYLON.Vector3;
        const leftHip = new BABYLON.TransformNode('w_lhip', this.scene); leftHip.parent = root; leftHip.position = new V(-0.16, 0.75, 0);
        const rightHip = new BABYLON.TransformNode('w_rhip', this.scene); rightHip.parent = root; rightHip.position = new V(0.16, 0.75, 0);
        this.neonBox('w_lleg', 0.17, 0.72, 0.17, color, leftHip, new V(0, -0.36, 0));
        this.neonBox('w_rleg', 0.17, 0.72, 0.17, color, rightHip, new V(0, -0.36, 0));

        const leftSh = new BABYLON.TransformNode('w_lsh', this.scene); leftSh.parent = root; leftSh.position = new V(-0.34, 1.36, 0);
        const rightSh = new BABYLON.TransformNode('w_rsh', this.scene); rightSh.parent = root; rightSh.position = new V(0.34, 1.36, 0);
        this.neonBox('w_larm', 0.14, 0.6, 0.14, color, leftSh, new V(0, -0.3, 0));
        this.neonBox('w_rarm', 0.14, 0.6, 0.14, color, rightSh, new V(0, -0.3, 0));

        return { leftHip, rightHip, leftSh, rightSh };
    }

    // Spawn a bipedal walker. If `pos` is given it drops in there (spawner);
    // otherwise near the player on the starter platform. Returns the record.
    spawnWalker(pos) {
        if (!this.pm.player && !pos) return null;
        const color = this.pickColor();
        // Invisible collider root (origin at the feet).
        const root = BABYLON.MeshBuilder.CreateBox('tronWalker', { width: 0.5, height: 0.2, depth: 0.5 }, this.scene);
        root.isVisible = false;

        if (pos) {
            root.position = new BABYLON.Vector3(pos.x, pos.y + 3, pos.z);   // drop onto terrain
        } else {
            // On the platform near the player, above the surface, then let gravity
            // drop it. Clamp to the starter cube footprint.
            const p = this.pm.player.position;
            const ang = Math.random() * Math.PI * 2;
            const R = 3.5 + Math.random() * 2.5;
            const clamp = (v) => Math.max(-4.3, Math.min(4.3, v));
            root.position = new BABYLON.Vector3(clamp(p.x + Math.cos(ang) * R), p.y + 5, clamp(p.z + Math.sin(ang) * R));
        }

        const parts = this.buildBipedal(root, color);
        this.spawnFlash(root.position, color, 14);
        const body = new GravityBody(this.scene, root, {
            ellipsoid: new BABYLON.Vector3(0.4, 1, 0.4),
            ellipsoidOffset: new BABYLON.Vector3(0, 1, 0),
        });

        const hp = 3 + Math.floor(this.wave / 2);
        const rec = {
            kind: 'walker', mesh: root, root: root, parts: parts, body: body, color: color,
            hp: hp, maxHp: hp,
            speed: 2.4 + this.wave * 0.18,        // units/second (gravity-scaled)
            meleeRange: 2.2, rangedRange: 12,
            meleeCd: 40, rangedCd: 70, meleeRate: 55, rangedRate: 100,
            walkPhase: 0, fade: 12,
        };
        this.enemies.push(rec);
        return rec;
    }

    // ---- ranged projectiles -------------------------------------------------

    fireProjectile(e, targetPos) {
        const from = e.mesh.position.add(new BABYLON.Vector3(0, 1.3, 0));
        const to = targetPos.add(new BABYLON.Vector3(0, 1.0, 0));
        const dir = to.subtract(from);
        const len = dir.length();
        if (len < 0.001) return;
        dir.scaleInPlace(1 / len);
        const proj = this.neonBox('tronProj', 0.28, 0.28, 0.28, e.color, null, from.clone());
        this.projectiles.push({ mesh: proj, vel: dir.scale(0.4), life: 130 });
        this.spawnFlash(from, e.color, 6);
    }

    updateProjectiles() {
        if (this.projectiles.length === 0) return;
        const target = this.pm.player ? this.pm.player.position.add(new BABYLON.Vector3(0, 1, 0)) : null;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const pr = this.projectiles[i];
            // Enemy shots are stopped by walls/terrain too.
            if (this.pm.projectileBlocked && this.pm.projectileBlocked(pr.mesh.position, pr.vel)) {
                pr.mesh.dispose();
                this.projectiles.splice(i, 1);
                continue;
            }
            pr.mesh.position.addInPlace(pr.vel);
            pr.mesh.rotation.y += 0.3;
            pr.mesh.rotation.x += 0.2;
            pr.life--;
            if (target && BABYLON.Vector3.Distance(pr.mesh.position, target) < 1.1) {
                this.pm.damagePlayer(7);
                pr.mesh.dispose();
                this.projectiles.splice(i, 1);
            } else if (pr.life <= 0) {
                pr.mesh.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }

    // ---- main loop ----------------------------------------------------------

    update() {
        if (!this.enabled || !this.pm.player) return;
        this.frame++;
        const p = this.pm.player.position;

        if (this.frame % 600 === 0) {
            this.wave++;
            this.maxAlive = Math.min(12, 4 + this.wave);
        }

        this.spawnTimer--;
        if (this.autoSpawn && this.enemies.length < this.maxAlive && this.spawnTimer <= 0) {
            if (Math.random() < 0.5) this.spawnWalker(); else this.spawnEnemy();
            this.spawnTimer = Math.max(24, 80 - this.wave * 4);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.kind === 'walker') this.updateWalker(e, p, i);
            else this.updateFlyer(e, p);
        }

        this.updateProjectiles();
        this.updateEffects();
    }

    updateFlyer(e, p) {
        const m = e.mesh;
        if (e.fade > 0) { e.fade--; m.visibility = 1 - e.fade / 12; }
        m.rotation.y += e.spin;
        m.rotation.x += e.spin * 0.5;

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

        const desiredY = p.y + e.hover + Math.sin(this.frame * 0.06 + e.bobPhase) * 0.25;
        m.position.y += (desiredY - m.position.y) * 0.1;
    }

    updateWalker(e, p, index) {
        const m = e.mesh;
        if (e.fade > 0) e.fade--;

        const dx = p.x - m.position.x, dz = p.z - m.position.z;
        const dist = Math.hypot(dx, dz);
        m.rotation.y = Math.atan2(dx, dz);   // face the player

        let vx = 0, vz = 0, moving = false;
        if (dist > e.meleeRange) {
            const inv = e.speed / (dist || 1);
            vx = dx * inv; vz = dz * inv;
            moving = true;
            // Ranged fire while approaching (mid-range).
            if (dist < e.rangedRange && e.rangedCd <= 0) {
                this.fireProjectile(e, p);
                e.rangedCd = e.rangedRate;
            }
        } else if (e.meleeCd <= 0) {
            this.pm.damagePlayer(8);
            e.meleeCd = e.meleeRate;
            this.spawnFlash(p.add(new BABYLON.Vector3(0, 1, 0)), e.color, 8);
        }
        if (e.rangedCd > 0) e.rangedCd--;
        if (e.meleeCd > 0) e.meleeCd--;

        // Gravity + terrain collision via the shared body.
        e.body.step(vx, vz);

        // Despawn cleanly if it walks/falls off the world.
        if (m.position.y < p.y - 25) {
            m.dispose(false, false);
            this.enemies.splice(index, 1);
            return;
        }

        // Walk cycle.
        if (moving) e.walkPhase += 0.28; else e.walkPhase *= 0.8;
        const sw = Math.sin(e.walkPhase) * 0.5;
        e.parts.leftHip.rotation.x = sw;
        e.parts.rightHip.rotation.x = -sw;
        e.parts.leftSh.rotation.x = -sw * 0.8;
        e.parts.rightSh.rotation.x = sw * 0.8;
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
                else this.spawnFlash(e.mesh.position.add(new BABYLON.Vector3(0, 1, 0)), new BABYLON.Color3(1, 1, 1), 6);
            }
        }
        return hits;
    }

    defeat(index) {
        const e = this.enemies[index];
        if (!e) return;
        const pos = e.mesh.position.add(new BABYLON.Vector3(0, e.kind === 'walker' ? 1 : 0, 0));
        this.spawnFlash(pos, e.color, 14);
        this.pm.spawnPixelBurst(pos, 12);          // reuse PlayMode's collectable pixels
        this.app.addXp(e.kind === 'walker' ? 8 : 5);   // walkers are tougher -> more XP
        e.mesh.dispose(false, false);              // recurse to child body parts; keep shared materials
        this.enemies.splice(index, 1);
    }

    reset() {
        this.enemies.forEach((e) => e.mesh.dispose(false, false));
        this.projectiles.forEach((pr) => pr.mesh.dispose());
        this.enemies = [];
        this.projectiles = [];
        this.wave = 1;
        this.maxAlive = 5;
        this.spawnTimer = 60;
    }

    dispose() {
        this.enabled = false;
        this.enemies.forEach((e) => e.mesh.dispose(false, false));
        this.projectiles.forEach((pr) => pr.mesh.dispose());
        this.effects.forEach((fx) => fx.mesh.dispose());
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
    }
}
