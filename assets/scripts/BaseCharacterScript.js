class BaseCharacterScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        this.state = {
            isPlayer: false,
        };
    }

    // Called when the Character is actually created as a player avatar or NPC
    spawned(isPlayer) {
        this.state.isPlayer = isPlayer;
    }

    // Incoming message from another object
    message(msg) {
        switch(msg) {
            break;
        }
    }

    // Called once per frame when an object with this script is active
    update(isPlayMode, modeObject) {
        
    }
}
