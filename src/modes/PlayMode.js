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

        // Aerial juggling: R launches enemies upward; hits on airborne
        // targets deal +1 and keep them aloft. juggleHits counts the chain.
        this.launcherCooldown = 0;
        this.juggleHits = 0;

        // True while the player is inside a pocket interior (see
        // CellDoorScript); the outdoor enemies freeze while it's set.
        this.insideCell = false;

        // Figure special attack (V): each figure has a signature move with a
        // long shared cooldown (see specialAttack).
        this.specialCooldown = 0;

        // The active sidekick's follower mesh (see updateSidekick).
        this.sidekickMesh = null;
        this._sidekickPhase = 0;

        // Drop-in buddy (local 2P v1): a friendly bipedal rig on the second
        // gamepad. See updateBuddy for the honest scope notes.
        this.buddy = null;

        // The kart instance being driven, or null on foot (see mountKart).
        this.driving = null;

        // Split-screen state (see updateSplitScreen).
        this._split = false;
        this._buddyCam = null;

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
        if (this.sidekickMesh) { this.sidekickMesh.dispose(false, true); this.sidekickMesh = null; }
        this.disposeSplitScreen();
        if (this.buddy) { this.buddy.root.dispose(false, false); this.buddy = null; }
        this.driving = null;   // the kart instance belongs to the world, not us
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

        if (this.driving) {
            // Behind the wheel: driving replaces locomotion and combat.
            this.updateDriving();
        } else {
            this.updatePadMovement();
            this.handleCombat();
        }
        this.updateBuddy();
        this.updateSidekick();
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
        if (this.launcherCooldown > 0) this.launcherCooldown--;
        // The juggle chain ends when nothing is left in the air.
        if (this.juggleHits > 0 && !this.enemyManager.anyAirborne()) this.juggleHits = 0;

        // Melee: F key (kept for keyboard-only play) or a gamepad melee button.
        if (this.app.keyPressed('F') || this.app.consumePad('meleeAttack')) {
            this.meleeAttack();
        }
        // Launcher: R pops enemies into the air for juggling.
        if (this.app.keyPressed('R') || this.app.consumePad('launcher')) {
            this.launcherAttack();
        }
        // Figure special: V (each figure has its own move).
        if (this.app.keyPressed('V') || this.app.consumePad('special')) {
            this.specialAttack();
        }
        if (this.specialCooldown > 0) this.specialCooldown--;
        // Ranged: a gamepad ranged button (mouse right-click is handled by the
        // pointer observer). Auto-aims at the lock-on/nearest enemy on a pad.
        if (this.app.consumePad('rangedAttack')) {
            this.rangedAttack();
        }
        // T (pad: right-stick click) toggles lock-on targeting. (Q/E are the
        // character controller's strafe keys, so lock-on gets its own key.)
        if (this.app.keyPressed('T') || this.app.consumePad('lockOn')) {
            this.toggleLockOn();
        }
        // Dodge roll: C key or a gamepad dodge button.
        if (this.app.keyPressed('C') || this.app.consumePad('dodge')) {
            this.startDodge();
        }
        // B toggles the drop-in buddy (a second pad joining does it too).
        if (this.app.keyPressed('B')) {
            if (this.buddy) this.buddyLeave(); else this.buddyJoin();
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

    // The launcher: an upward swing that knocks enemies in the frontal arc
    // into the air (see EnemyManager.launchInArc). Airborne enemies take +1
    // from every hit and get re-popped, so launch -> swing -> swing juggles.
    launcherAttack(aimPoint) {
        if (!this.player || this.launcherCooldown > 0) return;
        this.launcherCooldown = 30;
        const bonus = this.app.meleeBonus ? this.app.meleeBonus() : 0;
        const dmg = 1 + Math.floor(bonus / 2);
        const aim = this.resolveAim(aimPoint, 2.8);
        if (aim) this.aimAt(aim);
        const p = this.player.position;
        this.spawnAttackFx(p, true);
        let dir = null;
        if (aim) { dir = aim.subtract(p); dir.y = 0; }
        if (!dir || dir.lengthSquared() < 0.0001) dir = this.playerForward();
        dir.normalize();
        this.enemyManager.launchInArc(p, dir, 2.8, 0.34, dmg, 7);
        // Player-placed blobs just take the hit (jelly doesn't launch).
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.isEnemy && !inst.defeated) {
                    const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                    const to = ip.subtract(p);
                    to.y = 0;
                    const d = to.length();
                    if (d > 2.8) return;
                    if (d > 0.3) {
                        to.scaleInPlace(1 / d);
                        if (to.x * dir.x + to.z * dir.z < 0.34) return;
                    }
                    inst.hp -= dmg;
                    if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                }
            });
        });
    }

    // The figure's signature move (V), on a long shared cooldown:
    //   Scout  Shockwave  -- a 360-degree blast that damages and pops
    //                        everything close (launchInArc with cosHalf -1)
    //   Blaze  Flame Arc  -- one heavy wide frontal strike
    //   Frost  Frost Nova -- chills everything nearby: rooted, attack-less
    //   Volt   Chain Bolt -- a fan of five ranged bolts
    specialAttack() {
        if (!this.player || this.specialCooldown > 0) {
            if (this.player && this.specialCooldown > 0) {
                this.app.toasty('Special recharging... ' + Math.ceil(this.specialCooldown / 60) + 's');
            }
            return;
        }
        this.specialCooldown = 300;
        const fig = this.app.activeFigureDef();
        const p = this.player.position;
        const bonus = this.app.meleeBonus ? this.app.meleeBonus() : 0;
        const fwd = this.playerForward();
        this.app.toasty(fig.specialName + '!');
        this.spawnAttackFx(p, true);

        if (fig.special === 'flame') {
            // Heavy wide frontal strike (~180 degrees).
            this.enemyManager.damageInArc(p, fwd, 3.6, 0.0, 4 + bonus);
            this.damageBlobsInArc(p, fwd, 3.6, 0.0, 4 + bonus);
        } else if (fig.special === 'nova') {
            this.enemyManager.chillNear(p, 5, 120);
            this.enemyManager.damageNear(p, 5, 1);
        } else if (fig.special === 'bolt') {
            // Five bolts fanned across the facing direction.
            for (let i = -2; i <= 2; i++) {
                const a = i * 0.28;
                const dir = new BABYLON.Vector3(
                    fwd.x * Math.cos(a) + fwd.z * Math.sin(a), 0,
                    -fwd.x * Math.sin(a) + fwd.z * Math.cos(a));
                this.spawnPlayerBolt(this.handPosition(), dir);
            }
        } else {
            // Shockwave: cosHalf -1 makes the launcher arc all-around.
            this.enemyManager.launchInArc(p, fwd, 4, -1, 2 + Math.floor(bonus / 2), 5);
            this.damageBlobsInArc(p, fwd, 4, -1, 2 + Math.floor(bonus / 2));
        }
    }

    // Damage player-placed blob enemies in an arc (cosHalf -1 = all around);
    // shared by melee-flavoured specials.
    damageBlobsInArc(p, dir, range, cosHalf, dmg) {
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.isEnemy && !inst.defeated) {
                    const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                    const to = ip.subtract(p);
                    to.y = 0;
                    const d = to.length();
                    if (d > range) return;
                    if (d > 0.3 && cosHalf > -1) {
                        to.scaleInPlace(1 / d);
                        if (to.x * dir.x + to.z * dir.z < cosHalf) return;
                    }
                    inst.hp -= dmg;
                    if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                }
            });
        });
    }

    // Spawn one player projectile travelling along `dir` (shared by the
    // ranged attack and Volt's bolt fan).
    spawnPlayerBolt(from, dir) {
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
        this.playerProjectiles.push({ mesh: proj, vel: dir.normalize().scale(0.7), life: 120 });
    }

    // Called by EnemyManager whenever a hit lands on an airborne enemy.
    registerJuggleHit() {
        this.juggleHits++;
        if (this.juggleHits >= 2) this.app.toasty('JUGGLE x' + this.juggleHits + '!');
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

    // ---- driving (hover-kart) --------------------------------------------------
    // Mounting stops the CharacterController entirely (no double-driving, no
    // camera fight -- the ArcRotate camera keeps following the seated player
    // mesh, which rides the kart). Driving is momentum-based on the shared
    // GravityBody: throttle accelerates toward a max, drag bleeds it off,
    // steering scales with speed so a parked kart doesn't spin in place.

    mountKart(inst) {
        if (this.driving || !this.player || !this.cc) return;
        this.driving = inst;
        this.cc.stop();
        this.clearLockOn();
        // The seated rider must not collide: the kart's moveWithCollisions
        // would shove the kart away from its own passenger every frame and
        // the pair would ratchet skyward.
        this._riderHadCollisions = this.player.checkCollisions;
        this.player.checkCollisions = false;
        if (!inst._kartBody) {
            inst._kartBody = new GravityBody(this.app.scene, inst, {
                ellipsoid: new BABYLON.Vector3(0.9, 0.5, 1.3),
                ellipsoidOffset: new BABYLON.Vector3(0, 0.5, 0),
            });
        }
        inst._kartSpeed = 0;
        if (inst.rotationQuaternion) {
            // Driving steers via euler yaw; bake any placed quaternion first.
            inst.rotation.y = inst.rotationQuaternion.toEulerAngles().y;
            inst.rotationQuaternion = null;
        }
        this.app.toasty('Hop in!  WASD drives · Space hops out');
    }

    dismountKart() {
        const inst = this.driving;
        if (!inst) return;
        this.driving = null;
        inst._mountCooldown = 45;   // no instant re-mount while stepping off
        if (this.player) {
            this.player.checkCollisions = this._riderHadCollisions !== false;
            this.player.position = inst.position.add(new BABYLON.Vector3(1.6, 1.2, 0));
        }
        if (this.cc) this.cc.start();
    }

    updateDriving() {
        const inst = this.driving;
        if (!inst || !this.player) return;
        // Space hops out (the controller is stopped, so Space is free here).
        if (this.app.keyPressed(' ') || this.app.consumePad('jump')) {
            this.dismountKart();
            return;
        }
        const a = this.app;
        const dt = Math.min(0.05, a.scene.getEngine().getDeltaTime() / 1000);
        const pad = a.testPad || a.gamepad;
        const ls = pad && pad.leftStick;
        let throttle = 0, steer = 0;
        if (a.keyDown('W')) throttle += 1;
        if (a.keyDown('S')) throttle -= 0.6;
        if (a.keyDown('D')) steer += 1;
        if (a.keyDown('A')) steer -= 1;
        if (ls) {
            if (Math.abs(ls.y) > 0.2) throttle += -ls.y;
            if (Math.abs(ls.x) > 0.2) steer += ls.x;
        }
        throttle = Math.max(-1, Math.min(1, throttle));
        steer = Math.max(-1, Math.min(1, steer));

        const MAX = 10, ACCEL = 12, DRAG = 2.2, TURN = 2.4;
        let speed = inst._kartSpeed || 0;
        speed += (throttle * ACCEL - speed * DRAG * (throttle === 0 ? 1.6 : 1)) * dt;
        speed = Math.max(-MAX * 0.5, Math.min(MAX, speed));
        inst._kartSpeed = speed;
        // Steering authority grows with speed (no spinning in place).
        inst.rotation.y += steer * TURN * dt * Math.max(0.25, Math.min(1, Math.abs(speed) / 4)) * Math.sign(speed || 1);

        const vx = Math.sin(inst.rotation.y) * speed;
        const vz = Math.cos(inst.rotation.y) * speed;
        inst._kartBody.step(vx, vz);

        // Seat the player on the kart; the camera follows them for free.
        this.player.position.copyFrom(inst.position.add(new BABYLON.Vector3(0, 1.0, 0)));
        this.player.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(inst.rotation.y, 0, 0);
    }

    // ---- drop-in buddy (local 2P v1) ------------------------------------------
    // The buddy is a friendly bipedal rig (the walker builder in a fixed
    // friendly green) on the enemy-shared GravityBody -- deliberately NOT a
    // second CharacterController, so there is no double keyboard binding and
    // no camera fight. Honest v1 scope: the buddy moves, jumps and melees on
    // the second pad; enemies still hunt player 1; triggers/pickups only see
    // player 1; falling off the world auto-rescues the buddy to P1's side.

    buddyJoin() {
        if (this.buddy || !this.player) return;
        const em = this.enemyManager;
        const color = new BABYLON.Color3(0.35, 1.0, 0.55);
        const root = BABYLON.MeshBuilder.CreateBox('coopBuddy', { width: 0.5, height: 0.2, depth: 0.5 }, this.app.scene);
        root.isVisible = false;
        root.position = this.player.position.add(new BABYLON.Vector3(1.6, 1.5, 0));
        const parts = em.buildBipedal(root, color);
        const body = new GravityBody(this.app.scene, root, {
            ellipsoid: new BABYLON.Vector3(0.4, 1, 0.4),
            ellipsoidOffset: new BABYLON.Vector3(0, 1, 0),
        });
        this.buddy = {
            root, parts, body, walkPhase: 0, attackCooldown: 0,
            hp: 60, maxHp: 60, hurtCooldown: 0, downed: 0,
        };
        this.app.toasty('Player 2 joined!');
    }

    buddyLeave() {
        if (!this.buddy) return;
        this.disposeSplitScreen();
        this.buddy.root.dispose(false, false);
        this.buddy = null;
        this.app.toasty('Player 2 left.');
    }

    // Every live player position the enemies can hunt (P1 always; the buddy
    // unless it's down). EnemyManager picks the nearest per enemy.
    combatTargets() {
        const out = [];
        if (this.player) out.push({ kind: 'p1', pos: this.player.position });
        if (this.buddy && this.buddy.downed <= 0) {
            out.push({ kind: 'buddy', pos: this.buddy.root.position });
        }
        return out;
    }

    // Route enemy damage to whichever player was struck.
    damageTarget(t, amount, sourcePos) {
        if (t && t.kind === 'buddy') this.damageBuddy(amount);
        else this.damagePlayer(amount, sourcePos);
    }

    // Buddy damage: no blocking or i-frames, just a hurt cooldown and a
    // downed state -- at 0 HP the buddy slumps for a few seconds, enemies
    // lose interest, then it pops back up at half health. Couch-friendly:
    // nobody sits out for long.
    damageBuddy(amount) {
        const b = this.buddy;
        if (!b || b.downed > 0 || b.hurtCooldown > 0) return;
        b.hurtCooldown = 15;
        b.hp -= amount;
        if (b.hp <= 0) {
            b.hp = 0;
            b.downed = 180;
            this.app.toasty('Player 2 is down!  Back up in a moment...');
        }
    }

    // The buddy's melee: the same frontal-arc swing as P1, from the buddy.
    buddyAttack() {
        const b = this.buddy;
        if (!b || b.attackCooldown > 0) return;
        b.attackCooldown = 14;
        const fwd = new BABYLON.Vector3(Math.sin(b.root.rotation.y), 0, Math.cos(b.root.rotation.y));
        this.spawnAttackFx(b.root.position);
        this.enemyManager.damageInArc(b.root.position, fwd, 3.0, 0.34, 1);
        this.damageBlobsInArc(b.root.position, fwd, 3.0, 0.34, 1);
    }

    updateBuddy() {
        const b = this.buddy;
        if (!b) {
            // A second pad pressing any button drops the buddy in.
            if (this.app.buddyPad && this.app.buddyPad.wantsJoin) {
                this.app.buddyPad.wantsJoin = false;
                this.buddyJoin();
            }
            return;
        }
        if (b.attackCooldown > 0) b.attackCooldown--;
        if (b.hurtCooldown > 0) b.hurtCooldown--;
        if (b.downed <= 0 && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 0.02);

        // Downed: slump in place (gravity still applies), ignore input, and
        // pop back up at half health when the count runs out.
        if (b.downed > 0) {
            b.downed--;
            b.root.scaling.y = 0.45;
            b.body.step(0, 0);
            if (b.downed === 0) {
                b.hp = Math.ceil(b.maxHp / 2);
                b.root.scaling.y = 1;
                this.app.toasty('Player 2 is back up!');
            }
            return;
        }

        // Input: the harness hook, else live sticks from the second pad.
        const test = this.app.testBuddyPad;
        const pad2 = this.app.gamepads && this.app.gamepads[1];
        const ls = (test && test.leftStick) || (pad2 && pad2.leftStick) || null;
        const jumpHeld = test ? !!test.jumpHeld : this.app.buddyPad.jumpHeld;
        let attack = false;
        if (test && test.attackQueued) { attack = true; test.attackQueued = false; }
        else if (this.app.buddyPad.attackQueued) { attack = true; this.app.buddyPad.attackQueued = false; }

        // Camera-relative stick movement, dt-based like everything else.
        let vx = 0, vz = 0, moving = false;
        if (ls && (Math.abs(ls.x) > 0.25 || Math.abs(ls.y) > 0.25)) {
            const camFwd = this.player
                ? this.player.position.subtract(this.app.camera.position)
                : new BABYLON.Vector3(0, 0, 1);
            camFwd.y = 0;
            if (camFwd.lengthSquared() < 0.0001) camFwd.copyFromFloats(0, 0, 1);
            camFwd.normalize();
            const camRight = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), camFwd);
            const dir = camFwd.scale(-ls.y).add(camRight.scale(ls.x));
            if (dir.lengthSquared() > 0.0001) {
                dir.normalize();
                const SPEED = 5;   // units/second
                vx = dir.x * SPEED; vz = dir.z * SPEED;
                b.root.rotation.y = Math.atan2(dir.x, dir.z);
                moving = true;
            }
        }
        if (jumpHeld && b.body.grounded) b.body.vy = 7;
        b.body.step(vx, vz);
        if (attack) this.buddyAttack();

        // Walk cycle (the same leg swing the walkers use).
        if (moving) b.walkPhase += 0.28; else b.walkPhase *= 0.8;
        const sw = Math.sin(b.walkPhase) * 0.5;
        b.parts.leftHip.rotation.x = sw;
        b.parts.rightHip.rotation.x = -sw;
        b.parts.leftSh.rotation.x = -sw * 0.8;
        b.parts.rightSh.rotation.x = sw * 0.8;

        // Fell off the world (or got left impossibly far behind): rescue to
        // player 1's side instead of tumbling forever.
        if (this.player &&
            (b.root.position.y < this.player.position.y - 20 ||
             BABYLON.Vector3.Distance(b.root.position, this.player.position) > 60)) {
            b.root.position = this.player.position.add(new BABYLON.Vector3(1.6, 1.5, 0));
            b.body.vy = 0;
        }

        // Frame both players: when the buddy roams, ease the orbit radius out
        // so both stay on screen. Camera elasticity is OFF, so the controller
        // leaves the radius to us and the mouse wheel; we only ever widen.
        // (While split, each pane frames its own player instead.)
        if (this.player && !this._split) {
            const sep = BABYLON.Vector3.Distance(b.root.position, this.player.position);
            if (sep > 8 && this.app.camera.radius < Math.min(46, sep * 1.4)) {
                const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
                const want = Math.min(46, sep * 1.4);
                this.app.camera.radius += (want - this.app.camera.radius) * Math.min(1, 2.5 * dt);
            }
        }

        this.updateSplitScreen();
    }

    // Automatic split-screen: past comfortable framing range the view splits
    // (P1 left, buddy right, a FollowCamera trailing the buddy); reuniting
    // merges back. Split at >26, merge at <18 -- hysteresis so hovering at
    // the boundary can't flicker the panes. The fullscreen HUD is masked out
    // of the buddy pane via layer masks (the classic multi-viewport trap:
    // without it the GUI renders once per camera).
    updateSplitScreen() {
        const b = this.buddy;
        const cam = this.app.camera;
        const scene = this.app.scene;
        const sep = (b && this.player)
            ? BABYLON.Vector3.Distance(b.root.position, this.player.position) : 0;
        const want = !!(b && this.player && (this._split ? sep > 18 : sep > 26));
        if (want === this._split) return;
        this._split = want;
        if (want) {
            if (!this._buddyCam) {
                const bc = new BABYLON.FollowCamera('buddyCam',
                    b.root.position.add(new BABYLON.Vector3(0, 6, -10)), scene);
                bc.radius = 11;
                bc.heightOffset = 5;
                bc.cameraAcceleration = 0.06;
                bc.maxCameraSpeed = 25;
                this._buddyCam = bc;
            }
            // HUD only in P1's pane: the GUI layer gets a bit only P1's
            // camera carries; meshes keep the default mask both cameras see.
            if (this.app.gui && this.app.gui.layer) {
                this.app.gui.layer.layerMask = 0x10000000;
                cam.layerMask = 0x1FFFFFFF;
                this._buddyCam.layerMask = 0x0FFFFFFF;
            }
            this._buddyCam.lockedTarget = b.root;
            cam.viewport = new BABYLON.Viewport(0, 0, 0.5, 1);
            this._buddyCam.viewport = new BABYLON.Viewport(0.5, 0, 0.5, 1);
            scene.activeCameras = [cam, this._buddyCam];
            this.app.toasty('Split screen — reunite to merge!');
        } else {
            scene.activeCameras = null;
            scene.activeCamera = cam;
            cam.viewport = new BABYLON.Viewport(0, 0, 1, 1);
        }
    }

    // Tear the split down (buddy left, mode exit): merge and free the camera.
    disposeSplitScreen() {
        if (this._split) {
            this.app.scene.activeCameras = null;
            this.app.scene.activeCamera = this.app.camera;
            this.app.camera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
            this._split = false;
        }
        if (this._buddyCam) { this._buddyCam.dispose(); this._buddyCam = null; }
    }

    // ---- sidekick follower ---------------------------------------------------

    // (Re)build the follower mesh to match the active sidekick. Called on
    // play updates and by App.selectSidekick when the choice changes.
    refreshSidekick() {
        const id = this.app.activeSidekick;
        // The gear signature rides the mesh name, so an outfit change makes
        // `wanted` differ and the existing rebuild-on-name-change redresses
        // the follower with zero extra bookkeeping.
        const outfit = id ? this.app.gearOf(id) : null;
        const wanted = id
            ? 'sidekick_' + id + '_' + (outfit.hat || 'nohat') + '_' + (outfit.trinket || 'notrinket')
            : null;
        if (this.sidekickMesh && this.sidekickMesh.name === wanted) return;
        if (this.sidekickMesh) { this.sidekickMesh.dispose(false, true); this.sidekickMesh = null; }
        if (!id || !this.player) return;
        const sk = this.app.sidekickById(id);
        const mesh = BABYLON.MeshBuilder.CreateSphere(wanted, { diameter: 0.5, segments: 10 }, this.app.scene);
        const mat = new BABYLON.StandardMaterial(wanted + 'Mat', this.app.scene);
        const c = new BABYLON.Color3(sk.tint[0], sk.tint[1], sk.tint[2]);
        mat.emissiveColor = c;
        mat.diffuseColor = c.scale(0.4);
        mat.disableLighting = true;
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.position = this.player.position.add(new BABYLON.Vector3(-0.8, 1.8, -0.8));

        // Accessories: tiny child meshes so they ride the follower's bob.
        const accessory = (name, maker, y, color) => {
            const acc = maker();
            acc.name = wanted + '.' + name;
            const am = new BABYLON.StandardMaterial(acc.name + 'Mat', this.app.scene);
            am.emissiveColor = color;
            am.disableLighting = true;
            acc.material = am;
            acc.isPickable = false;
            acc.checkCollisions = false;
            acc.parent = mesh;
            acc.position = new BABYLON.Vector3(0, y, 0);
        };
        if (outfit.hat === 'tophat') {
            accessory('gear_tophat', () => BABYLON.MeshBuilder.CreateCylinder(
                'g', { diameter: 0.22, height: 0.22, tessellation: 10 }, this.app.scene),
                0.34, new BABYLON.Color3(0.12, 0.12, 0.16));
        }
        if (outfit.trinket === 'bell') {
            accessory('gear_bell', () => BABYLON.MeshBuilder.CreateSphere(
                'g', { diameter: 0.12, segments: 6 }, this.app.scene),
                -0.32, new BABYLON.Color3(0.85, 0.85, 0.95));
        } else if (outfit.trinket === 'cape') {
            accessory('gear_cape', () => BABYLON.MeshBuilder.CreateBox(
                'g', { width: 0.3, height: 0.34, depth: 0.04 }, this.app.scene),
                -0.1, new BABYLON.Color3(0.8, 0.2, 0.25));
        }
        this.sidekickMesh = mesh;
    }

    // Hover-follow: ease toward a point behind the player's shoulder with a
    // gentle bob. dt-based, so the lag feels identical at any frame rate.
    updateSidekick() {
        if (!this.player) return;
        this.refreshSidekick();
        const mesh = this.sidekickMesh;
        if (!mesh) return;
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._sidekickPhase += dt * 3;
        const back = this.playerForward().scale(-0.9);
        const target = this.player.position.add(back)
            .add(new BABYLON.Vector3(-back.z * 0.6, 1.8 + Math.sin(this._sidekickPhase) * 0.12, back.x * 0.6));
        mesh.position.addInPlace(target.subtract(mesh.position).scale(Math.min(1, 4 * dt)));
        mesh.rotation.y += dt * 2;
    }

    // ---- gamepad locomotion --------------------------------------------------

    // The left stick drives the character through the controller's REAL key
    // handlers -- digital 8-way with hysteresis (press past 0.45, release
    // under 0.30), since the controller is key-based. The right stick orbits
    // the ArcRotate camera, dt-scaled. Pad jump (A) is level-triggered so
    // holding glides and each fresh press double-jumps. app.testPad lets the
    // harness inject stick state without hardware.
    updatePadMovement() {
        const cc = this.cc;
        if (!cc) return;
        const pad = this.app.testPad || this.app.gamepad;
        const ls = pad && pad.leftStick;
        const rs = pad && pad.rightStick;
        if (!this._padKeys) this._padKeys = { w: false, s: false, a: false, d: false };
        const want = (cur, v) => (cur ? v > 0.30 : v > 0.45);
        const desired = {
            w: !!ls && want(this._padKeys.w, -ls.y),   // stick up is negative y
            s: !!ls && want(this._padKeys.s, ls.y),
            a: !!ls && want(this._padKeys.a, -ls.x),
            d: !!ls && want(this._padKeys.d, ls.x),
        };
        for (const k of ['w', 's', 'a', 'd']) {
            if (desired[k] === this._padKeys[k]) continue;
            this._padKeys[k] = desired[k];
            if (desired[k]) cc._onKeyDown({ key: k });
            else cc._onKeyUp({ key: k });
        }

        const jumpHeld = this.app.padDown('jump');
        if (jumpHeld !== !!this._padJumpHeld) {
            this._padJumpHeld = jumpHeld;
            if (jumpHeld) cc._onKeyDown({ key: ' ' });
            else cc._onKeyUp({ key: ' ' });
        }

        if (rs && (Math.abs(rs.x) > 0.15 || Math.abs(rs.y) > 0.15)) {
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            this.app.camera.alpha -= rs.x * 2.2 * dt;
            this.app.camera.beta = Math.min(1.45, Math.max(0.35,
                this.app.camera.beta - rs.y * 1.6 * dt));
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
        this.dodgeCooldown = this.app.dodgeCooldownFrames ? this.app.dodgeCooldownFrames() : 40;
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
        if (this.driving) this.dismountKart();   // death mid-drive: on foot first
        // The buddy comes back with P1, healthy and at their side.
        if (this.buddy) {
            this.buddy.hp = this.buddy.maxHp;
            this.buddy.downed = 0;
            this.buddy.root.scaling.y = 1;
            this.buddy.root.position = this.spawnPoint.add(new BABYLON.Vector3(1.6, 1.5, 0));
            this.buddy.body.vy = 0;
        }
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
        this.launcherCooldown = 0;
        this.juggleHits = 0;
        this.specialCooldown = 0;
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