// ThumbnailRenderer
// -----------------
// Generates a small preview image for a WorldObject's template mesh at runtime
// by rendering just that mesh (in isolation) to an offscreen render target and
// capturing the pixels as a PNG data URL. The data URL can be fed straight into
// a Babylon GUI Image control for the object-browser bar.
//
// The render is isolated from the live scene: only the cloned template mesh is
// in the render target's render list, and the lights we add are restricted to
// that clone via includedOnlyMeshes, so baking a thumbnail never disturbs what
// the player sees.
class ThumbnailRenderer {
    constructor(app, size = 112) {
        // A high layer-mask bit the main camera (default mask 0x0FFFFFFF) ignores.
        this.app = app;
        this.scene = app.scene;
        this.size = size;
    }

    // Returns Promise<string|null> — a PNG data URL, or null on failure.
    async generate(templateMesh) {
        const scene = this.scene;
        const size = this.size;
        if (!templateMesh) return null;

        let clone = null, cam = null, key = null, fill = null, rtt = null;
        try {
            clone = templateMesh.clone('thumbClone');
            if (!clone) return null;
            clone.setEnabled(true);

            const all = [clone].concat(clone.getChildMeshes());
            // Put the clone on a private layer the main camera ignores, so it is
            // only ever drawn into our thumbnail render target and never flickers
            // into the live view while baking.
            all.forEach((m) => {
                m.isVisible = true;
                if (m.setEnabled) m.setEnabled(true);
                m.layerMask = ThumbnailRenderer.LAYER;
            });
            const meshes = all.filter((m) => m.getTotalVertices && m.getTotalVertices() > 0);
            if (meshes.length === 0) return null;

            // Frame the whole model from its combined world-space bounds.
            let min = null, max = null;
            meshes.forEach((m) => {
                m.computeWorldMatrix(true);
                const bb = m.getBoundingInfo().boundingBox;
                if (!min) { min = bb.minimumWorld.clone(); max = bb.maximumWorld.clone(); }
                else {
                    min = BABYLON.Vector3.Minimize(min, bb.minimumWorld);
                    max = BABYLON.Vector3.Maximize(max, bb.maximumWorld);
                }
            });
            const center = min.add(max).scale(0.5);
            const radius = Math.max(max.subtract(min).length() * 0.5, 0.001);

            rtt = new BABYLON.RenderTargetTexture('thumbRTT', size, scene, false);
            rtt.clearColor = new BABYLON.Color4(0, 0, 0, 0);   // transparent background
            rtt.renderList = meshes;

            // A 3/4 "hero" angle, framed to fit.
            cam = new BABYLON.ArcRotateCamera('thumbCam', -Math.PI / 4, 1.12, radius * 2.5, center, scene);
            cam.minZ = 0.001;
            cam.maxZ = radius * 50;
            cam.layerMask = ThumbnailRenderer.LAYER;   // only this camera sees the clone
            rtt.activeCamera = cam;

            // Lights restricted to the clone so the live scene is untouched.
            key = new BABYLON.DirectionalLight('thumbKey', new BABYLON.Vector3(-0.5, -1, -0.8), scene);
            key.intensity = 1.3;
            key.includedOnlyMeshes = meshes;
            fill = new BABYLON.HemisphericLight('thumbFill', new BABYLON.Vector3(0.3, 1, 0.2), scene);
            fill.intensity = 0.75;
            fill.includedOnlyMeshes = meshes;

            // Let the running render loop draw the target a couple of frames, then
            // read it back.
            scene.customRenderTargets.push(rtt);
            await this._waitFrames(2);
            const data = await rtt.readPixels();
            return this._toDataURL(data, size);
        } catch (e) {
            console.error('ThumbnailRenderer.generate failed:', e);
            return null;
        } finally {
            if (rtt) {
                const idx = scene.customRenderTargets.indexOf(rtt);
                if (idx >= 0) scene.customRenderTargets.splice(idx, 1);
                rtt.dispose();
            }
            if (cam) cam.dispose();
            if (key) key.dispose();
            if (fill) fill.dispose();
            if (clone) clone.dispose(false, true);
        }
    }

    _waitFrames(n) {
        return new Promise((resolve) => {
            let c = 0;
            const tick = () => { c += 1; (c >= n) ? resolve() : requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
        });
    }

    _toDataURL(data, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(size, size);
        // readPixels returns rows bottom-to-top; flip vertically into the canvas.
        for (let y = 0; y < size; y++) {
            const s = (size - 1 - y) * size * 4;
            const d = y * size * 4;
            for (let x = 0; x < size * 4; x++) img.data[d + x] = data[s + x];
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL('image/png');
    }
}

// Private render layer for thumbnail clones (bit 28, outside the main camera's
// default 0x0FFFFFFF mask).
ThumbnailRenderer.LAYER = 0x10000000;
