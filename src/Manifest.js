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

        new CyberpunkManifest(app, assetsBaseUrl);
        new ChristmasManifest(app, assetsBaseUrl);
    }
}
