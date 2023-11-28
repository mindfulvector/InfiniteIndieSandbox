class App {
    constructor() {
        const app = this;
        this.toastyTimer = 0;
        this.menu = {
            state: 0,               // no menu displayed
            renderedState: 0,       // if the two numbers are different we need to update the menu
            controls: [],
        };

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

        var box2 = BABYLON.Mesh.CreateBox("box2", 2, this.scene);
        box2.checkCollisions = true;
        //box2.position = new BABYLON.Vector3(0, 8, 7);

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
        
        this.tips = this.TextBlock({
            text: "Press Esc for menu. W/A/S/D to move object/avatar. R/V to raise/lower object. Z/C to rotate object. Space to place object/jump.",
            color: "white",
            fontSize: 15,
            textHorizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER,
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            paddingTop: 60,
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
        this.loadAsset({rootUrl: modelsBaseUrl, filename: 'models/terrain/cube_terrains_floor_1x1.gltf'});
        this.loadAsset({rootUrl: modelsBaseUrl, filename: 'models/terrain/cube_terrains_cube_1x1.gltf'});
        
        
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

    goto_buildMode() {
        this.activeMode?.dispose();
        this.activeMode = new BuildMode(this);
        this.menu.state = 0;             // none, close menu
    }
    goto_playMode() {
        this.activeMode?.dispose();
        this.activeMode = new PlayMode(this);
        this.menu.state = 0;             // none, close menu
    }

    // System-wide updates such as starting and existing particular modes
    update() {
        if(this.keyPressed('ESCAPE')) {
            if(null != this.activeMode) {
                this.activeMode?.dispose();
                this.activeMode = null;
                this.modeName.text = "[NullMode]";
                this.menu.state = 1;             // main pause menu
            } else {
                this.toasty('No active mode to exit!');
            }
        }

        if(this.keyPressed('1')) {
            if(null == this.activeMode) {
                this.goto_buildMode();
            } else {
                this.toasty('Please exit the active mode first! (press Esc)');
            }
        }

        if(this.keyPressed('2')) {
            if(null == this.activeMode) {
                this.goto_playMode();
            } else {
                this.toasty('Please exit the active mode first! (press Esc)');
            }
        }
    }

    renderUI() {
        const app = this;

        if(this.menu.renderedState != this.menu.state) {
            
            switch(this.menu.state) {
            case 0:                                     // remove any menu that is visible
                this.menu.controls.forEach((button) => {
                    button?.dispose();
                });
                break;
            case 1:                                     // pause menu
                const gradient = new BABYLON.GUI.LinearGradient(500, 900, 500, 600);
                gradient.addColorStop(0, "blue");
                gradient.addColorStop(1, "darkBlue");

                const rectangle = new BABYLON.GUI.Rectangle("pauseMenu");
                rectangle.left = "0%";
                rectangle.top = "0%";
                rectangle.width = "50%";
                rectangle.height = "50%";
                rectangle.color = "#FFFFFF";
                rectangle.fontSize = 16;
                rectangle.backgroundGradient = gradient;
                rectangle.thickness = 2;
                this.gui.addControl(rectangle);
                this.menu.controls.push(rectangle);

                const button1 = new BABYLON.GUI.TextBlock();
                button1.left = "0%";
                button1.top = "-23%";
                button1.width = "48%";
                button1.height = "30px";
                button1.color = "#FFFFFF";
                button1.backgroundGradient = gradient;
                button1.thickness = 2;
                button1.text = "Pause Menu";
                
                this.gui.addControl(button1);
                this.menu.controls.push(button1);

                const button2 = BABYLON.GUI.Button.CreateSimpleButton("button1", "1. Build Mode");
                button2.left = "0%";
                button2.top = "-20%";
                button2.width = "48%";
                button2.height = "30px";
                button2.color = "#FFFFFF";
                button2.backgroundGradient = gradient;
                button2.thickness = 2;
                button2.onPointerUpObservable.add(() => {
                    app.goto_buildMode();
                });
                this.gui.addControl(button2);
                this.menu.controls.push(button2);

                const button3 = BABYLON.GUI.Button.CreateSimpleButton("button1", "2. Play Mode");
                button3.left = "0%";
                button3.top = "-17%";
                button3.width = "48%";
                button3.height = "30px";
                button3.color = "#FFFFFF";
                button3.backgroundGradient = gradient;
                button3.thickness = 2;
                button3.onPointerUpObservable.add(() => {
                    app.goto_playMode();
                });
                this.gui.addControl(button3);
                this.menu.controls.push(button3);

                break;
            }

            // so we don't try to render again, remember which state we last rendered
            this.menu.renderedState = this.menu.state;
        }
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
            mesh.checkCollisions = true;
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