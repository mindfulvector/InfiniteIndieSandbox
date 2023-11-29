// This class only exists to trigger asset loading for everything the game needs.
// Major additions of a large number of related items should probably have their
// plugin in the form of a <PluginName>Manifest.js class in the plugins dir.
class Manifest {
    constructor(app) {
        //app.loadAsset({rootUrl: assetsBaseUrl, filename: 'pirates/Characters_Anne.gltf'});
        app.loadAsset(Assets.meshes.wall_glb);
        app.loadAsset(Assets.meshes.wallArch_glb);
        app.loadAsset(Assets.meshes.wallCorner_glb);
        app.loadAsset(Assets.meshes.rocks1_glb);
        const assetsBaseUrl = './assets/';
        app.loadAsset({rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_floor_1x1.gltf'});
        app.loadAsset({rootUrl: assetsBaseUrl, filename: 'models/terrain/cube_terrains_cube_1x1.gltf'});

        new CyberpunkManifest(app, assetsBaseUrl);
    }
}
