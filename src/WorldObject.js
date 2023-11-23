class WorldObject {
    constructor(name, mesh) {
        this.name = name;
        this.mesh = mesh;
        this.lastInstanceId = 0;
    }

    /**
     Create an a clone of this WorldObject and add it to the given scene.
     */
    createInstance(x,y,z) {
        let t = BABYLON.Matrix.Translation(x,y,z);
        this.lastInstanceId += 1;
        let inst = this.mesh.createInstance(this.name + '[' + this.lastInstanceId + ']');
        console.log('createInstance:', inst);
        return inst;
    }
}
