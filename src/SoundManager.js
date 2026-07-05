// Sound effects for the whole game, built on the Web Audio API.
//
// Every event now plays a real recorded sample from the sound pack under
// assets/sounds/ (fetched + decoded lazily after the first user gesture).
// The original procedurally-synthesised recipes are kept as an automatic
// fallback: they cover the moments before a sample finishes loading, any
// file that fails to load, and events the pack has no good match for.
//
// Usage: app.sound.play('jump'), app.sound.play('footstep', {surface:'wood'}).
//
// Design notes:
//  - Browsers gate audio behind a user gesture, so the AudioContext is created
//    lazily and resumed on the first pointer/key input; sample preloading
//    starts at the same moment.
//  - play() ALWAYS records the request in `recent` (a small ring buffer) even
//    when muted or when no audio device exists -- the headless test harness
//    asserts against that log, and it doubles as a debugging trace. Audible
//    plays note HOW they sounded in `via` ('sample' or 'synth').
//  - Sound failures must never break gameplay: loading and playback are
//    wrapped so the game continues (synthesised, or silent) on any error.
//  - The mute flag persists in localStorage ('iis_muted'); M toggles it.
class SoundManager {
    constructor(app) {
        this.app = app;
        this.ctx = null;        // lazily-created AudioContext
        this.master = null;     // master gain (overall volume)
        this.muted = window.localStorage.getItem('iis_muted') === '1';
        this.recent = [];       // ring buffer of {name, surface?, via?, t} for tests/debug
        this._lastPlay = {};    // per-sound last-play time, for rate limiting
        this._noiseBuf = null;  // shared 1s white-noise buffer
        this._buffers = {};     // pack path -> AudioBuffer | 'loading' | 'failed'
        this._preloadStarted = false;

        // Create/resume the context on the first real user input (autoplay
        // policy) and start fetching the sample pack in the background.
        const unlock = () => {
            this._ensureContext();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            this._preloadSamples();
        };
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }

    // ---- the sample map ---------------------------------------------------
    // Event name -> file(s) in assets/sounds/. Arrays are picked from at
    // random so repeated hits and steps don't machine-gun the same take.

    // Footsteps by surface. The pack ships real takes for almost every
    // surface the game has; dirt borrows the foley gravel takes (closest
    // scuff) and sand the digital gravel ones (drier crunch).
    static FOOTSTEPS = {
        grass:  ['Footsteps/digital/digital_footstep_grass_1.wav',  'Footsteps/digital/digital_footstep_grass_2.wav',
                 'Footsteps/digital/digital_footstep_grass_3.wav',  'Footsteps/digital/digital_footstep_grass_4.wav'],
        dirt:   ['Footsteps/foley_footstep_gravel_1.wav',           'Footsteps/foley_footstep_gravel_2.wav',
                 'Footsteps/foley_footstep_gravel_3.wav',           'Footsteps/foley_footstep_gravel_4.wav'],
        sand:   ['Footsteps/digital/digital_footstep_gravel_1.wav', 'Footsteps/digital/digital_footstep_gravel_2.wav',
                 'Footsteps/digital/digital_footstep_gravel_3.wav', 'Footsteps/digital/digital_footstep_gravel_4.wav'],
        snow:   ['Footsteps/digital/digital_footstep_snow_1.wav',   'Footsteps/digital/digital_footstep_snow_2.wav',
                 'Footsteps/digital/digital_footstep_snow_3.wav',   'Footsteps/digital/digital_footstep_snow_4.wav'],
        wood:   ['Footsteps/digital/digital_footstep_wood_1.wav',   'Footsteps/digital/digital_footstep_wood_2.wav',
                 'Footsteps/digital/digital_footstep_wood_3.wav',   'Footsteps/digital/digital_footstep_wood_4.wav'],
        stone:  ['Footsteps/foley_footstep_concrete_1.wav',         'Footsteps/foley_footstep_concrete_2.wav',
                 'Footsteps/foley_footstep_concrete_3.wav',         'Footsteps/foley_footstep_concrete_4.wav'],
        carpet: ['Footsteps/foley_footstep_carpet_1.wav',           'Footsteps/foley_footstep_carpet_2.wav',
                 'Footsteps/foley_footstep_carpet_3.wav',           'Footsteps/foley_footstep_carpet_4.wav'],
        metal:  ['Materials/metal_blunt_tap.wav'],
    };

    static SAMPLES = {
        // Locomotion.
        'jump':           'Retro/jump.wav',
        'doubleJump':     'Retro/jump_square.wav',
        'land':           'Materials/clothing_thud.wav',
        'glide':          'Environment/ambient_wind.wav',

        // Player combat.
        'melee-swing':    ['Combat and Gore/swipe.wav', 'Other/whoosh_1.wav', 'Other/whoosh_2.wav'],
        'melee-hit':      ['Combat and Gore/punch.wav', 'Combat and Gore/punch_2.wav', 'Combat and Gore/punch_3.wav'],
        'melee-finisher': ['Combat and Gore/crunch_splat.wav', 'Combat and Gore/crunch_splat_2.wav'],
        'ranged-shot':    'Weapons/shot_muffled.wav',
        'shot-hit':       'Retro/explosion_quick.wav',
        'shot-blocked':   ['Weapons/sword_clash.wav', 'Weapons/sword_clash_2.wav'],
        'lock-on':        'UI/sci_fi_select.wav',
        'lock-off':       'UI/sci_fi_deselect.wav',

        // Enemies.
        'enemy-shot':     'Retro/throw.wav',
        'enemy-defeat':   ['Retro/explosion_small.wav', 'Retro/explosion_medium.wav'],

        // Player survival.
        'player-hurt':    'Retro/hurt.wav',
        'player-death':   'Retro/lose.wav',
        'respawn':        'Retro/power_up.wav',

        // Collection / economy / progression.
        'pixel':          ['Retro/coin.wav', 'Retro/coin_2.wav', 'Retro/coin_3.wav', 'Retro/coin_4.wav'],
        'pickup-health':  'Items/heart_collect.wav',
        'pickup-pixels':  'Items/coin_collect.wav',
        'pickup-star':    'Items/gem_collect.wav',
        'levelup':        'Musical Effects/8_bit_positive_long.wav',
        'purchase':       'Items/coins_gather_medium.wav',
        'denied':         'UI/sci_fi_disallow.wav',

        // UI / build / wiring.
        'menu-move':      ['UI/pop_1.wav', 'UI/pop_2.wav', 'UI/pop_3.wav', 'UI/pop_4.wav'],
        'menu-select':    ['UI/select_1.wav', 'UI/select_2.wav', 'UI/select_3.wav', 'UI/select_4.wav'],
        'place':          'Materials/wood_small_drop.wav',
        'delete':         'Materials/paper_scrunch.wav',
        'wire-connect':   'UI/click_double_on.wav',
        'wire-delete':    'UI/click_double_off.wav',
    };

    // Per-event gain (samples are mastered louder than the old synth): 1 is
    // full, quieter for high-frequency events so bursts don't overwhelm.
    static VOLUME = {
        'footstep': 0.7, 'glide': 0.45, 'pixel': 0.55, 'menu-move': 0.5,
        'menu-select': 0.7, 'enemy-shot': 0.55, 'land': 0.8, 'melee-swing': 0.8,
    };

    // Musical/one-shot stingers play as recorded; everything percussive gets
    // a small random pitch wobble so repeats sound organic.
    static NO_JITTER = new Set(['levelup', 'player-death', 'respawn', 'denied',
        'purchase', 'glide', 'lock-on', 'lock-off']);

    // Sounds that fire in rapid bursts get a minimum gap (ms) so a shower of
    // pixels or a held arrow key doesn't degenerate into noise. The glide
    // wind is a long recording, so it re-triggers sparsely.
    static rateLimitMs(name) {
        const limits = { 'pixel': 35, 'footstep': 90, 'menu-move': 45, 'glide': 1100, 'enemy-shot': 60 };
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

        const entry = { name: name, surface: opts.surface, t: now };
        this.recent.push(entry);
        if (this.recent.length > 120) this.recent.splice(0, this.recent.length - 120);

        if (this.muted) return true;
        this._ensureContext();
        if (!this.ctx) return true;
        try {
            if (this._playSample(name, opts)) entry.via = 'sample';
            else { this._synth(name, opts); entry.via = 'synth'; }
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

    // ---- sample loading + playback -----------------------------------------

    // Every file the map references, flattened (deduped by the object keying).
    static allSamplePaths() {
        const paths = new Set();
        const add = (v) => (Array.isArray(v) ? v : [v]).forEach((p) => paths.add(p));
        Object.values(SoundManager.SAMPLES).forEach(add);
        Object.values(SoundManager.FOOTSTEPS).forEach(add);
        return [...paths];
    }

    // Fetch + decode the whole mapped subset of the pack in the background.
    // ~100 short WAVs from the local server: cheap, and by the time the
    // player is moving everything is resident.
    _preloadSamples() {
        if (this._preloadStarted || !this.ctx) return;
        this._preloadStarted = true;
        SoundManager.allSamplePaths().forEach((p) => this._loadSample(p));
    }

    _loadSample(path) {
        if (this._buffers[path]) return;
        this._buffers[path] = 'loading';
        fetch(encodeURI('assets/sounds/' + path))
            .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
            .then((ab) => this.ctx.decodeAudioData(ab))
            .then((buf) => { this._buffers[path] = buf; })
            .catch(() => { this._buffers[path] = 'failed'; });   // synth covers it
    }

    // Loading progress, mostly for tests/debugging.
    samplesReady() {
        const all = SoundManager.allSamplePaths();
        let loaded = 0, failed = 0;
        all.forEach((p) => {
            const b = this._buffers[p];
            if (b === 'failed') failed++;
            else if (b && b !== 'loading') loaded++;
        });
        return { loaded: loaded, failed: failed, total: all.length };
    }

    // Play the mapped sample for an event. Returns false when the event has
    // no mapping or its buffer isn't decoded yet -- the caller then falls
    // back to the synthesised recipe, so there is never a silent gap.
    _playSample(name, opts) {
        let spec;
        if (name === 'footstep') spec = SoundManager.FOOTSTEPS[opts.surface];
        else spec = SoundManager.SAMPLES[name];
        if (!spec) return false;
        const path = Array.isArray(spec) ? spec[Math.floor(Math.random() * spec.length)] : spec;
        const buf = this._buffers[path];
        if (!buf || buf === 'loading' || buf === 'failed') {
            if (!buf) this._loadSample(path);   // first request kicks the load
            return false;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        if (!SoundManager.NO_JITTER.has(name)) {
            src.playbackRate.value = 0.94 + Math.random() * 0.12;
        }
        const g = this.ctx.createGain();
        g.gain.value = SoundManager.VOLUME[name] != null ? SoundManager.VOLUME[name] : 1.0;
        src.connect(g);
        g.connect(this.master);
        src.start();
        return true;
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

    // ---- footstep fallback: one recipe per walkable surface --------------------

    // Synthesised stand-ins while the samples stream in (or if they fail):
    //   grass - soft rustle          dirt/sand - dull scuff with a low body
    //   wood  - hollow knock         stone - hard bright tap
    //   metal - ringing clank        snow/carpet - muffled press
    _footstep(surface) {
        const r = 0.9 + Math.random() * 0.2;   // step-to-step variation
        switch (surface) {
        case 'grass':
            this._noiseBurst({ dur: 0.09, vol: 0.11, type: 'lowpass', f: 700 * r });
            break;
        case 'dirt':
        case 'sand':
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
        case 'snow':
        case 'carpet':
            this._noiseBurst({ dur: 0.11, vol: 0.09, type: 'lowpass', f: 240 * r });
            break;
        default:
            this._noiseBurst({ dur: 0.08, vol: 0.10, type: 'lowpass', f: 600 * r });
        }
    }

    // ---- the synthesised fallback recipes ---------------------------------------

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
