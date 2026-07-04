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
            { key: 'enemyType',   label: 'Enemy',     type: 'enum',   options: ['walker', 'flyer', 'blob'], default: 'walker' },
            { key: 'frequency',   label: 'Every',     type: 'number', options: [1, 2, 3, 5, 8, 12],          default: 3, unit: 's' },
            { key: 'limit',       label: 'Max alive', type: 'number', options: [1, 2, 3, 5, 8],              default: 3 },
            { key: 'startActive', label: 'Start on',  type: 'enum',   options: ['yes', 'no'],                default: 'yes' },
            { key: 'wave',        label: 'Wave total',type: 'number', options: [0, 3, 5, 8, 12],             default: 0 },
        ];
        this.eventDefs = [];

        // `cleared` fires ONCE when a finite wave (wave > 0) has spawned its
        // whole quota AND every spawned enemy is defeated -- the "clear the
        // room" dungeon primitive. Wire it to a door/counter/camera.
        this.outputs = [
            { id: 'cleared', label: 'Wave Cleared' },
        ];

        // Input actions other objects can wire into (shown in the wiring view).
        // A trigger's 'entered' event wired to 'spawn' spawns one enemy on
        // entry; wired to 'enable' turns the timed spawner on, etc.
        this.inputs = [
            { id: 'spawn',   label: 'Spawn One' },
            { id: 'enable',  label: 'Turn On' },
            { id: 'disable', label: 'Turn Off' },
            { id: 'toggle',  label: 'Toggle' },
        ];

        this._acc = 0;              // seconds accumulated toward the next spawn
        this._alive = [];           // handles for enemies this spawner has spawned
        this._active = null;        // timed spawning on/off (init from startActive)
        this._spawnRequested = 0;   // one-shot spawns requested via the 'spawn' input
        this._totalSpawned = 0;     // lifetime spawns this run (for the wave quota)
        this._clearedFired = false; // `cleared` is a one-shot edge per run
    }

    // Player death resets the run: the spawner re-arms from its start state.
    // (The enemies it spawned are cleared separately by EnemyManager.reset.)
    onPlayReset(mode) {
        this._acc = 0;
        this._spawnRequested = 0;
        this._active = (this.getParam('startActive') !== 'no');
        this._alive = [];
        this._totalSpawned = 0;
        this._clearedFired = false;
    }

    // Handle a wired input action fired by another object (e.g. a trigger).
    onInput(action, from) {
        switch(action) {
        case 'spawn':   this._spawnRequested += 1; break;
        case 'enable':  this._active = true;  break;
        case 'disable': this._active = false; break;
        case 'toggle':  this._active = !this._active; break;
        }
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

        // Lazily initialise the on/off state from the startActive parameter.
        if (this._active === null) this._active = (this.getParam('startActive') !== 'no');

        const limit = this.getParam('limit');
        const alive = this.countAlive(mode);

        // One-shot spawns requested by a wired 'spawn' input fire immediately,
        // regardless of the timed on/off state, but still respect the limit.
        while (this._spawnRequested > 0 && this.countAlive(mode) < limit) {
            this._spawnRequested -= 1;
            this.spawnOne(mode);
        }
        this._spawnRequested = 0;

        // A finite wave stops spawning once its quota is met, and fires
        // `cleared` when the last of them falls (the room is clear).
        const wave = this.getParam('wave') || 0;
        if (wave > 0) {
            if (this._totalSpawned >= wave) {
                this._acc = 0;
                if (this.countAlive(mode) === 0 && !this._clearedFired) {
                    this._clearedFired = true;
                    this.app.fireEvent(this.inst, 'cleared');
                }
                return;
            }
        }

        // Timed spawning only runs while active.
        if (!this._active) { this._acc = 0; return; }
        if (alive >= limit) { this._acc = 0; return; }

        const dt = Math.min(0.1, this.app.scene.getEngine().getDeltaTime() / 1000);
        this._acc += dt;
        if (this._acc >= this.getParam('frequency')) {
            this._acc = 0;
            this.spawnOne(mode);
        }
    }

    spawnOne(mode) {
        this._totalSpawned += 1;
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
