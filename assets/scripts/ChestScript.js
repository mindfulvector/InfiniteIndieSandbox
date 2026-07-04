// ChestScript
// -----------
// Makes pr_chest a treasure chest: walk up to it (or fire the `open` input,
// or hit it) and the lid swings open, spilling a pixel reward as a homing
// burst -- the same loot payout enemies drop, so it credits through the
// existing pixel-burst loop. Fires `opened` for wiring (unlock the next
// room, tick a counter, cut a camera). One-shot per run; a play reset
// closes and re-arms it. The lid is a named 'lid' child rotated open, the
// pr_door pattern applied to a hinge.
class ChestScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'loot', label: 'Pixel reward', type: 'number', options: [10, 25, 50, 100], default: 25 },
            { key: 'auto', label: 'Open on touch', type: 'enum', options: ['yes', 'no'], default: 'yes' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'open', label: 'Open Chest' },
        ];
        this.outputs = [
            { id: 'opened', label: 'Chest Opened' },
        ];

        this._open = false;
        this._lidAngle = 0;
        this._lid = null;
        this._wasPlay = null;
        this._wantOpen = false;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) {
        if (action === 'open') this._wantOpen = true;
    }

    onPlayReset(mode) {
        this._open = false;
        this._wantOpen = false;
        this._lidAngle = 0;
        if (this._lid) this._lid.rotation.x = 0;
    }

    _lidMesh() {
        if (this._lid) return this._lid;
        const kids = this.inst.getChildMeshes ? this.inst.getChildMeshes() : [];
        this._lid = kids.find((m) => m.name && m.name.indexOf('lid') >= 0) || null;
        return this._lid;
    }

    _openChest(mode) {
        if (this._open) return;
        this._open = true;
        const pos = this.inst.getAbsolutePosition
            ? this.inst.getAbsolutePosition() : this.inst.position.clone();
        const loot = this.getParam('loot') || 25;
        // Spill as a homing burst (capped for perf); credit any overflow
        // directly so a 100-pixel chest still pays in full.
        const burst = Math.min(loot, 30);
        if (mode && mode.spawnPixelBurst) mode.spawnPixelBurst(pos.add(new BABYLON.Vector3(0, 0.6, 0)), burst);
        if (loot > burst) this.app.addPixels(loot - burst);
        this.app.sound.play('purchase');
        this.app.toasty('Treasure!  +' + loot + ' pixels');
        this.app.fireEvent(this.inst, 'opened');
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        const lid = this._lidMesh();
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._open = false; this._wantOpen = false; this._lidAngle = 0;
                if (lid) lid.rotation.x = 0;
            }
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            this._open = false; this._wantOpen = false; this._lidAngle = 0;
            if (lid) lid.rotation.x = 0;
        }

        // Open triggers: a wired `open`, a walk-up (if auto), or a melee hit
        // (the chest is flagged like an enemy so damageInArc reaches it, but
        // it has no hp -- a hit just pops it).
        if (!this._open) {
            let trip = this._wantOpen;
            if (!trip && this.getParam('auto') === 'yes' && mode && mode.player) {
                const d = BABYLON.Vector3.Distance(mode.player.position,
                    inst.getAbsolutePosition ? inst.getAbsolutePosition() : inst.position);
                if (d < 2.0) trip = true;
            }
            if (trip) this._openChest(mode);
        }

        // Ease the lid to its target angle either way.
        const target = this._open ? -2.0 : 0;   // hinge back ~115 degrees
        this._lidAngle += (target - this._lidAngle) * 0.2;
        if (lid) lid.rotation.x = this._lidAngle;
    }
}
