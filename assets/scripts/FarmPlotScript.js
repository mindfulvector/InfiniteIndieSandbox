// FarmPlotScript
// --------------
// A crop plot that grows sidekick food. In play mode the plot sprouts
// glowberries that grow through stages (dt-based, fps-independent); when
// ripe, walking over the plot harvests them for sidekick FOOD (the premium
// feeding currency -- see App.feedSidekick). autoReplant immediately starts
// the next crop, so a berry farm runs itself.
//
//   params:  growTime (seconds to ripen), autoReplant (yes/no)
//   inputs:  plant (re-sow an empty plot by wire)
//   outputs: harvested (edge per harvest -- feed it to counters/quests)
//
// The crop child mesh gets its OWN material on first touch: clone children
// share the template's material, and tinting the shared one would repaint
// every plot in the world (and the template).
class FarmPlotScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'growTime',    label: 'Grow time',  type: 'number', options: [5, 10, 20, 40], default: 20, unit: 's' },
            { key: 'autoReplant', label: 'Replant',    type: 'enum',   options: ['yes', 'no'],   default: 'yes' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'plant', label: 'Plant' },
        ];
        this.outputs = [
            { id: 'harvested', label: 'Harvested' },
        ];

        this.stage = 0;        // 0 empty, 1 growing, 2 ripe
        this.progress = 0;     // 0..1 within the growing stage
        this._crop = null;
        this._cropMat = null;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) {
        if (action === 'plant' && this.stage === 0) this._sow();
    }

    _sow() {
        this.stage = 1;
        this.progress = 0;
    }

    // Resolve the crop child and give it a per-instance material once.
    _resolveCrop() {
        if (this._crop && !this._crop.isDisposed()) return this._crop;
        const kids = this.inst.getChildMeshes ? this.inst.getChildMeshes() : [];
        this._crop = kids.find((m) => m.name && m.name.indexOf('crop') >= 0) || null;
        if (this._crop && !this._cropMat) {
            this._cropMat = new BABYLON.StandardMaterial('cropMat[' + this.inst.worldId + ']', this.app.scene);
            this._cropMat.disableLighting = true;
            this._crop.material = this._cropMat;
        }
        return this._crop;
    }

    _paintCrop() {
        const crop = this._resolveCrop();
        if (!crop || !this._cropMat) return;
        if (this.stage === 0) {
            crop.scaling.setAll(0.01);   // bare soil
            return;
        }
        const s = 0.25 + this.progress * 1.1;
        crop.scaling.setAll(this.stage === 2 ? 1.35 : s);
        // Green while growing, warm glowberry gold when ripe.
        this._cropMat.emissiveColor = this.stage === 2
            ? new BABYLON.Color3(1.0, 0.8, 0.25)
            : new BABYLON.Color3(0.25, 0.75 * (0.5 + this.progress * 0.5), 0.25);
    }

    update(isPlayMode, mode) {
        if (!isPlayMode) {
            if (this._wasPlay !== false) this._wasPlay = false;
            // Build mode shows the plot as sown-but-young so it reads as a farm.
            this._paintCrop();
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (this.stage === 0) this._sow();   // fresh session: start growing
        }

        if (this.stage === 1) {
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            this.progress += dt / Math.max(1, this.getParam('growTime') || 20);
            if (this.progress >= 1) {
                this.progress = 1;
                this.stage = 2;
            }
        } else if (this.stage === 2) {
            // Ripe: walking over the plot harvests.
            const player = mode && mode.player;
            if (player) {
                const p = this.inst.getAbsolutePosition ? this.inst.getAbsolutePosition() : this.inst.position;
                const flat = Math.hypot(player.position.x - p.x, player.position.z - p.z);
                if (flat < 1.2 && Math.abs(player.position.y - p.y) < 2.5) {
                    this.app.addSidekickFood(2);
                    this.app.fireEvent(this.inst, 'harvested');
                    this.app.toasty('Harvested glowberries!  (+2 sidekick food)');
                    if (this.getParam('autoReplant') === 'yes') this._sow();
                    else { this.stage = 0; this.progress = 0; }
                }
            }
        }
        this._paintCrop();
    }
}
