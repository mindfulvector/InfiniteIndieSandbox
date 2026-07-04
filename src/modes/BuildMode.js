class BuildMode {
    // The mode class' constructor is called when entering a mode, and
    // the dispose method when exiting a mode.
    constructor(app) {
        this.app = app;
        this.selectedObjectIndex = 0; // Index of the selected object in BuildableObjectList
        this.currentInstance = null; // Currently placed/selected instance in the world
        this.placedInstances = [];   // stack of {wo, inst} placed this session, for undo/delete
        this.grabbed = false;        // true while moving a previously-placed object
        this.gridSize = 10;
        this.lastUndoInstanceIndex = -1;
        this.lockMenuButtons = false;
        this.initialScale = 1.0;
        this.targetScale = 1.0;

        this.cursor = BABYLON.MeshBuilder.CreateBox('meshCursor', { size:0.25 });
        this.cursorMatIndex = 0;

        // Category the object bar is browsing. Follows the selection, but can
        // point at a category with no owned objects (browse + buy from tiles).
        this.browseCat = null;

        // The camera radius (zoom) is framed once on the first selection, then
        // the player's zoom is respected for the rest of the mode.
        this._framedOnce = false;

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

        // An invisible node the camera locks onto, kept at the current object's
        // visual (bounding-box) centre so every object stays framed consistently
        // regardless of where its mesh pivot happens to sit.
        this.camFocus = new BABYLON.TransformNode('buildCamFocus', this.app.scene);

        // Set static UI strings once on mode load
        this.app.modeName.text = "BuildMode";
    }

    dispose() {
        this.app.modeName.text = "Exiting BuildMode...";
        this.disposeCurrentInstance();
        // camFocus lives for the whole mode (not per-instance), so tear it down
        // here rather than in disposeCurrentInstance.
        this.camFocus?.dispose();
        this.camFocus = null;
    }

    // Commit the current instance into the world: hide its highlight, record it
    // for undo, and clear it as the active instance. Clears the grabbed flag.
    placeCurrent() {
        if (!this.currentInstance) return;
        this.app.showBoundingBoxAll(this.currentInstance, false);
        this.placedInstances.push({ wo: this.currentWorldObject, inst: this.currentInstance });
        this.currentInstance = null;
        this.grabbed = false;
    }

    // Pick up the object currently highlighted by the cursor so it can be moved.
    // It becomes the active instance and reuses the normal move/rotate/scale and
    // base-align/camera logic; Space drops it back into the world.
    grabSelectedObject() {
        if (typeof this.selection == 'undefined' || this.selection.length === 0) {
            this.app.toasty('Move the cursor over an object first, then Enter to move it.');
            return;
        }
        const node = this.selection[0];
        if (!node.worldObject) {
            this.app.toasty("That object can't be moved.");
            return;
        }
        if (!this.app.isPurchased(node.worldObject.name)) {
            this.app.toasty('Locked — buy ' + this.app.prettyName(node.worldObject.name) +
                ' (' + this.app.priceOf(node.worldObject.name) + ' px) in the shop to edit it.');
            return;
        }

        // It's being moved, not duplicated -- take it off the undo stack.
        this.placedInstances = this.placedInstances.filter((p) => p.inst !== node);

        // Leave cursor mode and make the object the active (moving) instance.
        this.clearSelection();
        this.cursor?.dispose();
        this.cursor = null;
        this.currentInstance = node;
        this.currentWorldObject = node.worldObject;
        this.selectedObjectIndex = this.app.BuildableObjectList.indexOf(node.worldObject);
        this.grabbed = true;

        // Anchor at its present base-centre so it doesn't jump, and carry its
        // current scale/rotation.
        const bb = this.computeWorldBBox(node);
        if (bb) {
            this.targetPosition = new BABYLON.Vector3(bb.center.x, bb.min.y, bb.center.z);
        }
        this.targetScale = node.scaling.x;
        this.initialScale = node.scaling.x;
        if (node.rotationQuaternion) this.targetRotation = node.rotationQuaternion.clone();

        this.app.showBoundingBoxAll(node, true);
        this.frameCameraToInstance(node);
        this.app.toasty('Moving object — Space to drop it.');
    }

    // Remove objects. In cursor mode (0) with the cursor over object(s), delete
    // those; otherwise undo the most recently placed object.
    deleteAction() {
        if (typeof this.selection != 'undefined' && this.selection.length > 0) {
            let n = 0, locked = 0;
            this.selection.slice().forEach((node) => {
                if (node.worldObject && !this.app.isPurchased(node.worldObject.name)) {
                    locked++;
                    return;   // can't remove locked objects
                }
                this.app.showBoundingBoxAll(node, false);
                this.removePlacedInstance(node);
                n++;
            });
            this.selection = [];
            if (n > 0) this.app.toasty('Removed ' + n + ' object' + (n === 1 ? '' : 's') + '.');
            else if (locked > 0) this.app.toasty('Locked — purchase in the shop to remove.');
        } else if (this.placedInstances.length > 0) {
            const last = this.placedInstances.pop();
            if (last && last.inst) {
                this.app.showBoundingBoxAll(last.inst, false);
                this.removePlacedInstance(last.inst);
            }
            this.app.toasty('Removed last placed object.');
        } else {
            this.app.toasty('Nothing to remove. Press 0 to select placed objects.');
        }
    }

    // Dispose an instance and drop it from the undo stack.
    removePlacedInstance(node) {
        if (!node) return;
        this.placedInstances = this.placedInstances.filter((p) => p.inst !== node);
        if (node.worldObject) {
            node.worldObject.disposeInstance(node);
        } else {
            node.dispose();
        }
    }

    // Ask BuildMode to switch the active placement object to a given index in
    // the buildable list (consumed on the next update tick).
    requestSelectIndex(index) {
        if (index < 0 || index >= this.app.BuildableObjectList.length) return;
        this.selectedObjectIndex = index;
        this._selectRequested = true;
    }

    // Return the index of the next owned object in scan direction dir (+1/-1),
    // staying WITHIN the current category (the bottom bar shows one category at
    // a time; up/down switches category) and skipping locked (unpurchased)
    // objects. Stays put if nothing else in the category is owned.
    nextBuildableIndex(dir) {
        const list = this.app.BuildableObjectList;
        const n = list.length;
        if (n === 0) return this.selectedObjectIndex;
        const cat = (this.selectedObjectIndex >= 0 && this.selectedObjectIndex < n)
            ? this.app.objectCategory(list[this.selectedObjectIndex].name)
            : (this.browseCat || this.app.objectCategory(list[0].name));
        let i = (this.selectedObjectIndex < 0) ? (dir > 0 ? -1 : 0) : this.selectedObjectIndex;
        for (let k = 0; k < n; k++) {
            i = (i + dir + n) % n;
            if (this.app.objectCategory(list[i].name) === cat &&
                this.app.isPurchased(list[i].name)) return i;
        }
        return this.selectedObjectIndex;
    }

    // The previous/next category in first-appearance order -- ALL categories,
    // including ones whose objects are all still locked (the bar shows them
    // with price tags so they can be discovered and bought). Returns
    // { cat, ownedIdx } where ownedIdx is the first owned object in that
    // category, or -1 if none is owned yet.
    categoryJump(dir) {
        const list = this.app.BuildableObjectList;
        if (list.length === 0) return null;
        const cats = [];
        list.forEach((wo) => {
            const c = this.app.objectCategory(wo.name);
            if (cats.indexOf(c) === -1) cats.push(c);
        });
        const curCat = (this.selectedObjectIndex >= 0 && this.selectedObjectIndex < list.length)
            ? this.app.objectCategory(list[this.selectedObjectIndex].name)
            : (this.browseCat || cats[0]);
        let ci = Math.max(0, cats.indexOf(curCat));
        ci = (ci + dir + cats.length) % cats.length;
        const cat = cats[ci];
        const ownedIdx = list.findIndex((wo) =>
            this.app.objectCategory(wo.name) === cat && this.app.isPurchased(wo.name));
        return { cat: cat, ownedIdx: ownedIdx };
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

    // Union world-space bounding box over an instance and all of its sub-meshes.
    // Returns {min,max,center,size} or null if there is no renderable geometry.
    computeWorldBBox(inst) {
        const nodes = [inst].concat(inst.getChildMeshes ? inst.getChildMeshes() : []);
        let min = null, max = null;
        nodes.forEach((m) => {
            if (m.getBoundingInfo && m.getTotalVertices && m.getTotalVertices() > 0) {
                m.computeWorldMatrix(true);
                const bb = m.getBoundingInfo().boundingBox;
                if (!min) { min = bb.minimumWorld.clone(); max = bb.maximumWorld.clone(); }
                else {
                    min = BABYLON.Vector3.Minimize(min, bb.minimumWorld);
                    max = BABYLON.Vector3.Maximize(max, bb.maximumWorld);
                }
            }
        });
        if (!min) return null;
        return { min, max, center: min.add(max).scale(0.5), size: max.subtract(min) };
    }

    // Position an instance so that its footprint is centred on `anchor` (x,z) and
    // it snaps to `anchor.y` per the object's anchor mode, whatever its pivot is.
    // Returns the resulting world-space centre (for the camera focus).
    //   'above' (default): the base sits on anchor.y -> the object rests on top of
    //           the surface at the cursor (a tree, a wall).
    //   'below': the TOP sits at anchor.y -> the top (walking) surface aligns with
    //           the cursor and the body extends below (terrain tiles of any
    //           thickness then share a seamless top surface).
    anchorInstance(inst, anchor) {
        inst.position.copyFrom(anchor);
        inst.computeWorldMatrix(true);
        const bb = this.computeWorldBBox(inst);
        if (!bb) return anchor.clone();   // no geometry: leave pivot at anchor
        const below = inst.worldObject && inst.worldObject.anchor === 'below';
        const yShift = below ? (anchor.y - bb.max.y)   // top onto anchor
                             : (anchor.y - bb.min.y);   // base onto anchor
        const shift = new BABYLON.Vector3(
            anchor.x - bb.center.x,   // centre footprint over anchor
            yShift,
            anchor.z - bb.center.z
        );
        inst.position.addInPlace(shift);
        const centerYOffset = below ? -(bb.max.y - bb.center.y)   // centre below anchor
                                    : (bb.center.y - bb.min.y);    // centre above anchor
        return new BABYLON.Vector3(anchor.x, anchor.y + centerYOffset, anchor.z);
    }

    // Point the orbit camera at the object's centre. The zoom (radius) is only
    // set ONCE, when build mode first frames an object -- after that the
    // player's chosen zoom level is respected across selection changes,
    // category jumps, tile clicks and grabs.
    frameCameraToInstance(inst) {
        inst.computeWorldMatrix(true);
        const bb = this.computeWorldBBox(inst);
        if (!bb) return;
        if (!this._framedOnce) {
            const maxDim = Math.max(bb.size.x, bb.size.y, bb.size.z, 0.5);
            this.app.camera.radius = Math.min(Math.max(maxDim * 2.4, 4), 60);
            this._framedOnce = true;
        }
        this.camFocus.position.copyFrom(bb.center);
        this.app.camera.lockedTarget = this.camFocus;
    }

    update() {
        let buildMode = this;

        if (this.app.BuildableObjectList.length === 0) {
            return; // No objects to place
        }

        let objectChanged = false;
        let cursorMode = false;

        // Left/Right arrows cycle through the buildable objects the player owns
        // (locked/unpurchased objects are skipped -- buy them in the shop).
        if (this.app.keyPressed('ArrowLeft')) {
            this.selectedObjectIndex = this.nextBuildableIndex(-1);
            objectChanged = true;
        }

        if (this.app.keyPressed('ArrowRight')) {
            this.selectedObjectIndex = this.nextBuildableIndex(1);
            objectChanged = true;
        }

        // Up/Down arrows jump between object categories (the bar follows). A
        // category whose objects are all locked is still browsable: the bar
        // shows its price tags and the placement cursor stays active.
        let catJumpDir = 0;
        if (this.app.keyPressed('ArrowUp')) catJumpDir = -1;
        if (this.app.keyPressed('ArrowDown')) catJumpDir = 1;
        if (catJumpDir !== 0) {
            const jump = this.categoryJump(catJumpDir);
            if (jump) {
                this.browseCat = jump.cat;
                if (jump.ownedIdx >= 0) {
                    this.selectedObjectIndex = jump.ownedIdx;
                } else {
                    cursorMode = true;
                    this.selectedObjectIndex = -1;
                    this.app.toasty('All ' + jump.cat + ' items are locked — click a tile to buy.');
                }
                objectChanged = true;
            }
        }

        if (this.app.keyPressed('0')) {
            console.log('0 key is pressed; cursor mode');
            cursorMode = true;
            this.selectedObjectIndex = -1;
            if (this.grabbed) {
                this.placeCurrent();   // drop a grabbed object rather than deleting it
            } else {
                this.disposeCurrentInstance();
            }
            objectChanged = true;
        }

        // Programmatic selection request (e.g. clicking a tile in the object
        // browser). Reuses the same object-changed path as the arrow keys.
        if (this._selectRequested) {
            this._selectRequested = false;
            if (this.selectedObjectIndex >= 0) {
                objectChanged = true;
            }
        }

        // Delete / Backspace removes objects: the cursor selection if any,
        // otherwise the most recently placed object (quick undo).
        if (this.app.keyPressed('DELETE') || this.app.keyPressed('BACKSPACE')) {
            this.deleteAction();
        }

        // Enter (in cursor mode, over a highlighted object) grabs it to move it.
        // Handled here, before the cursor/placement split, because grabbing makes
        // it the active instance and tears down the cursor.
        if (!this.currentInstance && this.app.keyPressed('ENTER')) {
            this.grabSelectedObject();
        }

        let placementPosition = false;
        let objectPlaced = false;

        // Handling Space key to place currentInstance and create a new placement instance
        if (this.currentInstance) {
            placementPosition = this.currentInstance.position.clone();
            if(this.app.keyPressed(' ')) {
                const wasGrabbed = this.grabbed;
                const placed = this.currentInstance;
                this.placeCurrent();
                objectChanged = true;
                objectPlaced = true;
                // After moving an existing object, drop it and return to select
                // mode (rather than spawning a fresh preview to place more).
                if(wasGrabbed) {
                    cursorMode = true;
                    this.selectedObjectIndex = -1;
                } else if(placed && placed.script && placed.script.paramDefs && placed.script.paramDefs.length
                        && !placed.script.noAutoParams) {
                    // Freshly placed a configurable object (e.g. a spawner):
                    // open its parameters popup automatically. Scripts whose
                    // defaults are almost always right (e.g. the door) set
                    // noAutoParams so repeated placement stays uninterrupted;
                    // their settings remain reachable via cursor mode + Space.
                    this._openParamsAfter = placed;
                }
            }
        } else {
            // Space in cursor mode opens the highlighted object's parameters popup.
            if(this.app.keyPressed(' ')) {
                if (typeof this.selection != 'undefined' && this.selection.length > 0) {
                    this.app.openParams(this.selection[0]);
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
            // If the player switches objects while moving a grabbed one, drop it
            // back into the world instead of deleting it.
            if(this.grabbed && this.currentInstance) {
                this.placeCurrent();
            }
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
                        this.currentInstance.rotationQuaternion = this.targetRotation.clone();
                    }
                } else {
                    // The fresh preview after placing keeps BOTH the scale and
                    // the rotation of what was just placed, so a row of rotated
                    // objects doesn't need re-rotating every time.
                    this.currentInstance.scaling = this.makeBuildableObjectScale(this.targetScale);
                    if(typeof this.targetRotation != 'undefined') {
                        this.currentInstance.rotationQuaternion = this.targetRotation.clone();
                    }
                    //console.log('keep scale: '+this.targetScale);
                }

                // Restore position from previous selected object
                if (placementPosition) {
                    this.currentInstance.position = placementPosition;
                }

                // Frame the camera to this object so it appears centred and at a
                // consistent size whatever the player just switched from.
                this.frameCameraToInstance(this.currentInstance);
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

            // `targetPosition` is the anchor: the ground point the object's base
            // should rest on. Snap it horizontally to the grid when the player
            // isn't actively dragging the object.
            let anchor = this.targetPosition.clone();
            if (!moved) {
                const snapped = new BABYLON.Vector3(
                    Math.round((anchor.x + Number.EPSILON) / gridSize) * gridSize,
                    anchor.y,
                    Math.round((anchor.z + Number.EPSILON) / gridSize) * gridSize
                );
                this.targetPosition = BABYLON.Vector3.Lerp(this.targetPosition, snapped, lerpRate);
                anchor = this.targetPosition.clone();
            }

            // Keep the scale current, then place the object so its base rests on
            // the anchor and its footprint is centred on it -- identical handling
            // for every object regardless of its pivot.
            this.currentInstance.scaling = this.makeBuildableObjectScale(this.targetScale);
            const center = this.anchorInstance(this.currentInstance, anchor);

            // Keep the camera trained on the object's visual centre.
            this.camFocus.position.copyFrom(center);
            this.app.camera.lockedTarget = this.camFocus;
        }

        this.updateObjectsInBuildMode();

        // Auto-open the parameters popup for a just-placed configurable object.
        if(this._openParamsAfter) {
            const target = this._openParamsAfter;
            this._openParamsAfter = null;
            this.app.openParams(target);
        }
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
