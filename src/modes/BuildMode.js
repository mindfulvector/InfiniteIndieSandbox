class BuildMode {
    constructor(app) {
        this.app = app;
        this.selectedObjectIndex = 0; // Index of the selected object in BuildableObjectList
        this.currentInstance = null; // Currently placed/selected instance in the world
        this.gridSize = 10;
        this.lastUndoInstanceIndex = -1;
        this.lockMenuButtons = false;
        this.app.modeName.text = "BuildMode";
    }

    update() {
        if (this.app.BuildableObjectList.length === 0) {
            return; // No objects to place
        }

        let objectChanged = false;

        // User input for changing the build menu selection
        if (this.app.keyPressed('Q')) {
            console.log('Q key is pressed');
            this.selectedObjectIndex--;
            if (this.selectedObjectIndex < 0) {
                this.selectedObjectIndex = this.app.BuildableObjectList.length - 1; // Wrap around
            }
            objectChanged = true;
        }

        if (this.app.keyPressed('E')) {
            console.log('E key is pressed');
            this.selectedObjectIndex = (this.selectedObjectIndex + 1) % this.app.BuildableObjectList.length;
            objectChanged = true;
        }

        if (objectChanged) {
            this.currentInstance?.dispose();
            const worldObject = this.app.BuildableObjectList[this.selectedObjectIndex];
            console.log(worldObject);
            this.currentInstance = worldObject.createInstance(-2,0,0);
        }

        // Handling Esc key to clear currentInstance
        if (this.app.keyPressed('Escape')) {
            this.currentInstance?.dispose();
            this.currentInstance = null;
        }

        // Handling Space key to clone currentInstance
        if (this.app.keyPressed(' ')) {
            const clone = this.currentInstance.clone();
            this.app.scene.addMesh(clone);
        }

        // Movement control for currentInstance
        if (this.currentInstance) {
            const moveSpeed = 1;
            if (this.app.keyPressed('W')) this.currentInstance.position.z -= moveSpeed;
            if (this.app.keyPressed('S')) this.currentInstance.position.z += moveSpeed;
            if (this.app.keyPressed('A')) this.currentInstance.position.x -= moveSpeed;
            if (this.app.keyPressed('D')) this.currentInstance.position.x += moveSpeed;
            if (this.app.keyPressed('R')) this.currentInstance.position.y += moveSpeed;
            if (this.app.keyPressed('V')) this.currentInstance.position.y -= moveSpeed;

            // Ensure the object stays on the ground plane
            this.currentInstance.position.y = Math.max(this.currentInstance.position.y, 0);
        }
    }



    renderUI() {
        // Use HTML/CSS to create UI elements
        // Handle UI interactions with JavaScript
    }

    placeObject() {
        // Logic to place an object in the scene
    }

    undoPlaceObject() {
        // Logic to undo the placement of an object
    }
}
