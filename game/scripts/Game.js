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
        this.debug = false;
        this.running = false;
        
        // Core systems
        this.input = new InputManager();
        this.audioManager = new AudioManager();
        
        // Game entities
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.projectiles = [];
        this.hazards = [];
        this.platforms = [];
        
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
        this.fps = 60;
        this.targetFrameTime = 1000 / this.fps;
        
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
        // Initialize audio
        this.audioManager.initializeGameSounds();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Create initial level
        this.createLevel();
        
        // Show start menu
        this.showMenu('startMenu');
        
        console.log('🎮 Luckie Runner initialized!');
    }

    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Start menu
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('instructionsButton').addEventListener('click', () => {
            this.showMenu('instructionsMenu');
        });
        
        // Instructions menu
        document.getElementById('backButton').addEventListener('click', () => {
            this.showMenu('startMenu');
        });
        
        // Game over menu
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('mainMenuButton').addEventListener('click', () => {
            this.returnToMenu();
        });
        
        // Pause menu
        document.getElementById('resumeButton').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('pauseMainMenuButton').addEventListener('click', () => {
            this.returnToMenu();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Escape':
                case 'p':
                case 'P':
                    if (this.state === 'playing') {
                        this.pauseGame();
                    } else if (this.state === 'paused') {
                        this.resumeGame();
                    }
                    break;
                case 'r':
                case 'R':
                    if (this.state === 'gameOver') {
                        this.restartGame();
                    }
                    break;
                case 'F1':
                    this.debug = !this.debug;
                    e.preventDefault();
                    break;
            }
        });
    }

    /**
     * Create the game level with platforms, enemies, and items
     */
    createLevel() {
        this.platforms = [];
        this.enemies = [];
        this.items = [];
        this.hazards = [];
        
        // Create ground platforms
        this.createGroundPlatforms();
        
        // Create floating platforms
        this.createFloatingPlatforms();
        
        // Spawn enemies
        this.spawnEnemies();
        
        // Spawn items
        this.spawnItems();
        
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
        const enemySpawns = [
            { x: 400, y: 350, type: 'GroundSlime' },
            { x: 600, y: 270, type: 'GroundSlime' },
            { x: 850, y: 400, type: 'GroundSlime' },
            { x: 1000, y: 520, type: 'PoisonSlime' },
            { x: 1250, y: 250, type: 'MagicArrowSlime' },
            { x: 1500, y: 370, type: 'GroundSlime' },
            { x: 1700, y: 520, type: 'PoisonSlime' },
            { x: 2000, y: 300, type: 'MagicArrowSlime' },
            { x: 2200, y: 230, type: 'GroundSlime' },
            { x: 2400, y: 520, type: 'PoisonSlime' },
            { x: 2700, y: 350, type: 'MagicArrowSlime' }
        ];
        
        enemySpawns.forEach(spawn => {
            let enemy;
            switch (spawn.type) {
                case 'GroundSlime':
                    enemy = new GroundSlime(spawn.x, spawn.y);
                    break;
                case 'PoisonSlime':
                    enemy = new PoisonSlime(spawn.x, spawn.y);
                    break;
                case 'MagicArrowSlime':
                    enemy = new MagicArrowSlime(spawn.x, spawn.y);
                    break;
            }
            
            if (enemy) {
                enemy.game = this;
                this.enemies.push(enemy);
            }
        });
    }

    /**
     * Spawn items throughout the level
     */
    spawnItems() {
        // Coin trails and scattered coins
        const coinSpawns = [
            { x: 250, y: 450, count: 5, trail: true },
            { x: 350, y: 350, count: 1 },
            { x: 550, y: 270, count: 3, trail: true },
            { x: 800, y: 300, count: 1, value: 3 },
            { x: 1050, y: 330, count: 4, trail: true },
            { x: 1400, y: 250, count: 1, value: 5 },
            { x: 1650, y: 370, count: 6, trail: true },
            { x: 1950, y: 300, count: 2, value: 3 },
            { x: 2150, y: 230, count: 5, trail: true },
            { x: 2550, y: 350, count: 1, value: 10 }
        ];
        
        coinSpawns.forEach(spawn => {
            if (spawn.trail && spawn.count > 1) {
                // Create coin trail
                for (let i = 0; i < spawn.count; i++) {
                    const coin = new Coin(
                        spawn.x + i * 30,
                        spawn.y - i * 10,
                        spawn.value || 1
                    );
                    coin.game = this;
                    this.items.push(coin);
                }
            } else {
                // Single coin or scattered group
                const coins = Coin.createScattered(spawn.x, spawn.y, spawn.count, spawn.value || 1);
                coins.forEach(coin => {
                    coin.game = this;
                    this.items.push(coin);
                });
            }
        });
        
        // Health potions
        const healthSpawns = [
            { x: 700, y: 300, type: 'minor' },
            { x: 1150, y: 330, type: 'standard' },
            { x: 1800, y: 370, type: 'standard' },
            { x: 2300, y: 480, type: 'greater' }
        ];
        
        healthSpawns.forEach(spawn => {
            let potion;
            switch (spawn.type) {
                case 'minor':
                    potion = HealthPotion.createMinor(spawn.x, spawn.y);
                    break;
                case 'standard':
                    potion = HealthPotion.createStandard(spawn.x, spawn.y);
                    break;
                case 'greater':
                    potion = HealthPotion.createGreater(spawn.x, spawn.y);
                    break;
            }
            
            if (potion) {
                potion.game = this;
                this.items.push(potion);
            }
        });
    }

    /**
     * Create parallax background layers
     */
    createBackground() {
        this.backgroundLayers = [
            // Far mountains (slowest)
            {
                image: 'art/bg/laguna.png',
                speed: 0.2,
                y: 0,
                repeat: true
            },
            // Mid forest/hills
            {
                image: 'art/bg/panning bg.png',
                speed: 0.5,
                y: 100,
                repeat: true
            },
            // Foreground grass
            {
                image: 'art/bg/foreground-dea.png',
                speed: 0.8,
                y: 450,
                repeat: true
            }
        ];
        
        // Load background images
        this.backgroundLayers.forEach(layer => {
            layer.img = new Image();
            layer.img.src = layer.image;
        });
    }

    /**
     * Start the game
     */
    startGame() {
        this.state = 'playing';
        this.running = true;
        
        // Create player
        this.player = new Player(this.level.spawnX, this.level.spawnY);
        this.player.game = this;
        
        // Reset game stats
        this.stats = {
            enemiesDefeated: 0,
            coinsCollected: 0,
            distanceTraveled: 0,
            timeElapsed: 0
        };
        
        // Hide all menus
        this.hideAllMenus();
        
        // Start game loop
        this.gameLoop();
        
        // Play game music
        if (this.audioManager) {
            this.audioManager.playMusic('game', 0.5);
        }
        
        console.log('🚀 Game started!');
    }

    /**
     * Main game loop
     */
    gameLoop(currentTime = 0) {
        if (!this.running) return;
        
        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.gameTime += this.deltaTime;
        this.frameCount++;
        
        // Update game state
        if (this.state === 'playing') {
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
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
            this.updateCamera();
            this.checkPlayerCollisions();
        }
        
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
                this.updateItemPhysics(item);
                
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
        
        // Calculate target position with look-ahead
        this.cameraTarget.x = this.player.x - this.canvas.width / 2 + 
                             this.player.velocity.x * this.cameraLead.x / 10;
        this.cameraTarget.y = this.player.y - this.canvas.height / 2 + 
                             this.player.velocity.y * this.cameraLead.y / 10;
        
        // Smooth camera movement
        const lerpSpeed = 0.1;
        this.camera.x += (this.cameraTarget.x - this.camera.x) * lerpSpeed;
        this.camera.y += (this.cameraTarget.y - this.camera.y) * lerpSpeed;
        
        // Keep camera in bounds
        this.camera.x = Math.max(0, Math.min(this.level.width - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.level.height - this.canvas.height, this.camera.y));
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
        
        // Enemy collisions
        this.enemies.forEach(enemy => {
            if (CollisionDetection.entityCollision(this.player, enemy)) {
                // Player takes damage from enemy contact
                this.player.takeDamage(enemy.attackDamage * 0.5, enemy);
            }
        });
        
        // Hazard collisions
        this.hazards.forEach(hazard => {
            if (hazard.checkPlayerCollision) {
                hazard.checkPlayerCollision();
            }
        });
        
        // World boundaries
        if (this.player.y > this.level.height) {
            // Player fell off the world
            this.player.takeDamage(this.player.health, null);
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
    updateItemPhysics(item) {
        // Simple ground collision for items
        this.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(item),
                platform
            )) {
                if (item.y + item.height > platform.y && item.velocity.y > 0) {
                    item.y = platform.y - item.height;
                    item.velocity.y = 0;
                    item.onGround = true;
                    item.originalY = item.y; // Update bobbing base position
                }
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
            this.gameOver();
        }
        
        // Victory condition (reached end of level)
        if (this.player && this.player.x >= this.level.width - 200) {
            this.victory();
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
        
        // Render debug information
        if (this.debug) {
            this.renderDebugInfo();
        }
    }

    /**
     * Render parallax background
     */
    renderBackground() {
        this.backgroundLayers.forEach(layer => {
            if (!layer.img || !layer.img.complete) return;
            
            // Calculate parallax offset
            const offsetX = this.camera.x * layer.speed;
            const x = -offsetX % layer.img.width;
            
            // Draw background, repeating as needed
            for (let i = -1; i < Math.ceil(this.canvas.width / layer.img.width) + 1; i++) {
                this.ctx.drawImage(
                    layer.img,
                    x + i * layer.img.width,
                    layer.y - this.camera.y
                );
            }
        });
    }

    /**
     * Render platforms
     */
    renderPlatforms() {
        this.platforms.forEach(platform => {
            const screenX = platform.x - this.camera.x;
            const screenY = platform.y - this.camera.y;
            
            // Only render if on screen
            if (screenX + platform.width >= 0 && screenX <= this.canvas.width &&
                screenY + platform.height >= 0 && screenY <= this.canvas.height) {
                
                this.ctx.fillStyle = platform.color || '#654321';
                this.ctx.fillRect(screenX, screenY, platform.width, platform.height);
                
                // Add some texture
                this.ctx.strokeStyle = '#543210';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(screenX, screenY, platform.width, platform.height);
            }
        });
    }

    /**
     * Render debug information
     */
    renderDebugInfo() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 300, 150);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        
        const debugInfo = [
            `FPS: ${Math.round(1000 / this.deltaTime)}`,
            `Player: ${Math.round(this.player?.x || 0)}, ${Math.round(this.player?.y || 0)}`,
            `Camera: ${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}`,
            `Enemies: ${this.enemies.length}`,
            `Items: ${this.items.length}`,
            `Projectiles: ${this.projectiles.length}`,
            `Health: ${this.player?.health || 0}/${this.player?.maxHealth || 100}`,
            `Coins: ${this.player?.coins || 0}`,
            `Score: ${this.player?.score || 0}`,
            `Time: ${Math.round(this.stats.timeElapsed / 1000)}s`
        ];
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, 20, 30 + index * 14);
        });
        
        this.ctx.restore();
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (this.state !== 'playing') return;
        
        this.state = 'paused';
        this.showMenu('pauseMenu');
        
        if (this.audioManager) {
            // Pause or lower music volume
        }
        
        console.log('⏸️ Game paused');
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.state !== 'paused') return;
        
        this.state = 'playing';
        this.hideAllMenus();
        
        if (this.audioManager) {
            // Resume or restore music volume
        }
        
        console.log('▶️ Game resumed');
    }

    /**
     * Handle game over
     */
    gameOver() {
        this.state = 'gameOver';
        
        // Update final scores in UI
        document.getElementById('finalScore').textContent = this.player?.score || 0;
        document.getElementById('finalCoins').textContent = this.player?.coins || 0;
        
        this.showMenu('gameOverMenu');
        
        if (this.audioManager) {
            this.audioManager.stopAllMusic();
            this.audioManager.playSound('game_over', 0.8);
        }
        
        console.log('💀 Game Over');
    }

    /**
     * Handle victory
     */
    victory() {
        this.state = 'victory';
        
        // Bonus points for victory
        if (this.player) {
            this.player.score += 1000;
            this.player.updateUI();
        }
        
        // Show victory screen (reuse game over for now)
        document.getElementById('finalScore').textContent = this.player?.score || 0;
        document.getElementById('finalCoins').textContent = this.player?.coins || 0;
        this.showMenu('gameOverMenu');
        
        if (this.audioManager) {
            this.audioManager.stopAllMusic();
            this.audioManager.playSound('victory', 0.8);
        }
        
        console.log('🏆 Victory!');
    }

    /**
     * Restart the game
     */
    restartGame() {
        this.hideAllMenus();
        
        // Reset level
        this.createLevel();
        
        // Reset camera
        this.camera = { x: 0, y: 0 };
        
        // Clear entity arrays
        this.projectiles = [];
        this.hazards = [];
        
        // Start new game
        this.startGame();
    }

    /**
     * Return to main menu
     */
    returnToMenu() {
        this.state = 'menu';
        this.running = false;
        
        // Stop music
        if (this.audioManager) {
            this.audioManager.stopAllMusic();
        }
        
        // Reset everything
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.projectiles = [];
        this.hazards = [];
        this.camera = { x: 0, y: 0 };
        
        this.showMenu('startMenu');
        
        console.log('🏠 Returned to main menu');
    }

    /**
     * Show a specific menu
     * @param {string} menuId - ID of menu to show
     */
    showMenu(menuId) {
        this.hideAllMenus();
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.remove('hidden');
        }
    }

    /**
     * Hide all menus
     */
    hideAllMenus() {
        const menus = document.querySelectorAll('.menu');
        menus.forEach(menu => {
            menu.classList.add('hidden');
        });
    }
}