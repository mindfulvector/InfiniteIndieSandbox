// DoorScript
// ----------
// Makes pr_door a wirable sliding (pocket) door: the frame's two jambs stay
// put and the named 'panel' child slides sideways behind a jamb to open the
// gap. Sliding (not swinging) keeps the collision honest on any mesh type and
// never pokes through an in_wall_door wall around it.
//
//   inputs:  open / close / toggle
//   outputs: opened / closed  (edge-triggered: fired once when the slide
//            completes, so door -> counter chains count each cycle once)
//   params:  startOpen — the state the door snaps to when a play session
//            starts (onPlayReset also returns it there)
//
// The panel only animates in play mode; in build mode the door always shows
// closed so placement reads the true footprint. The slide is applied as an
// offset from the panel's authored local position each frame, so nothing
// permanent is baked into the transform (saves stay clean).
class DoorScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'startOpen', label: 'Start open', type: 'enum', options: ['no', 'yes'], default: 'no' },
            { key: 'texture', label: 'Texture', type: 'enum', options: ['wood', 'planks', 'brick', 'marble'], default: 'wood' },
            { key: 'tint', label: 'Tint', type: 'enum',
              options: ['none', 'red', 'orange', 'gold', 'green', 'blue', 'purple', 'white'], default: 'none' },
        ];
        // Closed-by-default is right nearly always; don't interrupt room
        // building with a params popup on every placement (edit via cursor
        // mode + Space when needed).
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'open',   label: 'Open' },
            { id: 'close',  label: 'Close' },
            { id: 'toggle', label: 'Open/Close' },
        ];
        this.outputs = [
            { id: 'opened', label: 'Opened' },
            { id: 'closed', label: 'Closed' },
        ];

        this.SLIDE = 1.15;    // how far the panel travels (panel is 1.2 wide)
        this._t = 0;          // slide progress: 0 = closed, 1 = fully open
        this._target = 0;
        this._panel = null;   // resolved lazily from the instance's children
        this._panelBaseX = 0;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    isOpen() { return this._target === 1; }

    onInput(action) {
        if (action === 'open') this._target = 1;
        else if (action === 'close') this._target = 0;
        else if (action === 'toggle') this._target = this._target === 1 ? 0 : 1;
    }

    // Death / run reset returns the door to its configured starting state.
    onPlayReset(mode) {
        this._target = (this.getParam('startOpen') === 'yes') ? 1 : 0;
        this._t = this._target;
        this._applySlide();
    }

    _resolvePanel() {
        if (this._panel && !this._panel.isDisposed()) return this._panel;
        const kids = this.inst.getChildMeshes ? this.inst.getChildMeshes() : [];
        // Clones prefix child names with the instance name
        // ('world.pr_door[1].panel[68]'), so match anywhere in the name.
        this._panel = kids.find((m) => m.name && m.name.indexOf('panel') >= 0) || null;
        if (this._panel) this._panelBaseX = this._panel.position.x;
        return this._panel;
    }

    _applySlide() {
        const panel = this._resolvePanel();
        if (panel) panel.position.x = this._panelBaseX + this._t * this.SLIDE;
    }

    update(isPlayMode, mode) {
        // Texture + tint settings; untouched doors keep the authored look.
        const tex = this.getParam('texture'), tint = this.getParam('tint');
        if (this.inst._lookKey !== undefined || tex !== 'wood' || tint !== 'none') {
            this.app.applyInstanceLook(this.inst, tex, tint, null);
        }
        if (!isPlayMode) {
            // Build mode: always closed, so the placement footprint is honest.
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._t = 0; this._target = 0;
                this._applySlide();
            }
            return;
        }
        if (this._wasPlay !== true) {
            // Only a genuine build -> play TRANSITION snaps to the configured
            // starting state. A door created mid-play has _wasPlay === null
            // and must keep any state already commanded (e.g. a test or wire
            // opening it the frame it was spawned) -- the same tri-state
            // pattern the counter uses to survive its first update frame.
            const createdMidPlay = this._wasPlay === null;
            this._wasPlay = true;
            if (!createdMidPlay) {
                this._target = (this.getParam('startOpen') === 'yes') ? 1 : 0;
                this._t = this._target;
                this._applySlide();
                return;
            }
        }
        if (this._t !== this._target) {
            const step = 0.08;   // frames-based, like the combat cooldowns
            const before = this._t;
            this._t = (this._t < this._target)
                ? Math.min(this._target, this._t + step)
                : Math.max(this._target, this._t - step);
            this._applySlide();
            // Edge-fire completion outputs exactly once per finished slide.
            if (before !== this._t && this._t === this._target) {
                this.app.fireEvent(this.inst, this._target === 1 ? 'opened' : 'closed');
            }
        }
    }
}
