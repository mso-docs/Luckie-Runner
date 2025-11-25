/**
 * Player - Main character class for Luckie Puppy
 * Simple, reliable platformer movement
 */
class Player extends Entity {
    constructor(x, y) {
        // Tile-based sprite: 45x66 tiles
        super(x, y, 45, 66);
        
        // SMOOTH PHYSICS
        this.moveSpeed = 600; // pixels/second - max speed cap
        this.acceleration = 2000; // pixels/second² - gradual ramp up
        this.deceleration = 8000; // pixels/second² - ground stopping (85% faster: 1200 * 6.67 ≈ 8000)
        this.airDeceleration = 100; // pixels/second² - air resistance (very low)
        this.jumpStrength = -700; // pixels/second - negative = up (increased to compensate for higher gravity)
        this.gravity = 1000; // pixels/second² - falling acceleration (increased by 25%)
        
        // Simple state
        this.facing = 1; // 1 = right, -1 = left
        this.canJump = false; // Can only jump when on ground
        
        // Health and status
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.coins = 0;
        this.score = 0;
        
        // Rock throwing
        this.maxRocks = 10;
        this.rocks = 10;
        this.attackCooldown = 0;
        this.attackCooldownTime = 500; // 500ms cooldown
        
        // Load tile-based sprite sheet (45x66 tiles)
        // Animates first 2 tiles by default at 200ms per frame
        this.loadTileSheet('art/sprites/luckie-sprite.png', 45, 66, [0, 1], 200);
    }

    /**
     * Set tile animation frames dynamically
     * @param {Array} frames - Array of tile indices [0, 1, 2, etc]
     * @param {number} speed - Animation speed in ms per frame
     */
    setTileAnimation(frames, speed = 200) {
        this.tileAnimationFrames = frames;
        this.tileAnimationSpeed = speed;
        this.tileAnimationIndex = 0;
        this.tileAnimationTime = 0;
        this.tileIndex = frames[0];
    }

    /**
     * Smooth movement with momentum
     * @param {number} deltaTime - Time since last frame in ms
     */
    onUpdate(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds
        const input = this.game.input;
        
        // HORIZONTAL MOVEMENT - Smooth acceleration/deceleration
        const movingLeft = input.isMovingLeft();
        const movingRight = input.isMovingRight();
        
        if (movingLeft && !movingRight) {
            // Accelerate left
            this.velocity.x -= this.acceleration * dt;
            if (this.velocity.x < -this.moveSpeed) {
                this.velocity.x = -this.moveSpeed;
            }
            this.facing = -1;
        } else if (movingRight && !movingLeft) {
            // Accelerate right
            this.velocity.x += this.acceleration * dt;
            if (this.velocity.x > this.moveSpeed) {
                this.velocity.x = this.moveSpeed;
            }
            this.facing = 1;
        } else {
            // No input - decelerate based on ground/air
            const decel = this.onGround ? this.deceleration : this.airDeceleration;
            
            if (this.velocity.x > 0) {
                this.velocity.x -= decel * dt;
                if (this.velocity.x < 0) this.velocity.x = 0;
            } else if (this.velocity.x < 0) {
                this.velocity.x += decel * dt;
                if (this.velocity.x > 0) this.velocity.x = 0;
            }
        }
        
        // JUMPING - Only when on ground
        if (input.isJumping() && this.onGround) {
            this.velocity.y = this.jumpStrength;
            this.onGround = false;
        }
        
        // ROCK THROWING - Space or X key
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        if ((input.keys['Space'] || input.keys['KeyX']) && this.rocks > 0 && this.attackCooldown <= 0) {
            this.throwRock();
        }
        
        // GRAVITY - Always pull down when not on ground
        if (!this.onGround) {
            this.velocity.y += this.gravity * dt;
        } else {
            // Stop falling when on ground
            if (this.velocity.y > 0) {
                this.velocity.y = 0;
            }
        }
        
        // Update position
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        
        // Update animations
        this.updateSimpleAnimation();
        
        // Update camera
        this.updateCamera();
    }

    /**
     * Simple animation - switch between idle and running tiles based on movement
     */
    updateSimpleAnimation() {
        // Check if player is moving
        const isMoving = Math.abs(this.velocity.x) > 10; // Small threshold to ignore tiny movements
        
        // Flip sprite when facing left (sprite faces right by default)
        this.flipX = this.facing === -1; // true when facing left, false when facing right
        
        if (isMoving) {
            // Running - use tile 1
            this.setTileAnimation([1], 0);
        } else {
            // Idle - use tile 0
            this.setTileAnimation([0], 0);
        }
    }

    /**
     * Throw a rock projectile
     * @param {Object} mousePos - Mouse position (unused in new system)
     */
    throwRock(mousePos) {
        // Throw straight in the direction player is facing
        const playerCenter = this.getCenter();
        
        // Throw straight horizontally (no arc)
        const throwSpeed = 15;
        
        // Create velocity vector - straight horizontal
        const velocity = {
            x: this.facing * throwSpeed, // Straight left or right
            y: 0 // No vertical component - completely straight
        };
        
        // Create rock projectile
        const rock = new Rock(playerCenter.x - 4, playerCenter.y - 4, velocity);
        rock.setOwner(this, 'player');
        rock.game = this.game;
        
        // Add to game projectiles
        this.game.projectiles.push(rock);
        
        // Use rock and set cooldown
        this.rocks--;
        this.attackCooldown = this.attackCooldownTime;
        
        // Update UI to show rock count
        this.updateUI();
        
        // Play attack sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('rock', 0.6);
        }
    }



    /**
     * Update camera to follow player smoothly
     */
    updateCamera() {
        if (!this.game.camera) return;
        
        const targetX = this.x - this.game.canvas.width / 2 + this.width / 2;
        const targetY = this.y - this.game.canvas.height / 2 + this.height / 2;
        
        // Smooth camera following with better responsiveness
        const lerpSpeed = 0.12;
        this.game.camera.x += (targetX - this.game.camera.x) * lerpSpeed;
        this.game.camera.y += (targetY - this.game.camera.y) * lerpSpeed;
    }

    /**
     * Override damage handling for player-specific effects
     * @param {number} amount - Damage amount
     * @param {Entity} source - Damage source
     */
    onTakeDamage(amount, source) {
        // Play hurt sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('hurt', 0.8);
        }
        
        // Make invulnerable for a short time
        this.makeInvulnerable(1000);
        
        // Add knockback
        if (source && source.x < this.x) {
            this.velocity.x += 3; // Knock right
        } else if (source && source.x > this.x) {
            this.velocity.x -= 3; // Knock left
        }
        
        // Update UI
        this.updateHealthUI();
    }

    /**
     * Override death handling for player
     * @param {Entity} source - Death source
     */
    onDeath(source) {
        // Trigger game over
        if (this.game) {
            this.game.stateManager.gameOver();
        }
    }

    /**
     * Collect a coin
     * @param {number} value - Coin value
     */
    collectCoin(value = 1) {
        this.coins += value;
        const oldScore = this.score;
        this.score += value * 10;
        
        // Check for high score milestones (every 1000 points)
        const oldMilestone = Math.floor(oldScore / 1000);
        const newMilestone = Math.floor(this.score / 1000);
        
        if (newMilestone > oldMilestone && this.game.audioManager) {
            this.game.audioManager.playSound('high_score', 0.9);
        } else if (this.game.audioManager) {
            this.game.audioManager.playSound('coin', 0.7);
        }
        
        this.updateUI();
    }

    /**
     * Add rocks to inventory
     * @param {number} amount - Number of rocks to add
     */
    addRocks(amount) {
        this.rocks = Math.min(this.maxRocks, this.rocks + amount);
        
        // Play special pickup sound for rocks
        if (this.game.audioManager) {
            this.game.audioManager.playSound('special', 0.7);
        }
        
        this.updateUI();
    }

    /**
     * Update UI elements
     */
    updateUI() {
        const scoreElement = document.getElementById('score');
        const coinsElement = document.getElementById('coins');
        const rocksElement = document.getElementById('rocks');
        
        if (scoreElement) scoreElement.textContent = this.score;
        if (coinsElement) coinsElement.textContent = this.coins;
        if (rocksElement) rocksElement.textContent = this.rocks;
    }

    /**
     * Update health UI
     */
    updateHealthUI() {
        const healthFill = document.getElementById('healthFill');
        if (healthFill) {
            const healthPercent = (this.health / this.maxHealth) * 100;
            healthFill.style.width = healthPercent + '%';
        }
    }

    /**
     * Reset player to starting state
     */
    reset() {
        this.health = this.maxHealth;
        this.coins = 0;
        this.score = 0;
        this.rocks = this.maxRocks;
        this.attackCooldown = 0;
        this.velocity = { x: 0, y: 0 };
        this.facing = 1;
        this.invulnerable = false;
        this.tileAnimationIndex = 0;
        this.tileAnimationTime = 0;
        this.updateUI();
        this.updateHealthUI();
    }
}