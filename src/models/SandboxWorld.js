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

        const jsonData = window.localStorage.getItem('saveSlot_'+slot);
        if(!jsonData) {
            return false;   // empty / missing slot
        }

        let saveData;
        try {
            saveData = JSON.parse(jsonData);
        } catch(e) {
            console.error('[loadFromSlot] could not parse slot '+slot, e);
            return false;
        }
        console.log('[loadFromSlot] :saveData', saveData);

        this.clearWorld();
        let loadedObjectCount = 0;

        (saveData.objects || []).forEach((instData) => {
            const woObject = app.findWorldObject(instData.wo);
            if(woObject) {
                const inst = woObject.createInstance(instData);
                if(inst != null) loadedObjectCount++;
            } else {
                console.warn('[loadFromSlot] unknown object type `'+instData.wo+'`, skipping');
            }
        });

        console.log('[loadFromSlot] :loadedObjectCount', loadedObjectCount);

        // Only synthesise a terrain tile when the save was completely empty, so
        // a normal world is restored exactly as saved (no duplicate origin cube).
        if(loadedObjectCount === 0) {
            console.log('[loadFromSlot] :empty world, adding an origin terrain tile');
            app.findWorldObject('t_cube_1x1').createInstance();
        }

        return true;
    }

    clearWorld() {
        this.app.BuildableObjectList.forEach((woObject) => {
            woObject.disposeAllInstances();
        });
    }
    
}