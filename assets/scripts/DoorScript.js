class DoorScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        this.state = {
            closed: true,
            //opening: false,
            //closing: false,
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

    // Don't call from outside this script!
    _startOpeningAnimation() {
        const frameRate = 60;

        //this.state.opening = true;
        //this.state.closing = false;
        //this.state.t = 0;

        const sweep = new BABYLON.Animation(
                "sweep",
                "rotation.y",
                frameRate,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

        const sweep_keys = [];

        sweep_keys.push({
          frame: 0,
          value: 0,
        });

        sweep_keys.push({
          frame: 3 * frameRate,
          value: 0,
        });

        sweep_keys.push({
          frame: 5 * frameRate,
          value: Math.PI / 3,
        });

        sweep_keys.push({
          frame: 13 * frameRate,
          value: Math.PI / 3,
        });

        sweep_keys.push({
          frame: 15 * frameRate,
          value: 0,
        });

        sweep.setKeys(sweep_keys);

        this.app.scene.beginDirectAnimation(this.inst, [sweep], 0, 25 * frameRate, false);
    }

    _startClosingAnimation() {
        //this.state.opening = true;
        //this.state.closing = false;
        //this.state.t = 0;
    }

    // Called once per frame when an object with this script is active
    update() {
        /*
        if(this.state.opening || this.state.closing) {
            // Increment ticks for animation
            this.state.t++;

            // Clamp ticks to 60
            if(this.state.t > 60) {
                this.state.opening = false;
                this.state.closing = false;
                this.state.t = 60;
            }

            // Update door rotation to match ticks increment:
            //      0 = no progress
            //      60 = complete

        }
        */
    }
}
