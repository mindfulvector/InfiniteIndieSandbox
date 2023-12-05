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

        this.cursor = BABYLON.MeshBuilder.CreateBox('meshCursor', { size:0.10 });
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
        this.guideMesh?.dispose();
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
            this.selectedObjectIndex = -1;
            this.disposeCurrentInstance();
            objectChanged = true;
        }

        // Handling Esc key to clear currentInstance
        if (this.app.keyPressed('BACKSPACE')) {
            this.disposeCurrentInstance();
        }

        let placementPosition = false;
        let objectPlaced = false;

        // Handling Space key to place currentInstance and create a new placement instance
        if (this.currentInstance) {
            placementPosition = this.currentInstance.position.clone();
            if(this.app.keyPressed(' ')) {
                //const clone = this.currentInstance.clone();
                //clone.checkCollisions = true;
                //this.app.scene.addMesh(clone);
                
                this.currentInstance = null;
                objectChanged = true;
                objectPlaced = true;
            }
        } else {
            this.cursorMatIndex += 1;
            if(this.cursorMatIndex >= 100) {
                this.cursorMatIndex = 0;
            }
            this.cursor.material = this.cursorMats[this.cursorMatIndex];
        }

        if (objectChanged) {
            if(!objectPlaced) {
                if(typeof this.currentWorldObject != 'undefined') {
                    this.currentWorldObject.disposeInstance(this.currentInstance);
                }
            }
            if(!this.currentInstance) {
                // cursor selection mode entered
                this.initialScale = 1.0;                
            } else {
                const worldObject = this.app.BuildableObjectList[this.selectedObjectIndex];
                console.log(worldObject);
                this.currentWorldObject = worldObject;
                this.currentInstance = worldObject.createInstance();
                this.initialScale = this.currentInstance.scaling.x;
                console.log('initial scale: '+this.initialScale);
                // If we just created a new instance because the previous one was placed,
                // use the same scaling for the new instance
                if(!objectPlaced) {
                    this.targetScale = this.initialScale;
                    console.log('set scale: '+this.targetScale);
                } else {
                    this.currentInstance.scaling = new BABYLON.Vector3(this.targetScale, this.targetScale, this.targetScale);
                    console.log('keep scale: '+this.targetScale);
                }
                
                if (placementPosition) {
                    this.currentInstance.position = placementPosition;
                }
            }
        }

        // Movement control for currentInstance and mesh cursor
        
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

        if (!this.currentInstance) {
            if(moved) {
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
                // Mesh selection cursor
                this.cursor.position = this.targetPosition.clone();
                this.cursor.position.y -= 0.02
                this.cursor.scaling = new BABYLON.Vector3(this.targetScale, this.targetScale, this.targetScale);
                this.cursor.computeWorldMatrix();
                //console.log('this.cursor.scaling=',this.cursor.scaling); 
                this.app.camera.lockedTarget = this.cursor;
                this.selection = [];
                //buildMode.cursor.showBoundingBox = true;
                this.app.BuildableObjectList.forEach((wo) => {
                    wo.instances.forEach((inst) => {
                        if(inst) {
                            var intersects = checkIntersects(inst);
                            
                            if(intersects) {
                                console.log('cursor intersects', inst);
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
            // Buildable object for placement
            if (this.app.keyPressed('Z')) {
                // Rotate 45 degrees to the left (counter-clockwise)
                if(null == this.currentInstance.rotationQuaternion) {
                    this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                }
                this.currentInstance.rotationQuaternion 
                    = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(-rotationAngle, 0, 0));
                //this.guideMesh.rotationQuaternion = this.currentInstance.rotationQuaternion.clone();
            }
            if (this.app.keyPressed('C')) {
                if(null == this.currentInstance.rotationQuaternion) {
                    this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                }
                
                // Rotate 45 degrees to the right (clockwise)
                this.currentInstance.rotationQuaternion 
                    = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(rotationAngle, 0, 0));
                //this.guideMesh.rotationQuaternion = this.currentInstance.rotationQuaternion.clone();
            }

            gridSize = Math.abs(gridSize * this.targetScale);

            if (moved) {
                // Update the guide mesh to match the target position and the size of the current instance

                

                // // Update the guide mesh position
                // this.guideMesh.position.copyFrom(this.targetPosition);
                // this.guideMesh.position.y -= this.guideMeshHeight / 2;

                // // Show the guide mesh
                // this.guideMesh.setEnabled(true);

                // this.app.camera.lockedTarget = this.guideMesh;

                this.currentInstance.position = this.targetPosition.clone(); //BABYLON.Vector3.Lerp(this.currentInstance.position, this.targetPosition, lerpRate);
                this.currentInstance.position.y -= 0.02
                this.currentInstance.scaling = new BABYLON.Vector3(this.targetScale, this.targetScale, this.targetScale);
                console.log('this.currentInstance.scaling=',this.currentInstance.scaling);

            } else {
                // User has stopped moving, start drifting towards the nearest snapped position
                let snappedPosition = new BABYLON.Vector3(
                    Math.round((this.targetPosition.x + Number.EPSILON) / gridSize) * gridSize,
                    Math.round((this.targetPosition.y + Number.EPSILON) / gridSize) * gridSize,
                    Math.round((this.targetPosition.z + Number.EPSILON) / gridSize) * gridSize
                );
                //snappedPosition.y -= this.guideMeshHeight / 2;
                //snappedPosition.y = Math.max(snappedPosition.y, 0); // Ensure the object stays on the ground plane
                
                // Gradually move the guide mesh towards the snapped position
                //this.guideMesh.position = BABYLON.Vector3.Lerp(this.guideMesh.position, snappedPosition, lerpRate);
                this.currentInstance.position = BABYLON.Vector3.Lerp(this.currentInstance.position, snappedPosition, lerpRate);

                // Check if the movement has effectively stopped
                let distanceToTarget = BABYLON.Vector3.Distance(this.currentInstance.position, snappedPosition);
                if (distanceToTarget < lerpStopThreshold) {
                    //this.currentInstance.position.copyFrom(snappedPosition);
                    //this.currentInstance.position.y -= this.guideMeshHeight / 2;
                    this.currentInstance.position = BABYLON.Vector3.Lerp(this.currentInstance.position, snappedPosition, lerpRate);

                    // Check if the movement has effectively stopped
                    //let distanceToTarget = BABYLON.Vector3.Distance(this.currentInstance.position, this.guideMesh.position);
                    let distanceToTarget = BABYLON.Vector3.Distance(this.currentInstance.position, this.currentInstance.position);
                    if (distanceToTarget < lerpStopThreshold) {
                        // This helps to prevent z-fighting (though not completely)
                        if(typeof this.placementJitter == 'undefined') this.placementJitter = 0.01;
                        else if(this.placementJitter == 0.01) {
                            this.placementJitter = -0.01;
                        }
                        this.currentInstance.position.y += this.placementJitter;
                        // so that changes start from the grid snapped position of the actual object
                        this.targetPosition = this.currentInstance.position.clone();
                    }
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

    renderUI() {

    }
}