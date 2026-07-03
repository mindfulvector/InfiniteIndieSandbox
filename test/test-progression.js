/*
 * Progression + starter-templates + scoreboard test
 * -------------------------------------------------
 * Action-driven checks with screenshots at each step:
 *   - New Game opens the starter-world template picker,
 *   - Flat Plane / Arena / Floating Islands templates build their layouts,
 *   - defeating an enemy grants XP and levels the character up (stat growth:
 *     more max HP, melee damage bonus at level 5),
 *   - a scoreboard scores wired points, shows on the HUD, and fires `reached`
 *     at its target (driving a spawner).
 */

const { GameHarness } = require('./harness');

const MENU_MAIN = 1, MENU_PAUSE = 2, MENU_WORLD_TEMPLATE = 11;
let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

// Enter play mode from the main menu picking template `n`.
async function newGame(h, n) {
    await h.tapUntil('1', () => window.app.menu.state === 11 /* MENU_WORLD_TEMPLATE */);
    await h.tapUntil(String(n), () => window.app.activeMode &&
        window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
    await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
    await h.evaluate(() => {
        const em = window.app.activeMode.enemyManager;
        em.autoSpawn = false;
        em.enemies.forEach((e) => e.mesh.dispose(false, false));
        em.enemies = [];
    });
    await h.waitFrames(10);
}

// Back to the main menu from play mode.
async function toMainMenu(h) {
    await h.tapUntil('Escape', () => window.app.menu.state === MENU_PAUSE);
    await h.tapUntil('5', () => window.app.menu.state === MENU_MAIN);
}

const tileStats = () => {
    const tiles = window.app.findWorldObject('t_tile').instances.filter(Boolean);
    const ys = tiles.map((t) => Math.round(t.position.y * 100) / 100);
    return { count: tiles.length, heights: Array.from(new Set(ys)).sort((a, b) => a - b) };
};

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR, port: 7029 });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 'en_blob', 'l_scoreboard', 'l_spawner']);
        // Deterministic progression baseline.
        await h.evaluate(() => {
            window.app.pixels = 0; window.app.playerLevel = 1; window.app.playerXp = 0;
            window.app.saveEconomy();
        });

        // --- 1. New Game opens the template picker ---
        await h.tapUntil('1', () => window.app.menu.state === MENU_WORLD_TEMPLATE);
        await h.waitFrames(4);
        await h.screenshot('template-picker');
        check('New Game opens the starter-world picker', true);

        // --- 2. Flat Plane ---
        await h.tapUntil('2', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.waitFrames(10);
        const flat = await h.evaluate(tileStats);
        console.log('\n[2] flat plane', flat);
        check('Flat Plane builds a 10x10 grid', flat.count === 100, flat);
        check('Flat Plane is perfectly flat (single height)', flat.heights.length === 1, flat);
        await h.screenshot('template-flat');

        // --- 3. Arena ---
        await toMainMenu(h);
        await newGame(h, 3);
        const arena = await h.evaluate(tileStats);
        console.log('[3] arena', arena);
        check('Arena builds floor + perimeter wall (188 tiles)', arena.count === 188, arena);
        check('Arena has a raised wall ring', arena.heights.length === 2 && arena.heights[1] > arena.heights[0], arena);
        await h.screenshot('template-arena');

        // --- 4. Floating Islands ---
        await toMainMenu(h);
        await newGame(h, 4);
        const isl = await h.evaluate(tileStats);
        console.log('[4] islands', isl);
        check('Floating Islands builds its clusters (61 tiles)', isl.count === 61, isl);
        check('Islands sit at multiple heights', isl.heights.length >= 4, isl);
        await h.screenshot('template-islands');

        // --- 5. XP + level-up from defeating an enemy ---
        const lvl = await h.evaluate(async () => {
            const app = window.app, pm = app.activeMode;
            app.playerLevel = 1; app.playerXp = 20; app.saveEconomy();   // 5 XP short of level 2 (needs 25)
            const hp0max = pm.playerMaxHp;
            const e = app.findWorldObject('en_blob').createInstance();
            e.position = pm.player.position.add(new BABYLON.Vector3(1.4, 0.5, 0));
            e.hp = 1;
            pm.attackCooldown = 0; pm.comboTimer = 0;
            pm.meleeAttack();   // defeat -> +5 XP -> level 2
            return { level: app.playerLevel, xp: app.playerXp, hp0max, hp1max: pm.playerMaxHp,
                bonus: app.meleeBonus() };
        });
        console.log('\n[5] level up', lvl);
        check('defeating an enemy granted XP and leveled up (1 -> 2)', lvl.level === 2, lvl);
        check('level-up increased max HP (+5)', lvl.hp1max === lvl.hp0max + 5, lvl);
        await h.waitFrames(4);
        await h.screenshot('level-up-hud');

        // Melee damage bonus at level 5: one normal swing deals 2 damage.
        const dmg = await h.evaluate(async () => {
            const app = window.app, pm = app.activeMode;
            app.playerLevel = 5; app.playerXp = 0; app.saveEconomy();
            const e = app.findWorldObject('en_blob').createInstance();
            e.position = pm.player.position.add(new BABYLON.Vector3(1.4, 0.5, 0));
            e.hp = 2;   // survives a base swing (1), dies to a level-5 swing (2)
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack();
            const liveAfter = app.findWorldObject('en_blob').instances.filter(Boolean)
                .filter((i) => !i.defeated).length;
            return { bonus: app.meleeBonus(), liveAfter };
        });
        console.log('[5] melee bonus', dmg);
        check('level 5 grants +1 melee damage (2-hp enemy dies in one swing)',
            dmg.bonus === 1 && dmg.liveAfter === 0, dmg);

        // --- 6. Scoreboard: wired points, HUD display, target fires a spawner ---
        const sb = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const sbInst = app.findWorldObject('l_scoreboard').createInstance();
            sbInst.position = pm.player.position.add(new BABYLON.Vector3(0, 0.8, 4));
            sbInst.params.target = 5;
            const sp = app.findWorldObject('l_spawner').createInstance();
            sp.position = pm.player.position.add(new BABYLON.Vector3(4, 0.25, 4));
            sp.params.enemyType = 'flyer'; sp.params.limit = 1;
            sp.params.startActive = 'no'; sp.params.frequency = 1;
            app.addWire(sbInst, 'reached', 'l_spawner', sp.worldId, 'spawn');
            // Score points via wired-style inputs: 1 + 1 + 5 = 7 (crosses 5).
            sbInst.script.onInput('add1');
            sbInst.script.onInput('add1');
            const before = pm.enemyManager.enemies.length;
            sbInst.script.onInput('add5');
            return { score: sbInst.script.score, before };
        });
        console.log('\n[6] scoreboard', sb);
        check('scoreboard tallies wired points (1+1+5 = 7)', sb.score === 7, sb);
        await h.waitFor(() => window.app.activeMode.enemyManager.enemies.length >= 1, null, 20000);
        await h.waitFrames(4);
        const sbHud = await h.evaluate(() => ({
            hud: window.app.hud.scoreText.text, visible: window.app.hud.scoreText.isVisible,
            enemies: window.app.activeMode.enemyManager.enemies.length,
        }));
        console.log('[6] scoreboard HUD', sbHud);
        check('the score shows on the HUD', sbHud.visible === true && /SCORE\s+7/.test(sbHud.hud), sbHud);
        check('crossing the target fired `reached` (spawner spawned)', sbHud.enemies >= 1, sbHud);
        await h.screenshot('scoreboard-hud');

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — templates build, XP levels the character with stat growth, and scoreboards score/display/fire.'
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
