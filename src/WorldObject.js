class WorldObject {
    constructor(name, mesh) {
        this.name = name;
        this.mesh = mesh;
        this.lastInstanceId = 0;
        this.instances = [];
    }

    // Create an instance clone of this WorldObject
    createInstance(x,y,z) {
        let t = BABYLON.Matrix.Translation(x,y,z);
        this.lastInstanceId += 1;
        let inst = this.mesh.createInstance(this.name + '[' + this.lastInstanceId + ']');
        this.instances[this.lastInstanceId] = inst;
        //console.log('createInstance:', inst);
        return inst;
    }
}
