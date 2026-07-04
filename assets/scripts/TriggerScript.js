// TriggerScript
// -------------
// A translucent trigger volume. In play mode it detects the player entering and
// leaving its bounds and fires wired output events ('entered' / 'exited'), which
// the wiring view can connect to other objects' inputs (e.g. a spawner's 'spawn'
// or 'enable'). In build mode it stays visible so the player can see and move it.
class TriggerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isTrigger = true;
        this.state = {
            activated: false,
            entered: [],
        };

        // A co-op gate: with coop='yes', `entered` only fires when the
        // player AND at least one live buddy are both inside -- a two-player
        // pressure plate for split-screen Play Sets.
        this.paramDefs = [
            { key: 'coop', label: 'Needs 2 players', type: 'enum', options: ['no', 'yes'], default: 'no' },
        ];
        this.noAutoParams = true;

        // Output events this object can fire (shown/wired in the wiring view).
        this.outputs = [
            { id: 'entered', label: 'Player Enters' },
            { id: 'exited',  label: 'Player Exits' },
        ];

        // Legacy event bindings menu compatibility.
        this.eventDefs = [
            { id: 'entered:player' },
            { id: 'exited:player' },
        ];
    }

    // Player death resets the run: forget who was inside so re-entering the
    // volume after the respawn fires `entered` again.
    onPlayReset(mode) {
        this.state.activated = false;
        this.state.entered = [];
        this._coopIn = false;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    // How many party members (player + live buddies) are inside the volume.
    _partyInside(mode) {
        let n = 0;
        if (mode.player && this.inst.intersectsMesh(mode.player, false)) n++;
        (mode.buddies || []).forEach((b) => {
            if (b && b.root && this.inst.intersectsMesh(b.root, false)) n++;
        });
        return n;
    }

    // Incoming message from another object (legacy path, kept for compatibility).
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
        triggerMaterial.emissiveColor = new BABYLON.Color3(0.6, 0.6, 0.05);
        triggerMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        return triggerMaterial;
    }

    // Called once per frame, per object, whenever an object with this script is active
    update(isPlayMode, modeObject) {
        if(!isPlayMode) {
            // In build mode the volume is always visible/pickable so it can be
            // placed, selected and wired.
            this.inst.isVisible = true;
            this.inst.isPickable = true;
            this.inst.checkCollisions = false;
            return;
        }

        // Play mode: the volume is intangible; it just watches the player and
        // fires enter/exit events.
        this.inst.isVisible = true;
        this.inst.visibility = 0.28;   // faint so it doesn't obscure gameplay
        this.inst.isPickable = false;
        this.inst.checkCollisions = false;

        const player = modeObject && modeObject.player;
        if(!player) return;

        // Co-op gate: edge on "both here" instead of the single player.
        if(this.getParam('coop') === 'yes') {
            const bothHere = this._partyInside(modeObject) >= 2;
            if(bothHere && !this._coopIn) {
                this._coopIn = true; this.state.activated = true;
                this.app.fireEvent(this.inst, 'entered');
            } else if(!bothHere && this._coopIn) {
                this._coopIn = false; this.state.activated = false;
                this.app.fireEvent(this.inst, 'exited');
            }
            return;
        }

        const key = player.uniqueId != null ? player.uniqueId : 'player';
        // While driving, the VEHICLE trips triggers (the rider's feet sit
        // above most volumes; racing semantics want the kart on the line).
        const rider = modeObject.driving;
        const inside = this.inst.intersectsMesh(player, false) ||
            (rider ? this.inst.intersectsMesh(rider, false) : false);
        const wasInside = !!this.state.entered[key];

        if(inside && !wasInside) {
            this.state.entered[key] = true;
            this.state.activated = true;
            console.log('player entered trigger area ' + this.inst.worldId);
            this.app.fireEvent(this.inst, 'entered');
        } else if(!inside && wasInside) {
            this.state.entered[key] = false;
            this.state.activated = false;
            console.log('player exited trigger area ' + this.inst.worldId);
            this.app.fireEvent(this.inst, 'exited');
        }
    }
}
