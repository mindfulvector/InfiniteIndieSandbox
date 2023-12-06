class TriggerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        this.state = {
            activated: false,
            entered: [],
        };
        this.eventDefs = [
            {
                id: 'entered:player',
            },
            {
                id: 'exited:player',
            }
        ];
    }

    // Incoming message from another object
    message(msg) {
        switch(msg) {
        case 'trigger:entered:player':
            
            break;
        case 'trigger:exited:player':
            
            break;
        }
    }

    // [Optional] If present, will be called once when the first object of this script is initialized and assigned
    // to the template object
    createMaterial() {
        let triggerMaterial = new BABYLON.StandardMaterial("triggerMaterial", this.app.scene);
        triggerMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        triggerMaterial.alpha = 0.5; // Translucent
        triggerMaterial.diffuseColor = new BABYLON.Color3(1.0, 1.0, 0.2);
        return triggerMaterial;
    }

    // Called once per frame, per object, whenever an object with this script is active
    update(isPlayMode, modeObject) {
        if(!isPlayMode) {
            this.inst.isVisible = true;
            this.inst.isPickable = true;
        } else {
            this.inst.isVisible = this.state.activated;
            this.inst.isPickable = false;
            this.inst.checkCollisions = false;
            if(typeof modeObject.player != 'undefined') {
                if(this.inst.intersectsMesh(modeObject.player)) {
                    if(typeof this.state.entered[modeObject.player.uniqeId] == 'undefined' || !this.state.entered[modeObject.player.uniqeId]) {
                        console.log('player entered trigger area '+this.inst.worldId);
                        this.state.activated = true;
                        this.state.entered[modeObject.player.uniqeId] = true;
                    }
                } else {
                    if(typeof this.state.entered[modeObject.player.uniqeId] != 'undefined' && this.state.entered[modeObject.player.uniqeId]) {
                        this.state.activated = false;
                        console.log('player exited trigger area '+this.inst.worldId);
                        this.state.entered[modeObject.player.uniqeId] = false;
                    }
                }
            }
        }
    }
}
