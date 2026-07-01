// SpawnerScript
// -------------
// Turns a placed object into an enemy spawner. In play mode it spawns enemies of
// the configured type at the configured frequency, up to a live limit. All three
// are editable per-instance via the object parameters popup (paramDefs below)
// and persist with the world.
class SpawnerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isSpawner = true;

        // Editable parameters (the object parameters popup renders these).
        this.paramDefs = [
            { key: 'enemyType', label: 'Enemy',     type: 'enum',   options: ['walker', 'flyer', 'blob'], default: 'walker' },
            { key: 'frequency', label: 'Every',     type: 'number', options: [1, 2, 3, 5, 8, 12],          default: 3, unit: 's' },
            { key: 'limit',     label: 'Max alive', type: 'number', options: [1, 2, 3, 5, 8],              default: 3 },
        ];
        this.eventDefs = [];

        this._acc = 0;         // seconds accumulated toward the next spawn
        this._alive = [];      // handles for enemies this spawner has spawned
    }

    createMaterial() {
        const m = new BABYLON.StandardMaterial('spawnerMat', this.app.scene);
        m.diffuseColor = new BABYLON.Color3(0.35, 0.10, 0.55);
        m.emissiveColor = new BABYLON.Color3(0.55, 0.15, 0.85);
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        m.alpha = 0.9;
        return m;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    // Count (and prune) the enemies this spawner has spawned that are still alive.
    countAlive(mode) {
        const em = mode.enemyManager;
        this._alive = this._alive.filter((h) => {
            if (h.type === 'em') return em && em.enemies.indexOf(h.rec) >= 0;
            return h.wo && h.wo.instances.indexOf(h.inst) >= 0;
        });
        return this._alive.length;
    }

    update(isPlayMode, mode) {
        if (!isPlayMode || !mode || !mode.enemyManager) return;

        const limit = this.getParam('limit');
        if (this.countAlive(mode) >= limit) { this._acc = 0; return; }

        const dt = Math.min(0.1, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._acc += dt;
        if (this._acc >= this.getParam('frequency')) {
            this._acc = 0;
            this.spawnOne(mode);
        }
    }

    spawnOne(mode) {
        const pos = this.inst.getAbsolutePosition
            ? this.inst.getAbsolutePosition() : this.inst.position.clone();
        const type = this.getParam('enemyType');
        if (type === 'blob') {
            const wo = this.app.findWorldObject('en_blob');
            if (wo) {
                const e = wo.createInstance();
                e.position = pos.add(new BABYLON.Vector3(0, 1, 0));
                this._alive.push({ type: 'blob', inst: e, wo: wo });
            }
        } else {
            const rec = mode.enemyManager.spawnAt(type, pos);   // 'walker' or 'flyer'
            if (rec) this._alive.push({ type: 'em', rec: rec });
        }
    }
}
