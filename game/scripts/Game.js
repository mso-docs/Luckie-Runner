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
        this.input = new InputManager();
        this.audioManager = new AudioManager();
        this.stateManager = new GameStateManager(this);
        this.palmTreeManager = new PalmTreeManager(this);
        
        // Game entities
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.projectiles = [];
        this.hazards = [];
        this.platforms = [];
        this.flag = null;
        
        // Camera system
        this.camera = { x: 0, y: 0 };
        this.cameraTarget = { x: 0, y: 0 };
        this.cameraLead = { x: 100, y: 50 }; // Look ahead distance
        
        // Level system
        this.level = {
            width: 3000,
            height: 600,
            spawnX: 100,
            spawnY: 400,
            scrollSpeed: 2
        };
        
        // Background layers for parallax
        this.backgroundLayers = [];
        
        // Game timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameTime = 0;
        this.frameCount = 0;
        this.timeScale = 0.6; // Slow down everything by 40%
        this.gameTime = 0;
        
        this.frameCount = 0;
        this.fps = 60;
        this.targetFrameTime = 1000 / this.fps;

        // Intro dialogue UI
        this.dialogueState = {
            messages: [],
            index: 0,
            active: false,
            dismissing: false,
            hideTimeout: null
        };
        this.speechBubble = {
            container: null,
            text: null,
            hint: null
        };
        
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
        
        // Create initial level
        this.createLevel();
        
        // Show start menu
        this.stateManager.showMenu('startMenu');
        
        // Attempt to play title music (may be blocked by autoplay policy)
        this.playTitleMusic();
        
        // Game initialized
    }
    

    
    /**
     * Attempt to play title music, handling autoplay policy
     */
    playTitleMusic() {
        if (this.audioManager && this.audioManager.music['title']) {
            this.audioManager.playMusic('title', 0.6).catch(error => {
                // Title music blocked by autoplay policy. Will start on user interaction.
                
                // Add one-time listener for first user interaction
                const startMusicOnInteraction = () => {
                    if (this.stateManager.isInMenu()) {
                        this.audioManager.playMusic('title', 0.6);
                    }
                    document.removeEventListener('click', startMusicOnInteraction);
                    document.removeEventListener('keydown', startMusicOnInteraction);
                };
                
                document.addEventListener('click', startMusicOnInteraction, { once: true });
                document.addEventListener('keydown', startMusicOnInteraction, { once: true });
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
                this.audioManager.playMusic('title', 0.6).catch(() => {
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
        // Start menu
        document.getElementById('startButton').addEventListener('click', () => {
            this.ensureTitleMusicPlaying();
            this.stateManager.startGame();
        });
        
        document.getElementById('instructionsButton').addEventListener('click', () => {
            this.ensureTitleMusicPlaying();
            this.stateManager.showMenu('instructionsMenu');
        });
        
        // Instructions menu
        document.getElementById('backButton').addEventListener('click', () => {
            this.ensureTitleMusicPlaying();
            this.stateManager.showMenu('startMenu');
        });
        
        // Game over menu
        document.getElementById('restartButton').addEventListener('click', () => {
            this.stateManager.restartGame();
        });
        
        document.getElementById('mainMenuButton').addEventListener('click', () => {
            this.stateManager.returnToMenu();
        });
        
        // Pause menu
        document.getElementById('resumeButton').addEventListener('click', () => {
            this.stateManager.resumeGame();
        });
        
        document.getElementById('pauseMainMenuButton').addEventListener('click', () => {
            this.stateManager.returnToMenu();
        });
        
        // Audio controls
        document.getElementById('muteButton').addEventListener('click', () => {
            this.toggleMute();
        });
        
        document.getElementById('masterVolume').addEventListener('input', (e) => {
            this.setMasterVolume(parseInt(e.target.value));
        });
        
        document.getElementById('musicVolume').addEventListener('input', (e) => {
            this.setMusicVolume(parseInt(e.target.value));
        });
        
        document.getElementById('sfxVolume').addEventListener('input', (e) => {
            this.setSfxVolume(parseInt(e.target.value));
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Let state manager handle state-related shortcuts
            this.stateManager.handleKeyboardShortcuts(e.key);
            
            // Handle other shortcuts
            switch (e.key) {
                case 'F1':
                    this.debug = !this.debug;
                    e.preventDefault();
                    break;
                case 'F2':
                    this.toggleTestMode();
                    e.preventDefault();
                    break;
                case 'm':
                case 'M':
                    this.toggleMute();
                    break;
            }
        });
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
     * Begin the intro dialogue for the test room
     */
    startTestIntroDialogueIfNeeded() {
        if (!this.testMode) {
            this.hideSpeechBubble(true);
            return;
        }

        this.dialogueState.messages = [
            "Hey, I'm Luckie Puppie. !Welcome! to the %test% ^room^.",
            "Click the ~mouse~ button to ~throw~ !a! rock. `Try` hitting that slime!"
        ];
        this.dialogueState.index = 0;
        this.dialogueState.active = true;
        this.dialogueState.dismissing = false;
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
        if (this.dialogueState.hideTimeout) {
            clearTimeout(this.dialogueState.hideTimeout);
            this.dialogueState.hideTimeout = null;
        }

        if (!bubble) {
            this.dialogueState.active = false;
            this.dialogueState.dismissing = false;
            return;
        }

        if (immediate) {
            bubble.classList.remove('show');
            bubble.setAttribute('aria-hidden', 'true');
            this.dialogueState.active = false;
            this.dialogueState.dismissing = false;
            return;
        }

        this.dialogueState.dismissing = true;
        bubble.classList.remove('show');
        this.dialogueState.hideTimeout = setTimeout(() => {
            bubble.setAttribute('aria-hidden', 'true');
            this.dialogueState.active = false;
            this.dialogueState.dismissing = false;
            this.dialogueState.hideTimeout = null;
        }, 250);
    }

    /**
     * Keep the bubble anchored to the player's mouth horizontally
     */
    updateSpeechBubblePosition() {
        const bubble = this.speechBubble.container;
        if (!bubble) return;

        let targetX = this.canvas.width / 2;
        let headY = this.canvas.height / 2;
        if (this.player) {
            targetX = this.player.x - this.camera.x + this.player.width / 2;
            headY = this.player.y - this.camera.y;
        }

        bubble.style.left = `${targetX}px`;

        // Position bubble just above the player's head
        const aboveHeadOffset = 20; // pixels above the top of the sprite
        const bottomFromCanvas = this.canvas.height - headY + aboveHeadOffset;
        bubble.style.bottom = `${bottomFromCanvas}px`;

        // Offset tail toward the player's mouth (slight bias toward facing direction)
        // Nudge tail 20px further right relative to previous anchor
        const mouthOffset = this.player ? (this.player.width * 0.22 * (this.player.facing || 1)) + 50 : 50;
        bubble.style.setProperty('--tail-offset', `${mouthOffset}px`);
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

        apply(/\*(.+?)\*/g, 'speech-bold');
        apply(/_(.+?)_/g, 'speech-italic');
        apply(/%(.+?)%/g, 'speech-shake');
        apply(/~(.+?)~/g, 'speech-rainbow');
        apply(/\^(.+?)\^/g, 'speech-glow');
        apply(/!(.+?)!/g, 'speech-bounce');
        apply(/`(.+?)`/g, 'speech-mono');

        return safe;
    }

    /**
     * Create the game level with platforms, enemies, and items
     */
    createLevel() {
        this.platforms = [];
        this.enemies = [];
        this.items = [];
        this.hazards = [];
        this.flag = null;
        
        if (this.testMode) {
            this.createTestRoom();
        } else {
            // Create normal level
            this.createGroundPlatforms();
            this.createFloatingPlatforms();
            this.spawnEnemies();
            this.spawnItems();
        }
        
        // Set level properties
        this.level = {
            width: this.canvas.width,
            height: this.canvas.height,
            spawnX: this.testMode ? (this.canvas.width / 2) - 22.5 : 100, // Center on platform
            spawnY: this.testMode ? (this.canvas.height / 2) - 100 : this.canvas.height - 150 // Safely above platform
        };
        
        // Create level completion flag
        this.createFlag();
        
        // Create background layers
        this.createBackground();
    }

    /**
     * Create ground platforms
     */
    createGroundPlatforms() {
        const groundHeight = 40;
        const groundY = this.level.height - groundHeight;
        
        // Main ground
        for (let x = 0; x < this.level.width; x += 64) {
            this.platforms.push({
                x: x,
                y: groundY,
                width: 64,
                height: groundHeight,
                type: 'ground',
                solid: true,
                color: '#8B4513'
            });
        }
        
        // Some gaps for challenge
        const gaps = [800, 1200, 1800, 2400];
        gaps.forEach(gapX => {
            // Remove platforms to create gap
            this.platforms = this.platforms.filter(platform => {
                return !(platform.x >= gapX && platform.x < gapX + 128);
            });
        });
    }

    /**
     * Create floating platforms
     */
    createFloatingPlatforms() {
        const platforms = [
            { x: 300, y: 400, width: 96, height: 16 },
            { x: 500, y: 320, width: 64, height: 16 },
            { x: 750, y: 350, width: 128, height: 16 },
            { x: 900, y: 450, width: 64, height: 16 },
            { x: 1100, y: 380, width: 96, height: 16 },
            { x: 1350, y: 300, width: 128, height: 16 },
            { x: 1600, y: 420, width: 64, height: 16 },
            { x: 1900, y: 350, width: 96, height: 16 },
            { x: 2100, y: 280, width: 128, height: 16 },
            { x: 2500, y: 400, width: 160, height: 16 }
        ];
        
        platforms.forEach(platform => {
            this.platforms.push({
                ...platform,
                type: 'floating',
                solid: true,
                color: '#654321'
            });
        });
    }

    /**
     * Spawn enemies throughout the level
     */
    spawnEnemies() {
        // Spawn only ground slimes since other types aren't showing up properly
        const enemySpawns = [
            { x: 250, y: 450, type: 'Slime' },
            { x: 600, y: 450, type: 'Slime' },
            { x: 1000, y: 450, type: 'Slime' },
            { x: 1400, y: 450, type: 'Slime' },
            { x: 1800, y: 450, type: 'Slime' },
            { x: 2200, y: 450, type: 'Slime' }
        ];
        
        enemySpawns.forEach((spawn, index) => {
            let enemy;
            
            try {
                switch (spawn.type) {
                    case 'Slime':
                        enemy = new Slime(spawn.x, spawn.y);
                        break;
                    default:
                        return;
                }
                
                if (enemy) {
                    enemy.game = this;
                // No need to set gravity - entities use their own default
                    this.enemies.push(enemy);
                }
            } catch (error) {
                // Silently handle errors
            }
        });
    }

    /**
     * Spawn items throughout the level
     */
    spawnItems() {
        // Rock items for ammo
        const rockSpawns = [
            { x: 450, y: 450, count: 1, rocksPerPile: 5 },
            { x: 900, y: 400, count: 1, rocksPerPile: 8 },
            { x: 1300, y: 450, count: 2, rocksPerPile: 4 },
            { x: 1750, y: 420, count: 1, rocksPerPile: 6 },
            { x: 2000, y: 450, count: 1, rocksPerPile: 10 }
        ];
        
        rockSpawns.forEach(spawn => {
            const rocks = RockItem.createScattered(spawn.x, spawn.y, spawn.count, spawn.rocksPerPile);
            rocks.forEach(rock => {
                rock.game = this;
                this.items.push(rock);
            });
        });
    }

    /**
     * Create the level completion flag
     */
    createFlag() {
        // Position the flag near the end of the level, but not at the very edge
        const flagX = this.level.width - 300;
        const flagY = this.level.height - 120; // Position above ground
        
        this.flag = Flag.create(flagX, flagY);
        this.flag.game = this;
        
        // Flag created at position
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
        
        // Create player
        this.player = new Player(this.level.spawnX, this.level.spawnY);
        this.player.game = this;
        // Player uses default gravity from Entity class
        
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
     * Main game loop
     */
    gameLoop(currentTime = 0) {
        if (!this.running) return;
        
        // Calculate delta time with scaling
        this.deltaTime = (currentTime - this.lastTime) * this.timeScale;
        this.lastTime = currentTime;
        this.gameTime += this.deltaTime;
        this.frameCount++;
        
        // Update game state
        if (this.stateManager.isPlaying()) {
            this.update(this.deltaTime);
            this.render();
        }
        
        // Continue loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Update game logic
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Update input
        this.input.update();
        this.handleSpeechBubbleInput();
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
            this.updateCamera();
            this.checkPlayerCollisions();
        }
        
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
                this.updateEnemyPhysics(enemy);
                return true;
            } else {
                // Enemy defeated
                this.stats.enemiesDefeated++;
                return false;
            }
        });
        
        // Update items
        this.items = this.items.filter(item => {
            if (item.active) {
                item.update(deltaTime);
                this.updateItemPhysics(item, deltaTime);
                
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
                this.updateProjectilePhysics(projectile);
                return true;
            }
            return false;
        });
        
        // Update hazards
        this.hazards = this.hazards.filter(hazard => {
            if (hazard.active) {
                hazard.update(deltaTime);
                return true;
            }
            return false;
        });
        
        // Update flag
        if (this.flag) {
            this.flag.update(deltaTime);
            
            // Check flag collision with player (disabled in test mode)
            if (!this.testMode && this.player && this.flag.checkCollision(this.player)) {
                // Player collided with flag
                this.flag.collect(this.player);
            }
        }
        
        // Update statistics
        this.updateGameStats(deltaTime);
        
        // Check game over conditions
        this.checkGameOver();
    }

    /**
     * Update camera to follow player
     */
    updateCamera() {
        if (!this.player) return;
        
        if (this.testMode) {
            // Test mode: Follow X axis only, keep player centered horizontally
            this.camera.x = this.player.x - this.canvas.width / 2 + this.player.width / 2;
            this.camera.y = 0;
        } else {
            // Normal mode: Smooth camera with level bounds
            this.cameraTarget.x = this.player.x - this.canvas.width / 2 + this.player.width / 2;
            this.cameraTarget.y = this.player.y - this.canvas.height / 2 + this.player.height / 2;
            
            const lerpSpeed = 0.15;
            this.camera.x += (this.cameraTarget.x - this.camera.x) * lerpSpeed;
            this.camera.y += (this.cameraTarget.y - this.camera.y) * lerpSpeed;
            
            // Keep camera in bounds
            this.camera.x = Math.max(0, Math.min(this.level.width - this.canvas.width, this.camera.x));
            this.camera.y = Math.max(0, Math.min(this.level.height - this.canvas.height, this.camera.y));
        }
    }

    /**
     * Check collisions between player and environment
     */
    checkPlayerCollisions() {
        // Platform collisions
        this.player.onGround = false;
        this.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(this.player),
                platform
            )) {
                this.resolvePlayerPlatformCollision(platform);
            }
        });
        
        // Enemy collisions (disabled in test mode)
        if (!this.testMode) {
            this.enemies.forEach(enemy => {
                if (CollisionDetection.entityCollision(this.player, enemy)) {
                    // Player takes damage from enemy contact
                    this.player.takeDamage(enemy.attackDamage * 0.5, enemy);
                }
            });
        }
        
        // Hazard collisions (disabled in test mode)
        if (!this.testMode) {
            this.hazards.forEach(hazard => {
                if (hazard.checkPlayerCollision) {
                    hazard.checkPlayerCollision();
                }
            });
        }
        
        // World boundaries (disabled in test mode)
        if (!this.testMode && this.player.y > this.level.height + 200) {
            // Player fell off the world
            this.player.takeDamage(this.player.health, null);
        } else if (this.testMode && this.player.y > this.level.height + 500) {
            // In test mode, teleport back to spawn instead of dying
            this.player.x = this.level.spawnX;
            this.player.y = this.level.spawnY;
            this.player.velocity.x = 0;
            this.player.velocity.y = 0;
        }
    }

    /**
     * Resolve collision between player and platform
     * @param {Object} platform - Platform object
     */
    resolvePlayerPlatformCollision(platform) {
        const playerBounds = CollisionDetection.getCollisionBounds(this.player);
        
        // Calculate overlap
        const overlapX = Math.min(
            playerBounds.x + playerBounds.width - platform.x,
            platform.x + platform.width - playerBounds.x
        );
        const overlapY = Math.min(
            playerBounds.y + playerBounds.height - platform.y,
            platform.y + platform.height - playerBounds.y
        );
        
        // Resolve collision based on smallest overlap
        if (overlapX < overlapY) {
            // Horizontal collision
            if (playerBounds.x < platform.x) {
                // Hit from left
                this.player.x = platform.x - this.player.width;
                this.player.velocity.x = Math.min(0, this.player.velocity.x);
            } else {
                // Hit from right
                this.player.x = platform.x + platform.width;
                this.player.velocity.x = Math.max(0, this.player.velocity.x);
            }
        } else {
            // Vertical collision
            if (playerBounds.y < platform.y) {
                // Landing on top
                this.player.y = platform.y - this.player.height;
                this.player.velocity.y = Math.min(0, this.player.velocity.y);
                this.player.onGround = true;
            } else {
                // Hit from below
                this.player.y = platform.y + platform.height;
                this.player.velocity.y = Math.max(0, this.player.velocity.y);
            }
        }
    }

    /**
     * Update enemy physics and collisions
     * @param {Enemy} enemy - Enemy to update
     */
    updateEnemyPhysics(enemy) {
        // Platform collisions for enemies
        enemy.onGround = false;
        this.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(enemy),
                platform
            )) {
                this.resolveEnemyPlatformCollision(enemy, platform);
            }
        });
    }

    /**
     * Resolve collision between enemy and platform
     * @param {Enemy} enemy - Enemy object
     * @param {Object} platform - Platform object
     */
    resolveEnemyPlatformCollision(enemy, platform) {
        const enemyBounds = CollisionDetection.getCollisionBounds(enemy);
        
        // Simple ground detection for enemies
        if (enemyBounds.y + enemyBounds.height > platform.y && 
            enemyBounds.y < platform.y &&
            enemyBounds.x < platform.x + platform.width &&
            enemyBounds.x + enemyBounds.width > platform.x) {
            
            enemy.y = platform.y - enemy.height;
            enemy.velocity.y = Math.min(0, enemy.velocity.y);
            enemy.onGround = true;
        }
    }

    /**
     * Update item physics
     * @param {Item} item - Item to update
     */
    updateItemPhysics(item, deltaTime) {
        const dt = deltaTime / 1000;

        // Apply simple gravity
        if (!item.onGround) {
            item.velocity.y += item.gravity * dt;
        }

        // Integrate position
        item.x += item.velocity.x * dt;
        item.y += item.velocity.y * dt;

        // Simple ground collision for items
        this.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(item),
                platform
            )) {
                if (item.y + item.height > platform.y && item.velocity.y >= 0) {
                    item.y = platform.y - item.height;
                    item.velocity.y = 0;
                    item.onGround = true;
                    item.originalY = item.y; // Update bobbing base position
                }
            }
        });

        // Light friction to slow horizontal drift
        item.velocity.x *= 0.95;
    }

    /**
     * Update projectile physics and collisions
     * @param {Projectile} projectile - Projectile to update
     */
    updateProjectilePhysics(projectile) {
        // Check collision with platforms
        this.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(projectile),
                platform
            )) {
                // Projectile hit platform
                projectile.hitObstacle(platform);
            }
        });
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
        // Clear transient state before rebuilding
        this.player = null;
        this.projectiles = [];
        this.hazards = [];
        this.camera = { x: 0, y: 0 };
        this.backgroundLayers = [];
        this.hideSpeechBubble(true);
        this.dialogueState.messages = [];
        this.dialogueState.active = false;
        
        // Reset managers
        this.palmTreeManager.reset();
        
        // Rebuild level content (platforms, enemies, items, flag, background)
        this.createLevel();
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
                    this.audioManager.playMusic('level1', 0.6);
                } else if (this.stateManager.isInMenu() || this.stateManager.isState('gameOver')) {
                    this.audioManager.playMusic('title', 0.6);
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
        // Create an infinite ground platform
        const groundHeight = 50;
        const groundY = this.canvas.height - groundHeight;
        
        // Create multiple ground segments for infinite running
        // Each segment is 2000px wide, create 10 segments = 20000px of ground
        for (let i = 0; i < 10; i++) {
            const segmentX = i * 2000;
            this.platforms.push(new Platform(segmentX, groundY, 2000, groundHeight));
        }
        
        // Left wall only (prevent going backwards past start)
        const wallWidth = 20;
        const wallHeight = this.canvas.height;
        this.platforms.push(new Platform(-wallWidth, 0, wallWidth, wallHeight));

        // Parkour challenge platforms (test room only)
        const baseY = groundY - 90;
        const parkour = [
            { x: 220, width: 120, y: baseY },
            { x: 420, width: 90, y: baseY - 50 },
            { x: 600, width: 100, y: baseY - 90 },
            { x: 780, width: 80, y: baseY - 130 },
            { x: 950, width: 110, y: baseY - 60 },
            { x: 1140, width: 90, y: baseY - 20 },
            { x: 1320, width: 80, y: baseY - 70 },
            { x: 1480, width: 120, y: baseY - 120 },
            { x: 1660, width: 80, y: baseY - 160 },
            { x: 1800, width: 160, y: baseY - 60 }
        ];
        parkour.forEach(p => {
            this.platforms.push(new Platform(p.x, p.y, p.width, 12));
        });

        // Quick test spawns
        const slime = new Slime(300, groundY);
        slime.game = this;
        const slimeGroundY = groundY - slime.height;
        slime.y = slimeGroundY;
        slime.setSimplePatrol(200, 800, 90, slimeGroundY);
        this.enemies.push(slime);

        const potion = new HealthPotion(480, groundY - 40, 25);
        potion.game = this;
        this.items.push(potion);
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
        this.ctx.font = '16px Arial';
        this.ctx.fillText('TEST ROOM - Debug Environment', 10, 35);
        this.ctx.fillText('Press F2 to toggle back to main game', 10, 55);
        this.ctx.fillText('Grid: 100px squares', 10, 75);
    }
}
