class WorldObject {
    // Rebuild a Vector3 from either a live Vector3 or a JSON-parsed plain object
    // (Babylon serializes Vector3 with _x/_y/_z backing fields).
    static toVector3(o) {
        if (o instanceof BABYLON.Vector3) return o.clone();
        const x = (o._x !== undefined) ? o._x : o.x;
        const y = (o._y !== undefined) ? o._y : o.y;
        const z = (o._z !== undefined) ? o._z : o.z;
        return new BABYLON.Vector3(x || 0, y || 0, z || 0);
    }

    // Rebuild a Quaternion from a live Quaternion or a JSON-parsed plain object.
    static toQuaternion(o) {
        if (o instanceof BABYLON.Quaternion) return o.clone();
        const x = (o._x !== undefined) ? o._x : o.x;
        const y = (o._y !== undefined) ? o._y : o.y;
        const z = (o._z !== undefined) ? o._z : o.z;
        const w = (o._w !== undefined) ? o._w : o.w;
        return new BABYLON.Quaternion(x || 0, y || 0, z || 0, (w === undefined ? 1 : w));
    }

    constructor(app, name, mesh, nestedMeshes=false, scriptClass=null) {
        this.app = app;
        this.name = name;
        this.mesh = mesh;
        this.nestedMeshes = nestedMeshes;
        this.scriptClass = scriptClass;
        this.lastInstanceId = 0;
        this.instances = [];
        this.tag = 'world.' + this.name.replaceAll(' ', '_');

        // How the object snaps to the build cursor when placed:
        //   'above' (default): the object's BASE sits on the cursor, so it rests
        //           on top of the surface (a tree, a wall, a prop).
        //   'below': the object's TOP sits at the cursor, so its top (walking)
        //           surface lines up with the cursor height and the body extends
        //           below -- terrain tiles of different thicknesses then share a
        //           seamless top surface.
        this.anchor = 'above';
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
            // A clone inherits the template's invisibility on the ROOT mesh;
            // showAll below only walks children, so multi-prim roots (which
            // have real geometry, unlike gltf transform roots) must be shown
            // here. InstancedMesh (the else branch) renders regardless.
            inst.isVisible = true;
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

        // showAll only walks CHILD meshes, so single-mesh instances (all the
        // primitive objects, incl. the terrain tiles) never got a collider on
        // this path -- terrain placed by New Game set it explicitly, but tiles
        // recreated by loadFromSlot did not, so loaded worlds had walk-through
        // ground. Enable it on the instance root here; scripts that must not
        // collide (triggers, pickups) already disable it every frame.
        inst.checkCollisions = true;
        
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
        if(typeof woInstData.ev != 'undefined') inst.events = woInstData.ev;
        else inst.events = {};

        // Event wiring: outgoing links from this instance's output events to
        // other instances' input actions. Each wire is a plain object:
        //      { event: 'entered', toWo: 'l_spawner', toId: 3, action: 'spawn' }
        // ('wi' key for storage efficiency). Built and edited in the wiring view.
        if(typeof woInstData.wi != 'undefined' && woInstData.wi) inst.wires = woInstData.wi;
        else inst.wires = [];

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

        // Apply saved object position, rotation and scale. These come back from
        // JSON as plain objects (e.g. {_x,_y,_z}), NOT real Vector3/Quaternion,
        // so they must be rebuilt -- assigning the raw object to inst.position
        // would silently break the instance's transform on load.
        if(typeof woInstData.po != 'undefined' && woInstData.po != null) {
            inst.position = WorldObject.toVector3(woInstData.po);
        }
        if(typeof woInstData.ro != 'undefined' && woInstData.ro != null) {
            inst.rotationQuaternion = WorldObject.toQuaternion(woInstData.ro);
        }
        if(typeof woInstData.sc != 'undefined' && woInstData.sc != null) {
            inst.scaling = WorldObject.toVector3(woInstData.sc);
        }

        
        // Store indexed reference to the instance so it can be retrieved by ID instantly,
        // if needed
        this.instances[this.lastInstanceId] = inst;

        // Log the instance name only -- logging the whole mesh object serialises a
        // huge (and cyclic) Babylon node, which is very slow when a remote debugger
        // is attached and murders build times when creating many instances at once.
        console.log('createInstance['+this.name+']: '+instName);

        // If a script class is defined, create an instance of it. The script file itself
        // is included for us by either the HTML file, a Manifest or the App class.
        if(null != this.scriptClass) {
            inst.script = eval("new " + this.scriptClass + "(this.app, this, inst)");
        } else {
            inst.script = null;
        }

        // Initialise editable per-instance parameters from the script's schema
        // (paramDefs), applying any values restored from a save file (pr).
        if(inst.script && inst.script.paramDefs) {
            inst.params = {};
            inst.script.paramDefs.forEach((pdef) => { inst.params[pdef.key] = pdef.default; });
            if(typeof woInstData.pr != 'undefined' && woInstData.pr) {
                Object.assign(inst.params, woInstData.pr);
            }
        } else {
            inst.params = (typeof woInstData.pr != 'undefined' && woInstData.pr) ? woInstData.pr : {};
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
                // Scripts that animate position (e.g. bobbing pickups) set
                // inst.restY to their true rest height so a mid-animation save
                // doesn't bake the offset into the file.
                'po': (inst.restY != null)
                    ? new BABYLON.Vector3(inst.position.x, inst.restY, inst.position.z)
                    : inst.position,
                'ro': inst.rotationQuaternion,
                'sc': inst.scaling,
                's1': inst.isOpened,
                'ev': inst.events,
                'pr': inst.params,       // editable parameter values
                'wi': inst.wires         // event wiring (see createInstance)
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
