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

        // Handling Esc key to clear currentInstance
        if (this.app.keyPressed('BACKSPACE')) {
            this.disposeCurrentInstance();
        }

        let placementPosition = false;

        // Handling Space key to clone currentInstance
        if (this.currentInstance) {
            placementPosition = this.currentInstance.position.clone();
            if(this.app.keyPressed(' ')) {
                //const clone = this.currentInstance.clone();
                //clone.checkCollisions = true;
                //this.app.scene.addMesh(clone);
                
                this.currentInstance = null;
                objectChanged = true;
            }
        }

        if (objectChanged) {
            if(typeof this.currentWorldObject != 'undefined') {
                this.currentWorldObject.disposeInstance(this.currentInstance);
            }
            const worldObject = this.app.BuildableObjectList[this.selectedObjectIndex];
            console.log(worldObject);
            this.currentWorldObject = worldObject;
            this.currentInstance = worldObject.createInstance();
            if (placementPosition) {
                this.currentInstance.position = placementPosition;
            }
            //this.app.camera.lockedTarget = this.currentInstance;

            this.guideMesh?.dispose();
            
            let parentDimensions = (this.currentInstance.getBoundingInfo().boundingBox.extendSizeWorld).scale(2);
            //this.guideMesh = BABYLON.MeshBuilder.CreateBox("bounding", { 
            //    width: parentDimensions.x, 
            //    height: parentDimensions.y, 
            //    depth: parentDimensions.z}, this.scene);
            this.guideMesh = BABYLON.MeshBuilder.CreateBox("guideBox", {}, this.app.scene);
            this.guideMesh.position = placementPosition;
            //this.guideMesh = this.currentInstance.clone();
            let guideMaterial = new BABYLON.StandardMaterial("guideMaterial", this.app.scene);
            guideMaterial.alpha = 0.5; // Translucent
            guideMaterial.diffuseColor = new BABYLON.Color3(0.0, 0.5, 0.0);

           /* var guideMaterial = new BABYLON.GridMaterial("default", this.app.scene);
            guideMaterial.majorUnitFrequency = 5;
            guideMaterial.mainColor = new BABYLON.Color3(0, 0, 0);
            guideMaterial.lineColor = new BABYLON.Color3(0.0, 1.0, 0.0);
            guideMaterial.gridRatio = 0.5;
            guideMaterial.alpha = 0.5;*/

            function applyGuideMat(node) {
                node.material = guideMaterial;
                node.getChildren().forEach((node) => {
                    node.material = guideMaterial;
                });
            }
            
            //this.guideMesh.material = guideMaterial;
            applyGuideMat(this.guideMesh);

            this.guideMeshBoundingInfo = this.currentInstance.getBoundingInfo();
            console.log('this.guideMeshBoundingInfo', this.guideMeshBoundingInfo);
            this.guideMeshHeight = this.guideMeshBoundingInfo.boundingBox.extendSize.y * 2;
            this.guideMesh.position = this.currentInstance.position.clone();

            // Match the guide mesh size to the current instance
            //let boundingInfo = this.currentInstance.getBoundingInfo();
            //let size = boundingInfo.boundingBox.extendSize.scale(2); // Get size of the bounding box
            //this.guideMesh.scaling.copyFrom(size);
        }

        // Movement control for currentInstance
        if (this.currentInstance) {
            const moveSpeed = 0.1;
            const gridSize = 1;
            const marginOfError = 0.05; // Define a small margin of error
            const lerpRate = 0.1; // Rate of interpolation
            const lerpStopThreshold = 0.19; // Threshold to consider movement as stopped
            const rotationAngle = Math.PI / 4; // 45 degrees in radians

            let moved = false;

            // Initialize this.targetPosition if not already done
            if (!this.targetPosition) {
                this.targetPosition = this.guideMesh.position.clone();
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

            if (this.app.keyPressed('Z')) {
                // Rotate 45 degrees to the left (counter-clockwise)
                if(null == this.currentInstance.rotationQuaternion) {
                    this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                }
                this.currentInstance.rotationQuaternion 
                    = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(-rotationAngle, 0, 0));
                this.guideMesh.rotationQuaternion = this.currentInstance.rotationQuaternion.clone();
            }
            if (this.app.keyPressed('C')) {
                if(null == this.currentInstance.rotationQuaternion) {
                    this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                }
                
                // Rotate 45 degrees to the right (clockwise)
                this.currentInstance.rotationQuaternion 
                    = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(rotationAngle, 0, 0));
                this.guideMesh.rotationQuaternion = this.currentInstance.rotationQuaternion.clone();
            }

            if (moved) {
                // Update the guide mesh to match the target position and the size of the current instance

                

                // Update the guide mesh position
                this.guideMesh.position.copyFrom(this.targetPosition);
                this.guideMesh.position.y -= this.guideMeshHeight / 2;

                // Show the guide mesh
                this.guideMesh.setEnabled(true);

                this.app.camera.lockedTarget = this.guideMesh;

            } else {
                // User has stopped moving, start drifting towards the nearest snapped position
                let snappedPosition = new BABYLON.Vector3(
                    Math.round((this.targetPosition.x + Number.EPSILON) / gridSize) * gridSize,
                    Math.round((this.targetPosition.y + Number.EPSILON) / gridSize) * gridSize,
                    Math.round((this.targetPosition.z + Number.EPSILON) / gridSize) * gridSize
                );
                snappedPosition.y -= this.guideMeshHeight / 2;
                //snappedPosition.y = Math.max(snappedPosition.y, 0); // Ensure the object stays on the ground plane
                
                // Gradually move the guide mesh towards the snapped position
                this.guideMesh.position = BABYLON.Vector3.Lerp(this.guideMesh.position, snappedPosition, lerpRate);

                // Check if the movement has effectively stopped
                let distanceToTarget = BABYLON.Vector3.Distance(this.guideMesh.position, snappedPosition);
                if (distanceToTarget < lerpStopThreshold) {
                    //this.currentInstance.position.copyFrom(snappedPosition);
                    //this.currentInstance.position.y -= this.guideMeshHeight / 2;
                    this.currentInstance.position = BABYLON.Vector3.Lerp(this.currentInstance.position, snappedPosition, lerpRate);

                    // Check if the movement has effectively stopped
                    let distanceToTarget = BABYLON.Vector3.Distance(this.currentInstance.position, this.guideMesh.position);
                    if (distanceToTarget < lerpStopThreshold) {

                    }
                }
            }
        }
    }

    renderUI() {

    }
}