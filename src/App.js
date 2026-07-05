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
const MENU_GEAR = 16;
const MENU_SLOT = 17;
const MENU_DIALOG = 18;
const MENU_NET = 19;

// Hireable companions: recruited through a dialog tree at a pr_recruit,
// saved with the active PROGRESSION SLOT (iis_companions is a progression
// key), and respawned as followers whenever that slot enters a world.
const COMPANIONS = [
    { id: 'fern', name: 'Fern', cost: 0, tint: [0.4, 0.95, 0.55],
      greeting: '"Oh! A traveler! I know every trail in these hills."',
      about: '"I\'m Fern — a wanderer. No fee, just company. Take me along?"' },
    { id: 'rusty', name: 'Rusty', cost: 40, tint: [0.9, 0.55, 0.25],
      greeting: '"Hmph. You look like trouble finds you often."',
      about: '"Rusty. Ex-arena. My time costs 40 pixels, paid once."' },
    { id: 'lumen', name: 'Lumen', cost: 80, tint: [0.6, 0.7, 1.0],
      greeting: '"The pixels whisper that you would come."',
      about: '"I am Lumen. For 80 pixels, my light walks beside yours."' },
];

const MAX_LEVEL = 20;   // character level cap

// Digital figures: the character roster. Each figure is a colorway of the
// starter avatar with its own stat lean, bought à la carte with pixels and
// levelled independently (per-figure XP/level persistence).
const FIGURES = [
    { id: 'scout', name: 'Scout', price: 0,   tint: [1.00, 1.00, 1.00], hpBonus: 0,  meleeBonus: 0, rangedHaste: 0, desc: 'Balanced all-rounder',
      special: 'shockwave', specialName: 'Shockwave', combo: { hits: 3, mult: 3, comboName: 'Triple Strike' } },
    { id: 'blaze', name: 'Blaze', price: 150, tint: [1.00, 0.45, 0.35], hpBonus: 0,  meleeBonus: 1, rangedHaste: 0, desc: '+1 melee damage',
      special: 'flame', specialName: 'Flame Arc', combo: { hits: 4, mult: 2.5, comboName: 'Blazing Rush' } },
    { id: 'frost', name: 'Frost', price: 150, tint: [0.55, 0.75, 1.00], hpBonus: 25, meleeBonus: 0, rangedHaste: 0, desc: '+25 max HP',
      special: 'nova', specialName: 'Frost Nova', combo: { hits: 3, mult: 2, effect: 'chill', comboName: "Winter's End" } },
    { id: 'volt',  name: 'Volt',  price: 250, tint: [1.00, 0.95, 0.40], hpBonus: 10, meleeBonus: 0, rangedHaste: 6, desc: 'Faster ranged fire, +10 HP',
      special: 'bolt', specialName: 'Chain Bolt', combo: { hits: 2, mult: 2, effect: 'bolt', comboName: 'Static Snap' } },
    // Campaign heroes: not pixel-buyable -- they come WITH their Play Set
    // (buyPlayset grants them into the shared collection) and are the only
    // figures you can SWITCH TO inside that campaign; everywhere else in the
    // Sandbox they play like any other figure.
    { id: 'wick',   name: 'Wick',   price: null, campaign: 'glowlands.json',       tint: [0.55, 1.00, 0.75], hpBonus: 10, meleeBonus: 1, rangedHaste: 0, desc: 'Glowlands hero — +10 HP, +1 melee',
      special: 'shockwave', specialName: 'Shockwave', combo: { hits: 4, mult: 2, effect: 'launch', comboName: 'Glow Burst' } },
    { id: 'warden', name: 'Warden', price: null, campaign: 'nightfall-crown.json', tint: [0.75, 0.45, 1.00], hpBonus: 20, meleeBonus: 0, rangedHaste: 2, desc: 'Crown warden — +20 HP, faster shots',
      special: 'nova', specialName: 'Frost Nova', combo: { hits: 3, mult: 2.5, effect: 'chill', comboName: 'Crown Verdict' } },
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

// Sidekick gear: bought with FARMED FOOD (the farm's second sink), worn in a
// hat slot and a trinket slot per sidekick. Each piece is a visible accessory
// on the follower plus a small perk.
const SIDEKICK_GEAR = [
    { id: 'tophat', name: 'Tiny Top Hat', cost: 5, slot: 'hat',     desc: '+2 aura HP' },
    { id: 'bell',   name: 'Silver Bell',  cost: 4, slot: 'trinket', desc: 'XP share rounds up' },
    { id: 'cape',   name: 'Micro Cape',   cost: 6, slot: 'trinket', desc: '+5 XP on every meal' },
];

// Hex discs: world-theme tokens. Each swaps the sky colour and tints the
// shared terrain atlas; exactly one is active at a time ('classic' is the
// free default look). Ownership + the active choice persist with the economy.
const HEX_DISCS = [
    { id: 'classic',   name: 'Classic Meadow', price: 0,  sky: null,               tint: [1, 1, 1],          desc: 'The standard look' },
    { id: 'midnight',  name: 'Midnight Vale',  price: 80, sky: [0.05, 0.06, 0.16], tint: [0.55, 0.62, 0.95], desc: 'Deep night, moonlit ground' },
    { id: 'emberfall', name: 'Emberfall',      price: 80, sky: [0.35, 0.12, 0.08], tint: [1.0, 0.72, 0.5],   desc: 'Sunset blaze' },
    { id: 'verdant',   name: 'Verdant Haze',   price: 80, sky: [0.08, 0.2, 0.1],   tint: [0.7, 1.0, 0.7],    desc: 'Toxic-green gloom' },
];

// Gadget hexes: equippable PASSIVE PERKS (the gadget half of the hex-disc
// row -- theme hexes above dress the world; gadget hexes change how you
// play). One active at a time, bought once into the shared collection,
// the active choice per progression slot. Applied when a play session
// starts (see App.applyGadgetToSession + PlayMode hooks).
const GADGET_HEXES = [
    { id: 'none',    name: 'No Gadget',    price: 0,   effect: null,      desc: 'No passive perk' },
    { id: 'magnet',  name: 'Pixel Magnet', price: 90,  effect: 'magnet',  desc: 'Pixels rush straight to you' },
    { id: 'booster', name: 'Boost Boots',  price: 90,  effect: 'booster', desc: 'Jump noticeably higher' },
    { id: 'guardian',name: 'Guardian Ward',price: 120, effect: 'guardian',desc: 'Absorb the first hit each life' },
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
    // The CC0 texture pack (assets/textures/1, Screaming Brain Studios):
    // 25 seamless 128x128 variants per family. These are the variants the
    // game uses, picked by eye -- change a path here to reskin everywhere
    // that texture id appears.
    static PACK_TEX = {
        wood:   'assets/textures/1/128x128/Wood/Wood_13-128x128.png',    // warm toy-like grain
        planks: 'assets/textures/1/128x128/Wood/Wood_18-128x128.png',    // weathered floorboards
        brick:  'assets/textures/1/128x128/Bricks/Bricks_22-128x128.png',// classic red brick
        marble: 'assets/textures/1/128x128/Tile/Tile_05-128x128.png',    // cream marble tile
        grass:  'assets/textures/1/128x128/Grass/Grass_01-128x128.png',  // rich chunky lawn (reads at distance)
        toxicTop: 'assets/textures/1/128x128/Grass/Grass_22-128x128.png',// sickly moss (toxic theme)
    };

    constructor() {
        const app = this;
        this.toastyTimer = 0;
        this.world = null;
        // Portal doors: the active world's named sub-levels (name -> world
        // snapshot) and the ancestry of worlds the player is standing inside
        // (see enterSubWorld / exitSubWorld).
        this.subWorlds = {};
        this.worldStack = [];
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
        // Buddy pad states (up to three drop-in buddies = 4P): pad N's
        // buttons land in buddyPads[N-1] instead of the P1 action maps.
        // buddyPad stays as the FIRST slot's alias (tests and older code set
        // flags on it directly); testBuddyPad / testBuddyPads inject the same
        // shape for the harness: {leftStick:{x,y}, jumpHeld, attackQueued}.
        this.buddyPads = [
            { jumpHeld: false, attackQueued: false },
            { jumpHeld: false, attackQueued: false },
            { jumpHeld: false, attackQueued: false },
        ];
        this.buddyPad = this.buddyPads[0];
        this.testBuddyPad = null;
        this.testBuddyPads = [null, null, null];
        const gamepadManager = new BABYLON.GamepadManager();
        gamepadManager.onGamepadConnectedObservable.add((gamepad) => {
            console.log('gamepad connected', gamepad && gamepad.id);
            this.gamepads.push(gamepad);
            const isP2 = this.gamepads.length > 1;
            if(!isP2) this.gamepad = gamepad;
            if(gamepad.onButtonDownObservable) {
                gamepad.onButtonDownObservable.add((button) => {
                    const at = this.gamepads.indexOf(gamepad);
                    if(at === 0) this.handlePadButton(button, true);
                    else if(at >= 1 && at <= 3) {
                        // Buddy pads: A(0) = jump (held), X(2) = attack, and
                        // any button drops that pad's buddy in.
                        const bp = this.buddyPads[at - 1];
                        if(button === 0) bp.jumpHeld = true;
                        else if(button === 2) bp.attackQueued = true;
                        bp.wantsJoin = true;
                    }
                });
            }
            if(gamepad.onButtonUpObservable) {
                gamepad.onButtonUpObservable.add((button) => {
                    const at = this.gamepads.indexOf(gamepad);
                    if(at === 0) this.handlePadButton(button, false);
                    else if(at >= 1 && at <= 3 && button === 0) this.buddyPads[at - 1].jumpHeld = false;
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

        // Procedurally-synthesised sound effects (footsteps, combat, UI...).
        this.sound = new SoundManager(this);
        this.assistant = new BuildAssistant(this);

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

            // The in-game text field freezes the world while it's open --
            // typing WASD must never walk the player or drive build keys.
            if(this.menu.state == MENU_HUD && !this.textEntryOpen) {
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

        // --- Defeat-streak indicator (top-left, below the wave counter) ---
        const streakText = new BABYLON.GUI.TextBlock("hudStreak");
        streakText.text = "";
        streakText.color = "#8fd9ff";
        streakText.fontSize = 15;
        streakText.fontStyle = "bold";
        streakText.height = "22px";
        streakText.width = "260px";
        streakText.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        streakText.horizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        streakText.verticalAlignment = A.VERTICAL_ALIGNMENT_TOP;
        streakText.left = "20px";
        streakText.top = "108px";
        streakText.isVisible = false;
        this.gui.addControl(streakText);
        this.hud.streakText = streakText;

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
        // Display-name overrides where the derived name misleads (the object
        // id stays stable for save compatibility).
        if(name === 'pr_door_cell') return 'Portal Door';
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

        // Defeat-streak indicator: shown while a chain is building (>=2), with
        // the live pixel multiplier once it kicks in. Colour heats up by tier.
        if(this.hud.streakText) {
            const streak = pm ? (pm._streak || 0) : 0;
            const showStreak = inHud && !!pm && streak >= 2;
            this.hud.streakText.isVisible = showStreak;
            if(showStreak) {
                const mult = pm.streakMult();
                this.hud.streakText.text = "STREAK ×" + streak +
                    (mult > 1 ? "   ·   " + mult + "× PIXELS" : "");
                this.hud.streakText.color = mult >= 3 ? "#ff4a5b" :
                    (mult >= 2 ? "#ff9a3f" : (mult >= 1.5 ? "#ffd23f" : "#8fd9ff"));
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
        // While the text field is open it owns the keyboard entirely.
        if(this.textEntryOpen) return;

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

        // M toggles all sound (persists across sessions).
        if(this.keyPressed('M')) {
            const nowMuted = this.sound.toggleMuted();
            this.toasty(nowMuted ? 'Sound muted.  (M to unmute)' : 'Sound on.');
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
        this.sound.play('menu-select');
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
                app.fetchGallery();
                break;
            case 7:                                 // Progression save slot
                app.menu.prevState = MENU_MAIN;
                app.menu.state = MENU_SLOT;
                break;
            case 8:                                 // Online co-op
                app.menu.prevState = MENU_MAIN;
                app.menu.state = MENU_NET;
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
            } else if(menuItem === 80) {
                // Toggle favourite mode (re-render to show the new state).
                app._galleryFavMode = !app._galleryFavMode;
                app.menu.renderedState = -1;
            } else if(app.gallery && app.orderedGallery()[menuItem - 3]) {
                // Digits map to the DISPLAYED order. In favourite mode a pick
                // STARS the world instead of loading it (and re-sorts the list).
                const entry = app.orderedGallery()[menuItem - 3];
                if(app._galleryFavMode) {
                    app.toggleFavorite(entry.file);
                    app.menu.renderedState = -1;
                    break;
                }
                // Priced Play Sets must be bought first; a successful buy imports.
                app.menu.renderedState = -1;   // re-render lock/unlock state
                if(!app.buyPlayset(entry)) break;
                app.importWorldFromUrl('./assets/worlds/' + entry.file).then((ok) => {
                    if(ok) app.goto_buildMode();
                });
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
                app.menu.gearPrevState = app.menu.prevState || MENU_MAIN;
                app.menu.state = MENU_GEAR;
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
        case MENU_GEAR: {
            if(menuItem === 0) {
                app.menu.prevState = app.menu.gearPrevState || MENU_MAIN;
                app.menu.state = MENU_COLLECTION;
            } else if(menuItem === 1) {
                app.feedSidekick();
                app.menu.renderedState = -1;
            } else {
                const gear = SIDEKICK_GEAR[menuItem - 2];
                if(gear) {
                    app.buyOrWearGear(gear.id);
                    app.menu.renderedState = -1;
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
            } else if(menuItem <= DISCS.length + HEX_DISCS.length) {
                // Rows after the round discs are the hex world themes.
                const hx = HEX_DISCS[menuItem - DISCS.length - 1];
                if(hx) {
                    app.buyHexDisc(hx.id);   // buys, or selects if owned
                    app.menu.renderedState = -1;
                }
            } else {
                // The gadget hexes come last.
                const g = GADGET_HEXES[menuItem - DISCS.length - HEX_DISCS.length - 1];
                if(g) {
                    app.buyGadgetHex(g.id);   // buys, or selects if owned
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
            } else if(menuItem === 9) {
                // Session start includes picking who's playing: jump to the
                // progression-slot picker and come back here.
                app.menu.prevState = MENU_WORLD_TEMPLATE;
                app.menu.state = MENU_SLOT;
            } else if(kinds[menuItem]) {
                app.menu.state = MENU_HUD;
                app.world = new SandboxWorld(app);
                app.worldStack = [];
                app.subWorlds = {};
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
            } else if(menuItem == 1) {
                // Save under a fresh name.
                app.promptText('Name this world:', 'My World', (name) => {
                    if(!name || !app.world) return;
                    app.world.saveNamed(name);
                    app.toasty('Saved "' + name + '".');
                    app.menu.state = app.menu.prevState;
                });
            } else {
                const names = app.namedWorlds();
                const nm = names[menuItem - 2];
                if(nm && app.world && app.world.saveNamed(nm) !== undefined) {
                    app.toasty('Saved "' + nm + '".');
                    app.menu.state = app.menu.prevState;
                }
            }
            break;
        case MENU_LOAD:
            if(menuItem == 0) {
                app.menu.state = app.menu.prevState;
            } else if(menuItem == 9) {
                // Pick the progression slot as part of starting the session.
                app.menu.prevState = MENU_LOAD;
                app.menu.state = MENU_SLOT;
            } else {
                if(!app.world) {
                    app.world = new SandboxWorld(app);
                }
                const nm = app.namedWorlds().slice(0, 8)[menuItem - 1];
                app.currentWorldFile = null;   // named saves are sandbox worlds
                if(nm && app.world.loadNamed(nm)) {
                    app.toasty('Loaded "' + nm + '".');
                    app.menu.state = MENU_HUD;
                    app.goto_playMode();
                } else {
                    app.showMessage('Failed to load that world!');
                }
            }
            break;
        case MENU_DIALOG: {
            const dlg = app.dialog;
            if(!dlg) { app.menu.state = MENU_HUD; break; }
            const choice = dlg.tree.nodes[dlg.node].choices[menuItem - 1];
            if(!choice) break;
            if(choice.next) {
                dlg.node = choice.next;
                app.menu.renderedState = -1;
            } else if(choice.action === 'hire') {
                // A refused hire (broke) keeps the conversation open.
                if(app.hireCompanion(dlg.tree.comp.id)) {
                    app.dialog = null;
                    app.menu.state = MENU_HUD;
                }
            } else if(choice.action === 'dismiss') {
                app.dismissCompanion(dlg.tree.comp.id);
                app.dialog = null;
                app.menu.state = MENU_HUD;
            } else {   // 'bye'
                app.dialog = null;
                app.menu.state = MENU_HUD;
            }
            break;
        }
        case MENU_NET:
            if(menuItem === 1) {
                app.netCreateOffer().then((code) => app._netShare(code, 'Invite code'));
            } else if(menuItem === 2) {
                app.promptText('Paste your friend\'s ANSWER code:', '', (v) => {
                    if(v) app.netFinish(v).then(() => app.toasty('Linked! The channel opens in a moment…'));
                });
            } else if(menuItem === 3) {
                app.promptText('Paste the INVITE code:', '', (v) => {
                    if(v) app.netAcceptOffer(v).then((code) => app._netShare(code, 'Answer code'));
                });
            } else if(menuItem === 0) {
                app.menu.state = app.menu.prevState || MENU_MAIN;
            }
            break;
        case MENU_SLOT:
            if(menuItem >= 1 && menuItem <= 3) {
                app.selectSlot(menuItem);
                app.menu.renderedState = -1;
            } else if(menuItem === 0) {
                app.menu.state = app.menu.prevState || MENU_MAIN;
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
                    handler: () => { app.triggerMenuItem(MENU_MAIN, 6); }
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnSlot',
                    text: '7. Progression Slot  (slot ' + (this.saveSlot || 1) + ' active)',
                    handler: () => {
                        app.triggerMenuItem(MENU_MAIN, 7);
                    }
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnNet',
                    text: '8. Online Co-op' + (this.net && !this.net.closed ? '  ◉ LINKED' : ''),
                    handler: () => { app.triggerMenuItem(MENU_MAIN, 8); }
                });
                break;
            case MENU_DIALOG: {
                this.MenuRect();
                const dlg = this.dialog;
                if (!dlg) break;
                const node = dlg.tree.nodes[dlg.node];
                this.MenuItem({
                    type: 'text', name: 'dlgSpeaker',
                    text: dlg.tree.speaker.toUpperCase(),
                    fontSize: 22, accent: true,
                });
                this.MenuItem({
                    type: 'text', name: 'dlgText',
                    text: node.text, fontSize: 15, color: '#e8ecff',
                });
                node.choices.forEach((ch, i) => {
                    this.MenuItem({
                        type: 'button', name: 'dlgChoice_' + i,
                        text: (i + 1) + '. ' + ch.text,
                        handler: () => { app.triggerMenuItem(MENU_DIALOG, i + 1); }
                    });
                });
                break;
            }
            case MENU_NET: {
                this.MenuRect();
                this.MenuItem({ type: 'text', name: 'netTitle', text: 'ONLINE CO-OP',
                    fontSize: 24, accent: true });
                this.MenuItem({ type: 'text', name: 'netStatus',
                    text: (this.net && !this.net.closed)
                        ? ((typeof NetHub !== 'undefined' && this.net instanceof NetHub)
                            ? ('HOSTING — ' + this.net.links.filter((l) => !l.closed).length +
                               ' friend(s) linked. Create another code to invite more.')
                            : ('Linked as ' + (this.net.isHost ? 'HOST' : 'GUEST') + ' — friends appear as named ghosts.'))
                        : (this.net && this.net.dropped)
                            ? 'LINK LOST — trade fresh codes below to reconnect (the host re-sends the world).'
                            : 'Serverless WebRTC: trade two codes with a friend (chat, email, pigeon).',
                    fontSize: 13, color: '#ff9bce' });
                this.MenuItem({ type: 'button', name: 'btnNetHost',
                    text: '1. Host — create invite code (one per friend)',
                    handler: () => { app.triggerMenuItem(MENU_NET, 1); } });
                this.MenuItem({ type: 'button', name: 'btnNetFinish',
                    text: '2. Host — paste friend\'s answer',
                    handler: () => { app.triggerMenuItem(MENU_NET, 2); } });
                this.MenuItem({ type: 'button', name: 'btnNetJoin',
                    text: '3. Join — paste an invite code',
                    handler: () => { app.triggerMenuItem(MENU_NET, 3); } });
                this.MenuItem({ type: 'button', name: 'btnNetBack', text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_NET, 0); } });
                break;
            }
            case MENU_SLOT: {
                this.MenuRect();
                this.MenuItem({
                    type: 'text',
                    name: 'slotTitle',
                    text: 'PROGRESSION SLOT',
                    fontSize: 24,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'slotHint',
                    text: 'Pixels, levels, skills and companions live per slot.\nThe collection (everything you own) is shared.',
                    fontSize: 13,
                    color: '#ff9bce',
                });
                for (let n = 1; n <= 3; n++) {
                    this.MenuItem({
                        type: 'button',
                        name: 'btnSlot_' + n,
                        text: n + '. Slot ' + n + (n === this.saveSlot ? '   ◉ ACTIVE' : ''),
                        handler: () => { app.triggerMenuItem(MENU_SLOT, n); }
                    });
                }
                this.MenuItem({
                    type: 'button',
                    name: 'btnSlotBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_SLOT, 0); }
                });
                break;
            }
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
                    text: (this.menu.state == MENU_SAVE ? 'SAVE WORLD' : 'LOAD WORLD'),
                    fontSize: 24,
                    accent: true,
                });

                // Worlds save under NAMES now (numbered slots belong to
                // character progression). SAVE: 1 = new name, 2+ = overwrite
                // an existing name. LOAD: 1+ = the named worlds.
                {
                    const names = this.namedWorlds();
                    const saving = this.menu.state == MENU_SAVE;
                    if (saving) {
                        this.MenuItem({
                            type: 'button',
                            name: 'btnSaveNew',
                            text: '1. Save as new name…',
                            handler: () => { app.triggerMenuItem(MENU_SAVE, 1); }
                        });
                    }
                    if (!names.length && !saving) {
                        this.MenuItem({ type: 'text', name: 'noWorlds',
                            text: 'No saved worlds yet.', fontSize: 14 });
                    }
                    names.slice(0, 8).forEach((nm, i) => {
                        const n = i + (saving ? 2 : 1);
                        this.MenuItem({
                            type: 'button',
                            name: (saving ? 'btnSaveName_' : 'btnLoadName_') + nm,
                            text: n + '. ' + (saving ? 'Overwrite "' : 'Load "') + nm + '"',
                            handler: () => { app.triggerMenuItem(this.menu.state, n); }
                        });
                    });
                    // Loading starts a session: show which progression slot
                    // is playing and offer the switch right here.
                    if (!saving) {
                        this.MenuItem({
                            type: 'button',
                            name: 'btnLoadSlot',
                            text: '9. Progression Slot  (slot ' + (this.saveSlot || 1) + ' active)',
                            handler: () => { app.triggerMenuItem(MENU_LOAD, 9); }
                        });
                    }
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
                    name: 'btnSkCare',
                    text: '8. Sidekick Care  (' + (this.sidekickFood || 0) + ' food · feed + wardrobe)',
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
                    type: 'text',
                    name: 'gadgetHdr',
                    text: '— GADGETS (HEX) —',
                    fontSize: 14,
                    color: '#9fb3c8',
                });
                GADGET_HEXES.forEach((g, i) => {
                    const n = DISCS.length + HEX_DISCS.length + i + 1;
                    const active = this.activeGadgetHex === g.id;
                    const status = active ? '◉ ACTIVE' : (this.ownsGadget(g.id) ? 'Owned' : g.price + ' px');
                    this.MenuItem({
                        type: 'button',
                        name: 'btnGadget_' + g.id,
                        text: n + '. ' + g.name + ' — ' + g.desc + '   [' + status + ']',
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
            case MENU_GEAR: {
                this.MenuRect();
                const skDef = this.activeSidekick ? this.sidekickById(this.activeSidekick) : null;
                this.MenuItem({
                    type: 'text',
                    name: 'gearTitle',
                    text: 'SIDEKICK CARE' + (skDef ? '  ·  ' + skDef.name + ' · LV ' + this.sidekickLevelOf(skDef.id) : ''),
                    fontSize: 22,
                    accent: true,
                });
                this.MenuItem({
                    type: 'text',
                    name: 'gearFood',
                    text: (this.sidekickFood || 0) + ' food in the pantry  ·  gear is crafted from food',
                    fontSize: 15,
                    color: '#ff9bce',
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnGearFeed',
                    text: '1. Feed  ' + ((this.sidekickFood || 0) > 0
                        ? '(1 food → ' + (this.gearWorn('cape') ? 20 : 15) + ' XP)'
                        : '(10 px → 10 XP)'),
                    handler: () => { app.triggerMenuItem(MENU_GEAR, 1); }
                });
                SIDEKICK_GEAR.forEach((g, i) => {
                    const n = 2 + i;
                    const status = this.gearWorn(g.id) ? '◉ WORN'
                        : (this.ownsGear(g.id) ? 'Owned' : g.cost + ' food');
                    this.MenuItem({
                        type: 'button',
                        name: 'btnGear_' + g.id,
                        text: n + '. ' + g.name + ' (' + g.slot + ') — ' + g.desc + '   [' + status + ']',
                        handler: () => { app.triggerMenuItem(MENU_GEAR, n); }
                    });
                });
                this.MenuItem({
                    type: 'button',
                    name: 'btnGearBack',
                    text: '0. Back',
                    handler: () => { app.triggerMenuItem(MENU_GEAR, 0); }
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
                    type: 'text',
                    name: 'galleryHdr',
                    text: '— GALLERY —',
                    fontSize: 14,
                    color: '#9fb3c8',
                });
                if(!this.gallery) {
                    this.MenuItem({ type: 'text', name: 'galleryLoading', text: 'Loading gallery…', fontSize: 14 });
                } else if(this.gallery.length === 0) {
                    this.MenuItem({ type: 'text', name: 'galleryEmpty', text: 'No gallery worlds found.', fontSize: 14 });
                } else {
                    // A click-only toggle (item 80): in favourite mode, a
                    // gallery pick stars/unstars that world instead of loading it.
                    this.MenuItem({
                        type: 'button',
                        name: 'btnFavMode',
                        text: (this._galleryFavMode ? '★ Favourite mode: ON — pick a world to star/unstar'
                                                    : '☆ Favourite mode: off (tap to star worlds)'),
                        handler: () => { app.triggerMenuItem(MENU_SHARE, 80); }
                    });
                    // Featured-first, then favourites, then the rest.
                    this.orderedGallery().forEach((g, i) => {
                        const n = 3 + i;
                        const owned = this.playsetOwned(g);
                        const star = this.isFavorite(g.file) ? '★ ' : '';
                        this.MenuItem({
                            type: 'button',
                            name: 'btnGallery_' + i,
                            text: n + '. ' + (owned ? '' : '🔒 ') + star +
                                (i === 0 && this.featuredWorld() === g ? '★ FEATURED · ' : '') +
                                g.name + ' — ' + (owned ? g.desc : g.price + ' px to unlock'),
                            handler: () => { app.triggerMenuItem(MENU_SHARE, n); }
                        });
                    });
                }
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
                // Starting a session includes choosing WHO is playing: show
                // the active progression slot and offer the switch here.
                this.MenuItem({
                    type: 'button',
                    name: 'btnTplSlot',
                    text: '9. Progression Slot  (slot ' + (this.saveSlot || 1) + ' active)',
                    handler: () => { app.triggerMenuItem(MENU_WORLD_TEMPLATE, 9); }
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
                if(assetProps.surface) woNewAsset.surface = assetProps.surface;
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
            box.material = assetProps.grassBlock.theme
                ? app.themeAtlasMaterial(assetProps.grassBlock.theme)
                : app.terrainAtlasMaterial();
            // Invisible template must never collide (see the mesh branch).
            app.disableCollisionsTree(box);
            let woNewAsset = new WorldObject(app, objectName, box, false, scriptClass);
            if(assetProps.anchor) woNewAsset.anchor = assetProps.anchor;
            // Footsteps read the atlas by face: grass on the top, dirt on the
            // sides (see PlayMode.footstepSurface).
            woNewAsset.surface = assetProps.surface || 'grassblock';
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
                // Footstep surface: explicit tag, else infer from the first
                // prim's texture (wood sounds wooden, marble reads as stone).
                if(assetProps.surface) woNewAsset.surface = assetProps.surface;
                else {
                    const texId = assetProps.prims[0] && assetProps.prims[0].tex && assetProps.prims[0].tex.id;
                    if(texId === 'wood') woNewAsset.surface = 'wood';
                    else if(texId === 'marble' || texId === 'starfield') woNewAsset.surface = 'stone';
                }
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
                // Classic red brick from the CC0 texture pack (~4 bricks per
                // tile). The old procedural params meant "bricks across/up",
                // so tiling scales them down by that count to keep the
                // author-chosen density on every wall.
                tex = new BABYLON.Texture(App.PACK_TEX.brick, this.scene);
                tex.name = 'brickTex[' + uid + ']';
                tex.uScale = Math.max(0.5, (spec.w || 10) / 4);
                tex.vScale = Math.max(0.5, (spec.h || 6) / 4);
                break;
            case 'wood':
                // Warm toy-like wood grain from the pack. The old `s` param
                // was procedural grain amplitude -- irrelevant for an image;
                // a gentle 2x tile reads well on furniture and doors alike.
                tex = new BABYLON.Texture(App.PACK_TEX.wood, this.scene);
                tex.name = 'woodTex[' + uid + ']';
                tex.uScale = 2;
                tex.vScale = 2;
                break;
            case 'planks':
                // Weathered floorboards (interior floors, decks).
                tex = new BABYLON.Texture(App.PACK_TEX.planks, this.scene);
                tex.name = 'planksTex[' + uid + ']';
                tex.uScale = 2;
                tex.vScale = 2;
                break;
            case 'grass':
                // Pack grass (dense, saturated, tiles invisibly) -- the same
                // image the terrain atlas bakes for block tops.
                tex = new BABYLON.Texture(App.PACK_TEX.grass, this.scene);
                tex.name = 'grassTex[' + uid + ']';
                break;
            case 'dirt':
                tex = new BABYLON.Texture('assets/textures/dirt.png', this.scene);
                tex.name = 'dirtTex[' + uid + ']';
                break;
            case 'marble':
                // Cream marble tile from the pack; the diffuse tint (col)
                // colours it exactly like the old procedural marble.
                tex = new BABYLON.Texture(App.PACK_TEX.marble, this.scene);
                tex.name = 'marbleTex[' + uid + ']';
                tex.uScale = spec.w || 1;
                tex.vScale = spec.h || 1;
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
            // The pack grass is a seamless 128 tile: 2x2 keeps the features
            // big enough to read at gameplay camera distance (4x4 averaged
            // away to flat green; a single 4x upscale went blurry).
            for (let ty = 0; ty < 2; ty++) {
                for (let tx = 0; tx < 2; tx++) {
                    ctx.drawImage(grass, 512 + tx * 256, ty * 256, 256, 256);
                }
            }
            dt.update();
        };
        dirt.onload = done;
        grass.onload = done;
        dirt.src = 'assets/textures/dirt.png';
        grass.src = App.PACK_TEX.grass;
        this._terrainAtlasMat = mat;
        return mat;
    }

    // Themed terrain atlases (sand, snow, ...): same trick as the grass
    // atlas -- side texture in the left half, top in the right, ONE shared
    // material per theme so themed blocks stay instancable -- but drawn
    // procedurally (base coat + speckle) so themes need no image assets.
    themeAtlasMaterial(theme) {
        this._themeAtlasMats = this._themeAtlasMats || {};
        if (this._themeAtlasMats[theme]) return this._themeAtlasMats[theme];
        const PALETTES = {
            sand: { side: '#a9834f', top: '#e2c884', fleck: '#c9ad68', fleck2: '#f0dca4' },
            snow: { side: '#8fa3b8', top: '#eef4fb', fleck: '#ffffff', fleck2: '#cddcec' },
            // Volcanic: charred basalt sides, a glowing-ember crust on top.
            volcanic: { side: '#2c2622', top: '#8a2b17', fleck: '#ff7a2a', fleck2: '#ffc24a' },
            // Toxic: sickly alien crust with acid-green speckle.
            toxic: { side: '#3a2f52', top: '#4f7a2f', fleck: '#b6ff4a', fleck2: '#8de0ff' },
        };
        const pal = PALETTES[theme] || PALETTES.sand;
        const mat = new BABYLON.StandardMaterial('terrainBlockMat_' + theme, this.scene);
        const dt = new BABYLON.DynamicTexture('themeAtlas_' + theme, { width: 1024, height: 512 }, this.scene, true);
        mat.diffuseTexture = dt;
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        const ctx = dt.getContext();
        ctx.fillStyle = pal.side; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = pal.top;  ctx.fillRect(512, 0, 512, 512);
        // Speckle so the theme reads as a surface, not a paint swatch.
        for (let i = 0; i < 2600; i++) {
            ctx.fillStyle = (i % 2) ? pal.fleck : pal.fleck2;
            ctx.globalAlpha = 0.25 + Math.random() * 0.3;
            ctx.fillRect(Math.random() * 1024, Math.random() * 512,
                2 + Math.random() * 3, 2 + Math.random() * 3);
        }
        ctx.globalAlpha = 1;
        dt.update();
        // The toxic crust has a real match in the texture pack (sickly moss):
        // tile it into the TOP half under a light acid-speckle repaint. The
        // other themes keep their procedural paint -- the pack has no sand,
        // snow or lava.
        if (theme === 'toxic') {
            const moss = new Image();
            moss.onload = () => {
                for (let ty = 0; ty < 4; ty++) {
                    for (let tx = 0; tx < 4; tx++) {
                        ctx.drawImage(moss, 512 + tx * 128, ty * 128, 128, 128);
                    }
                }
                for (let i = 0; i < 500; i++) {
                    ctx.fillStyle = (i % 2) ? pal.fleck : pal.fleck2;
                    ctx.globalAlpha = 0.25 + Math.random() * 0.3;
                    ctx.fillRect(512 + Math.random() * 512, Math.random() * 512,
                        2 + Math.random() * 3, 2 + Math.random() * 3);
                }
                ctx.globalAlpha = 1;
                dt.update();
            };
            moss.src = App.PACK_TEX.toxicTop;
        }
        this._themeAtlasMats[theme] = mat;
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

    // ---- progression slots + named worlds -----------------------------------
    // The live iis_* keys always hold the ACTIVE slot's progression; slots
    // are snapshots (iis_slotdata_N). Ownership/collection keys are never
    // snapshotted, so the collection is shared across slots by construction.

    _isProgressionKey(k) {
        return k === 'iis_pixels' || k === 'iis_figure' || k === 'iis_sidekick_active' ||
            k === 'iis_sk_food' || k === 'iis_discs_equipped' || k === 'iis_hex_active' ||
            k === 'iis_companions' || k === 'iis_gadget_active' ||
            /^iis_fig_/.test(k) || /^iis_sk_.+_(level|xp|gear)$/.test(k);
    }

    // ---- companions (dialog-tree hiring) -------------------------------------

    companionById(id) { return COMPANIONS.find((c) => c.id === id) || null; }
    companionHired(id) { return (this.hiredCompanions || []).includes(id); }

    hireCompanion(id) {
        const comp = this.companionById(id);
        if (!comp || this.companionHired(id)) return false;
        if (comp.cost > 0 && this.pixels < comp.cost) {
            this.toasty(comp.name + ' costs ' + comp.cost + ' pixels to hire.');
            return false;
        }
        if (comp.cost > 0) this.pixels -= comp.cost;
        this.hiredCompanions.push(id);
        this.saveEconomy();
        this.toasty(comp.name + ' joins you!');
        return true;
    }

    dismissCompanion(id) {
        const i = (this.hiredCompanions || []).indexOf(id);
        if (i < 0) return false;
        this.hiredCompanions.splice(i, 1);
        this.saveEconomy();
        this.toasty(this.companionById(id).name + ' waves goodbye.');
        return true;
    }

    // The recruit's dialog tree: a hiring pitch, or (once hired) small talk
    // with a parting option. Nodes are {text, choices:[{text, next|action}]}.
    recruitTree(comp) {
        if (this.companionHired(comp.id)) {
            return { speaker: comp.name, comp, start: 'start', nodes: {
                start: { text: '"Need something, boss?"', choices: [
                    { text: 'Just checking in.', action: 'bye' },
                    { text: 'Time to part ways…', next: 'part' },
                ] },
                part: { text: '"…I understand. Call if you need me."', choices: [
                    { text: 'Dismiss ' + comp.name, action: 'dismiss' },
                    { text: 'Actually — stay!', action: 'bye' },
                ] },
            } };
        }
        const hireLabel = comp.cost > 0
            ? 'Hire ' + comp.name + '  (' + comp.cost + ' px)'
            : 'Ask ' + comp.name + ' to join  (free)';
        return { speaker: comp.name, comp, start: 'start', nodes: {
            start: { text: comp.greeting, choices: [
                { text: 'Who are you?', next: 'about' },
                { text: hireLabel, action: 'hire' },
                { text: 'Maybe later.', action: 'bye' },
            ] },
            about: { text: comp.about, choices: [
                { text: hireLabel, action: 'hire' },
                { text: 'Maybe later.', action: 'bye' },
            ] },
        } };
    }

    openDialog(tree) {
        this.dialog = { tree, node: tree.start };
        this.menu.state = MENU_DIALOG;
        this.menu.renderedState = -1;
    }

    _progressionSnapshot() {
        const out = {};
        for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && this._isProgressionKey(k)) out[k] = window.localStorage.getItem(k);
        }
        return out;
    }

    selectSlot(n) {
        if (!n || n === this.saveSlot) return;
        this.saveEconomy();
        const current = this._progressionSnapshot();
        window.localStorage.setItem('iis_slotdata_' + this.saveSlot, JSON.stringify(current));
        Object.keys(current).forEach((k) => window.localStorage.removeItem(k));
        let blob = {};
        try { blob = JSON.parse(window.localStorage.getItem('iis_slotdata_' + n) || '{}') || {}; }
        catch (e) { blob = {}; }
        Object.keys(blob).forEach((k) => window.localStorage.setItem(k, blob[k]));
        this.saveSlot = n;
        window.localStorage.setItem('iis_active_slot', String(n));
        this.loadEconomy();
        this.toasty('Progression slot ' + n + ' active.');
    }

    // ---- portal doors: nested sub-worlds -----------------------------------
    // A portal door leads to a NAMED sub-level stored INSIDE its parent
    // world's save (Disney-Infinity style: the door's level lives in the
    // world that owns the door). Entering swaps the whole scene to the
    // sub-world; exiting swaps back and folds any edits into the parent.

    // Swap into the named sub-level. `seed` furnishes it on first entry;
    // `returnSpot`/`doorId` let the exit teleport the player back beside the
    // door they came through. Returns true when the swap happened.
    enterSubWorld(name, seed, returnSpot, doorId) {
        if (!this.world || !name) return false;
        if (!this.subWorlds[name]) this.subWorlds[name] = seed || { objects: [] };
        const blob = this.subWorlds[name];
        const frame = {
            data: this.world.serialize(),          // embeds the current subWorlds
            name: name,
            doorId: doorId,
            returnSpot: returnSpot ? { x: returnSpot.x, y: returnSpot.y, z: returnSpot.z } : null,
            parentSpawn: this.world.spawnPoint ? this.world.spawnPoint.clone() : null,
        };
        this.worldStack.push(frame);
        this.world.loadFromData(blob);             // also swaps this.subWorlds
        return true;
    }

    // Swap back out to the parent world, folding the sub-level's current
    // state (edits and all) into the parent's subWorlds map. Returns the
    // popped stack frame (for the return teleport), or null at the root.
    exitSubWorld() {
        if (!this.worldStack.length || !this.world) return null;
        const current = this.world.serialize();
        const frame = this.worldStack.pop();
        frame.data.subWorlds = frame.data.subWorlds || {};
        frame.data.subWorlds[frame.name] = current;
        this.world.loadFromData(frame.data);
        if (frame.parentSpawn) this.world.spawnPoint = frame.parentSpawn;
        return frame;
    }

    // The complete ROOT world snapshot regardless of where the player is
    // standing: the current world folded up through every stacked ancestor.
    // Used by saves/exports so they always capture the whole world tree.
    rootWorldData() {
        if (!this.world) return null;
        let cur = this.world.serialize();
        for (let i = this.worldStack.length - 1; i >= 0; i--) {
            const parent = JSON.parse(JSON.stringify(this.worldStack[i].data));
            parent.subWorlds = parent.subWorlds || {};
            parent.subWorlds[this.worldStack[i].name] = cur;
            cur = parent;
        }
        return cur;
    }

    // Every named world in storage, sorted.
    namedWorlds() {
        const out = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.indexOf('iis_world_') === 0) out.push(k.slice(10));
        }
        return out.sort();
    }

    // One-time: old numbered world saves become named worlds ("Slot N").
    _migrateLegacyWorlds() {
        if (window.localStorage.getItem('iis_worlds_migrated')) return;
        for (let n = 1; n <= 9; n++) {
            const raw = window.localStorage.getItem('saveSlot_' + n);
            if (raw && !window.localStorage.getItem('iis_world_Slot ' + n)) {
                window.localStorage.setItem('iis_world_Slot ' + n, raw);
            }
        }
        window.localStorage.setItem('iis_worlds_migrated', '1');
    }

    // Ask the player for a short text (world names, sub-level names, builder
    // requests, co-op codes...). Tests inject via app.testPromptValue;
    // otherwise the styled in-game text field opens (showTextEntry). The
    // callback receives the string, or null when cancelled.
    promptText(label, def, cb) {
        if (this.testPromptValue !== undefined) {
            const v = this.testPromptValue;
            this.testPromptValue = undefined;
            cb(v);
            return;
        }
        this.showTextEntry(label, def, cb);
    }

    // ---- in-game text entry ---------------------------------------------------
    // A reusable modal text field styled like the rest of the HUD. While it
    // is open the whole game freezes (the render loop skips mode updates and
    // the CharacterController stops), so typing WASD doesn't walk the player.
    // Enter confirms, Escape cancels; tests drive app._textEntry directly.
    showTextEntry(label, def, cb) {
        if (this._textEntry) { cb(null); return; }   // one modal at a time
        const A = BABYLON.GUI.Control;

        // Freeze gameplay input for the duration.
        this.textEntryOpen = true;
        const pm = this.activeMode;
        const pausedCC = !!(pm && pm.cc && pm.constructor.name === 'PlayMode');
        if (pausedCC) pm.cc.stop();

        const blocker = new BABYLON.GUI.Rectangle('textEntryBlocker');
        blocker.width = 1; blocker.height = 1;
        blocker.background = 'rgba(4, 6, 16, 0.55)';
        blocker.thickness = 0;
        blocker.isPointerBlocker = true;
        this.gui.addControl(blocker);

        const panel = new BABYLON.GUI.Rectangle('textEntryPanel');
        panel.width = '440px'; panel.height = '200px';
        panel.cornerRadius = 12;
        panel.thickness = 1;
        panel.color = HUD_ACCENT;
        panel.background = 'rgba(10, 16, 34, 0.95)';
        blocker.addControl(panel);

        const stack = new BABYLON.GUI.StackPanel('textEntryStack');
        stack.width = '400px';
        panel.addControl(stack);

        const title = new BABYLON.GUI.TextBlock('textEntryLabel', label || 'Enter text:');
        title.height = '44px';
        title.color = '#eaf2ff';
        title.fontSize = 18;
        title.textHorizontalAlignment = A.HORIZONTAL_ALIGNMENT_LEFT;
        stack.addControl(title);

        const input = new BABYLON.GUI.InputText('textEntryInput', def || '');
        input.width = '400px'; input.height = '46px';
        input.maxWidth = '400px';
        input.color = '#ffffff';
        input.fontSize = 17;
        input.background = 'rgba(36, 58, 92, 0.55)';
        input.focusedBackground = 'rgba(46, 74, 118, 0.75)';
        input.thickness = 1;
        input.focusedColor = HUD_ACCENT;
        stack.addControl(input);

        const row = new BABYLON.GUI.StackPanel('textEntryButtons');
        row.isVertical = false;
        row.height = '62px';
        stack.addControl(row);
        const mkBtn = (name, text, handler) => {
            const b = BABYLON.GUI.Button.CreateSimpleButton(name, text);
            b.width = '150px'; b.height = '42px';
            b.color = '#eaf2ff'; b.fontSize = 16;
            b.cornerRadius = 9; b.thickness = 1;
            b.background = 'rgba(36, 58, 92, 0.55)';
            b.paddingLeft = '10px'; b.paddingTop = '14px';
            b.onPointerEnterObservable.add(() => { b.background = HUD_ACCENT; b.color = '#0b1018'; });
            b.onPointerOutObservable.add(() => { b.background = 'rgba(36, 58, 92, 0.55)'; b.color = '#eaf2ff'; });
            b.onPointerUpObservable.add(handler);
            row.addControl(b);
            return b;
        };

        const close = (value) => {
            if (!this._textEntry) return;   // double-fire guard (Enter + click)
            this._textEntry = null;
            this.textEntryOpen = false;
            blocker.dispose();
            // Stale presses typed into the field must not fire game actions.
            this.keysPressed = {};
            if (pausedCC && pm.cc && this.activeMode === pm) pm.cc.start();
            this.sound.play(value ? 'menu-select' : 'menu-move');
            cb(value);
        };
        const confirm = () => {
            const v = (input.text || '').trim();
            close(v.length ? v : null);
        };
        mkBtn('textEntryOk', 'OK  (Enter)', confirm);
        mkBtn('textEntryCancel', 'Cancel  (Esc)', () => close(null));

        // Enter/Escape while typing.
        if (input.onKeyboardEventProcessedObservable) {
            input.onKeyboardEventProcessedObservable.add((evt) => {
                if (evt.key === 'Enter') confirm();
                else if (evt.key === 'Escape') close(null);
            });
        }
        if (input.focus) input.focus();

        this._textEntry = { blocker: blocker, input: input, confirm: confirm,
            cancel: () => close(null) };
    }

    loadEconomy() {
        if (!this.saveSlot) {
            this.saveSlot = parseInt(window.localStorage.getItem('iis_active_slot'), 10) || 1;
            this._migrateLegacyWorlds();
        }
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
            this.sidekickFood = Math.max(0,
                parseInt(window.localStorage.getItem('iis_sk_food'), 10) || 0);
            const gearOwned = JSON.parse(window.localStorage.getItem('iis_gear_owned') || '[]');
            this.ownedGear = new Set(Array.isArray(gearOwned) ? gearOwned : []);
            const favs = JSON.parse(window.localStorage.getItem('iis_fav_worlds') || '[]');
            this.favoriteWorlds = new Set(Array.isArray(favs) ? favs : []);
            const gadgetOwned = JSON.parse(window.localStorage.getItem('iis_gadget_owned') || '["none"]');
            this.ownedGadgets = new Set(Array.isArray(gadgetOwned) ? gadgetOwned : ['none']);
            this.ownedGadgets.add('none');
            const ga = window.localStorage.getItem('iis_gadget_active');
            this.activeGadgetHex = (ga && this.gadgetById(ga) && this.ownedGadgets.has(ga)) ? ga : 'none';
            const comps = JSON.parse(window.localStorage.getItem('iis_companions') || '[]');
            this.hiredCompanions = (Array.isArray(comps) ? comps : [])
                .filter((id) => this.companionById(id));
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
            this.sidekickFood = 0;
            this.ownedGear = new Set();
            this.hiredCompanions = [];
            this.ownedGadgets = new Set(['none']);
            this.activeGadgetHex = 'none';
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
            window.localStorage.setItem('iis_sk_food', String(this.sidekickFood || 0));
            window.localStorage.setItem('iis_gear_owned', JSON.stringify([...(this.ownedGear || [])]));
            window.localStorage.setItem('iis_companions', JSON.stringify(this.hiredCompanions || []));
            window.localStorage.setItem('iis_fav_worlds', JSON.stringify([...(this.favoriteWorlds || [])]));
            window.localStorage.setItem('iis_gadget_owned', JSON.stringify([...(this.ownedGadgets || ['none'])]));
            window.localStorage.setItem('iis_gadget_active', this.activeGadgetHex || 'none');
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
        // The active sidekick learns alongside the player (half share; the
        // Silver Bell rounds the share up instead of down).
        this.addSidekickXp(this.gearWorn('bell') ? Math.ceil(n / 2) : Math.floor(n / 2));
        this.playerXp += n;
        let leveled = false;
        while (this.playerLevel < MAX_LEVEL && this.playerXp >= this.xpToNext(this.playerLevel)) {
            this.playerXp -= this.xpToNext(this.playerLevel);
            this.playerLevel += 1;
            leveled = true;
        }
        if (this.playerLevel >= MAX_LEVEL) this.playerXp = 0;
        if (leveled) {
            this.sound.play('levelup');
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
        const data = this.rootWorldData();
        const out = {
            format: 'iis-world',
            version: 1,
            objects: data.objects,
        };
        if (data.subWorlds) out.subWorlds = data.subWorlds;   // portal-door levels travel too
        return JSON.stringify(out);
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
        this.worldStack = [];   // imports are fresh root worlds
        this.world.loadFromData({ objects: payload.objects, subWorlds: payload.subWorlds });
        // Co-op Play Sets flag themselves; PlayMode auto-joins P2 on entry.
        this.coopWorld = !!payload.coop;
        this.toasty(payload.coop ? 'Co-op world imported — grab a friend!' : 'World imported!');
        return true;
    }

    // Fetch the world gallery index (bundled with the game today; the same
    // path works against any remote gallery base later). Populates
    // this.gallery and re-renders the Share screen when it arrives.
    fetchGallery() {
        if (this.gallery || this._galleryLoading) return;
        this._galleryLoading = true;
        fetch('./assets/worlds/index.json')
            .then((r) => r.json())
            .then((idx) => {
                this.gallery = (idx && Array.isArray(idx.gallery)) ? idx.gallery : [];
                this.galleryFeatured = (idx && Array.isArray(idx.featured)) ? idx.featured : [];
                this.menu.renderedState = -1;
            })
            .catch((e) => {
                console.error('gallery index failed to load', e);
                this.gallery = [];
            })
            .finally(() => { this._galleryLoading = false; });
    }

    // Play Set gating: gallery entries with a `price` must be bought once
    // (rides the same purchasedSet the shop uses, key 'playset_<file>').
    playsetOwned(entry) {
        if (!entry || !entry.price) return true;
        return !!(this.purchasedSet && this.purchasedSet.has('playset_' + entry.file));
    }

    buyPlayset(entry) {
        if (!entry || this.playsetOwned(entry)) return true;
        if (this.pixels < entry.price) {
            this.toasty(entry.name + ' is a Play Set — ' + entry.price + ' pixels to unlock.');
            return false;
        }
        this.pixels -= entry.price;
        this.purchasedSet.add('playset_' + entry.file);
        // The Play Set's heroes join the (shared) collection with it.
        FIGURES.forEach((f) => {
            if (f.campaign === entry.file && !this.ownedFigures.has(f.id)) {
                this.ownedFigures.add(f.id);
                this.toasty(f.name + ' joins your collection!');
            }
        });
        this.saveEconomy();
        this.toasty('Play Set unlocked: ' + entry.name + '!');
        return true;
    }

    // Today's featured world: the curated `featured` rotation advances one
    // entry per day, deterministically and serverless. `day` is injectable
    // for tests; it defaults to the wall-clock day number.
    featuredWorld(day) {
        const rot = this.galleryFeatured || [];
        if (!rot.length || !this.gallery) return null;
        const d = (day != null) ? day : Math.floor(Date.now() / 86400000);
        const file = rot[((d % rot.length) + rot.length) % rot.length];
        return this.gallery.find((g) => g.file === file) || null;
    }

    // The gallery in display order: today's featured world first.
    orderedGallery(day) {
        if (!this.gallery) return [];
        const feat = this.featuredWorld(day);
        const favs = this.favoriteWorlds || new Set();
        // Featured pick first, then favourites (in gallery order), then the
        // rest -- so the worlds you starred float to the top of the list.
        const rest = this.gallery.filter((g) => g !== feat);
        const starred = rest.filter((g) => favs.has(g.file));
        const others = rest.filter((g) => !favs.has(g.file));
        return (feat ? [feat] : []).concat(starred, others);
    }

    isFavorite(file) { return !!(this.favoriteWorlds && this.favoriteWorlds.has(file)); }

    // Star / unstar a gallery world; persists and re-sorts the list.
    toggleFavorite(file) {
        if (!this.favoriteWorlds) this.favoriteWorlds = new Set();
        if (this.favoriteWorlds.has(file)) this.favoriteWorlds.delete(file);
        else this.favoriteWorlds.add(file);
        this.saveEconomy();
        return this.favoriteWorlds.has(file);
    }

    // Import a world file straight from a URL. Resolves true on success.
    importWorldFromUrl(url) {
        return fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then((text) => {
                const ok = this.importWorldData(text);
                // Campaign context: gallery/URL worlds are identified by
                // file name (figure locks key off it). Anything else --
                // templates, named saves, file imports -- clears it.
                this.currentWorldFile = ok ? url.split('/').pop() : null;
                return ok;   // (coopWorld set inside importWorldData)
            })
            .catch((e) => {
                console.error('world fetch failed', url, e);
                this.toasty('Could not fetch that world.');
                return false;
            });
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

    // The active sidekick's aura: +2 max HP per sidekick level, +2 more when
    // it wears the Tiny Top Hat.
    sidekickBonus() {
        if (!this.activeSidekick) return 0;
        return this.sidekickLevelOf(this.activeSidekick) * 2 + (this.gearWorn('tophat') ? 2 : 0);
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

    // ---- sidekick gear -------------------------------------------------------

    sidekickGear() { return SIDEKICK_GEAR; }
    gearById(id) { return SIDEKICK_GEAR.find((g) => g.id === id) || null; }
    ownsGear(id) { return !!(this.ownedGear && this.ownedGear.has(id)); }

    // The active outfit of a sidekick: {hat, trinket} (ids or null).
    gearOf(skId) {
        try {
            const raw = JSON.parse(window.localStorage.getItem('iis_sk_' + skId + '_gear') || '{}') || {};
            return {
                hat: (raw.hat && this.gearById(raw.hat) && this.ownsGear(raw.hat)) ? raw.hat : null,
                trinket: (raw.trinket && this.gearById(raw.trinket) && this.ownsGear(raw.trinket)) ? raw.trinket : null,
            };
        } catch (e) { return { hat: null, trinket: null }; }
    }

    // True when the ACTIVE sidekick wears the piece.
    gearWorn(id) {
        if (!this.activeSidekick) return false;
        const g = this.gearById(id);
        if (!g) return false;
        return this.gearOf(this.activeSidekick)[g.slot] === id;
    }

    // Buy with food (auto-wears), or toggle wear when already owned. A new
    // piece in an occupied slot replaces what's worn (the old piece stays
    // owned). Outfits are per sidekick.
    buyOrWearGear(id) {
        const gear = this.gearById(id);
        if (!gear) return false;
        if (!this.activeSidekick) { this.toasty('Adopt a sidekick first.'); return false; }
        if (!this.ownsGear(id)) {
            if ((this.sidekickFood || 0) < gear.cost) {
                this.toasty(gear.name + ' costs ' + gear.cost + ' food — grow some glowberries.');
                return false;
            }
            this.sidekickFood -= gear.cost;
            this.ownedGear.add(id);
            this.toasty('Crafted ' + gear.name + '!');
        }
        const outfit = this.gearOf(this.activeSidekick);
        outfit[gear.slot] = (outfit[gear.slot] === id) ? null : id;   // toggle / replace
        try {
            window.localStorage.setItem('iis_sk_' + this.activeSidekick + '_gear', JSON.stringify(outfit));
        } catch (e) { /* storage may be unavailable */ }
        this.applySkillsToSession();   // hat HP applies live
        this.saveEconomy();
        return true;
    }

    // Farmed sidekick food (harvested from pr_plot crops).
    addSidekickFood(n) {
        this.sidekickFood = Math.max(0, (this.sidekickFood || 0) + n);
        this.saveEconomy();
    }

    // Feed the active sidekick. Farmed food is the premium meal (1 food ->
    // 15 XP); with the pantry empty it falls back to 10 pixels -> 10 XP.
    feedSidekick() {
        if (!this.activeSidekick) { this.toasty('No sidekick to feed.'); return false; }
        // The Micro Cape makes every meal heartier.
        const capeBonus = this.gearWorn('cape') ? 5 : 0;
        if ((this.sidekickFood || 0) > 0) {
            this.sidekickFood -= 1;
            this.addSidekickXp(15 + capeBonus);
            this.toasty('Yum — glowberries!  (+' + (15 + capeBonus) + ' XP)');
            this.saveEconomy();
            return true;
        }
        if (this.pixels < 10) { this.toasty('Feeding costs 10 pixels (or grow food on a farm plot).'); return false; }
        this.pixels -= 10;
        this.addSidekickXp(10 + capeBonus);
        this.saveEconomy();
        return true;
    }

    // ---- hex discs (world themes) -------------------------------------------

    hexDiscs() { return HEX_DISCS; }
    hexById(id) { return HEX_DISCS.find((d) => d.id === id) || null; }

    // ---- gadget hexes (passive perks) ----
    gadgetHexes() { return GADGET_HEXES; }
    gadgetById(id) { return GADGET_HEXES.find((g) => g.id === id) || null; }
    ownsGadget(id) { return id === 'none' || (this.ownedGadgets && this.ownedGadgets.has(id)); }
    activeGadgetEffect() {
        const g = this.gadgetById(this.activeGadgetHex);
        return g ? g.effect : null;
    }

    buyGadgetHex(id) {
        const g = this.gadgetById(id);
        if (!g) return false;
        if (this.ownsGadget(id)) return this.selectGadgetHex(id);
        if (this.pixels < g.price) {
            this.toasty('Not enough pixels — ' + g.name + ' costs ' + g.price + '.');
            return false;
        }
        this.pixels -= g.price;
        this.ownedGadgets.add(id);
        this.toasty('Unlocked ' + g.name + '!');
        return this.selectGadgetHex(id);
    }

    selectGadgetHex(id) {
        if (!this.ownsGadget(id)) return false;
        this.activeGadgetHex = id;
        this.applyGadgetToSession();
        this.saveEconomy();
        return true;
    }

    // Apply the active gadget perk to a live play session (and it's called
    // by PlayMode on session start): magnet + guardian set flags PlayMode
    // reads; booster raises the CC's jump speed (and the stock-jump baseline
    // so trampoline restores don't erase it).
    applyGadgetToSession() {
        const pm = this.activeMode;
        if (!pm || pm.constructor.name !== 'PlayMode') return;
        const effect = this.activeGadgetEffect();
        pm.gadgetMagnet = (effect === 'magnet');
        pm._normalJumpSpeed = (effect === 'booster') ? 9 : 6;
        if (pm.cc) pm.cc.setJumpSpeed(pm._normalJumpSpeed);
        pm.gadgetGuardian = (effect === 'guardian');
        pm.shieldCharge = (effect === 'guardian') ? 1 : 0;
    }
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
        if (fig.campaign) {
            this.sound.play('denied');
            this.toasty(fig.name + ' comes with a Play Set — unlock it on the Share screen.');
            return false;
        }
        if (this.pixels < fig.price) {
            this.sound.play('denied');
            this.toasty('Not enough pixels — ' + fig.name + ' costs ' + fig.price + '.');
            return false;
        }
        this.pixels -= fig.price;
        this.ownedFigures.add(id);
        this.sound.play('purchase');
        this.toasty('Unlocked ' + fig.name + '!');
        return this.selectFigure(id);
    }

    // Make a figure the active character: swap in its saved level/XP and apply
    // its tint/stats to a live play session immediately.
    // Inside a campaign world, only that campaign's own heroes may be
    // SWITCHED TO (the figure you arrived with keeps playing -- a guest
    // hero); in the open Sandbox every owned figure is fair game.
    figureAllowed(id) {
        const fig = this.figureById(id);
        if (!fig) return false;
        const w = this.currentWorldFile;
        if (!w || !FIGURES.some((f) => f.campaign === w)) return true;
        return fig.campaign === w;
    }

    selectFigure(id) {
        const fig = this.figureById(id);
        if (!fig || !this.ownsFigure(id)) return false;
        if (id !== this.activeFigure && !this.figureAllowed(id)) {
            this.sound.play('denied');
            this.toasty('This Play Set calls for its own hero — ' +
                (FIGURES.find((f) => f.campaign === this.currentWorldFile) || {}).name + '.');
            return false;
        }
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
            this.sound.play('denied');
            this.toasty('Not enough pixels — need ' + price + '.');
            return false;
        }
        this.pixels -= price;
        this.purchasedSet.add(name);
        this.saveEconomy();
        this.sound.play('purchase');
        this.toasty('Purchased ' + this.prettyName(name) + '!');
        return true;
    }

    // ---- synthesized audio ---------------------------------------------------
    // Zero asset files: every sound is WebAudio oscillators. The context is
    // lazy (autoplay policy: it may sit suspended until a user gesture; we
    // nudge resume() on every use and schedule regardless -- scheduling
    // against a suspended context is legal and simply plays once resumed).

    // ---- online co-op (WebRTC, manual signaling; see NetLink.js) -----------

    // Stash + clipboard a signaling code; the toast tells the player what
    // to do with it. lastNetCode is the test hook AND the console fallback.
    _netShare(code, label) {
        this.lastNetCode = code;
        const fallback = () => this.toasty(label + ' ready — copy it from the console: app.lastNetCode');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // writeText REJECTS (async) without permission -- catch the
            // promise, not just synchronous throws.
            navigator.clipboard.writeText(code).then(
                () => this.toasty(label + ' copied to clipboard — send it to your friend!'),
                fallback);
        } else {
            fallback();
        }
    }

    async netCreateOffer() {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        const channel = pc.createDataChannel('iis');
        NetRtc._wrap(this, pc, channel, true);
        await pc.setLocalDescription(await pc.createOffer());
        await NetRtc._gathered(pc);
        return JSON.stringify(pc.localDescription);
    }

    async netAcceptOffer(offerStr) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.ondatachannel = (ev) => { NetRtc._wrap(this, pc, ev.channel, false); };
        await pc.setRemoteDescription(JSON.parse(offerStr));
        await pc.setLocalDescription(await pc.createAnswer());
        await NetRtc._gathered(pc);
        return JSON.stringify(pc.localDescription);
    }

    async netFinish(answerStr) {
        await this._netPc.setRemoteDescription(JSON.parse(answerStr));
    }

    audio() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        if (!this._audioCtx) {
            this._audioCtx = new AC();
            this._masterGain = this._audioCtx.createGain();
            this._masterGain.gain.value = 0.6;
            this._masterGain.connect(this._audioCtx.destination);
            this._chimeSeq = 0;
        }
        if (this._audioCtx.state === 'suspended') this._audioCtx.resume().catch(() => {});
        return this._audioCtx;
    }

    // Schedule a tone pattern: notes are {f (Hz), t (start offset s),
    // d (duration s), type (osc waveform)}. Returns true when scheduled.
    // lastChime carries a monotonic seq for tests -- currentTime is frozen
    // while a headless context stays suspended, so it can't be the marker.
    playTones(notes, volume) {
        const ctx = this.audio();
        if (!ctx) return false;
        const now = ctx.currentTime;
        const vol = (volume != null ? volume : 0.5);
        notes.forEach((n) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = n.type || 'sine';
            osc.frequency.value = n.f;
            g.gain.setValueAtTime(0, now + n.t);
            g.gain.linearRampToValueAtTime(vol, now + n.t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
            osc.connect(g);
            g.connect(this._masterGain);
            osc.start(now + n.t);
            osc.stop(now + n.t + n.d + 0.05);
        });
        this.lastChime = { count: notes.length, volume: vol, seq: ++this._chimeSeq };
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
        this.sound.play('wire-connect');
        // Linked builders share wiring live (_netMute stops the remote
        // apply from echoing straight back).
        if(this.net && !this.net.closed && !this._netMute) {
            this.net.sendWire('add', inst, event, toWo, toId, action);
        }
    }

    removeWire(inst, event, toWo, toId, action) {
        if(!inst || !inst.wires) return;
        inst.wires = inst.wires.filter((w) => !(w.event === event && w.toWo === toWo &&
            w.toId == toId && w.action === action));
        this.sound.play('wire-delete');
        if(this.net && !this.net.closed && !this._netMute) {
            this.net.sendWire('remove', inst, event, toWo, toId, action);
        }
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
                btn.onPointerUpObservable.add(() => { this.sound.play('menu-select'); });
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
                if(typeof handler == 'function') {
                    b.onPointerUpObservable.add(() => { this.sound.play('menu-move'); });
                    b.onPointerUpObservable.add(handler);
                }
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
