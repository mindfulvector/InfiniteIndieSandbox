const MENU_HUD = 0;
const MENU_MAIN = 1;
const MENU_PAUSE = 2;
const MENU_SAVE = 3;
const MENU_LOAD = 4;
const MENU_OBJ_PROPS = 5;
const MENU_OBJ_EVENT_BINDINGS = 6;
const MENU_OBJ_EVENT_BINDING_EDIT = 7;
const MENU_SHOP = 8;
const MENU_OBJ_PARAMS = 9;
const MENU_WIRING = 10;
const MENU_WORLD_TEMPLATE = 11;
const MENU_COLLECTION = 12;
const MENU_SKILLS = 13;
const MENU_DISCS = 14;
const MENU_SHARE = 15;

const MAX_LEVEL = 20;   // character level cap

// Digital figures: the character roster. Each figure is a colorway of the
// starter avatar with its own stat lean, bought à la carte with pixels and
// levelled independently (per-figure XP/level persistence).
const FIGURES = [
    { id: 'scout', name: 'Scout', price: 0,   tint: [1.00, 1.00, 1.00], hpBonus: 0,  meleeBonus: 0, rangedHaste: 0, desc: 'Balanced all-rounder',
      special: 'shockwave', specialName: 'Shockwave' },
    { id: 'blaze', name: 'Blaze', price: 150, tint: [1.00, 0.45, 0.35], hpBonus: 0,  meleeBonus: 1, rangedHaste: 0, desc: '+1 melee damage',
      special: 'flame', specialName: 'Flame Arc' },
    { id: 'frost', name: 'Frost', price: 150, tint: [0.55, 0.75, 1.00], hpBonus: 25, meleeBonus: 0, rangedHaste: 0, desc: '+25 max HP',
      special: 'nova', specialName: 'Frost Nova' },
    { id: 'volt',  name: 'Volt',  price: 250, tint: [1.00, 0.95, 0.40], hpBonus: 10, meleeBonus: 0, rangedHaste: 6, desc: 'Faster ranged fire, +10 HP',
      special: 'bolt', specialName: 'Chain Bolt' },
];

// Round power discs: passive buff tokens, global across figures (they are
// separate physical items, like the real toys-to-life discs). Up to two are
// equipped at once, and two DIFFERENT discs stack -- that's the combine rule.
const DISCS = [
    { id: 'ember',   name: 'Ember Sigil',   price: 100, desc: '+1 melee damage' },
    { id: 'aegis',   name: 'Aegis Shell',   price: 100, desc: '+20 max HP' },
    { id: 'swift',   name: 'Swift Coil',    price: 120, desc: 'Faster dodge roll' },
    { id: 'fortune', name: 'Fortune Prism', price: 150, desc: '+25% pixels earned' },
    { id: 'sage',    name: 'Sage Lens',     price: 150, desc: '+25% XP earned' },
];
const DISC_SLOTS = 2;

// Sidekicks: adoptable companions that hover-follow the player in play mode
// and level up from a share of earned XP (or by being fed pixels). Exactly
// one is active; each level of the active sidekick adds +2 max HP through
// the same derived-stat hook figures/skills/discs use.
const SIDEKICKS = [
    { id: 'wisp',   name: 'Wisp',   price: 50, tint: [0.55, 0.9, 1.0],  desc: 'A curious mote of light' },
    { id: 'pebble', name: 'Pebble', price: 50, tint: [0.8, 0.7, 0.55],  desc: 'A loyal floating stone' },
    { id: 'spark',  name: 'Spark',  price: 80, tint: [1.0, 0.8, 0.3],   desc: 'An excitable ember' },
];
const SIDEKICK_MAX_LEVEL = 10;

// Hex discs: world-theme tokens. Each swaps the sky colour and tints the
// shared terrain atlas; exactly one is active at a time ('classic' is the
// free default look). Ownership + the active choice persist with the economy.
const HEX_DISCS = [
    { id: 'classic',   name: 'Classic Meadow', price: 0,  sky: null,               tint: [1, 1, 1],          desc: 'The standard look' },
    { id: 'midnight',  name: 'Midnight Vale',  price: 80, sky: [0.05, 0.06, 0.16], tint: [0.55, 0.62, 0.95], desc: 'Deep night, moonlit ground' },
    { id: 'emberfall', name: 'Emberfall',      price: 80, sky: [0.35, 0.12, 0.08], tint: [1.0, 0.72, 0.5],   desc: 'Sunset blaze' },
    { id: 'verdant',   name: 'Verdant Haze',   price: 80, sky: [0.08, 0.2, 0.1],   tint: [0.7, 1.0, 0.7],    desc: 'Toxic-green gloom' },
];

// Packs: bundles of figures and/or premium objects sold at a discount in the
// shop. A pack has no owned-state of its own -- it counts as owned when every
// piece of its contents is owned (buying grants whatever is still missing).
const PACKS = [
    { id: 'hero_pack',    name: 'Hero Pack',       price: 400,
      figures: ['blaze', 'frost', 'volt'], objects: [],
      desc: 'All three premium figures' },
    { id: 'winter_set',   name: 'Winter Play Set', price: 160,
      figures: ['frost'], objects: ['d_christmas_tree'],
      desc: 'Frost + the Christmas tree' },
    { id: 'neon_set',     name: 'Neon Play Set',   price: 260,
      figures: ['volt'], objects: ['cp_platform_2x2'],
      desc: 'Volt + the Cyberpunk platform' },
];

// Skill tree: every level-up grants one skill point. Points EARNED are derived
// from the level (level - 1), never stored, so they can't desync; only SPENT
// ranks persist (per figure, like level/XP). Flat ranks, no prerequisites.
const SKILLS = [
    { id: 'vitality', name: 'Vitality', max: 5, desc: '+10 max HP per rank' },
    { id: 'power',    name: 'Power',    max: 5, desc: '+1 melee damage per rank' },
    { id: 'trigger',  name: 'Trigger',  max: 3, desc: 'Faster ranged fire per rank' },
    { id: 'agility',  name: 'Agility',  max: 2, desc: 'Shorter dodge cooldown per rank' },
];

// HUD / menu theme
const HUD_ACCENT       = "#4ad6ff";   // default cyan accent
const HUD_BUILD_ACCENT = "#ffb14a";   // build mode = amber
const HUD_PLAY_ACCENT  = "#5effa0";   // play mode = green
const HUD_PANEL_BG     = "rgba(13,20,32,0.82)";
const HUD_BAR_BG       = "rgba(10,15,24,0.72)";

class App {
    constructor() {
        const app = this;
        this.toastyTimer = 0;
        this.world = null;
        this.menu = {
            state: 0,               // no menu displayed
            renderedState: 0,       // if the two numbers are different we need to update the menu
            controls: [],
        };
        this.loadedScripts = [];

        // Economy: "pixels" are the currency dropped by defeated enemies and
        // spent in the shop to unlock objects for building.
        this.pixels = 0;
        this.purchasedSet = null;   // Set of object names the player owns
        this.objectPrices = {};     // name -> price (absent/0 = free)
        this.loadEconomy();

        // Keyboard bindings
        this.keysPressed = {};
        window.addEventListener("keydown", (event) => {
            this.keysPressed[event.key.toUpperCase()] = true;
        });
        window.addEventListener("keyup", (event) => {
            this.keysPressed[event.key.toUpperCase()] = false;
        });

        window.addEventListener("gamepadconnected", (e) => {
          console.log(
            "Gamepad connected at index %d: %s. %d buttons, %d axes.",
            e.gamepad.index,
            e.gamepad.id,
            e.gamepad.buttons.length,
            e.gamepad.axes.length,
          );
        });

        // Gamepad input abstraction. PAD_MAP is the ONE declarative table of
        // button -> action; every button edge flows through handlePadButton
        // (also the tests' entry point). Edge actions land in padActions
        // (consumePad); held actions land in padHeld (padDown). The map:
        //   A (hold)         -> jump (holding glides; re-press double-jumps)
        //   X / Left Trigger -> melee attack
        //   B                -> dodge roll
        //   Y                -> figure special
        //   RB / Right Trig  -> ranged attack
        //   LB (hold)        -> block
        //   Right-stick club -> lock-on
        // Buttons arrive as an Xbox360Button enum (Xbox pads) or a raw index
        // (generic pads); each entry lists both.
        const XB = BABYLON.Xbox360Button || {};
        this.PAD_MAP = [
            { buttons: [XB.A, 0],           action: 'jump', held: true },
            { buttons: [XB.X, 2],           action: 'meleeAttack' },
            { buttons: [XB.B, 1],           action: 'dodge' },
            { buttons: [XB.Y, 3],           action: 'special' },
            { buttons: [XB.RB, 5],          action: 'rangedAttack' },
            { buttons: [XB.LB, 4],          action: 'block', held: true },
            { buttons: [XB.RightStick, 11], action: 'lockOn' },
        ];
        this.padActions = {};
        this.padHeld = {};
        this.gamepad = null;      // player 1's pad (first connected)
        this.gamepads = [];       // all connected pads, in connect order
        this.testPad = null;      // harness hook: {leftStick:{x,y}, rightStick:{x,y}}
        // Player 2's pad state (drop-in buddy): the SECOND pad's buttons land
        // here instead of the P1 action maps. testBuddyPad injects the same
        // shape for the harness: {leftStick:{x,y}, jumpHeld, attackQueued}.
        this.buddyPad = { jumpHeld: false, attackQueued: false };
        this.testBuddyPad = null;
        const gamepadManager = new BABYLON.GamepadManager();
        gamepadManager.onGamepadConnectedObservable.add((gamepad) => {
            console.log('gamepad connected', gamepad && gamepad.id);
            this.gamepads.push(gamepad);
            const isP2 = this.gamepads.length > 1;
            if(!isP2) this.gamepad = gamepad;
            if(gamepad.onButtonDownObservable) {
                gamepad.onButtonDownObservable.add((button) => {
                    if(this.gamepads.indexOf(gamepad) === 0) this.handlePadButton(button, true);
                    else {
                        // Second pad: A(0) = jump (held), X(2) = attack, and any
                        // button drops the buddy in if they're not playing yet.
                        if(button === 0) this.buddyPad.jumpHeld = true;
                        else if(button === 2) this.buddyPad.attackQueued = true;
                        this.buddyPad.wantsJoin = true;
                    }
                });
            }
            if(gamepad.onButtonUpObservable) {
                gamepad.onButtonUpObservable.add((button) => {
                    if(this.gamepads.indexOf(gamepad) === 0) this.handlePadButton(button, false);
                    else if(button === 0) this.buddyPad.jumpHeld = false;
                });
            }
            // Analog triggers on Xbox pads: press past halfway = shoot / melee.
            if(gamepad.onrighttriggerchanged) {
                gamepad.onrighttriggerchanged((v) => { if(v > 0.5 && !this._rtDown) { this.padActions.rangedAttack = true; this._rtDown = true; } else if(v <= 0.4) this._rtDown = false; });
            }
            if(gamepad.onlefttriggerchanged) {
                gamepad.onlefttriggerchanged((v) => { if(v > 0.5 && !this._ltDown) { this.padActions.meleeAttack = true; this._ltDown = true; } else if(v <= 0.4) this._ltDown = false; });
            }
        });

        gamepadManager.onGamepadDisconnectedObservable.add((gamepad) => {
            const at = this.gamepads.indexOf(gamepad);
            if(at >= 0) this.gamepads.splice(at, 1);
            if(this.gamepad === gamepad) this.gamepad = this.gamepads[0] || null;
        });

        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);

        this.camera = new BABYLON.ArcRotateCamera("Camera", 0-Math.PI / 3, Math.PI / 3, 20, BABYLON.Vector3.Zero(), this.scene);
        this.camera.wheelPrecision = 50;
        this.camera.attachControl(canvas, true);
        // Free the arrow keys for gameplay (object cycling / category switching);
        // the orbit camera binds them to rotation by default.
        this.camera.keysUp = [];
        this.camera.keysDown = [];
        this.camera.keysLeft = [];
        this.camera.keysRight = [];

        /*
        this.camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -10), this.scene);
        // The goal distance of camera from target
        this.camera.radius = 30;
        // The goal height of camera above local origin (centre) of target
        this.camera.heightOffset = 10;
        // The goal rotation of camera around local origin (centre) of target in x y plane
        this.camera.rotationOffset = 0;
        // Acceleration of camera in moving from current to goal position
        this.camera.cameraAcceleration = 0.005;
        // The speed at which acceleration is halted
        this.camera.maxCameraSpeed = 10;
        this.camera.attachControl(canvas, true);
        */

        var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene);
        //this.defaultSphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this.scene);

        //var box2 = BABYLON.Mesh.CreateBox("box2", 2, this.scene);
        //box2.checkCollisions = true;
        //box2.position = new BABYLON.Vector3(0, 8, 7);

        // Temporary camera target during loading
        //this.camera.lockedTarget = this.defaultSphere;

        // Create a full-screen UI layer
        this.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        //this.gui.parseFromURLAsync('./assets/gui/main.json');

        // Build the styled in-game HUD (mode badge, control hints, toasts, etc.)
        this.buildHUD();

        //this.activeMode = new BuildMode(app);

        // Load WorldObjects -- these are objects that can be built or are used by
        // built-in levels, etc. Basically, everything!
        this.BuildableObjectList = [];

        this.manifestObjectTarget = 0;
        this.manifestObjectCount = 0;
        this.manifestObjectFailed = 0;

        new Manifest(this);
        
        // Toggle the Babylon debug inspector
        window.addEventListener("keydown", (ev) => {
            if (ev.key === '`') {
                if (this.scene.debugLayer.isVisible()) {
                    this.scene.debugLayer.hide();
                } else {
                    this.scene.debugLayer.show();
                }
            }
        });

        this.menu.state = MENU_MAIN;



        // Scene optimization. The built-in HighDegradationAllowed preset includes
        // a HardwareScalingOptimization that lowers the render resolution when the
        // frame rate is under target. Because the fullscreen GUI texture is tied to
        // the render resolution, that made the whole HUD/menus balloon in size and
        // go blurry on any machine that dips below the target FPS. We use a custom
        // option set that keeps the cheap scene optimizations but never touches
        // hardware scaling or texture size, so the UI stays crisp and correctly
        // proportioned.
        const optOptions = new BABYLON.SceneOptimizerOptions(30, 2000);
        optOptions.addOptimization(new BABYLON.ShadowsOptimization(0));
        optOptions.addOptimization(new BABYLON.LensFlaresOptimization(0));
        optOptions.addOptimization(new BABYLON.PostProcessesOptimization(1));
        optOptions.addOptimization(new BABYLON.ParticlesOptimization(1));
        optOptions.addOptimization(new BABYLON.RenderTargetsOptimization(1));
        optOptions.addOptimization(new BABYLON.MergeMeshesOptimization(2));
        BABYLON.SceneOptimizer.OptimizeAsync(this.scene, optOptions,
        function() {
           console.log('optimized')
        }, function() {
           console.log('cannot optimize to target FPS')
        });

        // Run the main render loop
        app.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();

            if(this.menu.state == MENU_HUD) {
                if(null != this.activeMode) {
                    this.activeMode.update();
                }
            }

            this.renderUI();
            this.updateHUD();

            if(this.menu.state == MENU_HUD) {
                if(null != this.activeMode) {
                    this.activeMode.renderUI();
                }
            }

            // Drive the overhead wiring view (camera transition + interaction).
            if(this.menu.state == MENU_WIRING && this.wiring) {
                this.wiring.update();
            }

            // pump messages between objects
            
        });
    }

    // Build the in-game HUD: a styled set of overlay controls that read like a
    // real game (mode badge, contextual control hints, selected-object readout,
    // toast notifications, loading indicator) plus a dim backdrop for menus.
    buildHUD() {
        const A = BABYLON.GUI.Control;
        this.hud = {};

        // Dim backdrop shown behind menus so the 3D scene recedes.
        const backdrop = new BABYLON.GUI.Rectangle("hudBackdrop");
        backdrop.width = "100%";
        backdrop.height = "100%";
        backdrop.thickness = 0;
        backdrop.background = "rgba(4,6,12,0.55)";
        backdrop.isVisible = false;
        backdrop.isPointerBlocker = true;   // swallow camera-drags behind menus
        this.gui.addControl(backdrop);
        this.hud.backdrop = backdrop;

        // --- Mode badge (top-left) ---
        const badge = new BABYLON.GUI.Rectangle("hudBadge");
        badge.height = "40px";
        badge.width = "188px";
        badge.cornerRadius = 8;
        badge.thickness = 2;
        badge.color = HUD_ACCENT;
        badge.background = HUD_PANEL_BG;
        badge.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        badge.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        badge.left = "18px";
        badge.top = "16px";
        badge.isVisible = false;
        this.gui.addControl(badge);
        this.hud.badge = badge;

        const badgeDot = new BABYLON.GUI.Ellipse("hudBadgeDot");
        badgeDot.width = "12px";
        badgeDot.height = "12px";
        badgeDot.thickness = 0;
        badgeDot.background = HUD_ACCENT;
        badgeDot.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        badgeDot.left = "14px";
        badge.addControl(badgeDot);
        this.hud.badgeDot = badgeDot;

        const badgeText = new BABYLON.GUI.TextBlock("hudBadgeText");
        badgeText.text = "";
        badgeText.color = "#ffffff";
        badgeText.fontSize = 16;
        badgeText.fontStyle = "bold";
        badgeText.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        badgeText.paddingLeft = "36px";
        badge.addControl(badgeText);
        this.modeName = badgeText;   // kept for BuildMode/PlayMode compatibility

        // --- Selected-object readout (top-right, build mode only) ---
        const objInfo = new BABYLON.GUI.Rectangle("hudObjInfo");
        objInfo.height = "40px";
        objInfo.adaptWidthToChildren = true;
        objInfo.cornerRadius = 8;
        objInfo.thickness = 2;
        objInfo.color = HUD_BUILD_ACCENT;
        objInfo.background = HUD_PANEL_BG;
        objInfo.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_RIGHT;
        objInfo.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        objInfo.left = "-18px";
        objInfo.top = "62px";   // sits below the pixel counter
        objInfo.isVisible = false;
        this.gui.addControl(objInfo);
        const objText = new BABYLON.GUI.TextBlock("hudObjInfoText");
        objText.resizeToFit = true;
        objText.color = "#ffffff";
        objText.fontSize = 15;
        objText.paddingLeft = "16px";
        objText.paddingRight = "16px";
        objInfo.addControl(objText);
        this.hud.objInfo = objInfo;
        this.hud.objInfoText = objText;

        // --- Pixel counter (top-right) ---
        const pixelPill = new BABYLON.GUI.Rectangle("hudPixels");
        pixelPill.height = "34px";
        pixelPill.adaptWidthToChildren = true;
        pixelPill.cornerRadius = 17;
        pixelPill.thickness = 2;
        pixelPill.color = "#ff5bd0";
        pixelPill.background = HUD_PANEL_BG;
        pixelPill.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_RIGHT;
        pixelPill.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        pixelPill.left = "-18px";
        pixelPill.top = "16px";
        pixelPill.isVisible = false;
        this.gui.addControl(pixelPill);
        const pixelRow = new BABYLON.GUI.StackPanel("hudPixelsRow");
        pixelRow.isVertical = false;
        pixelRow.height = "34px";
        pixelPill.addControl(pixelRow);
        // A little 2x2 cluster of colored squares as the "pixels" icon.
        const iconWrap = new BABYLON.GUI.Rectangle("hudPixelIcon");
        iconWrap.width = "20px"; iconWrap.height = "20px"; iconWrap.thickness = 0;
        iconWrap.paddingLeft = "12px";
        const iconColors = ['#ff5bd0', '#5bd0ff', '#ffe14a', '#7dff6b'];
        for (let i = 0; i < 4; i++) {
            const sq = new BABYLON.GUI.Rectangle();
            sq.width = "8px"; sq.height = "8px"; sq.thickness = 0;
            sq.background = iconColors[i];
            sq.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
            sq.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
            sq.left = (i % 2) * 9 + "px";
            sq.top = Math.floor(i / 2) * 9 + "px";
            iconWrap.addControl(sq);
        }
        pixelRow.addControl(iconWrap);
        const pixelText = new BABYLON.GUI.TextBlock("hudPixelsText");
        pixelText.text = "0";
        pixelText.color = "#ffffff";
        pixelText.fontSize = 16;
        pixelText.fontStyle = "bold";
        pixelText.resizeToFit = true;
        pixelText.paddingLeft = "8px";
        pixelText.paddingRight = "14px";
        pixelRow.addControl(pixelText);
        this.hud.pixelPill = pixelPill;
        this.hud.pixelText = pixelText;

        // --- Player health bar (top-left, below the mode badge) ---
        const healthWrap = new BABYLON.GUI.Rectangle("hudHealth");
        healthWrap.width = "200px";
        healthWrap.height = "18px";
        healthWrap.cornerRadius = 9;
        healthWrap.thickness = 2;
        healthWrap.color = "#ff5b6e";
        healthWrap.background = "rgba(13,20,32,0.85)";
        healthWrap.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        healthWrap.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        healthWrap.left = "18px";
        healthWrap.top = "64px";
        healthWrap.isVisible = false;
        this.gui.addControl(healthWrap);
        const healthFill = new BABYLON.GUI.Rectangle("hudHealthFill");
        healthFill.width = "100%";
        healthFill.height = "100%";
        healthFill.thickness = 0;
        healthFill.cornerRadius = 8;
        healthFill.background = "#39ff9a";
        healthFill.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        healthWrap.addControl(healthFill);
        const healthLabel = new BABYLON.GUI.TextBlock("hudHealthLabel");
        healthLabel.text = "HP";
        healthLabel.color = "#0b1018";
        healthLabel.fontSize = 11;
        healthLabel.fontStyle = "bold";
        healthWrap.addControl(healthLabel);
        this.hud.healthWrap = healthWrap;
        this.hud.healthFill = healthFill;

        // --- Level badge + XP progress bar (top-left, beside/below health) ---
        const levelText = new BABYLON.GUI.TextBlock("hudLevel");
        levelText.text = "LV 1";
        levelText.color = "#ffd76a";
        levelText.fontSize = 14;
        levelText.fontStyle = "bold";
        levelText.height = "20px";
        levelText.width = "160px";
        levelText.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        levelText.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        levelText.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        levelText.left = "226px";
        levelText.top = "64px";
        levelText.isVisible = false;
        this.gui.addControl(levelText);
        this.hud.levelText = levelText;

        const xpWrap = new BABYLON.GUI.Rectangle("hudXp");
        xpWrap.width = "200px";
        xpWrap.height = "6px";
        xpWrap.cornerRadius = 3;
        xpWrap.thickness = 1;
        xpWrap.color = "rgba(255,215,106,0.6)";
        xpWrap.background = "rgba(13,20,32,0.85)";
        xpWrap.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        xpWrap.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        xpWrap.left = "18px";
        xpWrap.top = "86px";
        xpWrap.isVisible = false;
        this.gui.addControl(xpWrap);
        const xpFill = new BABYLON.GUI.Rectangle("hudXpFill");
        xpFill.width = "0%";
        xpFill.height = "100%";
        xpFill.thickness = 0;
        xpFill.cornerRadius = 3;
        xpFill.background = "#ffd76a";
        xpFill.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        xpWrap.addControl(xpFill);
        this.hud.xpWrap = xpWrap;
        this.hud.xpFill = xpFill;

        // --- Scoreboard readout (top-center, under the toast) ---
        const scoreText = new BABYLON.GUI.TextBlock("hudScore");
        scoreText.text = "";
        scoreText.color = "#ffcf5e";
        scoreText.fontSize = 22;
        scoreText.fontStyle = "bold";
        scoreText.height = "30px";
        scoreText.width = "300px";
        scoreText.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        scoreText.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        scoreText.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        scoreText.top = "62px";
        scoreText.isVisible = false;
        this.gui.addControl(scoreText);
        this.hud.scoreText = scoreText;

        // --- Race clock (top-center, under the scoreboard readout) ---
        const raceText = new BABYLON.GUI.TextBlock("hudRace");
        raceText.text = "";
        raceText.color = "#7ef3ff";
        raceText.fontSize = 20;
        raceText.fontStyle = "bold";
        raceText.height = "28px";
        raceText.width = "360px";
        raceText.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        raceText.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        raceText.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        raceText.top = "92px";
        raceText.isVisible = false;
        this.gui.addControl(raceText);
        this.hud.raceText = raceText;

        // --- Wave counter (top-left, below the health bar) ---
        const waveText = new BABYLON.GUI.TextBlock("hudWave");
        waveText.text = "";
        waveText.color = "#8fd9ff";
        waveText.fontSize = 14;
        waveText.fontStyle = "bold";
        waveText.height = "20px";
        waveText.width = "200px";
        waveText.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        waveText.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        waveText.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        waveText.left = "20px";
        waveText.top = "88px";
        waveText.isVisible = false;
        this.gui.addControl(waveText);
        this.hud.waveText = waveText;

        // --- Toast / notification (top-center) ---
        const toast = new BABYLON.GUI.Rectangle("hudToast");
        toast.adaptWidthToChildren = true;
        toast.height = "38px";
        toast.cornerRadius = 19;
        toast.thickness = 1;
        toast.color = HUD_ACCENT;
        toast.background = "rgba(13,20,32,0.92)";
        toast.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        toast.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        toast.top = "18px";
        toast.isVisible = false;
        this.gui.addControl(toast);
        const toastText = new BABYLON.GUI.TextBlock("hudToastText");
        toastText.resizeToFit = true;
        toastText.color = "#eaf6ff";
        toastText.fontSize = 15;
        toastText.paddingLeft = "22px";
        toastText.paddingRight = "22px";
        toast.addControl(toastText);
        this.hud.toast = toast;
        this.message = toastText;   // kept for toasty() compatibility

        // --- Control-hints bar (bottom-center) ---
        const hintsBar = new BABYLON.GUI.Rectangle("hudHints");
        hintsBar.adaptWidthToChildren = true;
        hintsBar.height = "46px";
        hintsBar.cornerRadius = 10;
        hintsBar.thickness = 1;
        hintsBar.color = "rgba(255,255,255,0.18)";
        hintsBar.background = HUD_BAR_BG;
        hintsBar.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        hintsBar.verticalAlignment = A.VERTICAL_ALIGNMENT_BOTTOM;
        hintsBar.top = "-18px";
        hintsBar.isVisible = false;
        this.gui.addControl(hintsBar);
        const hintsPanel = new BABYLON.GUI.StackPanel("hudHintsPanel");
        hintsPanel.isVertical = false;
        hintsPanel.height = "46px";
        hintsPanel.paddingLeft = "10px";
        hintsPanel.paddingRight = "10px";
        hintsBar.addControl(hintsPanel);
        this.hud.hintsBar = hintsBar;
        this.hud.hintsPanel = hintsPanel;

        // --- Loading indicator (bottom-right) ---
        const loading = new BABYLON.GUI.Rectangle("hudLoading");
        loading.adaptWidthToChildren = true;
        loading.height = "30px";
        loading.cornerRadius = 15;
        loading.thickness = 1;
        loading.color = HUD_ACCENT;
        loading.background = "rgba(13,20,32,0.88)";
        loading.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_RIGHT;
        loading.verticalAlignment = A.VERTICAL_ALIGNMENT_BOTTOM;
        loading.left = "-18px";
        loading.top = "-18px";
        loading.isVisible = false;
        this.gui.addControl(loading);
        const loadingText = new BABYLON.GUI.TextBlock("hudLoadingText");
        loadingText.resizeToFit = true;
        loadingText.color = "#bfe9ff";
        loadingText.fontSize = 13;
        loadingText.paddingLeft = "14px";
        loadingText.paddingRight = "14px";
        loading.addControl(loadingText);
        this.hud.loading = loading;
        this.loadingText = loadingText;

        // Build-mode object browser (bottom bar with runtime thumbnails).
        this.buildObjectBrowser();
    }

    // Disney-Infinity-style object browser: a bottom bar that lets the player
    // scroll through every buildable object as a thumbnail tile and click to
    // select it for placement. Thumbnails are rendered at runtime and cached.
    buildObjectBrowser() {
        const A = BABYLON.GUI.Control;
        this.thumbRenderer = new ThumbnailRenderer(this, 112);
        this._objTiles = [];          // {index, wo, tile, image, placeholder}
        this._objBrowserCount = -1;   // BuildableObjectList length the bar was built for
        this._objBrowserSel = -2;     // currently highlighted index
        this._bakeQueue = [];
        this._baking = false;

        const BAR_H = 152;

        const bar = new BABYLON.GUI.Rectangle("hudObjBar");
        bar.width = "100%";
        bar.height = BAR_H + "px";
        bar.thickness = 0;
        bar.background = "rgba(9,14,22,0.86)";
        bar.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        bar.verticalAlignment = A.VERTICAL_ALIGNMENT_BOTTOM;
        bar.isVisible = false;
        bar.isPointerBlocker = true;
        this.gui.addControl(bar);
        this.hud.objBar = bar;
        this.hud.objBarHeight = BAR_H;

        // Accent line along the top edge.
        const topLine = new BABYLON.GUI.Rectangle("hudObjBarTop");
        topLine.width = "100%";
        topLine.height = "3px";
        topLine.thickness = 0;
        topLine.background = HUD_BUILD_ACCENT;
        topLine.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        bar.addControl(topLine);

        // Category chip (top-left).
        const cat = new BABYLON.GUI.TextBlock("hudObjCat");
        cat.text = "";
        cat.color = HUD_BUILD_ACCENT;
        cat.fontSize = 14;
        cat.fontStyle = "bold";
        cat.height = "26px";
        cat.paddingLeft = "22px";
        cat.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        cat.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        cat.top = "8px";
        bar.addControl(cat);
        this.hud.objCat = cat;

        // Selected-object name (top-center, like the Disney Infinity caption).
        const name = new BABYLON.GUI.TextBlock("hudObjName");
        name.text = "";
        name.color = "#ffffff";
        name.fontSize = 18;
        name.fontStyle = "bold";
        name.height = "26px";
        name.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        name.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        name.top = "8px";
        bar.addControl(name);
        this.hud.objName = name;

        // Horizontal scroller holding the thumbnail tiles.
        const scroll = new BABYLON.GUI.ScrollViewer("hudObjScroll");
        scroll.width = "96%";
        scroll.height = "104px";
        scroll.thickness = 0;
        scroll.background = "rgba(0,0,0,0)";
        scroll.barColor = HUD_BUILD_ACCENT;
        scroll.barBackground = "rgba(255,255,255,0.08)";
        scroll.barSize = 8;
        scroll.verticalAlignment = A.VERTICAL_ALIGNMENT_BOTTOM;
        scroll.top = "-8px";
        bar.addControl(scroll);
        this.hud.objScroll = scroll;

        const stack = new BABYLON.GUI.StackPanel("hudObjStack");
        stack.isVertical = false;
        stack.height = "96px";
        stack.paddingLeft = "8px";
        stack.paddingRight = "8px";
        scroll.addControl(stack);
        this.hud.objStack = stack;
    }

    // The category the bar should be showing: the selected object's category,
    // else the mode's browse category (up/down can browse a category whose
    // objects are all locked), else whatever the bar already shows.
    desiredBrowserCategory(bm) {
        const list = this.BuildableObjectList;
        const sel = bm ? bm.selectedObjectIndex : -1;
        if(sel >= 0 && sel < list.length && list[sel]) {
            const c = this.objectCategory(list[sel].name);
            if(bm) bm.browseCat = c;   // keep browse state in step with selection
            return c;
        }
        if(bm && bm.browseCat) return bm.browseCat;
        if(this._objBrowserCat) return this._objBrowserCat;
        return list.length ? this.objectCategory(list[0].name) : null;
    }

    // (Re)build the tile row, showing ONLY the given category (up/down in build
    // mode moves between categories, and the bar follows).
    populateObjectBrowser(category) {
        if(!this.hud || !this.hud.objStack) return;
        if(!category) category = this._objBrowserCat ||
            (this.BuildableObjectList.length ? this.objectCategory(this.BuildableObjectList[0].name) : null);
        const stack = this.hud.objStack;
        stack.children.slice().forEach((c) => { stack.removeControl(c); c.dispose(); });
        this._objTiles = [];
        this._bakeQueue = [];

        let shown = 0;
        this.BuildableObjectList.forEach((wo, index) => {
            if(category && this.objectCategory(wo.name) !== category) return;
            const tile = this.makeObjectTile(wo, index);
            stack.addControl(tile.tile);
            this._objTiles.push(tile);
            shown += 1;
            // Use a cached thumbnail if we already baked one this session.
            if(wo.thumbUrl) {
                tile.image.source = wo.thumbUrl;
                tile.image.isVisible = true;
                tile.placeholder.isVisible = false;
            } else {
                this._bakeQueue.push(tile);
            }
        });
        this._objBrowserCat = category;
        this._objBrowserCount = this.BuildableObjectList.length;
        this._objBrowserSel = -2;     // force a highlight refresh
        if(this.hud.objCat) this.hud.objCat.text = (category || '') + '  ·  ' + shown + '  ·  ↑/↓ to switch';
        this._bakeThumbnails();
    }

    makeObjectTile(wo, index) {
        const A = BABYLON.GUI.Control;
        const app = this;

        const tile = new BABYLON.GUI.Rectangle("objTile_" + index);
        tile.width = "84px";
        tile.height = "84px";
        tile.paddingLeft = "6px";
        tile.paddingRight = "6px";
        tile.thickness = 2;
        tile.cornerRadius = 10;
        tile.color = "rgba(255,255,255,0.18)";
        tile.background = "rgba(255,255,255,0.04)";
        tile.isPointerBlocker = true;

        const placeholder = new BABYLON.GUI.TextBlock("objTilePh_" + index);
        placeholder.text = this.prettyName(wo.name);
        placeholder.color = "#7f8ea3";
        placeholder.fontSize = 11;
        placeholder.textWrapping = true;
        tile.addControl(placeholder);

        const image = new BABYLON.GUI.Image("objTileImg_" + index);
        image.width = "72px";
        image.height = "72px";
        image.stretch = BABYLON.GUI.Image.STRETCH_UNIFORM;
        image.isVisible = false;
        tile.addControl(image);

        // Locked (unpurchased) objects are dimmed with a price tag; clicking one
        // attempts to buy it.
        const locked = !this.isPurchased(wo.name);
        const restColor = locked ? "rgba(255,120,120,0.35)" : "rgba(255,255,255,0.18)";
        if(locked) {
            image.alpha = 0.35;
            tile.background = "rgba(40,20,26,0.5)";
            const price = new BABYLON.GUI.TextBlock("objTilePrice_" + index);
            price.text = "⬣ " + this.priceOf(wo.name);   // hex/gem glyph + price
            price.color = "#ff9bce";
            price.fontSize = 12;
            price.fontStyle = "bold";
            price.height = "16px";
            price.textVerticalAlignment = A.VERTICAL_ALIGNMENT_BOTTOM;
            price.paddingBottom = "4px";
            tile.addControl(price);
        }
        tile.color = restColor;

        tile.onPointerEnterObservable.add(() => {
            if(index !== app._objBrowserSel) tile.color = locked ? "#ff7b9b" : HUD_BUILD_ACCENT;
        });
        tile.onPointerOutObservable.add(() => {
            if(index !== app._objBrowserSel) tile.color = restColor;
        });
        tile.onPointerUpObservable.add(() => app.selectBuildObject(index));

        return { index: index, wo: wo, tile: tile, image: image, placeholder: placeholder, locked: locked };
    }

    // Bake thumbnails one at a time so we never run several render targets at
    // once; tiles fill in progressively and results are cached on the object.
    async _bakeThumbnails() {
        if(this._baking) return;
        this._baking = true;
        try {
            while(this._bakeQueue.length > 0) {
                const tile = this._bakeQueue.shift();
                if(!tile || !tile.wo || !tile.wo.mesh) continue;
                if(tile.wo.thumbUrl) {
                    tile.image.source = tile.wo.thumbUrl;
                    tile.image.isVisible = true;
                    tile.placeholder.isVisible = false;
                    continue;
                }
                const url = await this.thumbRenderer.generate(tile.wo.mesh);
                if(url) {
                    tile.wo.thumbUrl = url;
                    // The tile row may have been rebuilt while we awaited; only
                    // touch the tile if it's still the current one.
                    if(this._objTiles.indexOf(tile) >= 0) {
                        tile.image.source = url;
                        tile.image.isVisible = true;
                        tile.placeholder.isVisible = false;
                    }
                }
            }
        } finally {
            this._baking = false;
        }
    }

    // Select an object for placement from the browser. Locked objects can't be
    // placed until bought — clicking one attempts the purchase.
    selectBuildObject(index) {
        if(!this.activeMode || this.activeMode.constructor.name !== 'BuildMode') return;
        const wo = this.BuildableObjectList[index];
        if(wo && !this.isPurchased(wo.name)) {
            if(!this.buy(wo.name)) {          // shows a toast if unaffordable
                this.refreshObjBrowserSelection(index);
                return;
            }
            this.populateObjectBrowser();     // refresh lock overlays
        }
        this.activeMode.requestSelectIndex(index);
        this.refreshObjBrowserSelection(index);
    }

    // Highlight the given tile and update the caption/category.
    refreshObjBrowserSelection(index) {
        if(!this.hud || !this._objTiles) return;
        this._objBrowserSel = index;
        this._objTiles.forEach((t) => {
            const on = (t.index === index);
            const restColor = t.locked ? "rgba(255,120,120,0.35)" : "rgba(255,255,255,0.18)";
            const restBg = t.locked ? "rgba(40,20,26,0.5)" : "rgba(255,255,255,0.04)";
            t.tile.color = on ? HUD_BUILD_ACCENT : restColor;
            t.tile.thickness = on ? 3 : 2;
            t.tile.background = on ? "rgba(255,177,74,0.18)" : restBg;
        });
        const wo = this.BuildableObjectList[index];
        if(wo) {
            this.hud.objName.text = this.prettyName(wo.name);
            this.hud.objCat.text = this.objectCategory(wo.name) + '  ·  ' +
                this._objTiles.length + '  ·  ↑/↓ to switch';
        } else {
            // No selection (browsing / cursor mode): don't leave a stale caption.
            this.hud.objName.text = '';
            this.hud.objCat.text = (this._objBrowserCat || '') + '  ·  ' +
                this._objTiles.length + '  ·  ↑/↓ to switch';
        }
    }

    objectCategory(name) {
        const p = (name || '').split('_')[0];
        return ({
            t: 'TERRAIN', pr: 'PROPS', al: 'ARCHITECTURE',
            cp: 'CYBERPUNK', d: 'DECOR', l: 'LOGIC', en: 'ENEMIES',
            pk: 'PICKUPS', in: 'INTERIOR'
        })[p] || 'OBJECTS';
    }

    // Build one "[KEY] Label" hint chip for the control-hints bar.
    makeHintChip(key, label, spaced) {
        const wrap = new BABYLON.GUI.StackPanel();
        wrap.isVertical = false;
        wrap.height = "46px";
        wrap.adaptWidthToChildren = true;
        if(spaced) wrap.paddingLeft = "14px";

        const pill = new BABYLON.GUI.Rectangle();
        pill.height = "24px";
        pill.adaptWidthToChildren = true;
        pill.cornerRadius = 5;
        pill.thickness = 1;
        pill.color = HUD_ACCENT;
        pill.background = "rgba(74,214,255,0.14)";
        const keyText = new BABYLON.GUI.TextBlock();
        keyText.text = key;
        keyText.resizeToFit = true;
        keyText.color = "#dff6ff";
        keyText.fontSize = 13;
        keyText.fontStyle = "bold";
        keyText.paddingLeft = "8px";
        keyText.paddingRight = "8px";
        pill.addControl(keyText);
        wrap.addControl(pill);

        const lbl = new BABYLON.GUI.TextBlock();
        lbl.text = label;
        lbl.resizeToFit = true;
        lbl.color = "#c8d4e6";
        lbl.fontSize = 14;
        lbl.paddingLeft = "7px";
        wrap.addControl(lbl);

        return wrap;
    }

    // Replace the control-hints bar contents with the given [{k,label}] list.
    setControlHints(hints) {
        if(!this.hud) return;
        const panel = this.hud.hintsPanel;
        panel.children.slice().forEach((c) => { panel.removeControl(c); c.dispose(); });
        hints.forEach((h, i) => panel.addControl(this.makeHintChip(h.k, h.label, i > 0)));
    }

    // Show/hide the loading indicator (bottom-right).
    setLoading(on, n, total) {
        if(!this.hud) return;
        this.hud.loading.isVisible = !!on;
        if(on) {
            this.loadingText.text = 'Loading  ' + n + ' / ' + total;
        }
    }

    // Turn an internal object id (e.g. 'pr_door', 't_cube_1x1') into a friendly
    // display name (e.g. 'Door', 'Cube 1x1') for the selected-object readout.
    prettyName(name) {
        if(!name) return '';
        let n = name.replace(/^(t|pr|al|cp|d|l)_/, '').replace(/_/g, ' ');
        return n.replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Refresh the badge + control hints for the active mode (called when the
    // mode changes).
    refreshModeHud(mode) {
        if(!this.hud) return;
        if(mode === 'BuildMode') {
            this.modeName.text = "BUILD MODE";
            this.hud.badge.color = HUD_BUILD_ACCENT;
            this.hud.badgeDot.background = HUD_BUILD_ACCENT;
            this._buildHintMode = null;     // force updateHUD to set the right set
        } else if(mode === 'PlayMode') {
            this.modeName.text = "PLAY MODE";
            this.hud.badge.color = HUD_PLAY_ACCENT;
            this.hud.badgeDot.background = HUD_PLAY_ACCENT;
            this.setControlHints([
                {k:'WASD',  label:'Move'},
                {k:'Shift', label:'Run'},
                {k:'Space', label:'Jump ×2 · hold: Glide'},
                {k:'LMB',   label:'Melee'},
                {k:'RMB',   label:'Shoot'},
                {k:'R',     label:'Launch'},
                {k:'V',     label:'Special'},
                {k:'G',     label:'Block'},
                {k:'C',     label:'Dodge'},
                {k:'T',     label:'Lock-on'},
                {k:'Esc',   label:'Menu'},
            ]);
        }
    }

    // Control hints for build mode differ between placing an object and the
    // cursor/select sub-mode (entered with 0), which is where targeted deletes
    // happen.
    setBuildHints(cursorMode) {
        if(cursorMode) {
            this.setControlHints([
                {k:'WASD',  label:'Move cursor'},
                {k:'Enter', label:'Move'},
                {k:'Space', label:'Settings'},
                {k:'Del',   label:'Remove'},
                {k:'Esc',   label:'Menu'},
            ]);
        } else {
            this.setControlHints([
                {k:'← / →', label:'Cycle'},
                {k:'↑ / ↓', label:'Category'},
                {k:'WASD',   label:'Move'},
                {k:'R / V',  label:'Raise'},
                {k:'Z / C',  label:'Rotate'},
                {k:'Space',  label:'Place'},
                {k:'0',      label:'Select'},
            ]);
        }
    }

    // Per-frame HUD refresh: toggles gameplay overlay vs. menu backdrop, and
    // updates the build-mode selected-object readout.
    updateHUD() {
        if(!this.hud) return;
        const inHud = (this.menu.state === MENU_HUD);
        const mode = this.activeMode ? this.activeMode.constructor.name : null;

        // The wiring view is a full 3D overhead view, so it must not be dimmed by
        // the menu backdrop even though it isn't the gameplay HUD.
        this.hud.backdrop.isVisible = !inHud && this.menu.state !== MENU_WIRING;
        this.hud.badge.isVisible = inHud && !!mode;
        this.hud.hintsBar.isVisible = inHud && !!mode;

        // Pixel counter is shown whenever we're in a gameplay mode.
        if(this.hud.pixelPill) {
            this.hud.pixelPill.isVisible = inHud && !!mode;
            this.hud.pixelText.text = String(this.pixels);
        }

        // Health bar + wave counter (play mode only).
        const pm = (mode === 'PlayMode') ? this.activeMode : null;
        if(this.hud.healthWrap) {
            const showCombat = inHud && !!pm;
            this.hud.healthWrap.isVisible = showCombat;
            this.hud.waveText.isVisible = showCombat;
            if(showCombat) {
                const frac = Math.max(0, Math.min(1, pm.playerHp / pm.playerMaxHp));
                this.hud.healthFill.width = Math.round(frac * 100) + "%";
                this.hud.healthFill.background = frac > 0.5 ? "#39ff9a" : (frac > 0.25 ? "#ffd23f" : "#ff4a5b");
                this.hud.waveText.text = "WAVE " + (pm.enemyManager ? pm.enemyManager.wave : 1);
            }
        }

        // Character level + XP progress (play mode only).
        if(this.hud.levelText) {
            const showLvl = inHud && !!pm;
            this.hud.levelText.isVisible = showLvl;
            this.hud.xpWrap.isVisible = showLvl;
            if(showLvl) {
                this.hud.levelText.text = this.activeFigureDef().name + " · LV " + this.playerLevel;
                const need = this.xpToNext(this.playerLevel);
                const frac = (this.playerLevel >= MAX_LEVEL) ? 1 : Math.max(0, Math.min(1, this.playerXp / need));
                this.hud.xpFill.width = Math.round(frac * 100) + "%";
            }
        }

        // Scoreboard readout: shown while a placed scoreboard exists in play mode.
        if(this.hud.scoreText) {
            let sb = null;
            if(inHud && pm) {
                const wo = this.findWorldObject('l_scoreboard');
                if(wo) sb = wo.instances.filter((i) => i && i.script)[0] || null;
            }
            this.hud.scoreText.isVisible = !!sb;
            if(sb) {
                this.hud.scoreText.text = "SCORE  " + sb.script.score +
                    (sb.params && sb.params.target ? "  /  " + sb.params.target : "");
            }
        }

        // Reconfigure badge/hints only when the active mode actually changes.
        if(mode !== this._hudMode) {
            this._hudMode = mode;
            this.refreshModeHud(mode);
        }

        // Build-mode selected-object readout.
        const bm = (mode === 'BuildMode') ? this.activeMode : null;
        const showObj = !!(inHud && bm && bm.currentWorldObject);
        this.hud.objInfo.isVisible = showObj;
        if(showObj) {
            const idx = (bm.selectedObjectIndex | 0) + 1;
            const total = this.BuildableObjectList.length;
            this.hud.objInfoText.text = this.prettyName(bm.currentWorldObject.name) + '    ' + idx + ' / ' + total;
        }

        // Build-mode object browser: show it, keep it populated as objects load,
        // mirror the active selection, and lift the control-hints bar above it.
        const buildHud = inHud && (mode === 'BuildMode');
        if(this.hud.objBar) {
            this.hud.objBar.isVisible = buildHud;
            if(buildHud) {
                // Rebuild the bar when objects finish loading OR the selection
                // moved to another category (up/down) -- the bar shows only the
                // current category.
                const wantCat = this.desiredBrowserCategory(bm);
                if(this._objBrowserCount !== this.BuildableObjectList.length ||
                   this._objBrowserCat !== wantCat) {
                    this.populateObjectBrowser(wantCat);
                }
                const sel = bm ? bm.selectedObjectIndex : -1;
                if(sel !== this._objBrowserSel) {
                    this.refreshObjBrowserSelection(sel);
                }
                // Swap control hints between placement and cursor/select sub-mode.
                const cursorMode = !(bm && bm.currentInstance);
                const wantMode = cursorMode ? 'cursor' : 'place';
                if(wantMode !== this._buildHintMode) {
                    this._buildHintMode = wantMode;
                    this.setBuildHints(cursorMode);
                }
            }
            this.hud.hintsBar.top = buildHud ? ('-' + (this.hud.objBarHeight + 12) + 'px') : '-18px';
        }
    }

    uploadLoadingMessage() {
        // An asset is "settled" once it has either loaded or definitively failed.
        // The indicator clears when everything has settled, so a single bad asset
        // can no longer pin "Loading x/y" on screen permanently.
        const settled = this.manifestObjectCount + this.manifestObjectFailed;
        if(settled < this.manifestObjectTarget) {
            this.setLoading(true, this.manifestObjectCount, this.manifestObjectTarget);
        } else {
            this.setLoading(false);
            if(this.manifestObjectFailed > 0) {
                this.toasty(this.manifestObjectFailed + ' asset(s) could not be loaded.');
            }
        }
    }

    goto_buildMode() {
        this.activeMode?.dispose();
        this.activeMode = new BuildMode(this);
        this.menu.state = 0;             // none, close menu
    }
    goto_playMode() {
        this.activeMode?.dispose();
        this.activeMode = new PlayMode(this);
        this.menu.state = 0;             // none, close menu
    }

    // System-wide updates such as starting and existing particular modes
    update() {
        if(this.keyPressed('ESCAPE')) {
            if(this.menu.state == MENU_HUD) {
                if(null != this.activeMode) {
                    this.activeMode?.dispose();
                    this.activeMode = null;
                    this.modeName.text = "[NullMode]";
                    this.menu.state = MENU_PAUSE;
                } else {
                    this.toasty('No active mode to exit!');
                }
            } else {
                // Cancel button
                this.triggerMenuItem(this.menu.state, 0);
            }
        }

        if(this.menu.state != MENU_HUD) {
            if(this.keyPressed('1')) this.triggerMenuItem(this.menu.state, 1);
            if(this.keyPressed('2')) this.triggerMenuItem(this.menu.state, 2);
            if(this.keyPressed('3')) this.triggerMenuItem(this.menu.state, 3);
            if(this.keyPressed('4')) this.triggerMenuItem(this.menu.state, 4);
            if(this.keyPressed('5')) this.triggerMenuItem(this.menu.state, 5);
            if(this.keyPressed('6')) this.triggerMenuItem(this.menu.state, 6);
            if(this.keyPressed('7')) this.triggerMenuItem(this.menu.state, 7);
            if(this.keyPressed('8')) this.triggerMenuItem(this.menu.state, 8);
            if(this.keyPressed('9')) this.triggerMenuItem(this.menu.state, 9);
            if(this.keyPressed('0')) this.triggerMenuItem(this.menu.state, 0);
        }
    }

    triggerMenuItem(menuState, menuItem) {
        const app = this;
        switch(menuState) {
        case MENU_MAIN:
            switch(menuItem) {
            case 1:                                 // New Game -> pick a starter world
                app.menu.prevState = MENU_MAIN;
                app.menu.state = MENU_WORLD_TEMPLATE;
                break;
            case 2:                                 // Load Game
                app.menu.prevState = MENU_MAIN;     // So we cancel back to the right place
                app.menu.state = MENU_LOAD;
                break;
            case 3:                                 // Collection (figure roster)
                app.menu.prevState = MENU_MAIN;
                app.menu.state = MENU_COLLECTION;
                break;
            case 4:                                 // About
                break;
            case 5:                                 // Quit
                break;
            case 6:                                 // Share Worlds (export/import files)
                app.menu.prevState = MENU_MAIN;
                app.menu.state = MENU_SHARE;
                break;
            }
            break;
        case MENU_SHARE:
            if(menuItem === 0) {
                app.menu.state = app.menu.prevState || MENU_MAIN;
            } else if(menuItem === 1) {
                app.downloadWorld();
            } else if(menuItem === 2) {
                app.importWorldFromPicker();
            }
            break;
        case MENU_PAUSE:
            switch(menuItem) {
            case 1:                                 // Build Mode
                app.goto_buildMode();
                break;
            case 2:                                 // Play Mode
                app.goto_playMode();
                break;
            case 3:                                 // Save Game
                //app.world.saveToSlot(1);
                app.menu.prevState = MENU_PAUSE;    // So we cancel back to the right place
                app.menu.state = MENU_SAVE;
                break;
            case 4:                                 // Load Game
                app.menu.prevState = MENU_PAUSE;    // So we cancel back to the right place
                app.menu.state = MENU_LOAD;
                //app.world = new SandboxWorld(app);
                //app.world.loadFromSlot(1);
                //app.goto_playMode();
                //app.menu.state = MENU_HUD;
                break;
            case 5:                                 // Quit to Main Menu
                app.menu.state = MENU_MAIN;
                break;
            case 6:                                 // Shop
                app.menu.prevState = MENU_PAUSE;
                app.menu.state = MENU_SHOP;
                break;
            case 7:                                 // Wiring
                app.openWiring();
                break;
            case 8:                                 // Collection (figure roster)
                app.menu.prevState = MENU_PAUSE;
                app.menu.state = MENU_COLLECTION;
                break;
            case 9:                                 // Skill tree
                app.menu.prevState = MENU_PAUSE;
                app.menu.state = MENU_SKILLS;
                break;
            }
            break;
        case MENU_COLLECTION: {
            if(menuItem === 0) {
                app.menu.state = app.menu.prevState || MENU_MAIN;
            } else if(menuItem === 9) {
                app.menu.discsPrevState = app.menu.prevState || MENU_MAIN;
                app.menu.state = MENU_DISCS;
            } else if(menuItem === 8) {
                app.feedSidekick();
                app.menu.renderedState = -1;
            } else if(menuItem >= 5 && menuItem <= 4 + SIDEKICKS.length) {
                const sk = SIDEKICKS[menuItem - 5];
                if(sk) {
                    app.adoptSidekick(sk.id);   // adopts, or toggles follow if owned
                    app.menu.renderedState = -1;
                }
            } else {
                const fig = FIGURES[menuItem - 1];
                if(fig) {
                    if(app.ownsFigure(fig.id)) app.selectFigure(fig.id);
                    else app.buyFigure(fig.id);
                    app.menu.renderedState = -1;   // re-render with new state
                }
            }
            break;
        }
        case MENU_DISCS: {
            if(menuItem === 0) {
                app.menu.prevState = app.menu.discsPrevState || MENU_MAIN;
                app.menu.state = MENU_COLLECTION;
            } else if(menuItem <= DISCS.length) {
                const disc = DISCS[menuItem - 1];
                if(disc) {
                    app.buyDisc(disc.id);   // buys, or toggles equip if owned
                    app.menu.renderedState = -1;
                }
            } else {
                // Rows after the round discs are the hex world themes.
                const hx = HEX_DISCS[menuItem - DISCS.length - 1];
                if(hx) {
                    app.buyHexDisc(hx.id);   // buys, or selects if owned
                    app.menu.renderedState = -1;
                }
            }
            break;
        }
        case MENU_SKILLS: {
            if(menuItem === 0) {
                app.menu.state = app.menu.prevState || MENU_PAUSE;
            } else if(menuItem === 9) {
                app.resetSkills();
                app.menu.renderedState = -1;       // re-render with refunded points
            } else {
                const skill = SKILLS[menuItem - 1];
                if(skill) {
                    app.spendSkillPoint(skill.id);
                    app.menu.renderedState = -1;   // re-render with new ranks
                }
            }
            break;
        }
        case MENU_WIRING:
            // Any cancel/back action leaves the wiring view.
            if(app.wiring) app.wiring.exit();
            app.menu.state = app.menu.prevState || MENU_PAUSE;
            break;
        case MENU_WORLD_TEMPLATE: {
            // Pick a starter world to build the new game from. Item 1 (Rolling
            // Hills) is the classic default, so pressing 1-1 from the main menu
            // still starts a standard game.
            const kinds = { 1: 'rolling', 2: 'flat', 3: 'arena', 4: 'islands', 5: 'hub' };
            if(menuItem === 0) {
                app.menu.state = app.menu.prevState || MENU_MAIN;
            } else if(kinds[menuItem]) {
                app.menu.state = MENU_HUD;
                app.world = new SandboxWorld(app);
                app.world.clearWorld();
                app.world.buildTemplate(kinds[menuItem]);
                app.goto_playMode();
            }
            break;
        }
        case MENU_SHOP:
            if(menuItem == 0) {
                app.menu.state = app.menu.prevState || MENU_PAUSE;
            } else {
                const items = app.premiumObjects();
                if(menuItem <= items.length) {
                    const it = items[menuItem - 1];
                    if(it && !it.owned) {
                        app.buy(it.name);   // deducts pixels + toasts
                        if(app.activeMode && app.activeMode.constructor.name === 'BuildMode') {
                            app.populateObjectBrowser();   // refresh lock overlays
                        }
                    }
                } else {
                    // Items past the objects are packs (numbered after them).
                    const pack = PACKS[menuItem - items.length - 1];
                    if(pack && !app.packOwned(pack.id)) {
                        app.buyPack(pack.id);
                        if(app.activeMode && app.activeMode.constructor.name === 'BuildMode') {
                            app.populateObjectBrowser();   // pack may unlock objects
                        }
                    }
                }
                app.menu.renderedState = -1;    // force the shop to re-render
            }
            break;
        case MENU_OBJ_PARAMS:
            // Any close action returns to the gameplay HUD.
            app.menu.state = MENU_HUD;
            app.paramTarget = null;
            break;
        case MENU_SAVE:
            if(menuItem == 0) {
                app.menu.state = app.menu.prevState;
            } else {
                if(app.world && app.world.saveToSlot(menuItem)) {
                    app.menu.state = app.menu.prevState;
                } else {
                    app.showMessage('Failed to save to slot ' + menuItem + '!');
                }
            }
            break;
        case MENU_LOAD:
            if(menuItem == 0) {
                app.menu.state = app.menu.prevState;
            } else {
                if(!app.world) {
                    app.world = new SandboxWorld(app);
                }
                if(app.world && app.world.loadFromSlot(menuItem)) {
                    app.menu.state = MENU_HUD;
                    app.goto_playMode();
                } else {
                    app.showMessage('Failed to load from slot ' + menuItem + '!');
                }
            }
            break;
        case MENU_OBJ_PROPS:
        case MENU_OBJ_EVENT_BINDINGS:
        case MENU_OBJ_EVENT_BINDING_EDIT:
            app.activeMode.triggerMenuItem(menuState, menuItem);
            break;
        }
    }

    showMessage(message) {
        const app = this;
        app.clearMenu();
        this.MenuRect({height: 10});
        this.MenuItem({
            type: 'text',
            name: 'messageLabel',
            text: message
        });
        this.MenuItem({
            type: 'button',
            name: 'btnMessageOK',
            text: 'OK',
            handler: () => {
                app.menu.state = app.menu.prevState;
            }
        });
    }

    clearMenu() {
        // Remove any menu that is visible before building new menu
        this.menu.controls.forEach((button) => {
            button?.dispose();
        });
        // Reset the list so we don't re-dispose stale controls (and leak) on
        // every subsequent menu render.
        this.menu.controls = [];
        this.menu.panel = null;
    }
    renderUI() {
        const app = this;

        if(this.menu.renderedState != this.menu.state) {
            const activeMenuState = this.menu.state;

            app.clearMenu();

            switch(this.menu.state) {
            case MENU_HUD:                                      // Not really a "menu", just the HUD GUI
                
                break;
            case MENU_MAIN:                                     // Menu before loading a world
                this.MenuRect();

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'Welcome to the',
                    fontSize: 15,
                    color: '#9fb3c8',
                });

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'INFINITE INDIE',
                    fontSize: 30,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'SANDBOX',
                    fontSize: 34,
                    accent: true,
                });

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: '',
                    fontSize: 8,
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnNew',
                    text: '1. New Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 1);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnLoad',
                    text: '2. Load Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 2);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnCollection',
                    text: '3. Collection',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 3);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnAbout',
                    text: '4. About',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 4);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnQuit',
                    text: '5. Quit',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 5);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnShare',
                    text: '6. Share Worlds',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 6);
                    }
                });
                break;
            case MENU_PAUSE:                                    // Esc menu when playing
                this.MenuRect();

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: 'PAUSED',
                    fontSize: 24,
                    accent: true,
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnBuild',
                    text: '1. Build Mode',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 1);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnResume',
                    text: '2. Play Mode',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 2);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnSave',
                    text: '3. Save Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 3);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnLoad',
                    text: '4. Load Game',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 4);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnLoad',
                    text: '5. Quit to Main Menu',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 5);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnShop',
                    text: '6. Shop',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 6);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnWiring',
                    text: '7. Wiring',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 7);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnCollection',
                    text: '8. Collection',
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 8);
                    }
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnSkills',
                    text: '9. Skills' + (this.skillPointsUnspent() > 0 ? '   ● ' + this.skillPointsUnspent() + ' point' + (this.skillPointsUnspent() === 1 ? '' : 's') : ''),
                    handler: () => {
                        app.triggerMenuItem(MENU_PAUSE, 9);
                    }
                });

                break;
            case MENU_SHOP:
                this.MenuRect();

                this.MenuItem({
                    type: 'text',
                    name: 'shopTitle',
                    text: 'SHOP',
                    fontSize: 24,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'shopBalance',
                    text: 'Pixels: ' + this.pixels,
                    fontSize: 16,
                    color: '#ff9bce',
                });

                const shopItems = this.premiumObjects();
                if(shopItems.length === 0) {
                    this.MenuItem({ type: 'text', name: 'shopEmpty', text: 'Nothing for sale right now.' });
                } else {
                    shopItems.forEach((it, i) => {
                        this.MenuItem({
                            type: 'button',
                            name: 'btnShopItem_' + i,
                            text: (i + 1) + '. ' + this.prettyName(it.name) +
                                (it.owned ? '   ✓ Owned' : '   ' + it.price + ' px'),
                            handler: () => { app.triggerMenuItem(MENU_SHOP, i + 1); }
                        });
                    });
                }

                // Packs sit BELOW the objects and number after them, so the
                // object item indices (which tests and muscle memory rely on)
                // never shift as packs come and go.
                this.MenuItem({
                    type: 'text',
                    name: 'shopPacksHdr',
                    text: '— PACKS —',
                    fontSize: 14,
                    color: '#9fb3c8',
                });
                PACKS.forEach((pack, i) => {
                    const n = shopItems.length + i + 1;
                    const owned = this.packOwned(pack.id);
                    const saving = this.packValue(pack.id) - pack.price;
                    this.MenuItem({
                        type: 'button',
                        name: 'btnShopPack_' + pack.id,
                        text: n + '. ' + pack.name + ' — ' + pack.desc +
                            (owned ? '   ✓ Owned'
                                   : '   ' + pack.price + ' px' + (saving > 0 ? ' (save ' + saving + ')' : '')),
                        handler: () => { app.triggerMenuItem(MENU_SHOP, n); }
                    });
                });

                this.MenuItem({
                    type: 'button',
                    name: 'btnShopBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_SHOP, 0); }
                });
                break;
            case MENU_OBJ_PARAMS: {
                const inst = this.paramTarget;
                this.MenuRect();
                this.MenuItem({
                    type: 'text',
                    name: 'paramTitle',
                    text: (inst && inst.worldObject ? this.prettyName(inst.worldObject.name) : 'Object') + ' Settings',
                    fontSize: 22,
                    accent: true,
                });
                if(!inst || !inst.script || !inst.script.paramDefs) {
                    this.MenuItem({ type: 'text', name: 'paramNone', text: 'This object has no settings.' });
                } else {
                    inst.script.paramDefs.forEach((pdef) => {
                        const cur = (inst.params && inst.params[pdef.key] != null) ? inst.params[pdef.key] : pdef.default;
                        this.MenuItem({
                            type: 'param',
                            label: pdef.label,
                            // Unit suffix only applies to numeric values -- an enum
                            // option like 'no' must not render as "nos".
                            value: String(cur) + (pdef.unit && typeof cur === 'number' ? pdef.unit : ''),
                            onPrev: () => { app.cycleParam(inst, pdef, -1); app.menu.renderedState = -1; },
                            onNext: () => { app.cycleParam(inst, pdef, +1); app.menu.renderedState = -1; },
                        });
                    });
                }
                this.MenuItem({
                    type: 'button',
                    name: 'btnParamsDone',
                    text: '0. Done',
                    handler: () => { app.triggerMenuItem(MENU_OBJ_PARAMS, 0); }
                });
                break;
            }
            case MENU_SAVE:
            case MENU_LOAD:
                this.MenuRect();

                this.MenuItem({
                    type: 'text',
                    name: 'menuLabel',
                    text: (this.menu.state == MENU_SAVE ? 'SAVE GAME' : 'LOAD GAME'),
                    fontSize: 24,
                    accent: true,
                });

                for(let saveSlot = 1; saveSlot <= 9; saveSlot++) {
                    this.MenuItem({
                        type: 'button',
                        name: ((this.menu.state == MENU_SAVE) ? 'btnSave_Slot'+saveSlot : 'btnLoad_Slot'+saveSlot),
                        text: ((this.menu.state == MENU_SAVE) ? 'Save To Slot '+saveSlot : 'Load From Slot '+saveSlot),
                        handler: () => {
                            app.triggerMenuItem(this.menu.state, saveSlot);
                        }
                    });
                }

                this.MenuItem({
                    type: 'button',
                    name: 'btnSaveLoadCancel',
                    text: '0. Cancel',
                    handler: () => {
                        app.triggerMenuItem(this.menu.state, 0);
                    }
                });
                break;
            case MENU_WIRING:
                // The wiring view owns its own GUI (title, hint, node labels),
                // built in WiringView.enter() and disposed in exit(). Nothing to
                // build through the menu system here.
                break;
            case MENU_COLLECTION: {
                this.MenuRect();
                this.MenuItem({
                    type: 'text',
                    name: 'colTitle',
                    text: 'COLLECTION',
                    fontSize: 22,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'colBalance',
                    text: 'Pixels: ' + this.pixels,
                    fontSize: 15,
                    color: '#ff9bce',
                });
                FIGURES.forEach((fig, i) => {
                    const owned = this.ownsFigure(fig.id);
                    const active = this.activeFigure === fig.id;
                    const status = active ? '★ PLAYING' : (owned ? 'Owned' : fig.price + ' px');
                    this.MenuItem({
                        type: 'button',
                        name: 'btnFig_' + fig.id,
                        text: (i + 1) + '. ' + fig.name + '  ·  LV ' + this.figureLevelOf(fig.id) +
                              '  ·  ' + fig.desc + '   [' + status + ']',
                        handler: () => { app.triggerMenuItem(MENU_COLLECTION, i + 1); }
                    });
                });
                this.MenuItem({
                    type: 'text',
                    name: 'skHdr',
                    text: '— SIDEKICKS —',
                    fontSize: 14,
                    color: '#9fb3c8',
                });
                SIDEKICKS.forEach((sk, i) => {
                    const n = 5 + i;
                    const owned = this.ownsSidekick(sk.id);
                    const active = this.activeSidekick === sk.id;
                    const status = active ? '★ FOLLOWING · LV ' + this.sidekickLevelOf(sk.id)
                                          : (owned ? 'Owned · LV ' + this.sidekickLevelOf(sk.id) : sk.price + ' px');
                    this.MenuItem({
                        type: 'button',
                        name: 'btnSk_' + sk.id,
                        text: n + '. ' + sk.name + ' — ' + sk.desc + '   [' + status + ']',
                        handler: () => { app.triggerMenuItem(MENU_COLLECTION, n); }
                    });
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnSkFeed',
                    text: '8. Feed sidekick  (10 px → 10 XP)',
                    handler: () => { app.triggerMenuItem(MENU_COLLECTION, 8); }
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnColDiscs',
                    text: '9. Power Discs  (' + this.equippedDiscs.length + '/' + DISC_SLOTS + ' equipped)',
                    handler: () => { app.triggerMenuItem(MENU_COLLECTION, 9); }
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnColBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_COLLECTION, 0); }
                });
                break;
            }
            case MENU_DISCS: {
                this.MenuRect();
                this.MenuItem({
                    type: 'text',
                    name: 'discTitle',
                    text: 'POWER DISCS  ·  ' + this.equippedDiscs.length + '/' + DISC_SLOTS + ' equipped',
                    fontSize: 22,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'discBalance',
                    text: 'Pixels: ' + this.pixels + '   ·   two different discs stack',
                    fontSize: 15,
                    color: '#ff9bce',
                });
                DISCS.forEach((disc, i) => {
                    const owned = this.ownsDisc(disc.id);
                    const eq = this.discEquipped(disc.id);
                    const status = eq ? '◉ EQUIPPED' : (owned ? 'Owned' : disc.price + ' px');
                    this.MenuItem({
                        type: 'button',
                        name: 'btnDisc_' + disc.id,
                        text: (i + 1) + '. ' + disc.name + ' — ' + disc.desc + '   [' + status + ']',
                        handler: () => { app.triggerMenuItem(MENU_DISCS, i + 1); }
                    });
                });
                this.MenuItem({
                    type: 'text',
                    name: 'hexHdr',
                    text: '— WORLD THEMES (HEX) —',
                    fontSize: 14,
                    color: '#9fb3c8',
                });
                HEX_DISCS.forEach((hx, i) => {
                    const n = DISCS.length + i + 1;
                    const active = this.activeHexDisc === hx.id;
                    const status = active ? '◉ ACTIVE' : (this.ownsHexDisc(hx.id) ? 'Owned' : hx.price + ' px');
                    this.MenuItem({
                        type: 'button',
                        name: 'btnHex_' + hx.id,
                        text: n + '. ' + hx.name + ' — ' + hx.desc + '   [' + status + ']',
                        handler: () => { app.triggerMenuItem(MENU_DISCS, n); }
                    });
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnDiscBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_DISCS, 0); }
                });
                break;
            }
            case MENU_SHARE: {
                this.MenuRect();
                this.MenuItem({
                    type: 'text',
                    name: 'shareTitle',
                    text: 'SHARE WORLDS',
                    fontSize: 22,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'shareHint',
                    text: 'Worlds travel as .json files — send them to friends.',
                    fontSize: 14,
                    color: '#9fb3c8',
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnShareExport',
                    text: '1. Export the current world to a file',
                    handler: () => { app.triggerMenuItem(MENU_SHARE, 1); }
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnShareImport',
                    text: '2. Import a world file',
                    handler: () => { app.triggerMenuItem(MENU_SHARE, 2); }
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnShareBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_SHARE, 0); }
                });
                break;
            }
            case MENU_SKILLS: {
                this.MenuRect();
                this.MenuItem({
                    type: 'text',
                    name: 'skillTitle',
                    text: 'SKILLS — ' + this.activeFigureDef().name + ' · LV ' + this.playerLevel,
                    fontSize: 22,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'skillPoints',
                    text: this.skillPointsUnspent() + ' point' + (this.skillPointsUnspent() === 1 ? '' : 's') +
                          ' to spend  ·  1 earned per level-up',
                    fontSize: 15,
                    color: '#ff9bce',
                });
                SKILLS.forEach((s, i) => {
                    const rank = this.skillRank(s.id);
                    const pips = '●'.repeat(rank) + '○'.repeat(s.max - rank);
                    this.MenuItem({
                        type: 'button',
                        name: 'btnSkill_' + s.id,
                        text: (i + 1) + '. ' + s.name + '  ' + pips + '   ' + s.desc +
                              (rank >= s.max ? '   [MAX]' : ''),
                        handler: () => { app.triggerMenuItem(MENU_SKILLS, i + 1); }
                    });
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnSkillReset',
                    text: '9. Reset skills (free)',
                    handler: () => { app.triggerMenuItem(MENU_SKILLS, 9); }
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnSkillBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_SKILLS, 0); }
                });
                break;
            }
            case MENU_WORLD_TEMPLATE: {
                this.MenuRect();
                this.MenuItem({
                    type: 'text',
                    name: 'tplTitle',
                    text: 'CHOOSE A STARTER WORLD',
                    fontSize: 22,
                    accent: true,
                });
                const templates = [
                    { n: 1, label: '1. Rolling Hills — gentle terrain (classic)' },
                    { n: 2, label: '2. Flat Plane — a blank canvas' },
                    { n: 3, label: '3. Arena — walled floor for combat games' },
                    { n: 4, label: '4. Floating Islands — platforming start' },
                    { n: 5, label: '5. Sandbox Hub — pre-wired challenge park' },
                ];
                templates.forEach((t) => {
                    this.MenuItem({
                        type: 'button',
                        name: 'btnTpl_' + t.n,
                        text: t.label,
                        handler: () => { app.triggerMenuItem(MENU_WORLD_TEMPLATE, t.n); }
                    });
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnTplBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_WORLD_TEMPLATE, 0); }
                });
                break;
            }
            case MENU_OBJ_PROPS:
            case MENU_OBJ_EVENT_BINDINGS:
            case MENU_OBJ_EVENT_BINDING_EDIT:
                app.activeMode.renderUI(this.menu.state);
                break;
            }

            // so we don't try to render again, remember which state we last rendered
            this.menu.renderedState = activeMenuState;
        }
    }

    createWorldObject(objectName, assetProps, scriptClass=null) {
        // assetProps can have two formats:
        //      for a model: {
        //          rootUrl: '',
        //          filename: ''
        //      }
        //  (this matches the asset librarian format)
        // or, for primitive based object: {
        //          prims: [
        //             {ty: 'box',       s: [2,1,2], p: [0,0,0]},
        //             {ty: 'cylindar',  s: [1,5,1], p: [0,0,0], tex: {id: 'brick', w: 10, h:6}}
        //          ]
        // }
        //
        // either format may have additional options defined:
        //      colliderMesh: 1                     // which submesh to enable collisions for
        let app = this;

        app.manifestObjectTarget++;
        app.uploadLoadingMessage();

        if(null != scriptClass) {
            // loadedScripts is an array of class names -- membership must be
            // checked with indexOf. (Indexing the array by name was always
            // undefined, so scripts shared by several objects were injected
            // repeatedly, throwing "Identifier already declared".)
            if(this.loadedScripts.indexOf(scriptClass) < 0) {
                console.log('loading script: '+scriptClass);
                this.loadedScripts.push(scriptClass);
                var scriptLoader = document.createElement('script');
                scriptLoader.setAttribute('src', './assets/scripts/'+scriptClass+'.js');
                // Script files load asynchronously but instances eval
                // 'new <ScriptClass>(...)' synchronously, so count each script
                // file toward the manifest settle. "Game ready" (and the loading
                // pill) then genuinely waits for script classes to exist --
                // otherwise a world auto-loaded at boot could instantiate an
                // object before its script arrived and throw a ReferenceError.
                app.manifestObjectTarget++;
                scriptLoader.onload = () => { app.manifestObjectCount++; app.uploadLoadingMessage(); };
                scriptLoader.onerror = () => {
                    console.error('Failed to load script `' + scriptClass + '`');
                    app.manifestObjectFailed++;
                    app.uploadLoadingMessage();
                };
                document.head.appendChild(scriptLoader);
            } else {
                console.log('script already loaded: '+scriptClass);
            }
        }

        // Mesh based objects
        if(typeof assetProps.rootUrl != 'undefined' && typeof assetProps.filename != 'undefined') {
            BABYLON.SceneLoader.ImportMeshAsync("", assetProps.rootUrl, assetProps.filename, this.scene).then((result) => {
                if(typeof assetProps.colliderMeshes != 'undefined') {
                    for(let i = 0; i < result.meshes.length; i++){
                        if(-1 != assetProps.colliderMeshes.indexOf(result.meshes[i].name)) {
                            result.meshes[i].checkCollisions = true;
                            console.log('enabled collisions on mesh #'+i+' in '+assetProps.filename, result.meshes[i]);
                            //childMeshes[i].showBoundingBox = true;
                        }
                    }
                } else {
                    console.log('%cWarning! No colliderMeshes for asset `%c'+assetProps.filename+'%c`: %c'+JSON.stringify(assetProps), 'color: orange;', 'color: red;', 'color: orange;', 'color: default;');
                    console.log('Please set to an array with one of these mesh names:');
                    for(let i = 0; i < result.meshes.length; i++){
                        if(result.meshes[i].name != '__root__') {
                            console.log(result.meshes[i].name);
                        }
                    }                    
                }

                // Check if the model is a single empty __root__ node with a single mesh under it
                let parent = result.meshes[0];
                if(result.meshes.length == 1) {
                    object = parent;
                    var nestedMeshes = false;
                } else if(result.meshes.length == 2 && parent.name == '__root__') {
                    // If so, remove the root node and just save the child mesh so we can easily
                    // have instances instead of needing deep clones and cluttering up the scene
                    // graph.
                    var object = parent.getChildMeshes()[0];    // The real mesh
                    var nestedMeshes = false;
                    object.setParent(null);                     // Removes parent while preserving rotation, scale, position, etc.
                    parent.dispose();                           // Get rid of the __root__ node
                    object.isVisible = false;
                } else {
                    // Multi-part model. If the loader handed us a single __root__
                    // container, keep using it. Otherwise (e.g. a multi-submesh OBJ
                    // with a flat mesh list and no shared root) the parts are
                    // siblings, so group them all under one holder node. Without
                    // this only the first submesh became the object and the rest
                    // were left orphaned and visible at the world origin.
                    var object;
                    if(parent.name == '__root__') {
                        object = parent;
                    } else {
                        object = new BABYLON.TransformNode(objectName + '__root', app.scene);
                        result.meshes.slice().forEach((m) => {
                            if(m !== object && m.parent == null) {
                                m.setParent(object);    // preserves world transform
                            }
                        });
                    }

                    // The instance is built by deep-cloning this template (nested),
                    // so geometry is still shared but the whole model travels together.
                    let childMeshes = object.getChildMeshes();
                    if(typeof assetProps.colliderMeshes != 'undefined') {
                        for(let i = 0; i < childMeshes.length; i++) {
                            if(-1 != assetProps.colliderMeshes.indexOf(childMeshes[i].name)) {
                                childMeshes[i].checkCollisions = true;
                            }
                        }
                    }
                    for(let i = 0; i < childMeshes.length; i++) {
                        childMeshes[i].isVisible = false;
                    }
                    var nestedMeshes = true;
                }
                // The template is invisible and only ever cloned/instanced, so it
                // must not collide -- otherwise it sits at the origin as an
                // invisible obstacle. (colliderMeshes flag the parts that should
                // collide when placed; instances get that via showAll.)
                app.disableCollisionsTree(object);
                let woNewAsset = new WorldObject(app, objectName, object, nestedMeshes, scriptClass);
                if(assetProps.anchor) woNewAsset.anchor = assetProps.anchor;
                app.BuildableObjectList.push(woNewAsset);
                app.manifestObjectCount++;
                app.uploadLoadingMessage();
            }).catch((err) => {
                // Without this, a failed/unreachable asset would never settle and
                // the loading indicator would be stuck on screen forever.
                console.error('Failed to load asset `' + assetProps.filename + '`:', err);
                app.manifestObjectFailed++;
                app.uploadLoadingMessage();
            });
        }

        // Grass/dirt terrain blocks: a box wearing the shared atlas material --
        // real grass on the top face, real dirt on the sides and bottom.
        //      { grassBlock: { s: [width, height, depth] } }
        else if(typeof assetProps.grassBlock != 'undefined') {
            const s = assetProps.grassBlock.s;
            // Map the top face (4) to the grass half of the atlas, everything
            // else to the dirt half.
            const SIDE = new BABYLON.Vector4(0, 0, 0.5, 1);
            const TOP = new BABYLON.Vector4(0.5, 0, 1, 1);
            const faceUV = [];
            for(let i = 0; i < 6; i++) faceUV.push(i === 4 ? TOP : SIDE);
            const box = BABYLON.MeshBuilder.CreateBox('grassBlock', {
                width: s[0], height: s[1], depth: s[2], faceUV: faceUV }, app.scene);
            box.name += '[' + box.uniqueId + ']';
            box.isVisible = false;
            box.material = app.terrainAtlasMaterial();
            // Invisible template must never collide (see the mesh branch).
            app.disableCollisionsTree(box);
            let woNewAsset = new WorldObject(app, objectName, box, false, scriptClass);
            if(assetProps.anchor) woNewAsset.anchor = assetProps.anchor;
            this.BuildableObjectList.push(woNewAsset);
            app.manifestObjectCount++;
            app.uploadLoadingMessage();
        }

        // Primitive based objects. A single prim becomes the object directly
        // (instanced per placement); multiple prims form a hierarchy -- the
        // FIRST prim is the root (author it at p [0,0,0]; placement re-centres
        // by bounding box anyway) and later prims become children offset by
        // their `p`, so the whole group clones as one placeable object.
        else if(typeof assetProps.prims != 'undefined') {
            var object = null;
            var nestedMeshes = assetProps.prims.length > 1;
            assetProps.prims.forEach((p) => {
                var prim = null;

                switch(p.ty) {
                case 'box':
                    prim = BABYLON.MeshBuilder.CreateBox('prim.box', { 
                        width: p.s[0], 
                        height: p.s[1], 
                        depth: p.s[2]}, app.scene);
                    break;
                case 'sphere':
                    prim = BABYLON.MeshBuilder.CreateSphere('prim.sphere', {
                        diameter: p.s[0] }, app.scene);
                    break;
                case 'cylinder':
                    prim = BABYLON.MeshBuilder.CreateCylinder('prim.cylinder', {
                        diameterBottom: p.s[0],
                        height: p.s[1],
                        diameterTop: p.s[2],
                        tessellation: p.s[3],
                        subdivisions: p.s[4] }, app.scene);
                    break;
                }

                if(null != prim) {
                    prim.isVisible = false;

                    // Optional addressable name (nm) so scripts can find a
                    // specific child on instances (e.g. a door's sliding
                    // panel); otherwise keep the generic prim.<type> name.
                    if(typeof p.nm != 'undefined') prim.name = p.nm;
                    // make name unique by adding uniqueId to it
                    prim.name += '[' + prim.uniqueId + ']';

                    // Place the prim at its offset within the object.
                    if(p.p) prim.position = new BABYLON.Vector3(p.p[0], p.p[1], p.p[2]);

                    // apply a solid colour if required (col: [r,g,b])
                    if(typeof p.col != 'undefined') {
                        var colMat = new BABYLON.StandardMaterial('colMat['+prim.uniqueId+']', app.scene);
                        colMat.diffuseColor = new BABYLON.Color3(p.col[0], p.col[1], p.col[2]);
                        colMat.emissiveColor = new BABYLON.Color3(p.col[0]*0.35, p.col[1]*0.35, p.col[2]*0.35);
                        prim.material = colMat;
                    }

                    // Apply a procedural texture if required (tex: {id, ...}).
                    // Composes with col: the diffuse colour tints the texture
                    // (with a much subtler emissive so the pattern stays visible).
                    if(typeof p.tex != 'undefined') {
                        const tex = app.makeProceduralTexture(p.tex, prim.uniqueId);
                        if(tex) {
                            var mat = (prim.material instanceof BABYLON.StandardMaterial)
                                ? prim.material
                                : new BABYLON.StandardMaterial(p.tex.id + 'Mat[' + prim.uniqueId + ']', app.scene);
                            mat.diffuseTexture = tex;
                            if(typeof p.col != 'undefined') {
                                mat.emissiveColor = new BABYLON.Color3(p.col[0]*0.12, p.col[1]*0.12, p.col[2]*0.12);
                            }
                            prim.material = mat;
                        } else {
                            console.error('error in createWorldObject: tex definition has invalid id: `'+p.tex.id+'`', assetProps);
                        }
                    }

                    if(null == object) {
                        object = prim;
                    } else {
                        prim.parent = object;   // children clone with the root
                    }
                }
            });
            
            if(null != object) {
                // Invisible template must never collide (see the mesh branch).
                app.disableCollisionsTree(object);
                let woNewAsset = new WorldObject(app, objectName, object, nestedMeshes, scriptClass);
                if(assetProps.anchor) woNewAsset.anchor = assetProps.anchor;
                this.BuildableObjectList.push(woNewAsset);
                app.manifestObjectCount++;
                app.uploadLoadingMessage();
            } else {
                console.error('error in createWorldObject: assetProps understood to be prims structure, but no primitives generated:', assetProps);
            }
        } else {
            console.error('error in createWorldObject: cannot understand the assetProps:', assetProps);
        }
    }

    // Build a procedural texture from a prim tex spec ({id, ...tuning}).
    // All are rendered ONCE (refreshRate 0) so they cost nothing per frame --
    // important under software rendering. Returns null for unknown ids.
    makeProceduralTexture(spec, uid) {
        let tex = null;
        try {
            switch(spec.id) {
            case 'brick':
                tex = new BABYLON.BrickProceduralTexture('brickTex[' + uid + ']', 512, this.scene);
                tex.numberOfBricksHeight = spec.h || 6;
                tex.numberOfBricksWidth = spec.w || 10;
                break;
            case 'wood':
                tex = new BABYLON.WoodProceduralTexture('woodTex[' + uid + ']', 1024, this.scene, null, true);
                tex.ampScale = spec.s || 100;
                break;
            case 'grass':
                // The REAL grass image (the same albedo the big gltf terrain
                // cube uses) -- replaces the earlier procedural grass.
                tex = new BABYLON.Texture('assets/textures/grass3_albedo.png', this.scene);
                tex.name = 'grassTex[' + uid + ']';
                break;
            case 'dirt':
                tex = new BABYLON.Texture('assets/textures/dirt.png', this.scene);
                tex.name = 'dirtTex[' + uid + ']';
                break;
            case 'marble':
                tex = new BABYLON.MarbleProceduralTexture('marbleTex[' + uid + ']', 512, this.scene);
                tex.numberOfTilesHeight = spec.h || 1;
                tex.numberOfTilesWidth = spec.w || 1;
                break;
            case 'noise':
                tex = new BABYLON.PerlinNoiseProceduralTexture('noiseTex[' + uid + ']', 256, this.scene);
                break;
            case 'starfield':
                tex = new BABYLON.StarfieldProceduralTexture('starTex[' + uid + ']', 512, this.scene);
                break;
            case 'cloud':
                tex = new BABYLON.CloudProceduralTexture('cloudTex[' + uid + ']', 512, this.scene);
                break;
            case 'road':
                tex = new BABYLON.RoadProceduralTexture('roadTex[' + uid + ']', 512, this.scene);
                break;
            }
        } catch (e) {
            console.error('makeProceduralTexture failed for `' + spec.id + '`:', e);
            return null;
        }
        if(tex) {
            tex.refreshRate = 0;               // render once, then it's a plain texture
            if(spec.u) tex.uScale = spec.u;    // optional tiling
            if(spec.v) tex.vScale = spec.v;
        }
        return tex;
    }

    // One shared material for all grass/dirt terrain blocks: the REAL grass
    // and dirt images baked side by side into a single atlas (dirt in the left
    // half, grass in the right half). A single material keeps the blocks
    // instancable -- Babylon instances don't support MultiMaterial -- so a
    // full 10x10 terrain stays one draw call per block type.
    terrainAtlasMaterial() {
        if(this._terrainAtlasMat) return this._terrainAtlasMat;
        const mat = new BABYLON.StandardMaterial('terrainBlockMat', this.scene);
        const dt = new BABYLON.DynamicTexture('grassDirtAtlas', { width: 1024, height: 512 }, this.scene, true);
        mat.diffuseTexture = dt;
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        const ctx = dt.getContext();
        // Placeholder tints so blocks aren't black while the images stream in.
        ctx.fillStyle = '#6b4a2f'; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#4f8a3d'; ctx.fillRect(512, 0, 512, 512);
        dt.update();
        let loaded = 0;
        const dirt = new Image(), grass = new Image();
        const done = () => {
            loaded += 1;
            if(loaded < 2) return;
            ctx.drawImage(dirt, 0, 0, 512, 512);
            ctx.drawImage(grass, 512, 0, 512, 512);
            dt.update();
        };
        dirt.onload = done;
        grass.onload = done;
        dirt.src = 'assets/textures/dirt.png';
        grass.src = 'assets/textures/grass3_albedo.png';
        this._terrainAtlasMat = mat;
        return mat;
    }

    // Create a material with diffuse color `r`,`g`,`b` and with `a` alpha transparency
    createColorMaterial(r=1.0, g=1.0, b=1.0, a=0.5, matName=null) {
        if(null == matName) {
            matName = "mat["+r+","+g+","+b+","+a+"]";
        }
        let mat = new BABYLON.StandardMaterial(matName, this.scene);
        mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        mat.alpha = a;
        mat.diffuseColor = new BABYLON.Color3(r,g,b);
        mat.disableLightning = true;
        return mat;
    }

    keyPressed(key) {
        if(typeof this.keysPressed[key.toUpperCase()] != 'undefined') {
            var result = this.keysPressed[key.toUpperCase()];
            // Next time we will return false since we consumed this keypress
            // Use keyDown() instead to not clear the flag after checking
            this.keysPressed[key.toUpperCase()] = false;
            return result;
        }
    }

    // Edge-triggered read of a gamepad action (e.g. 'meleeAttack','rangedAttack').
    // Returns true once per button press, then clears it -- mirrors keyPressed().
    consumePad(action) {
        if(this.padActions && this.padActions[action]) {
            this.padActions[action] = false;
            return true;
        }
        return false;
    }

    // Level-triggered read of a held gamepad action (e.g. 'block'): true for
    // as long as the button is held -- mirrors keyDown().
    padDown(action) {
        return !!(this.padHeld && this.padHeld[action]);
    }

    // Route one gamepad button edge through PAD_MAP. Returns the mapped
    // action name (or null) so tests can assert the table directly.
    handlePadButton(button, down) {
        for (const m of this.PAD_MAP) {
            if (m.buttons.indexOf(button) < 0) continue;
            if (m.held) this.padHeld[m.action] = down;
            else if (down) this.padActions[m.action] = true;
            return m.action;
        }
        return null;
    }

    keyDown(key) {
        if(typeof this.keysPressed[key.toUpperCase()] != 'undefined') {
            return this.keysPressed[key.toUpperCase()];
        }
    }

    // ---- economy (pixels + purchases) --------------------------------------

    loadEconomy() {
        try {
            const p = window.localStorage.getItem('iis_pixels');
            this.pixels = p ? (parseInt(p, 10) || 0) : 0;
            const owned = JSON.parse(window.localStorage.getItem('iis_purchased') || '[]');
            this.purchasedSet = new Set(Array.isArray(owned) ? owned : []);

            // Figures: owned set (the free default is always owned) + active id.
            const figs = JSON.parse(window.localStorage.getItem('iis_figures_owned') || '["scout"]');
            this.ownedFigures = new Set(Array.isArray(figs) ? figs : ['scout']);
            this.ownedFigures.add('scout');
            const act = window.localStorage.getItem('iis_figure');
            this.activeFigure = (act && this.figureById(act) && this.ownedFigures.has(act)) ? act : 'scout';

            // Per-figure level/XP. Migrate the old global keys onto the default
            // figure once so pre-figure progress isn't lost.
            if (window.localStorage.getItem('iis_level') !== null &&
                window.localStorage.getItem('iis_fig_scout_level') === null) {
                window.localStorage.setItem('iis_fig_scout_level', window.localStorage.getItem('iis_level'));
                window.localStorage.setItem('iis_fig_scout_xp', window.localStorage.getItem('iis_xp') || '0');
            }
            this.playerLevel = Math.min(MAX_LEVEL, Math.max(1,
                parseInt(window.localStorage.getItem('iis_fig_' + this.activeFigure + '_level'), 10) || 1));
            this.playerXp = Math.max(0,
                parseInt(window.localStorage.getItem('iis_fig_' + this.activeFigure + '_xp'), 10) || 0);
            this.skillRanks = this.loadSkillRanks(this.activeFigure);

            // Power discs: owned set + equipped list (global, not per figure).
            const discsOwned = JSON.parse(window.localStorage.getItem('iis_discs_owned') || '[]');
            this.ownedDiscs = new Set(Array.isArray(discsOwned) ? discsOwned : []);
            const eq = JSON.parse(window.localStorage.getItem('iis_discs_equipped') || '[]');
            this.equippedDiscs = (Array.isArray(eq) ? eq : [])
                .filter((id) => this.discById(id) && this.ownedDiscs.has(id))
                .slice(0, DISC_SLOTS);

            // Hex discs: 'classic' is always owned; the active one must be owned.
            const hexOwned = JSON.parse(window.localStorage.getItem('iis_hex_owned') || '["classic"]');
            this.ownedHex = new Set(Array.isArray(hexOwned) ? hexOwned : ['classic']);
            this.ownedHex.add('classic');
            const hexActive = window.localStorage.getItem('iis_hex_active');
            this.activeHexDisc = (hexActive && this.hexById(hexActive) && this.ownedHex.has(hexActive))
                ? hexActive : 'classic';
            if (this.scene) this.applyHexTheme();

            // Sidekicks: owned set, active id (may be null), per-sidekick level/XP.
            const skOwned = JSON.parse(window.localStorage.getItem('iis_sidekicks_owned') || '[]');
            this.ownedSidekicks = new Set(Array.isArray(skOwned) ? skOwned : []);
            const skActive = window.localStorage.getItem('iis_sidekick_active');
            this.activeSidekick = (skActive && this.sidekickById(skActive) && this.ownedSidekicks.has(skActive))
                ? skActive : null;
        } catch (e) {
            this.pixels = 0;
            this.purchasedSet = new Set();
            this.ownedFigures = new Set(['scout']);
            this.activeFigure = 'scout';
            this.playerLevel = 1;
            this.playerXp = 0;
            this.skillRanks = {};
            this.ownedDiscs = new Set();
            this.equippedDiscs = [];
            this.ownedHex = new Set(['classic']);
            this.activeHexDisc = 'classic';
            this.ownedSidekicks = new Set();
            this.activeSidekick = null;
        }
    }

    // Read a figure's spent skill ranks from storage, sanitized: only known
    // skill ids, each clamped to [0, max].
    loadSkillRanks(figId) {
        let raw = {};
        try { raw = JSON.parse(window.localStorage.getItem('iis_fig_' + figId + '_skills') || '{}') || {}; }
        catch (e) { raw = {}; }
        const out = {};
        SKILLS.forEach((s) => {
            const r = parseInt(raw[s.id], 10) || 0;
            if (r > 0) out[s.id] = Math.min(s.max, r);
        });
        return out;
    }

    saveEconomy() {
        try {
            window.localStorage.setItem('iis_pixels', String(this.pixels));
            window.localStorage.setItem('iis_purchased', JSON.stringify([...this.purchasedSet]));
            window.localStorage.setItem('iis_figures_owned', JSON.stringify([...this.ownedFigures]));
            window.localStorage.setItem('iis_figure', this.activeFigure);
            // Level/XP/skills belong to the active figure.
            window.localStorage.setItem('iis_fig_' + this.activeFigure + '_level', String(this.playerLevel));
            window.localStorage.setItem('iis_fig_' + this.activeFigure + '_xp', String(this.playerXp));
            window.localStorage.setItem('iis_fig_' + this.activeFigure + '_skills', JSON.stringify(this.skillRanks || {}));
            window.localStorage.setItem('iis_discs_owned', JSON.stringify([...(this.ownedDiscs || [])]));
            window.localStorage.setItem('iis_discs_equipped', JSON.stringify(this.equippedDiscs || []));
            window.localStorage.setItem('iis_hex_owned', JSON.stringify([...(this.ownedHex || [])]));
            window.localStorage.setItem('iis_hex_active', this.activeHexDisc || 'classic');
            window.localStorage.setItem('iis_sidekicks_owned', JSON.stringify([...(this.ownedSidekicks || [])]));
            if (this.activeSidekick) window.localStorage.setItem('iis_sidekick_active', this.activeSidekick);
            else window.localStorage.removeItem('iis_sidekick_active');
        } catch (e) { /* storage may be unavailable */ }
    }

    addPixels(n) {
        // Fortune Prism: +25% pixels earned. Bursts arrive one pixel at a
        // time, so the bonus accrues fractionally and pays out whole pixels.
        if (n > 0 && this.discEquipped('fortune')) {
            this._pixelFrac = (this._pixelFrac || 0) + n * 0.25;
            const whole = Math.floor(this._pixelFrac);
            this._pixelFrac -= whole;
            n += whole;
        }
        this.pixels = Math.max(0, this.pixels + n);
        this.saveEconomy();
    }

    // ---- character progression --------------------------------------------
    // XP is earned by defeating enemies; the character levels up to MAX_LEVEL.
    // Progress persists with the economy (per browser/account, like pixels).

    // XP needed to advance FROM the given level.
    xpToNext(level) {
        return 25 + (level - 1) * 15;
    }

    addXp(n) {
        if (this.playerLevel >= MAX_LEVEL) { this.saveEconomy(); return; }
        // Sage Lens: +25% XP earned.
        if (this.discEquipped('sage')) n = Math.round(n * 1.25);
        // The active sidekick learns alongside the player (half share).
        this.addSidekickXp(Math.floor(n / 2));
        this.playerXp += n;
        let leveled = false;
        while (this.playerLevel < MAX_LEVEL && this.playerXp >= this.xpToNext(this.playerLevel)) {
            this.playerXp -= this.xpToNext(this.playerLevel);
            this.playerLevel += 1;
            leveled = true;
        }
        if (this.playerLevel >= MAX_LEVEL) this.playerXp = 0;
        if (leveled) {
            this.toasty('LEVEL UP!  Now level ' + this.playerLevel + '  (+1 skill point — Esc → Skills)');
            // Apply growth to the live play session immediately.
            const pm = this.activeMode;
            if (pm && pm.constructor.name === 'PlayMode') {
                const frac = pm.playerMaxHp > 0 ? pm.playerHp / pm.playerMaxHp : 1;
                pm.playerMaxHp = this.maxHpForLevel();
                pm.playerHp = Math.round(pm.playerMaxHp * Math.max(frac, 0.5));
            }
        }
        this.saveEconomy();
    }

    // Stat growth: +5 max HP per level, +1 melee damage every 5 levels, plus
    // the active figure's own stat lean, plus spent skill ranks, plus discs.
    maxHpForLevel() { return 100 + (this.playerLevel - 1) * 5 + this.activeFigureDef().hpBonus + this.skillRank('vitality') * 10 + (this.discEquipped('aegis') ? 20 : 0) + this.sidekickBonus(); }
    meleeBonus()    { return Math.floor(this.playerLevel / 5) + this.activeFigureDef().meleeBonus + this.skillRank('power') + (this.discEquipped('ember') ? 1 : 0); }
    // Frames between ranged shots (some figures fire faster; Trigger ranks
    // shave 2 frames each). The old floor of 8 never bound (no figure has
    // haste > 10), so lowering it to 6 changes nothing without skills.
    rangedCooldownFrames() { return Math.max(6, 18 - this.activeFigureDef().rangedHaste - this.skillRank('trigger') * 2); }
    // Frames between dodge rolls (Agility ranks and the Swift Coil disc).
    dodgeCooldownFrames() { return Math.max(15, 40 - this.skillRank('agility') * 8 - (this.discEquipped('swift') ? 8 : 0)); }

    // ---- power discs --------------------------------------------------------
    // Passive buff tokens, global across figures. Up to DISC_SLOTS equipped;
    // different discs stack. Buffs apply through the same derived-stat and
    // economy hooks the figures/skills use.

    discs() { return DISCS; }
    discById(id) { return DISCS.find((d) => d.id === id) || null; }
    ownsDisc(id) { return !!(this.ownedDiscs && this.ownedDiscs.has(id)); }
    discEquipped(id) { return !!(this.equippedDiscs && this.equippedDiscs.indexOf(id) >= 0); }

    // Buy a disc with pixels (auto-equips into a free slot).
    buyDisc(id) {
        const disc = this.discById(id);
        if (!disc) return false;
        if (this.ownsDisc(id)) return this.toggleDisc(id);
        if (this.pixels < disc.price) {
            this.toasty('Not enough pixels — ' + disc.name + ' costs ' + disc.price + '.');
            return false;
        }
        this.pixels -= disc.price;
        this.ownedDiscs.add(id);
        this.toasty('Unlocked ' + disc.name + '!');
        if (this.equippedDiscs.length < DISC_SLOTS) this.equippedDiscs.push(id);
        this.applySkillsToSession();   // max-HP discs apply live, like skills
        this.saveEconomy();
        return true;
    }

    // Equip/unequip an owned disc. Refuses a third equip (two slots).
    toggleDisc(id) {
        if (!this.ownsDisc(id)) return false;
        const at = this.equippedDiscs.indexOf(id);
        if (at >= 0) {
            this.equippedDiscs.splice(at, 1);
            this.toasty(this.discById(id).name + ' unequipped.');
        } else if (this.equippedDiscs.length >= DISC_SLOTS) {
            this.toasty('Both disc slots are full — unequip one first.');
            return false;
        } else {
            this.equippedDiscs.push(id);
            this.toasty(this.discById(id).name + ' equipped.');
        }
        this.applySkillsToSession();
        this.saveEconomy();
        return true;
    }

    // ---- world sharing (export / import files) -------------------------------
    // No server: sharing is a file. Export wraps the same snapshot the save
    // slots store in a versioned envelope; import validates it and rebuilds
    // the world. The DOM pieces (download link, file picker) are thin
    // wrappers so tests drive exportWorld/importWorldData directly.

    exportWorld() {
        if (!this.world) {
            this.toasty('No world to export — start or load a game first.');
            return null;
        }
        return JSON.stringify({
            format: 'iis-world',
            version: 1,
            objects: this.world.serialize().objects,
        });
    }

    downloadWorld() {
        const json = this.exportWorld();
        if (!json) return false;
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'iis-world.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        this.toasty('World exported — share the file!');
        return true;
    }

    // Validate + load a world file's text. Returns true on success; every
    // rejection toasts a reason and leaves the current world untouched.
    importWorldData(text) {
        let payload;
        try { payload = JSON.parse(text); } catch (e) {
            this.toasty('That file is not a world (bad JSON).');
            return false;
        }
        if (!payload || payload.format !== 'iis-world' || !Array.isArray(payload.objects)) {
            this.toasty('That file is not an Infinite Indie Sandbox world.');
            return false;
        }
        if ((payload.version || 0) > 1) {
            this.toasty('That world file needs a newer game version.');
            return false;
        }
        if (!this.world) this.world = new SandboxWorld(this);
        this.world.loadFromData({ objects: payload.objects });
        this.toasty('World imported!');
        return true;
    }

    importWorldFromPicker() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const f = input.files && input.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (this.importWorldData(String(reader.result))) this.goto_buildMode();
            };
            reader.readAsText(f);
        };
        input.click();
    }

    // ---- sidekicks ----------------------------------------------------------

    sidekicks() { return SIDEKICKS; }
    sidekickById(id) { return SIDEKICKS.find((s) => s.id === id) || null; }
    ownsSidekick(id) { return !!(this.ownedSidekicks && this.ownedSidekicks.has(id)); }

    sidekickLevelOf(id) {
        try { return Math.min(SIDEKICK_MAX_LEVEL, Math.max(1,
            parseInt(window.localStorage.getItem('iis_sk_' + id + '_level'), 10) || 1)); }
        catch (e) { return 1; }
    }
    sidekickXpOf(id) {
        try { return Math.max(0, parseInt(window.localStorage.getItem('iis_sk_' + id + '_xp'), 10) || 0); }
        catch (e) { return 0; }
    }
    _saveSidekickProgress(id, level, xp) {
        try {
            window.localStorage.setItem('iis_sk_' + id + '_level', String(level));
            window.localStorage.setItem('iis_sk_' + id + '_xp', String(xp));
        } catch (e) { /* storage may be unavailable */ }
    }

    sidekickXpToNext(level) { return 20 + (level - 1) * 10; }

    // The active sidekick's aura: +2 max HP per sidekick level.
    sidekickBonus() {
        return this.activeSidekick ? this.sidekickLevelOf(this.activeSidekick) * 2 : 0;
    }

    adoptSidekick(id) {
        const sk = this.sidekickById(id);
        if (!sk) return false;
        if (this.ownsSidekick(id)) return this.selectSidekick(id);
        if (this.pixels < sk.price) {
            this.toasty('Not enough pixels — ' + sk.name + ' costs ' + sk.price + '.');
            return false;
        }
        this.pixels -= sk.price;
        this.ownedSidekicks.add(id);
        this.toasty('Adopted ' + sk.name + '!');
        return this.selectSidekick(id);
    }

    selectSidekick(id) {
        if (!this.ownsSidekick(id)) return false;
        // Re-selecting the active sidekick dismisses it (walk alone).
        this.activeSidekick = (this.activeSidekick === id) ? null : id;
        this.applySkillsToSession();   // aura max-HP applies live
        const pm = this.activeMode;
        if (pm && pm.refreshSidekick) pm.refreshSidekick();
        this.saveEconomy();
        return true;
    }

    // Grant XP to the active sidekick (from the player's earnings share or a
    // feeding). Levels up on its own curve, capped at SIDEKICK_MAX_LEVEL.
    addSidekickXp(n) {
        const id = this.activeSidekick;
        if (!id || n <= 0) return;
        let level = this.sidekickLevelOf(id);
        if (level >= SIDEKICK_MAX_LEVEL) return;
        let xp = this.sidekickXpOf(id) + n;
        let leveled = false;
        while (level < SIDEKICK_MAX_LEVEL && xp >= this.sidekickXpToNext(level)) {
            xp -= this.sidekickXpToNext(level);
            level += 1;
            leveled = true;
        }
        if (level >= SIDEKICK_MAX_LEVEL) xp = 0;
        this._saveSidekickProgress(id, level, xp);
        if (leveled) {
            this.toasty(this.sidekickById(id).name + ' grew to level ' + level + '!');
            this.applySkillsToSession();   // bigger aura applies live
        }
    }

    // Feed the active sidekick: 10 pixels for 10 sidekick XP.
    feedSidekick() {
        if (!this.activeSidekick) { this.toasty('No sidekick to feed.'); return false; }
        if (this.pixels < 10) { this.toasty('Feeding costs 10 pixels.'); return false; }
        this.pixels -= 10;
        this.addSidekickXp(10);
        this.saveEconomy();
        return true;
    }

    // ---- hex discs (world themes) -------------------------------------------

    hexDiscs() { return HEX_DISCS; }
    hexById(id) { return HEX_DISCS.find((d) => d.id === id) || null; }
    ownsHexDisc(id) { return !!(this.ownedHex && this.ownedHex.has(id)); }

    buyHexDisc(id) {
        const hx = this.hexById(id);
        if (!hx) return false;
        if (this.ownsHexDisc(id)) return this.selectHexDisc(id);
        if (this.pixels < hx.price) {
            this.toasty('Not enough pixels — ' + hx.name + ' costs ' + hx.price + '.');
            return false;
        }
        this.pixels -= hx.price;
        this.ownedHex.add(id);
        this.toasty('Unlocked ' + hx.name + '!');
        return this.selectHexDisc(id);
    }

    selectHexDisc(id) {
        if (!this.ownsHexDisc(id)) return false;
        this.activeHexDisc = id;
        this.applyHexTheme();
        this.saveEconomy();
        return true;
    }

    // Apply the active hex theme: sky = scene clear colour (null = the
    // captured engine default), ground = a diffuse tint multiplied over the
    // shared terrain atlas (one material, so it stays instancing-safe).
    applyHexTheme() {
        const hx = this.hexById(this.activeHexDisc) || HEX_DISCS[0];
        if (this.scene) {
            if (!this._defaultClearColor) this._defaultClearColor = this.scene.clearColor.clone();
            this.scene.clearColor = hx.sky
                ? new BABYLON.Color4(hx.sky[0], hx.sky[1], hx.sky[2], 1)
                : this._defaultClearColor.clone();
        }
        const mat = this.terrainAtlasMaterial();
        mat.diffuseColor = new BABYLON.Color3(hx.tint[0], hx.tint[1], hx.tint[2]);
    }

    // ---- skill tree ---------------------------------------------------------
    // One point per level-up. Earned is DERIVED from the level so it can never
    // desync from progression; only spent ranks are stored (per figure).

    skillRank(id) { return (this.skillRanks && this.skillRanks[id]) || 0; }
    skillPointsEarned() { return this.playerLevel - 1; }
    skillPointsSpent() { return SKILLS.reduce((sum, s) => sum + this.skillRank(s.id), 0); }
    skillPointsUnspent() { return Math.max(0, this.skillPointsEarned() - this.skillPointsSpent()); }
    skills() { return SKILLS; }

    // Spend one point on a skill. Refuses (with a toast) when out of points or
    // the skill is at max rank. Live-applies HP growth like a level-up does.
    spendSkillPoint(id) {
        const skill = SKILLS.find((s) => s.id === id);
        if (!skill) return false;
        if (this.skillPointsUnspent() <= 0) {
            this.toasty('No skill points — level up to earn more.');
            return false;
        }
        if (this.skillRank(id) >= skill.max) {
            this.toasty(skill.name + ' is already at max rank.');
            return false;
        }
        this.skillRanks[id] = this.skillRank(id) + 1;
        this.applySkillsToSession();
        this.saveEconomy();
        this.toasty(skill.name + ' rank ' + this.skillRanks[id] + ' — ' + skill.desc);
        return true;
    }

    // Free respec: refund every spent point.
    resetSkills() {
        this.skillRanks = {};
        this.applySkillsToSession();
        this.saveEconomy();
        this.toasty('Skills reset — all points refunded.');
    }

    // Push skill-derived stats into a live play session (same pattern as the
    // level-up growth in addXp). HP never exceeds the new max.
    applySkillsToSession() {
        const pm = this.activeMode;
        if (pm && pm.constructor.name === 'PlayMode') {
            pm.playerMaxHp = this.maxHpForLevel();
            pm.playerHp = Math.min(pm.playerHp, pm.playerMaxHp);
        }
    }

    // ---- digital figures (roster) -------------------------------------------

    figureById(id) { return FIGURES.find((f) => f.id === id) || null; }
    activeFigureDef() { return this.figureById(this.activeFigure) || FIGURES[0]; }
    ownsFigure(id) { return this.ownedFigures && this.ownedFigures.has(id); }
    figures() { return FIGURES; }

    // Saved level of any figure (for the collection screen roster).
    figureLevelOf(id) {
        if (id === this.activeFigure) return this.playerLevel;
        try { return Math.max(1, parseInt(window.localStorage.getItem('iis_fig_' + id + '_level'), 10) || 1); }
        catch (e) { return 1; }
    }

    // Buy a figure with pixels (and hop into it right away on success).
    buyFigure(id) {
        const fig = this.figureById(id);
        if (!fig) return false;
        if (this.ownsFigure(id)) return this.selectFigure(id);
        if (this.pixels < fig.price) {
            this.toasty('Not enough pixels — ' + fig.name + ' costs ' + fig.price + '.');
            return false;
        }
        this.pixels -= fig.price;
        this.ownedFigures.add(id);
        this.toasty('Unlocked ' + fig.name + '!');
        return this.selectFigure(id);
    }

    // Make a figure the active character: swap in its saved level/XP and apply
    // its tint/stats to a live play session immediately.
    selectFigure(id) {
        const fig = this.figureById(id);
        if (!fig || !this.ownsFigure(id)) return false;
        // Bank the current figure's progress before switching identities.
        this.saveEconomy();
        this.activeFigure = id;
        try {
            this.playerLevel = Math.min(MAX_LEVEL, Math.max(1,
                parseInt(window.localStorage.getItem('iis_fig_' + id + '_level'), 10) || 1));
            this.playerXp = Math.max(0, parseInt(window.localStorage.getItem('iis_fig_' + id + '_xp'), 10) || 0);
        } catch (e) { this.playerLevel = 1; this.playerXp = 0; }
        this.skillRanks = this.loadSkillRanks(id);
        this.saveEconomy();

        // Live-apply to the current play session, if any.
        const pm = this.activeMode;
        if (pm && pm.constructor.name === 'PlayMode' && pm.player) {
            pm.playerMaxHp = this.maxHpForLevel();
            pm.playerHp = Math.min(pm.playerHp, pm.playerMaxHp);
            this.applyFigureTint(pm);
        }
        this.toasty('Playing as ' + fig.name + '  (LV ' + this.playerLevel + ')');
        return true;
    }

    // Tint every avatar material by the figure's colorway (figure variants are
    // colorways of the starter avatar, like plastic figure repaints). Original
    // colors are cached per material so re-tints don't compound.
    applyFigureTint(pm) {
        if (!pm || !pm.player) return;
        const t = this.activeFigureDef().tint;
        const mats = [];
        const collect = (m) => {
            if (!m) return;
            if (m.subMaterials) m.subMaterials.forEach((sm) => sm && mats.push(sm));
            else mats.push(m);
        };
        collect(pm.player.material);
        (pm.player.getChildMeshes ? pm.player.getChildMeshes() : []).forEach((c) => collect(c.material));
        mats.forEach((mat) => {
            if (!mat.diffuseColor) return;
            if (!mat._origDiffuse) mat._origDiffuse = mat.diffuseColor.clone();
            mat.diffuseColor = new BABYLON.Color3(
                mat._origDiffuse.r * t[0], mat._origDiffuse.g * t[1], mat._origDiffuse.b * t[2]);
        });
    }

    priceOf(name) {
        return this.objectPrices[name] || 0;
    }

    // Free objects (price 0) are always owned; otherwise check the purchased set.
    isPurchased(name) {
        return this.priceOf(name) === 0 || (this.purchasedSet && this.purchasedSet.has(name));
    }

    // ---- object parameters popup -------------------------------------------

    // Open the parameters popup to edit a placed instance's script parameters.
    openParams(inst) {
        if(!inst || !inst.script || !inst.script.paramDefs || inst.script.paramDefs.length === 0) {
            this.toasty('This object has no settings.');
            return;
        }
        this.paramTarget = inst;
        this.menu.prevState = MENU_HUD;
        this.menu.state = MENU_OBJ_PARAMS;
    }

    // Step a parameter to its previous/next preset value (dir = -1 / +1).
    cycleParam(inst, pdef, dir) {
        if(!inst.params) inst.params = {};
        const opts = pdef.options || [];
        if(opts.length === 0) return;
        let idx = opts.indexOf(inst.params[pdef.key]);
        if(idx < 0) idx = 0;
        idx = (idx + dir + opts.length) % opts.length;
        inst.params[pdef.key] = opts[idx];
    }

    // List of buyable (priced) objects currently in the manifest.
    premiumObjects() {
        const seen = new Set();
        const out = [];
        this.BuildableObjectList.forEach((wo) => {
            if (this.priceOf(wo.name) > 0 && !seen.has(wo.name)) {
                seen.add(wo.name);
                out.push({ name: wo.name, price: this.priceOf(wo.name), owned: this.isPurchased(wo.name) });
            }
        });
        return out;
    }

    // Resolve a wire-built path chain: `inst`'s wire with the given event id
    // ('follow' for platforms, 'patrol' for enemies) points at the first
    // l_pathnode; nodes chain onward via their `next` wires. Returns ordered
    // node positions, stopping at a chain end or the first revisited node
    // (which also detects a closed circuit). Shared by every path follower so
    // the traversal rules can't drift between scripts.
    resolvePathChain(inst, eventId) {
        const first = (inst.wires || []).find((w) => w.event === eventId);
        const nodes = [];
        const seen = new Set();
        let node = first ? this.findInstance(first.toWo, first.toId) : null;
        while (node && !node.isDisposed() && !seen.has(node)) {
            seen.add(node);
            nodes.push(node);
            node = (node.script && node.script.nextNode) ? node.script.nextNode() : null;
        }
        const closed = !!(node && nodes.length > 1 && node === nodes[0]);
        return { points: nodes.map((n) => n.position.clone()), closed };
    }

    // ---- packs (figure bundles / Play Sets) ---------------------------------

    packs() { return PACKS; }
    packById(id) { return PACKS.find((p) => p.id === id) || null; }

    // A pack is owned when every piece of its contents is owned.
    packOwned(id) {
        const pack = this.packById(id);
        if (!pack) return false;
        return pack.figures.every((f) => this.ownsFigure(f)) &&
               pack.objects.every((o) => this.isPurchased(o));
    }

    // The à-la-carte value of a pack (for showing the saving in the shop).
    packValue(id) {
        const pack = this.packById(id);
        if (!pack) return 0;
        return pack.figures.reduce((s, f) => s + ((this.figureById(f) || {}).price || 0), 0) +
               pack.objects.reduce((s, o) => s + this.priceOf(o), 0);
    }

    // Buy a pack at its flat price: grants every not-yet-owned piece of the
    // contents. Returns true on success.
    buyPack(id) {
        const pack = this.packById(id);
        if (!pack) return false;
        if (this.packOwned(id)) {
            this.toasty('You already own everything in ' + pack.name + '.');
            return false;
        }
        if (this.pixels < pack.price) {
            this.toasty('Not enough pixels — ' + pack.name + ' costs ' + pack.price + '.');
            return false;
        }
        this.pixels -= pack.price;
        pack.figures.forEach((f) => this.ownedFigures.add(f));
        pack.objects.forEach((o) => this.purchasedSet.add(o));
        this.saveEconomy();
        this.toasty('Unlocked ' + pack.name + '!');
        return true;
    }

    // Attempt to buy an object with pixels. Returns true on success.
    buy(name) {
        if (this.isPurchased(name)) return true;
        const price = this.priceOf(name);
        if (this.pixels < price) {
            this.toasty('Not enough pixels — need ' + price + '.');
            return false;
        }
        this.pixels -= price;
        this.purchasedSet.add(name);
        this.saveEconomy();
        this.toasty('Purchased ' + this.prettyName(name) + '!');
        return true;
    }

    toasty(message) {
        let app = this;
        if(this.message) this.message.text = message;
        if(this.hud && this.hud.toast) this.hud.toast.isVisible = !!message;
        if(this.toastyTimer) {
            clearTimeout(this.toastyTimer);
        }
        this.toastyTimer = setTimeout(() => {
            app.toastyTimer = 0;
            if(app.message) app.message.text = '';
            if(app.hud && app.hud.toast) app.hud.toast.isVisible = false;
        }, 2200);
    }

    findWorldObject(woName) {
        var result = null;
        this.BuildableObjectList.forEach((wo) => {
            if(wo.name == woName) {
                result = wo;
            }
        });
        return result;
    }

    // ---- Event wiring ----------------------------------------------------
    // A wire connects one instance's output event to another instance's input
    // action. Triggers expose outputs (script.outputs); spawners expose inputs
    // (script.inputs) with an onInput(action, from) handler. Wires live on the
    // source instance (inst.wires) and are serialized with the world.

    // Find a live instance by world-object name and instance id.
    findInstance(woName, id) {
        const wo = this.findWorldObject(woName);
        if(!wo) return null;
        let found = null;
        wo.instances.forEach((inst) => {
            if(inst && inst.worldId == id) found = inst;
        });
        return found;
    }

    // Every live instance whose script participates in wiring (has outputs or
    // inputs). Used by the wiring view to draw the interactive-object graph.
    interactiveInstances() {
        const out = [];
        this.BuildableObjectList.forEach((wo) => {
            wo.instances.forEach((inst) => {
                if(inst && inst.script &&
                   ((inst.script.outputs && inst.script.outputs.length) ||
                    (inst.script.inputs && inst.script.inputs.length))) {
                    out.push(inst);
                }
            });
        });
        return out;
    }

    // Fire an output event from an instance: deliver it to every wired target's
    // input handler. Called by scripts (e.g. TriggerScript on player enter).
    // Guarded against runaway recursion: wiring is player-editable, so cycles
    // like counter.changed -> counter.increment are possible and must not hang
    // the game -- delivery stops past a small depth instead.
    fireEvent(inst, event) {
        if(!inst || !inst.wires) return;
        this._fireDepth = (this._fireDepth || 0) + 1;
        try {
            // 32 is far deeper than any sensible hand-built chain, so legitimate
            // linear cascades pass through while genuine cycles still terminate.
            if(this._fireDepth > 32) {
                console.warn('fireEvent: wire loop detected (depth > 32), stopping delivery of `' + event + '`');
                return;
            }
            inst.wires.forEach((w) => {
                if(w.event !== event) return;
                const target = this.findInstance(w.toWo, w.toId);
                if(target && target.script && typeof target.script.onInput === 'function') {
                    target.script.onInput(w.action, inst);
                }
            });
        } finally {
            this._fireDepth--;
        }
    }

    hasWire(inst, event, toWo, toId, action) {
        if(!inst || !inst.wires) return false;
        return inst.wires.some((w) => w.event === event && w.toWo === toWo &&
            w.toId == toId && w.action === action);
    }

    addWire(inst, event, toWo, toId, action) {
        if(!inst) return;
        if(!inst.wires) inst.wires = [];
        if(this.hasWire(inst, event, toWo, toId, action)) return;
        inst.wires.push({ event: event, toWo: toWo, toId: toId, action: action });
    }

    removeWire(inst, event, toWo, toId, action) {
        if(!inst || !inst.wires) return;
        inst.wires = inst.wires.filter((w) => !(w.event === event && w.toWo === toWo &&
            w.toId == toId && w.action === action));
    }

    // Add the wire if absent, remove it if present. Returns true if now wired.
    toggleWire(inst, event, toWo, toId, action) {
        if(this.hasWire(inst, event, toWo, toId, action)) {
            this.removeWire(inst, event, toWo, toId, action);
            return false;
        }
        this.addWire(inst, event, toWo, toId, action);
        return true;
    }

    // Enter the overhead wiring view. Requires a world with at least one
    // interactive object (a trigger or a spawner).
    openWiring() {
        if(!this.world) { this.toasty('Start or load a world first.'); return; }
        if(this.interactiveInstances().length === 0) {
            this.toasty('Place interactive objects (a Trigger and a Spawner) first.');
            return;
        }
        if(!this.wiring) this.wiring = new WiringView(this);
        this.menu.prevState = MENU_PAUSE;
        this.menu.state = MENU_WIRING;
        this.wiring.enter();
    }

    showAll(node) {
        let app = this;
        let children = node.getChildren();
        //if(children.length > 0) {
            children.forEach((mesh) => {
                mesh.isVisible = true;
                mesh.checkCollisions = true;
                app.showAll(mesh);
            })
        //} else {
        //    node.isVisible = true;
        //    node.checkCollisions = true;
        //}
    }

    // Turn OFF collisions across a whole node tree. Used on WorldObject template
    // meshes: they are invisible and only ever cloned/instanced, but the physics
    // collision loop ignores visibility, so a template left with checkCollisions
    // (e.g. one whose colliderMeshes were flagged) becomes an invisible wall the
    // player bumps into at the world origin. Instances re-enable collisions via
    // showAll() / explicit sets, so clearing the template is safe.
    disableCollisionsTree(node) {
        if(!node) return;
        node.checkCollisions = false;
        const children = node.getChildren ? node.getChildren() : [];
        children.forEach((child) => this.disableCollisionsTree(child));
    }

    showBoundingBoxAll(node, on=true) {
        let app = this;
        let children = node.getChildren();
        node.showBoundingBox = on;
        //if(children.length > 0) {
            children.forEach((mesh) => {
                mesh.showBoundingBox = on;
                app.showBoundingBoxAll(mesh, on);
            })
        //} else {
        //    node.isVisible = true;
        //    node.checkCollisions = true;
        //}
    }

    TextBlock(opts) {
        let result = new BABYLON.GUI.TextBlock();
        result.text = opts.text;
        result.color = opts.color;
        result.fontSize = opts.fontSize;
        result.textHorizontalAlignment = opts.textHorizontalAlignment;
        result.textVerticalAlignment = opts.textVerticalAlignment;
        result.paddingTop = opts.paddingTop;
        this.gui.addControl(result);
        return result;
    }

    // Popup menu panel: a centered, rounded, semi-transparent card whose height
    // adapts to its contents. Menu items are stacked vertically inside it (no
    // more fragile absolute-percentage positioning that overlapped).
    MenuRect(opts) {
        if(typeof opts == 'undefined') opts = {};
        const A = BABYLON.GUI.Control;

        const panel = new BABYLON.GUI.Rectangle("menuRect");
        panel.width = (typeof opts.width != 'undefined') ? (opts.width + '%') : "440px";
        panel.adaptHeightToChildren = true;
        panel.cornerRadius = 14;
        panel.thickness = 2;
        panel.color = HUD_ACCENT;
        panel.background = "rgba(12,18,30,0.94)";
        panel.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = A.VERTICAL_ALIGNMENT_CENTER;
        panel.top = (typeof opts.top != 'undefined') ? opts.top : "0px";
        this.gui.addControl(panel);
        // Only the panel needs tracking for disposal; its children go with it.
        this.menu.controls.push(panel);

        const stack = new BABYLON.GUI.StackPanel("menuStack");
        stack.isVertical = true;
        stack.spacing = 7;
        stack.paddingTop = "24px";
        stack.paddingBottom = "24px";
        panel.addControl(stack);
        this.menu.panel = stack;
    }

    // Item within popup menu. `type` is 'text' (a label/title) or 'button'.
    // Optional opts: fontSize, color, accent (style as a title).
    MenuItem(opts) {
        const A = BABYLON.GUI.Control;
        const stack = this.menu.panel;
        if(!stack) return;

        switch(opts.type) {
        case 'text':
            const textItem = new BABYLON.GUI.TextBlock();
            textItem.text = opts.text;
            textItem.color = opts.color || (opts.accent ? HUD_ACCENT : "#cdd9e8");
            textItem.fontSize = opts.fontSize || 16;
            if(opts.accent) textItem.fontStyle = "bold";
            textItem.height = ((opts.fontSize || 16) + 12) + "px";
            textItem.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
            stack.addControl(textItem);
            break;
        case 'button':
            const bg = "rgba(36,58,92,0.55)";
            const btn = BABYLON.GUI.Button.CreateSimpleButton(opts.name, opts.text);
            btn.width = "356px";
            btn.height = "46px";
            btn.color = "#eaf2ff";
            btn.fontSize = 17;
            btn.cornerRadius = 9;
            btn.thickness = 1;
            btn.background = bg;
            if(btn.textBlock) {
                btn.textBlock.color = "#eaf2ff";
            }
            // Hover / focus feedback so the menu feels interactive.
            btn.onPointerEnterObservable.add(() => {
                btn.background = HUD_ACCENT;
                btn.color = "#0b1018";
                if(btn.textBlock) btn.textBlock.color = "#08111c";
            });
            btn.onPointerOutObservable.add(() => {
                btn.background = bg;
                btn.color = "#eaf2ff";
                if(btn.textBlock) btn.textBlock.color = "#eaf2ff";
            });
            if(typeof opts.handler == 'function') {
                btn.onPointerUpObservable.add(opts.handler);
            }
            stack.addControl(btn);
            break;
        case 'param':
            // A row: [label]  [◀]  value  [▶]  for stepping a parameter.
            const row = new BABYLON.GUI.StackPanel();
            row.isVertical = false;
            row.height = "42px";
            row.width = "380px";

            const plabel = new BABYLON.GUI.TextBlock();
            plabel.text = opts.label;
            plabel.width = "150px";
            plabel.color = "#cdd9e8";
            plabel.fontSize = 15;
            plabel.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
            row.addControl(plabel);

            const mkStep = (glyph, handler) => {
                const b = BABYLON.GUI.Button.CreateSimpleButton('pstep', glyph);
                b.width = "40px";
                b.height = "34px";
                b.color = "#eaf2ff";
                b.fontSize = 18;
                b.cornerRadius = 8;
                b.thickness = 1;
                b.background = "rgba(36,58,92,0.55)";
                b.onPointerEnterObservable.add(() => { b.background = HUD_ACCENT; });
                b.onPointerOutObservable.add(() => { b.background = "rgba(36,58,92,0.55)"; });
                if(typeof handler == 'function') b.onPointerUpObservable.add(handler);
                return b;
            };
            row.addControl(mkStep("◀", opts.onPrev));   // ◀

            const pvalue = new BABYLON.GUI.TextBlock();
            pvalue.text = String(opts.value);
            pvalue.width = "130px";
            pvalue.color = "#ffffff";
            pvalue.fontSize = 16;
            pvalue.fontStyle = "bold";
            pvalue.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_CENTER;
            row.addControl(pvalue);

            row.addControl(mkStep("▶", opts.onNext));   // ▶
            stack.addControl(row);
            break;
        }
    }
}

window.app = new App();
