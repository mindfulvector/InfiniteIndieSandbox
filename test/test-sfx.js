/*
 * Sound-effects (SFX) test
 * ------------------------
 * The game synthesises all sound effects at runtime (Web Audio, no asset
 * files) via app.sound (SoundManager). Every play() request is logged to
 * app.sound.recent even when no audio device exists, so a headless run can
 * assert the game ASKED for the right sound at the right moment:
 *   - footsteps fire on a cadence while walking, tagged with the surface
 *     underfoot (grass on terrain tops, wood on a door slab, dirt on a
 *     grass-block's side face rotated upward),
 *   - jump / double-jump / land follow the character controller's state,
 *   - combat rings: melee swing+hit, enemy defeat, ranged shot, pixel blips,
 *   - hurt / death / respawn follow the survival flow,
 *   - level-up, purchase and denied-purchase ring in the economy,
 *   - wiring connect/delete click, and menu selection ticks,
 *   - M toggles a persistent mute that silences but keeps logging.
 */

const { GameHarness } = require('./harness');

let failures = 0;
function check(label, cond, extra) {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures += 1; console.log(`  FAIL  ${label}${extra ? '  ::  ' + JSON.stringify(extra) : ''}`); }
}

async function main() {
    const h = new GameHarness({ headless: process.env.IIS_HEADLESS !== '0', shotDir: process.env.IIS_SHOT_DIR });
    try {
        await h.start();
        await h.waitForReady(['t_tile', 't_block_2', 'pr_door', 'en_blob', 'l_trigger', 'l_spawner']);

        // --- 0. The manager exists; surfaces are tagged on the objects ---
        const setup = await h.evaluate(() => ({
            hasSound: !!window.app.sound,
            muted: window.app.sound.muted,
            tags: {
                t_tile: window.app.findWorldObject('t_tile').surface,
                t_block_2: window.app.findWorldObject('t_block_2').surface,
                pr_door: window.app.findWorldObject('pr_door').surface,
                pk_star: window.app.findWorldObject('pk_star').surface,
            },
        }));
        console.log('\n[0] sound manager', setup);
        check('app.sound exists and starts unmuted', setup.hasSound && setup.muted === false, setup);
        check('surface tags: terrain=grassblock, door=wood, star=stone (from its marble/starfield tex)',
            setup.tags.t_tile === 'grassblock' && setup.tags.t_block_2 === 'grassblock' &&
            setup.tags.pr_door === 'wood' && setup.tags.pk_star === 'stone', setup.tags);

        // Flat template for clean ground. The menu key presses themselves
        // should ring the menu-select sound.
        await h.tapUntil('1', () => window.app.menu.state === 11);
        await h.tapUntil('2', () => window.app.activeMode &&
            window.app.activeMode.constructor.name === 'PlayMode' && window.app.menu.state === 0);
        await h.waitFor(() => window.app.activeMode && !!window.app.activeMode.cc, null, 20000);
        await h.evaluate(() => {
            const em = window.app.activeMode.enemyManager;
            em.autoSpawn = false;
            em.enemies.forEach((e) => e.mesh.dispose(false, false));
            em.enemies = [];
        });
        await h.waitFrames(30);   // settle on the ground
        const names = () => h.evaluate(() => window.app.sound.recent.map((r) => r.name));
        const clearLog = () => h.evaluate(() => { window.app.sound.recent.length = 0; });

        const menuSounds = await names();
        console.log('\n[1] menu sounds so far:', menuSounds.filter((n) => n === 'menu-select').length, 'selects');
        check('navigating the menus rang menu-select', menuSounds.includes('menu-select'), menuSounds);

        // --- 2. Footsteps while walking, tagged grass on the terrain ---
        await clearLog();
        await h.evaluate(() => { window.app.activeMode.cc._onKeyDown({ key: 'w' }); });
        await h.waitFrames(80);
        await h.evaluate(() => { window.app.activeMode.cc._onKeyUp({ key: 'w' }); });
        const steps = await h.evaluate(() =>
            window.app.sound.recent.filter((r) => r.name === 'footstep'));
        console.log('\n[2] footsteps while walking', { count: steps.length, surfaces: steps.map((s) => s.surface) });
        check('walking produces cadenced footsteps (>= 2 in ~80 frames)', steps.length >= 2, steps);
        check('terrain-top footsteps are tagged grass',
            steps.length > 0 && steps.every((s) => s.surface === 'grass'), steps);
        await h.screenshot('walking-footsteps');

        // The walk above can carry the avatar right up to the grid's edge --
        // re-anchor at the spawn point so the teleports and jumps below happen
        // over solid ground (jumping off the world edge never lands).
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.player.position = pm.spawnPoint.clone();
        });
        await h.waitFrames(20);   // drop + settle

        // --- 3. The surface underfoot picks the footstep sound ---
        const surfaces = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const base = pm.player.position.clone();
            const out = {};

            // A door lying flat = a wood slab underfoot.
            const door = app.findWorldObject('pr_door').createInstance();
            door.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, Math.PI / 2);
            door.position = base.add(new BABYLON.Vector3(0, 2.0, 0));
            door.computeWorldMatrix(true);
            pm.player.position = door.position.add(new BABYLON.Vector3(0, 1.0, 0));
            out.wood = pm.footstepSurface();

            // A grass block: top face reads grass...
            const block = app.findWorldObject('t_block_2').createInstance();
            block.position = base.add(new BABYLON.Vector3(6, 3.0, 0));
            block.computeWorldMatrix(true);
            pm.player.position = block.position.add(new BABYLON.Vector3(0, 1.5, 0));
            out.grassTop = pm.footstepSurface();

            // ...but rolled 90 degrees a dirt SIDE face points up, and the
            // face-based resolution should hear dirt.
            block.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, Math.PI / 2);
            block.computeWorldMatrix(true);
            out.dirtSide = pm.footstepSurface();

            // Clean up and put the player back.
            app.findWorldObject('pr_door').disposeInstance(door);
            app.findWorldObject('t_block_2').disposeInstance(block);
            pm.player.position = base;
            return out;
        });
        console.log('\n[3] surface detection', surfaces);
        check('a flat door slab underfoot sounds like wood', surfaces.wood === 'wood', surfaces);
        check('a grass block top sounds like grass', surfaces.grassTop === 'grass', surfaces);
        check('a rolled grass block (dirt face up) sounds like dirt', surfaces.dirtSide === 'dirt', surfaces);

        // --- 4. Jump, double jump, land ---
        await h.waitFrames(20);   // settle after the teleports
        await clearLog();
        await h.evaluate(() => {
            const cc = window.app.activeMode.cc;
            cc._onKeyDown({ key: ' ' });
            setTimeout(() => cc._onKeyUp({ key: ' ' }), 60);
            // Second press mid-air = the double jump.
            setTimeout(() => { cc._onKeyDown({ key: ' ' }); setTimeout(() => cc._onKeyUp({ key: ' ' }), 60); }, 380);
        });
        await h.waitFor(() => {
            const n = window.app.sound.recent.map((r) => r.name);
            return n.includes('jump') && n.includes('doubleJump');
        }, null, 20000).catch(() => {});
        // The double jump flies high, and under software rendering coming back
        // down can take a while -- wait for the landing itself, generously.
        await h.waitFor(() => window.app.sound.recent.some((r) => r.name === 'land'),
            null, 60000).catch(() => {});
        const jumpNames = await names();
        console.log('\n[4] traversal sounds', jumpNames);
        check('a jump rings jump', jumpNames.includes('jump'), jumpNames);
        check('a mid-air second press rings doubleJump', jumpNames.includes('doubleJump'), jumpNames);
        check('touching down rings land', jumpNames.includes('land'), jumpNames);

        // --- 5. Combat sounds ---
        await clearLog();
        const combat = await h.evaluate(() => {
            const app = window.app, pm = app.activeMode;
            const wo = app.findWorldObject('en_blob');
            const e = wo.createInstance();
            e.hp = 1;
            e.position = pm.player.position.add(new BABYLON.Vector3(2, 0.6, 0));
            pm.attackCooldown = 0; pm.comboTimer = 0; pm.comboStage = 0;
            pm.meleeAttack(pm.player.position.add(new BABYLON.Vector3(3, 0.6, 0)));
            pm.rangedCooldown = 0;
            pm.rangedAttack(pm.player.position.add(new BABYLON.Vector3(8, 1.3, 0)));
            return { defeated: e.defeated === true };
        });
        // Pixels from the defeat home in and blip as they collect.
        await h.waitFor(() => window.app.sound.recent.some((r) => r.name === 'pixel'), null, 20000)
            .catch(() => {});
        const combatNames = await names();
        console.log('\n[5] combat sounds', { defeated: combat.defeated, names: combatNames });
        check('a melee kill rings swing + hit + enemy-defeat',
            combat.defeated && combatNames.includes('melee-swing') &&
            combatNames.includes('melee-hit') && combatNames.includes('enemy-defeat'), combatNames);
        check('a ranged attack rings ranged-shot', combatNames.includes('ranged-shot'), combatNames);
        check('collecting burst pixels blips', combatNames.includes('pixel'), combatNames);
        await h.screenshot('combat-sounds');

        // --- 6. Hurt, death, respawn ---
        await clearLog();
        await h.evaluate(() => {
            const pm = window.app.activeMode;
            pm.hurtCooldown = 0;
            pm.damagePlayer(5);          // survivable -> hurt
            pm.hurtCooldown = 0;
            pm.damagePlayer(99999);      // lethal -> death, then deferred respawn
        });
        await h.waitFrames(10);
        const survivalNames = await names();
        console.log('\n[6] survival sounds', survivalNames);
        check('taking damage rings player-hurt', survivalNames.includes('player-hurt'), survivalNames);
        check('dying rings player-death', survivalNames.includes('player-death'), survivalNames);
        check('the (deferred) respawn rings respawn', survivalNames.includes('respawn'), survivalNames);

        // --- 7. Economy: level-up, purchase, denied ---
        await clearLog();
        const economy = await h.evaluate(() => {
            const app = window.app;
            const lvl0 = app.playerLevel;
            if (app.playerLevel < 20) app.addXp(app.xpToNext(app.playerLevel));
            app.pixels = 500;
            const bought = app.buy('cp_platform_2x2');    // 40 px
            app.pixels = 0;
            app.purchasedSet.delete('d_christmas_tree');
            const deniedBuy = app.buy('d_christmas_tree'); // 25 px, can't afford
            return { lvl0, lvl1: app.playerLevel, bought, deniedBuy };
        });
        const econNames = await names();
        console.log('\n[7] economy sounds', { economy, names: econNames });
        check('levelling up rings levelup',
            economy.lvl1 > economy.lvl0 && econNames.includes('levelup'), econNames);
        check('a successful purchase rings purchase',
            economy.bought === true && econNames.includes('purchase'), econNames);
        check('an unaffordable purchase rings denied',
            economy.deniedBuy === false && econNames.includes('denied'), econNames);

        // --- 8. Wiring clicks ---
        await clearLog();
        await h.evaluate(() => {
            const app = window.app;
            const trig = app.findWorldObject('l_trigger').createInstance();
            const sp = app.findWorldObject('l_spawner').createInstance();
            app.addWire(trig, 'entered', 'l_spawner', sp.worldId, 'spawn');
            app.removeWire(trig, 'entered', 'l_spawner', sp.worldId, 'spawn');
            app.findWorldObject('l_trigger').disposeInstance(trig);
            app.findWorldObject('l_spawner').disposeInstance(sp);
        });
        const wireNames = await names();
        console.log('\n[8] wiring sounds', wireNames);
        check('connecting a wire rings wire-connect', wireNames.includes('wire-connect'), wireNames);
        check('deleting a wire rings wire-delete', wireNames.includes('wire-delete'), wireNames);

        // --- 9. M toggles a persistent mute that still logs ---
        await h.tapUntil('m', () => window.app.sound.muted === true);
        const muted = await h.evaluate(() => {
            const app = window.app;
            const before = app.sound.recent.length;
            app.sound.play('jump');
            return {
                muted: app.sound.muted,
                stored: window.localStorage.getItem('iis_muted'),
                stillLogs: app.sound.recent.length === before + 1,
            };
        });
        console.log('\n[9] mute', muted);
        check('M mutes and persists the flag', muted.muted === true && muted.stored === '1', muted);
        check('muted play() still logs (harness/debug trace)', muted.stillLogs === true, muted);
        await h.tapUntil('m', () => window.app.sound.muted === false);
        const unmuted = await h.evaluate(() => ({
            muted: window.app.sound.muted, stored: window.localStorage.getItem('iis_muted') }));
        check('M again unmutes and persists', unmuted.muted === false && unmuted.stored === '0', unmuted);

        console.log('\n========================================');
        console.log(failures === 0
            ? 'RESULT: PASS — every gameplay event rings its synthesised sound, footsteps match the surface underfoot.'
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
