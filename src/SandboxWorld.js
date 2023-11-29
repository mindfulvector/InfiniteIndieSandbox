class SandboxWorld {
    constructor(app) {
        this.app = app;
    }

    saveToSlot(slot) {
        let savedata = BABYLON.SceneSerializer.Serialize(this.app.scene);
        console.log('[savedata] :pre-filtered', savedata);
        savedata.cameras = [];
        for (const [key, value] of Object.entries(savedata.geometries)) {
            savedata.geometries[key] = [];
        }
        savedata.lights = [];
        savedata.materials = [];
        savedata.meshes = savedata.meshes.filter((mesh) => {
            return mesh.name.startsWith('world.');
        });
        savedata.morphTargetManagers = [];
        savedata.multiMaterials = [];
        savedata.particleSystems = [];
        savedata.postProcesses = [];
        savedata.postProcesses = [];
        savedata.skeletons = [];
        savedata.transformNodes = savedata.transformNodes.filter((node) => {
            return node.id.startsWith('world.');
        });

        console.log('[savedata] :post-filtered', savedata);

        const result = JSON.stringify(savedata);
        console.log('[savedata] :result', result);

        return result;
    }

    loadFromSlot(slot) {
        BABYLON.SceneLoader.Append('./', 'saves/slot1.babylon', this.app.scene, (scene) => {
            console.log('loaded save slot ' + slot + '!');

        });
    }

    clearWorld() {
        this.app.BuildableObjectList.forEach((woObject) => {
            woObject.disposeAllInstances();
        });
    }
    
}