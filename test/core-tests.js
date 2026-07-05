// The CORE test tier: what `npm test` (and every routine iteration) runs.
// Target: ~30 SECONDS. That budget buys exactly two boots of the game, so
// these two are chosen to touch the widest spine per second:
//
//  - test-save-load: build-mode placement, instance serialization, world
//    clear + reload -- if the manifest, WorldObject plumbing, or persistence
//    break, this fails.
//  - test-combat: play mode boot, avatar + controller, enemy damage
//    plumbing, pixel economy, HUD -- the play-side heartbeat.
//
// Everything else still runs in `npm run test:full` (the pre-merge gate).
// Add a file here only if it earns its ~15s on EVERY iteration; prefer
// running specific suites by name while working on a feature:
//     node test/run-all.js test-wiring test-portal-door
module.exports = [
    'test-save-load',
    'test-combat',
];
