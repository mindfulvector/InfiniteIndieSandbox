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
        app.createWorldObject('t_floor_1x1',    { rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_floor_1x1.gltf' });
        app.createWorldObject('t_cube_1x1',     { rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_cube_1x1.gltf' });

        // Lightweight primitive terrain tile used to build the default sandbox
        // grid. Unlike the textured gltf terrain, a flat-shaded primitive renders
        // cheaply even in software (a full 10x10 grid of the textured gltf tiles
        // crawls under headless SwiftShader), so this is what the rolling terrain
        // is made of. Players can also place it as a plain building block.
        app.createWorldObject('t_tile', {
            prims: [
                     {ty: 'box',       s: [2, 1, 2], p: [0,0,0], col: [0.30, 0.52, 0.34]},
                  ]
        });
        
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

        // A basic enemy: a red blob that can be attacked in play mode and, when
        // defeated, bursts into collectable pixels.
        app.createWorldObject('en_blob', {
            prims: [
                     {ty: 'sphere',    s: [1.2], p: [0,0,0], col: [0.90, 0.16, 0.22]},
                  ]
        }, 'EnemyScript');

        // A spawner pad: in play mode it spawns enemies of a chosen type at a set
        // frequency up to a limit (all editable via the parameters popup).
        app.createWorldObject('l_spawner', {
            prims: [
                     {ty: 'box',       s: [1.4, 0.5, 1.4], p: [0,0,0]},
                  ]
        }, 'SpawnerScript');

        new CyberpunkManifest(app, assetsBaseUrl);
        new ChristmasManifest(app, assetsBaseUrl);

        // Premium objects: buyable in the shop with pixels. Everything else is
        // free. (Kept to reliably-local assets so the shop always has stock.)
        app.objectPrices['cp_platform_2x2'] = 40;
        app.objectPrices['d_christmas_tree'] = 25;
    }
}
