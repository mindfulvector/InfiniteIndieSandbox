class BuildMode {
    // The mode class' constructor is called when entering a mode, and
    // the dispose method when exiting a mode.
    constructor(app) {
        this.app = app;
        this.selectedObjectIndex = 0; // Index of the selected object in BuildableObjectList
        this.currentInstance = null; // Currently placed/selected instance in the world
        this.gridSize = 10;
        this.lastUndoInstanceIndex = -1;
        this.lockMenuButtons = false;
        this.initialScale = 1.0;
        this.targetScale = 1.0;

        this.cursor = BABYLON.MeshBuilder.CreateBox('meshCursor', { size:0.25 });
        this.cursorMatIndex = 0;

        this.cursorMats = [];
        for(let i = 0; i < 100; i++) {
            let g = 1.0 / 100 * i;
            this.cursorMats.push(this.app.createColorMaterial(1.0-g, g, 1.0, 0.75, 'cursorMat['+i+']'));
        }

        this.selectionMesh = BABYLON.MeshBuilder.CreateBox('meshSelection', { size:1.0 });
        //this.selectionMesh.material = this.app.createColorMaterial(0.0, 0.68, 1.0, 0.5, '≈ Azure Radiance');
        this.selectionMesh.material = this.app.createColorMaterial(0.2, 1.0, 0, 0.5, '≈ Harlequin');
        this.selectionMesh.isVisible = false;

        this.app.scene.getBoundingBoxRenderer().frontColor.set(0, 0, 1);
        this.app.scene.getBoundingBoxRenderer().backColor.set(0, 0, 0.5);
        this.selectionColorIndex = 0;

        // Set static UI strings once on mode load
        this.app.modeName.text = "BuildMode";
    }

    dispose() {
        this.app.modeName.text = "Exiting BuildMode...";
        this.disposeCurrentInstance();
    }

    disposeCurrentInstance() {
        //this.app.camera.lockedTarget = this.app.defaultSphere;
        if(typeof this.currentWorldObject != 'undefined' && this.currentWorldObject != null) {
            this.currentWorldObject.disposeInstance(this.currentInstance);
        }
        this.clearSelection();
        this.guideMesh?.dispose();
        this.cursor?.dispose();
        this.selectionMesh?.dispose();
        this.currentInstance = null;
        this.currentWorldObject = null;
        this.guideMesh = null;
    }

    update() {
        let buildMode = this;

        if (this.app.BuildableObjectList.length === 0) {
            return; // No objects to place
        }

        let objectChanged = false;
        let cursorMode = false;

        // User input for changing the build menu selection
        if (this.app.keyPressed('Q')) {
            console.log('Q key is pressed; prev object');
            this.selectedObjectIndex--;
            if (this.selectedObjectIndex < 0) {
                this.selectedObjectIndex = this.app.BuildableObjectList.length - 1; // Wrap around
            }
            objectChanged = true;
        }

        if (this.app.keyPressed('E')) {
            console.log('E key is pressed; next object');
            this.selectedObjectIndex = (this.selectedObjectIndex + 1) % this.app.BuildableObjectList.length;
            objectChanged = true;
        }

        if (this.app.keyPressed('0')) {
            console.log('0 key is pressed; cursor mode');
            cursorMode = true;
            this.selectedObjectIndex = -1;
            this.disposeCurrentInstance();
            objectChanged = true;
        }

        // Handling Backspace key to clear currentInstance
        //if (this.app.keyPressed('BACKSPACE')) {
        //    this.disposeCurrentInstance();
        //}

        let placementPosition = false;
        let objectPlaced = false;

        // Handling Space key to place currentInstance and create a new placement instance
        if (this.currentInstance) {
            placementPosition = this.currentInstance.position.clone();
            if(this.app.keyPressed(' ')) {
                //const clone = this.currentInstance.clone();
                //clone.checkCollisions = true;
                //this.app.scene.addMesh(clone);
                this.app.showBoundingBoxAll(this.currentInstance, false);
                this.currentInstance = null;
                objectChanged = true;
                objectPlaced = true;
            }
        } else {
            // Handling Space key to open properties menu for a selected object or group of objects in cursor mode
            if(this.app.keyPressed(' ')) {
                if (!this.currentInstance && typeof this.selection != 'undefined' && this.selection.length > 0) {
                    this.app.menu.state = MENU_OBJ_PROPS;
                }
            }

            // Rotate through color gradient for cursor
            this.cursorMatIndex += 1;
            if(this.cursorMatIndex >= 100) {
                this.cursorMatIndex = 0;
            }
            this.cursor.material = this.cursorMats[this.cursorMatIndex];
        }

        if (objectChanged) {
            if(!objectPlaced) {
                if(typeof this.currentWorldObject != 'undefined' && this.currentWorldObject) {
                    this.currentWorldObject.disposeInstance(this.currentInstance);
                }
            }
            if(cursorMode) {
                // Cursor selection mode entered, create a new cursor
                this.cursor?.dispose();
                this.cursor = BABYLON.MeshBuilder.CreateBox('meshCursor', { size:0.25 });
                this.initialScale = 1.0;                
            } else {
                // Object selected, remove cursor and clear any selection
                this.cursor?.dispose();
                this.clearSelection();

                // Get the WO from selected object index the user has moved to
                const worldObject = this.app.BuildableObjectList[this.selectedObjectIndex];
                //console.log(worldObject);
                this.currentWorldObject = worldObject;
                this.currentInstance = worldObject.createInstance();
                this.app.showBoundingBoxAll(this.currentInstance, true);
                //console.log('TRUE INITAL scaling this.currentInstance.scaling=',this.currentInstance.scaling);
                
                this.initialScale = this.currentInstance.scaling.x;
                //console.log('initial scale: '+this.initialScale);
                // If we just created a new instance because the previous one was placed,
                // use the same scaling for the new instance
                if(!objectPlaced) {
                    this.targetScale = this.initialScale;
                    //console.log('set scale: '+this.targetScale);

                    if(typeof this.targetRotation != 'undefined') {
                        this.currentInstance.rotationQuaternion = this.targetRotation;
                    }
                } else {
                    this.currentInstance.scaling = this.makeBuildableObjectScale(this.targetScale);
                    //console.log('keep scale: '+this.targetScale);
                }

                // Restore position from previous selected object
                if (placementPosition) {
                    this.currentInstance.position = placementPosition;
                }
            }
        }

        // Movement settings for currentInstance and mesh cursor
        const moveSpeed = 0.1;
        var gridSize = 1.0;
        const marginOfError = 0.05; // Define a small margin of error
        const lerpRate = 0.1; // Rate of interpolation
        const lerpStopThreshold = 0.19; // Threshold to consider movement as stopped
        const rotationAngle = Math.PI / 4; // 45 degrees in radians

        let moved = false;

        // Initialize this.targetPosition if not already done
        if (!this.targetPosition) {
            //this.targetPosition = this.guideMesh.position.clone();
            if (this.currentInstance) {
                this.targetPosition = this.currentInstance.position.clone();
            } else {
                this.targetPosition = this.cursor.position.clone();
            }
        }

        // Get the forward vector of the camera and project it onto the ground plane
        let forward = this.app.camera.getForwardRay().direction;
        forward.y = 0;
        forward.normalize();

        // Calculate the right vector based on the forward vector
        let right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());
        right.y = 0;
        right.normalize();

        // Movement control for currentInstance and mesh cursor
        if (this.app.keyDown('W')) {
            // Move forward along the ground plane
            this.targetPosition.addInPlace(forward.scale(moveSpeed));
            moved = true;
        }
        if (this.app.keyDown('S')) {
            // Move backward along the ground plane
            this.targetPosition.subtractInPlace(forward.scale(moveSpeed));
            moved = true;
        }
        if (this.app.keyDown('A')) {
            // Move left along the ground plane
            this.targetPosition.addInPlace(right.scale(moveSpeed));
            moved = true;
        }
        if (this.app.keyDown('D')) {
            // Move right along the ground plane
            this.targetPosition.subtractInPlace(right.scale(moveSpeed));
            moved = true;
        }

        if (this.app.keyDown('R')) {
            this.targetPosition.y += moveSpeed;
            moved = true;
        }
        if (this.app.keyDown('V')) {
            this.targetPosition.y -= moveSpeed;
            moved = true;
        }

        if (this.app.keyPressed(']')) {
            this.targetScale += 0.25;
            moved = true;
            console.log('updated scale: '+this.targetScale);
        }
        if (this.app.keyPressed('[')) {
            this.targetScale -= 0.25;
            moved = true;
            console.log('updated scale: '+this.targetScale);
        }
        if (this.app.keyPressed('=')) {
            this.targetScale = this.initialScale;
            moved = true;
            console.log('reset scale: '+this.targetScale);
        }

        // Rotate through selection box color index and update bounding box renderer
        // Used by both cursor mode and placement mode!
        this.selectionColorIndex++;
        if(this.selectionColorIndex >= 100) this.selectionColorIndex = 0;
        let g = 1.0 / 100 * this.selectionColorIndex;

        // If in cursor mode
        if (!this.currentInstance) {
            // Update bounding box for selection indicator to be a blue/purple color
            this.app.scene.getBoundingBoxRenderer().frontColor.set(1.0-g, g, 1.0);
            this.app.scene.getBoundingBoxRenderer().backColor.set(0.75-g, g, 0.75);
            
            // If the cursor was moved
            if(moved) {
                // Helper function to detect intersection with any child mesh of a node
                var checkIntersects = function(mesh) {
                    var result = false;
                    if(typeof mesh.getBoundingInfo != 'undefined') {
                        result = buildMode.cursor.intersectsMesh(mesh);
                    }
                    if(!result) {
                        mesh.getChildren().forEach((child) => {
                            result = checkIntersects(child);
                        });
                    }
                    return result;
                }

                // Move the cursor
                this.cursor.position = this.targetPosition.clone();
                this.cursor.position.y -= 0.02
                // Scale the cursor
                this.cursor.scaling = new BABYLON.Vector3(this.targetScale, this.targetScale, this.targetScale);
                // Update so mesh intersection works
                this.cursor.computeWorldMatrix();
                //console.log('this.cursor.scaling=',this.cursor.scaling); 
                // Point camera at cursor
                this.app.camera.lockedTarget = this.cursor;
                // Clear selection
                this.selection = [];
                //buildMode.cursor.showBoundingBox = true;
                // Find what objects the cursor intersects with: add to the selection list, and turn on their bounding
                // box indicator to show them as selected
                this.app.BuildableObjectList.forEach((wo) => {
                    wo.instances.forEach((inst) => {
                        if(inst) {
                            var intersects = checkIntersects(inst);
                            
                            if(intersects) {
                                //console.log('cursor intersects', inst);
                                buildMode.app.showBoundingBoxAll(inst, true);
                                buildMode.selection.push(inst);
                                // inst.selectionMesh = this.selectionMesh.clone();
                                // inst.selectionMesh.position = inst.position.clone();
                                // inst.selectionMesh.scaling = inst.scaling.clone();
                                // inst.selectionMesh.isVisible = true;
                            } else {
                                buildMode.app.showBoundingBoxAll(inst, false);
                                if(typeof inst.selectionMesh != 'undefined' && inst.selectionMesh != null) {
                                    inst?.selectionMesh?.dispose();
                                    inst.selectionMesh = null;
                                }
                            }
                        }
                    });
                });
            }
        } else {
            // Regular object placement/movement

            // Update bounding box for placement object to be a red/orange color
            this.app.scene.getBoundingBoxRenderer().frontColor.set(1.0, 1.0-g, g);
            this.app.scene.getBoundingBoxRenderer().backColor.set(1.0, 0.75-g, g);
            
            // Some movement keys that we don't need for cursor mode (can't rotate the cursor)

            // Buildable object for placement
            if (this.app.keyPressed('Z')) {
                // Rotate 45 degrees to the left (counter-clockwise)
                if(null == this.currentInstance.rotationQuaternion) {
                    this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                }
                this.currentInstance.rotationQuaternion 
                    = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(-rotationAngle, 0, 0));
                //this.guideMesh.rotationQuaternion = this.currentInstance.rotationQuaternion.clone();

                this.targetRotation = this.currentInstance.rotationQuaternion.clone();
            }
            if (this.app.keyPressed('C')) {
                if(null == this.currentInstance.rotationQuaternion) {
                    this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                }
                
                // Rotate 45 degrees to the right (clockwise)
                this.currentInstance.rotationQuaternion 
                    = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(rotationAngle, 0, 0));
                //this.guideMesh.rotationQuaternion = this.currentInstance.rotationQuaternion.clone();

                this.targetRotation = this.currentInstance.rotationQuaternion.clone();
            }

            // Calculate a grid size for object placement based on the current scale, but cap at 1.0
            gridSize = Math.abs(gridSize * this.targetScale);
            if(gridSize > 1.0) gridSize = 1.0;

            // If actually moved...
            if (moved) {
                // Update the position
                this.currentInstance.position = this.targetPosition.clone(); //BABYLON.Vector3.Lerp(this.currentInstance.position, this.targetPosition, lerpRate);
                this.currentInstance.position.y -= 0.02
                // If scaling isn't already correct, update the scaling
                if(this.currentInstance.scaling.x != this.targetScale.x || this.currentInstance.scaling.y != this.targetScale.y || this.currentInstance.scaling.z != this.targetScale.z) {
                    this.currentInstance.scaling = this.makeBuildableObjectScale(this.targetScale);
                    //console.log('update this.currentInstance.scaling=',this.currentInstance.scaling);
                }

            } else {
                // User has stopped moving the object, lerp towards the nearest snapped position
                let snappedPosition = new BABYLON.Vector3(
                    Math.round((this.targetPosition.x + Number.EPSILON) / gridSize) * gridSize,
                    Math.round((this.targetPosition.y + Number.EPSILON) / gridSize) * gridSize,
                    Math.round((this.targetPosition.z + Number.EPSILON) / gridSize) * gridSize
                );
                
                // Gradually move the placement object towards the snapped position
                this.currentInstance.position = BABYLON.Vector3.Lerp(this.currentInstance.position, snappedPosition, lerpRate);

                // Check if the movement has effectively stopped via a threshold
                let distanceToTarget = BABYLON.Vector3.Distance(this.currentInstance.position, snappedPosition);
                if (distanceToTarget < lerpStopThreshold) {
                    // This helps to prevent z-fighting (though not completely)
                    if(typeof this.placementJitter == 'undefined' || this.placementJitter == -0.002) {
                        this.placementJitter = 0.002;
                    } else if(this.placementJitter == 0.002) {
                        this.placementJitter = 0.000;
                    } else if(this.placementJitter == 0.000) {
                        this.placementJitter = -0.002;
                    }
                    this.currentInstance.position.y += this.placementJitter;
                    this.currentInstance.position.x += this.placementJitter;
                    this.currentInstance.position.z += this.placementJitter;
                    // so that changes start from the grid snapped position of the actual object
                    this.targetPosition = this.currentInstance.position.clone();
                }
            }

            this.app.camera.lockedTarget = this.currentInstance;
        }

        this.updateObjectsInBuildMode();
    }

    updateObjectsInBuildMode() {
        const playMode = this;
        const app = this.app;
        
        // run update for all active object scripts
        app.BuildableObjectList.forEach((wo) => {
            wo.updateAllInstances(false, this);
        });
    }

    // Makes a scale preserving inversion of the y-scale and z-scale so models are not turned upside down or rotated
    makeBuildableObjectScale(scale) {
        const yScale = (this.currentInstance.scaling.y < 0) ? (0 - scale) : scale;
        const zScale = (this.currentInstance.scaling.z < 0) ? (0 - scale) : scale;

        return new BABYLON.Vector3(scale, yScale, zScale);
    }

    clearSelection() {
        if(typeof this.selection != 'undefined') {
            this.selection.forEach((node) => {
                this.app.showBoundingBoxAll(node, false);
            });
        }
        this.selection = [];
    }

    triggerMenuItem(menuState, menuItem) {
        const app = this.app;

        switch(menuState) {
        case MENU_OBJ_PROPS:
            switch(menuItem) {
            case 0:
                app.menu.state = MENU_HUD;
                break;
            default:
                if(this.selection.length > 0) {
                    let node = this.selection[0];
                    if(typeof node.worldObject != 'undefined') {
                        node.worldObject.triggerMenuItem(app.menu.state, this.selection);
                    }
                }
            }
            break;
        }
    }

    renderUI(menuState) {
        const app = this.app;

        switch(menuState) {
        case MENU_OBJ_PROPS:
            app.MenuRect();

            app.MenuItem({
                type: 'text',
                name: 'menuLabel',
                text: '>> Object Properties <<',
            });

            if(this.selection.length == 0) {
               app.MenuItem({
                    type: 'text',
                    name: 'menuSelCount',
                    text: '> No selection, nothing to edit! <'
                }); 
            } else {
                let woPropsAdded = [];
                let undefinedWOFound = false;
                app.MenuItem({
                    type: 'text',
                    name: 'menuSelCount',
                    text: '> '+this.selection.length + ' Objects Selected <',
                });
                this.selection.forEach((node) => {
                    if(typeof node.worldObject == 'undefined' && !undefinedWOFound) {
                        undefinedWOFound = true;
                        app.MenuItem({
                            type: 'text',
                            name: 'menuUndefinedWOWarning',
                            text: '> Warning: 1 or more objects aren\'t World Object instances! <',
                        });
                    } else {
                        if(-1 == woPropsAdded.indexOf(node.worldObject.name)) {
                            woPropsAdded.push(node.worldObject.name);
                            node.worldObject.nodePropsMenu(this.selection);
                        }
                    }
                });
            }

            app.MenuItem({
                type: 'button',
                name: 'btnObjPropsCancel',
                text: '0. Cancel',
                handler: () => {
                    app.menu.state = MENU_HUD;
                }
            });

            break;
        case MENU_OBJ_EVENT_BINDINGS:
            app.MenuRect();
            app.MenuItem({
                type: 'text',
                name: 'menuLabel',
                text: '>> Event Bindings For '+app.menu.eventDefInfo.id+' <<',
            });
            if(app.activeMode.selection.length > 0) {
                let node = app.activeMode.selection[0];
                let eventNum = 0;
                if(typeof node.worldObject == this) {
                    // Display existing event bindingss for this event ID
                    node.events[app.menu.eventDefNum].forEach((event) => {
                        app.MenuItem({
                            type: 'button',
                            name: 'menuEventsBtn_'+eventNum,
                            text: 'Send Msg To '+event.wo+'#'+event.to+' `'+event.msg + JSON.stringify(event.p) + '`',
                            handler: () => {
                                app.menu.state = MENU_OBJ_EVENT_BINDING_EDIT;
                                app.menu.eventNum = eventNum;
                                app.menu.eventInfo = event;
                            }
                        });
                    });
                }
            }
            break;
        }
    }
    
}
