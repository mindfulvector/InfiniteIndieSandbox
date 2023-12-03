class WorldObject {
    constructor(app, name, mesh, nestedMeshes=false, scriptClass=null) {
        this.app = app;
        this.name = name;
        this.mesh = mesh;
        this.nestedMeshes = nestedMeshes;
        this.scriptClass = scriptClass;
        this.lastInstanceId = 0;
        this.instances = [];
        this.tag = 'world.' + this.name.replaceAll(' ', '_');
    }

    // Create an instance or clone of this world object's meshes.
    createInstance(woInstData={}) {
        // Get next instance ID or ID from saved record...
        // Note that active instance IDs currently cannot be reused during a session, and
        // are re-loaded from the last session when loading a save file. This may need to
        // be changed in the future if running out of instance IDs becomes an issue.
        if(typeof woInstData.id != 'undefined') this.lastInstanceId = woInstData.id;
        else this.lastInstanceId += 1;

        // create an instance name from the object tag+brackets+instanceId
        const instName = this.tag + '[' + this.lastInstanceId + ']';

        // create actual clone or instance
        if(this.nestedMeshes) {
            var inst = this.mesh.clone(instName);
        } else {
            var inst = this.mesh.createInstance(instName);
        }

        // add three tags: 'worldObject', 'world.<object_name>' and 'world.<object_name>[<index>]'
        BABYLON.Tags.EnableFor(inst);
        inst.addTags('worldObject ' + this.tag + ' ' + instName);

        // make all sub-nodes visible and add colliders
        this.app.showAll(inst);
        
        inst.worldObject = this;
        inst.worldId = this.lastInstanceId;

        // Outgoing connections to other object instances
        // Each key maps to an array of connections, themselves objects:
        //      {
        //          to: worldId,
        //          msg: 'message string',
        //          p: {}
        //      }
        //  (keys are short for storage efficiency)
        if(typeof woInstData.ev != 'undefined') inst.event = woInstData.ev;
        else inst.events = {};

        // Set state flags
        if(typeof woInstData.s1 != 'undefined') inst.isOpened = woInstData.s1;
        else inst.isOpened = null;
        
        inst.inspectableCustomProperties = [
            {
                label: "worldId",
                propertyName: "worldId",
                type: BABYLON.InspectableType.String
            },
            {
                label: "isOpened",
                propertyName: "isOpened",
                type: BABYLON.InspectableType.Boolean
            }
        ];

        // position
        if(typeof woInstData.po != 'undefined') inst.position = woInstData.po;

        // rotation
        if(typeof woInstData.ro != 'undefined') inst.rotationQuaternion = woInstData.ro;


        
        this.instances[this.lastInstanceId] = inst;
        console.log('createInstance['+this.name+']:', inst);

        return inst;
    }

    // Remove an instance from our list of instances so that it can be GC'd and so that
    // we don't serialize it when saving the world
    disposeInstance(inst) {
        if(!inst) return;
        let index = this.instances.indexOf(inst);
        if(index > -1) {
            this.instances.splice(index, 1);
        }
        inst.dispose();
    }

    // Dispose all instances created by this object and clear the instance tracking
    // array so they are not serialized, and can be GC'd
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
                'wo': wo.name,                          // (keys are short for storage efficiency)
                'id': inst.worldId,
                'po': inst.position,
                'ro': inst.rotationQuaternion,
                's1': inst.isOpened,
                'ev': inst.events
            });
        });
        console.log(result);
        return result;
    }

    // Adds a connection from one instance's event to another instance's incoming message/action
    //      For example:
    //          fromInst = <button instance>
    //          toInst   = <door instance>
    //          event    = "button pushed"
    //          message  = "open door"
    //          props    = {}
    addConnection(fromInst, toInst, event, message, props = {}) {
        // Create array for this event if it doesn't exist yet
        if(typeof fromInst.events[event] == 'undefined') {
            fromInst.events[event] = [];
        }

        // Add a connection object to the event list
        fromInst.events[event].push({
            wo: toInst.worldObject.name,
            to: toInst.worldId,
            msg: message,
            p: props
        })
    }

    // Trigger an event of an instance of this object, triggering all messages on conencted
    // objects
    triggerEvent(eventName) {
        if(typeof fromInst.events[eventName] != 'undefined') {
            fromInst.events[eventName].forEach((eventConn) => {
                this.app.BuildableObjectList.forEach((woObject) => {
                    if(eventConn.wo == woObject.name) {
                        woObject.handleMessage(eventConn);
                    }
                });
            })
        }
    }

    // Recieve a message from another object, accepts an object generated by addConnection
    handleMessage(event) {
        var targetInst = null;
        this.instances.forEach((inst) => {
            if(inst.worldId == event.id) {
                targetInst = inst;
                return false;
            }
        });
        
        if(null == targetInst) {
            console.log('Invalid instance target: '+JSON.stringify(event));
            return;
        }

        switch(message) {
        case 'dispose':
            this.disposeInstance(targetInst);
            break;
        case 'open':
            targetInst.isOpened = true;
            break;
        case 'close':
            targetInst.isOpened = false;
            break;
        }
    }
}
