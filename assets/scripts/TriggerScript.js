class TriggerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        this.state = {
            entered: [],
        };
    }

    // Incoming message from another object
    message(msg) {
        switch(msg) {
        case 'open':
            if(this.state.closed) {
                this.state.closed = false;
                this._startOpeningAnimation();
            }
            break;
        case 'close':
            if(!this.state.closed) {
                this.state.closed = true;
                this._startClosingAnimation();
            }
            break;
        }
    }

    // Called once per frame when an object with this script is active
    update(isPlayMode, modeObject) {
        if(!isPlayMode) {
            this.inst.isVisible = true;
            this.inst.isPickable = true;
        } else {
            this.inst.isVisible = false;
            this.inst.isPickable = false;
            this.inst.checkCollisions = false;
            if(typeof modeObject.player != 'undefined') {
                if(this.inst.intersectsMesh(modeObject.player)) {
                    if(typeof this.state.entered[modeObject.player.uniqeId] == 'undefined' || !this.state.entered[modeObject.player.uniqeId]) {
                        console.log('player entered trigger area '+this.inst.worldId);
                        this.state.entered[modeObject.player.uniqeId] = true;
                    }
                } else {
                    if(typeof this.state.entered[modeObject.player.uniqeId] != 'undefined' && this.state.entered[modeObject.player.uniqeId]) {
                        console.log('player exited trigger area '+this.inst.worldId);
                        this.state.entered[modeObject.player.uniqeId] = false;
                    }
                }
            }
        }
    }
}
