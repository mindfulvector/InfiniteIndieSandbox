/*
 * Idle-animation test
 * -------------------
 * The avatar's authored "idle" range is a frozen 2-frame pose, so standing
 * still used to leave the character statue-still (the locomotion clips are
 * fine). Verifies the procedural idle:
 *   - after standing still a moment, the frozen idle clip is stopped and the
 *     spine visibly breathes (bone pose differs between two reads),
 *   - movement input immediately hands the bones back to the animation clips
 *     (breathing stops writing),
 *   - going idle again resumes the breathing.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

// Compact fingerprint of the spine bone's local pose.
const spinePose = () => {
    const pm = window.app.activeMode;
    if (!pm || !pm.boneSpine) return null;
    const m = pm.boneSpine.getLocalMatrix().m;
    let s = '';
    for (let i = 0; i < 16; i++) s += Math.round(m[i] * 100000) + ',';
    return s;
};

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob']);
        await h.tapUntil('1', () => window.app.menu.state === 11 /* template picker */);
        await h.tapUntil('1', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        // Stand still long enough for the idle takeover (needs > 12 idle frames).
        await h.waitFrames(30);

        // --- 1. Standing still: the static clip is stopped and the spine moves ---
        const idleState = await h.evaluate(() => ({
            stopped: window.app.activeMode._idleAnimStopped,
            idleFrames: window.app.activeMode.idleFrames,
            hasSpine: !!window.app.activeMode.boneSpine,
        }));
        console.log('\n[1] idle engaged', idleState);
        check('idle takeover engaged after standing still', idleState.stopped === true && idleState.hasSpine, idleState);

        const poseA = await h.evaluate(spinePose);
        await h.waitFrames(8);
        const poseB = await h.evaluate(spinePose);
        await h.waitFrames(8);
        const poseC = await h.evaluate(spinePose);
        const breathing = poseA !== null && (poseA !== poseB || poseB !== poseC);
        console.log('[1] poses distinct:', new Set([poseA, poseB, poseC]).size);
        check('the character breathes while idle (spine pose changes)', breathing,
            { distinct: new Set([poseA, poseB, poseC]).size });
        await h.screenshot('idle-breathing');

        // --- 2. Movement input returns the bones to the animation clips ---
        await h.page.keyboard.down('w');
        await h.waitFrames(6);
        const movingState = await h.evaluate(() => ({
            stopped: window.app.activeMode._idleAnimStopped,
            idleFrames: window.app.activeMode.idleFrames,
        }));
        await h.page.keyboard.up('w');
        console.log('\n[2] while moving', movingState);
        check('movement input ends the idle takeover', movingState.stopped === false && movingState.idleFrames === 0,
            movingState);

        // --- 3. Going idle again resumes breathing ---
        await h.waitFrames(30);
        const poseD = await h.evaluate(spinePose);
        await h.waitFrames(8);
        const poseE = await h.evaluate(spinePose);
        const resumed = await h.evaluate(() => window.app.activeMode._idleAnimStopped);
        console.log('\n[3] idle again', { resumed, changed: poseD !== poseE });
        check('idle breathing resumes after moving', resumed === true && poseD !== poseE,
            { resumed, changed: poseD !== poseE });

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — the character breathes while idle and clips take over on movement.'
            : `RESULT: FAIL — ${failures} assertion(s) failed.`);
        console.log('========================================');
        if (h.pageErrors.length) h.dumpDiagnostics();
    } catch (err) {
        failures += 1;
        console.error('\nHARNESS ERROR:', err && err.stack ? err.stack : err);
        try { await h.screenshot('error-state'); } catch (_) {}
        h.dumpDiagnostics();
    } finally {
        await h.stop();
    }
    process.exit(failures === 0 ? 0 : 1);
}

main();
