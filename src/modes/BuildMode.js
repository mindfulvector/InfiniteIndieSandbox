class BuildMode {
    // The mode class' constructor is called when entering a mode, and
    // the dispose method when exiting a mode.
    constructor(app) {
        this.app = app;
        this.selectedObjectIndex = 0; // Index of the selected object in BuildableObjectList
        this.currentInstance = null; // Currently placed/selected instance in the world
        this.placedInstances = [];   // stack of {wo, inst} placed this session, for undo/delete
        this._deleteHistory = [];    // stack of deleted-object snapshot GROUPS, for un-delete (U)
        this._redoHistory = [];      // stack of UNDO-restored instance GROUPS, for redo (Y)
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

        // Mouse: TAPPING an object in cursor mode walks the cursor onto it
        // and selects it (Space then grabs it; Shift+Space opens its
        // properties). POINTERTAP -- not DOWN -- so camera drags stay drags.
        this._pointerObs = this.app.scene.onPointerObservable.add((pi) => {
            if (pi.type !== BABYLON.PointerEventTypes.POINTERTAP) return;
            if (this.currentInstance) return;   // placement mode keeps its keys
            const inst = this._instanceFromMesh(pi.pickInfo && pi.pickInfo.pickedMesh);
            if (inst) this.selectInstance(inst, !!(pi.event && pi.event.shiftKey));
        });

        // The left sidebar object list (see _refreshSidebar).
        this._sidebar = null;
        this._sidebarKey = null;

        // Snap-assisted placement: CapsLock latches it, Shift and the pad's
        // left bumper hold it (see _snapActive / snapToNearest).
        this.snapLatch = false;
    }

    dispose() {
        this.app.modeName.text = "Exiting BuildMode...";
        if (this._pointerObs) {
            this.app.scene.onPointerObservable.remove(this._pointerObs);
            this._pointerObs = null;
        }
        if (this._sidebar) { this._sidebar.dispose(); this._sidebar = null; }
        this.disposeCurrentInstance();
        // camFocus lives for the whole mode (not per-instance), so tear it down
        // here rather than in disposeCurrentInstance.
        this.camFocus?.dispose();
        this.camFocus = null;
    }

    // Walk a picked mesh up to the world-object instance that owns it.
    _instanceFromMesh(mesh) {
        let n = mesh;
        while (n) {
            if (n.worldObject && n.worldId != null) return n;
            n = n.parent;
        }
        return null;
    }

    // Left sidebar: every object in the browsed category as a clickable
    // list, the current selection highlighted. Arrow keys already walk the
    // same selection, so the list and the keys stay in lockstep; a row
    // click rides the existing programmatic-selection path. Rebuilt only
    // when the category/selection actually changes.
    _refreshSidebar() {
        const app = this.app;
        const list = app.BuildableObjectList;
        if (!list.length || !app.gui || !BABYLON.GUI) return;
        const sel = this.selectedObjectIndex;
        const cat = (sel >= 0 && list[sel])
            ? app.objectCategory(list[sel].name)
            : (this.browseCat || app.objectCategory(list[0].name));
        const key = cat + '|' + sel;
        if (key === this._sidebarKey) return;
        this._sidebarKey = key;
        if (this._sidebar) { this._sidebar.dispose(); this._sidebar = null; }

        const panel = new BABYLON.GUI.StackPanel('buildSidebar');
        panel.width = '200px';
        panel.isVertical = true;
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        panel.background = 'rgba(6, 8, 26, 0.78)';

        const title = new BABYLON.GUI.TextBlock('sbTitle', '  ' + cat.toUpperCase());
        title.height = '30px';
        title.color = '#7fdcff';
        title.fontSize = 15;
        title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(title);

        list.forEach((wo, idx) => {
            if (app.objectCategory(wo.name) !== cat) return;
            const owned = app.isPurchased(wo.name);
            const current = idx === sel;
            const btn = BABYLON.GUI.Button.CreateSimpleButton('sbRow_' + wo.name,
                (current ? '▶ ' : '   ') + (owned ? '' : '🔒 ') + app.prettyName(wo.name));
            btn.height = '26px';
            btn.thickness = 0;
            btn.color = current ? '#ffffff' : (owned ? '#b9c4e8' : '#6a7292');
            btn.background = current ? 'rgba(60, 120, 255, 0.35)' : 'transparent';
            if (btn.textBlock) {
                btn.textBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
                btn.textBlock.fontSize = 13;
            }
            btn.onPointerUpObservable.add(() => {
                if (!app.isPurchased(wo.name)) {
                    app.toasty(app.prettyName(wo.name) + ' is locked — ' +
                        app.priceOf(wo.name) + ' px in the shop.');
                    return;
                }
                this.selectedObjectIndex = idx;
                this._selectRequested = true;
                this._sidebarKey = null;   // force a refresh with the new highlight
            });
            panel.addControl(btn);
        });

        app.gui.addControl(panel);
        this._sidebar = panel;
    }

    // ---- snap-assisted placement (user request) ---------------------------
    // With snap held (Shift / pad LB) or latched (CapsLock), movement keys
    // JUMP the moving object flush against the nearest object in that
    // direction, and rotation keys match the nearest similar piece's angle.

    _snapActive() {
        return this.app.keyDown('SHIFT') || this.snapLatch || this.app.padDown('block');
    }

    // Aggregated world-space bounds of an instance and its children.
    _worldBounds(inst) {
        inst.computeWorldMatrix(true);
        let min = null, max = null;
        [inst].concat(inst.getChildMeshes ? inst.getChildMeshes() : []).forEach((m) => {
            if (!m.getBoundingInfo) return;
            m.computeWorldMatrix(true);
            const b = m.getBoundingInfo().boundingBox;
            if (!min) { min = b.minimumWorld.clone(); max = b.maximumWorld.clone(); }
            else {
                min = BABYLON.Vector3.Minimize(min, b.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, b.maximumWorld);
            }
        });
        return { min, max };
    }

    // Slide the moving object along `axis` (+/- sign) until its bounding box
    // sits flush against the nearest object in that direction. Neighbors
    // must overlap on the perpendicular axis and roughly in height, and must
    // actually BE in that direction (small negative tolerance keeps an
    // already-flush pair idempotent).
    snapToNearest(axis, sign) {
        const inst = this.currentInstance;
        if (!inst) return false;
        const bb = this._worldBounds(inst);
        if (!bb.min) return false;
        const other = axis === 'x' ? 'z' : 'x';
        let bestGap = Infinity;
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((o) => {
                if (!o || o === inst) return;
                const ob = this._worldBounds(o);
                if (!ob.min) return;
                if (ob.max[other] < bb.min[other] - 0.01 || ob.min[other] > bb.max[other] + 0.01) return;
                if (ob.max.y < bb.min.y - 0.6 || ob.min.y > bb.max.y + 0.6) return;
                const gap = sign > 0 ? ob.min[axis] - bb.max[axis] : bb.min[axis] - ob.max[axis];
                if (gap < -0.02 || gap >= bestGap) return;
                bestGap = gap;
            });
        });
        if (bestGap === Infinity) {
            this.app.toasty('Nothing to snap to that way.');
            return false;
        }
        this.targetPosition[axis] += sign * bestGap;
        return true;
    }

    // Match the rotation of the nearest piece that is the same TYPE or a
    // SIMILAR SIZE (bounding volume within half-to-double of ours).
    snapRotationToNeighbor() {
        const inst = this.currentInstance;
        if (!inst) return false;
        const bb = this._worldBounds(inst);
        if (!bb.min) return false;
        const myVol = (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z);
        const myName = this.currentWorldObject ? this.currentWorldObject.name : null;
        let best = null, bestD = Infinity;
        this.app.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((o) => {
                if (!o || o === inst) return;
                const sameType = o.worldObject && o.worldObject.name === myName;
                let ok = sameType;
                if (!ok) {
                    const ob = this._worldBounds(o);
                    if (!ob.min) return;
                    const vol = (ob.max.x - ob.min.x) * (ob.max.y - ob.min.y) * (ob.max.z - ob.min.z);
                    ok = vol > myVol * 0.5 && vol < myVol * 2.0;
                }
                if (!ok) return;
                const d = BABYLON.Vector3.Distance(o.position, inst.position);
                if (d > 12) return;   // "nearby" means NEARBY, not across the map
                if (d < bestD) { bestD = d; best = o; }
            });
        });
        if (!best) {
            this.app.toasty('No similar piece nearby to match.');
            return false;
        }
        this._lastRotMatch = (best.worldObject ? best.worldObject.name : '?') + '#' + best.worldId;
        const q = best.rotationQuaternion
            ? best.rotationQuaternion.clone()
            : BABYLON.Quaternion.RotationYawPitchRoll(best.rotation ? best.rotation.y : 0, 0, 0);
        inst.rotationQuaternion = q.clone();
        this.targetRotation = q.clone();
        this.app.toasty('Rotation matched.');
        return true;
    }

    // Put the cursor on an instance and make it the selection (mouse path;
    // the WASD cursor rebuilds the selection on its next move as usual).
    // With `additive` (shift-click) the instance is TOGGLED into a multi-
    // selection instead of replacing it -- shift-click a run of objects,
    // then Delete or F acts on the whole group.
    selectInstance(inst, additive) {
        if (typeof this.selection == 'undefined') this.selection = [];
        if (additive) {
            const idx = this.selection.indexOf(inst);
            if (idx >= 0) {
                this.selection.splice(idx, 1);
                this.app.showBoundingBoxAll(inst, false);
            } else {
                this.selection.push(inst);
                this.app.showBoundingBoxAll(inst, true);
            }
        } else {
            this.selection.forEach((s) => this.app.showBoundingBoxAll(s, false));
            this.selection = [inst];
            this.app.showBoundingBoxAll(inst, true);
        }
        // Anchor the cursor on the most-recently-touched instance.
        const anchor = this.selection.length ? this.selection[this.selection.length - 1] : inst;
        this.targetPosition = anchor.position.clone();
        if (this.cursor) {
            this.cursor.position = anchor.position.clone();
            this.cursor.computeWorldMatrix();
        }
    }

    // Commit the current instance into the world: hide its highlight, record it
    // for undo, and clear it as the active instance. Clears the grabbed flag.
    placeCurrent() {
        if (!this.currentInstance) return;
        this.app.showBoundingBoxAll(this.currentInstance, false);
        this.placedInstances.push({ wo: this.currentWorldObject, inst: this.currentInstance });
        // Linked builders share their edits live.
        if (this.app.net && !this.app.net.closed) this.app.net.sendAdd(this.currentInstance);
        // Group move: drop the followers too -- re-register them on the undo
        // stack at their new spot and share the move to linked builders.
        if (this._groupFollowers) {
            this._groupFollowers.forEach((g) => {
                if (!g.inst) return;
                this.app.showBoundingBoxAll(g.inst, false);
                this.placedInstances.push({ wo: g.inst.worldObject, inst: g.inst });
                if (this.app.net && !this.app.net.closed) this.app.net.sendAdd(g.inst);
            });
            this._groupFollowers = null;
        }
        this.currentInstance = null;
        this.grabbed = false;
        this.app.sound.play('place');
    }

    // Build a fresh instance of `node` offset a little, carrying its
    // rotation, scale and params (but NOT wires -- a copy starts unwired).
    // Registered on the placed/undo stacks and shared to linked builders.
    _copyInstance(node, offset) {
        const wo = node.worldObject;
        if (!wo) return null;
        const off = offset || new BABYLON.Vector3(1.5, 0, 1.5);
        const inst = wo.createInstance({
            po: node.position.add(off),
            ro: node.rotationQuaternion ? node.rotationQuaternion.clone() : null,
            sc: node.scaling ? node.scaling.clone() : null,
            pr: node.params ? JSON.parse(JSON.stringify(node.params)) : {},
        });
        if (!inst) return null;
        inst.checkCollisions = true;
        return inst;
    }

    // Stamp a ROW: lay down `count` copies of the highlighted object marching
    // along +X, each stepped by the object's own footprint so blocks/walls
    // tile flush -- turns a tedious one-at-a-time wall into a single keypress
    // (L). The row (original + copies) becomes the selection, so it moves or
    // deletes as one.
    stampLine(count) {
        const n = count || 4;
        if (typeof this.selection == 'undefined' || this.selection.length === 0) {
            this.app.toasty('Move the cursor over an object first, then L to stamp a row.');
            return;
        }
        const node = this.selection[this.selection.length - 1];
        const wo = node.worldObject;
        if (!wo) { this.app.toasty("That object can't be stamped."); return; }
        if (!this.app.isPurchased(wo.name)) {
            this.app.toasty('Locked — buy ' + this.app.prettyName(wo.name) +
                ' (' + this.app.priceOf(wo.name) + ' px) in the shop to stamp it.');
            return;
        }
        const bb = this.computeWorldBBox(node);
        const stepX = bb && bb.size.x > 0.05 ? bb.size.x : Math.max(1, node.scaling.x * 2);
        const copies = [];
        for (let i = 1; i <= n; i++) {
            const c = this._copyInstance(node, new BABYLON.Vector3(stepX * i, 0, 0));
            if (c) {
                this.placedInstances.push({ wo: wo, inst: c });
                if (this.app.net && !this.app.net.closed) this.app.net.sendAdd(c);
                copies.push(c);
            }
        }
        this.selection.forEach((s) => this.app.showBoundingBoxAll(s, false));
        this.selection = [node].concat(copies);
        this.selection.forEach((s) => this.app.showBoundingBoxAll(s, true));
        this.app.sound.play('place');
        this.app.toasty('Stamped a row of ' + this.selection.length + '.');
    }

    // Duplicate the highlighted object: build a fresh instance carrying the
    // same rotation, scale and per-instance params (but NOT its wires -- a
    // copy starts unwired, since wires point at specific instances), offset a
    // little, and hand it to the normal move/place flow as the grabbed active
    // instance. Space drops it.
    duplicateSelected() {
        if (typeof this.selection == 'undefined' || this.selection.length === 0) {
            this.app.toasty('Move the cursor over an object first, then F to duplicate it.');
            return;
        }
        // A multi-selection duplicates as a GROUP: copy each object in place
        // (offset), then re-select the copies (no grab -- you'd need a group
        // move for that, which the WASD cursor doesn't do yet).
        if (this.selection.length > 1) {
            const copies = [];
            this.selection.slice().forEach((n) => {
                if (n.worldObject && this.app.isPurchased(n.worldObject.name)) {
                    const c = this._copyInstance(n);
                    if (c) {
                        this.placedInstances.push({ wo: n.worldObject, inst: c });
                        if (this.app.net && !this.app.net.closed) this.app.net.sendAdd(c);
                        copies.push(c);
                    }
                }
            });
            this.selection.forEach((s) => this.app.showBoundingBoxAll(s, false));
            this.selection = copies;
            copies.forEach((c) => this.app.showBoundingBoxAll(c, true));
            this.app.sound.play('place');
            this.app.toasty('Duplicated ' + copies.length + ' objects.');
            return;
        }

        const node = this.selection[0];
        const wo = node.worldObject;
        if (!wo) { this.app.toasty("That object can't be duplicated."); return; }
        if (!this.app.isPurchased(wo.name)) {
            this.app.toasty('Locked — buy ' + this.app.prettyName(wo.name) +
                ' (' + this.app.priceOf(wo.name) + ' px) in the shop to copy it.');
            return;
        }

        const copy = this._copyInstance(node);
        if (!copy) { this.app.toasty("Couldn't duplicate that object."); return; }

        // Become the active (grabbed) instance, reusing the move/place logic
        // (mirror grabSelectedObject's field setup so move/rotate/scale work).
        this.clearSelection();
        this.cursor?.dispose();
        this.cursor = null;
        this.currentInstance = copy;
        this.currentWorldObject = wo;
        this.selectedObjectIndex = this.app.BuildableObjectList.indexOf(wo);
        this.grabbed = true;
        const bb = this.computeWorldBBox(copy);
        this.targetPosition = bb
            ? new BABYLON.Vector3(bb.center.x, bb.min.y, bb.center.z)
            : copy.position.clone();
        this.targetScale = copy.scaling.x;
        this.initialScale = copy.scaling.x;
        if (copy.rotationQuaternion) this.targetRotation = copy.rotationQuaternion.clone();
        this.app.showBoundingBoxAll(copy, true);
        this.frameCameraToInstance(copy);
        this.app.sound.play('place');
        this.app.toasty('Duplicated ' + this.app.prettyName(wo.name) + ' — move it and Space to place.');
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

        // Group move: when several are selected, the rest FOLLOW the anchor,
        // each keeping its offset. Capture that before clearSelection wipes it,
        // and take the followers off the undo stack too (they re-register on drop).
        this._groupFollowers = null;
        if (this.selection.length > 1) {
            const anchorPos = node.position.clone();
            this._groupFollowers = this.selection
                .filter((f) => f && f !== node && f.worldObject)
                .map((f) => ({ inst: f, off: f.position.subtract(anchorPos) }));
            const followSet = new Set(this._groupFollowers.map((g) => g.inst));
            this.placedInstances = this.placedInstances.filter((p) => !followSet.has(p.inst));
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
        if (this._groupFollowers) {
            this._groupFollowers.forEach((g) => this.app.showBoundingBoxAll(g.inst, true));
        }
        this.frameCameraToInstance(node);
        this.app.toasty(this._groupFollowers
            ? 'Moving ' + (this._groupFollowers.length + 1) + ' objects — Space to drop them.'
            : 'Moving object — Space to drop it.');
    }

    // Remove objects. In cursor mode (0) with the cursor over object(s), delete
    // those; otherwise undo the most recently placed object.
    deleteAction() {
        // A fresh deletion diverges history -- the redo trail is no longer valid.
        this._redoHistory = [];
        if (typeof this.selection != 'undefined' && this.selection.length > 0) {
            let n = 0, locked = 0;
            const group = [];
            this.selection.slice().forEach((node) => {
                if (node.worldObject && !this.app.isPurchased(node.worldObject.name)) {
                    locked++;
                    return;   // can't remove locked objects
                }
                const snap = this._snapshot(node);
                if (snap) group.push(snap);
                this.app.showBoundingBoxAll(node, false);
                this.removePlacedInstance(node);
                n++;
            });
            this.selection = [];
            if (group.length) this._deleteHistory.push(group);
            if (n > 0) {
                this.app.sound.play('delete');
                this.app.toasty('Removed ' + n + ' object' + (n === 1 ? '' : 's') + '.  (U to undo)');
            }
            else if (locked > 0) this.app.toasty('Locked — purchase in the shop to remove.');
        } else if (this.placedInstances.length > 0) {
            const last = this.placedInstances.pop();
            if (last && last.inst) {
                const snap = this._snapshot(last.inst);
                if (snap) this._deleteHistory.push([snap]);
                this.app.showBoundingBoxAll(last.inst, false);
                this.removePlacedInstance(last.inst);
            }
            this.app.sound.play('delete');
            this.app.toasty('Removed last placed object.  (U to undo)');
        } else {
            this.app.toasty('Nothing to remove. Press 0 to select placed objects.');
        }
    }

    // Snapshot an instance so a delete can be undone: position (its rest pose
    // if a script animates it), rotation, scale, params and wires -- deep
    // copies, so the live object can be disposed without touching the record.
    _snapshot(inst) {
        if (!inst || !inst.worldObject) return null;
        const po = (inst.restPos != null) ? inst.restPos
            : (inst.restY != null ? new BABYLON.Vector3(inst.position.x, inst.restY, inst.position.z) : inst.position);
        return {
            wo: inst.worldObject.name,
            po: po.clone(),
            ro: inst.rotationQuaternion ? inst.rotationQuaternion.clone() : null,
            sc: inst.scaling ? inst.scaling.clone() : null,
            pr: inst.params ? JSON.parse(JSON.stringify(inst.params)) : {},
            wi: inst.wires ? JSON.parse(JSON.stringify(inst.wires)) : [],
        };
    }

    // Undo the most recent deletion: recreate every object in the last delete
    // group from its snapshot (params and wires intact), back into the world.
    undoDelete() {
        if (this._deleteHistory.length === 0) {
            this.app.toasty('Nothing to undo.');
            return;
        }
        const group = this._deleteHistory.pop();
        const restoredInsts = [];
        group.forEach((snap) => {
            const wo = this.app.findWorldObject(snap.wo);
            if (!wo) return;
            const inst = wo.createInstance(snap);
            if (!inst) return;
            inst.checkCollisions = true;
            this.placedInstances.push({ wo: wo, inst: inst });
            // Linked builders see the restore as a placement.
            if (this.app.net && !this.app.net.closed) this.app.net.sendAdd(inst);
            restoredInsts.push(inst);
        });
        // Feed the redo stack so Y can re-remove exactly what we just restored.
        if (restoredInsts.length) this._redoHistory.push(restoredInsts);
        this.app.sound.play('place');
        const restored = restoredInsts.length;
        this.app.toasty('Restored ' + restored + ' object' + (restored === 1 ? '' : 's') + '.  (Y to redo)');
    }

    // Redo the most recently undone deletion: re-remove exactly the objects the
    // last undo brought back, and push their snapshots back onto the undo stack
    // so U can restore them again (a symmetric undo/redo pair).
    redoDelete() {
        if (this._redoHistory.length === 0) {
            this.app.toasty('Nothing to redo.');
            return;
        }
        const group = this._redoHistory.pop();
        const snaps = [];
        group.forEach((inst) => {
            if (!inst) return;
            const snap = this._snapshot(inst);
            if (snap) snaps.push(snap);
            this.app.showBoundingBoxAll(inst, false);
            this.removePlacedInstance(inst);
        });
        if (snaps.length) this._deleteHistory.push(snaps);
        this.app.sound.play('delete');
        this.app.toasty('Re-removed ' + snaps.length + ' object' + (snaps.length === 1 ? '' : 's') + '.  (U to undo)');
    }

    // Dispose an instance and drop it from the undo stack.
    removePlacedInstance(node) {
        // Linked builders share their deletions live.
        if (this.app.net && !this.app.net.closed) this.app.net.sendDel(node);
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
            this.app.sound.play('menu-move');
        }

        if (this.app.keyPressed('ArrowRight')) {
            this.selectedObjectIndex = this.nextBuildableIndex(1);
            objectChanged = true;
            this.app.sound.play('menu-move');
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
                this.app.sound.play('menu-move');
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

        // F duplicates the highlighted object: a fresh copy (same rotation,
        // scale and settings) is grabbed for placement, so you can stamp out
        // rows of a configured object without re-browsing or re-tuning it.
        if (!this.currentInstance && this.app.keyPressed('F')) {
            this.duplicateSelected();
        }

        // U undoes the last deletion -- brings back what you just removed.
        if (!this.currentInstance && this.app.keyPressed('U')) {
            this.undoDelete();
        }

        // Y redoes it -- re-removes what U just brought back.
        if (!this.currentInstance && this.app.keyPressed('Y')) {
            this.redoDelete();
        }

        // L stamps a row of the highlighted object -- fast walls and floors.
        if (!this.currentInstance && this.app.keyPressed('L')) {
            this.stampLine();
        }

        // Space (in cursor mode, over a highlighted object) grabs it to move
        // it -- the same key that places, so building flows on one thumb.
        // Shift+Space opens the highlighted object's properties instead.
        // Enter stays as a legacy grab alias. Handled here, before the
        // cursor/placement split, because grabbing makes it the active
        // instance and tears down the cursor. (The !currentInstance guard
        // comes first: keyPressed consumes, and placement needs its Space.)
        if (!this.currentInstance &&
            (this.app.keyPressed(' ') || this.app.keyPressed('ENTER'))) {
            if (this.app.keyDown('SHIFT')) {
                if (typeof this.selection != 'undefined' && this.selection.length > 0) {
                    this.app.openParams(this.selection[0]);
                }
            } else {
                this.grabSelectedObject();
            }
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
            // (Cursor-mode Space is handled above: grab, or Shift+Space for
            // properties.)

            // Rotate through color gradient for cursor. (Guard the cursor:
            // in cursor mode it's normally present, but a just-placed grab or
            // duplicate can leave a one-frame gap before it's rebuilt below.)
            if (this.cursor) {
                this.cursorMatIndex += 1;
                if(this.cursorMatIndex >= 100) {
                    this.cursorMatIndex = 0;
                }
                this.cursor.material = this.cursorMats[this.cursorMatIndex];
            }
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

        // K asks the build assistant: type a request ("a walled arena",
        // "a star trail") and it builds real objects around you.
        if (this.app.keyPressed('K') && this.app.assistant) {
            this.app.promptText('Ask the builder for…', 'a walled arena', (req) => {
                if (req) this.app.assistant.run(req);
            });
        }

        // CapsLock latches snap mode on/off (Shift and pad LB hold it).
        if (this.app.keyPressed('CAPSLOCK')) {
            this.snapLatch = !this.snapLatch;
            this.app.toasty(this.snapLatch
                ? 'Snap mode ON — movement keys snap to neighbors, rotation matches them.'
                : 'Snap mode off.');
        }
        const snapNow = this.currentInstance && this._snapActive();

        // Movement control for currentInstance and mesh cursor. With snap
        // active, each movement key PRESS jumps the object flush against the
        // nearest neighbor along the dominant world axis of that direction.
        const snapDir = (v) => {
            const axis = Math.abs(v.x) >= Math.abs(v.z) ? 'x' : 'z';
            const sign = (axis === 'x' ? v.x : v.z) >= 0 ? 1 : -1;
            return this.snapToNearest(axis, sign);
        };
        if (snapNow) {
            if (this.app.keyPressed('W')) moved = snapDir(forward) || moved;
            if (this.app.keyPressed('S')) moved = snapDir(forward.scale(-1)) || moved;
            if (this.app.keyPressed('A')) moved = snapDir(right) || moved;
            if (this.app.keyPressed('D')) moved = snapDir(right.scale(-1)) || moved;
        } else {
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

            // Buildable object for placement. With snap active, rotation
            // keys MATCH the nearest similar piece's angle instead of
            // stepping 45 degrees.
            if (this.app.keyPressed('Z')) {
                if (this._snapActive()) {
                    this.snapRotationToNeighbor();
                } else {
                    // Rotate 45 degrees to the left (counter-clockwise)
                    if(null == this.currentInstance.rotationQuaternion) {
                        this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                    }
                    this.currentInstance.rotationQuaternion
                        = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(-rotationAngle, 0, 0));
                    this.targetRotation = this.currentInstance.rotationQuaternion.clone();
                }
            }
            if (this.app.keyPressed('C')) {
                if (this._snapActive()) {
                    this.snapRotationToNeighbor();
                } else {
                    if(null == this.currentInstance.rotationQuaternion) {
                        this.currentInstance.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
                    }
                    // Rotate 45 degrees to the right (clockwise)
                    this.currentInstance.rotationQuaternion
                        = this.currentInstance.rotationQuaternion.multiply(BABYLON.Quaternion.RotationYawPitchRoll(rotationAngle, 0, 0));
                    this.targetRotation = this.currentInstance.rotationQuaternion.clone();
                }
            }

            // Calculate a grid size for object placement based on the current scale, but cap at 1.0
            gridSize = Math.abs(gridSize * this.targetScale);
            if(gridSize > 1.0) gridSize = 1.0;

            // `targetPosition` is the anchor: the ground point the object's base
            // should rest on. Snap it horizontally to the grid when the player
            // isn't actively dragging the object.
            // (Snap mode suspends the grid pull entirely: a flush vertex
            // snap often lands off-grid, and the idle lerp below would
            // quietly drag it back onto grid multiples.)
            let anchor = this.targetPosition.clone();
            if (!moved && !snapNow) {
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

            // Group move: drag the followers along, each holding its offset from
            // the anchor (translation only -- they keep their own scale/rotation).
            if (this._groupFollowers) {
                this._groupFollowers.forEach((g) => {
                    if (g.inst) {
                        g.inst.position.copyFrom(this.currentInstance.position.add(g.off));
                        g.inst.computeWorldMatrix(true);
                    }
                });
            }

            // Keep the camera trained on the object's visual centre.
            this.camFocus.position.copyFrom(center);
            this.app.camera.lockedTarget = this.camFocus;
        }

        this.updateObjectsInBuildMode();
        this._refreshSidebar();

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
