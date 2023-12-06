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

        // Create an instance name from the object tag+brackets+instanceId
        const instName = this.tag + '[' + this.lastInstanceId + ']';

        // Create actual clone or instance -- we clone template objects that have nested meshes
        // because non-mesh nodes cannot be instanced.
        // TODO: Need to investigate if performance or memory
        // footprint can be improved by doing our own deep clone and creating instances of each
        // mesh node instead. I tend to not think so though because that'd be an obvious engine
        // optimization? Unless there is some significant downside of course...
        if(this.nestedMeshes) {
            var inst = this.mesh.clone(instName);
        } else {
            var inst = this.mesh.createInstance(instName);
        }

        // Add three tags: 'worldObject', 'world.<object_name>' and 'world.<object_name>[<index>]'
        // Note: tags aren't actually being used for retrival because our root nodes are not always
        // meshes and I'm not sure how to universally get all tagged objects across node types...
        // actually using these tags are originally intended would seem to be a good performance
        // update potentially (need to test that first, however).
        BABYLON.Tags.EnableFor(inst);
        inst.addTags('worldObject ' + this.tag + ' ' + instName);

        // Make all sub-nodes visible and add colliders to them
        this.app.showAll(inst);
        
        // Store reference to the engine object for use in scripts, etc.
        inst.worldObject = this;

        // Store the instance ID as worldId for use in scripts, etc.
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
        
        // Make some custom properties visible in the inspector
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

        // Apply saved object position and rotation
        if(typeof woInstData.po != 'undefined') inst.position = woInstData.po;
        if(typeof woInstData.ro != 'undefined') inst.rotationQuaternion = woInstData.ro;
        if(typeof woInstData.sc != 'undefined') {
            inst.scaling = new BABYLON.Vector3(woInstData.sc._x,woInstData.sc._y,woInstData.sc._z);
        }

        
        // Store indexed reference to the instance so it can be retrieved by ID instantly,
        // if needed
        this.instances[this.lastInstanceId] = inst;

        console.log('createInstance['+this.name+']:', inst);

        // If a script class is defined, create an instance of it. The script file itself
        // is included for us by either the HTML file, a Manifest or the App class.
        if(null != this.scriptClass) {
            inst.script = eval("new " + this.scriptClass + "(this.app, this, inst)");
        } else {
            inst.script = null;
        }

        // If we have a script with a createMaterial implementation and we don't yet have
        // a scripted material cached, call the method to create the material.
        if(null != inst.script 
                && typeof inst.script.createMaterial != 'undefined' 
                && typeof this.scriptedMaterial == 'undefined')
        {
            this.scriptedMaterial = inst.script.createMaterial();
        }

        // If we have a cached scripted material, use it
        if(typeof this.scriptedMaterial != 'undefined') {
            this.mesh.material = this.scriptedMaterial;
        }

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
                'sc': inst.scaling,
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

    // Update all instances once per frame
    updateAllInstances(isPlayMode, modeObject) {
        const app = this.app;
        const wo = this;
        let result = [];
        this.instances.forEach((inst) => {
            if(null != inst.script) {
                inst.script.update(isPlayMode, modeObject);
            }
        });
    }

    nodePropsMenu(selection) {
        const wo = this;
        const app = this.app;

        let woInstances = [];

        selection.forEach((node) => {
            if(node.worldObject == wo) {
                woInstances.push(node);
            }
        });

        if(woInstances.length > 1) {
            app.MenuItem({
                type: 'text',
                name: 'menuTooManyObjectsWarning',
                text: '> Please select 1 object for editing. <',
            });
        } else {
            let eventDefNum = 0;
            selection[0].script.eventDefs.forEach((eventDef) => {
                eventDefNum++;
                app.MenuItem({
                    type: 'button',
                    name: 'menuEventsBtn_'+eventDefNum,
                    text: 'Event #'+eventDefNum+' '+eventDef.id,
                    handler: () => {
                        app.menu.state = MENU_OBJ_EVENT_BINDINGS;
                        app.menu.eventDefNum = eventDefNum;
                        app.menu.eventDefInfo = eventDef;
                    }
                });
            });
        }
    }

    triggerMenuItem(menuState, menuItem) {
        const app = this.app;

        switch(menuState) {
        case MENU_OBJ_PROPS:
            if(app.activeMode.selection.length > 0) {
                let node = app.activeMode.selection[0];
                let eventNum = 1;

                app.MenuItem({
                    type: 'button',
                    name: 'menuEventsBtn_'+eventNum,
                    text: '1. New',
                    handler: () => {
                        app.menu.state = MENU_OBJ_EVENT_BINDING_EDIT;
                        app.menu.eventNum = eventNum;
                        app.menu.eventInfo = {};
                    }
                });

                app.activeMode.selection[0].script.eventDefs.forEach((eventDef) => {
                    eventNum++;
                    if(typeof node.worldObject == this) {
                        // Display existing events for this event ID
                        node.events[eventDef.id].forEach((event) => {
                            app.MenuItem({
                                type: 'button',
                                name: 'menuEventsBtn_'+eventNum,
                                text: 'To '+event.wo+'#'+event.to+' = '+event.msg + JSON.stringify(event.p),
                                handler: () => {
                                    app.menu.state = MENU_OBJ_EVENT_BINDING_EDIT;
                                    app.menu.eventNum = eventNum;
                                    app.menu.eventInfo = event;
                                }
                            });
                        });
                    }
                });
            }
            break;
        case MENU_OBJ_EVENT_BINDING_EDIT:
            
            break;
        }
    }
}
