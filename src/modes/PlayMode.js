class PlayMode {
    // The mode class' constructor is called when entering a mode, and
    // the dispose method when exiting a mode.
    constructor(app) {
        this.app = app;

        // Combat / pixel-collection state.
        this.pixelBursts = [];   // {mesh, vel, delay, spin} tiny cubes homing to the player
        this.attackFxList = [];  // {mesh, life} transient swing effects
        this.attackCooldown = 0;

        // Player survival state.
        this.playerMaxHp = 100;
        this.playerHp = 100;
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
        this.disposePlayer();
        this.enemyManager.dispose();
        this.pixelBursts.forEach((pb) => pb.mesh && pb.mesh.dispose());
        this.attackFxList.forEach((fx) => fx.mesh && fx.mesh.dispose());
        this.pixelBursts = [];
        this.attackFxList = [];
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

            playMode.cc.start();
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

        // run update for all active object scripts
        app.BuildableObjectList.forEach((wo) => {
            wo.updateAllInstances(true, this);
        });

        this.handleCombat();
        this.updatePixelBursts();
        this.updateAttackFx();
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
        // F swings a melee attack that damages nearby enemies.
        if (this.attackCooldown === 0 && this.app.keyPressed('F')) {
            this.attack();
            this.attackCooldown = 12;
        }
    }

    attack() {
        const p = this.player.position;
        const range = 3.4;
        this.spawnAttackFx(p);
        // Auto-spawned TRON enemies.
        this.enemyManager.damageNear(p, range, 1);
        // Player-placed enemy objects (en_blob).
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if (inst && inst.isEnemy && !inst.defeated) {
                    const ip = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
                    if (BABYLON.Vector3.Distance(ip, p) <= range) {
                        inst.hp -= 1;
                        if (inst.hp <= 0) this.defeatEnemy(inst, wo);
                    }
                }
            });
        });
    }

    // Called by enemies when they land a hit on the player.
    damagePlayer(amount) {
        if (this.hurtCooldown > 0) return;
        this.playerHp -= amount;
        this.hurtCooldown = 15;
        if (this.playerHp <= 0) {
            this.playerHp = 0;
            this.respawn();
        }
    }

    respawn() {
        this.playerHp = this.playerMaxHp;
        this.hurtCooldown = 60;
        if (this.player) this.player.position = this.spawnPoint.clone();
        this.enemyManager.reset();
        this.app.toasty('Overwhelmed! Respawning...');
    }

    defeatEnemy(inst, wo) {
        inst.defeated = true;
        const pos = (inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position).clone();
        this.spawnPixelBurst(pos, 14);
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
            this.pixelBursts.push({ mesh: box, vel: vel, delay: 6 + Math.floor(Math.random() * 6), spin: (Math.random() - 0.5) * 0.3 });
        }
    }

    updatePixelBursts() {
        if (!this.player || this.pixelBursts.length === 0) return;
        const target = this.player.position.add(new BABYLON.Vector3(0, 1.2, 0));
        const collectDist = 0.7, homeAccel = 0.06, maxSpeed = 0.9;
        for (let i = this.pixelBursts.length - 1; i >= 0; i--) {
            const pb = this.pixelBursts[i];
            pb.mesh.rotation.y += pb.spin;
            pb.mesh.rotation.x += pb.spin * 0.7;
            if (pb.delay > 0) {
                pb.delay--;
                pb.vel.scaleInPlace(0.92);
                pb.mesh.position.addInPlace(pb.vel);
            } else {
                const dir = target.subtract(pb.mesh.position);
                const dist = dir.length();
                if (dist < collectDist) {
                    pb.mesh.dispose();
                    this.pixelBursts.splice(i, 1);
                    this.app.addPixels(1);
                    continue;
                }
                dir.normalize();
                pb.vel.addInPlace(dir.scale(homeAccel + (3.0 / (dist + 1)) * 0.02));
                if (pb.vel.length() > maxSpeed) pb.vel.normalize().scaleInPlace(maxSpeed);
                pb.mesh.position.addInPlace(pb.vel);
            }
        }
    }

    spawnAttackFx(p) {
        const fx = BABYLON.MeshBuilder.CreateSphere('attackFx', { diameter: 1.2, segments: 8 }, this.app.scene);
        fx.position = p.add(new BABYLON.Vector3(0, 1.0, 0));
        const mat = new BABYLON.StandardMaterial('attackFxMat', this.app.scene);
        mat.emissiveColor = new BABYLON.Color3(0.6, 0.9, 1.0);
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