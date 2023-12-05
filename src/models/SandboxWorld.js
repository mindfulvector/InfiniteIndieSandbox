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
        const app = this.app;
        console.log('[loadFromSlot] :slot', slot);

        //let worldFile = File.openDialog("Infinite Indie Sandbox World File","IIS Sandbox:*.isw");
        const jsonData = window.localStorage.getItem('saveSlot_'+slot, '');
        if('' != jsonData) {
            const saveData = JSON.parse(jsonData);
            console.log('[loadFromSlot] :saveData', saveData);
            this.clearWorld();
            var loadedObjectCount = 0;
            var foundObjectAtOrigin = false;

            saveData.objects.forEach((instData) => {
                // find world object by name
                var inst = null;
                this.app.BuildableObjectList.forEach((woObject) => {
                    if(woObject.name == instData.wo) {                      // wo property == WorldObject name
                        // create instance from saved data
                        inst = woObject.createInstance(instData);
                        if(inst != null) {
                            loadedObjectCount++;
                            if(inst.position.x == 0 && inst.position.y == 0 && inst.position.z == 0) {
                                foundObjectAtOrigin = true;
                            }
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

            if(!foundObjectAtOrigin) {
                console.log('[loadFromSlot] :no origin object found, adding one');
                app.findWorldObject('t_cube_1x1').createInstance();
            }

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