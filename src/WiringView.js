// WiringView
// ----------
// An in-world "wiring" editor. It smoothly lifts the camera to an overhead
// view of the play area, shows only the interactive objects (triggers,
// spawners, counters, ...), and draws the event wiring between them as slim
// 3D lines with arrowheads and a label naming what each wire carries
// ("Player Enters → Spawn One").
//
// Interaction:
//   - DRAG from a source object (one with outputs) to a target object (one
//     with inputs) to create a wire. If several event/action combinations are
//     possible, a chooser pops up to pick exactly what connects to what.
//   - CLICK a wire to delete it.
//   - A guide panel on the right explains the model and lists every object
//     type's outputs (events it fires) and inputs (actions it accepts).
class WiringView {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.active = false;

        this.nodes = [];         // interactive instances currently shown
        this.labels = [];        // GUI controls linked to nodes
        this.chrome = [];        // GUI controls for title / hint / back / guide
        this.wireMeshes = [];    // 3D line + arrowhead meshes
        this.wireLabels = [];    // GUI labels naming each wire
        this.hiddenMeshes = [];  // {mesh, wasVisible, wasPickable} restored on exit
        this.emphasized = [];    // instances with edge rendering toggled on

        this.drag = null;        // {src} while rubber-banding a new wire
        this.dragMesh = null;    // the rubber-band line
        this.pendingWire = null; // {src, dst, event} while the chooser is open
        this.chooserControls = [];

        this.pose = null;        // target overhead camera pose (lerped toward)
        this.savedCam = null;    // camera pose to restore on exit
        this.pointerObserver = null;
    }

    // ---- lifecycle -------------------------------------------------------
    enter() {
        if(this.active) return;
        this.active = true;
        this.drag = null;
        this.pendingWire = null;

        // A lingering toast sits exactly where the title goes -- clear it.
        if(this.app.hud && this.app.hud.toast) this.app.hud.toast.isVisible = false;

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

        // Drag-to-wire + click-to-delete.
        this.pointerObserver = this.scene.onPointerObservable.add((pi) => {
            if(pi.type === BABYLON.PointerEventTypes.POINTERDOWN) this._onPointerDown(pi);
            else if(pi.type === BABYLON.PointerEventTypes.POINTERMOVE) this._onPointerMove();
            else if(pi.type === BABYLON.PointerEventTypes.POINTERUP) this._onPointerUp();
        });
    }

    exit() {
        if(!this.active) return;
        this.active = false;

        if(this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }

        this._cancelDrag();
        this._closeChooser();
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

    // ---- pointer handling --------------------------------------------------
    _onPointerDown(pi) {
        const mesh = pi.pickInfo && pi.pickInfo.pickedMesh;
        // Clicking a wire deletes it.
        if(mesh && mesh._wire) {
            this.deleteWire(mesh._wire.src, mesh._wire.wire);
            return;
        }
        const inst = this._instanceFromMesh(mesh);
        if(inst) this.startWireDrag(inst);
    }

    _onPointerMove() {
        if(!this.drag) return;
        const pt = this._groundPoint();
        if(pt) this._updateDragMesh(pt);
    }

    _onPointerUp() {
        if(!this.drag) return;
        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY,
            (m) => !m._wire && m.isPickable && m.isVisible);
        const inst = this._instanceFromMesh(pick && pick.pickedMesh);
        this.endWireDrag(inst);
    }

    // World point under the pointer on the source's height plane.
    _groundPoint() {
        const src = this.drag && this.drag.src;
        const y = src ? src.getAbsolutePosition().y : 0;
        const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY,
            BABYLON.Matrix.Identity(), this.app.camera);
        if(Math.abs(ray.direction.y) < 1e-4) return null;
        const t = (y - ray.origin.y) / ray.direction.y;
        if(t <= 0) return null;
        return ray.origin.add(ray.direction.scale(t));
    }

    // ---- drag-to-wire -------------------------------------------------------
    startWireDrag(inst) {
        if(!inst || !inst.script) return;
        const outs = inst.script.outputs || [];
        if(outs.length === 0) {
            this.app.toasty(this.app.prettyName(inst.worldObject.name) +
                ' has no outputs — drag FROM a trigger/counter/timer/pickup.');
            return;
        }
        this._closeChooser();
        this.drag = { src: inst };
        this._refreshEmphasis();
        this._updateHint();
    }

    endWireDrag(targetInst) {
        const src = this.drag && this.drag.src;
        this._cancelDrag();
        if(!src || !targetInst || targetInst === src) { this._refreshEmphasis(); this._updateHint(); return; }
        const ins = targetInst.script ? (targetInst.script.inputs || []) : [];
        if(ins.length === 0) {
            this.app.toasty(this.app.prettyName(targetInst.worldObject.name) +
                ' has no inputs — drop the wire on a spawner/counter/timer/camera.');
            this._refreshEmphasis(); this._updateHint();
            return;
        }
        const outs = src.script.outputs || [];
        if(outs.length === 1 && ins.length === 1) {
            this.connectWire(src, outs[0].id, targetInst, ins[0].id);
        } else {
            // Several combinations are possible: let the player pick exactly
            // which event drives which action.
            this.pendingWire = { src: src, dst: targetInst, event: (outs.length === 1 ? outs[0].id : null) };
            this._openChooser();
        }
        this._refreshEmphasis();
        this._updateHint();
    }

    _cancelDrag() {
        this.drag = null;
        if(this.dragMesh) { this.dragMesh.dispose(false, true); this.dragMesh = null; }
    }

    _updateDragMesh(pt) {
        const src = this.drag.src.getAbsolutePosition();
        const y = Math.max(src.y, pt.y) + 0.3;
        const dx = pt.x - src.x, dz = pt.z - src.z;
        const len = Math.max(0.15, Math.hypot(dx, dz));
        if(!this.dragMesh) {
            this.dragMesh = BABYLON.MeshBuilder.CreateBox('wireDrag', { width: 1, height: 0.05, depth: 0.14 }, this.scene);
            const m = new BABYLON.StandardMaterial('wireDragMat', this.scene);
            m.emissiveColor = new BABYLON.Color3(1, 1, 1);
            m.disableLighting = true;
            m.alpha = 0.8;
            this.dragMesh.material = m;
            this.dragMesh.isPickable = false;
        }
        this.dragMesh.scaling.x = len;
        this.dragMesh.position.set((src.x + pt.x) / 2, y, (src.z + pt.z) / 2);
        this.dragMesh.rotation.y = -Math.atan2(dz, dx);
    }

    // Create the wire (used by drag completion and the chooser).
    connectWire(src, event, dst, action) {
        if(this.app.hasWire(src, event, dst.worldObject.name, dst.worldId, action)) {
            this.app.toasty('Already wired.');
            return;
        }
        this.app.addWire(src, event, dst.worldObject.name, dst.worldId, action);
        this.app.toasty(this._outLabel(src, event) + '  ➜  ' + this._inLabel(dst, action));
        this.rebuild();
    }

    deleteWire(src, wire) {
        this.app.removeWire(src, wire.event, wire.toWo, wire.toId, wire.action);
        this.app.toasty('Wire removed.');
        this.rebuild();
    }

    // ---- chooser popup ------------------------------------------------------
    // Open when a drag could mean several things; the player picks the output
    // event (if the source has several) then the input action (if the target
    // has several).
    _openChooser() {
        this._closeChooser(true);
        const pw = this.pendingWire;
        if(!pw) return;
        const A = BABYLON.GUI.Control;
        const gui = this.app.gui;

        const panel = new BABYLON.GUI.Rectangle('wireChooser');
        panel.width = '340px';
        panel.adaptHeightToChildren = true;
        panel.cornerRadius = 10;
        panel.thickness = 2;
        panel.color = '#8fe9ff';
        panel.background = 'rgba(10,16,28,0.96)';
        panel.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = A.VERTICAL_ALIGNMENT_CENTER;
        gui.addControl(panel);
        this.chooserControls.push(panel);

        const stack = new BABYLON.GUI.StackPanel();
        stack.paddingTop = '10px';
        stack.paddingBottom = '10px';
        panel.addControl(stack);

        const addText = (txt, color, size) => {
            const t = new BABYLON.GUI.TextBlock();
            t.text = txt;
            t.color = color || '#eaf3ff';
            t.fontSize = size || 15;
            t.height = '26px';
            t.textWrapping = true;
            stack.addControl(t);
            return t;
        };
        const addBtn = (txt, cb) => {
            const b = BABYLON.GUI.Button.CreateSimpleButton('wcBtn', txt);
            b.height = '32px';
            b.width = '300px';
            b.color = '#ffffff';
            b.background = 'rgba(36,58,92,0.8)';
            b.cornerRadius = 6;
            b.thickness = 1;
            b.paddingTop = '3px';
            b.onPointerUpObservable.add(cb);
            stack.addControl(b);
            return b;
        };

        addText('WIRE:  ' + this.app.prettyName(pw.src.worldObject.name) + '  ➜  ' +
            this.app.prettyName(pw.dst.worldObject.name), '#8fe9ff', 16);

        if(pw.event === null) {
            addText('When this happens...', '#9fb3c8', 13);
            (pw.src.script.outputs || []).forEach((o) => {
                addBtn(o.label || o.id, () => this.chooseOutput(o.id));
            });
        } else {
            addText('...do what?', '#9fb3c8', 13);
            (pw.dst.script.inputs || []).forEach((i) => {
                addBtn(i.label || i.id, () => this.chooseAction(i.id));
            });
        }
        addBtn('Cancel', () => this._closeChooser());
    }

    chooseOutput(eventId) {
        if(!this.pendingWire) return;
        this.pendingWire.event = eventId;
        const ins = this.pendingWire.dst.script.inputs || [];
        if(ins.length === 1) this.chooseAction(ins[0].id);
        else this._openChooser();   // re-render for the action step
    }

    chooseAction(actionId) {
        const pw = this.pendingWire;
        if(!pw || pw.event === null) return;
        this.connectWire(pw.src, pw.event, pw.dst, actionId);
        this._closeChooser();
    }

    _closeChooser(keepPending) {
        this.chooserControls.forEach((c) => c.dispose());
        this.chooserControls = [];
        if(!keepPending) this.pendingWire = null;
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
            if(this.drag && inst === this.drag.src) c = new BABYLON.Color4(1, 1, 1, 1);       // drag source
            else if(inst.script.outputs && inst.script.outputs.length) c = new BABYLON.Color4(0.3, 0.9, 1, 1); // source-capable
            else c = new BABYLON.Color4(0.75, 0.4, 1, 1);                                     // input-only
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
        if(event === 'entered' || event === 'collected') col = new BABYLON.Color3(0.25, 1.0, 0.55);
        else if(event === 'exited') col = new BABYLON.Color3(1.0, 0.55, 0.2);
        else if(event === 'reached' || event === 'finished') col = new BABYLON.Color3(1.0, 0.85, 0.25);
        else col = new BABYLON.Color3(0.35, 0.85, 1.0);
        m.emissiveColor = col;
        m.diffuseColor = col.scale(0.4);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        return m;
    }

    _outLabel(inst, eventId) {
        const def = (inst.script.outputs || []).find((o) => o.id === eventId);
        return def ? (def.label || def.id) : eventId;
    }

    _inLabel(inst, actionId) {
        const def = (inst.script.inputs || []).find((i) => i.id === actionId);
        return def ? (def.label || def.id) : actionId;
    }

    _buildWireMesh(src, dst, wire) {
        const a = src.getAbsolutePosition ? src.getAbsolutePosition() : src.position;
        const b = dst.getAbsolutePosition ? dst.getAbsolutePosition() : dst.position;
        const y = Math.max(a.y, b.y) + 0.25;
        const dx = b.x - a.x, dz = b.z - a.z;
        const len = Math.max(0.1, Math.hypot(dx, dz));
        const mat = this._wireMaterial(wire.event);

        const line = BABYLON.MeshBuilder.CreateBox('wireLine', { width: len, height: 0.06, depth: 0.22 }, this.scene);
        line.position = new BABYLON.Vector3((a.x + b.x) / 2, y, (a.z + b.z) / 2);
        line.rotation = new BABYLON.Vector3(0, -Math.atan2(dz, dx), 0);
        line.material = mat;
        line.isPickable = true;             // clickable: click a wire to delete it
        line._wire = { src: src, wire: wire };
        this.wireMeshes.push(line);

        // Arrowhead near the target end, pointing from source to target.
        const head = BABYLON.MeshBuilder.CreateCylinder('wireHead',
            { diameterTop: 0, diameterBottom: 0.55, height: 0.75, tessellation: 12 }, this.scene);
        const hp = new BABYLON.Vector3(a.x + dx * 0.8, y, a.z + dz * 0.8);
        head.position = hp;
        head.lookAt(new BABYLON.Vector3(b.x, y, b.z));                 // +Z toward target
        head.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL); // cone axis (+Y) -> +Z
        head.material = mat;
        head.isPickable = true;
        head._wire = { src: src, wire: wire };
        this.wireMeshes.push(head);

        // Label naming what the wire carries, at its midpoint.
        const dstInst = this.app.findInstance(wire.toWo, wire.toId);
        const rect = new BABYLON.GUI.Rectangle('wireTag');
        rect.adaptWidthToChildren = true;
        rect.height = '22px';
        rect.cornerRadius = 5;
        rect.thickness = 1;
        rect.color = 'rgba(255,255,255,0.25)';
        rect.background = 'rgba(8,12,22,0.85)';
        rect.isPointerBlocker = false;
        const txt = new BABYLON.GUI.TextBlock();
        txt.text = this._outLabel(src, wire.event) + ' → ' + (dstInst ? this._inLabel(dstInst, wire.action) : wire.action);
        txt.color = '#cfe9ff';
        txt.fontSize = 12;
        txt.resizeToFit = true;
        txt.paddingLeft = '8px';
        txt.paddingRight = '8px';
        rect.addControl(txt);
        this.app.gui.addControl(rect);
        rect.linkWithMesh(line);
        rect.linkOffsetY = -14;
        this.wireLabels.push(rect);
    }

    _disposeWireMeshes() {
        this.wireMeshes.forEach((m) => m.dispose());
        this.wireMeshes = [];
        this.wireLabels.forEach((c) => c.dispose());
        this.wireLabels = [];
    }

    // ---- GUI -------------------------------------------------------------
    _buildChrome() {
        const gui = this.app.gui;
        const A = BABYLON.GUI.Control;

        // Title in an opaque pill (nothing shows through behind it).
        const titleWrap = new BABYLON.GUI.Rectangle('wiringTitleWrap');
        titleWrap.adaptWidthToChildren = true;
        titleWrap.height = '38px';
        titleWrap.cornerRadius = 19;
        titleWrap.thickness = 1;
        titleWrap.color = '#8fe9ff';
        titleWrap.background = 'rgba(10,16,28,0.95)';
        titleWrap.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        titleWrap.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        titleWrap.top = '14px';
        gui.addControl(titleWrap);
        this.chrome.push(titleWrap);
        const title = new BABYLON.GUI.TextBlock('wiringTitle', 'WIRING');
        title.color = '#8fe9ff';
        title.fontSize = 18;
        title.fontStyle = 'bold';
        title.resizeToFit = true;
        title.paddingLeft = '20px';
        title.paddingRight = '20px';
        titleWrap.addControl(title);

        const hint = new BABYLON.GUI.TextBlock('wiringHint', '');
        hint.color = '#dbe7f3';
        hint.fontSize = 15;
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

        this._buildGuidePanel();
        this._updateHint();
    }

    // Right-side guide: how wiring works + each object type's ports.
    _buildGuidePanel() {
        const gui = this.app.gui;
        const A = BABYLON.GUI.Control;

        const panel = new BABYLON.GUI.Rectangle('wiringGuide');
        panel.width = '285px';
        panel.height = '78%';
        panel.cornerRadius = 10;
        panel.thickness = 1;
        panel.color = 'rgba(143,233,255,0.4)';
        panel.background = 'rgba(8,12,22,0.92)';
        panel.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = A.VERTICAL_ALIGNMENT_CENTER;
        panel.left = '-14px';
        gui.addControl(panel);
        this.chrome.push(panel);

        const scroll = new BABYLON.GUI.ScrollViewer('wiringGuideScroll');
        scroll.thickness = 0;
        scroll.barSize = 8;
        scroll.barColor = '#8fe9ff';
        panel.addControl(scroll);

        const stack = new BABYLON.GUI.StackPanel();
        stack.width = '250px';   // wraps inside the panel (leaves room for the bar)
        stack.paddingLeft = '10px';
        scroll.addControl(stack);

        const addText = (txt, color, size, bold) => {
            const t = new BABYLON.GUI.TextBlock();
            t.text = txt;
            t.color = color || '#c9d8ea';
            t.fontSize = size || 12.5;
            t.fontStyle = bold ? 'bold' : '';
            t.textWrapping = true;
            t.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
            t.resizeToFit = true;
            t.paddingTop = '4px';
            stack.addControl(t);
        };

        addText('HOW WIRING WORKS', '#8fe9ff', 15, true);
        addText('Objects fire EVENTS (outputs ▸) and accept ACTIONS (inputs ◂).');
        addText('• DRAG from a source object to a target object to add a wire. ' +
                'If several combinations fit, a chooser asks exactly which event ' +
                'drives which action.');
        addText('• CLICK a wire to delete it.');
        addText('• Each wire\'s label shows what it carries: "Player Enters → Spawn One".');
        addText('• Cyan outline = fires events. Violet = accepts actions only.');
        addText(' ');
        addText('OBJECTS IN THIS WORLD', '#8fe9ff', 14, true);

        // One entry per object TYPE present, listing its ports.
        const byType = new Map();
        this.nodes.forEach((inst) => {
            if(!byType.has(inst.worldObject.name)) byType.set(inst.worldObject.name, inst);
        });
        byType.forEach((inst, name) => {
            addText(this.app.prettyName(name), '#ffd76a', 13.5, true);
            const outs = (inst.script.outputs || []).map((o) => o.label || o.id);
            const ins = (inst.script.inputs || []).map((i) => i.label || i.id);
            if(outs.length) addText('▸ fires: ' + outs.join(',  '), '#7ef0b2');
            if(ins.length) addText('◂ accepts: ' + ins.join(',  '), '#c9a1ff');
        });
    }

    _updateHint() {
        if(!this.hintText) return;
        if(this.drag) {
            this.hintText.text = 'Release over a target object to connect ' +
                this.app.prettyName(this.drag.src.worldObject.name) + '\'s wire';
        } else {
            this.hintText.text = 'Drag between objects to wire them  ·  click a wire to delete it';
        }
    }

    _buildLabels() {
        const gui = this.app.gui;
        this.nodes.forEach((inst) => {
            const rect = new BABYLON.GUI.Rectangle('wireLabel_' + inst.worldId);
            rect.adaptWidthToChildren = true;
            rect.height = '26px';
            rect.cornerRadius = 6;
            rect.thickness = 1;
            rect.paddingLeft = '8px';
            rect.paddingRight = '8px';
            rect.background = 'rgba(10,16,28,0.82)';
            rect.isPointerBlocker = false;

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
            rect.color = (inst.script.outputs && inst.script.outputs.length) ? '#39c6ff' : '#c48bff';
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
}
