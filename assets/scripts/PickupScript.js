// PickupScript
// ------------
// A placeable pickup the player collects by touching it in play mode. One script
// drives all pickup objects; what it grants comes from the `effect` parameter
// (whose default is seeded per world object via defaultEffect below):
//   health - restores `amount` HP
//   pixels - grants `amount` pixels (the currency)
//   star   - a collectible: increments the mode's star count
// Pickups bob and spin so they read as collectable, fire a `collected` wiring
// output (so they can drive spawners/counters/etc.), and either respawn after a
// delay or stay gone, per the `respawn` parameter.
class PickupScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;
        inst.isPickup = true;

        // Per-object default effect: pk_health -> health, pk_pixels -> pixels,
        // pk_star -> star. Falls back to health for unknown names.
        const seed = ({ pk_health: 'health', pk_pixels: 'pixels', pk_star: 'star' })[wo.name] || 'health';

        this.paramDefs = [
            { key: 'effect',  label: 'Effect',  type: 'enum',   options: ['health', 'pixels', 'star'], default: seed },
            { key: 'amount',  label: 'Amount',  type: 'number', options: [5, 10, 25, 50, 100],          default: (seed === 'health' ? 25 : 10) },
            { key: 'respawn', label: 'Respawn', type: 'enum',   options: ['no', 5, 10, 30],             default: 'no', unit: 's' },
        ];
        this.eventDefs = [];

        // Wiring output: fires when the player collects this pickup, so pickups
        // can drive gameplay (e.g. star.collected -> spawner.spawn).
        this.outputs = [
            { id: 'collected', label: 'Collected' },
        ];

        this._baseY = null;      // rest height the bob oscillates around
        this._phase = Math.random() * Math.PI * 2;
        this._collected = false; // hidden, waiting to respawn (or be disposed)
        this._respawnAcc = 0;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    // No createMaterial(): a scripted material is cached per WORLD OBJECT and a
    // single shared tint would colour every pickup type the same. The manifest
    // colours each pickup's prim via col:[r,g,b] instead.

    // Apply the pickup's effect to the player/mode. Kept small and explicit.
    applyEffect(mode) {
        const effect = this.getParam('effect');
        const amount = this.getParam('amount');
        if (effect === 'health') {
            mode.playerHp = Math.min(mode.playerMaxHp, mode.playerHp + amount);
            this.app.toasty('+' + amount + ' HP');
        } else if (effect === 'pixels') {
            this.app.addPixels(amount);
            this.app.toasty('+' + amount + ' pixels');
        } else if (effect === 'star') {
            mode.starsCollected = (mode.starsCollected || 0) + 1;
            this.app.toasty('Star collected!  (' + mode.starsCollected + ')');
        }
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        inst.checkCollisions = false;   // never blocks movement

        if (!isPlayMode) {
            // Build mode: always visible and static so it can be placed/edited.
            // Cancel any pending respawn so the builder sees the real object.
            if (this._collected) { this._collected = false; this._respawnAcc = 0; }
            inst.isVisible = true;
            if (this._baseY !== null) {
                inst.position.y = this._baseY;   // undo any bob offset
                this._baseY = null;
            }
            return;
        }

        // Waiting to respawn?
        if (this._collected) {
            const respawn = this.getParam('respawn');
            if (respawn === 'no') return;   // stays gone (disposed below; safety)
            const dt = Math.min(0.1, this.app.scene.getEngine().getDeltaTime() / 1000);
            this._respawnAcc += dt;
            if (this._respawnAcc >= respawn) {
                this._collected = false;
                this._respawnAcc = 0;
                inst.isVisible = true;
            }
            return;
        }

        // Bob + spin so the pickup reads as collectable.
        if (this._baseY === null) this._baseY = inst.position.y;
        this._phase += 0.08;
        inst.position.y = this._baseY + Math.sin(this._phase) * 0.15;
        inst.rotate(BABYLON.Axis.Y, 0.05, BABYLON.Space.LOCAL);

        // Collect on touch.
        const player = mode && mode.player;
        if (!player) return;
        const p = inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position;
        if (BABYLON.Vector3.Distance(p, player.position.add(new BABYLON.Vector3(0, 1, 0))) <= 1.6) {
            this.applyEffect(mode);
            this.app.fireEvent(inst, 'collected');
            if (this.getParam('respawn') === 'no') {
                // One-shot: remove from the world entirely (won't re-save).
                // Restore the rest height first so a save right after is clean.
                inst.position.y = this._baseY !== null ? this._baseY : inst.position.y;
                this.wo.disposeInstance(inst);
            } else {
                this._collected = true;
                this._respawnAcc = 0;
                inst.isVisible = false;
            }
        }
    }
}
