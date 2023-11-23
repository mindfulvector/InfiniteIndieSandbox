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

        this.camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, BABYLON.Vector3.Zero(), this.scene);
        this.camera.attachControl(canvas, true);
        var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene);
        var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this.scene);


        // Create a full-screen UI layer
        this.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

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
        this.loadAsset(Assets.meshes.wall_glb);
        this.loadAsset(Assets.meshes.wallArch_glb);
        this.loadAsset(Assets.meshes.wallCorner_glb);
        this.loadAsset(Assets.meshes.rocks1_glb);

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
        BABYLON.SceneLoader.ImportMeshAsync("", assetProps.rootUrl, assetProps.filename).then((result) => {
            let parent = result.meshes[0];              // The __root__ node
            let object = parent.getChildMeshes()[0];    // The real mesh
            object.setParent(null);                     // Removes parent while preserving rotation, scale, position, etc.
            parent.dispose();                           // Get rid of the __root__ node
            object.isVisible = false;
            //console.log(object);
            let wo = new WorldObject('Wall', object);
            //console.log(wo);
            this.BuildableObjectList.push(wo);  // Create the WorldObject with our actual mesh, this will use Thin Instances
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