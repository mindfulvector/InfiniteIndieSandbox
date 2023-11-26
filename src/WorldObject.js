class WorldObject {
    constructor(app, name, mesh, nestedMeshes=false) {
        this.app = app;
        this.name = name;
        this.mesh = mesh;
        this.nestedMeshes = nestedMeshes;
        this.lastInstanceId = 0;
        this.instances = [];
    }

    // Create an instance or clone of this world object's meshes.
    createInstance(x,y,z) {
        let t = BABYLON.Matrix.Translation(x,y,z);
        this.lastInstanceId += 1;
        if(this.nestedMeshes) {
            var inst = this.mesh.clone(this.name + '[' + this.lastInstanceId + ']');
        } else {
            var inst = this.mesh.createInstance(this.name + '[' + this.lastInstanceId + ']');
        }
        console.log('inst', inst);
        this.app.showAll(inst);
        this.instances[this.lastInstanceId] = inst;
        //console.log('createInstance:', inst);
        return inst;
    }
}
