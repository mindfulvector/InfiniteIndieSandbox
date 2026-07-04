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
        
        app.createWorldObject('pr_door', {
            prims: [
                     {ty: 'box',       s: [1,3,0.5], p: [0,0,0], tex: {id: 'wood', s: 120}},
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
