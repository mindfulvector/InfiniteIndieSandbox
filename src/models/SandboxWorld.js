class SandboxWorld {
    constructor(app) {
        this.app = app;
    }

    saveToSlot(slot) {
        console.log('[saveToSlot] :slot', slot);

        let saveData = {
            'objects': [],
        }

        // get compact data for each world object instance
        this.app.BuildableObjectList.forEach((woObject) => {
            saveData.objects = saveData.objects.concat(woObject.getAllInstanceData());
        });

        console.log('[saveToSlot] :saveData', saveData);
        const jsonData = JSON.stringify(saveData);

        console.log('[saveToSlot] :json', jsonData);

        window.localStorage.setItem('saveSlot_'+slot, jsonData);

        console.log('[saveToSlot] :objects.count', saveData.objects.length);

        return saveData.objects.length;
    }

    loadFromSlot(slot) {
        console.log('[loadFromSlot] :slot', slot);

        //let worldFile = File.openDialog("Infinite Indie Sandbox World File","IIS Sandbox:*.isw");
        const jsonData = window.localStorage.getItem('saveSlot_'+slot, '');
        if('' != jsonData) {
            const saveData = JSON.parse(jsonData);
            console.log('[loadFromSlot] :saveData', saveData);
            this.clearWorld();
            var loadedObjectCount = 0;
            saveData.objects.forEach((instData) => {
                // find world object by name
                var inst = null;
                this.app.BuildableObjectList.forEach((woObject) => {
                    if(woObject.name == instData.wo) {                      // wo property == WorldObject name
                        // create instance from saved data
                        inst = woObject.createInstance(instData);
                        if(inst != null) {
                            loadedObjectCount++;
                        }
                    }
                });

                console.log('[loadFromSlot] :loadedObjectCount', loadedObjectCount);

                // if we could not find a world object to instance, or didn't get a valid
                // instance for some reason
                if(null == inst) {
                    return false;
                }
            });

            // no errors so we loaded the world!
            return true;
        } else {
            return false;
        }

        
    }

    clearWorld() {
        this.app.BuildableObjectList.forEach((woObject) => {
            woObject.disposeAllInstances();
        });
    }
    
}