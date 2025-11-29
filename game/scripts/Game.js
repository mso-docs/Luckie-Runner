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
        this.primeAudioUIFromConfig();
        // Sync audio UI with config defaults on load
        this.updateAudioUI();
        
        // Create initial level
        // Register bundled levels
        if (typeof window !== 'undefined' && window.levelRegistry && window.LevelDefinitions) {
            Object.entries(window.LevelDefinitions).forEach(([id, def]) => {
                window.levelRegistry.register(id, def);
            });
        }
        this.createLevel('testRoom');

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
        if (!this.dialogueManager?.isActive()) return;

        if (this.input.consumeKeyPress('enter') || this.input.consumeKeyPress('numpadenter')) {
            this.dialogueManager.advance();
        }
    }

    /**
     * Handle player interaction input (E/Enter) for chests
     */
    handleChestInput() {
        if (!this.player || !this.input) return;

        if (this.input.consumeInteractPress()) {
            if (this.chestUI.isOpen) {
                this.hideChestOverlay();
                return;
            }

            const talker = this.getNearbyTalkableNpc();
            if (talker) {
                this.startNpcDialogue(talker);
                return;
            }

            // Sign interaction takes priority over chests
            const nearbySign = this.signUI.findNearbySign();
            if (nearbySign) {
                this.signUI.signDialogue.target = nearbySign;
                if (this.signUI.signDialogue.active) {
                    this.signUI.advanceSignDialogue();
                } else {
                    this.signUI.showSignDialogue(nearbySign);
                }
                return;
            }

            const chest = this.getNearbyChest();
            if (chest) {
                chest.open();
                this.showChestOverlay(chest);
            }
        }
    }

    /**
     * Handle player interaction input (Z key)
     * Delegates to player if an interaction handler exists
     */
    handleInteractionInput() {
        if (!this.player || !this.input) return;

        if (this.input.consumeActionPress()) {
            // Close shop if open
            if (this.shopUI.isOpen) {
                this.hideShopOverlay();
                if (this.shopGhost) this.shopGhost.toggleFrame();
                return;
            }

            // Open shop if near the ghost
            const ghost = this.getNearbyShopGhost();
            if (ghost) {
                ghost.toggleFrame();
                this.showShopOverlay();
                return;
            }

            // Fallback to player interaction
            if (typeof this.player.handleInteraction === 'function') {
                this.player.handleInteraction();
            }
        }
    }

    /**
     * Find the shop ghost if player is in range
     * @returns {ShopGhost|null}
     */
    getNearbyShopGhost() {
        if (this.shopGhost && this.player && this.shopGhost.isPlayerNearby(this.player)) {
            return this.shopGhost;
        }
        return null;
    }

    /**
     * Locate a talkable NPC in range (Enter key interactions)
     * @returns {Entity|null}
     */
    getNearbyTalkableNpc() {
        if (!this.player || !Array.isArray(this.npcs)) return null;
        return this.npcs.find(npc =>
            npc &&
            npc.canTalk &&
            typeof npc.isPlayerNearby === 'function' &&
            npc.isPlayerNearby(this.player, npc.interactRadius || 120)
        ) || null;
    }

    /**
     * Find a chest if the player is close enough
     * @returns {Chest|null}
     */
    getNearbyChest() {
        if (!this.player || !this.chests) return null;
        return this.chests.find(chest => chest.isPlayerNearby(this.player)) || null;
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
        const audio = this.getAudio();
        if (audio) audio.playSound?.('menu_enter', 1);
    }

    playMenuExitSound() {
        const audio = this.getAudio();
        if (audio) audio.playSound?.('menu_exit', 1);
    }

    playButtonSound() {
        const audio = this.getAudio();
        if (audio) audio.playSound?.('button', 1);
    }

    playPurchaseSound() {
        const audio = this.getAudio();
        if (audio) audio.playSound?.('purchase', 1);
    }

    /**
     * Start a dialogue with an NPC using the global speech bubble
     * @param {Entity} npc
     */
    startNpcDialogue(npc) {
        if (!npc || !npc.canTalk || !Array.isArray(npc.dialogueLines) || npc.dialogueLines.length === 0) return;
        if (typeof npc.setTalking === 'function') {
            npc.setTalking(true);
        }
        this.dialogueManager.startDialog(npc.dialogueLines, npc, () => {
            if (typeof npc.onDialogueClosed === 'function') {
                npc.onDialogueClosed();
            }
        });
    }

    /**
     * Show the speech bubble with provided text
     * @param {string} text - Dialogue text to display
     */
    showSpeechBubble(text) {
        this.dialogueManager.startDialog([text], this.dialogueManager.state.anchor || this.player);
    }

    /**
     * Move to the next line or hide the bubble
     */
    advanceSpeechBubble() {
        this.dialogueManager?.advance();
    }

    /**
     * Hide the speech bubble, optionally immediately
     * @param {boolean} immediate - Skip fade when true
     */
    hideSpeechBubble(immediate = false) {
        this.dialogueManager?.close();
    }

    /**
     * Keep the bubble anchored to the active speaker (player or NPC)
     */
    updateSpeechBubblePosition() {
        this.dialogueManager?.updatePosition();
    }

    /**
     * Update shop ghost hint bubble position and visibility
     */
    updateShopGhostBubble() {
        const bubble = this.shopGhostBubble;
        const ghost = this.shopGhost;

        if (!bubble || !ghost || !this.player) {
            if (bubble) bubble.classList.add('hidden');
            return;
        }

        if (this.shopUI.isOpen || !ghost.isPlayerNearby(this.player)) {
            bubble.classList.add('hidden');
            bubble.setAttribute('aria-hidden', 'true');
            return;
        }

        const screenX = ghost.x - this.camera.x + ghost.width / 2;
        const screenY = ghost.y - this.camera.y + ghost.bobOffset;
        bubble.style.left = `${screenX}px`;
        const render = this.getRenderService();
        const bottomFromCanvas = render.height() - screenY + ghost.height + 6;
        bubble.style.bottom = `${bottomFromCanvas}px`;
        bubble.classList.remove('hidden');
        bubble.setAttribute('aria-hidden', 'false');
    }

    /**
     * Update chests (UI + animation hooks)
     * @param {number} deltaTime
     */
    updateChests(deltaTime) {
        if (!Array.isArray(this.chests)) return;
        this.chests.forEach(chest => {
            if (chest && chest.update) {
                chest.update(deltaTime);
            }
        });
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
        if (typeof text !== 'string') return '';

        // Escape HTML
        const escape = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        let safe = escape(text);

        const apply = (pattern, cls) => {
            safe = safe.replace(pattern, (_, inner) => `<span class="${cls}">${inner}</span>`);
        };

        // Size markers (escaped angle brackets)
        apply(/&lt;&lt;&lt;(.+?)&gt;&gt;&gt;/g, 'speech-gigantic');
        apply(/&lt;&lt;(.+?)&gt;&gt;/g, 'speech-bigger');
        apply(/&lt;(.+?)&gt;/g, 'speech-big');
        apply(/_(.+?)_/g, 'speech-tiny');

        apply(/\*(.+?)\*/g, 'speech-bold');
        apply(/%(.+?)%/g, 'speech-shake');
        apply(/~(.+?)~/g, 'speech-rainbow');
        apply(/\^(.+?)\^/g, 'speech-glow');
        apply(/!(.+?)!/g, 'speech-bounce');
        apply(/`(.+?)`/g, 'speech-mono');
        // Wave needs per-letter animation; replace with staggered spans
        safe = safe.replace(/#(.+?)#/g, (_, inner) => this.wrapWaveText(inner));

        return safe;
    }

    /**
     * Split text into letter spans with staggered wave animation
     * @param {string} inner
     * @returns {string}
     */
    wrapWaveText(inner) {
        const letters = Array.from(inner);
        return letters.map((ch, i) => {
            const delay = (i * 0.06).toFixed(2);
            return `<span class="speech-wave-letter" style="animation-delay:${delay}s">${ch}</span>`;
        }).join('');
    }

    /**
     * Create the game level with platforms, enemies, and items
     */
    createLevel() {
        return this.worldBuilder?.createLevel();
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
        this.backgroundLayers = [];
        
        // Creating Pacific coast background layers
        
        // Create Pacific coast layered background from back to front
        const render = this.getRenderService();
        const canvasWidth = render.width();
        const canvasHeight = render.height();
        
        try {
            // 1. Sunset sky (furthest back, slowest parallax)
            const sunsetSky = new ProceduralBackground(
                canvasWidth, 
                canvasHeight, 
                0.1, 
                0, 
                BackgroundGenerators.createSunsetSky
            );
            this.backgroundLayers.push(sunsetSky);
            // Sunset sky layer created
            
            // 2. Ocean layer (mid-background)
            const ocean = new ProceduralBackground(
                canvasWidth * 2, 
                canvasHeight * 0.4, 
                0.3, 
                canvasHeight * 0.6, 
                BackgroundGenerators.createOcean
            );
            this.backgroundLayers.push(ocean);
            
            // 3. Hills layer (mid-foreground)
            const hills = new ProceduralBackground(
                canvasWidth * 1.5, 
                canvasHeight * 0.5, 
                0.5, 
                canvasHeight * 0.5, 
                BackgroundGenerators.createHills
            );
            this.backgroundLayers.push(hills);
            // Hills layer created
            
            // Initialize SVG-based procedural palm tree system (separate from background layers)
            this.palmTreeManager.initialize();
            
            // All background layers created successfully
        } catch (error) {
            // Error creating background layers - using fallback
            
            // Fallback to simple gradient background
            this.createFallbackBackground();
        }
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
        // Update input
        if (this.services?.input?.update) {
            this.services.input.update();
        } else {
            this.input.update();
        }
        this.handleSpeechBubbleInput();
        this.handleChestInput();
        this.handleInteractionInput();

        // Pause world updates while overlays are open
        const overlayBlocking = (this.inventoryUI?.isOpen) || (this.shopUI?.isOpen);
        if (overlayBlocking) {
            return;
        }

        // Update NPCs
        this.npcs.forEach(npc => {
            if (npc.update) {
                npc.update(deltaTime);
            }
        });
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
            this.updateCamera();
            this.collisionSystem?.checkPlayerCollisions();
        }

        // Update small palms (foreground interactive)
        if (Array.isArray(this.smallPalms)) {
            this.smallPalms.forEach(palm => palm.update(deltaTime));
        }

        // Update chests (callouts + glow)
        this.updateChests(deltaTime);
        this.signUI.updateSignCallout();
        this.signUI.updateSignDialoguePosition();
        
        // Update all background layers
        this.backgroundLayers.forEach(layer => {
            if (layer instanceof Background || layer instanceof ProceduralBackground) {
                layer.update(this.camera.x, deltaTime);
            }
        });
        
        // Update procedural palm trees
        const render = this.getRenderService();
        this.palmTreeManager.update(this.camera.x, render.width());
        
        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.active) {
                enemy.update(deltaTime);
                this.collisionSystem?.updateEnemyPhysics(enemy);
                return true;
            } else {
                // Enemy defeated
                this.handleEnemyRemoved(enemy);
                return false;
            }
        });
        
        // Update items
        this.items = this.items.filter(item => {
            if (item.active) {
                item.update(deltaTime);
                this.collisionSystem?.updateItemPhysics(item, deltaTime);
                
                // Check player collection
                if (this.player && item.checkCollision(this.player)) {
                    if (item.collect(this.player)) {
                        this.stats.coinsCollected += item.type === 'coin' ? item.value : 0;
                    }
                }
                return true;
            }
            return false;
        });
        
        // Update projectiles
        this.projectiles = this.projectiles.filter(projectile => {
            if (projectile.active) {
                projectile.update(deltaTime);
                this.collisionSystem?.updateProjectilePhysics(projectile);
                return true;
            }
            return false;
        });
        
        // Update hazards
        this.hazards = this.hazards.filter(hazard => {
            if (hazard.active) {
                hazard.update(deltaTime);
                this.collisionSystem?.updateHazardCollisions();
                return true;
            }
            return false;
        });
        
        // Update flag
        if (this.flag) {
            this.flag.update(deltaTime);

            // Check flag collision with player (always enabled)
            if (this.player && this.flag.checkCollision(this.player)) {
                this.flag.collect(this.player);
            }
        }
        
        // Update statistics
        this.updateGameStats(deltaTime);
        this.updateInventoryOverlay();
        
        // Check game over conditions
        this.checkGameOver();
    }

    /**
     * Update camera to follow player
     */
    updateCamera() {
        if (!this.player || !this.camera) return;
        const render = this.getRenderService();
        
        this.camera.setViewport(render.width(), render.height());
        this.camera.setBounds(this.level?.width, this.level?.height);
        this.camera.followPlayer(this.player, { testMode: this.testMode });
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
        this.stats.enemiesDefeated++;
        if (this.badgeUI) {
            this.badgeUI.handleEnemyDefeated(enemy);
        }
    }

    /**
     * Update game statistics
     * @param {number} deltaTime - Time since last frame
     */
    updateGameStats(deltaTime) {
        this.stats.timeElapsed += deltaTime;
        
        if (this.player) {
            const distanceThisFrame = Math.abs(this.player.velocity.x) * (deltaTime / 1000);
            this.stats.distanceTraveled += distanceThisFrame;
        }
    }

    /**
     * Check for game over conditions
     */
    checkGameOver() {
        if (this.player && this.player.health <= 0) {
            this.stateManager.gameOver();
        }
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
        const render = this.getRenderService();
        const ctx = render.ctx;
        const canvas = render.canvas;
        if (!ctx || !canvas) return;

        // Clear canvas
        if (render.clear) {
            render.clear();
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Render background layers (parallax)
        this.renderBackground(ctx, canvas);
        
        // Render canvas-based palm trees just behind platforms
        this.palmTreeManager.render(ctx, this.camera, this.gameTime);
        
        // Render platforms
        this.renderPlatforms(ctx);

        // Render signs
        this.renderSigns(ctx);

        // Render NPCs
        this.renderNPCs(ctx);

        // Render chests
        this.renderChests(ctx);

        // Render foreground small palms alongside other entities
        if (Array.isArray(this.smallPalms)) {
            this.smallPalms.forEach(palm => palm.render(ctx, this.camera));
        }

        // Render hazards
        this.hazards.forEach(hazard => {
            hazard.render(ctx, this.camera);
        });

        // Render items
        this.items.forEach(item => {
            item.render(ctx, this.camera);
        });
        
        // Render enemies
        this.enemies.forEach(enemy => {
            enemy.render(ctx, this.camera);
        });
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(ctx, this.camera);
        });
        
        // Render player
        if (this.player) {
            this.player.render(ctx, this.camera);
        }

        // Render flag
        if (this.flag) {
            this.flag.render(ctx, this.camera);
        }

        // Keep speech bubble following player
        if (this.dialogueManager?.isActive()) {
            this.updateSpeechBubblePosition();
        }

        // Update NPC hint bubble position
        this.updateShopGhostBubble();

        // Debug overlay
        if (this.debug) {
            this.renderDebugOverlay();
        }
    }

    /**
     * Render debug hitboxes for all entities
     */
    renderDebugOverlay() {
        const render = this.getRenderService();
        const ctx = render.ctx;
        if (!ctx) return;
        const cam = this.camera || { x: 0, y: 0 };
        const drawRect = (x, y, w, h, color = 'rgba(0,255,0,0.35)', stroke = '#00ff00') => {
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1;
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        };

        const rectForEntity = (e) => ({
            x: (e.x + (e.collisionOffset?.x || 0)) - cam.x,
            y: (e.y + (e.collisionOffset?.y || 0)) - cam.y,
            w: e.collisionWidth || e.width || 0,
            h: e.collisionHeight || e.height || 0
        });

        // Player
        if (this.player) {
            const r = rectForEntity(this.player);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,255,0,0.25)', '#00ff00');
        }

        // Enemies
        this.enemies.forEach(enemy => {
            if (!enemy) return;
            const r = rectForEntity(enemy);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,0,0,0.25)', '#ff0000');
        });

        // Items
        this.items.forEach(item => {
            if (!item) return;
            const r = rectForEntity(item);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,215,0,0.25)', '#ffd700');
        });

        // Projectiles
        this.projectiles.forEach(p => {
            if (!p) return;
            const r = rectForEntity(p);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,255,255,0.25)', '#00ffff');
        });

        // Hazards
        this.hazards.forEach(h => {
            if (!h) return;
            const r = rectForEntity(h);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,0,255,0.25)', '#ff00ff');
        });

        // Chests
        this.chests.forEach(ch => {
            if (!ch) return;
            const r = rectForEntity(ch);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,0,255,0.25)', '#0000ff');
        });

        // Small palms
        if (Array.isArray(this.smallPalms)) {
            this.smallPalms.forEach(palm => {
                if (!palm) return;
                const r = rectForEntity(palm);
                drawRect(r.x, r.y, r.w, r.h, 'rgba(0,128,0,0.25)', '#008000');
            });
        }

        // Platforms (not entities)
        this.platforms.forEach(p => {
            if (!p) return;
            const x = p.x - cam.x;
            const y = p.y - cam.y;
            drawRect(x, y, p.width, p.height, 'rgba(128,128,128,0.2)', '#808080');
        });

        // Signs
        if (Array.isArray(this.signBoards)) {
            this.signBoards.forEach(sign => {
                if (!sign) return;
                const r = rectForEntity(sign);
                drawRect(r.x, r.y, r.w, r.h, 'rgba(255,165,0,0.25)', '#ffa500');
            });
        }
    }

    /**
     * Render layered parallax background
     */
    renderBackground(ctx = null, canvas = null) {
        const render = this.getRenderService();
        const context = ctx || render.ctx;
        const targetCanvas = canvas || render.canvas;
        if (!context || !targetCanvas) return;

        if (this.testMode) {
            // Render test room background
            this.renderTestBackground(context, targetCanvas);
        } else {
            // Render all background layers from back to front
            this.backgroundLayers.forEach(layer => {
                if (layer instanceof Background || layer instanceof ProceduralBackground) {
                    layer.render(context, this.camera);
                }
            });
        }
    }
    
    /**
     * Render platforms with stylized graphics
     */
    renderPlatforms(ctx = null) {
        const render = this.getRenderService();
        const context = ctx || render.ctx;
        if (!context) return;
        this.platforms.forEach(platform => {
            StylizedPlatform.renderPlatform(context, platform, this.camera);
        });
    }

    /**
     * Render NPCs (currently only the shop ghost)
     */
    renderNPCs(ctx = null) {
        const render = this.getRenderService();
        const context = ctx || render.ctx;
        if (!context) return;
        this.npcs.forEach(npc => {
            if (npc.render) {
                npc.render(context, this.camera);
            }
        });
    }

    /**
     * Render all placed chests
     */
    renderChests(ctx = null) {
        const render = this.getRenderService();
        const context = ctx || render.ctx;
        if (!context) return;
        this.chests.forEach(chest => {
            if (chest && chest.render) {
                chest.render(context, this.camera);
            }
        });
    }

    renderSigns(ctx = null) {
        const render = this.getRenderService();
        const context = ctx || render.ctx;
        if (!context) return;
        if (!Array.isArray(this.signBoards)) return;
        this.signBoards.forEach(sign => {
            if (sign && typeof sign.render === 'function') {
                sign.render(context, this.camera);
            }
        });
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
        if (this.initialTestRoomState) {
            this.restoreInitialTestRoomState();
        } else {
            this.createLevel();
        }
    }

    /**
     * Toggle mute state
     */
    toggleMute() {
        const audio = this.services?.audio || null;
        if (audio && audio.toggleMute) {
            const wasMuted = audio.isMuted();
            audio.toggleMute();
            if (wasMuted && !audio.isMuted()) {
                if (this.stateManager.isPlaying()) {
                    audio.playMusic('level1', 0.8);
                } else if (this.stateManager.isInMenu() || this.stateManager.isState('gameOver')) {
                    audio.playMusic('title', 0.8);
                }
            }
            this.updateAudioUI();
            return;
        }

        if (this.audioManager) {
            const wasMuted = this.audioManager.isMuted();
            this.audioManager.toggleMute();
            if (wasMuted && !this.audioManager.isMuted()) {
                if (this.stateManager.isPlaying()) {
                    this.audioManager.playMusic('level1', 0.8);
                } else if (this.stateManager.isInMenu() || this.stateManager.isState('gameOver')) {
                    this.audioManager.playMusic('title', 0.8);
                }
            }
            this.updateAudioUI();
        }
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-100)
     */
    setMasterVolume(volume) {
        const audio = this.services?.audio || null;
        if (audio && audio.setMaster) {
            audio.setMaster(volume / 100);
            this.updateAudioUI();
            return;
        }
        if (this.audioManager) {
            this.audioManager.setMasterVolume(volume / 100);
            this.updateAudioUI();
        }
    }

    /**
     * Set music volume
     * @param {number} volume - Volume level (0-100)
     */
    setMusicVolume(volume) {
        const audio = this.services?.audio || null;
        if (audio && audio.setMusic) {
            audio.setMusic(volume / 100);
            this.updateAudioUI();
            return;
        }
        if (this.audioManager) {
            this.audioManager.setMusicVolume(volume / 100);
            this.updateAudioUI();
        }
    }

    /**
     * Set SFX volume
     * @param {number} volume - Volume level (0-100)
     */
    setSfxVolume(volume) {
        const audio = this.services?.audio || null;
        if (audio && audio.setSfx) {
            audio.setSfx(volume / 100);
            this.updateAudioUI();
            return;
        }
        if (this.audioManager) {
            this.audioManager.setSfxVolume(volume / 100);
            this.updateAudioUI();
        }
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
        const audio = this.services?.audio || this.audioManager;
        if (!audio) return;

        const muteButton = document.getElementById('muteButton');
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const masterVolumeValue = document.getElementById('masterVolumeValue');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');

        if (muteButton && audio.isMuted) {
            muteButton.textContent = audio.isMuted() ? '🔇 Unmute' : '🔊 Mute';
        }

        if (masterVolumeSlider && audio.getMasterVolume) {
            masterVolumeSlider.value = Math.round(audio.getMasterVolume() * 100);
        }
        if (musicVolumeSlider && audio.getMusicVolume) {
            musicVolumeSlider.value = Math.round(audio.getMusicVolume() * 100);
        }
        if (sfxVolumeSlider && audio.getSfxVolume) {
            sfxVolumeSlider.value = Math.round(audio.getSfxVolume() * 100);
        }

        if (masterVolumeValue && audio.getMasterVolume) {
            masterVolumeValue.textContent = Math.round(audio.getMasterVolume() * 100) + '%';
        }
        if (musicVolumeValue && audio.getMusicVolume) {
            musicVolumeValue.textContent = Math.round(audio.getMusicVolume() * 100) + '%';
        }
        if (sfxVolumeValue && audio.getSfxVolume) {
            sfxVolumeValue.textContent = Math.round(audio.getSfxVolume() * 100) + '%';
        }
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
        const render = this.getRenderService();
        const context = ctx || render.ctx;
        const targetCanvas = canvas || render.canvas;
        if (!context || !targetCanvas) return;

        // Use palm tree manager's beach scene (includes sky with clouds, ocean, sand)
        this.palmTreeManager.render(context, this.camera, this.gameTime);
        
        // Optional: Draw subtle reference grid
        context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        context.lineWidth = 1;
        
        // Vertical lines every 100px (less intrusive)
        for (let x = 0; x <= targetCanvas.width; x += 100) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, targetCanvas.height);
            context.stroke();
        }
        
        // Horizontal lines every 100px
        for (let y = 0; y <= targetCanvas.height; y += 100) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(targetCanvas.width, y);
            context.stroke();
        }
        
        // Test room info with better visibility
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(5, 15, 360, 70);
        
        context.fillStyle = 'white';
        context.font = '16px \"Hey Gorgeous\", \"Trebuchet MS\", \"Fredoka One\", \"Segoe UI\", sans-serif';
        context.fillText('TEST ROOM - Debug Environment', 10, 35);
        context.fillText('Press F2 to toggle back to main game', 10, 55);
        context.fillText('Grid: 100px squares', 10, 75);
    }
}
