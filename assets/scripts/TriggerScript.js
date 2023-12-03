class TriggerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        this.state = {
            flicker: false,
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
    update() {
        if(this.app.activeMode instanceof BuildMode) {
            this.inst.isVisible = !this.inst.isVisible;
            this.inst.isPickable = true;
        } else {
            this.inst.isVisible = false;
            this.inst.isPickable = false;
            this.inst.checkCollisions = false;
        }
    }
}
