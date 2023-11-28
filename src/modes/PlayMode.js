class PlayMode {
    // The mode class' constructor is called when entering a mode, and
    // the dispose method when exiting a mode.
    constructor(app) {
        this.app = app;
        
        // Set static UI strings once on mode load
        this.app.modeName.text = "PlayMode";

        this.initPlayer();
    }

    dispose() {
        this.app.modeName.text = "Exiting PlayMode...";
        this.disposePlayer();
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
            // setAnimationRanges(skeleton);

            var sm = playMode.player.material;
            if (sm.diffuseTexture != null) {
                sm.backFaceCulling = true;
                sm.ambientColor = new BABYLON.Color3(1, 1, 1);
            }

            playMode.player.position = new BABYLON.Vector3(0, 12, 0);
            playMode.player.checkCollisions = true;
            playMode.player.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
            playMode.player.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);

            // initialize the character controller library
            playMode.cc = new CharacterController(playMode.player, playMode.app.camera, playMode.app.scene);
            playMode.cc.setFaceForward(false);
            playMode.cc.setMode(0);
            playMode.cc.setTurnSpeed(45);
            
            // below makes the controller point the camera at the player head which is approx
            // 1.5m above the player origin
            playMode.cc.setCameraTarget(new BABYLON.Vector3(0, 1.5, 0));

            // no first person view when camera is close to avatar
            playMode.cc.setNoFirstPerson(true);

            // make avatar movement relative to camera direction
            playMode.cc.setTurningOff(true);

            // the height of steps which the player can climb
            playMode.cc.setStepOffset(0.4);

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

            playMode.cc.setCameraElasticity(true);
            playMode.cc.makeObstructionInvisible(true);
            playMode.cc.start();
        });
    }

    disposePlayer() {
        this.cc.stop();
        this.player.dispose();
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

    }

    renderUI() {

    }
}