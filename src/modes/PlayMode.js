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

        // A portal-door swap requested by PortalDoorScript this frame. The
        // swap disposes and rebuilds EVERY instance, so it must never run
        // from inside the script-update loop -- it executes at the top of
        // the next update (the deferred-respawn lesson).
        this.pendingPortal = null;

        // Figure special attack (V): each figure has a signature move with a
        // long shared cooldown (see specialAttack).
        this.specialCooldown = 0;

        // The active sidekick's follower mesh (see updateSidekick).
        this.sidekickMesh = null;
        this._sidekickPhase = 0;

        // Drop-in buddies (up to three = 4P): friendly bipedal rigs on the
        // extra gamepads. `buddy` remains an alias for slot 0 (tests and
        // older call sites read it); slots are fixed so each pad keeps its
        // own figure. See updateBuddies.
        this.buddies = [null, null, null];
        Object.defineProperty(this, 'buddy', { get: function () { return this.buddies[0]; } });

        // The kart instance being driven, or null on foot (see mountKart).
        this.driving = null;

        // Rail-grind state {rail, points, idx}, or null (see startGrind).
        this.grinding = null;

        // Trampoline bounce bookkeeping (see bouncePlayer).
        this._bounceRestore = 0;
        this._normalJumpSpeed = 6;   // the CC's stock idleJump speed

        // Photo mode (see togglePhotoMode).
        this.photoMode = false;
        this._photoReturn = null;

        // Split-screen state (see updateSplitScreen). _buddyCam aliases the
        // slot-0 camera for older call sites.
        this._split = false;
        this._splitPanes = 0;
        this._buddyCam = null;
        this._buddyCams = [null, null, null];

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
        // Defeat streak: chaining kills without taking a hit raises a pixel
        // multiplier. Dodging/blocking keeps it; getting hit (or a timeout)
        // breaks it. See notchDefeat / streakMult.
        this._streak = 0;
        this._streakTimer = 0;
        this._bestStreak = 0;
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

        // Sound-state tracking: footstep cadence and edges for jump/land/glide
        // (the character controller doesn't emit events, so we watch its state).
        this._stepTimer = 0;
        this._wasAirborne = false;
        this._prevJumping = false;
        this._prevJumpsUsed = 0;
        this._glideSoundTimer = 0;

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
        // Esc mid-photo disposes the mode: bring the HUD back with us.
        if (this.photoMode && this.app.gui && this.app.gui.rootContainer) {
            this.app.gui.rootContainer.isVisible = true;
        }
        this.photoMode = false;
        this.unbindMouseCombat();
        this.clearLockOn();
        if (this.blockMesh) { this.blockMesh.dispose(false, true); this.blockMesh = null; }
        if (this.sidekickMesh) { this.sidekickMesh.dispose(false, true); this.sidekickMesh = null; }
        (this.companions || []).forEach((c) => c.root.dispose(false, false));
        this.companions = [];
        this._compSig = null;
        // The net ghost is scene-level: without this it lingers frozen in
        // build mode. It regrows on the next play tick.
        if (this.app.net && this.app.net.ghost) this.app.net._disposeGhost();
        this.disposeSplitScreen();
        this.buddies.forEach((b, i) => {
            if (b) { b.root.dispose(false, false); this.buddies[i] = null; }
        });
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

            // The active gadget hex applies now that the CC exists.
            if (playMode.app.applyGadgetToSession) playMode.app.applyGadgetToSession();

            // A co-op Play Set brings player 2 along automatically.
            if (playMode.app.coopWorld && !playMode.buddies[0]) {
                playMode.buddyJoin(0);
                playMode.app.toasty('Co-op! Player 2 joins — 2nd gamepad drives them.');
            }

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

        // A portal-door swap requested last frame runs now, for the same
        // reason: it disposes every instance in the scene.
        if (this.pendingPortal) {
            const req = this.pendingPortal;
            this.pendingPortal = null;
            this.doPortal(req);
        }

        // Photo mode: P freezes the whole world (nothing below this line
        // runs -- scripts, enemies, physics, combat all simply stop being
        // updated while rendering continues) and frees the camera.
        if (app.keyPressed('P') && !this.driving && !this.grinding) {
            this.togglePhotoMode();
        }
        if (this.photoMode) {
            this.updatePhotoCamera();
            return;
        }

        // run update for all active object scripts
        app.BuildableObjectList.forEach((wo) => {
            wo.updateAllInstances(true, this);
        });

        if (this.driving) {
            // Behind the wheel: driving replaces locomotion and combat.
            this.updateDriving();
        } else if (this.grinding) {
            // On a rail: carried hands-free; locomotion and combat wait.
            this.updateGrinding();
        } else {
            this.updatePadMovement();
            this.handleCombat();
            this.updateSwimming();
            this.updateClimbing();
            this.updateFloaters();
            // Footstep/jump/land sounds only apply on foot (driving and
            // grinding suspend the CharacterController).
            this.updateMovementSounds();
        }

        // A trampoline bounce borrows the CC's jump speed; give it back
        // once the launch is in the air.
        if (this._bounceRestore > 0 && --this._bounceRestore === 0 && this.cc) {
            this.cc.setJumpSpeed(this._normalJumpSpeed || 6);
        }
        if (this.app.net) this.app.net.tick(this);
        this.updateBuddies();
        this.updateCompanions();
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
        // Defeat-streak window: let the chain lapse if you go too long between kills.
        if (this._streakTimer > 0 && --this._streakTimer <= 0) this.resetStreak();
    }

    renderUI() {

    }

    // ---- sound: footsteps + traversal -----------------------------------------

    // What the player is standing on, for the per-surface footstep sounds.
    // A short ray straight down finds the ground mesh; walking up its parent
    // chain finds the owning WorldObject and its `surface` tag. The grass/dirt
    // atlas blocks resolve by FACE: grass on top, dirt on the sides.
    footstepSurface() {
        if (!this.player) return 'grass';
        const origin = this.player.position.add(new BABYLON.Vector3(0, 0.5, 0));
        const ray = new BABYLON.Ray(origin, BABYLON.Vector3.Down(), 4);
        const pick = this.app.scene.pickWithRay(ray, (m) =>
            m.checkCollisions && m.isEnabled() && m !== this.player &&
            !(m.isDescendantOf && m.isDescendantOf(this.player)));
        if (!pick || !pick.hit || !pick.pickedMesh) return 'grass';
        let node = pick.pickedMesh;
        while (node && !node.worldObject) node = node.parent;
        const surface = node && node.worldObject && node.worldObject.surface;
        if (surface === 'grassblock') {
            // The atlas is mapped in LOCAL space (grass on the local top face,
            // dirt on the sides), so read the local normal: a rotated block
            // with a dirt side turned upward correctly sounds like dirt.
            const n = pick.getNormal(false);
            return (n && n.y > 0.5) ? 'grass' : 'dirt';
        }
        return surface || 'grass';   // untagged ground reads as grass
    }

    // Watch the character controller's state each frame and turn its edges
    // into sounds: footsteps while walking (cadenced, per-surface), jump /
    // double-jump starts, landings, and the glide wind.
    updateMovementSounds() {
        const cc = this.cc, s = this.app.sound;
        if (!cc || !this.player || !s) return;

        const jumping = !!(cc._act && cc._act._jump);
        const airborne = jumping || !!cc._inFreeFall;
        const jumpsUsed = cc._jumpsUsed || 0;

        // Air jumps increment _jumpsUsed; a plain ground jump only raises the
        // _act._jump flag (so don't double-report when an air jump converts a
        // freefall into a jump).
        if (jumpsUsed > this._prevJumpsUsed) s.play('doubleJump');
        else if (jumping && !this._prevJumping) s.play('jump');
        this._prevJumping = jumping;
        this._prevJumpsUsed = jumpsUsed;

        // Landing thuds need a REAL fall behind them: walking rolling
        // terrain flickers _inFreeFall for single frames at high fps (the
        // GravityBody hysteresis lesson, CC edition), and un-debounced
        // landings flooded the sound log while starving the footstep timer.
        if (airborne) {
            this._airFrames = (this._airFrames || 0) + 1;
        } else {
            if ((this._airFrames || 0) >= 6) {
                s.play('land', { surface: this.footstepSurface() });
                this._stepTimer = 8;   // don't step in the same instant as the thud
            }
            this._airFrames = 0;
        }
        this._wasAirborne = airborne;

        // Glide wind: a soft looped whoosh while holding the glide.
        const gliding = !!(cc._glideEnabled && cc._jumpKeyHeld && cc._inFreeFall);
        if (gliding && --this._glideSoundTimer <= 0) {
            s.play('glide');
            this._glideSoundTimer = 14;
        }

        // Footsteps: cadence while moving on the ground.
        if (!airborne && cc.anyMovement && cc.anyMovement()) {
            if (--this._stepTimer <= 0) {
                s.play('footstep', { surface: this.footstepSurface() });
                this._stepTimer = 16;
            }
        } else if (this._stepTimer > 4) {
            this._stepTimer = 4;   // first step lands quickly when walking resumes
        }
    }

    // ---- combat -------------------------------------------------------------

    handleCombat() {
        if (!this.player) return;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.rangedCooldown > 0) this.rangedCooldown--;
        if (this._powerTimer > 0 && --this._powerTimer <= 0) {
            this._powerKind = null;
            this.app.toasty('Power-up faded.');
        }
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
        // B adds drop-in buddies (up to three); with a full party it
        // disbands them all. Extra pads joining does the same per pad.
        if (this.app.keyPressed('B')) {
            if (this.buddies.every(Boolean)) this.buddyLeaveAll();
            else this.buddyJoin();
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

        // Combo chain -- PER FIGURE: chain length, finisher multiplier, and
        // an optional finisher EFFECT come from the active figure's moveset
        // (Volt snaps a 2-hit chain ending in a free bolt; Blaze pressures
        // through 4 hits; Frost's and Warden's finishers chill; Wick's pops
        // enemies airborne; Scout keeps the classic triple).
        const combo = (this.app.activeFigureDef && this.app.activeFigureDef().combo)
            || { hits: 3, mult: 3 };
        const last = combo.hits - 1;
        this.comboStage = (this.comboTimer > 0) ? Math.min(this.comboStage + 1, last) : 0;
        const finisher = this.comboStage === last;
        this.comboTimer = finisher ? 0 : 36;   // frames to land the next swing
        // Base damage plus the character's level bonus (+1 per 5 levels).
        const bonus = this.app.meleeBonus ? this.app.meleeBonus() : 0;
        const dmg = ((finisher ? combo.mult : 1) + bonus) * this.powerMultiplier();
        if (finisher) this.app.toasty(combo.comboName ? combo.comboName + '!' : 'Combo finisher!');

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

        this.app.sound.play(finisher ? 'melee-finisher' : 'melee-swing');

        // The figure's signature finisher effect rides the final swing.
        if (finisher && combo.effect) {
            // Radii cover melee range PLUS the knockback the earlier chain
            // hits just delivered -- a finisher that misses its own victim
            // because the combo shoved them away is no finisher at all.
            if (combo.effect === 'chill') {
                this.enemyManager.chillNear(p, 7.0, 90);
            } else if (combo.effect === 'bolt') {
                this.spawnPlayerBolt(p.add(new BABYLON.Vector3(0, 1.3, 0)), dir.clone());
            } else if (combo.effect === 'launch') {
                this.enemyManager.launchInArc(p, dir, 7.0, 0.15, 0, 5);
            }
        }

        // Auto-spawned TRON enemies.
        let hits = this.enemyManager.damageInArc(p, dir, range, COS_HALF, dmg);
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
                    if (this._enemyBlocks(inst, p)) { this._clang(inst); }
                    else {
                        inst.hp -= dmg;
                        if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                    }
                    hits++;
                }
            });
        });
        if (hits > 0) this.app.sound.play('melee-hit');
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
                    if (this._enemyBlocks(inst, p)) { this._clang(inst); }
                    else {
                        inst.hp -= dmg;
                        if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                    }
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
                    if (this._enemyBlocks(inst, p)) { this._clang(inst); }
                    else {
                        inst.hp -= dmg;
                        if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                    }
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

    // A mounted forward gun: twin neon bolts from the vehicle's nose along
    // its heading. Reuses the player bolt system (which already damages
    // enemies and blobs and is blocked by walls), so dogfighting and drive-by
    // combat come for free -- and the bolts inherit the vehicle's own speed
    // sense from the nose offset. Muzzle flash + sound sell the shot.
    fireVehicleGun(inst) {
        const yaw = inst.rotation ? inst.rotation.y : 0;
        const fwd = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const nose = inst.position.add(fwd.scale(1.6)).add(new BABYLON.Vector3(0, 0.6, 0));
        const right = new BABYLON.Vector3(fwd.z, 0, -fwd.x).scale(0.35);
        this.spawnPlayerBolt(nose.add(right), fwd.clone());
        this.spawnPlayerBolt(nose.subtract(right), fwd.clone());
        this.enemyManager.spawnFlash(nose, new BABYLON.Color3(0.5, 0.95, 1.0), 6);
        this.app.sound.play('ranged-shot');
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
        this.app.sound.play('ranged-shot');
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
        const hitRange = 1.5, dmg = 1 * this.powerMultiplier();
        for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
            const pr = this.playerProjectiles[i];
            // Walls and terrain stop shots.
            if (this.projectileBlocked(pr.mesh.position, pr.vel)) {
                this.app.sound.play('shot-blocked');
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
                                if (this._enemyBlocks(inst, pr.mesh.position)) { this._clang(inst); }
                                else {
                                    inst.hp -= dmg;
                                    if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                                }
                                hit = true;
                                break;
                            }
                        }
                    }
                    if (hit) break;
                }
            }
            if (hit) this.app.sound.play('shot-hit');
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

    // The vehicle profile: scripts customize the shared seat (the mount
    // jumps and dismounts on C; the kart dismounts on Space). Defaults are
    // the kart's numbers.
    _vehicleProfile(inst) {
        const p = (inst && inst.script && inst.script.vehicleProfile) || {};
        return {
            max: p.max != null ? p.max : 10,
            accel: p.accel != null ? p.accel : 12,
            turn: p.turn != null ? p.turn : 2.4,
            seatY: p.seatY != null ? p.seatY : 1.0,
            canJump: !!p.canJump,
            canFly: !!p.canFly,
            watercraft: !!p.watercraft,
            turnInPlace: !!p.turnInPlace,
            armed: !!p.armed,
            hint: p.hint || 'Hop in!  WASD drives · Space hops out',
        };
    }

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
        this.app.toasty(this._vehicleProfile(inst).hint);
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
        const prof = this._vehicleProfile(inst);
        const a = this.app;

        // Kart: Space hops out. Mounts: Space JUMPS, C hops off.
        // Aircraft: Space is CLIMB (held, handled with the physics below),
        // C hops off.
        if (prof.canFly) {
            if (a.keyPressed('C')) { this.dismountKart(); return; }
        } else if (prof.canJump) {
            if (a.keyPressed('C')) { this.dismountKart(); return; }
            if ((a.keyPressed(' ') || a.consumePad('jump')) &&
                inst._kartBody && inst._kartBody.grounded) {
                inst._kartBody.vy = 8;
            }
        } else if (a.keyPressed(' ') || a.consumePad('jump')) {
            this.dismountKart();
            return;
        }

        // Armed vehicles fire forward: LMB / F / pad X, on a cooldown.
        // (|| 0 -- a fresh vehicle's _gunCd is undefined, and undefined<=0
        // is FALSE in JS, which would silently jam the gun.)
        if (inst._gunCd > 0) inst._gunCd--;
        if (prof.armed && (inst._gunCd || 0) <= 0 &&
            (this._mouseFireHeld || a.keyDown('F') || a.padDown('attack'))) {
            this.fireVehicleGun(inst);
            inst._gunCd = 10;
        }

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

        const DRAG = 2.2;
        let speed = inst._kartSpeed || 0;
        speed += (throttle * prof.accel - speed * DRAG * (throttle === 0 ? 1.6 : 1)) * dt;
        speed = Math.max(-prof.max * 0.5, Math.min(prof.max, speed));
        inst._kartSpeed = speed;
        // Steering authority grows with speed unless the vehicle can turn in
        // place (creatures pivot; karts don't).
        const authority = prof.turnInPlace
            ? 1 : Math.max(0.25, Math.min(1, Math.abs(speed) / 4)) * Math.sign(speed || 1);
        inst.rotation.y += steer * prof.turn * dt * authority;
        inst._lastSteer = steer;   // scripts read this (wing banking)

        // Flight: with airspeed, holding Space climbs; without the climb
        // key the wing GLIDES (sink rate capped) as long as it keeps speed.
        // Slow below stall speed and gravity is all yours again.
        if (prof.canFly && inst._kartBody) {
            const airspeed = Math.abs(speed);
            const climbHeld = a.keyDown(' ') || a.padDown('jump');
            if (climbHeld && airspeed > 3) {
                inst._kartBody.vy = Math.min(inst._kartBody.vy + 30 * dt, 6);
            } else if (!inst._kartBody.grounded && airspeed > 2) {
                inst._kartBody.vy = Math.max(inst._kartBody.vy, -2.5);
            }
        }

        const vx = Math.sin(inst.rotation.y) * speed;
        const vz = Math.cos(inst.rotation.y) * speed;
        inst._kartBody.step(vx, vz);

        // Watercraft ride the water surface: when the hull is over a t_water
        // column, ease its Y to the surface (minus the draft) and cancel
        // gravity so it doesn't sink. Over dry land it behaves like a normal
        // grounded vehicle -- you can beach it, but it belongs on the water.
        if (prof.watercraft) {
            const surf = this.waterTopAt(inst.position.x, inst.position.z);
            if (surf != null) {
                const draft = 0.35;
                inst.position.y += ((surf - draft) - inst.position.y) * Math.min(1, 6 * dt);
                inst._kartBody.vy = 0;
                inst._onWater = true;
            } else {
                inst._onWater = false;
            }
        }

        // Seat the player; the camera follows them for free.
        this.player.position.copyFrom(inst.position.add(new BABYLON.Vector3(0, prof.seatY, 0)));
        this.player.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(inst.rotation.y, 0, 0);
    }

    // ---- photo mode ------------------------------------------------------------

    // Freeze the world for the perfect shot: the update loop short-circuits
    // (see update), the HUD hides, and WASD/R/F dolly the free camera while
    // the mouse keeps orbiting. Enter captures a PNG; P again resumes play.
    togglePhotoMode() {
        const app = this.app;
        if (!this.photoMode) {
            this.photoMode = true;
            if (this.cc) this.cc.stop();
            this.clearLockOn();
            this._photoReturn = {
                alpha: app.camera.alpha, beta: app.camera.beta,
                radius: app.camera.radius, target: app.camera.target.clone(),
            };
            if (app.gui && app.gui.rootContainer) app.gui.rootContainer.isVisible = false;
        } else {
            this.photoMode = false;
            if (this._photoReturn) {
                app.camera.alpha = this._photoReturn.alpha;
                app.camera.beta = this._photoReturn.beta;
                app.camera.radius = this._photoReturn.radius;
                app.camera.target.copyFrom(this._photoReturn.target);
            }
            if (app.gui && app.gui.rootContainer) app.gui.rootContainer.isVisible = true;
            if (this.cc) this.cc.start();
            app.toasty('Back to the action!');
        }
    }

    updatePhotoCamera() {
        const app = this.app;
        const cam = app.camera;
        const dt = Math.min(0.05, app.scene.getEngine().getDeltaTime() / 1000);
        const speed = (app.keyDown('SHIFT') ? 20 : 8) * dt;

        // Dolly the orbit target camera-relative; the mouse orbits as usual.
        const fwd = cam.target.subtract(cam.position);
        fwd.y = 0;
        if (fwd.lengthSquared() < 0.0001) fwd.copyFromFloats(0, 0, 1);
        fwd.normalize();
        const right = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), fwd);
        if (app.keyDown('W')) cam.target.addInPlace(fwd.scale(speed));
        if (app.keyDown('S')) cam.target.addInPlace(fwd.scale(-speed));
        if (app.keyDown('D')) cam.target.addInPlace(right.scale(speed));
        if (app.keyDown('A')) cam.target.addInPlace(right.scale(-speed));
        if (app.keyDown('R')) cam.target.y += speed;
        if (app.keyDown('F')) cam.target.y -= speed;

        if (app.keyPressed('ENTER')) this.capturePhoto();
    }

    capturePhoto() {
        const app = this.app;
        BABYLON.Tools.CreateScreenshotUsingRenderTarget(
            app.scene.getEngine(), app.camera, { width: 1280, height: 720 },
            (data) => {
                app.lastPhotoData = data;
                if (!app.noPhotoDownload) {
                    const a = document.createElement('a');
                    a.href = data;
                    a.download = 'iis-photo.png';
                    a.click();
                }
            });
    }

    // ---- swimming --------------------------------------------------------------
    // Inside a t_water volume: gravity drops to a gentle sink, move speed
    // halves, and holding Space strokes upward -- capped just under the
    // surface so you tread water instead of launching skyward. Everything
    // restores on exit (and after respawn, since the check runs on-foot
    // every frame).
    updateSwimming() {
        const cc = this.cc;
        if (!cc || !this.player) return;
        const p = this.player.position;
        // The player is "in water" when a t_water column contains them
        // vertically; the surface is that column's stacked top.
        const surf = this.waterSurfaceAt(p.x, p.z, p.y + 0.9, p.y + 0.4);
        const vol = surf != null ? { top: surf } : null;
        if (vol && !this.swimming) {
            this.swimming = true;
            this._preSwim = {
                gravity: cc._gravity,
                walk: cc._actionMap.walk.speed,
                run: cc._actionMap.run.speed,
            };
            cc.setGravity(1.5);
            cc.setWalkSpeed(this._preSwim.walk * 0.55);
            cc.setRunSpeed(this._preSwim.run * 0.55);
            this.app.toasty('Splash!  Hold Space to swim up.');
        } else if (!vol && this.swimming) {
            this.swimming = false;
            cc.setGravity(this._preSwim ? this._preSwim.gravity : 9.8);
            cc.setWalkSpeed(this._preSwim ? this._preSwim.walk : 6);
            cc.setRunSpeed(this._preSwim ? this._preSwim.run : 12);
        }
        if (this.swimming && vol) {
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            if (this.app.keyDown(' ') && this.player.position.y + 1.2 < vol.top) {
                this.player.moveWithCollisions(new BABYLON.Vector3(0, 5 * dt, 0));
            }
        }
    }

    // The water surface height at world (x, z), or null if no t_water column
    // spans that spot within [loY, hiY]. Climbs the stack so deep pools of
    // stacked blocks report their true top. Shared by swimming and floaters.
    waterSurfaceAt(x, z, loY, hiY) {
        const wo = this.app.findWorldObject('t_water');
        if (!wo) return null;
        const cols = [];
        wo.instances.forEach((w) => {
            if (!w) return;
            w.computeWorldMatrix(true);
            const bb = w.getBoundingInfo().boundingBox;
            const mn = bb.minimumWorld, mx = bb.maximumWorld;
            if (x > mn.x && x < mx.x && z > mn.z && z < mx.z) cols.push({ lo: mn.y, hi: mx.y });
        });
        const lo = (loY != null) ? loY : -Infinity;
        const hi = (hiY != null) ? hiY : Infinity;
        const inside = cols.find((c) => lo > c.lo && hi < c.hi);
        if (!inside) return null;
        let top = inside.hi, grew = true;
        while (grew) {
            grew = false;
            for (const c of cols) if (c.lo < top + 0.05 && c.hi > top) { top = c.hi; grew = true; }
        }
        return top;
    }

    // The highest water-surface height at (x, z) regardless of what's there
    // vertically -- for floaters, which ease DOWN onto the surface rather
    // than needing to already be inside the column. null if no water at xz.
    waterTopAt(x, z) {
        const wo = this.app.findWorldObject('t_water');
        if (!wo) return null;
        let top = null;
        wo.instances.forEach((w) => {
            if (!w) return;
            w.computeWorldMatrix(true);
            const bb = w.getBoundingInfo().boundingBox;
            const mn = bb.minimumWorld, mx = bb.maximumWorld;
            if (x > mn.x && x < mx.x && z > mn.z && z < mx.z) {
                if (top == null || mx.y > top) top = mx.y;
            }
        });
        return top;
    }

    // Buoyant props (inst.buoyant, e.g. a barrel or crate) bob on the water
    // instead of sinking through it: each eases toward the surface with a
    // gentle sine bob and slow spin. Only props whose CENTRE sits within a
    // water column float; on dry land they fall/rest normally (untouched).
    updateFloaters() {
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._floatPhase = (this._floatPhase || 0) + dt;
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (!inst || !inst.buoyant) return;
                const p = inst.position;
                const surf = this.waterTopAt(p.x, p.z);
                // No water under it, or it's perched high above (a prop on a
                // tower shouldn't get yanked into a distant pool): leave it.
                if (surf == null || p.y > surf + 5) { inst._floating = false; return; }
                const half = inst._floatHalf != null ? inst._floatHalf : 0.4;
                const bob = Math.sin((this._floatPhase * 1.6) + (inst.worldId || 0)) * 0.12;
                const target = surf - half + bob;   // ride mostly submerged
                inst.position.y += (target - inst.position.y) * Math.min(1, 4 * dt);
                inst.rotation.y += 0.25 * dt;
                inst._floating = true;
            });
        });
    }

    // ---- climbing ------------------------------------------------------------
    // Near a pr_ladder (horizontally close, within its vertical span) and
    // holding W/S: gravity suspends and you ascend/descend at a steady rate,
    // hugged to the ladder line so you can't drift off. Step off the top by
    // walking forward once you clear it. Same volume-override shape as
    // swimming, so it restores cleanly on exit and after respawn.
    updateClimbing() {
        const cc = this.cc;
        if (!cc || !this.player || this.driving || this.grinding) return;
        const wo = this.app.findWorldObject('pr_ladder');
        let ladder = null;
        if (wo) {
            const p = this.player.position;
            wo.instances.forEach((L) => {
                if (!L || ladder) return;
                L.computeWorldMatrix(true);
                const bb = L.getBoundingInfo().boundingBox;
                const mn = bb.minimumWorld, mx = bb.maximumWorld;
                const cx = (mn.x + mx.x) / 2, cz = (mn.z + mx.z) / 2;
                const near = Math.hypot(p.x - cx, p.z - cz) < 1.3;
                const spanned = p.y + 1.6 > mn.y && p.y < mx.y + 0.3;
                if (near && spanned) ladder = { cx, cz, top: mx.y, bottom: mn.y };
            });
        }
        // You only "grab" the ladder while actively climbing (W or S); this
        // lets you walk past one without being trapped, and drop off freely.
        const wantClimb = ladder && (this.app.keyDown('W') || this.app.keyDown('S'));
        if (wantClimb && !this.climbing) {
            this.climbing = true;
            this._preClimbGravity = cc._gravity;
            cc.setGravity(0);
            if (cc._kartBody) cc._kartBody.vy = 0;
        } else if (!wantClimb && this.climbing) {
            this.climbing = false;
            cc.setGravity(this._preClimbGravity != null ? this._preClimbGravity : 9.8);
        }
        if (this.climbing && ladder) {
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            const CLIMB = 3.5;   // units/second
            let dy = 0;
            if (this.app.keyDown('W')) dy += CLIMB * dt;
            if (this.app.keyDown('S')) dy -= CLIMB * dt;
            // Cap just above the top so you settle onto the ledge, not launch.
            if (this.player.position.y >= ladder.top + 0.2 && dy > 0) dy = 0;
            // Hug the ladder line: pull horizontally toward it so W (which the
            // CC also reads as walk) can't peel you off the rungs.
            const pull = (t, c) => t + (c - t) * Math.min(1, 8 * dt);
            this.player.position.x = pull(this.player.position.x, ladder.cx);
            this.player.position.z = pull(this.player.position.z, ladder.cz);
            if (dy !== 0) this.player.position.y += dy;   // on the rails, not the rungs
        }
    }

    // ---- traversal toys: grind rails + trampolines ----------------------------

    // Step onto a rail head and get carried hands-free along its wired path
    // chain. The CC stops for the ride (same suspension as driving) and
    // restarts at the end of the line.
    startGrind(rail, points) {
        if (this.grinding || this.driving || !this.player || !this.cc) return;
        if (!points || !points.length) return;
        this.grinding = { rail, points, idx: 0 };
        this.cc.stop();
        this.clearLockOn();
        this.app.toasty('Grinding!');
    }

    updateGrinding() {
        const g = this.grinding;
        if (!g || !this.player) { this.endGrind(); return; }
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        const SPEED = 9;   // units/second along the rail
        const target = g.points[g.idx].add(new BABYLON.Vector3(0, 1.1, 0));
        const to = target.subtract(this.player.position);
        const d = to.length();
        const step = SPEED * dt;
        if (d <= step) {
            this.player.position.copyFrom(target);
            g.idx++;
            if (g.idx >= g.points.length) { this.endGrind(); return; }
        } else {
            this.player.position.addInPlace(to.scale(step / d));
            if (Math.abs(to.x) > 0.001 || Math.abs(to.z) > 0.001) {
                this.player.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
                    Math.atan2(to.x, to.z), 0, 0);
            }
        }
    }

    endGrind() {
        if (!this.grinding) return;
        this.grinding = null;
        if (this.cc) this.cc.start();
    }

    // A trampoline launch: borrow the CC's jump at a boosted speed; the
    // update loop hands the stock speed back a few frames after liftoff.
    bouncePlayer(power) {
        if (!this.cc || this.driving || this.grinding) return;
        this.cc.setJumpSpeed(power);
        this.cc.jump();
        this._bounceRestore = 30;
    }

    // A cannon / launch pad: fling the player along `dir` (a normalised
    // horizontal vector) with a ballistic arc -- the trampoline's CC-jump
    // borrow for height, plus a decaying horizontal impulse applied per frame
    // (the dodge-velocity pattern). frames controls the throw distance.
    launchPlayer(dir, height, speed, frames) {
        if (!this.cc || this.driving || this.grinding) return;
        const d = dir.clone(); d.y = 0;
        if (d.lengthSquared() < 0.0001) return;
        d.normalize();
        // A single per-frame impulse carrying BOTH forward throw and an upward
        // kick, applied via moveWithCollisions and eased out at 0.94/frame
        // (the dodge-velocity path). Grounded-independent -- the player can be
        // mid-air over the barrel -- and the CC's own gravity supplies the
        // downward half of the arc, so the throw reads as a real launch.
        this._launchVel = d.scale(speed || 0.6);
        this._launchVel.y = (height || 12) * 0.06;
        this._launchFrames = frames || 26;
    }

    // ---- drop-in buddy (local 2P v1) ------------------------------------------
    // The buddy is a friendly bipedal rig (the walker builder in a fixed
    // friendly green) on the enemy-shared GravityBody -- deliberately NOT a
    // second CharacterController, so there is no double keyboard binding and
    // no camera fight. Honest v1 scope: the buddy moves, jumps and melees on
    // the second pad; enemies still hunt player 1; triggers/pickups only see
    // player 1; falling off the world auto-rescues the buddy to P1's side.

    // Fill the first empty slot (or the given one) with a new buddy rig.
    buddyJoin(slot) {
        if (!this.player) return;
        if (slot == null) slot = this.buddies.findIndex((b) => !b);
        if (slot < 0 || slot > 2 || this.buddies[slot]) {
            if (slot < 0) this.app.toasty('The party is full (4 players).');
            return;
        }
        const em = this.enemyManager;
        const COLORS = [
            new BABYLON.Color3(0.35, 1.0, 0.55),   // P2 green
            new BABYLON.Color3(1.0, 0.65, 0.25),   // P3 orange
            new BABYLON.Color3(0.75, 0.5, 1.0),    // P4 violet
        ];
        const root = BABYLON.MeshBuilder.CreateBox('coopBuddy' + slot,
            { width: 0.5, height: 0.2, depth: 0.5 }, this.app.scene);
        root.isVisible = false;
        root.position = this.player.position.add(new BABYLON.Vector3(1.6 + slot * 0.9, 1.5, slot * 0.7));
        const parts = em.buildBipedal(root, COLORS[slot]);
        const body = new GravityBody(this.app.scene, root, {
            ellipsoid: new BABYLON.Vector3(0.4, 1, 0.4),
            ellipsoidOffset: new BABYLON.Vector3(0, 1, 0),
        });
        this.buddies[slot] = {
            slot, root, parts, body, walkPhase: 0, attackCooldown: 0,
            hp: 60, maxHp: 60, hurtCooldown: 0, downed: 0,
        };
        this.app.toasty('Player ' + (slot + 2) + ' joined!');
    }

    // Remove the LAST occupied slot (single-buddy callers thus remove "the"
    // buddy). Any split re-establishes itself next frame if still warranted.
    buddyLeave() {
        for (let i = 2; i >= 0; i--) {
            const b = this.buddies[i];
            if (!b) continue;
            this.disposeSplitScreen();
            b.root.dispose(false, false);
            this.buddies[i] = null;
            this.app.toasty('Player ' + (i + 2) + ' left.');
            return;
        }
    }

    buddyLeaveAll() {
        while (this.buddies.some(Boolean)) this.buddyLeave();
    }

    // Every live player position the enemies can hunt (P1 always; each buddy
    // unless it's down). EnemyManager picks the nearest per enemy.
    combatTargets() {
        const out = [];
        if (this.player) out.push({ kind: 'p1', pos: this.player.position });
        this.buddies.forEach((b) => {
            if (b && b.downed <= 0) out.push({ kind: 'buddy', pos: b.root.position, b: b });
        });
        return out;
    }

    // Route enemy damage to whichever player was struck.
    damageTarget(t, amount, sourcePos) {
        if (t && t.kind === 'buddy') this.damageBuddy(t.b || this.buddies[0], amount);
        else this.damagePlayer(amount, sourcePos);
    }

    // Buddy damage: no blocking or i-frames, just a hurt cooldown and a
    // downed state -- at 0 HP the buddy slumps for a few seconds, enemies
    // lose interest, then it pops back up at half health. Couch-friendly:
    // nobody sits out for long. Accepts (buddy, amount) or the legacy
    // single-buddy (amount) form.
    damageBuddy(a, b2) {
        const b = (typeof a === 'number') ? this.buddies[0] : a;
        const amount = (typeof a === 'number') ? a : b2;
        if (!b || b.downed > 0 || b.hurtCooldown > 0) return;
        b.hurtCooldown = 15;
        b.hp -= amount;
        if (b.hp <= 0) {
            b.hp = 0;
            b.downed = 180;
            this.app.toasty('Player ' + (b.slot + 2) + ' is down!  Back up in a moment...');
        }
    }

    // A buddy's melee: the same frontal-arc swing as P1, from that buddy.
    buddyAttack(b) {
        b = b || this.buddies[0];
        if (!b || b.attackCooldown > 0) return;
        b.attackCooldown = 14;
        const fwd = new BABYLON.Vector3(Math.sin(b.root.rotation.y), 0, Math.cos(b.root.rotation.y));
        this.spawnAttackFx(b.root.position);
        this.enemyManager.damageInArc(b.root.position, fwd, 3.0, 0.34, 1);
        this.damageBlobsInArc(b.root.position, fwd, 3.0, 0.34, 1);
    }

    updateBuddies() {
        for (let i = 0; i < 3; i++) this._updateBuddySlot(i);

        // Frame the party (single-camera mode): widen toward the farthest
        // live buddy. While split, each pane frames its own player instead.
        if (this.player && !this._split) {
            let maxSep = 0;
            this.buddies.forEach((b) => {
                if (b) maxSep = Math.max(maxSep,
                    BABYLON.Vector3.Distance(b.root.position, this.player.position));
            });
            if (maxSep > 8 && this.app.camera.radius < Math.min(46, maxSep * 1.4)) {
                const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
                const want = Math.min(46, maxSep * 1.4);
                this.app.camera.radius += (want - this.app.camera.radius) * Math.min(1, 2.5 * dt);
            }
        }

        this.updateSplitScreen();
    }

    _updateBuddySlot(i) {
        const b = this.buddies[i];
        const pads = this.app.buddyPads;
        if (!b) {
            // That slot's pad pressing any button drops its buddy in.
            if (pads && pads[i] && pads[i].wantsJoin) {
                pads[i].wantsJoin = false;
                this.buddyJoin(i);
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
                this.app.toasty('Player ' + (i + 2) + ' is back up!');
            }
            return;
        }

        // Input: the harness hooks (testBuddyPad = slot 0's legacy alias),
        // else live sticks from that slot's gamepad.
        const test = (i === 0 ? this.app.testBuddyPad : null) ||
            (this.app.testBuddyPads && this.app.testBuddyPads[i]);
        const padDev = this.app.gamepads && this.app.gamepads[i + 1];
        const ls = (test && test.leftStick) || (padDev && padDev.leftStick) || null;
        const jumpHeld = test ? !!test.jumpHeld : pads[i].jumpHeld;
        let attack = false;
        if (test && test.attackQueued) { attack = true; test.attackQueued = false; }
        else if (pads[i].attackQueued) { attack = true; pads[i].attackQueued = false; }

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
        if (attack) this.buddyAttack(b);

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
            b.root.position = this.player.position.add(
                new BABYLON.Vector3(1.6 + i * 0.9, 1.5, i * 0.7));
            b.body.vy = 0;
        }
    }

    // Automatic split-screen, up to four panes: past comfortable framing
    // range the view splits (P1 always in the first pane, live buddies in
    // the rest -- halves for 2 players, half + quadrants for 3, a 2x2 grid
    // for 4); reuniting merges. Split when ANY buddy passes 26, merge when
    // ALL are back under 18 (hysteresis, so the boundary can't flicker).
    // The fullscreen HUD is masked out of every buddy pane via layer masks.
    updateSplitScreen() {
        const cam = this.app.camera;
        const scene = this.app.scene;
        const live = [];
        this.buddies.forEach((b, i) => { if (b) live.push({ b, i }); });
        let maxSep = 0;
        if (this.player) live.forEach((e) => {
            maxSep = Math.max(maxSep,
                BABYLON.Vector3.Distance(e.b.root.position, this.player.position));
        });
        const want = !!(live.length && this.player &&
            (this._split ? maxSep > 18 : maxSep > 26));
        const panes = 1 + live.length;
        if (!want) {
            if (!this._split) return;
            this._split = false;
            this._splitPanes = 0;
            scene.activeCameras = null;
            scene.activeCamera = cam;
            cam.viewport = new BABYLON.Viewport(0, 0, 1, 1);
            return;
        }
        if (this._split && panes === this._splitPanes) return;

        // (Re)apply the layout -- also runs when the party size changes.
        const firstSplit = !this._split;
        this._split = true;
        this._splitPanes = panes;
        const LAYOUTS = {
            2: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
            3: [[0, 0, 0.5, 1], [0.5, 0.5, 0.5, 0.5], [0.5, 0, 0.5, 0.5]],
            4: [[0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5], [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5]],
        };
        const layout = LAYOUTS[panes];
        if (this.app.gui && this.app.gui.layer) {
            this.app.gui.layer.layerMask = 0x10000000;
            cam.layerMask = 0x1FFFFFFF;
        }
        const L0 = layout[0];
        cam.viewport = new BABYLON.Viewport(L0[0], L0[1], L0[2], L0[3]);
        const cams = [cam];
        live.forEach((e, k) => {
            let bc = this._buddyCams[e.i];
            if (!bc) {
                bc = new BABYLON.FollowCamera('buddyCam' + e.i,
                    e.b.root.position.add(new BABYLON.Vector3(0, 6, -10)), scene);
                bc.radius = 11;
                bc.heightOffset = 5;
                bc.cameraAcceleration = 0.06;
                bc.maxCameraSpeed = 25;
                this._buddyCams[e.i] = bc;
            }
            bc.layerMask = 0x0FFFFFFF;
            bc.lockedTarget = e.b.root;
            const L = layout[k + 1];
            bc.viewport = new BABYLON.Viewport(L[0], L[1], L[2], L[3]);
            cams.push(bc);
        });
        this._buddyCam = this._buddyCams[0];
        scene.activeCameras = cams;
        if (firstSplit) this.app.toasty('Split screen — reunite to merge!');
    }

    // Tear the split down (buddy left, mode exit): merge and free cameras.
    disposeSplitScreen() {
        if (this._split) {
            this.app.scene.activeCameras = null;
            this.app.scene.activeCamera = this.app.camera;
            this.app.camera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
            this._split = false;
            this._splitPanes = 0;
        }
        this._buddyCams.forEach((c, i) => {
            if (c) { c.dispose(); this._buddyCams[i] = null; }
        });
        this._buddyCam = null;
    }

    // ---- hired companions ------------------------------------------------------
    // Ground-walking followers for the progression slot's hired roster.
    // Rebuilt whenever the roster SIGNATURE changes (hire, dismiss, slot
    // switch, world entry) -- the sidekick rebuild-on-name pattern at list
    // level, which is exactly what makes companions "respawn when the slot
    // is reloaded and a world is entered".
    updateCompanions() {
        const list = this.app.hiredCompanions || [];
        const sig = list.join(',');
        if (sig !== this._compSig) {
            this._compSig = sig;
            (this.companions || []).forEach((c) => c.root.dispose(false, false));
            this.companions = list.slice(0, 3).map((id, i) => {
                const comp = this.app.companionById(id);
                const root = BABYLON.MeshBuilder.CreateBox('companion_' + id,
                    { width: 0.5, height: 0.2, depth: 0.5 }, this.app.scene);
                root.isVisible = false;
                root.position = (this.player ? this.player.position : new BABYLON.Vector3(0, 1, 0))
                    .add(new BABYLON.Vector3(-1.5 - i * 0.8, 1.5, 1 + i * 0.6));
                const parts = this.enemyManager.buildBipedal(root,
                    new BABYLON.Color3(comp.tint[0], comp.tint[1], comp.tint[2]));
                const body = new GravityBody(this.app.scene, root, {
                    ellipsoid: new BABYLON.Vector3(0.4, 1, 0.4),
                    ellipsoidOffset: new BABYLON.Vector3(0, 1, 0),
                });
                return { id, root, parts, body, walkPhase: 0 };
            });
        }
        if (!this.player || !this.companions) return;
        this.companions.forEach((c, i) => {
            const to = this.player.position.subtract(c.root.position);
            to.y = 0;
            const d = to.length();
            let vx = 0, vz = 0, moving = false;
            if (d > 3 + i) {
                to.scaleInPlace(1 / d);
                vx = to.x * 4; vz = to.z * 4;
                c.root.rotation.y = Math.atan2(to.x, to.z);
                moving = true;
            }
            if (c.root.position.y < this.player.position.y - 20 || d > 60) {
                c.root.position = this.player.position.add(new BABYLON.Vector3(-1.5 - i, 1.5, 1));
                c.body.vy = 0;
            }
            c.body.step(vx, vz);
            if (moving) c.walkPhase += 0.24; else c.walkPhase *= 0.8;
            const sw = Math.sin(c.walkPhase) * 0.5;
            c.parts.leftHip.rotation.x = sw;
            c.parts.rightHip.rotation.x = -sw;
            c.parts.leftSh.rotation.x = -sw * 0.8;
            c.parts.rightSh.rotation.x = sw * 0.8;
        });
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
        // A cannon launch's horizontal impulse rides here too (also per-frame,
        // moveWithCollisions), decaying so it eases out rather than stopping dead.
        if (this._launchFrames > 0 && this._launchVel && this.player &&
                !this.driving && !this.grinding) {
            this._launchFrames--;
            this.player.moveWithCollisions(this._launchVel);
            this._launchVel.scaleInPlace(0.94);
        }
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
        if (this.lockTarget) { this.clearLockOn(); this.app.sound.play('lock-off'); return; }
        const p = this.player.position;
        let best = null, bestD = 25;
        this.enemyManager.enemies.forEach((rec) => {
            const d = BABYLON.Vector3.Distance(rec.mesh.position, p);
            if (d < bestD) { bestD = d; best = { type: 'em', rec: rec }; }
        });
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.isEnemy && !inst.defeated && !inst.isBreakable) {
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
        this.app.sound.play('lock-on');
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
                if (inst && inst.isEnemy && !inst.defeated && !inst.isBreakable) {
                    const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                    const d = BABYLON.Vector3.Distance(ip, p);
                    if (d < bestD) { bestD = d; best = ip; }
                }
            });
        });
        return best ? best.clone() : null;
    }

    playerForward() {
        // The avatar model's visual front is its local MINUS-z (proved by
        // walking it forward with the CC and measuring: displacement dot
        // local +z = -1). Everything aims/blocks/dodges relative to what the
        // player SEES, so forward is -z here -- flipping this one vector
        // once fixed dodge rolling forward and block/specials facing
        // backward (user-reported).
        const m = this.player.getWorldMatrix();
        const f = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, -1), m);
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
                if (ev.button === 0) this._mouseFireHeld = true;   // held LMB = vehicle gun
            } else if (pi.type === BABYLON.PointerEventTypes.POINTERUP && this._downInfo) {
                if (ev.button === 0) this._mouseFireHeld = false;
                const moved = Math.hypot(ev.clientX - this._downInfo.x, ev.clientY - this._downInfo.y);
                const button = this._downInfo.button;
                this._downInfo = null;
                // A drag rotates the camera; only a click (little movement) attacks.
                if (moved <= 6) this.clickAttack(button, this.aimPointFromPointer(pi));
            }
        });
    }

    unbindMouseCombat() {
        this._mouseFireHeld = false;
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
    // A Power power-up doubles outgoing melee/bolt damage while its timer
    // runs; a Shield power-up (handled in damagePlayer) negates incoming hits.
    powerMultiplier() {
        return (this._powerKind === 'power' && this._powerTimer > 0) ? 2 : 1;
    }

    // Grant a timed combat buff from a pk_powerup pickup.
    grantPowerUp(kind, frames) {
        this._powerKind = kind;
        this._powerTimer = frames || 300;
    }

    // The current pixel multiplier for the defeat streak. Tiers reward
    // sustained aggression without getting hit.
    streakMult() {
        const s = this._streak;
        if (s >= 10) return 3;
        if (s >= 6)  return 2;
        if (s >= 3)  return 1.5;
        return 1;
    }

    // Register an enemy defeat: extend the streak, refresh its window, and
    // drop BONUS pixels scaled by the multiplier (on top of the base reward
    // the defeat already spawned). Every defeat path funnels through here.
    notchDefeat(pos) {
        const prevMult = this.streakMult();
        this._streak++;
        this._streakTimer = 240;   // ~4s to land the next kill or lose the chain
        if (this._streak > this._bestStreak) this._bestStreak = this._streak;
        const mult = this.streakMult();
        if (mult > 1 && pos) {
            const bonus = Math.round(10 * (mult - 1));   // +5 / +10 / +20 pixels
            if (bonus > 0) this.spawnPixelBurst(pos, bonus);
        }
        if (mult > prevMult) this.app.toasty('Streak x' + this._streak + '  —  ' + mult + 'x pixels!');
    }

    // Break the streak (a hit landed, a death, or the window lapsed).
    resetStreak() { this._streak = 0; this._streakTimer = 0; }

    damagePlayer(amount, sourcePos) {
        if (this.hurtCooldown > 0) return;
        // Shield power-up: invulnerable while it lasts.
        if (this._powerKind === 'shield' && this._powerTimer > 0) {
            this.shieldedHits = (this.shieldedHits || 0) + 1;
            return;
        }
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
        // Guardian Ward: the first damaging hit each life is absorbed.
        if (this.gadgetGuardian && this.shieldCharge > 0) {
            this.shieldCharge = 0;
            this.hurtCooldown = 30;
            this.shieldedHits = (this.shieldedHits || 0) + 1;
            this.app.toasty('Guardian Ward absorbed the hit!');
            if (this.player) this.spawnAttackFx(this.player.position);
            return;
        }
        this.playerHp -= amount;
        this.hurtCooldown = 15;
        this.resetStreak();   // a hit that actually lands breaks the chain
        if (this.playerHp <= 0) {
            this.playerHp = 0;
            this._pendingRespawn = true;
            this.app.sound.play('player-death');
        } else {
            this.app.sound.play('player-hurt');
        }
    }

    respawn() {
        this.app.sound.play('respawn');
        this.resetStreak();                       // death breaks the chain
        if (this.driving) this.dismountKart();   // death mid-drive: on foot first
        this.endGrind();                          // death mid-grind: off the rail
        // The whole party comes back with P1, healthy and at their side.
        this.buddies.forEach((b, i) => {
            if (!b) return;
            b.hp = b.maxHp;
            b.downed = 0;
            b.root.scaling.y = 1;
            b.root.position = this.spawnPoint.add(new BABYLON.Vector3(1.6 + i * 0.9, 1.5, i * 0.7));
            b.body.vy = 0;
        });
        this.playerHp = this.playerMaxHp;
        this.hurtCooldown = 60;
        // Guardian Ward recharges each life.
        if (this.gadgetGuardian) this.shieldCharge = 1;
        this._powerKind = null; this._powerTimer = 0;
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

    // A scripted enemy (the shielder) can BLOCK a hit from a given attacker
    // position -- returns true to negate the damage. Ordinary enemies don't.
    _enemyBlocks(inst, fromPos) {
        return !!(inst && inst.script && inst.script.blocksHit && inst.script.blocksHit(fromPos));
    }

    // ---- portal doors: world swaps -------------------------------------------

    // Combat/effect state must not leak across a world swap: enemies,
    // projectiles and homing pixels belong to the world they were made in.
    _clearTransient() {
        this.enemyManager.reset();
        this.playerProjectiles.forEach((pr) => pr.mesh && pr.mesh.dispose());
        this.playerProjectiles = [];
        this.pixelBursts.forEach((pb) => pb.mesh && pb.mesh.dispose());
        this.pixelBursts = [];
        this.clearLockOn();
        this.comboStage = 0;
        this.comboTimer = 0;
    }

    // Move the player AND drag the follow camera by the same delta, so the
    // view arrives with them instead of flying across the world.
    _teleport(to) {
        const delta = to.subtract(this.player.position);
        this.player.position.copyFrom(to);
        if (this.app.camera && this.app.camera.position) {
            this.app.camera.position.addInPlace(delta);
        }
    }

    // The current world's exit portal (a portal door in 'exit' mode).
    _findExitDoor() {
        const wo = this.app.findWorldObject('pr_door_cell');
        if (!wo) return null;
        return wo.instances.find((i) => i && i.params && i.params.mode === 'exit') || null;
    }

    // Turn the player (and the follow camera) to face AWAY from a door just
    // stepped through, so walking forward never falls straight back in. The
    // CharacterController derives avatar yaw FROM the camera (rotation.y =
    // _av2cam - alpha), so camera alpha is the source of truth: aim it along
    // the away direction, then apply the CC's own mapping so the visual
    // facing and the first W press agree.
    _faceAwayFrom(doorPos) {
        if (!this.player) return;
        const away = this.player.position.subtract(doorPos);
        away.y = 0;
        if (away.lengthSquared() < 0.0001) return;
        away.normalize();
        const cam = this.app.camera;
        if (cam && cam.alpha !== undefined) {
            cam.alpha = Math.atan2(-away.z, -away.x);
            if (this.cc && this.cc._av2cam !== undefined) {
                this.player.rotation.y = this.cc._av2cam - cam.alpha;
            }
        }
    }

    // Execute a portal swap requested by PortalDoorScript. Runs from the top
    // of update() only -- it rebuilds every instance in the scene.
    doPortal(req) {
        const app = this.app;
        if (!this.player) return;

        if (req.type === 'enter') {
            if (!app.enterSubWorld(req.name, req.seed, this.player.position, req.doorId)) return;
            this._clearTransient();
            // Arrive in front of the sub-level's exit door. If the room was
            // edited down to nothing, inject one -- never strand the player.
            let exit = this._findExitDoor();
            if (!exit) {
                const wo = app.findWorldObject('pr_door_cell');
                exit = wo ? wo.createInstance() : null;
                if (exit) {
                    exit.position = new BABYLON.Vector3(0, 1.5, 3.2);
                    exit.params = Object.assign({}, exit.params, { mode: 'exit' });
                }
            }
            const spawn = exit
                ? (exit.getAbsolutePosition ? exit.getAbsolutePosition() : exit.position)
                    .add(new BABYLON.Vector3(0, -0.9, -2.2))
                : new BABYLON.Vector3(0, 1.5, 0);
            this._teleport(spawn);
            if (exit) {
                this._faceAwayFrom(exit.getAbsolutePosition
                    ? exit.getAbsolutePosition() : exit.position);
            }
            this.spawnPoint = spawn.clone();        // death inside respawns inside
            app.world.spawnPoint = spawn.clone();   // mode switches keep the spot
            this.app.sound.play('respawn');
            app.toasty('Entering "' + req.name + '"...');
        } else if (req.type === 'exit') {
            const frame = app.exitSubWorld();
            if (!frame) return;
            this._clearTransient();
            let out = frame.returnSpot
                ? new BABYLON.Vector3(frame.returnSpot.x, frame.returnSpot.y, frame.returnSpot.z)
                : (app.world.spawnPoint ? app.world.spawnPoint.clone() : new BABYLON.Vector3(0, 3, 0));
            // The return spot was by definition beside the door -- push it
            // clear so the doorway doesn't swallow the player again.
            const door = app.findInstance('pr_door_cell', frame.doorId);
            if (door) {
                const dp = door.getAbsolutePosition ? door.getAbsolutePosition() : door.position;
                const flat = new BABYLON.Vector3(out.x - dp.x, 0, out.z - dp.z);
                if (flat.lengthSquared() < 2.56) {
                    const dir = flat.lengthSquared() > 0.0001
                        ? flat.normalize() : new BABYLON.Vector3(0, 0, -1);
                    out = new BABYLON.Vector3(dp.x + dir.x * 2.6, out.y, dp.z + dir.z * 2.6);
                }
            }
            this._teleport(out);
            if (door) {
                this._faceAwayFrom(door.getAbsolutePosition
                    ? door.getAbsolutePosition() : door.position);
            }
            this.spawnPoint = (app.world.spawnPoint || out).clone();
            if (door) app.fireEvent(door, 'exited');
            this.app.sound.play('respawn');
            app.toasty('Back to the world above.');
        }
    }

    // A blocked hit: a pale flash + clang, no damage.
    _clang(inst) {
        const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
        if (this.enemyManager && this.enemyManager.spawnFlash) {
            this.enemyManager.spawnFlash(ip.add(new BABYLON.Vector3(0, 1, 0)),
                new BABYLON.Color3(0.7, 0.85, 1.0), 6);
        }
        this.app.sound.play('shot-blocked');
    }

    defeatEnemy(inst, wo) {
        inst.defeated = true;
        this.app.sound.play('enemy-defeat');
        // Every placed-enemy defeat (scripted onDefeated included) notches the
        // streak before rewards are handed out.
        const dpos = (inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position).clone();
        this.notchDefeat(dpos);
        // Scripted enemies (the boss) own their defeat: rewards, wiring
        // events, and a RESETTABLE hide instead of disposal.
        if (inst.script && inst.script.onDefeated) {
            inst.script.onDefeated(this);
            return;
        }
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
            if (pb.delay > 0 && !this.gadgetMagnet) {
                pb.delay--;
                pb.vel.scaleInPlace(0.92);
                pb.mesh.position.addInPlace(pb.vel);
            } else {
                if (this.gadgetMagnet) pb.delay = 0;   // magnet: no scatter
                const dir = target.subtract(pb.mesh.position);
                const dist = dir.length();
                // The collect radius grows the longer a pixel has been chasing, so
                // one that keeps overshooting (orbiting) is still swept up rather
                // than circling indefinitely; MAX_LIFE is the absolute backstop.
                const collect = (this.gadgetMagnet ? 3.5 : collectDist) + Math.max(0, pb.age - 90) * 0.015;
                if (dist < collect || pb.age >= MAX_LIFE) {
                    pb.mesh.dispose();
                    this.pixelBursts.splice(i, 1);
                    this.app.addPixels(1);   // always credited, never lost
                    this.app.sound.play('pixel');   // rate-limited inside the manager
                    continue;
                }
                dir.normalize();
                const acc = this.gadgetMagnet ? homeAccel * 2 : homeAccel;
                pb.vel.addInPlace(dir.scale(acc + (3.0 / (dist + 1)) * 0.02));
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