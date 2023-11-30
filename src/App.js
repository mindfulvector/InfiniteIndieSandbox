const MENU_HUD = 0;
const MENU_MAIN = 1;
const MENU_PAUSE = 2;
const MENU_SAVE = 3;
const MENU_LOAD = 4;

class App {
    constructor() {
        const app = this;
        this.toastyTimer = 0;
        app.world = null;
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
            text: "Welcome to the Infinite Indie Sandbox!",
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

        //this.activeMode = new BuildMode(app);

        // Load WorldObjects -- these are objects that can be built or are used by
        // built-in levels, etc. Basically, everything!
        this.BuildableObjectList = [];

        new Manifest(this);
        
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

        this.menu.state = MENU_MAIN;

        // Run the main render loop
        app.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();

            if(this.menu.state == MENU_HUD) {
                if(null != this.activeMode) {
                    this.activeMode.update();
                }
            }

            this.renderUI();

            if(this.menu.state == MENU_HUD) {
                if(null != this.activeMode) {
                    this.activeMode.renderUI();
                }
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
        if(this.menu.state != MENU_MAIN) {
            if(this.keyPressed('ESCAPE')) {
                if(null != this.activeMode) {
                    this.activeMode?.dispose();
                    this.activeMode = null;
                    this.modeName.text = "[NullMode]";
                    this.menu.state = MENU_PAUSE;
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
    }

    triggerMenuItem(menuState, menuItem) {
        const app = this;
        switch(menuState) {
        case MENU_MAIN:
            switch(menuItem) {
            case 1:                                 // New Game
                app.menu.state = MENU_HUD;
                app.world = new SandboxWorld(app);
                app.world.clearWorld();
                app.goto_playMode();
                break;
            case 2:                                 // Load Game
                app.menu.prevState = MENU_MAIN;     // So we cancel back to the right place
                app.menu.state = MENU_LOAD;
                break;
            case 3:                                 // About
                break;
            case 4:                                 // Quit
                break;
            }
            break;
        case MENU_PAUSE:
            switch(menuItem) {
            case 1:                                 // Build Mode
                app.goto_buildMode();
                break;
            case 2:                                 // Play Mode
                app.goto_playMode();
                break;
            case 3:                                 // Save Game
                //app.world.saveToSlot(1);
                app.menu.prevState = MENU_PAUSE;    // So we cancel back to the right place
                app.menu.state = MENU_SAVE;
                break;
            case 4:                                 // Load Game
                app.menu.prevState = MENU_PAUSE;    // So we cancel back to the right place
                app.menu.state = MENU_LOAD;
                //app.world = new SandboxWorld(app);
                //app.world.loadFromSlot(1);
                //app.goto_playMode();
                //app.menu.state = MENU_HUD;
                break;
            case 5:                                 // Quit to Main Menu
                app.menu.state = MENU_MAIN;
                break;
            }
            break;
        case MENU_SAVE:
            if(menuItem == 0) {
                app.menu.state = app.menu.prevState;
            } else {
                if(app.world && app.world.saveToSlot(menuItem)) {
                    app.menu.state = app.menu.prevState;
                } else {
                    app.showMessage('Failed to save to slot ' + menuItem + '!');
                }
            }
            break;
        case MENU_LOAD:
            if(menuItem == 0) {
                app.menu.state = app.menu.prevState;
            } else {
                if(!app.world) {
                    app.world = new SandboxWorld(app);
                }
                if(app.world && app.world.loadFromSlot(menuItem)) {
                    app.menu.state = MENU_HUD;
                    app.goto_playMode();
                } else {
                    app.showMessage('Failed to load from slot ' + menuItem + '!');
                }
            }
            break;
        }
    }

    showMessage(message) {
        const app = this;
        app.clearMenu();
        this.MenuRect({height: 10});
        this.MenuItem({
            type: 'text',
            name: 'messageLabel',
            text: message
        });
        this.MenuItem({
            type: 'button',
            name: 'btnMessageOK',
            text: 'OK',
            handler: () => {
                app.menu.state = app.menu.prevState;
            }
        });
    }

    clearMenu() {
        // Remove any menu that is visible before building new menu
        this.menu.controls.forEach((button) => {
            button?.dispose();
        });
    }
    renderUI() {
        const app = this;

        if(this.menu.renderedState != this.menu.state) {
            const activeMenuState = this.menu.state;

            app.clearMenu();

            switch(this.menu.state) {
            case MENU_HUD:                                      // Not really a "menu", just the HUD GUI
                
                break;
            case MENU_MAIN:                                     // Menu before loading a world
                this.MenuRect();

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'Welcome to...',
                });
                
                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: '',
                });
                
                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'the',
                });
                

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'INFINITE',
                });
                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'I N D I E',
                });
                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'S  A  N  D  B  O  X !',
                });
                
                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: '',
                });
                
                this.MenuItem({
                    type: 'button',
                    name: 'btnNew',
                    text: '1. New Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 1);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnLoad',
                    text: '2. Load Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 2);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnAbout',
                    text: '3. About',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 3);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnAbout',
                    text: '4. Quit',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 4);
                    }
                });
                break;
            case MENU_PAUSE:                                    // Esc menu when playing
                this.MenuRect();

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: '-- Pause Menu --',
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnBuild',
                    text: '1. Build Mode',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 1);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnResume',
                    text: '2. Play Mode',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 2);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnSave',
                    text: '3. Save Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 3);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnLoad',
                    text: '4. Load Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 4);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnLoad',
                    text: '5. Quit to Main Menu',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 5);
                    }
                });


                break;
            case MENU_SAVE:
            case MENU_LOAD:
                this.MenuRect();

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: (this.menu.state == MENU_SAVE ? '-- Save Game --' : '-- Load Game --'),
                });

                for(let saveSlot = 1; saveSlot <= 9; saveSlot++) {
                    this.MenuItem({
                        type: 'button',
                        name: ((this.menu.state == MENU_SAVE) ? 'btnSave_Slot'+saveSlot : 'btnLoad_Slot'+saveSlot),
                        text: ((this.menu.state == MENU_SAVE) ? 'Save To Slot '+saveSlot : 'Load From Slot '+saveSlot),
                        handler: () => {
                            app.triggerMenuItem(this.menu.state, saveSlot);
                        }
                    });
                }

                this.MenuItem({
                    type: 'button',
                    name: 'btnSaveLoadCancel',
                    text: '0. Cancel',
                    handler: () => {
                        app.triggerMenuItem(this.menu.state, 0);
                    }
                });
                break;
            }

            // so we don't try to render again, remember which state we last rendered
            this.menu.renderedState = activeMenuState;
        }
    }

    loadAsset(objectName, assetProps) {
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

                    //console.log('i', [childMeshes[i], min, max]);
                }
                object.setBoundingInfo(new BABYLON.BoundingInfo(min, max));
                //object.showBoundingBox = true;
                var nestedMeshes = true;
            }
            let woNewAsset = new WorldObject(app, objectName, object, nestedMeshes);
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

    // Background and frame of popup menu
    MenuRect(opts) {
        if(typeof opts == 'undefined') opts = {};
        const gradient = new BABYLON.GUI.LinearGradient(500, 900, 500, 600);
        gradient.addColorStop(0, "blue");
        gradient.addColorStop(1, "darkBlue");

        const rectangle = new BABYLON.GUI.Rectangle("menuRect");
        rectangle.left = "0%";
        rectangle.top = (typeof opts.top == 'undefined') ? "0%" : opts.top;
        rectangle.width = (typeof opts.width == 'undefined') ? "50%" : (opts.width + '%');
        rectangle.height = (typeof opts.height == 'undefined') ? "50%" : (opts.height + '%');
        rectangle.color = "#FFFFFF";
        rectangle.fontSize = 16;
        rectangle.backgroundGradient = gradient;
        rectangle.thickness = 2;
        this.gui.addControl(rectangle);
        this.menu.controls.push(rectangle);

        // Reset top of menu items created with this.MenuItem
        if(typeof opts.height != 'undefined') {
            this.menu.nextTop = 0 - opts.height/4;
        } else {
            this.menu.nextTop = -23;
        }
    }

    // Item within popup menu
    MenuItem(opts) {
        const gradient = new BABYLON.GUI.LinearGradient(500, 900, 500, 600);
        gradient.addColorStop(0, "blue");
        gradient.addColorStop(1, "darkBlue");

        switch(opts.type) {
        case 'text':    
            const textItem = new BABYLON.GUI.TextBlock();
            textItem.left = "0%";
            textItem.top = this.menu.nextTop+"%";
            textItem.width = "48%";
            textItem.height = "30px";
            textItem.color = "#FFFFFF";
            textItem.backgroundGradient = gradient;
            textItem.thickness = 2;
            textItem.text = opts.text;
            this.gui.addControl(textItem);
            this.menu.controls.push(textItem);
            this.menu.nextTop += 3;
            break;
        case 'button':
            const buttonItem = BABYLON.GUI.Button.CreateSimpleButton(opts.name, opts.text);
            buttonItem.left = "0%";
            buttonItem.top = this.menu.nextTop+"%";
            buttonItem.width = "48%";
            buttonItem.height = "30px";
            buttonItem.color = "#FFFFFF";
            buttonItem.backgroundGradient = gradient;
            buttonItem.thickness = 2;
            buttonItem.onPointerUpObservable.add(opts.handler);
            this.gui.addControl(buttonItem);
            this.menu.controls.push(buttonItem);
            this.menu.nextTop += 3;
            break;
        }
    }
}
new App();