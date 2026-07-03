class SandboxWorld {
    constructor(app) {
        this.app = app;
    }

    saveToSlot(slot) {
        console.log('[saveToSlot] :slot', slot);

        let saveData = {
            'objects': [],
        }

        // get compact data for each world object instance
        this.app.BuildableObjectList.forEach((woObject) => {
            saveData.objects = saveData.objects.concat(woObject.getAllInstanceData());
        });

        console.log('[saveToSlot] :saveData', saveData);
        const jsonData = JSON.stringify(saveData);

        console.log('[saveToSlot] :json', jsonData);

        window.localStorage.setItem('saveSlot_'+slot, jsonData);

        console.log('[saveToSlot] :objects.count', saveData.objects.length);

        return saveData.objects.length;
    }

    loadFromSlot(slot) {
        const app = this.app;
        console.log('[loadFromSlot] :slot', slot);

        const jsonData = window.localStorage.getItem('saveSlot_'+slot);
        if(!jsonData) {
            return false;   // empty / missing slot
        }

        let saveData;
        try {
            saveData = JSON.parse(jsonData);
        } catch(e) {
            console.error('[loadFromSlot] could not parse slot '+slot, e);
            return false;
        }
        console.log('[loadFromSlot] :saveData', saveData);

        this.clearWorld();
        let loadedObjectCount = 0;

        (saveData.objects || []).forEach((instData) => {
            const woObject = app.findWorldObject(instData.wo);
            if(woObject) {
                const inst = woObject.createInstance(instData);
                if(inst != null) loadedObjectCount++;
            } else {
                console.warn('[loadFromSlot] unknown object type `'+instData.wo+'`, skipping');
            }
        });

        console.log('[loadFromSlot] :loadedObjectCount', loadedObjectCount);

        // Only synthesise a terrain tile when the save was completely empty, so
        // a normal world is restored exactly as saved (no duplicate origin cube).
        if(loadedObjectCount === 0) {
            console.log('[loadFromSlot] :empty world, building default terrain grid');
            this.buildDefaultTerrain();
        }

        return true;
    }

    clearWorld() {
        this.app.BuildableObjectList.forEach((woObject) => {
            woObject.disposeAllInstances();
        });
    }

    // Gentle, deterministic rolling height for the default terrain grid. A couple
    // of out-of-phase sine waves, lightly quantised to quarter-unit steps so tiles
    // sit at soft steps rather than a continuous slope. Range is roughly ±1 unit.
    terrainHeight(gx, gz) {
        const h = Math.sin(gx * 0.7) * 0.45
                + Math.cos(gz * 0.8) * 0.35
                + Math.sin((gx + gz) * 0.35) * 0.2;
        return Math.round(h * 4) / 4;
    }

    // Build the starting sandbox: a cols x rows grid of terrain tiles with softly
    // varying heights so the ground gently rolls instead of being a single flat
    // cube. Tiles are the lightweight `t_tile` primitive (2 x 1 x 2) rather than
    // the textured gltf terrain, because a full grid of the textured tiles crawls
    // under software rendering. Records a safe player spawn point on the world and
    // returns the number of tiles created.
    buildDefaultTerrain(cols = 10, rows = 10, tileSize = 2.0) {
        const app = this.app;
        const wo = app.findWorldObject('t_tile');
        if(!wo) return 0;
        const halfH = 0.5;   // the t_tile prim is 2 x 1 x 2, so half-height is 0.5

        let count = 0;
        let best = null;   // tile whose centre is nearest the origin (spawn over it)
        for(let gx = 0; gx < cols; gx++) {
            for(let gz = 0; gz < rows; gz++) {
                // Centre the whole grid on the origin.
                const x = (gx - (cols - 1) / 2) * tileSize;
                const z = (gz - (rows - 1) / 2) * tileSize;
                const y = this.terrainHeight(gx, gz);
                const tile = wo.createInstance();
                tile.position = new BABYLON.Vector3(x, y, z);
                // The prim tile is a single-mesh instance, so showAll() (which only
                // walks child meshes) doesn't flag it; enable collisions here so the
                // player walks on the terrain instead of falling through it.
                tile.checkCollisions = true;
                count += 1;

                const d2 = x * x + z * z;
                if(!best || d2 < best.d2) best = { d2: d2, x: x, z: z, top: y + halfH };
            }
        }

        // Spawn the player just above the tile nearest the origin so it lands
        // reliably on the rolling terrain instead of falling through a seam.
        if(best) this.spawnPoint = new BABYLON.Vector3(best.x, best.top + 2.5, best.z);
        return count;
    }

    // ---- starter-world templates -------------------------------------------
    // Pre-built worlds the player picks from at New Game and then customizes.
    // Each returns the number of tiles created and records a safe spawnPoint.

    buildTemplate(kind) {
        switch(kind) {
        case 'flat':    return this.buildFlatTemplate();
        case 'arena':   return this.buildArenaTemplate();
        case 'islands': return this.buildIslandsTemplate();
        case 'rolling':
        default:        return this.buildDefaultTerrain();
        }
    }

    // Place one terrain tile with collisions at a grid cell (shared helper).
    _tileAt(wo, x, y, z) {
        const tile = wo.createInstance();
        tile.position = new BABYLON.Vector3(x, y, z);
        // Single-mesh prim instances aren't flagged by showAll (it only walks
        // children), so enable collisions explicitly -- same as the default grid.
        tile.checkCollisions = true;
        return tile;
    }

    // A perfectly flat 10x10 plane -- the blank-canvas starter.
    buildFlatTemplate(cols = 10, rows = 10, tileSize = 2.0) {
        const wo = this.app.findWorldObject('t_tile');
        if(!wo) return 0;
        let count = 0;
        for(let gx = 0; gx < cols; gx++) {
            for(let gz = 0; gz < rows; gz++) {
                this._tileAt(wo,
                    (gx - (cols - 1) / 2) * tileSize, 0,
                    (gz - (rows - 1) / 2) * tileSize);
                count++;
            }
        }
        this.spawnPoint = new BABYLON.Vector3(0, 3, 0);
        return count;
    }

    // A flat 12x12 floor ringed by a raised wall of tiles -- ready for combat
    // arenas and brawler-style minigames.
    buildArenaTemplate(cols = 12, rows = 12, tileSize = 2.0) {
        const wo = this.app.findWorldObject('t_tile');
        if(!wo) return 0;
        let count = 0;
        for(let gx = 0; gx < cols; gx++) {
            for(let gz = 0; gz < rows; gz++) {
                const edge = (gx === 0 || gz === 0 || gx === cols - 1 || gz === rows - 1);
                const x = (gx - (cols - 1) / 2) * tileSize;
                const z = (gz - (rows - 1) / 2) * tileSize;
                this._tileAt(wo, x, 0, z);
                count++;
                if(edge) { this._tileAt(wo, x, 1.0, z); count++; }   // perimeter wall
            }
        }
        this.spawnPoint = new BABYLON.Vector3(0, 3, 0);
        return count;
    }

    // Several separate tile clusters at varying heights with gaps between them
    // -- a platforming starter.
    buildIslandsTemplate(tileSize = 2.0) {
        const wo = this.app.findWorldObject('t_tile');
        if(!wo) return 0;
        // {cx, cz (grid units), r (half-size in tiles), y}
        const islands = [
            { cx: 0,  cz: 0,  r: 2, y: 0    },
            { cx: 7,  cz: 1,  r: 1, y: 0.75 },
            { cx: 4,  cz: -6, r: 1, y: 1.5  },
            { cx: -6, cz: 5,  r: 1, y: 0.5  },
            { cx: -5, cz: -5, r: 1, y: 1.0  },
        ];
        let count = 0;
        islands.forEach((isl) => {
            for(let gx = -isl.r; gx <= isl.r; gx++) {
                for(let gz = -isl.r; gz <= isl.r; gz++) {
                    this._tileAt(wo, (isl.cx + gx) * tileSize, isl.y, (isl.cz + gz) * tileSize);
                    count++;
                }
            }
        });
        this.spawnPoint = new BABYLON.Vector3(0, 3, 0);   // over the central island
        return count;
    }

}