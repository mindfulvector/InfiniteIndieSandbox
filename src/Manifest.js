// This class only exists to trigger asset loading for everything the game needs.
// Major additions of a large number of related items should probably have their
// plugin in the form of a <PluginName>Manifest.js class in the plugins dir.
class Manifest {
    constructor(app) {

        app.createWorldObject('al_wall',        Object.assign({}, Assets.meshes.wall_glb,           { colliderMeshes: ['wall'] }));
        app.createWorldObject('al_wallArch',    Object.assign({}, Assets.meshes.wallArch_glb,       { colliderMeshes: ['wallArch'] }));
        app.createWorldObject('al_wallCorner',  Object.assign({}, Assets.meshes.wallCorner_glb,     { colliderMeshes: ['wallCorner'] }));
        app.createWorldObject('al_rocks1',      Object.assign({}, Assets.meshes.rocks1_glb,         { colliderMeshes: ['rocks1'] }));
        const assetsBaseUrl     = './assets/';
        // Terrain snaps its TOP to the cursor (anchor:'below') so tiles of
        // different thicknesses (a thin floor panel, a full cube) share a seamless
        // top walking surface at the cursor height.
        app.createWorldObject('t_floor_1x1',    { rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_floor_1x1.gltf', anchor: 'below' });
        app.createWorldObject('t_cube_1x1',     { rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_cube_1x1.gltf', anchor: 'below' });

        // Lightweight terrain blocks: boxes wearing the REAL grass (top) and
        // dirt (sides) textures via one shared atlas material, so they stay
        // instancable and a full 10x10 grid remains cheap even under software
        // rendering. t_tile builds the default worlds; the t_block_* sizes are
        // smaller variations of the large gltf terrain cube for detail work.
        app.createWorldObject('t_tile',    { anchor: 'below', grassBlock: { s: [2, 1, 2] } });
        app.createWorldObject('t_block_4', { anchor: 'below', grassBlock: { s: [4, 4, 4] } });
        app.createWorldObject('t_block_2', { anchor: 'below', grassBlock: { s: [2, 2, 2] } });
        app.createWorldObject('t_block_1', { anchor: 'below', grassBlock: { s: [1, 1, 1] } });
        
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
                     {ty: 'box', s: [4, 0.25, 4], p: [0, 0, 0], tex: {id: 'wood', s: 40}},
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

        // A basic enemy: a red-marble blob that can be attacked in play mode
        // and, when defeated, bursts into collectable pixels.
        app.createWorldObject('en_blob', {
            prims: [
                     {ty: 'sphere',    s: [1.2], p: [0,0,0], col: [0.90, 0.16, 0.22], tex: {id: 'marble', w: 2, h: 2}},
                  ]
        }, 'EnemyScript');

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

        // Path building: waypoint nodes chain via wires (node `next` -> next
        // node's `chain`); a moving platform wires its `follow` output to the
        // first node and travels the chain in play mode (loop/pingpong/once).
        app.createWorldObject('l_pathnode', {
            prims: [
                     {ty: 'box',       s: [0.5, 0.5, 0.5], p: [0,0,0]},
                  ]
        }, 'PathNodeScript');
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
    }
}
