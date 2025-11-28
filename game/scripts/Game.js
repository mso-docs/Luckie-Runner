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
        this.dialogueState = {
            messages: [],
            index: 0,
            active: false,
            dismissing: false,
            hideTimeout: null,
            speaker: null,
            anchor: null,
            onClose: null
        };
        this.speechBubble = {
            container: null,
            text: null,
            hint: null
        };

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
        this.signCallout = null;
        this.signDialogue = {
            container: null,
            bubble: null,
            hint: null,
            active: false,
            target: null,
            messages: [],
            defaultMessages: [],
            index: 0
        };
        this.signSprite = new Image();
        this.signSprite.src = 'art/items/sign.png';

        // UI manager (inventory overlays, tabs, item modals)
        this.uiManager = new UIManager(this);
        this.entityFactory = new EntityFactory(this);
        this.worldBuilder = new WorldBuilder(this, this.entityFactory);
        
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
        this.setupSignDialogueUI();
        this.setupInventoryUI();
        this.badgeUI = new BadgeUI(this);
        this.setupChestUI();
        this.setupShopUI();
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
     * Prepare DOM references for the speech bubble overlay
     */
    setupSpeechBubbleUI() {
        this.speechBubble.container = document.getElementById('speechBubble');
        this.speechBubble.text = document.getElementById('speechText');
        this.speechBubble.hint = this.speechBubble.container ? this.speechBubble.container.querySelector('.speech-bubble__hint') : null;
        this.hideSpeechBubble(true);
    }

    /**
     * Prepare simple sign dialogue UI (3 stacked bubbles)
     */
    setupSignDialogueUI() {
        const container = document.createElement('div');
        container.id = 'signDialogueContainer';
        container.className = 'speech-bubble sign-speech-bubble';
        container.setAttribute('aria-hidden', 'true');
        container.style.position = 'absolute';
        container.style.pointerEvents = 'none';
        container.style.display = 'none';
        const bubble = document.createElement('div');
        bubble.className = 'dialog-bubble sign-dialogue-bubble';
        bubble.style.marginBottom = '6px';

        const textEl = document.createElement('p');
        textEl.className = 'sign-dialogue-text';
        textEl.style.margin = '0';
        textEl.textContent = '';

        const hint = document.createElement('div');
        hint.className = 'speech-bubble__hint';
        hint.textContent = 'Press Enter';

        bubble.appendChild(textEl);
        bubble.appendChild(hint);

        container.appendChild(bubble);
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.appendChild(container);
            this.signDialogue.container = container;
            this.signDialogue.bubble = bubble;
        this.signDialogue.textEl = textEl;
        this.signDialogue.hint = hint;
        this.signDialogue.defaultMessages = [
            '<<<~HOWDY!~>>> It is I, your #friendly# neighborhood signboard. I am here to provide you with %important% information as you embark on your adventure.',
            'You _may_ find me scattered throughout the land, offering guidance, tips, and <<maybe>> even a joke or two to ^lighten^ your journey.',
            'You also may find me in places where you %least% expect it, so keep your eyes #peeled#. Safe travels, ^adventurer^!',
            'Also, you may want to #throw# some rocks at those ^slimes^. Just saying.'
        ];
        this.signDialogue.messages = [...this.signDialogue.defaultMessages];
    }
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

        this.dialogueState.messages = [
            "Hey, I'm Luckie Puppie. !Welcome! #to# the %test% ^room^.",
            "#Click# the ~mouse~ button to ~throw~ !a! #rock#. `Try` hitting that slime!"
        ];
        this.dialogueState.index = 0;
        this.dialogueState.active = true;
        this.dialogueState.dismissing = false;
        this.dialogueState.speaker = null;
        this.dialogueState.anchor = null;
        this.dialogueState.onClose = null;
        this.showSpeechBubble(this.dialogueState.messages[0]);
    }

    /**
     * Advance or dismiss dialogue when Enter is pressed
     */
    handleSpeechBubbleInput() {
        if (!this.dialogueState.active || this.dialogueState.dismissing) return;

        if (this.input.consumeKeyPress('enter') || this.input.consumeKeyPress('numpadenter')) {
            this.advanceSpeechBubble();
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
            const nearbySign = this.getNearbySign();
            if (nearbySign) {
                this.signDialogue.target = nearbySign;
                this.signDialogue.messages = (nearbySign.dialogueLines && nearbySign.dialogueLines.length)
                    ? [...nearbySign.dialogueLines]
                    : [...this.signDialogue.defaultMessages];
                if (this.signDialogue.active) {
                    this.advanceSignDialogue();
                } else {
                    this.showSignDialogue();
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
     * Audio helpers for menus and UI
     */
    playMenuEnterSound() {
        if (this.audioManager) {
            this.audioManager.playSound('menu_enter', 1);
        }
    }

    playMenuExitSound() {
        if (this.audioManager) {
            this.audioManager.playSound('menu_exit', 1);
        }
    }

    playButtonSound() {
        if (this.audioManager) {
            this.audioManager.playSound('button', 1);
        }
    }

    playPurchaseSound() {
        if (this.audioManager) {
            this.audioManager.playSound('purchase', 1);
        }
    }

    /**
     * Start a dialogue with an NPC using the global speech bubble
     * @param {Entity} npc
     */
    startNpcDialogue(npc) {
        if (!npc || !npc.canTalk || !Array.isArray(npc.dialogueLines) || npc.dialogueLines.length === 0) return;
        if (this.dialogueState.active) return;

        this.dialogueState.messages = npc.dialogueLines.slice();
        this.dialogueState.index = 0;
        this.dialogueState.speaker = npc;
        this.dialogueState.anchor = npc;
        this.dialogueState.onClose = () => {
            if (typeof npc.onDialogueClosed === 'function') {
                npc.onDialogueClosed();
            }
        };
        this.dialogueState.dismissing = false;
        if (typeof npc.setTalking === 'function') {
            npc.setTalking(true);
        }
        this.showSpeechBubble(this.dialogueState.messages[0]);
    }

    /**
     * Show the speech bubble with provided text
     * @param {string} text - Dialogue text to display
     */
    showSpeechBubble(text) {
        const bubble = this.speechBubble.container;
        const bubbleText = this.speechBubble.text;
        if (!bubble || !bubbleText) return;

        if (this.dialogueState.hideTimeout) {
            clearTimeout(this.dialogueState.hideTimeout);
            this.dialogueState.hideTimeout = null;
        }

        bubbleText.innerHTML = this.formatSpeechText(text);
        bubble.classList.add('show');
        bubble.setAttribute('aria-hidden', 'false');
        this.dialogueState.active = true;
        this.dialogueState.dismissing = false;
        this.updateSpeechBubblePosition();
    }

    /**
     * Move to the next line or hide the bubble
     */
    advanceSpeechBubble() {
        if (!this.dialogueState.active) return;

        if (this.dialogueState.index < this.dialogueState.messages.length - 1) {
            this.dialogueState.index++;
            this.showSpeechBubble(this.dialogueState.messages[this.dialogueState.index]);
        } else {
            this.hideSpeechBubble();
        }
    }

    /**
     * Hide the speech bubble, optionally immediately
     * @param {boolean} immediate - Skip fade when true
     */
    hideSpeechBubble(immediate = false) {
        const bubble = this.speechBubble.container;
        const runCloseHook = () => {
            if (typeof this.dialogueState.onClose === 'function') {
                this.dialogueState.onClose();
            } else if (this.dialogueState.speaker && typeof this.dialogueState.speaker.onDialogueClosed === 'function') {
                this.dialogueState.speaker.onDialogueClosed();
            }
        };
        const resetDialogueState = () => {
            runCloseHook();
            this.dialogueState.active = false;
            this.dialogueState.dismissing = false;
            this.dialogueState.hideTimeout = null;
            this.dialogueState.speaker = null;
            this.dialogueState.anchor = null;
            this.dialogueState.onClose = null;
        };
        if (this.dialogueState.hideTimeout) {
            clearTimeout(this.dialogueState.hideTimeout);
            this.dialogueState.hideTimeout = null;
        }

        if (!bubble) {
            resetDialogueState();
            return;
        }

        if (immediate) {
            bubble.classList.remove('show');
            bubble.setAttribute('aria-hidden', 'true');
            resetDialogueState();
            return;
        }

        this.dialogueState.dismissing = true;
        bubble.classList.remove('show');
        this.dialogueState.hideTimeout = setTimeout(() => {
            bubble.setAttribute('aria-hidden', 'true');
            resetDialogueState();
        }, 250);
    }

    /**
     * Keep the bubble anchored to the active speaker (player or NPC)
     */
    updateSpeechBubblePosition() {
        const bubble = this.speechBubble.container;
        if (!bubble) return;

        const camera = this.camera || { x: 0, y: 0 };
        const anchor = this.dialogueState.anchor;
        let targetX = this.canvas.width / 2;
        let headY = this.canvas.height / 2;
        let anchorWidth = 0;
        let facingDir = 1;

        if (anchor) {
            const center = anchor.getCenter ? anchor.getCenter() : { x: anchor.x + (anchor.width || 0) / 2, y: anchor.y + (anchor.height || 0) / 2 };
            targetX = center.x - camera.x;
            headY = anchor.y - camera.y;
            anchorWidth = anchor.width || 0;
            facingDir = anchor.facing || 1;
        } else if (this.player) {
            targetX = this.player.x - camera.x + this.player.width / 2;
            headY = this.player.y - camera.y;
            anchorWidth = this.player.width;
            facingDir = this.player.facing || 1;
        }

        bubble.style.left = `${targetX}px`;

        // Position bubble just above the player's head
        const aboveHeadOffset = 20; // pixels above the top of the sprite
        const bottomFromCanvas = this.canvas.height - headY + aboveHeadOffset;
        bubble.style.bottom = `${bottomFromCanvas}px`;

        // Offset tail toward the player's mouth (slight bias toward facing direction)
        // Nudge tail 20px further right relative to previous anchor
        const mouthOffset = anchorWidth ? (anchorWidth * 0.22 * facingDir) + 40 : 50;
        bubble.style.setProperty('--tail-offset', `${mouthOffset}px`);
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
        const bottomFromCanvas = this.canvas.height - screenY + ghost.height + 6;
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
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
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
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
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
        this.input.update();
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
        this.updateSignCallout();
        this.updateSignDialoguePosition();
        
        // Update all background layers
        this.backgroundLayers.forEach(layer => {
            if (layer instanceof Background || layer instanceof ProceduralBackground) {
                layer.update(this.camera.x, deltaTime);
            }
        });
        
        // Update procedural palm trees
        this.palmTreeManager.update(this.camera.x, this.canvas.width);
        
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
        
        this.camera.setViewport(this.canvas.width, this.canvas.height);
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
     * Render the game
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render background layers (parallax)
        this.renderBackground();
        
        // Render canvas-based palm trees just behind platforms
        this.palmTreeManager.render(this.ctx, this.camera, this.gameTime);
        
        // Render platforms
        this.renderPlatforms();

        // Render signs
        this.renderSigns();

        // Render NPCs
        this.renderNPCs();

        // Render chests
        this.renderChests();

        // Render foreground small palms alongside other entities
        if (Array.isArray(this.smallPalms)) {
            this.smallPalms.forEach(palm => palm.render(this.ctx, this.camera));
        }

        // Render hazards
        this.hazards.forEach(hazard => {
            hazard.render(this.ctx, this.camera);
        });

        // Render items
        this.items.forEach(item => {
            item.render(this.ctx, this.camera);
        });
        
        // Render enemies
        this.enemies.forEach(enemy => {
            enemy.render(this.ctx, this.camera);
        });
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(this.ctx, this.camera);
        });
        
        // Render player
        if (this.player) {
            this.player.render(this.ctx, this.camera);
        }

        // Render flag
        if (this.flag) {
            this.flag.render(this.ctx, this.camera);
        }

        // Keep speech bubble following player
        if (this.dialogueState.active) {
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
        const ctx = this.ctx;
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
    renderBackground() {
        if (this.testMode) {
            // Render test room background
            this.renderTestBackground();
        } else {
            // Render all background layers from back to front
            this.backgroundLayers.forEach(layer => {
                if (layer instanceof Background || layer instanceof ProceduralBackground) {
                    layer.render(this.ctx, this.camera);
                }
            });
        }
    }
    
    /**
     * Create SVG element for a palm tree
     */
    createSVGPalmTree(tree) {
        try {
            const svgNS = 'http://www.w3.org/2000/svg';
            const treeGroup = document.createElementNS(svgNS, 'g');
            treeGroup.classList.add('palm-tree');
            
            // Calculate base position
            const baseX = tree.x;
            const baseY = this.canvas.height - 80; // Above ground
            
            // Create trunk as a simple rectangle (for now)
            const trunk = document.createElementNS(svgNS, 'rect');
            trunk.setAttribute('x', baseX - tree.trunkWidth / 2);
            trunk.setAttribute('y', baseY - tree.height);
            trunk.setAttribute('width', tree.trunkWidth);
            trunk.setAttribute('height', tree.height);
            trunk.setAttribute('fill', '#8B4513');
            trunk.setAttribute('stroke', '#654321');
            trunk.setAttribute('stroke-width', '1');
            trunk.setAttribute('opacity', tree.opacity || 0.8);
            
            // Create a simple crown of fronds
            for (let i = 0; i < tree.fronds; i++) {
                const angle = (i / tree.fronds) * Math.PI * 2;
                const frondLength = tree.height * 0.3;
                
                const frond = document.createElementNS(svgNS, 'ellipse');
                frond.setAttribute('cx', baseX + Math.cos(angle) * frondLength * 0.5);
                frond.setAttribute('cy', baseY - tree.height + Math.sin(angle) * frondLength * 0.2);
                frond.setAttribute('rx', frondLength * 0.8);
                frond.setAttribute('ry', frondLength * 0.3);
                frond.setAttribute('fill', tree.color || '#228B22');
                frond.setAttribute('opacity', (tree.opacity || 0.8) * 0.9);
                frond.setAttribute('transform', `rotate(${angle * 180 / Math.PI} ${baseX + Math.cos(angle) * frondLength * 0.5} ${baseY - tree.height + Math.sin(angle) * frondLength * 0.2})`);
                
                treeGroup.appendChild(frond);
            }
            
            treeGroup.appendChild(trunk);
            
            // Created SVG tree
            return treeGroup;
        } catch (error) {
            // Error creating SVG palm tree - returning null
            return null;
        }
    }

    

    


    /**
     * Update SVG palm tree positions with parallax effect
     */
    updateSVGPalmTreePositions() {
        if (!this.proceduralPalmTrees || !this.palmTreeSVG) return;
        
        try {
            const system = this.proceduralPalmTrees;
            
            // Simple parallax - move the entire SVG viewBox
            const parallaxOffset = this.camera.x * system.parallaxSpeed;
            const viewBoxX = -parallaxOffset;
            
            this.palmTreeSVG.setAttribute('viewBox', 
                `${viewBoxX} 0 ${this.canvas.width} ${this.canvas.height}`);
            
            // Optional: Add gentle swaying to individual trees
            if (this.gameTime) {
                const time = this.gameTime * 0.001;
                system.svgElements.forEach((svgTree, treeKey) => {
                    const tree = system.trees.get(treeKey);
                    if (tree && svgTree) {
                        const swayAmount = Math.sin(time * 0.5 + tree.swayPhase) * 2;
                        svgTree.style.transform = `translateX(${swayAmount}px)`;
                    }
                });
            }
        } catch (error) {
            // Error updating palm tree positions - skipping
        }
    }



    /**
     * Render platforms with stylized graphics
     */
    renderPlatforms() {
        this.platforms.forEach(platform => {
            StylizedPlatform.renderPlatform(this.ctx, platform, this.camera);
        });
    }

    /**
     * Render NPCs (currently only the shop ghost)
     */
    renderNPCs() {
        this.npcs.forEach(npc => {
            if (npc.render) {
                npc.render(this.ctx, this.camera);
            }
        });
    }

    /**
     * Render all placed chests
     */
    renderChests() {
        this.chests.forEach(chest => {
            if (chest && chest.render) {
                chest.render(this.ctx, this.camera);
            }
        });
    }

    /**
     * Check if player is near the sign
     */
    isPlayerNearSign(sign) {
        if (!sign || !this.player) return false;
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;
        const sx = sign.x;
        const sy = sign.y;
        const dx = px - sx;
        const dy = py - sy;
        return Math.hypot(dx, dy) <= 120;
    }

    /**
     * Find a nearby sign to interact with
     */
    getNearbySign() {
        if (!this.player || !Array.isArray(this.signBoards)) return null;
        return this.signBoards.find(sign => this.isPlayerNearSign(sign)) || null;
    }

    /**
     * Toggle the sign dialogue bubble set
     */
    toggleSignDialogue() {
        if (this.signDialogue.active) {
            this.hideSignDialogue();
        } else {
            this.showSignDialogue();
        }
    }

    /**
     * Show the sign dialogue bubbles
     */
    showSignDialogue() {
        const dlg = this.signDialogue;
        if (!dlg.container) return;
        if (!dlg.target) {
            dlg.target = this.getNearbySign();
        }
        if (!dlg.target) return;
        if (!dlg.messages || dlg.messages.length === 0) {
            dlg.messages = dlg.defaultMessages ? [...dlg.defaultMessages] : [];
        }
        dlg.active = true;
        dlg.index = 0;
        dlg.container.style.display = 'block';
        dlg.container.setAttribute('aria-hidden', 'false');
        dlg.container.classList.add('show');
        // Target the sign itself for positioning
        this.setSignBubbleText(dlg.messages[dlg.index] || '');
        this.updateSignDialoguePosition();

        // Keep the hint visible inside the bubble
        if (dlg.hint) {
            dlg.hint.style.display = 'block';
        }
    }

    /**
     * Hide the sign dialogue bubbles
     */
    hideSignDialogue(immediate = false) {
        const dlg = this.signDialogue;
        if (!dlg.container) return;
        dlg.active = false;
        dlg.index = 0;
        dlg.container.style.display = 'none';
        dlg.container.setAttribute('aria-hidden', 'true');
        dlg.container.classList.remove('show');

        if (dlg.hint) {
            dlg.hint.style.display = 'none';
        }
    }

    /**
     * Advance through sign dialogue messages
     */
    advanceSignDialogue() {
        const dlg = this.signDialogue;
        if (!dlg.active) return;
        dlg.index++;
        if (dlg.index >= dlg.messages.length) {
            this.hideSignDialogue();
            return;
        }
        this.setSignBubbleText(dlg.messages[dlg.index] || '');
        this.updateSignDialoguePosition();
    }

    /**
    * Set bubble text
    */
    setSignBubbleText(text) {
        const textEl = this.signDialogue.textEl;
        if (textEl) textEl.innerHTML = this.formatSpeechText(text ?? '');
    }

    /**
     * Ensure callout exists
     */
    ensureSignCallout() {
        if (this.signCallout) return;
        const container = document.getElementById('gameContainer');
        if (!container) return;
        const bubble = document.createElement('div');
        bubble.className = 'sign-callout hidden';
        bubble.textContent = 'Press Enter to talk to me!';
        bubble.setAttribute('aria-hidden', 'true');
        container.appendChild(bubble);
        this.signCallout = bubble;
    }

    /**
     * Update sign callout visibility and position
     */
    updateSignCallout() {
        this.ensureSignCallout();
        if (!this.signCallout) return;

        const nearbySign = this.getNearbySign();
        const shouldShow = !this.signDialogue.active && nearbySign;
        if (!shouldShow) {
            this.signCallout.classList.add('hidden');
            this.signCallout.setAttribute('aria-hidden', 'true');
            return;
        }

        const sign = nearbySign;
        const camera = this.camera || { x: 0, y: 0 };
        const screenX = sign.x - camera.x + sign.width / 2;
        const screenY = sign.y - camera.y;
        const bottomFromCanvas = this.canvas.height - screenY + 44;

        this.signCallout.style.left = `${screenX}px`;
        this.signCallout.style.bottom = `${bottomFromCanvas}px`;
        this.signCallout.classList.remove('hidden');
        this.signCallout.setAttribute('aria-hidden', 'false');
    }

    /**
     * Update dialogue bubble position
     */
    updateSignDialoguePosition() {
        const dlg = this.signDialogue;
        if (!dlg.active || !dlg.container) return;
        const target = dlg.target;
        if (!target) return;
        let tx = target.x || 0;
        let ty = target.y || 0;
        let h = target.height || 0;
        // If target is Entity, adjust to center
        if (target.getCenter) {
            const c = target.getCenter();
            tx = c.x;
            ty = c.y;
            h = target.height || 0;
        }
        const camera = this.camera || { x: 0, y: 0 };
        const screenX = tx - camera.x;
        const screenY = ty - camera.y - h;
        dlg.container.style.left = `${screenX}px`;
        dlg.container.style.bottom = `${this.canvas.height - screenY}px`;
        dlg.container.setAttribute('aria-hidden', 'false');
    }

    /**
     * Render all placed signs
     */
    renderSigns() {
        if (!Array.isArray(this.signBoards)) return;
        this.signBoards.forEach(sign => {
            if (sign && typeof sign.render === 'function') {
                sign.render(this.ctx, this.camera);
            }
        });
    }
    
    /**
     * Render canvas-based palm trees with parallax effect\n     */
    renderCanvasPalmTrees() {
        if (!this.proceduralPalmTrees) return;
        
        const system = this.proceduralPalmTrees;
        const groundLevel = this.canvas.height - 80; // Above ground platforms
        
        // Only render trees that are visible on screen with parallax
        const parallaxOffset = this.camera.x * system.parallaxSpeed;
        const leftBound = this.camera.x - 300;
        const rightBound = this.camera.x + this.canvas.width + 300;
        
        let treesRendered = 0;
        
        system.trees.forEach((tree, worldX) => {
            if (tree.x >= leftBound && tree.x <= rightBound) {
                // Calculate screen position with parallax
                const screenX = tree.x - parallaxOffset;
                
                // Add gentle swaying animation
                const time = this.gameTime * 0.001; // Convert to seconds
                const swayOffset = Math.sin(time * 0.4 + tree.swayPhase) * 3;
                
                // Only render if actually on screen
                if (screenX > -200 && screenX < this.canvas.width + 200) {
                    this.drawCanvasPalmTree(
                        screenX + swayOffset, 
                        groundLevel, 
                        tree.height, 
                        tree.lean + swayOffset * 0.008, 
                        tree.fronds, 
                        tree.trunkWidth, 
                        tree.color
                    );
                    treesRendered++;
                }
            }
        });
        
        // Debug: Show tree count occasionally
        if (this.frameCount % 300 === 0) { // Every 5 seconds at 60fps
        // Rendered palm trees
        }
    }
    
    /**
     * Draw a single palm tree on canvas with enhanced visuals
     */
    drawCanvasPalmTree(x, groundY, height, lean, frondCount, trunkWidth, frondColor) {
        // Save canvas state
        this.ctx.save();
        
        // Set shadow for depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Draw trunk with segments
        this.ctx.fillStyle = '#8B4513'; // Saddle brown
        const segments = Math.floor(height / 20);
        
        for (let i = 0; i < segments; i++) {
            const segmentHeight = height / segments;
            const progress = i / segments;
            const currentX = x + lean * progress * 40;
            const currentY = groundY - i * segmentHeight;
            const currentWidth = trunkWidth * (1 - progress * 0.3);
            
            // Add slight curve to trunk
            this.ctx.fillRect(
                currentX - currentWidth/2, 
                currentY - segmentHeight, 
                currentWidth, 
                segmentHeight
            );
        }
        
        // Remove shadow for fronds
        this.ctx.shadowColor = 'transparent';
        
        // Draw palm fronds
        this.ctx.strokeStyle = frondColor;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        
        const treeTopX = x + lean * 40;
        const treeTopY = groundY - height;
        
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            const frondLength = height * 0.5;
            const droop = 0.1 + Math.random() * 0.2;
            
            const endX = treeTopX + Math.cos(angle) * frondLength;
            const endY = treeTopY + Math.sin(angle) * frondLength * droop;
            
            // Draw main frond
            this.ctx.beginPath();
            this.ctx.moveTo(treeTopX, treeTopY);
            this.ctx.quadraticCurveTo(
                treeTopX + Math.cos(angle) * frondLength * 0.7,
                treeTopY + Math.sin(angle) * frondLength * 0.2,
                endX,
                endY
            );
            this.ctx.stroke();
        }
        
        // Restore canvas state
        this.ctx.restore();
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
            this.dialogueState = { ...this.initialStateTemplate.dialogue };
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
        this.hideSignDialogue(true);
        if (this.signCallout && this.signCallout.parentNode) {
            this.signCallout.parentNode.removeChild(this.signCallout);
        }
        this.signCallout = null;
        const buffPanel = document.getElementById('buffPanel');
        const coffeeTimer = document.getElementById('coffeeTimer');
        if (buffPanel) buffPanel.classList.add('hidden');
        if (coffeeTimer) coffeeTimer.textContent = '--:--';
        this.dialogueState.messages = [];
        this.dialogueState.active = false;
        this.dialogueState.speaker = null;
        this.dialogueState.anchor = null;
        this.dialogueState.onClose = null;
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
        if (this.audioManager) {
            const wasMuted = this.audioManager.isMuted();
            this.audioManager.toggleMute();
            
            // Restart appropriate music when unmuting
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
        if (!this.audioManager) return;

        const muteButton = document.getElementById('muteButton');
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const masterVolumeValue = document.getElementById('masterVolumeValue');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');

        if (muteButton) {
            muteButton.textContent = this.audioManager.isMuted() ? '🔇 Unmute' : '🔊 Mute';
        }

        if (masterVolumeSlider) {
            masterVolumeSlider.value = Math.round(this.audioManager.getMasterVolume() * 100);
        }
        if (musicVolumeSlider) {
            musicVolumeSlider.value = Math.round(this.audioManager.getMusicVolume() * 100);
        }
        if (sfxVolumeSlider) {
            sfxVolumeSlider.value = Math.round(this.audioManager.getSfxVolume() * 100);
        }

        if (masterVolumeValue) {
            masterVolumeValue.textContent = Math.round(this.audioManager.getMasterVolume() * 100) + '%';
        }
        if (musicVolumeValue) {
            musicVolumeValue.textContent = Math.round(this.audioManager.getMusicVolume() * 100) + '%';
        }
        if (sfxVolumeValue) {
            sfxVolumeValue.textContent = Math.round(this.audioManager.getSfxVolume() * 100) + '%';
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
    renderTestBackground() {
        // Use palm tree manager's beach scene (includes sky with clouds, ocean, sand)
        this.palmTreeManager.render(this.ctx, this.camera, this.gameTime);
        
        // Optional: Draw subtle reference grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines every 100px (less intrusive)
        for (let x = 0; x <= this.canvas.width; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines every 100px
        for (let y = 0; y <= this.canvas.height; y += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Test room info with better visibility
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(5, 15, 360, 70);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px "Hey Gorgeous", "Trebuchet MS", "Fredoka One", "Segoe UI", sans-serif';
        this.ctx.fillText('TEST ROOM - Debug Environment', 10, 35);
        this.ctx.fillText('Press F2 to toggle back to main game', 10, 55);
        this.ctx.fillText('Grid: 100px squares', 10, 75);
    }
}
