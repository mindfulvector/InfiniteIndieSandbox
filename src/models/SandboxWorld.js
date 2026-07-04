class SandboxWorld {
    constructor(app) {
        this.app = app;
    }

    // Compact world snapshot: the same structure the save slots store, also
    // wrapped by App.exportWorld for shareable world files.
    serialize() {
        let saveData = {
            'objects': [],
        }
        this.app.BuildableObjectList.forEach((woObject) => {
            saveData.objects = saveData.objects.concat(woObject.getAllInstanceData());
        });
        return saveData;
    }

    saveToSlot(slot) {
        console.log('[saveToSlot] :slot', slot);

        const saveData = this.serialize();

        console.log('[saveToSlot] :saveData', saveData);
        const jsonData = JSON.stringify(saveData);

        console.log('[saveToSlot] :json', jsonData);

        window.localStorage.setItem('saveSlot_'+slot, jsonData);

        console.log('[saveToSlot] :objects.count', saveData.objects.length);

        return saveData.objects.length;
    }

    // Named world saves: the player-facing replacement for numbered slots
    // (numbered slots remain for character PROGRESSION; worlds get names).
    saveNamed(name) {
        const saveData = this.serialize();
        window.localStorage.setItem('iis_world_' + name, JSON.stringify(saveData));
        return saveData.objects.length;
    }

    loadNamed(name) {
        let saveData = null;
        try { saveData = JSON.parse(window.localStorage.getItem('iis_world_' + name)); }
        catch (e) { return false; }
        if (!saveData) return false;
        return this.loadFromData(saveData);
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
        return this.loadFromData(saveData);
    }

    // Rebuild the world from snapshot data (shared by slot loads and world-
    // file imports). Unknown object types are skipped with a warning so a
    // file from a newer game degrades instead of failing.
    loadFromData(saveData) {
        const app = this.app;
        this.clearWorld();
        let loadedObjectCount = 0;

        (saveData.objects || []).forEach((instData) => {
            const woObject = app.findWorldObject(instData.wo);
            if(woObject) {
                const inst = woObject.createInstance(instData);
                if(inst != null) loadedObjectCount++;
            } else {
                console.warn('[loadFromData] unknown object type `'+instData.wo+'`, skipping');
            }
        });

        console.log('[loadFromData] :loadedObjectCount', loadedObjectCount);

        // Only synthesise a terrain tile when the save was completely empty, so
        // a normal world is restored exactly as saved (no duplicate origin cube).
        if(loadedObjectCount === 0) {
            console.log('[loadFromData] :empty world, building default terrain grid');
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
        this.app.currentWorldFile = null;   // fresh templates are sandbox worlds
        switch(kind) {
        case 'flat':    return this.buildFlatTemplate();
        case 'arena':   return this.buildArenaTemplate();
        case 'islands': return this.buildIslandsTemplate();
        case 'hub':     return this.buildHubTemplate();
        case 'rolling':
        default:        return this.buildDefaultTerrain();
        }
    }

    // Place a (non-terrain) object instance with optional params (shared by
    // the hub builder). Wires are pushed onto the returned instance directly.
    _place(name, x, y, z, params, yaw) {
        const wo = this.app.findWorldObject(name);
        if(!wo) return null;
        const inst = wo.createInstance();
        inst.position = new BABYLON.Vector3(x, y, z);
        if(yaw) inst.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(yaw, 0, 0);
        if(params) Object.assign(inst.params, params);
        return inst;
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

    // The Sandbox Hub: a central plaza with four pre-wired challenge zones,
    // built entirely from the shipped toys so it doubles as a live tutorial.
    //   N — Combat Yard: entry trigger cues a camera cut and wakes a spawner
    //   E — Star Climb: 4 stars up a stair; counter -> scoreboard on all four
    //   S — The Crossing: a ping-pong moving platform over a gap, loot +
    //       a patrolling blob on the far ledge
    //   W — Homestead: a furnished room-kit house with a sliding door and a
    //       pocket-interior cell door
    buildHubTemplate(tileSize = 2.0) {
        const wo = this.app.findWorldObject('t_tile');
        if(!wo) return 0;
        let count = 0;
        const tile = (x, y, z) => { this._tileAt(wo, x, y, z); count++; };

        // Central plaza (8x8) + short bridges out to each zone.
        for(let gx = -3.5; gx <= 3.5; gx++) {
            for(let gz = -3.5; gz <= 3.5; gz++) tile(gx * tileSize, 0, gz * tileSize);
        }
        for(let i = 4.5; i <= 6.5; i++) {
            tile(0, 0, i * tileSize); tile(-1 * tileSize, 0, i * tileSize);     // north
            tile(i * tileSize, 0, 0); tile(i * tileSize, 0, -1 * tileSize);     // east
            tile(-i * tileSize, 0, 0); tile(-i * tileSize, 0, -1 * tileSize);   // west
        }

        // --- N: Combat Yard (walled 6x6 at z +14..+24) ---
        for(let gx = -3; gx <= 2; gx++) {
            for(let gz = 7; gz <= 12; gz++) {
                const x = gx * tileSize, z = gz * tileSize;
                tile(x, 0, z);
                const edge = (gx === -3 || gx === 2 || gz === 12) ||
                             (gz === 7 && gx !== 0 && gx !== -1);   // mouth at the bridge
                if(edge) tile(x, 1.0, z);
            }
        }
        const yardTrig = this._place('l_trigger', -1, 1.2, 13);
        const yardSpawner = this._place('l_spawner', -1, 0.7, 22,
            { enemyType: 'walker', frequency: 5, limit: 3, startActive: 'no' });
        const yardCam = this._place('l_camera', 4, 4.5, 15);
        if(yardTrig && yardSpawner && yardCam) {
            yardTrig.wires.push({ event: 'entered', toWo: 'l_spawner', toId: yardSpawner.worldId, action: 'spawn' });
            yardTrig.wires.push({ event: 'entered', toWo: 'l_camera',  toId: yardCam.worldId,     action: 'activate' });
        }

        // --- E: Star Climb (rising steps with a star on each) ---
        const steps = [
            { x: 15, y: 0.75, z: 0 }, { x: 18, y: 1.5, z: 1 },
            { x: 21, y: 2.25, z: 0 }, { x: 24, y: 3.0, z: -1 },
        ];
        const climbCounter = this._place('l_counter', 13, 1.0, -2, { threshold: 4, autoReset: 'no' });
        const hubBoard = this._place('l_scoreboard', 2, 1.3, 8, { target: 5 });
        steps.forEach((s) => {
            tile(s.x, s.y, s.z * tileSize);
            const star = this._place('pk_star', s.x, s.y + 1.0, s.z * tileSize);
            if(star && climbCounter) {
                star.wires.push({ event: 'collected', toWo: 'l_counter', toId: climbCounter.worldId, action: 'increment' });
            }
        });
        if(climbCounter && hubBoard) {
            climbCounter.wires.push({ event: 'reached', toWo: 'l_scoreboard', toId: hubBoard.worldId, action: 'add5' });
        }

        // --- S: The Crossing (a gap bridged only by a moving platform) ---
        for(let gx = -1; gx <= 0; gx++) {
            for(let gz = -12; gz <= -10; gz++) tile(gx * tileSize, 0, gz * tileSize);
        }
        const n1 = this._place('l_pathnode', -1, 1.0, -8);
        const n2 = this._place('l_pathnode', -1, 1.0, -14);
        const n3 = this._place('l_pathnode', -1, 1.0, -20);
        const ferry = this._place('pr_platform_moving', -1, 1.0, -8, { speed: 2, mode: 'pingpong' });
        if(n1 && n2 && n3 && ferry) {
            n1.wires.push({ event: 'next', toWo: 'l_pathnode', toId: n2.worldId, action: 'chain' });
            n2.wires.push({ event: 'next', toWo: 'l_pathnode', toId: n3.worldId, action: 'chain' });
            ferry.wires.push({ event: 'follow', toWo: 'l_pathnode', toId: n1.worldId, action: 'chain' });
        }
        this._place('pk_pixels', -1, 1.0, -22);
        this._place('pk_health', 1, 1.0, -22);
        const guardA = this._place('l_pathnode', -3, 1.0, -21);
        const guardB = this._place('l_pathnode', 3, 1.0, -21);
        const guard = this._place('en_blob', -3, 1.3, -21, { patrolSpeed: 1, patrolMode: 'pingpong' });
        if(guardA && guardB && guard) {
            guardA.wires.push({ event: 'next', toWo: 'l_pathnode', toId: guardB.worldId, action: 'chain' });
            guard.wires.push({ event: 'patrol', toWo: 'l_pathnode', toId: guardA.worldId, action: 'chain' });
        }

        // --- W: Homestead (room-kit house + sliding door + cell door) ---
        // Ground first: the west bridge ends at x -14, so the house needs its
        // own tiles (odd centers continue the bridge seamlessly: spans -14..-24).
        for(const hx of [-15, -17, -19, -21, -23]) {
            for(const hz of [2, 0, -2, -4]) tile(hx, 0, hz);
        }
        // Geometry facts the offsets below derive from: tile top 0.5;
        // in_floor (4x0.25x4) at y 0.55 -> top 0.675; walls (h 3) at y 2.0
        // -> bottom 0.5. The yaw-PI/2 mapping is world z = root.z - local x,
        // so the rotated door-wall group (local x -0.625..3.375, gap
        // 0.625..2.125) needs root z 0.375 to span the room's z -3..1 with
        // the gap at -1.75..-0.25, and the sliding door (local -0.075..1.425)
        // needs root z -0.325 to fill exactly that gap.
        this._place('in_floor', -20, 0.55, -1);
        this._place('in_wall', -20, 2.0, 1);                                // back wall
        this._place('in_wall_window', -21.375, 2.0, -3);                    // front, window (left-jamb root: spans x -22..-18)
        this._place('in_wall', -22, 2.0, -1, null, Math.PI / 2);            // west wall
        this._place('in_wall_door', -18, 2.0, 0.375, null, Math.PI / 2);    // east wall, doorway
        this._place('pr_door', -18, 2.0, -0.325, null, Math.PI / 2);
        // Furniture stands ON the floor (top 0.675): root y = 0.675 + the
        // distance from each prim's origin down to its lowest point.
        this._place('d_table', -20.6, 1.455, -0.2);   // legs reach -0.78
        this._place('d_chair', -20.6, 1.225, -1.4);   // legs reach -0.55
        this._place('d_lamp', -21.2, 0.705, 0.4);     // base reaches -0.03
        this._place('d_rug', -19.6, 0.7, -1.2);       // slab reaches -0.025
        const cellDoor = this._place('pr_door_cell', -21.3, 2.0, -0.2, null, Math.PI / 2);

        // --- "Tour the Park" quest: visit the yard, finish the climb, step
        // inside the homestead's pocket room. Three distinct sources -> 25 px.
        const tour = this._place('l_quest', 2, 1.4, 2, { steps: 3, reward: 25 });
        if(tour) {
            if(yardTrig) yardTrig.wires.push({ event: 'entered', toWo: 'l_quest', toId: tour.worldId, action: 'step' });
            if(climbCounter) climbCounter.wires.push({ event: 'reached', toWo: 'l_quest', toId: tour.worldId, action: 'step' });
            if(cellDoor) cellDoor.wires.push({ event: 'entered', toWo: 'l_quest', toId: tour.worldId, action: 'step' });
        }

        this.spawnPoint = new BABYLON.Vector3(0, 3, 0);
        return count;
    }

}