class App {
    constructor() {
        const app = this;
        this.toastyTimer = 0;

        // Keyboard bindings
        this.keysPressed = {};
        window.addEventListener("keydown", (event) => {
            this.keysPressed[event.key.toUpperCase()] = true;
        });
        window.addEventListener("keyup", (event) => {
            this.keysPressed[event.key.toUpperCase()] = false;
        });

        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);

        this.camera = new BABYLON.ArcRotateCamera("Camera", 0-Math.PI / 3, Math.PI / 3, 20, BABYLON.Vector3.Zero(), this.scene);
        this.camera.attachControl(canvas, true);

        /*
        this.camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -10), this.scene);
        // The goal distance of camera from target
        this.camera.radius = 30;
        // The goal height of camera above local origin (centre) of target
        this.camera.heightOffset = 10;
        // The goal rotation of camera around local origin (centre) of target in x y plane
        this.camera.rotationOffset = 0;
        // Acceleration of camera in moving from current to goal position
        this.camera.cameraAcceleration = 0.005;
        // The speed at which acceleration is halted
        this.camera.maxCameraSpeed = 10;
        this.camera.attachControl(canvas, true);
        */

        var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene);
        this.defaultSphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this.scene);

        // Temporary camera target during loading
        this.camera.lockedTarget = this.defaultSphere;

        // Create a full-screen UI layer
        this.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        //this.gui.parseFromURLAsync('./assets/gui/main.json');

        // Create a text block
        this.modeName = this.TextBlock({
            text: "[Loading...]",
            color: "white",
            fontSize: 15,
            textHorizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER,
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            paddingTop: 20,
        });
        this.message = this.TextBlock({
            text: "",
            color: "white",
            fontSize: 15,
            textHorizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER,
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            paddingTop: 40,
        });


        this.activeMode = new BuildMode(app);

        // Load WorldObjects -- these are objects that can be built or are used by
        // built-in levels, etc. Basically, everything!
        this.BuildableObjectList = [];
        //this.loadAsset({rootUrl: modelsBaseUrl, filename: 'pirates/Characters_Anne.gltf'});
        //this.loadAsset({rootUrl: modelsBaseUrl, filename: 'cyberpunk/Platforms/Platform_2x2.gltf'});
        this.loadAsset(Assets.meshes.wall_glb);
        this.loadAsset(Assets.meshes.wallArch_glb);
        this.loadAsset(Assets.meshes.wallCorner_glb);
        this.loadAsset(Assets.meshes.rocks1_glb);
        const modelsBaseUrl = './assets/';
        this.loadAsset({rootUrl: modelsBaseUrl, filename: 'models/terrain/cube_floor1.gltf'});
        this.loadAsset({rootUrl: modelsBaseUrl, filename: 'models/terrain/cube_with_top4.gltf'});
        
        
        // Toggle the Babylon debug inspector
        window.addEventListener("keydown", (ev) => {
            if (ev.key === '`') {
                if (this.scene.debugLayer.isVisible()) {
                    this.scene.debugLayer.hide();
                } else {
                    this.scene.debugLayer.show();
                }
            }
        });

        // Run the main render loop
        app.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();
            if(null != this.activeMode) {
                this.activeMode.update();
            }

            this.renderUI();
            if(null != this.activeMode) {
                this.activeMode.renderUI();
            }
        });
    }

    // System-wide updates such as starting and existing particular modes
    update() {
        if(this.keyPressed('ESCAPE')) {
            if(null != this.activeMode) {
                this.activeMode.dispose();
                this.activeMode = null;
                this.modeName.text = "[NullMode]";
            } else {
                this.toasty('No active mode to exit!');
            }
        }

        if(this.keyPressed('1')) {
            if(null == this.activeMode) {
                this.activeMode = new BuildMode(this);
            } else {
                this.toasty('Please exit the active mode first!');
            }
        }
    }

    renderUI() {

    }

    loadAsset(assetProps) {
        // assetProps: { rootUrl: '', filename: '' }
        let app = this;
        BABYLON.SceneLoader.ImportMeshAsync("", assetProps.rootUrl, assetProps.filename, this.scene).then((result) => {
            // Check if the model is a single empty __root__ node with a single mesh under it
            let parent = result.meshes[0];
            if(result.meshes.length == 1) {
                object = parent;
                var nestedMeshes = false;
            } else if(result.meshes.length == 2 && parent.name == '__root__') {
                // If so, remove the root node and just save the child mesh so we can easily
                // have instances instead of needing deep clones and cluttering up the scene
                // graph.
                var object = parent.getChildMeshes()[0];    // The real mesh
                var nestedMeshes = false;
                object.setParent(null);                     // Removes parent while preserving rotation, scale, position, etc.
                parent.dispose();                           // Get rid of the __root__ node
                object.isVisible = false;
            } else {
                // Otherwise the model is more complex so we keep the root node and mark
                // the world object as having nested meshes, this means it will be deep cloned
                // wheen an instance is needed instead of a true instance being used (this
                // still shared geometry though).
                var object = result.meshes[0];
                
                let childMeshes = parent.getChildMeshes();
                let min = childMeshes[0].getBoundingInfo().boundingBox.minimumWorld;
                let max = childMeshes[0].getBoundingInfo().boundingBox.maximumWorld;
                for(let i=0; i<childMeshes.length; i++){

                    let meshMin = childMeshes[i].getBoundingInfo().boundingBox.minimumWorld;
                    let meshMax = childMeshes[i].getBoundingInfo().boundingBox.maximumWorld;

                    min = BABYLON.Vector3.Minimize(min, meshMin);
                    max = BABYLON.Vector3.Maximize(max, meshMax);
                    childMeshes[i].isVisible = false;

                    console.log('i', [childMeshes[i], min, max]);
                }
                object.setBoundingInfo(new BABYLON.BoundingInfo(min, max));
                //object.showBoundingBox = true;
                var nestedMeshes = true;
            }
            let woNewAsset = new WorldObject(app, assetProps.filename, object, nestedMeshes);
            this.BuildableObjectList.push(woNewAsset);
        });
    }

    keyPressed(key) {
        if(typeof this.keysPressed[key.toUpperCase()] != 'undefined') {
            var result = this.keysPressed[key.toUpperCase()];
            // Next time we will return false since we consumed this keypress
            // Use keyDown() instead to not clear the flag after checking
            this.keysPressed[key.toUpperCase()] = false;
            return result;
        }
    }

    keyDown(key) {
        if(typeof this.keysPressed[key.toUpperCase()] != 'undefined') {
            return this.keysPressed[key.toUpperCase()];
        }
    }

    toasty(message) {
        let app = this;
        this.message.text = message;
        if(this.toastyTimer) {
            clearTimeout(this.toastyTimer);
        }
        this.toastyTimer = setTimeout(() => {
            app.toastyTimer = 0;
            app.message.text = '';
        }, 2000);
    }

    showAll(node) {
        let app = this;
        node.getChildren().forEach((mesh) => {
            mesh.isVisible = true;
            app.showAll(mesh);
        })
    }

    TextBlock(opts) {
        let result = new BABYLON.GUI.TextBlock();
        result.text = opts.text;
        result.color = opts.color;
        result.fontSize = opts.fontSize;
        result.textHorizontalAlignment = opts.textHorizontalAlignment;
        result.textVerticalAlignment = opts.textVerticalAlignment;
        result.paddingTop = opts.paddingTop;
        this.gui.addControl(result);
        return result;
    }
}
new App();