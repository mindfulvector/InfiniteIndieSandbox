class Character {
    constructor(app, name, mesh, nestedMeshes=false, scriptClass=null) {
        this.app = app;
        this.name = name;
        this.wo = new WorldObject(app, name, mesh, nestedMeshes, scriptClass);
    }

    // Spawns a defined character, optionally replacing the active player's character
    spawn(replacePlayer, charInstData={}) {
        let inst = this.wo.createInstance(charInstData);
        if(this.app.activeMode instanceof PlayMode) {
            if(replacePlayer) {
                const playMode = this.app.activeMode;

                // Default spawn position a little above origin so the player lands on the origin terrain tile
                let spawnPos = new BABYLON.Vector3(0, 1, 0);
                // If there's an existing player avatar, copy its position
                if(typeof playMode.player != 'undefined') {
                    spawnPos = playMode.player.position.clone();
                }
                inst.position = spawnPos;
                playMode.player = inst;
                if(typeof inst.script != 'unefined' && typeof inst.script.spawned != 'unefined') {
                    // Notify character script of the spawn, indicating it is a player
                    playMode.player.script.spawned(true);
                }
            }
        } else {
            if(typeof inst.script != 'unefined' && typeof inst.script.spawned != 'unefined') {
                // Notify character script of the spawn, indicating it is an NPC
                playMode.player.script.spawned(false);
            }
        }

    }
}
