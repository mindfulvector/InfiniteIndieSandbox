# Infinite Indie Sandbox — Linux Test Harness

A headless test harness for driving the game on Linux, exercising real gameplay
through the same `window.app` object and keyboard events a player uses, and
capturing screenshots so features can be verified both **assertively** (against
game state) and **visually** (PNG screenshots).

It boots the actual game: the project's `php -S` dev server serves the files,
and Playwright drives a headless Chromium with WebGL forced through ANGLE /
SwiftShader (software rendering), so it runs on a plain Linux box / CI container
with no GPU.

## What's here

| File | Purpose |
|------|---------|
| `harness.js` | Reusable `GameHarness` class: starts the PHP server, launches Chromium, waits for the game to be ready, and provides input / state / screenshot helpers. |
| `test-building.js` | The building-feature test: create a new sandbox and place objects in it. |
| `test-object-browser.js` | The object-browser test: bottom bar shows a runtime thumbnail per object and click-to-select works. |
| `test-placement-consistency.js` | Verifies every object base-aligns, centres on the anchor, and stays framed by the camera. |
| `test-textures-survive-baking.js` | Regression guard: thumbnail baking must not dispose the shared textures of live objects. |
| `test-save-load.js` | A world survives save → clear → load with transforms intact and no duplicate cube. |
| `test-delete.js` | Placed objects can be removed with Delete (quick undo). |
| `test-move-object.js` | A previously-placed object can be grabbed, moved and dropped (not duplicated). |
| `test-combat.js` | Attacking defeats an enemy, which bursts pixels that home to the player and increment the count. |
| `test-enemy-management.js` | TRON enemies auto-spawn, chase the player, are defeatable for pixels, damage the player, and are cleaned up on mode exit. |
| `test-bipedal-enemy.js` | The bipedal TRON walker uses the shared GravityBody (falls/lands on terrain), walks, does melee + ranged attacks, and drops pixels. |
| `test-spawner.js` | The spawner object auto-opens a parameters popup, edits/persists its params, and spawns the chosen enemy type at its frequency up to the limit. |
| `test-shop-gating.js` | Premium objects are locked in build mode and unlock via the shop for pixels. |
| `run.sh` | Convenience runner. |
| `screenshots/` | Output PNGs from the most recent run (cleared at the start of each run). |

## Requirements

- **PHP** on `PATH` (used to serve the game, exactly like `run.sh` in the repo root).
- **Playwright + a Chromium build.** In this repo's container both are
  pre-installed (`/opt/.../playwright`, `/opt/pw-browsers/chromium-*`). Elsewhere:
  ```bash
  npm i -g playwright
  npx playwright install chromium
  ```

The harness auto-discovers the Chromium binary under `PLAYWRIGHT_BROWSERS_PATH`
(default `/opt/pw-browsers`). Override with `IIS_CHROMIUM_PATH=/path/to/chrome`.

## Running

Run the whole suite (what CI runs):

```bash
npm test                 # = node test/run-all.js
node test/run-all.js test-building test-delete   # run a subset
```

Or a single test directly:

```bash
./test/run.sh            # the building test
node test/test-building.js
```

Exit code `0` = all assertions passed, non-zero = failure. `run-all.js` writes
each test's screenshots to `test/screenshots/<test-name>/`; a single test writes
to `test/screenshots/`.

## Continuous integration

`.github/workflows/ci.yml` runs the full suite on every push and pull request:
it installs PHP and a Playwright Chromium (`--with-deps`), runs `npm test`, and
uploads `test/screenshots/` as a build artifact. Note that in CI the four
village-pack objects load from `assets.babylonjs.com` (there's outbound
network), so the buildable-object count is higher than in a network-restricted
sandbox; the tests don't hard-code that count, and `waitForReady` blocks until
the manifest fully settles so the object list is stable before assertions run.

Environment variables:

- `IIS_HEADLESS=0` — run with a visible browser (needs an X/Wayland display).

## What the building test verifies

It walks the exact flow a player uses and asserts game state at each step:

1. **Main menu** boots (`MENU_MAIN`), object library registered, no world yet.
2. **New Game** → a `SandboxWorld` is created, the origin terrain cube spawns,
   and the game enters **Play mode** with a loaded avatar.
3. **Esc → Pause → Build mode** is reached.
4. An object (`pr_door`) is **selected** for placement (a floating preview appears).
5. The preview is **moved** (WASD) and **rotated** (Z/C), then **placed** (Space) —
   asserted by the live instance count rising.
6. A **second** object is placed to prove repeat placement.
7. Returning to **Play mode**, both placed objects **persist** in the world.

The test deliberately builds with the primitive `pr_door` object because
primitives register synchronously and need no network assets, keeping the test
deterministic. (Four village-pack objects load from `assets.babylonjs.com`; if
outbound HTTPS is blocked you'll see "Loading 6/10" and matching console errors —
this is expected and does not affect the test.)

## Reusing the harness for other tests

```js
const { GameHarness } = require('./harness');

const h = new GameHarness();           // opts: { headless, port, viewport, ... }
await h.start();
await h.waitForReady(['t_cube_1x1']);  // wait for app + named objects to register

await h.tapUntil('1', () =>            // tap a key, retrying until it takes effect
  window.app.activeMode?.constructor.name === 'PlayMode');
await h.holdKey('w', 24);              // hold a key for N animation frames (movement)
const state = await h.getState();      // high-level snapshot for assertions
await h.screenshot('my-step');         // saved under screenshots/NN-my-step.png
await h.stop();
```

### Input model gotcha

The game's `App.keyPressed()` **consumes** a key on first read, and software
rendering frame rates are low and variable. A fixed wall-clock key hold can be
missed entirely between two slow frames, so the harness syncs key presses to
animation frames and offers `tapUntil()` to retry a press until it has the
intended effect — which is also exactly what a real player does when a menu
doesn't respond.
