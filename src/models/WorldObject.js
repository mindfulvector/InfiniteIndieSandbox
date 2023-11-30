class WorldObject {
    constructor(app, name, mesh, nestedMeshes=false) {
        this.app = app;
        this.name = name;
        this.mesh = mesh;
        this.nestedMeshes = nestedMeshes;
        this.lastInstanceId = 0;
        this.instances = [];
        this.tag = 'world.' + this.name.replaceAll(' ', '_');
    }

    // Create an instance or clone of this world object's meshes.
    createInstance(woInstData={}) {

        if(typeof woInstData.id != 'undefined') this.lastInstanceId = woInstData.id;
        else this.lastInstanceId += 1;

        const instName = this.tag + '[' + this.lastInstanceId + ']';
        if(this.nestedMeshes) {
            var inst = this.mesh.clone(instName);
        } else {
            var inst = this.mesh.createInstance(instName);
        }
        BABYLON.Tags.EnableFor(inst);
        inst.addTags('worldObject ' + this.tag + ' ' + instName);

        this.app.showAll(inst);
        
        inst.worldId = this.lastInstanceId;
        inst.inspectableCustomProperties = [
            {
                label: "worldId",
                propertyName: "worldId",
                type: BABYLON.InspectableType.String
            }
        ];

        // position
        if(typeof woInstData.po != 'undefined') inst.position = woInstData.po;
        
        this.instances[this.lastInstanceId] = inst;
        console.log('createInstance['+this.name+']:', inst);
        return inst;
    }

    // Remove an instance from our list of instances so that it can be GC'd and so that
    // we don't serialize it when saving the world
    disposeInstance(inst) {
        let index = this.instances.indexOf(inst);
        if(index > -1) {
            this.instances.splice(index, 1);
        }
        inst.dispose();
    }

    // Dispose all instances created by this object and clear the instance tracking
    // array so they are not saved and can be GC'd
    disposeAllInstances() {
        //this.app.scene.getTransformNodesByTags(this.tag).forEach((inst) => {
        this.instances.forEach((inst) => {
            inst.dispose();
        });
        this.instances = [];
    }

    // Get data for serialization to a sandbox world file, needs to be
    // enough information to completely recreate the active instances
    getAllInstanceData() {
        const wo = this;
        let result = [];
        //this.app.scene.getTransformNodesByTags(this.tag).forEach((inst) => {
        this.instances.forEach((inst) => {
            result.push({
                'wo': wo.name,
                'id': inst.worldId,
                'po': inst.position,
            });
        });
        console.log(result);
        return result;
    }
}
