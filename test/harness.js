/*
 * Infinite Indie Sandbox - Linux test harness
 * --------------------------------------------
 * A small, dependency-light harness that boots the game in headless Chromium
 * (via Playwright + SwiftShader for WebGL) on top of the project's PHP dev
 * server, then exposes helpers for driving input, inspecting game state, and
 * capturing screenshots so features can be verified visually and assertively.
 *
 * It is intentionally written to run on Linux CI / containers:
 *   - Chromium is the pre-installed Playwright build under PLAYWRIGHT_BROWSERS_PATH
 *   - WebGL is forced through ANGLE/SwiftShader software rendering
 *   - The game is served over HTTP by `php -S` (required for SceneLoader/XHR)
 *
 * The harness deliberately talks to the game through the same `window.app`
 * object and the same keyboard events a real player would use, so the tests
 * exercise real code paths (App menus, BuildMode, PlayMode) rather than mocks.
 */

const { chromium } = require(requirePlaywright());
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

function requirePlaywright() {
    // Prefer a locally installed playwright, fall back to the global install
    // that ships in this environment.
    const candidates = [
        'playwright',
        '/opt/node22/lib/node_modules/playwright',
    ];
    for (const c of candidates) {
        try { require.resolve(c); return c; } catch (_) { /* keep trying */ }
    }
    throw new Error('playwright module not found (looked in ' + candidates.join(', ') + ')');
}

// Locate the pre-installed Chromium binary so we never trigger a download.
function findChromium() {
    if (process.env.IIS_CHROMIUM_PATH && fs.existsSync(process.env.IIS_CHROMIUM_PATH)) {
        return process.env.IIS_CHROMIUM_PATH;
    }
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    try {
        const dirs = fs.readdirSync(base)
            .filter((d) => d.startsWith('chromium-'))
            .sort();
        for (const d of dirs.reverse()) {
            const p = path.join(base, d, 'chrome-linux', 'chrome');
            if (fs.existsSync(p)) return p;
        }
    } catch (_) { /* fall through */ }
    return undefined; // let Playwright use its default
}

const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(__dirname, 'screenshots');

class GameHarness {
    constructor(opts = {}) {
        this.host = opts.host || '127.0.0.1';
        this.port = opts.port || 7011; // avoid clashing with a dev server on 7001
        this.headless = opts.headless !== false;
        this.viewport = opts.viewport || { width: 1280, height: 720 };
        this.shotDir = opts.shotDir || process.env.IIS_SHOT_DIR || SHOT_DIR;
        this.server = null;
        this.browser = null;
        this.page = null;
        this.consoleLogs = [];
        this.pageErrors = [];
        this._shotCount = 0;
    }

    get baseUrl() { return `http://${this.host}:${this.port}/`; }

    log(...args) { console.log('[harness]', ...args); }

    async start() {
        if (!fs.existsSync(this.shotDir)) fs.mkdirSync(this.shotDir, { recursive: true });
        // Clear old screenshots for a clean run.
        for (const f of fs.readdirSync(this.shotDir)) {
            if (f.endsWith('.png')) fs.unlinkSync(path.join(this.shotDir, f));
        }
        await this._startServer();
        await this._launchBrowser();
    }

    async _startServer() {
        const php = spawnSync('which', ['php']).stdout.toString().trim();
        if (!php) throw new Error('php not found on PATH (needed for the dev server)');
        this.log(`starting php dev server on ${this.host}:${this.port} (docroot ${ROOT})`);
        this.server = spawn('php', ['-S', `${this.host}:${this.port}`, '-t', ROOT], {
            cwd: ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        this.server.stderr.on('data', () => { /* php logs each request to stderr; ignore */ });
        await this._waitForHttp(this.baseUrl + 'index.html', 10000);
        this.log('php dev server is up');
    }

    _waitForHttp(url, timeoutMs) {
        const deadline = Date.now() + timeoutMs;
        return new Promise((resolve, reject) => {
            const tick = () => {
                const req = http.get(url, (res) => {
                    res.resume();
                    if (res.statusCode && res.statusCode < 500) return resolve();
                    retry();
                });
                req.on('error', retry);
                req.setTimeout(1000, () => req.destroy());
            };
            const retry = () => {
                if (Date.now() > deadline) return reject(new Error('timed out waiting for ' + url));
                setTimeout(tick, 150);
            };
            tick();
        });
    }

    async _launchBrowser() {
        const executablePath = findChromium();
        this.log('launching chromium' + (executablePath ? ` (${executablePath})` : ' (playwright default)'));
        this.browser = await chromium.launch({
            executablePath,
            headless: this.headless,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                // Force software WebGL so 3D rendering works without a GPU.
                '--use-gl=angle',
                '--use-angle=swiftshader',
                '--enable-unsafe-swiftshader',
                '--ignore-gpu-blocklist',
                '--enable-webgl',
            ],
        });
        const context = await this.browser.newContext({ viewport: this.viewport });
        this.page = await context.newPage();
        this.page.on('console', (msg) => {
            this.consoleLogs.push(`${msg.type()}: ${msg.text()}`);
        });
        this.page.on('pageerror', (err) => {
            this.pageErrors.push(String(err && err.stack ? err.stack : err));
        });
        this.log('navigating to ' + this.baseUrl);
        await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
    }

    // Wait until the App has booted and the objects we depend on for the build
    // test have finished (synchronously or asynchronously) registering.
    async waitForReady(requiredObjects = ['t_cube_1x1', 'pr_door'], timeoutMs = 45000) {
        this.log('waiting for game + objects: ' + requiredObjects.join(', '));
        // Wait for the named objects AND for the whole manifest to settle (every
        // asset either loaded or definitively failed). This keeps the object
        // list stable before a test runs — important in CI, where the remote
        // village-pack assets actually load (vs. failing in a sandboxed env).
        await this.page.waitForFunction((names) => {
            const app = window.app;
            if (!app || !Array.isArray(app.BuildableObjectList)) return false;
            if (!names.every((n) => !!app.findWorldObject(n))) return false;
            const settled = (app.manifestObjectCount || 0) + (app.manifestObjectFailed || 0);
            return settled >= (app.manifestObjectTarget || 0);
        }, requiredObjects, { timeout: timeoutMs, polling: 100 });
        // Give the render loop a few frames to draw the first menu.
        await this.waitFrames(5);
        const n = await this.page.evaluate(() => window.app.BuildableObjectList.length);
        this.log('game ready (' + n + ' objects)');
    }

    // ---- input helpers ------------------------------------------------------

    // Tap a key. App.keyPressed() CONSUMES the key on first read, so we must
    // guarantee the render loop runs update() at least once while the key is
    // held. We sync to animation frames (not wall-clock) because software
    // rendering frame rates are low and variable; a fixed millisecond hold can
    // be missed entirely between two slow frames.
    async tapKey(key, holdFrames = 3) {
        await this.page.keyboard.down(key);
        await this.waitFrames(holdFrames);
        await this.page.keyboard.up(key);
        await this.waitFrames(1);
    }

    // Tap a key and retry until `predicateFn` becomes true (a real player taps
    // again if a menu didn't respond). Makes consume-based menu input robust
    // against frame-timing races. Throws if it never takes effect.
    async tapUntil(key, predicateFn, arg, { tries = 12, framesPerTry = 4 } = {}) {
        for (let i = 0; i < tries; i++) {
            if (await this.page.evaluate(predicateFn, arg)) return;
            await this.tapKey(key);
            await this.waitFrames(framesPerTry);
        }
        if (await this.page.evaluate(predicateFn, arg)) return;
        throw new Error(`tapUntil('${key}') condition never satisfied after ${tries} tries`);
    }

    // Hold a key down for a number of animation frames (for keyDown()-style
    // continuous movement, which reads live key state each frame).
    async holdKey(key, frames = 18) {
        await this.page.keyboard.down(key);
        await this.waitFrames(frames);
        await this.page.keyboard.up(key);
        await this.waitFrames(1);
    }

    // ---- state / timing helpers --------------------------------------------

    async evaluate(fn, arg) { return this.page.evaluate(fn, arg); }

    async waitFrames(n = 1) {
        for (let i = 0; i < n; i++) {
            await this.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
        }
    }

    async waitFor(predicateFn, arg, timeoutMs = 10000) {
        await this.page.waitForFunction(predicateFn, arg, { timeout: timeoutMs, polling: 60 });
    }

    // Snapshot of the high-level game state for assertions/logging.
    async getState() {
        return this.page.evaluate(() => {
            const app = window.app;
            const counts = {};
            (app.BuildableObjectList || []).forEach((wo) => {
                const live = (wo.instances || []).filter(Boolean).length;
                if (live > 0) counts[wo.name] = live;
            });
            return {
                menuState: app.menu.state,
                modeName: app.modeName && app.modeName.text,
                activeMode: app.activeMode ? app.activeMode.constructor.name : null,
                hasWorld: !!app.world,
                objectTypes: (app.BuildableObjectList || []).length,
                instanceCounts: counts,
                buildSelectedIndex: app.activeMode && 'selectedObjectIndex' in app.activeMode
                    ? app.activeMode.selectedObjectIndex : null,
                hasCurrentInstance: !!(app.activeMode && app.activeMode.currentInstance),
            };
        });
    }

    // Count placed instances of a given world object (live, non-disposed).
    async instanceCount(objectName) {
        return this.page.evaluate((name) => {
            const wo = window.app.findWorldObject(name);
            if (!wo) return -1;
            return (wo.instances || []).filter(Boolean).length;
        }, objectName);
    }

    // ---- screenshots --------------------------------------------------------

    async screenshot(name) {
        this._shotCount += 1;
        const idx = String(this._shotCount).padStart(2, '0');
        const file = path.join(this.shotDir, `${idx}-${name}.png`);
        await this.page.screenshot({ path: file });
        this.log('screenshot -> ' + path.relative(ROOT, file));
        return file;
    }

    // ---- animation / motion sampling ---------------------------------------

    // Sample an in-page value across several animation frames. `fn` is evaluated
    // in the page every `everyFrames` frames, `samples` times, and the results
    // are returned in order. Because we step by animation frames (not wall-clock)
    // this stays reliable under the low, variable software-rendering frame rate.
    // Use it to prove things are actually moving/animating over time: sample a
    // position, a bone matrix, an enemy count, etc., then assert it changes.
    async sampleSeries(fn, { samples = 8, everyFrames = 3, arg } = {}) {
        const out = [];
        for (let i = 0; i < samples; i++) {
            out.push(await this.page.evaluate(fn, arg));
            if (i < samples - 1) await this.waitFrames(everyFrames);
        }
        return out;
    }

    // Capture a short "filmstrip": `frames` screenshots spaced `everyFrames`
    // animation frames apart (i.e. sampling a few frames per second). Frames are
    // saved as NN-<name>-fKK.png for visual review, and each frame's bytes are
    // hashed so we can tell whether the scene is actually changing between frames
    // (a frozen game renders byte-identical PNGs). Returns the files, the hashes,
    // how many consecutive frames changed, and the count of distinct frames.
    async filmstrip(name, { frames = 6, everyFrames = 4 } = {}) {
        const files = [];
        const hashes = [];
        for (let i = 0; i < frames; i++) {
            this._shotCount += 1;
            const shotIdx = String(this._shotCount).padStart(2, '0');
            const frameIdx = String(i).padStart(2, '0');
            const file = path.join(this.shotDir, `${shotIdx}-${name}-f${frameIdx}.png`);
            const buf = await this.page.screenshot({ path: file });
            files.push(file);
            hashes.push(crypto.createHash('sha1').update(buf).digest('hex'));
            if (i < frames - 1) await this.waitFrames(everyFrames);
        }
        let framesChanged = 0;
        for (let i = 1; i < hashes.length; i++) {
            if (hashes[i] !== hashes[i - 1]) framesChanged += 1;
        }
        const distinctFrames = new Set(hashes).size;
        this.log(`filmstrip '${name}': ${frames} frames, ` +
            `${framesChanged}/${frames - 1} consecutive changed, ${distinctFrames} distinct`);
        return { files, hashes, framesChanged, distinctFrames, frames };
    }

    // ---- teardown -----------------------------------------------------------

    async stop() {
        try { if (this.browser) await this.browser.close(); } catch (_) {}
        if (this.server) {
            this.server.kill('SIGTERM');
            // Give it a moment, then force kill if needed.
            await new Promise((r) => setTimeout(r, 300));
            if (!this.server.killed) try { this.server.kill('SIGKILL'); } catch (_) {}
        }
    }

    // Errors we expect and don't want to flag: the village-pack assets load
    // from assets.babylonjs.com, which is unreachable when outbound HTTPS is
    // blocked. These are non-fatal (the game shows "Loading 6/10").
    _isExpectedError(text) {
        return /assets\.babylonjs\.com|ERR_TUNNEL_CONNECTION_FAILED|villagePack/.test(text)
            // benign game-side warning for local terrain assets without a configured collider mesh
            || /No colliderMeshes/.test(text);
    }

    dumpDiagnostics() {
        const realErrors = this.pageErrors.filter((e) => !this._isExpectedError(e));
        if (realErrors.length) {
            console.log('\n--- page errors ---');
            realErrors.forEach((e) => console.log(e));
        }
        const interesting = this.consoleLogs
            .filter((l) => /error|warn|fail/i.test(l))
            .filter((l) => !this._isExpectedError(l));
        if (interesting.length) {
            console.log('\n--- console (errors/warnings) ---');
            interesting.slice(-40).forEach((l) => console.log(l));
        }
        const expected = this.pageErrors.length - realErrors.length;
        if (expected > 0) {
            console.log(`\n(${expected} expected remote-asset error(s) from assets.babylonjs.com suppressed)`);
        }
    }
}

module.exports = { GameHarness };
