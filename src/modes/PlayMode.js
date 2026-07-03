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
        this.unbindMouseCombat();
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

            playMode.cc.start();

            // Cache the bones used to aim the upper body / fire from the hand, and
            // wire up mouse combat now that the avatar exists.
            playMode.cacheAimBones();
            playMode.bindMouseCombat();
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
        this.updatePlayerProjectiles();
        this.updateAimPose();
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

        // Melee: F key (kept for keyboard-only play) or a gamepad melee button.
        if (this.app.keyPressed('F') || this.app.consumePad('meleeAttack')) {
            this.meleeAttack();
        }
        // Ranged: a gamepad ranged button (mouse right-click is handled by the
        // pointer observer). Auto-aims at the nearest enemy when using a pad.
        if (this.app.consumePad('rangedAttack')) {
            this.rangedAttack();
        }
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
        const aim = this.resolveAim(aimPoint, 3.4);
        if (aim) this.aimAt(aim);
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

    // Fire a neon shot from the player's hand toward the aim point (or the
    // nearest enemy, for gamepad auto-aim). The upper body turns to aim.
    rangedAttack(aimPoint) {
        if (!this.player || this.rangedCooldown > 0) return;
        this.rangedCooldown = 18;
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

    updatePlayerProjectiles() {
        if (this.playerProjectiles.length === 0) return;
        const hitRange = 1.5, dmg = 1;
        for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
            const pr = this.playerProjectiles[i];
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

    // ---- aiming -------------------------------------------------------------

    // Resolve an aim point: an explicit world point, else the nearest enemy
    // within `maxDist`, else null.
    resolveAim(aimPoint, maxDist) {
        if (aimPoint) return aimPoint.clone ? aimPoint.clone() : aimPoint;
        const near = this.nearestEnemyPos(maxDist || 60);
        return near ? near : null;
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
        this.boneSpine = null; this.boneHand = null; this.boneArm = null;
        this._spineRest = null;
        const sk = this.player && this.player.skeleton;
        if (!sk) return;
        const find = (n) => sk.bones.find((b) => b.name === n);
        this.boneSpine = find('mixamorig:Spine1') || find('mixamorig:Spine2') || find('mixamorig:Spine');
        this.boneArm = find('mixamorig:RightArm');
        this.boneHand = find('mixamorig:RightHand');
        if (this.boneSpine) {
            try { this._spineRest = this.boneSpine.getRotationQuaternion(BABYLON.Space.LOCAL, this.player).clone(); }
            catch (_) { this._spineRest = null; }
        }
    }

    // Ease the upper-body twist toward the aim yaw while aiming, then relax. Best
    // effort: if the rig doesn't cooperate we just skip the skeletal twist.
    updateAimPose() {
        if (!this.player) return;
        if (this.aimTimer > 0) this.aimTimer--;
        if (!this.boneSpine || !this._spineRest) return;
        try {
            const facing = Math.atan2(this.playerForward().x, this.playerForward().z);
            let delta = this.aimYaw - facing;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            delta = Math.max(-1.4, Math.min(1.4, delta));            // clamp ~80deg
            const amt = (this.aimTimer > 0) ? delta : 0;              // relax to rest
            const twist = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, amt);
            const q = this._spineRest.multiply(twist);
            this.boneSpine.setRotationQuaternion(q, BABYLON.Space.LOCAL, this.player);
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