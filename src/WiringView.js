// WiringView
// ----------
// An in-world "wiring" editor. Instead of a flat 2D overlay, it smoothly lifts
// the camera to an overhead view of the play area, shows only the interactive
// objects (triggers, spawners, ...), and draws the event wiring between them as
// slim 3D lines on the ground with arrowheads pointing from source to target.
//
// A player clicks a source object (e.g. a trigger) to start a wire, then clicks
// a target object (e.g. a spawner) to connect the trigger's output event to the
// target's input action. Clicking a source repeatedly cycles its output event;
// clicking an existing target cycles the action and finally removes the wire.
class WiringView {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.active = false;

        this.nodes = [];         // interactive instances currently shown
        this.labels = [];        // GUI controls linked to nodes
        this.chrome = [];        // GUI controls for title / hint / back
        this.wireMeshes = [];    // 3D line + arrowhead meshes
        this.hiddenMeshes = [];  // {mesh, wasVisible, wasPickable} restored on exit
        this.emphasized = [];    // instances with edge rendering toggled on

        this.pendingSource = null;   // instance a wire is being drawn from
        this.pendingEventIdx = 0;    // which output event of the source is active

        this.pose = null;        // target overhead camera pose (lerped toward)
        this.savedCam = null;    // camera pose to restore on exit
        this.pointerObserver = null;
    }

    // ---- lifecycle -------------------------------------------------------
    enter() {
        if(this.active) return;
        this.active = true;
        this.pendingSource = null;
        this.pendingEventIdx = 0;

        this.nodes = this.app.interactiveInstances();

        const cam = this.app.camera;
        const canvas = this.app.engine.getRenderingCanvas();
        this.savedCam = {
            alpha: cam.alpha, beta: cam.beta, radius: cam.radius,
            target: cam.target ? cam.target.clone() : BABYLON.Vector3.Zero(),
            lockedTarget: cam.lockedTarget || null,
        };
        cam.lockedTarget = null;
        cam.detachControl(canvas);

        // Frame the play area from above.
        const bounds = this._computeBounds();
        this.pose = {
            alpha: -Math.PI / 2,
            beta: 0.06,                       // near-vertical (0 is degenerate)
            radius: Math.min(Math.max(bounds.extent * 1.8, 14), 120),
            center: bounds.center,
        };

        this._hideNonInteractive();
        this._buildChrome();
        this._buildLabels();
        this.rebuild();

        // Click-to-wire.
        this.pointerObserver = this.scene.onPointerObservable.add((pi) => {
            if(pi.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
            const pick = pi.pickInfo;
            if(!pick || !pick.hit) return;
            const inst = this._instanceFromMesh(pick.pickedMesh);
            if(inst) this.handlePick(inst);
        });
    }

    exit() {
        if(!this.active) return;
        this.active = false;

        if(this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }

        this._disposeWireMeshes();
        this.labels.forEach((c) => c.dispose());
        this.labels = [];
        this.chrome.forEach((c) => c.dispose());
        this.chrome = [];

        this.emphasized.forEach((inst) => {
            if(inst && typeof inst.disableEdgesRendering === 'function') inst.disableEdgesRendering();
        });
        this.emphasized = [];

        this.hiddenMeshes.forEach((h) => {
            if(h.mesh) { h.mesh.isVisible = h.wasVisible; h.mesh.isPickable = h.wasPickable; }
        });
        this.hiddenMeshes = [];

        // Restore the camera.
        const cam = this.app.camera;
        const canvas = this.app.engine.getRenderingCanvas();
        if(this.savedCam) {
            cam.alpha = this.savedCam.alpha;
            cam.beta = this.savedCam.beta;
            cam.radius = this.savedCam.radius;
            if(cam.setTarget) cam.setTarget(this.savedCam.target);
            cam.lockedTarget = this.savedCam.lockedTarget;
        }
        cam.attachControl(canvas, true);

        this.pendingSource = null;
        this.nodes = [];
    }

    // Per-frame: ease the camera toward the overhead pose.
    update() {
        if(!this.active || !this.pose) return;
        const cam = this.app.camera;
        const t = 0.16;
        const lerp = (a, b) => a + (b - a) * t;
        // Move the orbit target FIRST: on an ArcRotateCamera setTarget recomputes
        // alpha/beta/radius to keep the camera in place, so the spherical angles
        // below must be applied AFTER it or they'd be immediately overwritten.
        if(cam.target) cam.setTarget(BABYLON.Vector3.Lerp(cam.target, this.pose.center, t));
        // Take the shortest angular path for alpha so it never spins the long way.
        let da = this.pose.alpha - cam.alpha;
        while(da > Math.PI) da -= Math.PI * 2;
        while(da < -Math.PI) da += Math.PI * 2;
        cam.alpha = cam.alpha + da * t;
        cam.beta = lerp(cam.beta, this.pose.beta);
        cam.radius = lerp(cam.radius, this.pose.radius);
    }

    // ---- interaction -----------------------------------------------------
    // Handle a pick on an interactive instance (also callable directly by tests).
    handlePick(inst) {
        if(!inst || !inst.script) return;
        const outs = inst.script.outputs || [];
        const ins = inst.script.inputs || [];

        // First click: choose a source (needs outputs).
        if(!this.pendingSource) {
            if(outs.length === 0) {
                this.app.toasty('That object has no outputs — start from a trigger.');
                return;
            }
            this.pendingSource = inst;
            this.pendingEventIdx = 0;
            this._refreshEmphasis();
            this._updateHint();
            return;
        }

        // Click the same source again: cycle its output event, then deselect.
        if(inst === this.pendingSource) {
            const srcOuts = inst.script.outputs || [];
            this.pendingEventIdx += 1;
            if(this.pendingEventIdx >= srcOuts.length) {
                this.pendingSource = null;
                this.pendingEventIdx = 0;
            }
            this._refreshEmphasis();
            this._updateHint();
            return;
        }

        // Second click: the target (needs inputs).
        if(ins.length === 0) {
            this.app.toasty('That object has no inputs to wire into.');
            return;
        }
        const src = this.pendingSource;
        const event = src.script.outputs[this.pendingEventIdx].id;
        const toWo = inst.worldObject.name;
        const toId = inst.worldId;
        const existing = (src.wires || []).find((w) =>
            w.event === event && w.toWo === toWo && w.toId == toId);

        if(!existing) {
            this.app.addWire(src, event, toWo, toId, ins[0].id);
            this.app.toasty(this._prettyOut(src, event) + '  ➜  ' + this._prettyIn(inst, ins[0].id));
        } else {
            // Cycle the action; past the last input, remove the wire.
            const ids = ins.map((i) => i.id);
            let ai = ids.indexOf(existing.action) + 1;
            if(ai >= ids.length) {
                this.app.removeWire(src, event, toWo, toId, existing.action);
                this.app.toasty('Removed wire');
            } else {
                existing.action = ids[ai];
                this.app.toasty('Action: ' + this._prettyIn(inst, ids[ai]));
            }
        }
        this.rebuild();
    }

    // ---- rebuild ---------------------------------------------------------
    // Rebuild wire meshes and label text from the current wiring.
    rebuild() {
        this._disposeWireMeshes();
        this.nodes.forEach((src) => {
            if(!src.wires) return;
            src.wires.forEach((w) => {
                const dst = this.app.findInstance(w.toWo, w.toId);
                if(dst) this._buildWireMesh(src, dst, w);
            });
        });
        this._refreshLabels();
        this._refreshEmphasis();
    }

    // ---- scene management ------------------------------------------------
    _hideNonInteractive() {
        const keep = new Set();
        this.nodes.forEach((inst) => {
            keep.add(inst);
            inst.getChildMeshes && inst.getChildMeshes().forEach((m) => keep.add(m));
        });

        this.app.BuildableObjectList.forEach((wo) => {
            const isTerrain = wo.name.indexOf('t_') === 0;   // floor/ground stays for orientation
            if(isTerrain) return;
            wo.instances.forEach((inst) => {
                if(!inst || keep.has(inst)) return;
                const meshes = [inst].concat(inst.getChildMeshes ? inst.getChildMeshes() : []);
                meshes.forEach((m) => {
                    if(keep.has(m)) return;
                    this.hiddenMeshes.push({ mesh: m, wasVisible: m.isVisible, wasPickable: m.isPickable });
                    m.isVisible = false;
                    m.isPickable = false;
                });
            });
        });

        // Hide build-mode helper meshes (cursor, selection box) so only the
        // active objects and their wires are shown.
        ['meshCursor', 'meshSelection'].forEach((nm) => {
            const m = this.scene.getMeshByName(nm);
            if(m && m.isVisible) {
                this.hiddenMeshes.push({ mesh: m, wasVisible: m.isVisible, wasPickable: m.isPickable });
                m.isVisible = false;
                m.isPickable = false;
            }
        });

        // Make the interactive objects clearly pickable and outlined.
        this.nodes.forEach((inst) => {
            inst.isVisible = true;
            inst.isPickable = true;
            if(inst.visibility != null) inst.visibility = 1;
        });
    }

    _refreshEmphasis() {
        this.emphasized.forEach((inst) => {
            if(inst && typeof inst.disableEdgesRendering === 'function') inst.disableEdgesRendering();
        });
        this.emphasized = [];
        this.nodes.forEach((inst) => {
            if(typeof inst.enableEdgesRendering !== 'function') return;
            inst.enableEdgesRendering();
            inst.edgesWidth = 6.0;
            let c;
            if(inst === this.pendingSource) c = new BABYLON.Color4(1, 1, 1, 1);            // active source
            else if(inst.script.outputs && inst.script.outputs.length) c = new BABYLON.Color4(0.3, 0.9, 1, 1); // trigger
            else c = new BABYLON.Color4(0.75, 0.4, 1, 1);                                  // spawner / input
            inst.edgesColor = c;
            this.emphasized.push(inst);
        });
    }

    // ---- wire meshes -----------------------------------------------------
    _wireMaterial(event) {
        const name = 'wireMat_' + event;
        let m = this.scene.getMaterialByName(name);
        if(m) return m;
        m = new BABYLON.StandardMaterial(name, this.scene);
        let col;
        if(event === 'entered') col = new BABYLON.Color3(0.25, 1.0, 0.55);
        else if(event === 'exited') col = new BABYLON.Color3(1.0, 0.55, 0.2);
        else col = new BABYLON.Color3(0.35, 0.85, 1.0);
        m.emissiveColor = col;
        m.diffuseColor = col.scale(0.4);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        return m;
    }

    _buildWireMesh(src, dst, wire) {
        const a = src.getAbsolutePosition ? src.getAbsolutePosition() : src.position;
        const b = dst.getAbsolutePosition ? dst.getAbsolutePosition() : dst.position;
        const y = Math.max(a.y, b.y) + 0.25;
        const dx = b.x - a.x, dz = b.z - a.z;
        const len = Math.max(0.1, Math.hypot(dx, dz));
        const mat = this._wireMaterial(wire.event);

        const line = BABYLON.MeshBuilder.CreateBox('wireLine', { width: len, height: 0.06, depth: 0.18 }, this.scene);
        line.position = new BABYLON.Vector3((a.x + b.x) / 2, y, (a.z + b.z) / 2);
        line.rotation = new BABYLON.Vector3(0, -Math.atan2(dz, dx), 0);
        line.material = mat;
        line.isPickable = false;
        this.wireMeshes.push(line);

        // Arrowhead near the target end, pointing from source to target.
        const head = BABYLON.MeshBuilder.CreateCylinder('wireHead',
            { diameterTop: 0, diameterBottom: 0.55, height: 0.75, tessellation: 12 }, this.scene);
        const hp = new BABYLON.Vector3(a.x + dx * 0.8, y, a.z + dz * 0.8);
        head.position = hp;
        head.lookAt(new BABYLON.Vector3(b.x, y, b.z));                 // +Z toward target
        head.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL); // cone axis (+Y) -> +Z
        head.material = mat;
        head.isPickable = false;
        this.wireMeshes.push(head);
    }

    _disposeWireMeshes() {
        this.wireMeshes.forEach((m) => m.dispose());
        this.wireMeshes = [];
    }

    // ---- GUI -------------------------------------------------------------
    _buildChrome() {
        const gui = this.app.gui;
        const A = BABYLON.GUI.Control;

        const title = new BABYLON.GUI.TextBlock('wiringTitle', 'WIRING  ·  connect triggers to spawners');
        title.color = '#8fe9ff';
        title.fontSize = 20;
        title.fontFamily = 'Segoe UI, Arial';
        title.height = '34px';
        title.top = '18px';
        title.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        title.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        gui.addControl(title);
        this.chrome.push(title);

        const hint = new BABYLON.GUI.TextBlock('wiringHint', '');
        hint.color = '#dbe7f3';
        hint.fontSize = 16;
        hint.fontFamily = 'Segoe UI, Arial';
        hint.height = '28px';
        hint.top = '-24px';
        hint.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        hint.verticalAlignment = A.VERTICAL_ALIGNMENT_BOTTOM;
        gui.addControl(hint);
        this.chrome.push(hint);
        this.hintText = hint;

        const back = BABYLON.GUI.Button.CreateSimpleButton('wiringBack', '✕  Done (Esc)');
        back.width = '150px';
        back.height = '36px';
        back.top = '16px';
        back.left = '-16px';
        back.color = '#ffffff';
        back.background = 'rgba(20,28,44,0.85)';
        back.cornerRadius = 8;
        back.thickness = 1;
        back.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_RIGHT;
        back.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        back.onPointerUpObservable.add(() => { this.app.triggerMenuItem(MENU_WIRING, 0); });
        gui.addControl(back);
        this.chrome.push(back);

        this._updateHint();
    }

    _updateHint() {
        if(!this.hintText) return;
        if(this.pendingSource) {
            const event = this.pendingSource.script.outputs[this.pendingEventIdx].id;
            this.hintText.text = 'From ' + this._prettyOut(this.pendingSource, event) +
                ' — click a spawner to connect  ·  click the source again to change event';
        } else {
            this.hintText.text = 'Click a trigger to start a wire, then click a spawner to connect it';
        }
    }

    _buildLabels() {
        const gui = this.app.gui;
        const A = BABYLON.GUI.Control;
        this.nodes.forEach((inst) => {
            const rect = new BABYLON.GUI.Rectangle('wireLabel_' + inst.worldId);
            rect.adaptWidthToChildren = true;
            rect.height = '26px';
            rect.cornerRadius = 6;
            rect.thickness = 1;
            rect.paddingLeft = '8px';
            rect.paddingRight = '8px';
            rect.background = 'rgba(10,16,28,0.82)';

            const txt = new BABYLON.GUI.TextBlock();
            txt.text = this.app.prettyName(inst.worldObject.name);
            txt.color = '#eaf3ff';
            txt.fontSize = 14;
            txt.resizeToFit = true;
            txt.paddingLeft = '6px';
            txt.paddingRight = '6px';
            rect.addControl(txt);

            gui.addControl(rect);
            rect.linkWithMesh(inst);
            rect.linkOffsetY = -46;

            rect._wireText = txt;
            this.labels.push(rect);
            inst._wireLabel = rect;
        });
        this._refreshLabels();
    }

    _refreshLabels() {
        this.labels.forEach((rect) => {
            const inst = this.nodes.find((n) => n._wireLabel === rect);
            if(!inst) return;
            const outCount = (inst.wires || []).length;
            let inCount = 0;
            this.nodes.forEach((src) => (src.wires || []).forEach((w) => {
                if(w.toWo === inst.worldObject.name && w.toId == inst.worldId) inCount += 1;
            }));
            const bits = [];
            if(inst.script.outputs && inst.script.outputs.length) bits.push('▸' + outCount);
            if(inst.script.inputs && inst.script.inputs.length) bits.push('◂' + inCount);
            rect._wireText.text = this.app.prettyName(inst.worldObject.name) +
                (bits.length ? '   ' + bits.join(' ') : '');

            if(inst === this.pendingSource) {
                rect.background = 'rgba(60,90,120,0.95)';
                rect.color = '#ffffff';
            } else {
                rect.background = 'rgba(10,16,28,0.82)';
                rect.color = (inst.script.outputs && inst.script.outputs.length) ? '#39c6ff' : '#c48bff';
            }
        });
    }

    // ---- helpers ---------------------------------------------------------
    _instanceFromMesh(mesh) {
        let n = mesh;
        while(n) {
            if(n.worldObject && n.script &&
               ((n.script.outputs && n.script.outputs.length) ||
                (n.script.inputs && n.script.inputs.length))) {
                return n;
            }
            n = n.parent;
        }
        return null;
    }

    _computeBounds() {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, sumY = 0, n = 0;
        this.nodes.forEach((inst) => {
            const p = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
            sumY += p.y; n += 1;
        });
        if(n === 0) return { center: BABYLON.Vector3.Zero(), extent: 12 };
        const center = new BABYLON.Vector3((minX + maxX) / 2, sumY / n, (minZ + maxZ) / 2);
        const extent = Math.max(maxX - minX, maxZ - minZ, 6);
        return { center: center, extent: extent };
    }

    _prettyOut(inst, eventId) {
        const def = (inst.script.outputs || []).find((o) => o.id === eventId);
        return this.app.prettyName(inst.worldObject.name) + ' · ' + (def ? def.label : eventId);
    }

    _prettyIn(inst, actionId) {
        const def = (inst.script.inputs || []).find((i) => i.id === actionId);
        return this.app.prettyName(inst.worldObject.name) + ' · ' + (def ? def.label : actionId);
    }
}
