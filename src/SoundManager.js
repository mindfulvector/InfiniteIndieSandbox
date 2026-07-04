// Procedurally-synthesised sound effects for the whole game, built on the Web
// Audio API. There are NO audio asset files: every effect is a tiny recipe of
// oscillators and filtered noise, which fits how the rest of the game works
// (procedural textures, runtime thumbnails) and keeps the download at zero.
//
// Usage: app.sound.play('jump'), app.sound.play('footstep', {surface:'wood'}).
//
// Design notes:
//  - Browsers gate audio behind a user gesture, so the AudioContext is created
//    lazily and resumed on the first pointer/key input.
//  - play() ALWAYS records the request in `recent` (a small ring buffer) even
//    when muted or when no audio device exists -- the headless test harness
//    asserts against that log, and it doubles as a debugging trace.
//  - Synthesis failures must never break gameplay: everything audible is
//    wrapped in try/catch and the game continues silently.
//  - The mute flag persists in localStorage ('iis_muted'); M toggles it.
class SoundManager {
    constructor(app) {
        this.app = app;
        this.ctx = null;        // lazily-created AudioContext
        this.master = null;     // master gain (overall volume)
        this.muted = window.localStorage.getItem('iis_muted') === '1';
        this.recent = [];       // ring buffer of {name, surface?, t} for tests/debug
        this._lastPlay = {};    // per-sound last-play time, for rate limiting
        this._noiseBuf = null;  // shared 1s white-noise buffer

        // Create/resume the context on the first real user input (autoplay policy).
        const unlock = () => {
            this._ensureContext();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        };
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }

    // Sounds that fire in rapid bursts get a minimum gap (ms) so a shower of
    // pixels or a held arrow key doesn't degenerate into noise.
    static rateLimitMs(name) {
        const limits = { 'pixel': 35, 'footstep': 90, 'menu-move': 45, 'glide': 120, 'enemy-shot': 60 };
        return (limits[name] != null) ? limits[name] : 15;
    }

    // Play a named effect. Returns true if the request was accepted (logged),
    // false if it was rate-limited away. Audible output additionally requires
    // an unlocked AudioContext and not being muted.
    play(name, opts = {}) {
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const last = this._lastPlay[name];
        if (last != null && now - last < SoundManager.rateLimitMs(name)) return false;
        this._lastPlay[name] = now;

        this.recent.push({ name: name, surface: opts.surface, t: now });
        if (this.recent.length > 120) this.recent.splice(0, this.recent.length - 120);

        if (this.muted) return true;
        this._ensureContext();
        if (!this.ctx) return true;
        try {
            this._synth(name, opts);
        } catch (e) {
            // Sound must never take the game down with it.
        }
        return true;
    }

    // Toggle the persistent mute flag; returns the NEW muted state.
    toggleMuted() {
        this.muted = !this.muted;
        try {
            window.localStorage.setItem('iis_muted', this.muted ? '1' : '0');
        } catch (e) { /* private-mode storage failures are fine */ }
        return this.muted;
    }

    _ensureContext() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.5;
            this.master.connect(this.ctx.destination);
        } catch (e) {
            this.ctx = null;    // no audio device: play() keeps logging silently
        }
    }

    // ---- synthesis helpers ----------------------------------------------------

    // Shared white-noise source material for all the percussive sounds.
    _noise() {
        if (!this._noiseBuf) {
            const len = this.ctx.sampleRate;   // 1 second
            this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = this._noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        }
        return this._noiseBuf;
    }

    // A single enveloped oscillator, optionally sweeping f0 -> f1 over `dur`.
    _tone(o) {
        const t0 = this.ctx.currentTime + (o.delay || 0);
        const osc = this.ctx.createOscillator();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(Math.max(1, o.f0), t0);
        if (o.f1 && o.f1 !== o.f0) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
        }
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(o.vol != null ? o.vol : 0.15, t0 + (o.at || 0.005));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + o.dur + 0.03);
    }

    // A burst of filtered noise, optionally sweeping the filter f -> f1.
    _noiseBurst(o) {
        const t0 = this.ctx.currentTime + (o.delay || 0);
        const src = this.ctx.createBufferSource();
        src.buffer = this._noise();
        const filt = this.ctx.createBiquadFilter();
        filt.type = o.type || 'lowpass';
        filt.frequency.setValueAtTime(Math.max(10, o.f || 800), t0);
        if (o.f1) filt.frequency.exponentialRampToValueAtTime(Math.max(10, o.f1), t0 + o.dur);
        filt.Q.value = o.q || 1;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(o.vol != null ? o.vol : 0.15, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(t0);
        src.stop(t0 + o.dur + 0.03);
    }

    // A short rising/falling sequence of notes (menus, fanfares, pickups).
    _arp(freqs, o = {}) {
        freqs.forEach((f, i) => {
            this._tone({
                f0: f, dur: o.dur || 0.09, type: o.type || 'triangle',
                vol: o.vol != null ? o.vol : 0.09, delay: (o.step || 0.07) * i,
            });
        });
    }

    // ---- footsteps: one recipe per walkable surface ----------------------------

    // Each surface gets its own timbre so the ground underfoot is audible:
    //   grass - soft rustle          dirt  - dull scuff with a low body
    //   wood  - hollow knock         stone - hard bright tap
    //   metal - ringing clank
    _footstep(surface) {
        const r = 0.9 + Math.random() * 0.2;   // step-to-step variation
        switch (surface) {
        case 'grass':
            this._noiseBurst({ dur: 0.09, vol: 0.11, type: 'lowpass', f: 700 * r });
            break;
        case 'dirt':
            this._noiseBurst({ dur: 0.10, vol: 0.13, type: 'lowpass', f: 320 * r });
            this._tone({ f0: 95 * r, f1: 60, dur: 0.06, vol: 0.06 });
            break;
        case 'wood':
            this._tone({ f0: 180 * r, f1: 95, dur: 0.07, vol: 0.15 });
            this._noiseBurst({ dur: 0.04, vol: 0.05, type: 'bandpass', f: 900 * r, q: 2 });
            break;
        case 'stone':
            this._noiseBurst({ dur: 0.05, vol: 0.11, type: 'bandpass', f: 1800 * r, q: 3 });
            this._tone({ f0: 140 * r, f1: 90, dur: 0.05, type: 'triangle', vol: 0.07 });
            break;
        case 'metal':
            this._tone({ f0: 420 * r, dur: 0.10, type: 'triangle', vol: 0.06 });
            this._tone({ f0: 587 * r, dur: 0.08, vol: 0.04 });
            this._noiseBurst({ dur: 0.03, vol: 0.07, type: 'highpass', f: 2500 });
            break;
        default:
            this._noiseBurst({ dur: 0.08, vol: 0.10, type: 'lowpass', f: 600 * r });
        }
    }

    // ---- the effect recipes -----------------------------------------------------

    _synth(name, opts) {
        switch (name) {
        // Locomotion.
        case 'footstep':    this._footstep(opts.surface); break;
        case 'jump':        this._tone({ f0: 240, f1: 460, dur: 0.14, vol: 0.13 }); break;
        case 'doubleJump':
            this._tone({ f0: 340, f1: 700, dur: 0.12, type: 'triangle', vol: 0.12 });
            this._tone({ f0: 900, f1: 1400, dur: 0.08, vol: 0.05, delay: 0.03 });
            break;
        case 'land':
            this._noiseBurst({ dur: 0.09, vol: 0.13, type: 'lowpass', f: 400 });
            this._tone({ f0: 75, f1: 45, dur: 0.07, vol: 0.10 });
            break;
        case 'glide':       this._noiseBurst({ dur: 0.28, vol: 0.04, type: 'bandpass', f: 500, q: 0.8 }); break;

        // Player combat.
        case 'melee-swing': this._noiseBurst({ dur: 0.12, vol: 0.12, type: 'bandpass', f: 1400, f1: 350, q: 1.2 }); break;
        case 'melee-hit':
            this._noiseBurst({ dur: 0.08, vol: 0.16, type: 'lowpass', f: 500 });
            this._tone({ f0: 150, f1: 60, dur: 0.08, type: 'square', vol: 0.09 });
            break;
        case 'melee-finisher':
            this._noiseBurst({ dur: 0.14, vol: 0.20, type: 'lowpass', f: 700, f1: 150 });
            this._tone({ f0: 90, f1: 40, dur: 0.16, vol: 0.14 });
            this._tone({ f0: 500, f1: 1200, dur: 0.10, type: 'triangle', vol: 0.06, delay: 0.02 });
            break;
        case 'ranged-shot':
            this._tone({ f0: 880, f1: 220, dur: 0.16, type: 'square', vol: 0.08 });
            this._noiseBurst({ dur: 0.04, vol: 0.03, type: 'highpass', f: 3000 });
            break;
        case 'shot-hit':
            this._noiseBurst({ dur: 0.06, vol: 0.12, type: 'lowpass', f: 900 });
            this._tone({ f0: 400, f1: 150, dur: 0.06, type: 'square', vol: 0.06 });
            break;
        case 'shot-blocked':
            this._noiseBurst({ dur: 0.04, vol: 0.10, type: 'bandpass', f: 2200, q: 4 });
            this._tone({ f0: 120, f1: 70, dur: 0.05, vol: 0.05 });
            break;
        case 'lock-on':
            this._tone({ f0: 1100, dur: 0.04, vol: 0.07 });
            this._tone({ f0: 1400, dur: 0.05, vol: 0.07, delay: 0.06 });
            break;
        case 'lock-off':    this._tone({ f0: 800, dur: 0.05, vol: 0.06 }); break;

        // Enemies.
        case 'enemy-shot':  this._tone({ f0: 500, f1: 150, dur: 0.18, type: 'square', vol: 0.05 }); break;
        case 'enemy-defeat':
            this._tone({ f0: 420, f1: 70, dur: 0.30, type: 'sawtooth', vol: 0.11 });
            this._noiseBurst({ dur: 0.25, vol: 0.10, type: 'lowpass', f: 800, f1: 150 });
            break;

        // Player survival.
        case 'player-hurt': this._tone({ f0: 140, f1: 75, dur: 0.14, type: 'square', vol: 0.13 }); break;
        case 'player-death':
            this._tone({ f0: 320, f1: 45, dur: 0.60, type: 'sawtooth', vol: 0.15 });
            this._noiseBurst({ dur: 0.45, vol: 0.09, type: 'lowpass', f: 600, f1: 100 });
            break;
        case 'respawn':     this._arp([392, 494, 587, 784], { type: 'sine', vol: 0.08 }); break;

        // Collection / economy / progression.
        case 'pixel':       this._tone({ f0: 1150 + Math.random() * 300, dur: 0.05, vol: 0.05 }); break;
        case 'pickup-health': this._arp([523, 659], { dur: 0.10, step: 0.08, vol: 0.10 }); break;
        case 'pickup-pixels': this._arp([988, 1319], { dur: 0.08, step: 0.06, type: 'square', vol: 0.06 }); break;
        case 'pickup-star':   this._arp([659, 831, 988], { dur: 0.10, step: 0.07, vol: 0.09 }); break;
        case 'levelup':
            this._arp([523, 659, 784, 1047], { dur: 0.14, step: 0.09, vol: 0.10 });
            this._noiseBurst({ dur: 0.35, vol: 0.03, type: 'highpass', f: 4000, delay: 0.25 });
            break;
        case 'purchase':
            this._tone({ f0: 900, dur: 0.05, vol: 0.07 });
            this._arp([988, 1319], { dur: 0.08, step: 0.06, type: 'square', vol: 0.06 });
            break;
        case 'denied':
            this._tone({ f0: 110, dur: 0.09, type: 'square', vol: 0.09 });
            this._tone({ f0: 92, dur: 0.12, type: 'square', vol: 0.09, delay: 0.11 });
            break;

        // UI / build / wiring.
        case 'menu-move':   this._tone({ f0: 600, dur: 0.035, vol: 0.05 }); break;
        case 'menu-select':
            this._tone({ f0: 850, dur: 0.05, vol: 0.07 });
            this._tone({ f0: 1150, dur: 0.04, vol: 0.05, delay: 0.04 });
            break;
        case 'place':
            this._tone({ f0: 220, f1: 120, dur: 0.06, vol: 0.12 });
            this._noiseBurst({ dur: 0.05, vol: 0.06, type: 'lowpass', f: 500 });
            break;
        case 'delete':      this._tone({ f0: 700, f1: 180, dur: 0.12, type: 'sawtooth', vol: 0.07 }); break;
        case 'wire-connect': this._tone({ f0: 320, f1: 980, dur: 0.12, vol: 0.08 }); break;
        case 'wire-delete':  this._tone({ f0: 980, f1: 260, dur: 0.12, vol: 0.08 }); break;

        default:
            // Unknown names still land in `recent` (useful while wiring up new
            // events) -- they just have no audible recipe yet.
            break;
        }
    }
}
