class ChristmasManifest {
    constructor(app, assetsBaseUrl) {
        app.createWorldObject('d_christmas_tree', { rootUrl: assetsBaseUrl,
            filename: 'models/christmas/christmas_tree.obj',
            colliderMeshes: ['Cylinder.072', 'Circle.033'] });
    }
}

