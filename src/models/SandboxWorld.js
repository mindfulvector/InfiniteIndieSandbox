class SandboxWorld {
    constructor(app) {
        this.app = app;
    }

    saveToSlot(slot) {
        let sceneData = BABYLON.SceneSerializer.Serialize(this.app.scene);
        console.log('[sceneData] :pre-filtered', sceneData);
        sceneData.cameras = [];
        for (const [key, value] of Object.entries(sceneData.geometries)) {
            sceneData.geometries[key] = [];
        }
        sceneData.lights = [];
        sceneData.materials = [];
        sceneData.meshes = sceneData.meshes.filter((mesh) => {
            return mesh.name.startsWith('world.');
        });
        sceneData.morphTargetManagers = [];
        sceneData.multiMaterials = [];
        sceneData.particleSystems = [];
        sceneData.postProcesses = [];
        sceneData.postProcesses = [];
        sceneData.skeletons = [];
        sceneData.transformNodes = sceneData.transformNodes.filter((node) => {
            return node.id.startsWith('world.');
        });

        console.log('[sceneData] :post-filtered', sceneData);

        let worldData = {};

        this.app.BuildableObjectList.forEach((woObject) => {
            worldData[woObject.name] = woObject.getAllInstances();
        });

        let saveData = {
            'scene': sceneData,
            'world': worldData,
        }

        const result = JSON.stringify(saveData);
        console.log('[sceneData] :result', result);

        return result;
    }

    loadFromSlot(slot) {
        var srcFile=File.openDialog("Choose color File (XML or ASE)","XML or ASE:*.xml;*.ase");
        /*this.clearWorld();

        BABYLON.SceneLoader.Append('./', 'saves/slot1.babylon', this.app.scene, (scene) => {
            console.log('loaded scene for save slot ' + slot + '!');
            let worldData = 
            this.app.BuildableObjectList.forEach((woObject) => {
                worldData[woObject.name] = woObject.getAllInstances();
            });
        });*/
    }

    clearWorld() {
        this.app.BuildableObjectList.forEach((woObject) => {
            woObject.disposeAllInstances();
        });
    }
    
}