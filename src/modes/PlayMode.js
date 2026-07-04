class PlayMode {
    // The mode class' constructor is called when entering a mode, and
    // the dispose method when exiting a mode.
    constructor(app) {
        this.app = app;

        // Combat / pixel-collection state.
        this.pixelBursts = [];      // {mesh, vel, delay, spin} tiny cubes homing to the player
        this.attackFxList = [];     // {mesh, life} transient swing effects
        this.playerProjectiles = [];// {mesh, vel, life} shots fired by the player
        this.attackCooldown = 0;    // melee cooldown
        this.rangedCooldown = 0;    // ranged cooldown
        this.aimTimer = 0;          // frames left of the upper-body aim pose
        this.aimYaw = 0;            // world yaw the upper body is aiming at

        // Melee combo chain: land the next swing while the window is open to
        // advance the chain; the third hit is a finisher with bonus damage.
        this.comboStage = 0;        // which swing of the chain this is (0..2)
        this.comboTimer = 0;        // frames left to land the next chained swing

        // Lock-on targeting (toggled with T): ranged shots and the aim pose
        // track the locked enemy; a marker floats above it.
        this.lockTarget = null;     // {type:'em', rec} | {type:'inst', inst, wo}
        this.lockMarker = null;

        // Defensive moves. Holding G (pad: LB) blocks -- damage from the
        // frontal arc is negated while the guard is up. Tapping C (pad: Y)
        // dodge-rolls: a short burst of movement with invulnerability frames.
        this.blocking = false;
        this.blockMesh = null;      // translucent shield shown while guarding
        this.blockedHits = 0;       // lifetime counters (asserted by tests)
        this.dodgedHits = 0;
        this.dodgeCount = 0;
        this.dodgeFrames = 0;       // frames left of the active roll (i-frames)
        this.dodgeCooldown = 0;
        this.dodgeVel = null;       // world-space displacement per roll frame

        // Procedural idle: the avatar's authored "idle" range is a frozen
        // 2-frame pose, so when standing still we stop that static clip and
        // breathe the spine/neck ourselves (see updateIdleAndAim).
        this.idlePhase = 0;
        this.idleFrames = 0;          // consecutive frames with no movement input
        this._idleAnimStopped = false;

        // Collectible stars gathered this play session (pk_star pickups).
        this.starsCollected = 0;

        // Player survival state. Max HP grows with the character's level.
        this.playerMaxHp = this.app.maxHpForLevel ? this.app.maxHpForLevel() : 100;
        this.playerHp = this.playerMaxHp;
        this.hurtCooldown = 0;
        // Prefer the spawn point the default-terrain builder chose (just above the
        // tile nearest the origin) so the player lands on the rolling ground; fall
        // back to a high drop for loaded worlds that didn't set one.
        this.spawnPoint = (this.app.world && this.app.world.spawnPoint)
            ? this.app.world.spawnPoint.clone()
            : new BABYLON.Vector3(0, 12, 0);

        // Auto-spawning TRON enemy system.
        this.enemyManager = new EnemyManager(this.app, this);

        // Set static UI strings once on mode load
        this.app.modeName.text = "PlayMode";

        this.initPlayer();
    }

    dispose() {
        this.app.modeName.text = "Exiting PlayMode...";
        this.unbindMouseCombat();
        this.clearLockOn();
        if (this.blockMesh) { this.blockMesh.dispose(false, true); this.blockMesh = null; }
        this.disposePlayer();
        this.enemyManager.dispose();
        this.pixelBursts.forEach((pb) => pb.mesh && pb.mesh.dispose());
        this.attackFxList.forEach((fx) => fx.mesh && fx.mesh.dispose());
        this.playerProjectiles.forEach((pr) => pr.mesh && pr.mesh.dispose());
        this.pixelBursts = [];
        this.attackFxList = [];
        this.playerProjectiles = [];
    }

    initPlayer() {
        const playMode = this;
        //BABYLON.SceneLoader.ImportMesh("", "player/", "Vincent-frontFacing.babylon", scene, function (meshes, particleSystems, skeletons) {
        BABYLON.SceneLoader.ImportMesh("", "assets/avatars/", "starter.babylon", this.app.scene, function (meshes, particleSystems, skeletons) {
            playMode.player = meshes[0];
            let skeleton = skeletons[0];
            playMode.player.skeleton = skeleton;

            skeleton.enableBlending(0.1);
            //if the skeleton does not have any animation ranges then set them as below
            // setupAnimRanges(skeleton);

            var sm = playMode.player.material;
            if (sm.diffuseTexture != null) {
                sm.backFaceCulling = true;
                sm.ambientColor = new BABYLON.Color3(1, 1, 1);
            }

            playMode.player.position = playMode.spawnPoint.clone();
            playMode.player.checkCollisions = true;
            playMode.player.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
            playMode.player.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);

            // initialize the character controller library
            playMode.app.camera.lockedTarget = playMode.player;
            playMode.cc = new CharacterController(playMode.player, playMode.app.camera, playMode.app.scene);
            playMode.cc.setFaceForward(false);
            playMode.cc.setMode(0);
            playMode.cc.setTurnSpeed(45);
            
            // below makes the controller point the camera at the player head which is approx
            // 1.5m above the player origin
            playMode.cc.setCameraTarget(new BABYLON.Vector3(0, 1.5, 0));

            // no first person view when camera is close to avatar
            playMode.cc.setNoFirstPerson(true);

            // make avatar movement relative to camera direction / disable tank controls
            playMode.cc.setTurningOff(true);

            // the height of steps which the player can climb
            playMode.cc.setStepOffset(0.45);

            // the minimum and maximum slope the player can go up
            // between the two the player will start sliding down if it stops
            playMode.cc.setSlopeLimit(30, 60);

            //tell controller
            // - which animation range should be used for which player animation
            // - rate at which to play that animation range
            // - wether the animation range should be looped
            //use this if name, rate or looping is different from default
            playMode.cc.setIdleAnim("idle", 1, true);
            playMode.cc.setTurnLeftAnim("turnLeft", 0.5, true);
            playMode.cc.setTurnRightAnim("turnRight", 0.5, true);
            playMode.cc.setWalkBackAnim("walkBack", 0.5, true);
            playMode.cc.setIdleJumpAnim("idleJump", 0.5, false);
            playMode.cc.setRunJumpAnim("runJump", 0.6, false);
            playMode.cc.setFallAnim("fall", 2, false);
            playMode.cc.setSlideBackAnim("slideBack", 1, false);


            /*
            let walkSound = new BABYLON.Sound(
                "walk",
                "./sounds/footstep_carpet_000.ogg",
                scene,
                () => {
                    this.cc.setSound(walkSound);
                },
                { loop: false }
            );
            */

            var ua = window.navigator.userAgent;
            var isIE = /MSIE|Trident/.test(ua);
            if (isIE) {
                //IE specific code goes here
                playMode.cc.setJumpKey("spacebar");
            }

            playMode.cc.setCameraElasticity(false);

            playMode.cc.makeObstructionInvisible(false);

            // Traversal extensions: a mid-air double jump, and holding Space
            // while falling glides down slowly.
            if (playMode.cc.setJumpCount) playMode.cc.setJumpCount(2);
            if (playMode.cc.enableGlide) playMode.cc.enableGlide(true);

            playMode.cc.start();

            // Cache the bones used to aim the upper body / fire from the hand, and
            // wire up mouse combat now that the avatar exists.
            playMode.cacheAimBones();
            playMode.bindMouseCombat();

            // Paint the avatar in the active figure's colorway.
            playMode.app.applyFigureTint(playMode);
        }, null, function (scene, message) {
            // Surface a failed avatar load instead of leaving the player frozen
            // with no feedback.
            console.error('Failed to load player avatar:', message);
            playMode.app.toasty('Could not load player avatar.');
        });
    }

    disposePlayer() {
        // The avatar loads asynchronously; if the player leaves Play mode before
        // it finishes, cc/player are still undefined. Guard so the mode switch
        // doesn't throw and get stuck half-completed.
        if (this.cc) {
            this.cc.stop();
        }
        if (this.player) {
            this.player.dispose();
        }
    }

    // Setup all animation ranges for player
    setupAnimRanges(playerAvatar) {
        delAnimRanges(playerAvatar);

        playerAvatar.createAnimationRange("fall", 0, 16);
        playerAvatar.createAnimationRange("idle", 21, 65);
        playerAvatar.createAnimationRange("jump", 70, 94);
        playerAvatar.createAnimationRange("run", 100, 121);
        playerAvatar.createAnimationRange("slideBack", 125, 129);
        playerAvatar.createAnimationRange("strafeLeft", 135, 179);
        playerAvatar.createAnimationRange("strafeRight", 185, 229);
        playerAvatar.createAnimationRange("turnLeft", 240, 262);
        playerAvatar.createAnimationRange("turnRight", 270, 292);
        playerAvatar.createAnimationRange("walk", 300, 335);
        playerAvatar.createAnimationRange("walkBack", 340, 366);
    }

    // Remove all existing ranges
    clearAnimRanges(playerAvatar) {
        let ars = playerAvatar.getAnimationRanges();
        let l = ars.length;
        for (let i = 0; i < l; i++) {
            let ar = ars[i];
            playerAvatar.deleteAnimationRange(ar.name, false);
        }
    }

    update() {
        const app = this.app;

        // A death last frame respawns now, before any update loop is running,
        // so the reset can't pull arrays out from under an iteration.
        if (this._pendingRespawn) {
            this._pendingRespawn = false;
            this.respawn();
        }

        // run update for all active object scripts
        app.BuildableObjectList.forEach((wo) => {
            wo.updateAllInstances(true, this);
        });

        this.handleCombat();
        this.updatePixelBursts();
        this.updateAttackFx();
        this.updatePlayerProjectiles();
        this.updateIdleAndAim();
        this.enemyManager.update();

        // Slow health regen + hurt cooldown.
        if (this.hurtCooldown > 0) this.hurtCooldown--;
        if (this.playerHp < this.playerMaxHp) {
            this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 0.04);
        }
    }

    renderUI() {

    }

    // ---- combat -------------------------------------------------------------

    handleCombat() {
        if (!this.player) return;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.rangedCooldown > 0) this.rangedCooldown--;
        if (this.comboTimer > 0) this.comboTimer--;
        if (this.dodgeCooldown > 0) this.dodgeCooldown--;

        // Melee: F key (kept for keyboard-only play) or a gamepad melee button.
        if (this.app.keyPressed('F') || this.app.consumePad('meleeAttack')) {
            this.meleeAttack();
        }
        // Ranged: a gamepad ranged button (mouse right-click is handled by the
        // pointer observer). Auto-aims at the lock-on/nearest enemy on a pad.
        if (this.app.consumePad('rangedAttack')) {
            this.rangedAttack();
        }
        // T toggles lock-on targeting. (Q/E are the character controller's
        // strafe keys, so lock-on gets its own key.)
        if (this.app.keyPressed('T')) {
            this.toggleLockOn();
        }
        // Dodge roll: C key or a gamepad dodge button.
        if (this.app.keyPressed('C') || this.app.consumePad('dodge')) {
            this.startDodge();
        }
        this.updateLockOn();
        this.updateDodge();
        this.updateBlock();
    }

    // Left-click = melee, right-click = ranged. Called by the pointer observer
    // with the world-space aim point picked under the cursor.
    clickAttack(button, aimPoint) {
        if (button === 2) this.rangedAttack(aimPoint);
        else this.meleeAttack(aimPoint);
    }

    // Back-compat alias (older tests / keyboard call attack()).
    attack(aimPoint) { this.meleeAttack(aimPoint); }

    meleeAttack(aimPoint) {
        if (!this.player || this.attackCooldown > 0) return;
        this.attackCooldown = 12;

        // Combo chain: swinging again while the window is open advances the
        // chain (0 -> 1 -> 2). The third swing is a finisher with bonus damage,
        // after which the chain restarts.
        this.comboStage = (this.comboTimer > 0) ? Math.min(this.comboStage + 1, 2) : 0;
        const finisher = this.comboStage === 2;
        this.comboTimer = finisher ? 0 : 36;   // frames to land the next swing
        // Base damage plus the character's level bonus (+1 per 5 levels).
        const bonus = this.app.meleeBonus ? this.app.meleeBonus() : 0;
        const dmg = (finisher ? 3 : 1) + bonus;
        if (finisher) this.app.toasty('Combo finisher!');

        const aim = this.resolveAim(aimPoint, 3.4);
        if (aim) this.aimAt(aim);
        const p = this.player.position;
        const range = 3.4;
        this.spawnAttackFx(p, finisher);

        // The swing only strikes a frontal arc (~140 degrees): toward the aim
        // point when there is one, otherwise the way the player faces.
        const COS_HALF = 0.34;
        let dir = null;
        if (aim) { dir = aim.subtract(p); dir.y = 0; }
        if (!dir || dir.lengthSquared() < 0.0001) dir = this.playerForward();
        dir.normalize();

        // Auto-spawned TRON enemies.
        this.enemyManager.damageInArc(p, dir, range, COS_HALF, dmg);
        // Player-placed enemy objects (en_blob).
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.isEnemy && !inst.defeated) {
                    const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                    const to = ip.subtract(p);
                    to.y = 0;
                    const d = to.length();
                    if (d > range) return;
                    if (d > 0.3) {   // point-blank counts regardless of angle
                        to.scaleInPlace(1 / d);
                        if (to.x * dir.x + to.z * dir.z < COS_HALF) return;
                    }
                    inst.hp -= dmg;
                    if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                }
            });
        });
    }

    // Fire a neon shot from the player's hand toward the aim point (or the
    // nearest enemy, for gamepad auto-aim). The upper body turns to aim.
    rangedAttack(aimPoint) {
        if (!this.player || this.rangedCooldown > 0) return;
        this.rangedCooldown = this.app.rangedCooldownFrames ? this.app.rangedCooldownFrames() : 18;
        const aim = this.resolveAim(aimPoint, 60) ||
            this.player.position.add(this.playerForward().scale(6));
        this.aimAt(aim);
        const from = this.handPosition();
        const to = aim.add(new BABYLON.Vector3(0, 1.0, 0));
        const dir = to.subtract(from);
        const len = dir.length();
        if (len < 0.001) return;
        dir.scaleInPlace(1 / len);
        const proj = BABYLON.MeshBuilder.CreateBox('playerProj', { size: 0.24 }, this.app.scene);
        proj.position = from.clone();
        const mat = new BABYLON.StandardMaterial('playerProjMat', this.app.scene);
        const c = new BABYLON.Color3(0.4, 0.95, 1.0);
        mat.emissiveColor = c;
        mat.diffuseColor = c.scale(0.3);
        mat.disableLighting = true;
        proj.material = mat;
        proj.isPickable = false;
        proj.checkCollisions = false;
        this.playerProjectiles.push({ mesh: proj, vel: dir.scale(0.7), life: 120 });
        this.spawnAttackFx(from);
    }

    // True when a solid mesh blocks the projectile's next step: anything
    // collidable except enemies (proximity damage handles those) and the
    // player (enemy shots damage it by proximity too). Keeps every shot --
    // the player's and the enemies' -- from passing through walls or terrain.
    projectileBlocked(pos, vel) {
        const len = vel.length();
        if (len < 0.0001) return false;
        const ray = new BABYLON.Ray(pos, vel.scale(1 / len), len + 0.25);
        const hit = this.app.scene.pickWithRay(ray, (m) =>
            m.checkCollisions && m.isEnabled() && !m.isEnemy &&
            m !== this.player &&
            !(this.player && m.isDescendantOf && m.isDescendantOf(this.player)));
        return !!(hit && hit.hit);
    }

    updatePlayerProjectiles() {
        if (this.playerProjectiles.length === 0) return;
        const hitRange = 1.5, dmg = 1;
        for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
            const pr = this.playerProjectiles[i];
            // Walls and terrain stop shots.
            if (this.projectileBlocked(pr.mesh.position, pr.vel)) {
                pr.mesh.dispose();
                this.playerProjectiles.splice(i, 1);
                continue;
            }
            pr.mesh.position.addInPlace(pr.vel);
            pr.mesh.rotation.y += 0.3; pr.mesh.rotation.x += 0.2;
            pr.life--;
            let hit = false;
            // TRON enemies.
            if (this.enemyManager.damageNear(pr.mesh.position, hitRange, dmg) > 0) hit = true;
            // Player-placed en_blob enemies.
            if (!hit) {
                for (const wo of this.app.BuildableObjectList) {
                    for (const inst of wo.instances) {
                        if (inst && inst.isEnemy && !inst.defeated) {
                            const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                            if (BABYLON.Vector3.Distance(ip, pr.mesh.position) <= hitRange) {
                                inst.hp -= dmg;
                                if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                                hit = true;
                                break;
                            }
                        }
                    }
                    if (hit) break;
                }
            }
            if (hit || pr.life <= 0) {
                pr.mesh.dispose();
                this.playerProjectiles.splice(i, 1);
            }
        }
    }

    // ---- defense: blocking + dodging ----------------------------------------

    // True while the block input is held (G key, or LB on a pad).
    blockInputHeld() {
        return !!(this.app.keyDown('G') || this.app.padDown('block'));
    }

    // Hold-to-block: while the guard is up a translucent shield floats in
    // front of the chest and frontal damage is negated (see damagePlayer).
    // Rolling drops the guard for the duration of the dodge.
    updateBlock() {
        const want = this.dodgeFrames <= 0 && this.blockInputHeld();
        if (want && !this.blocking) {
            const shield = BABYLON.MeshBuilder.CreateDisc('blockShield',
                { radius: 0.85, tessellation: 24 }, this.app.scene);
            const mat = new BABYLON.StandardMaterial('blockShieldMat', this.app.scene);
            mat.emissiveColor = new BABYLON.Color3(0.35, 0.8, 1.0);
            mat.alpha = 0.4;
            mat.disableLighting = true;
            mat.backFaceCulling = false;
            shield.material = mat;
            shield.isPickable = false;
            shield.checkCollisions = false;
            this.blockMesh = shield;
        } else if (!want && this.blocking && this.blockMesh) {
            // dispose(false, true): the material is created per guard, so it
            // goes with the shield (same pattern as the lock-on marker).
            this.blockMesh.dispose(false, true);
            this.blockMesh = null;
        }
        this.blocking = want;
        if (this.blocking && this.blockMesh) {
            const fwd = this.playerForward();
            this.blockMesh.position = this.player.position
                .add(new BABYLON.Vector3(0, 1.15, 0)).add(fwd.scale(0.9));
            this.blockMesh.rotation.y = Math.atan2(fwd.x, fwd.z);
        }
    }

    // Tap-to-dodge: rolls in the direction of the held movement keys
    // (camera-relative, matching how the controller moves the avatar), or
    // hops backward when standing still. The roll grants invulnerability
    // frames -- anything that connects mid-roll is ignored entirely.
    startDodge() {
        if (!this.player || this.dodgeFrames > 0 || this.dodgeCooldown > 0) return;
        const a = this.app;
        const dx = (a.keyDown('D') ? 1 : 0) - (a.keyDown('A') ? 1 : 0);
        const dz = (a.keyDown('W') ? 1 : 0) - (a.keyDown('S') ? 1 : 0);
        let dir;
        if (dx === 0 && dz === 0) {
            dir = this.playerForward().scale(-1);   // standing still: back-hop
        } else {
            const camFwd = this.player.position.subtract(this.app.camera.position);
            camFwd.y = 0;
            if (camFwd.lengthSquared() < 0.0001) camFwd.copyFromFloats(0, 0, 1);
            camFwd.normalize();
            const camRight = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), camFwd);
            dir = camFwd.scale(dz).add(camRight.scale(dx));
            if (dir.lengthSquared() < 0.0001) dir = this.playerForward().scale(-1);
            dir.normalize();
        }
        this.dodgeFrames = 12;
        this.dodgeCooldown = 40;
        this.dodgeVel = dir.scale(0.5);
        this.dodgeCount++;
    }

    updateDodge() {
        if (this.dodgeFrames <= 0) return;
        this.dodgeFrames--;
        if (this.dodgeVel) this.player.moveWithCollisions(this.dodgeVel);
        // A short neon streak every few frames so the roll reads on screen.
        if (this.dodgeFrames % 4 === 0) this.spawnAttackFx(this.player.position);
    }

    // ---- aiming -------------------------------------------------------------

    // Resolve an aim point: an explicit world point, else the locked-on enemy,
    // else the nearest enemy within `maxDist`, else null.
    resolveAim(aimPoint, maxDist) {
        if (aimPoint) return aimPoint.clone ? aimPoint.clone() : aimPoint;
        const lock = this.lockTargetPos();
        if (lock) return lock;
        const near = this.nearestEnemyPos(maxDist || 60);
        return near ? near : null;
    }

    // ---- lock-on targeting ----------------------------------------------------

    // T toggles a lock onto the nearest enemy in range. While locked, ranged
    // shots and the aim pose track that enemy and a marker floats above it.
    toggleLockOn() {
        if (this.lockTarget) { this.clearLockOn(); return; }
        const p = this.player.position;
        let best = null, bestD = 25;
        this.enemyManager.enemies.forEach((rec) => {
            const d = BABYLON.Vector3.Distance(rec.mesh.position, p);
            if (d < bestD) { bestD = d; best = { type: 'em', rec: rec }; }
        });
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.isEnemy && !inst.defeated) {
                    const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                    const d = BABYLON.Vector3.Distance(ip, p);
                    if (d < bestD) { bestD = d; best = { type: 'inst', inst: inst, wo: wo }; }
                }
            });
        });
        if (!best) { this.app.toasty('No target in range.'); return; }
        this.lockTarget = best;
        const marker = BABYLON.MeshBuilder.CreateCylinder('lockMarker',
            { diameterTop: 0.5, diameterBottom: 0, height: 0.5, tessellation: 4 }, this.app.scene);
        const mat = new BABYLON.StandardMaterial('lockMarkerMat', this.app.scene);
        mat.emissiveColor = new BABYLON.Color3(1.0, 0.85, 0.2);
        mat.disableLighting = true;
        marker.material = mat;
        marker.isPickable = false;
        marker.checkCollisions = false;
        this.lockMarker = marker;
    }

    clearLockOn() {
        this.lockTarget = null;
        // dispose(false, true): also dispose the marker's material -- a fresh
        // one is created per lock, so keeping it would leak one per T-toggle.
        if (this.lockMarker) { this.lockMarker.dispose(false, true); this.lockMarker = null; }
    }

    // Current world position of the locked enemy, or null if it's gone.
    lockTargetPos() {
        const t = this.lockTarget;
        if (!t) return null;
        if (t.type === 'em') {
            if (this.enemyManager.enemies.indexOf(t.rec) < 0) return null;
            return t.rec.mesh.position.clone();
        }
        if (!t.inst || t.inst.isDisposed() || t.inst.defeated) return null;
        return (t.inst.getAbsolutePosition ? t.inst.getAbsolutePosition() : t.inst.position).clone();
    }

    // Per-frame: drop the lock if the target died or left range, else float the
    // marker above it (spinning, so it reads as a live indicator).
    updateLockOn() {
        if (!this.lockTarget) return;
        const pos = this.lockTargetPos();
        if (!pos || BABYLON.Vector3.Distance(pos, this.player.position) > 30) {
            this.clearLockOn();
            return;
        }
        if (this.lockMarker) {
            this.lockMarker.position = pos.add(new BABYLON.Vector3(0, 2.4, 0));
            this.lockMarker.rotation.y += 0.12;
        }
    }

    nearestEnemyPos(maxDist) {
        const p = this.player.position;
        let best = null, bestD = maxDist;
        this.enemyManager.enemies.forEach((e) => {
            const d = BABYLON.Vector3.Distance(e.mesh.position, p);
            if (d < bestD) { bestD = d; best = e.mesh.position; }
        });
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.isEnemy && !inst.defeated) {
                    const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                    const d = BABYLON.Vector3.Distance(ip, p);
                    if (d < bestD) { bestD = d; best = ip; }
                }
            });
        });
        return best ? best.clone() : null;
    }

    playerForward() {
        const m = this.player.getWorldMatrix();
        const f = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, 1), m);
        f.y = 0;
        return f.lengthSquared() > 0.0001 ? f.normalize() : new BABYLON.Vector3(0, 0, 1);
    }

    // World position the shot leaves from. We use a chest-height point just in
    // front of the player: reliable in world space and close enough to the hand
    // (the right-hand bone's world position proved unreliable across rigs).
    handPosition() {
        if (!this.player) return BABYLON.Vector3.Zero();
        return this.player.position.add(new BABYLON.Vector3(0, 1.3, 0)).add(this.playerForward().scale(0.5));
    }

    // Turn to face the aim point and start the upper-body aim pose.
    aimAt(target) {
        if (!this.player) return;
        const dir = target.subtract(this.player.position);
        dir.y = 0;
        if (dir.lengthSquared() < 0.0001) return;
        this.aimYaw = Math.atan2(dir.x, dir.z);
        this.aimTimer = 36;
    }

    cacheAimBones() {
        this.boneSpine = null; this.boneHand = null; this.boneArm = null; this.boneNeck = null;
        this._spineRest = null; this._neckRest = null;
        const sk = this.player && this.player.skeleton;
        if (!sk) return;
        const find = (n) => sk.bones.find((b) => b.name === n);
        this.boneSpine = find('mixamorig:Spine1') || find('mixamorig:Spine2') || find('mixamorig:Spine');
        this.boneArm = find('mixamorig:RightArm');
        this.boneArmL = find('mixamorig:LeftArm');
        this.boneHand = find('mixamorig:RightHand');
        this.boneNeck = find('mixamorig:Neck') || find('mixamorig:Head');
        // Load-time spine rest (used for the aim twist during locomotion). The
        // idle breathing does NOT use load-time poses -- they are the raw bind
        // pose (arms out); it snapshots the live standing pose at takeover.
        try {
            if (this.boneSpine) this._spineRest = this.boneSpine.getRotationQuaternion(BABYLON.Space.LOCAL, this.player).clone();
        } catch (_) { this._spineRest = null; }
    }

    // True while any movement input is held (the same keys the character
    // controller acts on: WASD move/turn, Q/E strafe, Space jump).
    isMovementInput() {
        const a = this.app;
        return a.keyDown('W') || a.keyDown('A') || a.keyDown('S') || a.keyDown('D') ||
               a.keyDown('Q') || a.keyDown('E') || a.keyDown(' ');
    }

    // Skeletal pose layer for standing still and aiming.
    //
    // Idle: the avatar's authored "idle" range is a frozen 2-frame pose (all the
    // locomotion clips are real, but no idle loop was ever authored), so the
    // character stood statue-still. Once the player has been idle a moment we
    // stop that static clip and gently breathe the spine and neck procedurally.
    // Any movement input immediately returns the bones to the real clips (the
    // controller restarts them on its own state transition).
    //
    // Aiming: firing turns the upper body toward the aim yaw while aimTimer
    // runs. Composes with the breathing when both are active. Best effort: if
    // the rig doesn't cooperate we skip the skeletal writes.
    updateIdleAndAim() {
        if (!this.player) return;
        if (this.aimTimer > 0) this.aimTimer--;

        const sk = this.player.skeleton;
        const moving = this.isMovementInput();
        if (moving) {
            this.idleFrames = 0;
            this._idleAnimStopped = false;   // CC restarts clips on its transition
            this._idleBase = null;
        } else {
            this.idleFrames++;
        }

        const idleActive = !moving && this.idleFrames > 12 && !!sk;
        if (idleActive && !this._idleAnimStopped) {
            // Stop the frozen idle clip so the breathing below owns the bones,
            // and snapshot the CURRENT standing pose as the base the breathing
            // offsets from. (Load-time rest poses are the raw bind pose with
            // the arms out -- offsetting from those would raise the arms.)
            try { this.app.scene.stopAnimation(sk); } catch (_) {}
            this._idleAnimStopped = true;
            try {
                const rot = (b) => b ? b.getRotationQuaternion(BABYLON.Space.LOCAL, this.player).clone() : null;
                this._idleBase = {
                    spine: rot(this.boneSpine),
                    neck: rot(this.boneNeck),
                    armR: rot(this.boneArm),
                    armL: rot(this.boneArmL),
                };
            } catch (_) { this._idleBase = null; }
        }

        const aiming = this.aimTimer > 0;
        if (!idleActive && !aiming) return;   // animation clips own the bones
        if (!this.boneSpine || !this._spineRest) return;

        // Idle offsets. The default camera sits BEHIND the character, so pitch
        // (leaning toward/away from the camera) barely reads -- the visible
        // components from behind are the side-to-side weight shift (roll) and
        // the slow head look-around (yaw).
        let breathe = 0, sway = 0, nod = 0, look = 0, armSwing = 0;
        if (idleActive) {
            const dt = Math.min(0.1, this.app.scene.getEngine().getDeltaTime() / 1000);
            this.idlePhase += dt * 2.2;
            const p = this.idlePhase;
            breathe  = Math.sin(p) * 0.07;                 // chest rise/fall (~0.35 Hz)
            sway     = Math.sin(p * 0.53 + 1.1) * 0.07;    // slower weight shift
            nod      = Math.sin(p + 0.9) * 0.03;           // neck follow-through
            look     = Math.sin(p * 0.21 + 2.0) * 0.22;    // slow glance around (~10s)
            // Counter-phase arm sway: opening/closing the arm-torso gap changes
            // the silhouette, which reads clearly even at camera distance.
            armSwing = Math.sin(p * 0.53 + 0.6) * 0.10;
        }

        // Aim twist (shortest-path yaw toward the target, clamped ~80 deg).
        let yaw = 0;
        if (aiming) {
            const facing = Math.atan2(this.playerForward().x, this.playerForward().z);
            let delta = this.aimYaw - facing;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            yaw = Math.max(-1.4, Math.min(1.4, delta));
        }

        try {
            const base = (idleActive && this._idleBase) ? this._idleBase : null;
            const spineBase = (base && base.spine) ? base.spine : this._spineRest;
            const q = spineBase.multiply(BABYLON.Quaternion.RotationYawPitchRoll(yaw, breathe, sway));
            this.boneSpine.setRotationQuaternion(q, BABYLON.Space.LOCAL, this.player);
            // Neck and arms only move as part of the idle (never during a pure
            // aim while running -- the locomotion clips own them then).
            if (base) {
                if (this.boneNeck && base.neck) {
                    const qn = base.neck.multiply(BABYLON.Quaternion.RotationYawPitchRoll(look, nod, 0));
                    this.boneNeck.setRotationQuaternion(qn, BABYLON.Space.LOCAL, this.player);
                }
                if (this.boneArm && base.armR) {
                    const qa = base.armR.multiply(BABYLON.Quaternion.RotationYawPitchRoll(0, 0, armSwing));
                    this.boneArm.setRotationQuaternion(qa, BABYLON.Space.LOCAL, this.player);
                }
                if (this.boneArmL && base.armL) {
                    const ql = base.armL.multiply(BABYLON.Quaternion.RotationYawPitchRoll(0, 0, -armSwing));
                    this.boneArmL.setRotationQuaternion(ql, BABYLON.Space.LOCAL, this.player);
                }
            }
        } catch (_) { /* rig doesn't support it; ignore */ }
    }

    // ---- mouse input --------------------------------------------------------

    bindMouseCombat() {
        const scene = this.app.scene;
        const canvas = this.app.engine.getRenderingCanvas();
        // Suppress the browser context menu so right-click can be a game action.
        if (canvas) { this._prevContextMenu = canvas.oncontextmenu; canvas.oncontextmenu = (e) => e.preventDefault(); }
        this._downInfo = null;
        this._pointerObs = scene.onPointerObservable.add((pi) => {
            const ev = pi.event;
            if (pi.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this._downInfo = { x: ev.clientX, y: ev.clientY, button: ev.button };
            } else if (pi.type === BABYLON.PointerEventTypes.POINTERUP && this._downInfo) {
                const moved = Math.hypot(ev.clientX - this._downInfo.x, ev.clientY - this._downInfo.y);
                const button = this._downInfo.button;
                this._downInfo = null;
                // A drag rotates the camera; only a click (little movement) attacks.
                if (moved <= 6) this.clickAttack(button, this.aimPointFromPointer(pi));
            }
        });
    }

    unbindMouseCombat() {
        if (this._pointerObs) { this.app.scene.onPointerObservable.remove(this._pointerObs); this._pointerObs = null; }
        const canvas = this.app.engine.getRenderingCanvas();
        if (canvas && this._prevContextMenu !== undefined) { canvas.oncontextmenu = this._prevContextMenu; this._prevContextMenu = undefined; }
    }

    // World point under the cursor: the picked mesh hit, else where the ray
    // crosses the player's ground plane, else null (auto-aim takes over).
    aimPointFromPointer(pi) {
        if (pi && pi.pickInfo && pi.pickInfo.hit && pi.pickInfo.pickedPoint) return pi.pickInfo.pickedPoint.clone();
        const scene = this.app.scene;
        const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), this.app.camera);
        const planeY = this.player ? this.player.position.y : 0;
        if (Math.abs(ray.direction.y) > 1e-4) {
            const t = (planeY - ray.origin.y) / ray.direction.y;
            if (t > 0) return ray.origin.add(ray.direction.scale(t));
        }
        return null;
    }

    // Called by enemies when they land a hit on the player. `sourcePos` is
    // where the attack came from (the attacker or its projectile) so a raised
    // block can judge front vs. back; omitted sources count as frontal.
    // Death does NOT respawn immediately: damagePlayer is called from inside
    // EnemyManager's update loops, and respawn() resets those very arrays --
    // clearing them mid-iteration left stale indexes (the e.kind / pr.mesh
    // crashes). The respawn runs at the top of the next update instead.
    damagePlayer(amount, sourcePos) {
        if (this.hurtCooldown > 0) return;
        // Dodge i-frames: a roll passes clean through anything that connects.
        if (this.dodgeFrames > 0) {
            this.dodgedHits++;
            return;
        }
        // A raised guard stops all damage from the frontal arc (~150 deg).
        // Hits from behind still land -- a block is a stance, not a bubble.
        if (this.blocking && this.player) {
            let frontal = true;
            if (sourcePos) {
                const to = sourcePos.subtract(this.player.position);
                to.y = 0;
                const d = to.length();
                if (d > 0.001) {
                    const f = this.playerForward();
                    frontal = (to.x * f.x + to.z * f.z) / d >= 0.26;
                }
            }
            if (frontal) {
                this.blockedHits++;
                this.hurtCooldown = 6;   // brief guard recovery between blocked hits
                if (this.blockMesh) {
                    this.spawnAttackFx(this.blockMesh.position.subtract(new BABYLON.Vector3(0, 1.0, 0)));
                }
                return;
            }
        }
        this.playerHp -= amount;
        this.hurtCooldown = 15;
        if (this.playerHp <= 0) {
            this.playerHp = 0;
            this._pendingRespawn = true;
        }
    }

    respawn() {
        this.playerHp = this.playerMaxHp;
        this.hurtCooldown = 60;
        if (this.player) this.player.position = this.spawnPoint.clone();
        // Death ends any in-progress combo and drops the target lock -- without
        // this, a chain started before dying could carry a free finisher (3x
        // damage) into the first swing after respawning. The dodge state resets
        // too so a death mid-roll can't leave i-frames or a stale cooldown.
        this.comboStage = 0;
        this.comboTimer = 0;
        this.dodgeFrames = 0;
        this.dodgeCooldown = 0;
        this.dodgeVel = null;
        this.clearLockOn();
        this.enemyManager.reset();

        // Dying costs 10% of the current pixels...
        const loss = Math.floor(this.app.pixels * 0.10);
        if (loss > 0) {
            this.app.pixels -= loss;
            this.app.saveEconomy();
        }

        // ...and resets the gameplay state: every object script that keeps
        // per-run state (counters, timers, spawners, scoreboards, collected
        // pickups, an active camera cut) starts the run over.
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.script && typeof inst.script.onPlayReset === 'function') {
                    try { inst.script.onPlayReset(this); } catch (e) { /* keep respawning */ }
                }
            });
        });

        this.app.toasty(loss > 0
            ? 'Overwhelmed! Lost ' + loss + ' pixels — the run resets...'
            : 'Overwhelmed! Respawning...');
    }

    defeatEnemy(inst, wo) {
        inst.defeated = true;
        const pos = (inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position).clone();
        this.spawnPixelBurst(pos, 14);
        this.app.addXp(5);   // character progression
        wo.disposeInstance(inst);
    }

    randomBrightColor() {
        const palette = [
            new BABYLON.Color3(1.00, 0.36, 0.82),
            new BABYLON.Color3(0.36, 0.82, 1.00),
            new BABYLON.Color3(1.00, 0.88, 0.29),
            new BABYLON.Color3(0.49, 1.00, 0.42),
            new BABYLON.Color3(1.00, 0.55, 0.20),
            new BABYLON.Color3(0.70, 0.50, 1.00),
        ];
        return palette[Math.floor(Math.random() * palette.length)];
    }

    // Burst of tiny multi-coloured cubes from `pos` that will home to the player.
    spawnPixelBurst(pos, count) {
        for (let i = 0; i < count; i++) {
            const box = BABYLON.MeshBuilder.CreateBox('pixel', { size: 0.14 + Math.random() * 0.06 }, this.app.scene);
            box.position = pos.add(new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4 + 0.5,
                (Math.random() - 0.5) * 0.4));
            const mat = new BABYLON.StandardMaterial('pixMat', this.app.scene);
            const c = this.randomBrightColor();
            mat.diffuseColor = c;
            mat.emissiveColor = c.scale(0.8);
            mat.disableLighting = true;
            box.material = mat;
            box.isPickable = false;
            box.checkCollisions = false;
            const vel = new BABYLON.Vector3(Math.random() - 0.5, Math.random() * 0.6 + 0.3, Math.random() - 0.5).scale(0.18);
            this.pixelBursts.push({ mesh: box, vel: vel, delay: 6 + Math.floor(Math.random() * 6), spin: (Math.random() - 0.5) * 0.3, age: 0 });
        }
    }

    updatePixelBursts() {
        if (!this.player || this.pixelBursts.length === 0) return;
        const target = this.player.position.add(new BABYLON.Vector3(0, 1.2, 0));
        const collectDist = 0.7, homeAccel = 0.06, maxSpeed = 0.9;
        const MAX_LIFE = 300;   // ~a few seconds: a hard cap so a pixel can never
                                // orbit the player forever without being collected.
        for (let i = this.pixelBursts.length - 1; i >= 0; i--) {
            const pb = this.pixelBursts[i];
            pb.age++;
            pb.mesh.rotation.y += pb.spin;
            pb.mesh.rotation.x += pb.spin * 0.7;
            if (pb.delay > 0) {
                pb.delay--;
                pb.vel.scaleInPlace(0.92);
                pb.mesh.position.addInPlace(pb.vel);
            } else {
                const dir = target.subtract(pb.mesh.position);
                const dist = dir.length();
                // The collect radius grows the longer a pixel has been chasing, so
                // one that keeps overshooting (orbiting) is still swept up rather
                // than circling indefinitely; MAX_LIFE is the absolute backstop.
                const collect = collectDist + Math.max(0, pb.age - 90) * 0.015;
                if (dist < collect || pb.age >= MAX_LIFE) {
                    pb.mesh.dispose();
                    this.pixelBursts.splice(i, 1);
                    this.app.addPixels(1);   // always credited, never lost
                    continue;
                }
                dir.normalize();
                pb.vel.addInPlace(dir.scale(homeAccel + (3.0 / (dist + 1)) * 0.02));
                if (pb.vel.length() > maxSpeed) pb.vel.normalize().scaleInPlace(maxSpeed);
                pb.mesh.position.addInPlace(pb.vel);
            }
        }
    }

    spawnAttackFx(p, big = false) {
        const fx = BABYLON.MeshBuilder.CreateSphere('attackFx', { diameter: big ? 2.2 : 1.2, segments: 8 }, this.app.scene);
        fx.position = p.add(new BABYLON.Vector3(0, 1.0, 0));
        const mat = new BABYLON.StandardMaterial('attackFxMat', this.app.scene);
        mat.emissiveColor = big ? new BABYLON.Color3(1.0, 0.8, 0.3) : new BABYLON.Color3(0.6, 0.9, 1.0);
        mat.alpha = 0.35;
        mat.disableLighting = true;
        fx.material = mat;
        fx.isPickable = false;
        fx.checkCollisions = false;
        this.attackFxList.push({ mesh: fx, life: 10 });
    }

    updateAttackFx() {
        for (let i = this.attackFxList.length - 1; i >= 0; i--) {
            const fx = this.attackFxList[i];
            fx.life--;
            const s = 1 + (10 - fx.life) * 0.28;
            fx.mesh.scaling.setAll(s);
            fx.mesh.material.alpha = Math.max(0, 0.35 * (fx.life / 10));
            if (fx.life <= 0) {
                fx.mesh.dispose();
                this.attackFxList.splice(i, 1);
            }
        }
    }
}