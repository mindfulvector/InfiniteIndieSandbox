// BuildAssistant — a local, offline "AI" builder.
// ------------------------------------------------
// No LLM, no network, no dependencies (true to the static-file rule): a
// deterministic INTENT PARSER turns a plain-language request into real
// world objects placed and wired through the normal createInstance path.
// It reads the request for a KNOWN RECIPE + optional size/count/theme
// modifiers, builds around the player (or the origin), and reports what it
// made. Rule-based, but it genuinely assembles playable structures --
// including wired ones -- which is the useful half of "AI builder".
class BuildAssistant {
    constructor(app) {
        this.app = app;
        // Each recipe: keywords that trigger it + a builder(ctx, opts).
        this.recipes = [
            { id: 'arena',   keys: ['arena', 'colosseum', 'pit', 'battleground'], build: (c, o) => this._arena(c, o) },
            { id: 'wall',    keys: ['wall', 'fence', 'barrier'],                  build: (c, o) => this._wall(c, o) },
            { id: 'tower',   keys: ['tower', 'pillar', 'spire', 'column'],        build: (c, o) => this._tower(c, o) },
            { id: 'stars',   keys: ['star trail', 'star path', 'stars', 'collectible'], build: (c, o) => this._stars(c, o) },
            { id: 'patrol',  keys: ['patrol', 'guard', 'enemy route'],            build: (c, o) => this._patrol(c, o) },
            { id: 'platform', keys: ['platform', 'floor', 'stage', 'pad'],        build: (c, o) => this._platform(c, o) },
            { id: 'ring',    keys: ['ring course', 'rings', 'fly through', 'hoops'], build: (c, o) => this._rings(c, o) },
        ];
    }

    // Parse a request into {recipe, opts}. opts: count, size, theme.
    parse(text) {
        const t = (text || '').toLowerCase();
        let recipe = null;
        for (const r of this.recipes) {
            if (r.keys.some((k) => t.indexOf(k) >= 0)) { recipe = r; break; }
        }
        const numMatch = t.match(/(\d+)/);
        const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
        let count = numMatch ? parseInt(numMatch[1], 10) : null;
        if (count == null) for (const w in words) if (t.indexOf(w) >= 0) { count = words[w]; break; }
        const size = /\b(big|large|huge|giant)\b/.test(t) ? 'big'
            : /\b(small|tiny|little)\b/.test(t) ? 'small' : 'normal';
        const theme = /\bsnow|ice|winter\b/.test(t) ? 'snow'
            : /\bsand|desert|dune\b/.test(t) ? 'sand' : null;
        return { recipe, opts: { count, size, theme, raw: text } };
    }

    // Build from a request. Returns {ok, recipe, made, message}.
    run(text) {
        const { recipe, opts } = this.parse(text);
        if (!recipe) {
            return { ok: false, message: 'Try: "a walled arena", "a star trail", "a tower", "a patrol", "a ring course".' };
        }
        const ctx = { origin: this._origin(), made: [] };
        recipe.build(ctx, opts);
        this.app.toasty('Assistant built ' + ctx.made.length + ' object(s): ' + recipe.id + '.');
        if (this.app.sound) this.app.sound.play('wire-connect');
        return { ok: true, recipe: recipe.id, made: ctx.made.length, opts,
            message: 'Built a ' + recipe.id + ' (' + ctx.made.length + ' objects).' };
    }

    // ---- helpers -------------------------------------------------------------
    _origin() {
        const pm = this.app.activeMode;
        if (pm && pm.player) {
            const f = pm.playerForward ? pm.playerForward() : new BABYLON.Vector3(0, 0, 1);
            return pm.player.position.add(f.scale(6)).add(new BABYLON.Vector3(0, -0.5, 0));
        }
        return new BABYLON.Vector3(0, 1, 0);
    }

    _place(ctx, name, x, y, z, opts) {
        const wo = this.app.findWorldObject(name);
        if (!wo) return null;
        const inst = wo.createInstance();
        inst.position = new BABYLON.Vector3(ctx.origin.x + x, ctx.origin.y + y, ctx.origin.z + z);
        inst.checkCollisions = true;
        if (opts && opts.params) Object.assign(inst.params, opts.params);
        ctx.made.push(inst);
        return inst;
    }

    _terrainBlock(theme) {
        if (theme === 'snow') return 't_snow_2';
        if (theme === 'sand') return 't_sand_2';
        return 't_block_2';
    }

    // ---- recipes -------------------------------------------------------------
    _floorGrid(ctx, r, opts) {
        const block = this._floorName(opts.theme);
        for (let gx = -r; gx <= r; gx++)
            for (let gz = -r; gz <= r; gz++) this._place(ctx, block, gx * 2, 0, gz * 2, opts);
    }
    _floorName(theme) {
        if (theme === 'snow') return 't_snow';
        if (theme === 'sand') return 't_sand';
        return 't_tile';
    }

    _arena(ctx, opts) {
        const r = opts.size === 'big' ? 4 : opts.size === 'small' ? 2 : 3;
        this._floorGrid(ctx, r, opts);
        const wallBlock = this._terrainBlock(opts.theme);
        const edge = r * 2;
        for (let g = -r; g <= r; g++) {
            this._place(ctx, wallBlock, g * 2, 2, -edge, opts);
            this._place(ctx, wallBlock, g * 2, 2, edge, opts);
            if (g !== -r && g !== r) {
                this._place(ctx, wallBlock, -edge, 2, g * 2, opts);
                this._place(ctx, wallBlock, edge, 2, g * 2, opts);
            }
        }
        // A trigger-fed spawner makes it a real battleground.
        const trig = this._place(ctx, 'l_trigger', 0, 1.2, 0, opts);
        const spawner = this._place(ctx, 'l_spawner', 0, 1, edge - 2,
            { params: { enemyType: 'walker', frequency: 3, limit: 3, startActive: 'no' } });
        if (trig && spawner) {
            this.app.addWire(trig, 'entered', 'l_spawner', spawner.worldId, 'enable');
        }
    }

    _wall(ctx, opts) {
        const len = opts.count || (opts.size === 'big' ? 8 : 5);
        const block = this._terrainBlock(opts.theme);
        for (let i = 0; i < len; i++) {
            this._place(ctx, block, (i - (len - 1) / 2) * 2, 1, 0, opts);
            if (opts.size === 'big') this._place(ctx, block, (i - (len - 1) / 2) * 2, 3, 0, opts);
        }
    }

    _tower(ctx, opts) {
        const h = opts.count || (opts.size === 'big' ? 6 : 4);
        const block = this._terrainBlock(opts.theme);
        for (let i = 0; i < h; i++) this._place(ctx, block, 0, i * 2, 0, opts);
    }

    _platform(ctx, opts) {
        const r = opts.size === 'big' ? 4 : opts.size === 'small' ? 1 : 2;
        this._floorGrid(ctx, r, opts);
    }

    _stars(ctx, opts) {
        const n = opts.count || 5;
        const counter = this._place(ctx, 'l_counter', -2, 0.5, -3,
            { params: { threshold: n, autoReset: 'no' } });
        const board = this._place(ctx, 'l_scoreboard', 0, 1.6, -3, { params: { target: 5 } });
        for (let i = 0; i < n; i++) {
            const star = this._place(ctx, 'pk_star', i * 2.5, 1 + i * 0.6, i * 1.5, opts);
            if (star && counter) this.app.addWire(star, 'collected', 'l_counter', counter.worldId, 'increment');
        }
        if (counter && board) this.app.addWire(counter, 'reached', 'l_scoreboard', board.worldId, 'add5');
    }

    _patrol(ctx, opts) {
        const n = Math.max(2, opts.count || 3);
        const nodes = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            nodes.push(this._place(ctx, 'l_pathnode', Math.cos(a) * 5, 1, Math.sin(a) * 5, opts));
        }
        for (let i = 0; i < n; i++) {
            const next = nodes[(i + 1) % n];
            if (nodes[i] && next) this.app.addWire(nodes[i], 'next', 'l_pathnode', next.worldId, 'chain');
        }
        const blob = this._place(ctx, 'en_blob', 5, 1.3, 0, { params: { patrolSpeed: 1, patrolMode: 'loop' } });
        if (blob && nodes[0]) this.app.addWire(blob, 'patrol', 'l_pathnode', nodes[0].worldId, 'chain');
    }

    _rings(ctx, opts) {
        const n = Math.max(2, opts.count || 4);
        const race = this._place(ctx, 'l_race', -3, 1, -3, { params: { checkpoints: Math.max(0, n - 2) } });
        for (let i = 0; i < n; i++) {
            const ring = this._place(ctx, 'l_ring', i * 5, 3 + i * 0.5, i * 2, opts);
            if (ring && race) {
                const action = i === 0 ? 'start' : i === n - 1 ? 'finish' : 'checkpoint';
                this.app.addWire(ring, 'flown', 'l_race', race.worldId, action);
            }
        }
    }
}
