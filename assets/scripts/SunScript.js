// SunScript
// ---------
// Makes l_sun a day/night controller: while a sun is placed, play-mode time
// flows through a full cycle (params.cycle seconds), driving the scene's
// hemispheric light (bright noon, dim night, warm dawn/dusk tint) and the
// sky color between the CAPTURED day baseline and a deep-night version of
// it -- capturing at play start means hex themes and custom skies compose
// instead of being overwritten. Build mode restores the baseline exactly
// (nobody edits in the dark), and so does removing the sun.
//
// Wiring: dawn / noon / dusk / midnight fire as time crosses each quarter
// (dawn also fires at play start -- a run begins at first light). Inputs
// start/stop freeze and resume time. A play reset returns to dawn. With
// several suns placed, the first live one keeps the clock; spares idle.
class SunScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'cycle', label: 'Cycle (seconds)', type: 'number', options: [30, 60, 120], default: 60 },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'start', label: 'Start Time' },
            { id: 'stop', label: 'Stop Time' },
        ];
        this.outputs = [
            { id: 'dawn', label: 'Dawn' },
            { id: 'noon', label: 'Noon' },
            { id: 'dusk', label: 'Dusk' },
            { id: 'midnight', label: 'Midnight' },
        ];

        this._t = 0;
        this._running = true;
        this._wasPlay = null;
        this._dayClear = null;      // captured baseline sky
        this._dayIntensity = null;  // captured baseline light intensity
        this._dayDiffuse = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    onInput(action) {
        if (action === 'start') this._running = true;
        else if (action === 'stop') this._running = false;
    }

    onPlayReset(mode) {
        this._t = 0;
        this._running = true;
        this._fireMark('dawn');
    }

    _light() { return this.app.scene.getLightByName('light1'); }

    // Only the first live sun keeps the clock.
    _isPrimary() {
        const live = this.wo.instances.filter(Boolean);
        return live.length > 0 && live[0] === this.inst;
    }

    _capture() {
        const light = this._light();
        if (!light) return;
        this._dayClear = this.app.scene.clearColor.clone();
        this._dayIntensity = light.intensity;
        this._dayDiffuse = light.diffuse.clone();
    }

    _restore() {
        const light = this._light();
        if (!light || this._dayClear == null) return;
        this.app.scene.clearColor = this._dayClear.clone();
        light.intensity = this._dayIntensity;
        light.diffuse = this._dayDiffuse.clone();
        this._dayClear = null;
    }

    _fireMark(id) { this.app.fireEvent(this.inst, id); }

    update(isPlayMode, mode) {
        if (!this._isPrimary()) return;

        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                this._restore();   // never edit in the dark
                this._t = 0;
                this._running = true;
            }
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            this._capture();
            this._t = 0;
            this._fireMark('dawn');   // a run begins at first light
        }

        if (this._running) {
            const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
            const prev = this._t;
            this._t = (this._t + dt / (this.getParam('cycle') || 60)) % 1;
            // Quarter marks, wrap-aware (dawn = the wrap through 0).
            const crossed = (m) => (prev < this._t)
                ? (prev < m && this._t >= m)
                : (prev < m || this._t >= m);   // wrapped past 1
            if (prev > this._t) this._fireMark('dawn');
            if (crossed(0.25)) this._fireMark('noon');
            if (crossed(0.5)) this._fireMark('dusk');
            if (crossed(0.75)) this._fireMark('midnight');
        }

        // Drive the mood: t 0=dawn, .25=noon, .5=dusk, .75=midnight.
        const light = this._light();
        if (!light || !this._dayClear) return;
        const sunUp = Math.sin(this._t * Math.PI * 2);           // + by day, - by night
        const dayness = Math.max(0, sunUp);                       // 0..1
        const duskness = Math.max(0, 1 - Math.abs(sunUp) * 3);    // peaks at dawn/dusk
        light.intensity = this._dayIntensity * (0.25 + 0.75 * dayness);
        light.diffuse = new BABYLON.Color3(
            Math.min(1, this._dayDiffuse.r * (0.55 + 0.45 * dayness + duskness * 0.5)),
            this._dayDiffuse.g * (0.5 + 0.5 * dayness + duskness * 0.15),
            this._dayDiffuse.b * (0.55 + 0.45 * dayness));
        const nightMix = 1 - dayness;
        this.app.scene.clearColor = new BABYLON.Color4(
            this._dayClear.r * (1 - 0.85 * nightMix),
            this._dayClear.g * (1 - 0.85 * nightMix),
            this._dayClear.b * (1 - 0.6 * nightMix),
            this._dayClear.a != null ? this._dayClear.a : 1);
    }
}
