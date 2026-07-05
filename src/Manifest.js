// This class only exists to trigger asset loading for everything the game needs.
// Major additions of a large number of related items should probably have their
// plugin in the form of a <PluginName>Manifest.js class in the plugins dir.
class Manifest {
    constructor(app) {

        app.createWorldObject('al_wall',        Object.assign({}, Assets.meshes.wall_glb,           { colliderMeshes: ['wall'], surface: 'stone' }));
        app.createWorldObject('al_wallArch',    Object.assign({}, Assets.meshes.wallArch_glb,       { colliderMeshes: ['wallArch'], surface: 'stone' }));
        app.createWorldObject('al_wallCorner',  Object.assign({}, Assets.meshes.wallCorner_glb,     { colliderMeshes: ['wallCorner'], surface: 'stone' }));
        app.createWorldObject('al_rocks1',      Object.assign({}, Assets.meshes.rocks1_glb,         { colliderMeshes: ['rocks1'], surface: 'stone' }));
        const assetsBaseUrl     = './assets/';
        // Terrain snaps its TOP to the cursor (anchor:'below') so tiles of
        // different thicknesses (a thin floor panel, a full cube) share a seamless
        // top walking surface at the cursor height.
        app.createWorldObject('t_floor_1x1',    { rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_floor_1x1.gltf', anchor: 'below', surface: 'grass' });
        app.createWorldObject('t_cube_1x1',     { rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_cube_1x1.gltf', anchor: 'below', surface: 'grass' });

        // Lightweight terrain blocks: boxes wearing the REAL grass (top) and
        // dirt (sides) textures via one shared atlas material, so they stay
        // instancable and a full 10x10 grid remains cheap even under software
        // rendering. t_tile builds the default worlds; the t_block_* sizes are
        // smaller variations of the large gltf terrain cube for detail work.
        app.createWorldObject('t_tile',    { anchor: 'below', grassBlock: { s: [2, 1, 2] } });
        app.createWorldObject('t_block_4', { anchor: 'below', grassBlock: { s: [4, 4, 4] } });
        app.createWorldObject('t_block_2', { anchor: 'below', grassBlock: { s: [2, 2, 2] } });
        app.createWorldObject('t_block_1', { anchor: 'below', grassBlock: { s: [1, 1, 1] } });
        // Themed terrain: same instancable atlas trick, different climates.
        // The sound pack has real takes for these: sand crunches like dry
        // gravel and snow gets its own muffled steps (see SoundManager).
        app.createWorldObject('t_sand',   { anchor: 'below', grassBlock: { s: [2, 1, 2], theme: 'sand' }, surface: 'sand' });
        app.createWorldObject('t_sand_2', { anchor: 'below', grassBlock: { s: [2, 2, 2], theme: 'sand' }, surface: 'sand' });
        app.createWorldObject('t_snow',   { anchor: 'below', grassBlock: { s: [2, 1, 2], theme: 'snow' }, surface: 'snow' });
        app.createWorldObject('t_snow_2', { anchor: 'below', grassBlock: { s: [2, 2, 2], theme: 'snow' }, surface: 'snow' });
        app.createWorldObject('t_lava',   { anchor: 'below', grassBlock: { s: [2, 1, 2], theme: 'volcanic' }, surface: 'stone' });
        app.createWorldObject('t_lava_2', { anchor: 'below', grassBlock: { s: [2, 2, 2], theme: 'volcanic' }, surface: 'stone' });
        app.createWorldObject('t_toxic',  { anchor: 'below', grassBlock: { s: [2, 1, 2], theme: 'toxic' }, surface: 'stone' });
        app.createWorldObject('t_toxic_2',{ anchor: 'below', grassBlock: { s: [2, 2, 2], theme: 'toxic' }, surface: 'stone' });
        
        // A wirable sliding (pocket) door: two fixed jambs and a named 'panel'
        // child that DoorScript slides sideways on open/close. Total footprint
        // 1.5 wide x 3 tall -- exactly the gap in in_wall_door below.
        app.createWorldObject('pr_door', {
            prims: [
                     {ty: 'box',       s: [0.15, 3, 0.4],  p: [0, 0, 0],      tex: {id: 'wood', s: 120}},
                     {ty: 'box',       s: [0.15, 3, 0.4],  p: [1.35, 0, 0],   tex: {id: 'wood', s: 120}},
                     {ty: 'box',       s: [1.2, 3, 0.18],  p: [0.675, 0, 0],  tex: {id: 'wood', s: 60}, nm: 'panel'},
                  ]
        }, 'DoorScript');

        // A doorway into a pocket interior: walk into the glowing panel to
        // teleport into a small decorated room (theme param), step on the
        // exit pad to come back. Fires entered/exited wiring events.
        app.createWorldObject('pr_door_cell', {
            prims: [
                     {ty: 'box', s: [0.2, 3, 0.45],  p: [0, 0, 0],     tex: {id: 'brick', w: 1, h: 6}},
                     {ty: 'box', s: [0.2, 3, 0.45],  p: [1.6, 0, 0],   tex: {id: 'brick', w: 1, h: 6}},
                     {ty: 'box', s: [1.8, 0.3, 0.45], p: [0.8, 1.65, 0], tex: {id: 'brick', w: 4, h: 1}},
                     {ty: 'box', s: [1.4, 2.9, 0.12], p: [0.8, -0.05, 0], col: [0.45, 0.85, 1.0], tex: {id: 'cloud'}, nm: 'cellglow'},
                  ]
        }, 'CellDoorScript');

        // ---- Interior building kit (in_*) ----------------------------------
        // Room walls with a shared 4 x 3 footprint so they tile edge-to-edge.
        // Multi-prim: the first prim is the root at p [0,0,0], later prims are
        // children offset by p. The doorway gap (1.5 x 2.25) fits pr_door.
        app.createWorldObject('in_wall', {
            prims: [
                     {ty: 'box', s: [4, 3, 0.3], p: [0, 0, 0], tex: {id: 'brick', w: 8, h: 5}},
                  ]
        });
        app.createWorldObject('in_wall_door', {
            prims: [
                     {ty: 'box', s: [1.25, 3, 0.3],    p: [0, 0, 0],         tex: {id: 'brick', w: 3, h: 5}},
                     {ty: 'box', s: [1.25, 3, 0.3],    p: [2.75, 0, 0],      tex: {id: 'brick', w: 3, h: 5}},
                     {ty: 'box', s: [1.5, 0.75, 0.3],  p: [1.375, 1.125, 0], tex: {id: 'brick', w: 4, h: 2}},
                  ]
        });
        app.createWorldObject('in_wall_window', {
            prims: [
                     {ty: 'box', s: [1.25, 3, 0.3],    p: [0, 0, 0],         tex: {id: 'brick', w: 3, h: 5}},
                     {ty: 'box', s: [1.25, 3, 0.3],    p: [2.75, 0, 0],      tex: {id: 'brick', w: 3, h: 5}},
                     {ty: 'box', s: [1.5, 0.9, 0.3],   p: [1.375, -1.05, 0], tex: {id: 'brick', w: 4, h: 2}},
                     {ty: 'box', s: [1.5, 0.9, 0.3],   p: [1.375, 1.05, 0],  tex: {id: 'brick', w: 4, h: 2}},
                  ]
        });
        // Interior floor panel: top snaps to the cursor like terrain so room
        // floors line up with the ground they sit on.
        app.createWorldObject('in_floor', {
            anchor: 'below',
            prims: [
                     {ty: 'box', s: [4, 0.25, 4], p: [0, 0, 0], tex: {id: 'planks'}},
                  ]
        });

        // ---- Furniture / decoration (d_*) -----------------------------------
        app.createWorldObject('d_table', {
            prims: [
                     {ty: 'box', s: [1.8, 0.12, 1.0],   p: [0, 0, 0],           tex: {id: 'wood', s: 80}},
                     {ty: 'box', s: [0.12, 0.72, 0.12], p: [-0.78, -0.42, -0.38], tex: {id: 'wood', s: 80}},
                     {ty: 'box', s: [0.12, 0.72, 0.12], p: [0.78, -0.42, -0.38],  tex: {id: 'wood', s: 80}},
                     {ty: 'box', s: [0.12, 0.72, 0.12], p: [-0.78, -0.42, 0.38],  tex: {id: 'wood', s: 80}},
                     {ty: 'box', s: [0.12, 0.72, 0.12], p: [0.78, -0.42, 0.38],   tex: {id: 'wood', s: 80}},
                  ]
        });
        app.createWorldObject('d_chair', {
            prims: [
                     {ty: 'box', s: [0.55, 0.1, 0.55],  p: [0, 0, 0],            tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [0.55, 0.7, 0.08],  p: [0, 0.4, -0.235],     tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [0.09, 0.5, 0.09],  p: [-0.21, -0.3, -0.21], tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [0.09, 0.5, 0.09],  p: [0.21, -0.3, -0.21],  tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [0.09, 0.5, 0.09],  p: [-0.21, -0.3, 0.21],  tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [0.09, 0.5, 0.09],  p: [0.21, -0.3, 0.21],   tex: {id: 'wood', s: 60}},
                  ]
        });
        // Floor lamp: cylinder base + pole, warm glowing shade on top.
        app.createWorldObject('d_lamp', {
            prims: [
                     {ty: 'cylinder', s: [0.4, 0.06, 0.4, 16, 1],   p: [0, 0, 0],    tex: {id: 'wood', s: 40}},
                     {ty: 'cylinder', s: [0.07, 1.2, 0.07, 10, 1],  p: [0, 0.63, 0], tex: {id: 'wood', s: 40}},
                     {ty: 'cylinder', s: [0.55, 0.45, 0.35, 16, 1], p: [0, 1.4, 0],  col: [1.0, 0.9, 0.6], tex: {id: 'cloud'}},
                  ]
        });
        app.createWorldObject('d_rug', {
            prims: [
                     {ty: 'box', s: [2.2, 0.05, 1.5], p: [0, 0, 0], col: [0.65, 0.25, 0.3], tex: {id: 'cloud'}},
                  ]
        });

        app.createWorldObject('l_trigger', {
            prims: [
                     {ty: 'box',       s: [1,1,1], p: [0,0,0]},
                  ]
        }, 'TriggerScript');

        // A damage volume: an intangible translucent-red hazard zone that
        // hurts the player on a tick while they stand in it (see HazardScript).
        app.createWorldObject('l_hazard', {
            prims: [
                     {ty: 'box',       s: [2,1,2], p: [0,0,0]},
                  ]
        }, 'HazardScript');

        // A collectible KEY + a locked barrier (see KeyScript / LockScript):
        // grab the matching-color key, then walk into the lock to open it.
        app.createWorldObject('pk_key', {
            prims: [
                     {ty: 'cylinder', s: [0.5, 0.12, 0.5], p: [0, 0.5, 0], col: [0.95, 0.8, 0.25], tex: {id: 'marble'}},
                     {ty: 'box',      s: [0.12, 0.9, 0.12], p: [0, 0, 0],  col: [0.95, 0.8, 0.25], tex: {id: 'marble'}},
                     {ty: 'box',      s: [0.35, 0.12, 0.12], p: [0.15, -0.35, 0], col: [0.95, 0.8, 0.25], tex: {id: 'marble'}},
                  ]
        }, 'KeyScript');
        app.createWorldObject('pr_lock', {
            prims: [
                     {ty: 'box', s: [1.5, 3, 0.4], p: [0, 0, 0],   col: [0.4, 0.3, 0.15], tex: {id: 'wood', s: 60}},
                     {ty: 'cylinder', s: [0.6, 0.5, 0.6], p: [0, 0, 0.25], col: [0.85, 0.7, 0.2], tex: {id: 'marble'}},
                  ]
        }, 'LockScript');

        // A basic enemy: a red-marble blob that can be attacked in play mode
        // and, when defeated, bursts into collectable pixels.
        app.createWorldObject('en_blob', {
            prims: [
                     {ty: 'sphere',    s: [1.2], p: [0,0,0], col: [0.90, 0.16, 0.22], tex: {id: 'marble', w: 2, h: 2}},
                  ]
        }, 'EnemyScript');

        // A stationary sentry turret: tracks the player and fires enemy shots
        // on a cadence; attackable + defeatable (see TurretScript). The barrel
        // points along +z so the yaw-tracked base aims it at the player.
        app.createWorldObject('en_turret', {
            prims: [
                     {ty: 'cylinder', s: [1.1, 0.5, 1.1], p: [0, -0.5, 0],  col: [0.3, 0.32, 0.4], tex: {id: 'marble'}},
                     {ty: 'box',      s: [0.9, 0.7, 0.9], p: [0, 0.1, 0],   col: [0.55, 0.2, 0.15], tex: {id: 'marble', w: 2, h: 2}},
                     {ty: 'box',      s: [0.25, 0.25, 1.0], p: [0, 0.2, 0.6], col: [0.9, 0.5, 0.3]},
                  ]
        }, 'TurretScript');

        // A spawner pad: in play mode it spawns enemies of a chosen type at a set
        // frequency up to a limit (all editable via the parameters popup).
        app.createWorldObject('l_spawner', {
            prims: [
                     {ty: 'box',       s: [1.4, 0.5, 1.4], p: [0,0,0]},
                  ]
        }, 'SpawnerScript');

        // Logic toys: a counter (fires `reached` when wired events hit its
        // target) and a timer (fires `tick` on a schedule). Both wire up in the
        // wiring view alongside triggers and spawners.
        app.createWorldObject('l_counter', {
            prims: [
                     {ty: 'box',       s: [1.0, 0.5, 1.0], p: [0,0,0]},
                  ]
        }, 'CounterScript');
        app.createWorldObject('l_timer', {
            prims: [
                     {ty: 'box',       s: [1.0, 0.5, 1.0], p: [0,0,0]},
                  ]
        }, 'TimerScript');
        // A Boolean logic gate (AND/OR/NOT) combining wired signals -- the
        // puzzle combinator (see GateScript).
        app.createWorldObject('l_gate', {
            prims: [
                     {ty: 'box',       s: [1.0, 0.5, 1.0], p: [0,0,0],   col: [0.2, 0.5, 0.7]},
                     {ty: 'box',       s: [0.5, 0.2, 0.5], p: [0, 0.35, 0], col: [0.4, 0.9, 1.0]},
                  ]
        }, 'GateScript');
        // A respawn checkpoint flag: touch it to set your respawn point (see
        // CheckpointScript). The 'flag' child raises up the pole when active.
        app.createWorldObject('l_checkpoint', {
            prims: [
                     {ty: 'box',      s: [0.16, 2.2, 0.16], p: [0, 0, 0],      col: [0.7, 0.72, 0.78], tex: {id: 'marble'}},
                     {ty: 'box',      s: [0.9, 0.55, 0.08], p: [0.5, -0.7, 0], col: [0.3, 0.95, 0.55], tex: {id: 'cloud'}, nm: 'flag'},
                  ]
        }, 'CheckpointScript');
        // A teleporter pad: wire one pad's `link` to another pad's `here`,
        // step on it, and you're whisked to the partner (see TeleportScript).
        app.createWorldObject('l_teleport', {
            prims: [
                     {ty: 'cylinder', s: [1.8, 0.2, 1.8], p: [0, 0, 0],   col: [0.3, 0.2, 0.5], tex: {id: 'marble'}},
                     {ty: 'cylinder', s: [1.3, 0.08, 1.3], p: [0, 0.12, 0], col: [0.7, 0.5, 1.0], tex: {id: 'cloud'}},
                  ]
        }, 'TeleportScript');
        // A scoreboard: wired events score points, the score shows on the HUD,
        // and hitting the target fires its `reached` output.
        app.createWorldObject('l_scoreboard', {
            prims: [
                     {ty: 'box',       s: [1.2, 1.6, 0.3], p: [0,0,0]},
                  ]
        }, 'ScoreboardScript');
        // A camera: wires cut the play-mode view to it for a few seconds
        // (cutaways / mini-cinematics), then it fires `finished`.
        app.createWorldObject('l_camera', {
            prims: [
                     {ty: 'box',       s: [0.6, 0.6, 0.9], p: [0,0,0]},
                  ]
        }, 'CameraScript');

        // A farm plot: grows glowberries (sidekick food) on a timer; walk
        // over the ripe crop to harvest. The 'crop' child is scaled/tinted
        // by FarmPlotScript through the growth stages.
        app.createWorldObject('pr_plot', {
            prims: [
                     {ty: 'box', s: [1.6, 0.25, 1.6], p: [0, 0, 0],   col: [0.42, 0.28, 0.18], tex: {id: 'noise'}},
                     {ty: 'box', s: [0.7, 0.7, 0.7],  p: [0, 0.5, 0], col: [0.3, 0.8, 0.3], tex: {id: 'cloud'}, nm: 'crop'},
                  ]
        }, 'FarmPlotScript');

        // A drivable hover-kart: walk into it in play mode to mount, WASD or
        // the left stick drives with momentum, Space hops out. Premium.
        // A drivable boat: a watercraft that rides the water surface (see
        // BoatScript + the watercraft branch in PlayMode.updateDriving).
        app.createWorldObject('pr_boat', {
            prims: [
                     {ty: 'box',      s: [1.6, 0.5, 2.8], p: [0, 0, 0],     col: [0.5, 0.34, 0.18], tex: {id: 'wood', s: 50}},
                     {ty: 'box',      s: [1.3, 0.4, 2.4], p: [0, 0.35, 0],  col: [0.7, 0.5, 0.28], tex: {id: 'wood', s: 40}},
                     {ty: 'box',      s: [0.2, 1.1, 0.2], p: [0, 0.8, -0.3], col: [0.6, 0.42, 0.24], tex: {id: 'wood', s: 30}},
                  ]
        }, 'BoatScript');
        app.createWorldObject('pr_kart', {
            prims: [
                     {ty: 'box', s: [1.6, 0.45, 2.4],  p: [0, 0, 0],      tex: {id: 'road'}},
                     {ty: 'box', s: [1.0, 0.4, 1.0],   p: [0, 0.42, -0.3], col: [0.35, 0.9, 1.0], tex: {id: 'cloud'}},
                     {ty: 'box', s: [0.25, 0.3, 2.4],  p: [-0.9, -0.1, 0], col: [0.2, 0.7, 1.0], tex: {id: 'cloud'}},
                     {ty: 'box', s: [0.25, 0.3, 2.4],  p: [0.9, -0.1, 0],  col: [0.2, 0.7, 1.0], tex: {id: 'cloud'}},
                  ]
        }, 'KartScript');

        // Floating props: barrels and crates that bob on water (see
        // BuoyScript + PlayMode.updateFloaters). On dry land they just rest.
        app.createWorldObject('pr_barrel', {
            prims: [
                     {ty: 'cylinder', s: [0.7, 1.0, 0.7], p: [0, 0, 0], col: [0.45, 0.3, 0.16], tex: {id: 'wood', s: 40}},
                     {ty: 'cylinder', s: [0.74, 0.12, 0.74], p: [0, 0.3, 0],  col: [0.7, 0.55, 0.25], tex: {id: 'marble'}},
                     {ty: 'cylinder', s: [0.74, 0.12, 0.74], p: [0, -0.3, 0], col: [0.7, 0.55, 0.25], tex: {id: 'marble'}},
                  ]
        }, 'BuoyScript');
        app.createWorldObject('pr_crate', {
            prims: [
                     {ty: 'box', s: [0.9, 0.9, 0.9], p: [0, 0, 0], col: [0.55, 0.4, 0.2], tex: {id: 'wood', s: 50}},
                  ]
        }, 'BuoyScript');

        // A treasure chest: walk up (or wire `open`) to pop the lid and
        // spill a pixel reward; fires `opened` (see ChestScript). The lid is
        // a named child hinged at the back.
        app.createWorldObject('pr_chest', {
            prims: [
                     {ty: 'box', s: [1.2, 0.7, 0.8],  p: [0, 0, 0],       col: [0.5, 0.32, 0.14], tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [1.24, 0.12, 0.84], p: [0, -0.35, 0], col: [0.85, 0.7, 0.25], tex: {id: 'marble'}},
                     {ty: 'box', s: [1.24, 0.12, 0.84], p: [0, 0.35, 0],  col: [0.85, 0.7, 0.25], tex: {id: 'marble'}},
                     {ty: 'box', s: [1.2, 0.4, 0.82],  p: [0, 0.55, -0.4], col: [0.55, 0.36, 0.16], tex: {id: 'wood', s: 60}, nm: 'lid'},
                  ]
        }, 'ChestScript');

        // A climbable ladder: two rails + rungs. Hold W near it to ascend
        // (see PlayMode.updateClimbing); no script needed.
        app.createWorldObject('pr_ladder', {
            anchor: 'below',
            prims: [
                     // First prim (root) spans the FULL footprint so the root
                     // bounding box covers the whole ladder -- climb detection
                     // reads the root bbox, and a nested instance's root box is
                     // only its own geometry.
                     {ty: 'box', s: [0.85, 4.0, 0.1],  p: [0, 0, -0.02], col: [0.42, 0.3, 0.18], tex: {id: 'wood', s: 40}},
                     {ty: 'box', s: [0.12, 4.0, 0.14], p: [-0.35, 0, 0], col: [0.5, 0.35, 0.2], tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [0.12, 4.0, 0.14], p: [0.35, 0, 0],  col: [0.5, 0.35, 0.2], tex: {id: 'wood', s: 60}},
                     {ty: 'box', s: [0.85, 0.1, 0.15], p: [0, -1.5, 0.05], col: [0.6, 0.42, 0.25], tex: {id: 'wood', s: 40}},
                     {ty: 'box', s: [0.85, 0.1, 0.15], p: [0, -0.5, 0.05], col: [0.6, 0.42, 0.25], tex: {id: 'wood', s: 40}},
                     {ty: 'box', s: [0.85, 0.1, 0.15], p: [0, 0.5, 0.05],  col: [0.6, 0.42, 0.25], tex: {id: 'wood', s: 40}},
                     {ty: 'box', s: [0.85, 0.1, 0.15], p: [0, 1.5, 0.05],  col: [0.6, 0.42, 0.25], tex: {id: 'wood', s: 40}},
                  ]
        });

        // A water block: a translucent swim volume (see WaterScript).
        app.createWorldObject('t_water', {
            anchor: 'below',
            prims: [
                     {ty: 'box', s: [2, 2, 2], p: [0, 0, 0], col: [0.3, 0.6, 0.95], tex: {id: 'cloud'}},
                  ]
        }, 'WaterScript');

        // An ambient villager: wanders its home patch, greets with a talk
        // bubble, edge-fires `talked` (quest fodder). Mood picks its lines.
        app.createWorldObject('pr_villager', {
            prims: [
                     {ty: 'box',      s: [0.5, 0.75, 0.35],      p: [0, 0.15, 0],      col: [0.75, 0.6, 0.4], tex: {id: 'cloud'}},
                     {ty: 'box',      s: [0.38, 0.38, 0.34],     p: [0, 0.75, 0],      col: [0.92, 0.8, 0.68], tex: {id: 'cloud'}},
                     {ty: 'cylinder', s: [0.13, 0.55, 0.13, 8, 1], p: [-0.14, -0.5, 0], col: [0.4, 0.35, 0.3], tex: {id: 'wood', s: 60}, nm: 'vleg1'},
                     {ty: 'cylinder', s: [0.13, 0.55, 0.13, 8, 1], p: [0.14, -0.5, 0],  col: [0.4, 0.35, 0.3], tex: {id: 'wood', s: 60}, nm: 'vleg2'},
                  ]
        }, 'VillagerScript');

        // A hireable-companion recruit: walk up to open their dialog tree.
        app.createWorldObject('pr_recruit', {
            prims: [
                     {ty: 'box', s: [0.55, 1.1, 0.4],  p: [0, 0, 0],     col: [0.55, 0.5, 0.75], tex: {id: 'cloud'}},
                     {ty: 'box', s: [0.42, 0.42, 0.4], p: [0, 0.8, 0],   col: [0.9, 0.8, 0.7],  tex: {id: 'cloud'}},
                     {ty: 'box', s: [0.7, 0.12, 0.5],  p: [0, -0.65, 0], col: [0.35, 0.3, 0.5], tex: {id: 'marble'}},
                  ]
        }, 'RecruitScript');

        // A ridable mount: walk up to saddle it. Rides slower than the kart
        // but pivots in place and JUMPS (Space); C hops off. The mleg*
        // children trot while ridden.
        app.createWorldObject('pr_mount', {
            prims: [
                     {ty: 'box',      s: [1.1, 0.8, 2.0],        p: [0, 0, 0],          col: [0.4, 0.85, 0.6], tex: {id: 'noise'}},
                     {ty: 'box',      s: [0.55, 0.55, 0.7],      p: [0, 0.55, 1.1],     col: [0.45, 0.9, 0.65], tex: {id: 'noise'}},
                     {ty: 'cylinder', s: [0.22, 0.9, 0.22, 8, 1], p: [-0.4, -0.8, 0.7],  col: [0.3, 0.7, 0.5], tex: {id: 'noise'}, nm: 'mleg1'},
                     {ty: 'cylinder', s: [0.22, 0.9, 0.22, 8, 1], p: [0.4, -0.8, 0.7],   col: [0.3, 0.7, 0.5], tex: {id: 'noise'}, nm: 'mleg2'},
                     {ty: 'cylinder', s: [0.22, 0.9, 0.22, 8, 1], p: [-0.4, -0.8, -0.7], col: [0.3, 0.7, 0.5], tex: {id: 'noise'}, nm: 'mleg3'},
                     {ty: 'cylinder', s: [0.22, 0.9, 0.22, 8, 1], p: [0.4, -0.8, -0.7],  col: [0.3, 0.7, 0.5], tex: {id: 'noise'}, nm: 'mleg4'},
                  ]
        }, 'MountScript');

        // A multi-phase arena boss: stomps, volleys (phase 2), shockwaves
        // (phase 3); wire phase2/phase3/defeated to choreograph the arena.
        app.createWorldObject('en_boss', {
            prims: [
                     {ty: 'box', s: [1.7, 1.7, 1.7],   p: [0, 0.2, 0],    col: [0.55, 0.2, 0.7], tex: {id: 'marble'}},
                     {ty: 'box', s: [0.7, 0.55, 0.7],  p: [-1.15, 0.75, 0], col: [0.45, 0.15, 0.6], tex: {id: 'marble'}},
                     {ty: 'box', s: [0.7, 0.55, 0.7],  p: [1.15, 0.75, 0],  col: [0.45, 0.15, 0.6], tex: {id: 'marble'}},
                     {ty: 'box', s: [0.9, 0.45, 0.9],  p: [0, 1.35, 0],   col: [0.85, 0.7, 0.2], tex: {id: 'marble'}, nm: 'crown'},
                  ]
        }, 'BossScript');

        // A grind rail: wire `path` to a node chain; step on to ride it.
        app.createWorldObject('pr_rail', {
            prims: [
                     {ty: 'box', s: [0.35, 0.15, 3.0], p: [0, 0, 0], col: [0.3, 0.9, 0.95], tex: {id: 'marble'}},
                  ]
        }, 'RailScript');

        // A trampoline: land on it and get launched at the configured power.
        app.createWorldObject('t_tramp', {
            prims: [
                     {ty: 'box', s: [2.2, 0.5, 2.2], p: [0, 0, 0], col: [1.0, 0.45, 0.75], tex: {id: 'noise'}},
                  ]
        }, 'TrampolineScript');

        // A flyable glider: build speed, hold Space to climb, release to
        // glide; C bails out. Banks into turns (WingScript).
        app.createWorldObject('pr_wing', {
            prims: [
                     {ty: 'box', s: [0.7, 0.35, 2.6],  p: [0, 0, 0],        col: [0.55, 0.8, 1.0],  tex: {id: 'cloud'}},
                     {ty: 'box', s: [2.6, 0.08, 0.9],  p: [-1.6, 0.15, 0.2], col: [0.7, 0.9, 1.0],  tex: {id: 'cloud'}, nm: 'wingL'},
                     {ty: 'box', s: [2.6, 0.08, 0.9],  p: [1.6, 0.15, 0.2],  col: [0.7, 0.9, 1.0],  tex: {id: 'cloud'}, nm: 'wingR'},
                     {ty: 'box', s: [0.08, 0.5, 0.5],  p: [0, 0.4, -1.15],   col: [0.7, 0.9, 1.0],  tex: {id: 'cloud'}, nm: 'tail'},
                  ]
        }, 'WingScript');

        // A ghost kart: a translucent AI rival that laps a wired path chain
        // (wire its `follow` to the first path node). Intangible pace-setter.
        app.createWorldObject('pr_kart_ghost', {
            prims: [
                     {ty: 'box', s: [1.6, 0.45, 2.4], p: [0, 0, 0],       col: [0.5, 0.85, 1.0], tex: {id: 'cloud'}},
                     {ty: 'box', s: [1.0, 0.4, 1.0],  p: [0, 0.42, -0.3], col: [0.7, 0.95, 1.0], tex: {id: 'cloud'}},
                  ]
        }, 'GhostKartScript');

        // A quest: wire distinct event sources into its `step` input; when
        // enough different ones have fired it completes and pays pixels.
        app.createWorldObject('l_quest', {
            prims: [
                     {ty: 'box',       s: [0.9, 1.3, 0.3], p: [0,0,0]},
                  ]
        }, 'QuestScript');

        // A race controller: wire a start gate, checkpoint triggers, and a
        // finish line into it; it runs the stopwatch, tracks distinct
        // checkpoints, and fires finished/record events.
        app.createWorldObject('l_race', {
            prims: [
                     {ty: 'box',       s: [1.2, 1.0, 0.4], p: [0,0,0]},
                  ]
        }, 'RaceScript');

        // Path building: waypoint nodes chain via wires (node `next` -> next
        // node's `chain`); a moving platform wires its `follow` output to the
        // first node and travels the chain in play mode (loop/pingpong/once).
        app.createWorldObject('l_pathnode', {
            prims: [
                     {ty: 'box',       s: [0.5, 0.5, 0.5], p: [0,0,0]},
                  ]
        }, 'PathNodeScript');

        // A wired chime: `play` synthesizes its jingle (WebAudio, no asset
        // files); `played` fires after for chaining.
        app.createWorldObject('l_chime', {
            prims: [
                     {ty: 'box', s: [0.5, 0.7, 0.5], p: [0, 0, 0]},
                  ]
        }, 'ChimeScript');

        // A day/night sun: placed, it cycles play-mode lighting and fires
        // dawn/noon/dusk/midnight wiring edges. Build mode stays daylit.
        app.createWorldObject('l_sun', {
            prims: [
                     {ty: 'box', s: [0.6, 0.6, 0.6], p: [0, 0, 0]},
                  ]
        }, 'SunScript');

        // An aerial ring: fires `flown` when the player (or their vehicle)
        // passes through. Wire rings into l_race for fly-through courses.
        app.createWorldObject('l_ring', {
            prims: [
                     {ty: 'box', s: [0.4, 0.4, 0.4], p: [0, 0, 0]},
                  ]
        }, 'RingScript');
        app.createWorldObject('pr_platform_moving', {
            prims: [
                     {ty: 'box',       s: [2, 0.3, 2], p: [0,0,0], tex: {id: 'road'}},
                  ]
        }, 'MovingPlatformScript');

        // Pickups: collect by touching in play mode. One script drives all
        // three; texture + tint tell them apart (red marble = health, gold
        // grain = pixels, cosmic starfield sphere = collectible star).
        app.createWorldObject('pk_health', {
            prims: [
                     {ty: 'box',       s: [0.55, 0.55, 0.55], p: [0,0,0], col: [0.95, 0.25, 0.30], tex: {id: 'marble', w: 1, h: 1}},
                  ]
        }, 'PickupScript');
        app.createWorldObject('pk_pixels', {
            prims: [
                     {ty: 'box',       s: [0.55, 0.55, 0.55], p: [0,0,0], col: [1.00, 0.78, 0.20], tex: {id: 'wood', s: 60}},
                  ]
        }, 'PickupScript');
        app.createWorldObject('pk_star', {
            prims: [
                     {ty: 'sphere',    s: [0.6], p: [0,0,0], tex: {id: 'starfield'}},
                  ]
        }, 'PickupScript');

        new CyberpunkManifest(app, assetsBaseUrl);
        new ChristmasManifest(app, assetsBaseUrl);

        // Premium objects: buyable in the shop with pixels. Everything else is
        // free. (Kept to reliably-local assets so the shop always has stock.)
        app.objectPrices['cp_platform_2x2'] = 40;
        app.objectPrices['d_christmas_tree'] = 25;
        app.objectPrices['pr_kart'] = 60;
    }
}
