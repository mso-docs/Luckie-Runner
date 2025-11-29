/**
 * Game - Main game class that orchestrates all systems
 * Handles game loop, state management, and entity coordination
 */
class Game {
    constructor(canvasId) {
        // Canvas setup
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false; // Pixel art
        
        // Game state
        this.state = 'menu'; // 'menu', 'playing', 'paused', 'gameOver'
        this.debug = false; // Debug mode disabled
        this.running = false;
        this.testMode = true; // Start in test mode for debugging
        
        // Core systems
        this.config = GameConfig;
        this.input = new InputManager();
        this.audioManager = new AudioManager(this.config);
        this.stateManager = new GameStateManager(this);
        this.sceneManager = new SceneManager(this);
        this.palmTreeManager = new PalmTreeManager(this);
        this.badgeUI = null;
        this.smallPalms = [];
        this.testRoomMaxX = 0;
        this.softLandingTolerance = 20; // px window to allow top-only landings
        this.collisionSystem = new CollisionSystem(this);
        // Level registry (global in browser)
        if (typeof window !== 'undefined') {
            window.levelRegistry = window.levelRegistry || new LevelRegistry();
        }
        
        // Game entities
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.projectiles = [];
        this.hazards = [];
        this.platforms = [];
        this.chests = [];
        this.flag = null;
        
        // Camera system
        this.cameraLead = { ...(GameConfig.camera?.lead || { x: 100, y: 50 }) }; // Look ahead distance
        this.camera = new Camera({
            viewportWidth: this.canvas.width,
            viewportHeight: this.canvas.height,
            lead: this.cameraLead,
            lerpSpeed: GameConfig.camera?.lerpSpeed ?? 0.15
        });
        
        // Level system
        this.level = {
            width: GameConfig.level?.width ?? 3000,
            height: GameConfig.level?.height ?? 600,
            spawnX: GameConfig.level?.spawn?.x ?? 100,
            spawnY: GameConfig.level?.spawn?.y ?? 400,
            scrollSpeed: GameConfig.level?.scrollSpeed ?? 2
        };
        
        // Background layers for parallax
        this.backgroundLayers = [];
        this.initialTestRoomState = null;
        
        // Game timing
        this.deltaTime = 0;
        this.gameTime = 0;
        this.frameCount = 0;
        this.timeScale = GameConfig.timing?.timeScale ?? 0.6; // Slow down everything by 40%
        this.fps = GameConfig.timing?.fps ?? 60;
        this.targetFrameTime = 1000 / this.fps;
        this.loop = new GameLoop({
            timeScale: this.timeScale,
            onUpdate: this.onTick.bind(this)
        });

        // Intro dialogue UI
        this.speechBubbleUI = new SpeechBubble(document);
        this.speechBubbleUI.init();
        this.speechBubble = this.speechBubbleUI.refs;

        // Services (DI)
        const persistence = new PersistenceService();
        this.services = {
            input: new InputService(this.input),
            audio: new AudioService(this.audioManager),
            render: new RenderContext(this.canvas, this.ctx),
            persistence,
            reset: null,
            save: null
        };
        this.services.reset = new ResetService(this);
        this.services.save = new SaveService(persistence);
        this.progress = new ProgressManager(this, this.services.save);
        this.audioController = new AudioController(this, this.services.audio, this.config);

        // Inventory overlay UI state
        this.inventoryUI = {
            overlay: null,
            isOpen: false
        };

        // Chest overlay UI state
        this.chestUI = {
            overlay: null,
            isOpen: false,
            list: null,
            title: null,
            takeAllButton: null,
            emptyState: null,
            currentChest: null
        };

        // Shop UI state and NPCs
        this.shopUI = {
            overlay: null,
            isOpen: false
        };
        this.npcs = [];
        this.shopGhost = null;
        this.princess = null;
        this.balloonFan = null;
        this.signBoard = null;
        this.signBoards = [];
        this.signSprite = new Image();
        this.signSprite.src = 'art/items/sign.png';
        this.signUI = new SignUI(this);

        // UI managers
        this.dialogueManager = new DialogueManager(this, (typeof window !== 'undefined' && window.Dialogues) ? window.Dialogues : {}, this.speechBubbleUI);
        this.dialogueState = this.dialogueManager.state; // legacy alias
        this.uiManager = new UIManager(this, this.services);
        this.entityFactory = new EntityFactory(this, this.services);
        this.worldBuilder = new WorldBuilder(this, this.entityFactory, this.services);
        this.systems = new GameSystems(this);
        if (typeof Renderer === 'undefined') {
            console.error('Renderer is not loaded. Ensure game/scripts/core/Renderer.js is included before Game.js.');
            throw new Error('Renderer is not loaded.');
        }
        this.renderer = new Renderer(this, this.services);
        
        // Game statistics
        this.stats = {
            enemiesDefeated: 0,
            coinsCollected: 0,
            distanceTraveled: 0,
            timeElapsed: 0
        };
        
        // Initialize game
        this.init();
    }

    /**
     * Top-only landing helper: allows passing in front but landing from above.
     * @param {Object} targetRect - {x,y,width,height}
     * @returns {{onTop:boolean, landed:boolean}}
     */
    topOnlyLanding(targetRect) {
        const playerBounds = CollisionDetection.getCollisionBounds(this.player);
        const playerBottom = playerBounds.y + playerBounds.height;
        const targetTop = targetRect.y;

        // Must overlap horizontally
        const overlapX = playerBounds.x < targetRect.x + targetRect.width &&
            playerBounds.x + playerBounds.width > targetRect.x;

        // Must be coming from above within tolerance
        const descending = this.player.velocity?.y >= 0;
        const withinTolerance = playerBottom >= targetTop &&
            playerBottom <= targetTop + (this.softLandingTolerance || 20);

        if (overlapX && descending && withinTolerance) {
            // Land on top
            this.player.y = targetTop - playerBounds.height;
            this.player.velocity.y = Math.min(0, this.player.velocity.y);
            this.player.onGround = true;
            return { onTop: true, landed: true };
        }

        return { onTop: false, landed: false };
    }

    /**
     * Save a snapshot of pristine game state for future resets
     */
    saveInitialStateTemplate() {
        this.initialStateTemplate = {
            timeScale: this.timeScale,
            testMode: this.testMode,
            level: { ...(this.level || {}) },
            stats: {
                enemiesDefeated: 0,
                coinsCollected: 0,
                distanceTraveled: 0,
                timeElapsed: 0
            },
            camera: this.camera?.getState ? this.camera.getState() : { x: 0, y: 0 },
            dialogue: {
                messages: [],
                index: 0,
                active: false,
                dismissing: false,
                hideTimeout: null,
                speaker: null,
                anchor: null,
                onClose: null
            }
        };
    }

    /**
     * Initialize all game systems
     */
    init() {
        // Test sprite loading first
        this.testSpriteLoading();
        
        // Initialize audio
        this.audioManager.initializeGameSounds();
        
        // Set up event listeners
        this.setupEventListeners();
        this.setupSpeechBubbleUI();
        this.signUI.setupSignDialogueUI();
        this.setupInventoryUI();
        this.badgeUI = new BadgeUI(this);
        this.setupChestUI();
        this.setupShopUI();
        this.audioController.applyConfigDefaults();
        // Sync audio UI with config defaults on load
        this.audioController.updateUI();
        
        // Create initial level
        // Register bundled levels
        if (typeof window !== 'undefined' && window.levelRegistry && window.LevelDefinitions) {
            Object.entries(window.LevelDefinitions).forEach(([id, def]) => {
                window.levelRegistry.register(id, def);
            });
        }
        const targetLevel = this.progress?.consumePendingLevelId?.('testRoom') || 'testRoom';
        this.createLevel(targetLevel);

        // Register scenes
        if (this.sceneManager) {
            this.sceneManager.register('menu', new MenuScene());
            this.sceneManager.register('play', new PlayScene());
            this.sceneManager.register('pause', new PauseScene());
            this.sceneManager.change('menu');
        } else {
            this.stateManager.showMenu('startMenu');
        }
        
        // Show start menu
        this.stateManager.showMenu('startMenu');
        
        // Attempt to play title music (may be blocked by autoplay policy)
        this.playTitleMusic();
        
        // Game initialized

        // Capture pristine defaults for reliable resets
        this.saveInitialStateTemplate();
    }
    

    
    /**
     * Attempt to play title music, handling autoplay policy
     */
    playTitleMusic() {
        if (this.audioManager && this.audioManager.music['title']) {
            const targetVolume = 0.8; // match main level loudness

            // If already playing, just ensure volume is correct and return
            if (this.audioManager.isMusicPlaying('title')) {
                const music = this.audioManager.music['title'];
                music.volume = this.audioManager.masterVolume * this.audioManager.musicVolume * targetVolume;
                return;
            }

            this.audioManager.playMusic('title', targetVolume).catch(() => {
                // Title music blocked by autoplay policy. Will start on first user interaction.
                const startMusicOnInteraction = () => {
                    if (this.stateManager.isInMenu() && !this.audioManager.isMuted()) {
                        this.audioManager.playMusic('title', targetVolume).catch(() => {});
                    }
                    document.removeEventListener('click', startMusicOnInteraction);
                    document.removeEventListener('keydown', startMusicOnInteraction);
                    document.removeEventListener('pointerdown', startMusicOnInteraction);
                    document.removeEventListener('touchstart', startMusicOnInteraction);
                };
                
                document.addEventListener('click', startMusicOnInteraction, { once: true });
                document.addEventListener('keydown', startMusicOnInteraction, { once: true });
                document.addEventListener('pointerdown', startMusicOnInteraction, { once: true });
                document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
            });
        }
    }
    
    /**
     * Ensure title music is playing (used for menu interactions)
     */
    ensureTitleMusicPlaying() {
        if (this.stateManager.isInMenu() && this.audioManager && !this.audioManager.muted) {
            // Check if title music is currently playing
            const titleMusic = this.audioManager.music['title'];
            if (titleMusic && titleMusic.paused && titleMusic.readyState >= 2) {
                // Only try to play if the music is paused and ready
                this.audioManager.playMusic('title', 0.8).catch(() => {
                    // Audio play failed - silently ignore
                });
            }
        }
    }
    
    /**
     * Test sprite loading to verify paths work
     */
    testSpriteLoading() {
        // Testing sprite loading
        
        const testSprite = new Image();
        testSprite.onload = () => {
            // Test sprite loaded successfully
        };
        testSprite.onerror = () => {
            // Test sprite failed to load
        };
        testSprite.src = 'art/sprites/custom-green-slime.png';
    }

    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        this.uiManager?.setupMenuAndControls();
    }

    /**
     * Apply config defaults to audio input elements before wiring events
     */
    primeAudioUIFromConfig() {
        const a = this.config?.audio || {};
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        if (masterVolumeSlider && typeof a.master === 'number') {
            masterVolumeSlider.value = Math.round(a.master * 100);
        }
        if (musicVolumeSlider && typeof a.music === 'number') {
            musicVolumeSlider.value = Math.round(a.music * 100);
        }
        if (sfxVolumeSlider && typeof a.sfx === 'number') {
            sfxVolumeSlider.value = Math.round(a.sfx * 100);
        }
    }

    /**
     * Prepare DOM references for the speech bubble overlay
     */
    setupSpeechBubbleUI() {
        this.speechBubbleUI.init();
        this.hideSpeechBubble(true);
    }


    /**
     * Prepare the inventory overlay UI state
     */
    setupInventoryUI() {
        if (this.uiManager?.setupInventoryUI) {
            this.uiManager.setupInventoryUI();
        }
    }

    /**
     * Switch inventory tabs
     * @param {string} tabName
     * @param {boolean} silent - avoid sounds when true
     */
    switchInventoryTab(tabName = 'stats', silent = false) {
        return this.uiManager?.switchInventoryTab(tabName, silent);
    }

    /**
     * Populate the inventory overlay with live player stats/items
     */
    updateInventoryOverlay() {
        return this.uiManager?.updateInventoryOverlay();
    }

    /**
     * Keyboard navigation for inventory items (W/S or ArrowUp/ArrowDown)
     */
    handleInventoryListNavigation(e) {
        return this.uiManager?.handleInventoryListNavigation(e);
    }

    /**
     * Show modal for an inventory item
     * @param {Object} item
     */
    showInventoryItemModal(item) {
        return this.uiManager?.showInventoryItemModal(item);
    }

    /**
     * Show modal for equipping a throwable/ammo
     * @param {Object} item
     */
    showThrowableModal(item) {
        return this.uiManager?.showThrowableModal(item);
    }

    /**
     * Hide inventory item modal
     */
    hideInventoryItemModal() {
        return this.uiManager?.hideInventoryItemModal();
    }

    /**
     * Consume an inventory item and apply its effect
     * @param {Object} item
     * @returns {boolean}
     */
    consumeInventoryItem(item) {
        return this.uiManager?.consumeInventoryItem(item);
    }

    /**
     * Prepare the chest overlay UI
     */
    setupChestUI() {
        return this.uiManager?.setupChestUI();
    }

    /**
     * Prepare shop UI state
     */
    setupShopUI() {
        return this.uiManager?.setupShopUI();
    }

    /**
     * Show the inventory overlay
     */
    showInventoryOverlay() {
        return this.uiManager?.showInventoryOverlay();
    }

    /**
     * Hide the inventory overlay
     * @param {boolean} immediate - Included for API symmetry; no animation currently
     */
    hideInventoryOverlay(immediate = false) {
        return this.uiManager?.hideInventoryOverlay(immediate);
    }

    /**
     * Show the chest overlay
     */
    showChestOverlay(chest) {
        return this.uiManager?.showChestOverlay(chest);
    }

    /**
     * Hide the chest overlay
     */
    hideChestOverlay(immediate = false) {
        return this.uiManager?.hideChestOverlay(immediate);
    }

    /**
     * Populate the chest overlay with loot buttons
     * @param {Chest} chest
     */
    populateChestOverlay(chest) {
        return this.uiManager?.populateChestOverlay(chest);
    }

    /**
     * Show the shop overlay
     */
    showShopOverlay() {
        return this.uiManager?.showShopOverlay();
    }

    /**
     * Hide the shop overlay
     * @param {boolean} immediate - provided for API symmetry
     */
    hideShopOverlay(immediate = false) {
        return this.uiManager?.hideShopOverlay(immediate);
    }

    /**
     * Render shop items and currency
     */
    updateShopDisplay() {
        return this.uiManager?.updateShopDisplay();
    }

    /**
     * Attempt to purchase a shop item
     * @param {Object} item
     */
    purchaseShopItem(item) {
        return this.uiManager?.purchaseShopItem(item);
    }

    /**
     * Keyboard navigation for shop items (W/S or ArrowUp/ArrowDown)
     */
    handleShopListNavigation(e) {
        return this.uiManager?.handleShopListNavigation(e);
    }

    /**
     * Toggle inventory overlay with the I key
     */
    toggleInventoryOverlay() {
        // Only allow while playing or paused so it doesn't overlap start/game over menus
        if (!this.stateManager) return;
        if (!this.stateManager.isPlaying() && !this.stateManager.isPaused()) return;

        return this.uiManager?.toggleInventoryOverlay();
    }

    /**
     * Begin the intro dialogue for the test room
     */
    startTestIntroDialogueIfNeeded() {
        if (!this.testMode) {
            this.hideSpeechBubble(true);
            return;
        }

        this.dialogueManager.startById('test_room_intro', null, null);
    }

    /**
     * Advance or dismiss dialogue when Enter is pressed
     */
    handleSpeechBubbleInput() {
        return this.uiManager?.handleSpeechBubbleInput();
    }

    /**
     * Handle player interaction input (E/Enter) for chests
     */
    handleChestInput() {
        return this.uiManager?.handleChestInput();
    }

    /**
     * Handle player interaction input (Z key)
     * Delegates to player if an interaction handler exists
     */
    handleInteractionInput() {
        return this.uiManager?.handleInteractionInput();
    }

    /**
     * Find the shop ghost if player is in range
     * @returns {ShopGhost|null}
     */
    getNearbyShopGhost() {
        return this.uiManager?.getNearbyShopGhost();
    }

    /**
     * Locate a talkable NPC in range (Enter key interactions)
     * @returns {Entity|null}
     */
    getNearbyTalkableNpc() {
        return this.uiManager?.getNearbyTalkableNpc();
    }

    /**
     * Find a chest if the player is close enough
     * @returns {Chest|null}
     */
    getNearbyChest() {
        return this.uiManager?.getNearbyChest();
    }

    /**
     * Resolve audio service with legacy fallback.
     */
    getAudio() {
        return this.services?.audio || this.audioManager || null;
    }

    /**
     * Convenience: reset audio/UI/world using ResetService.
     */
    resetAll(options = {}) {
        return this.services?.reset?.resetAll(options);
    }

    /**
     * Audio helpers for menus and UI
     */
    playMenuEnterSound() {
        this.audioController?.playMenuEnter();
    }

    playMenuExitSound() {
        this.audioController?.playMenuExit();
    }

    playButtonSound() {
        this.audioController?.playButton();
    }

    playPurchaseSound() {
        this.audioController?.playPurchase();
    }

    /**
     * Start a dialogue with an NPC using the global speech bubble
     * @param {Entity} npc
     */
    startNpcDialogue(npc) {
        return this.uiManager?.startNpcDialogue(npc);
    }

    /**
     * Show the speech bubble with provided text
     * @param {string} text - Dialogue text to display
     */
    showSpeechBubble(text) {
        return this.uiManager?.showSpeechBubble(text);
    }

    /**
     * Move to the next line or hide the bubble
     */
    advanceSpeechBubble() {
        return this.uiManager?.advanceSpeechBubble();
    }

    /**
     * Hide the speech bubble, optionally immediately
     * @param {boolean} immediate - Skip fade when true
     */
    hideSpeechBubble(immediate = false) {
        return this.uiManager?.hideSpeechBubble(immediate);
    }

    /**
     * Keep the bubble anchored to the active speaker (player or NPC)
     */
    updateSpeechBubblePosition() {
        return this.uiManager?.updateDialoguePosition();
    }

    /**
     * Update shop ghost hint bubble position and visibility
     */
    updateShopGhostBubble() {
        return this.uiManager?.updateShopGhostBubble();
    }

    /**
     * Update chests (UI + animation hooks)
     * @param {number} deltaTime
     */
    updateChests(deltaTime) {
        return this.uiManager?.updateChests(deltaTime);
    }

    /**
     * Lightweight styling parser for speech text.
     * Markers:
     *  *bold*
     *  _italic_
     *  %shake%
     *  ~rainbow~
     *  ^glow^
     *  !bounce!
     *  #wave#
     *  `mono`
     */
    formatSpeechText(text) {
        return this.uiManager?.formatSpeechText(text) ?? '';
    }

    /**
     * Split text into letter spans with staggered wave animation
     * @param {string} inner
     * @returns {string}
     */
    wrapWaveText(inner) {
        return this.uiManager?.wrapWaveText(inner) ?? inner;
    }

    /**
     * Create the game level with platforms, enemies, and items
     */
    createLevel(levelId = null) {
        const target = levelId || this.progress?.consumePendingLevelId?.(this.currentLevelId || 'testRoom') || this.currentLevelId || 'testRoom';
        return this.worldBuilder?.createLevel(target);
    }

    /**
     * Record the pristine test room layout so resets can rebuild it exactly
     */
    captureInitialTestRoomState() {
        return this.worldBuilder?.captureInitialTestRoomState();
    }

    /**
     * Rebuild the test room exactly as it first loaded
     */
    restoreInitialTestRoomState() {
        return this.worldBuilder?.restoreInitialTestRoomState();
    }

    /**
     * Create ground platforms
     */
    createGroundPlatforms() {
        return this.worldBuilder?.createGroundPlatforms();
    }

    /**
     * Create floating platforms
     */
    createFloatingPlatforms() {
        return this.worldBuilder?.createFloatingPlatforms();
    }

    /**
     * Spawn enemies throughout the level
     */
    spawnEnemies() {
        return this.worldBuilder?.spawnEnemies();
    }

    /**
     * Spawn items throughout the level
     */
    spawnItems() {
        return this.worldBuilder?.spawnItems();
    }

    /**
     * Create the level completion flag
     */
    createFlag() {
        return this.worldBuilder?.createFlag();
    }

    /**
     * Create background layers with parallax scrolling
     */
    createBackground() {
        return this.worldBuilder?.buildBackground(this.currentTheme || this.config?.theme || 'beach');
    }
    
    /**
     * Create a fallback gradient background if procedural generation fails
     */
    createFallbackBackground() {
        // Creating fallback gradient background
        
        // Create a simple sunset gradient as fallback
        const render = this.getRenderService();
        const canvas = document.createElement('canvas');
        canvas.width = render.width();
        canvas.height = render.height();
        const ctx = canvas.getContext('2d');
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#FFB347');    // Light orange at top
        gradient.addColorStop(0.3, '#FF7F50');  // Coral
        gradient.addColorStop(0.6, '#FF6B6B');  // Light pink
        gradient.addColorStop(0.8, '#DDA0DD');  // Plum
        gradient.addColorStop(1, '#9370DB');    // Medium purple
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create a simple background object
        this.backgroundLayers.push({
            canvas: canvas,
            speed: 0.1,
            x: 0,
            y: 0,
            update: function(cameraX, deltaTime) {
                this.x = -cameraX * this.speed;
            },
            render: function(ctx, camera) {
                const offsetX = this.x % canvas.width;
                const tilesNeeded = Math.ceil(ctx.canvas.width / canvas.width) + 2;
                
                for (let i = -1; i < tilesNeeded; i++) {
                    const drawX = offsetX + i * canvas.width;
                    ctx.drawImage(canvas, drawX, this.y - camera.y);
                }
            }
        });
        
        // Fallback background created
    }
    


    /**
     * Start the game (delegated to state manager)
     */
    startGame() {
        this.stateManager.startGame();
    }

    /**
     * Save current run to a slot.
     * @param {string} slotId
     * @param {string} name
     */
    saveProgress(slotId = 'slot1', name = 'Auto Save') {
        return this.progress?.save(slotId, name);
    }

    /**
     * Load a saved slot and begin the game from that snapshot.
     * @param {string} slotId
     */
    loadProgress(slotId) {
        return this.progress?.load(slotId);
    }

    /**
     * Build a snapshot of the current run suitable for saving.
     * @param {string} name
     */
    buildSaveSnapshot(name = 'Auto Save') {
        return this.progress?.buildSnapshot(name);
    }

    /**
     * Apply a saved snapshot to the current world/player.
     * Requires that the level/player are already built.
     * @param {Object} snap
     */
    applySaveSnapshot(snap) {
        return this.progress?.applySnapshot(snap);
    }
    
    /**
     * Initialize game systems (called by state manager)
     */
    initializeGameSystems() {
        // Clear any lingering input states
        if (this.input) {
            this.input.mouse.clicked = false;
            this.input.mouse.pressed = false;
        }

        // Hide overlays on fresh start
        this.hideInventoryOverlay(true);
        this.hideChestOverlay(true);
        this.hideShopOverlay(true);
        
        // Create player
        this.player = new Player(this.level.spawnX, this.level.spawnY);
        this.player.game = this;
        // Ensure fresh player state (buffs/items/health/UI)
        if (typeof this.player.reset === 'function') {
            this.player.reset();
        }
        // Player uses default gravity from Entity class
        if (typeof this.player.updateHealthUI === 'function') {
            this.player.updateHealthUI();
        }
        if (this.badgeUI) {
            this.badgeUI.reapplyAllModifiers(this.player);
        }

        // Apply pending save snapshot after player/world exists
        this.progress?.applyPendingSnapshot();

        this.updateInventoryOverlay();
        
        // Reset game stats
        this.stats = {
            enemiesDefeated: 0,
            coinsCollected: 0,
            distanceTraveled: 0,
            timeElapsed: 0
        };

        this.startTestIntroDialogueIfNeeded();
    }

    /**
     * Start/stop loop control (delegates to GameLoop)
     */
    startLoop() {
        if (!this.loop) {
            this.loop = new GameLoop({
                timeScale: this.timeScale,
                onUpdate: this.onTick.bind(this)
            });
        }
        this.loop.setTimeScale(this.timeScale);
        this.loop.start();
    }

    stopLoop() {
        if (this.loop) {
            this.loop.stop();
        }
    }

    /**
     * Frame callback invoked by GameLoop
     */
    onTick(deltaTime = 0, info = {}) {
        if (!this.running) {
            this.stopLoop();
            return;
        }

        this.deltaTime = deltaTime;
        this.gameTime = info.gameTime ?? (this.gameTime + deltaTime);
        this.frameCount = info.frame ?? (this.frameCount + 1);
        
        if (this.stateManager.isPlaying()) {
            this.update(this.deltaTime);
            this.render();
        }
    }

    /**
     * Legacy alias to keep older call sites working
     */
    gameLoop() {
        this.startLoop();
    }

    /**
     * Update game logic
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        this.systems?.update(deltaTime);
    }

    /**
     * Update camera to follow player
     */
    updateCamera() {
        return this.systems?.updateCamera();
    }

    /**
     * Check collisions between player and environment
     */
    checkPlayerCollisions() {
        this.collisionSystem?.checkPlayerCollisions();
    }

    /**
     * Handle bookkeeping when an enemy is removed from play
     * @param {Enemy} enemy
     */
    handleEnemyRemoved(enemy) {
        return this.systems?.handleEnemyRemoved(enemy);
    }

    /**
     * Update game statistics
     * @param {number} deltaTime - Time since last frame
     */
    updateGameStats(deltaTime) {
        return this.systems?.updateGameStats(deltaTime);
    }

    /**
     * Check for game over conditions
     */
    checkGameOver() {
        return this.systems?.checkGameOver();
    }

    /**
     * Provide a normalized render service wrapper.
     */
    getRenderService() {
        const render = this.services?.render;
        if (render) {
            return {
                ...render,
                ctx: render.ctx || this.ctx,
                canvas: render.canvas || this.canvas,
                clear: render.clear ? render.clear.bind(render) : () => {
                    const ctx = render.ctx || this.ctx;
                    const canvas = render.canvas || this.canvas;
                    if (ctx && canvas) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                },
                width: render.width ? render.width.bind(render) : () => (render.canvas?.width ?? this.canvas?.width ?? 0),
                height: render.height ? render.height.bind(render) : () => (render.canvas?.height ?? this.canvas?.height ?? 0)
            };
        }
        return {
            ctx: this.ctx,
            canvas: this.canvas,
            clear: () => {
                if (this.ctx && this.canvas) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
            },
            width: () => this.canvas?.width ?? 0,
            height: () => this.canvas?.height ?? 0
        };
    }

    /**
     * Render the game
     */
    render() {
        if (!this.renderer || typeof this.renderer.renderFrame !== 'function') {
            console.error('Renderer instance is missing or invalid.');
            throw new Error('Renderer instance is missing or invalid.');
        }
        this.renderer.renderFrame();
    }

    /**
     * Render debug hitboxes for all entities
     */
    renderDebugOverlay() {
        const render = this.getRenderService();
        return this.renderer?.renderDebugOverlay(render.ctx);
    }

    /**
     * Render layered parallax background
     */
    renderBackground(ctx = null, canvas = null) {
        return this.renderer?.renderBackground(ctx, canvas);
    }
    
    /**
     * Render platforms with stylized graphics
     */
    renderPlatforms(ctx = null) {
        return this.renderer?.renderPlatforms(ctx);
    }

    /**
     * Render NPCs (currently only the shop ghost)
     */
    renderNPCs(ctx = null) {
        return this.renderer?.renderNPCs(ctx);
    }

    /**
     * Render all placed chests
     */
    renderChests(ctx = null) {
        return this.renderer?.renderChests(ctx);
    }

    renderSigns(ctx = null) {
        return this.renderer?.renderSigns(ctx);
    }
    
    /**
     * Reset game entities and state (used by GameStateManager)
     */
    resetGame() {
        // Ensure we have a baseline snapshot to restore from
        if (!this.initialStateTemplate) {
            this.saveInitialStateTemplate();
        }

        // Restore primitive state from the initial template
        if (this.initialStateTemplate) {
            this.timeScale = this.initialStateTemplate.timeScale;
            this.testMode = this.initialStateTemplate.testMode;
            this.level = { ...this.initialStateTemplate.level };
            this.stats = { ...this.initialStateTemplate.stats };
            if (this.camera?.reset) {
                this.camera.reset(this.initialStateTemplate.camera);
            } else {
                this.camera = { ...this.initialStateTemplate.camera };
            }
            this.dialogueManager.reset();
            this.gameTime = 0;
            this.frameCount = 0;
            this.deltaTime = 0;
            if (this.loop) {
                this.loop.setTimeScale(this.timeScale);
            }
        }

        // Clear transient state before rebuilding
        this.player = null;
        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.platforms = [];
        this.hazards = [];
        this.smallPalms = [];
        if (this.camera?.reset) {
            this.camera.reset({ x: 0, y: 0 });
        } else {
            this.camera = { x: 0, y: 0 };
        }
        this.backgroundLayers = [];
        this.testRoomMaxX = 0;
        this.hideSpeechBubble(true);
        this.hideInventoryOverlay(true);
        this.hideChestOverlay(true);
        this.hideShopOverlay(true);
        this.signUI.reset();
        const buffPanel = document.getElementById('buffPanel');
        const coffeeTimer = document.getElementById('coffeeTimer');
        if (buffPanel) buffPanel.classList.add('hidden');
        if (coffeeTimer) coffeeTimer.textContent = '--:--';
        this.dialogueManager.reset();
        this.testGroundY = null;
        this.signBoard = null;
        this.signBoards = [];
        if (this.badgeUI?.reset) {
            this.badgeUI.reset(true);
        }
        
        this.npcs = [];
        this.shopGhost = null;
        this.balloonFan = null;
        if (Array.isArray(this.chests)) {
            this.chests.forEach(chest => chest.destroy && chest.destroy());
        }
        this.chests = [];
        this.smallPalms = [];
        this.chestUI.currentChest = null;
        this.flag = null;

        // Reset managers
        this.palmTreeManager.reset();
        
        // Rebuild level content (platforms, enemies, items, flag, background)
        const targetLevel = this.pendingLevelId || this.currentLevelId || 'testRoom';
        const shouldUseTestSnapshot = targetLevel === 'testRoom' && this.initialTestRoomState;
        if (shouldUseTestSnapshot) {
            this.restoreInitialTestRoomState();
        } else {
            this.createLevel(targetLevel);
        }
    }

    /**
     * Toggle mute state
     */
    toggleMute() {
        this.audioController?.toggleMute();
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-100)
     */
    setMasterVolume(volume) {
        this.audioController?.setMasterVolume(volume);
    }

    /**
     * Set music volume
     * @param {number} volume - Volume level (0-100)
     */
    setMusicVolume(volume) {
        this.audioController?.setMusicVolume(volume);
    }

    /**
     * Set SFX volume
     * @param {number} volume - Volume level (0-100)
     */
    setSfxVolume(volume) {
        this.audioController?.setSfxVolume(volume);
    }

    /**
     * Load gravity value from cookie
     */
    /**
     * Show gravity value on screen temporarily
     */
    /**
     * Update audio control UI elements
     */
    updateAudioUI() {
        this.audioController?.updateUI();
    }
    
    /**
     * Create a simple test room for debugging
     */
    createTestRoom() {
        return this.worldBuilder?.createTestRoom();
    }
    
    /**
     * Toggle between test mode and normal game mode
     */
    toggleTestMode() {
        this.testMode = !this.testMode;
        // Test mode toggled
        
        // Restart the level with new mode
        if (this.state === 'playing') {
            this.stateManager.startGame();
        }
    }
    
    /**
     * Render test room background with grid
     */
    renderTestBackground(ctx = null, canvas = null) {
        return this.renderer?.renderTestBackground(ctx, canvas);
    }
}
