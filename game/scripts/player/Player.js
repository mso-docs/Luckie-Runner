/**
 * Player - Main character class for Luckie Puppy
 * Implements Sonic-inspired movement with running, jumping, dashing, and rock throwing
 */
class Player extends Entity {
    constructor(x, y) {
        // New sprite: 181x132 total, 2 rows × 4 frames, 45x66px per frame
        super(x, y, 45, 66);
        
        // Player-specific physics
        this.runAcceleration = 0.4;
        this.maxRunSpeed = 4;
        this.maxDashSpeed = 6;
        this.jumpPower = 10;
        this.airControl = 0.3;
        this.groundFriction = 0.85;
        this.airFriction = 0.98;
        this.coyoteTime = 150; // ms after leaving ground where jump is still possible
        this.jumpBuffer = 100; // ms to buffer jump input before landing
        
        // Player state
        this.facing = 1; // 1 for right, -1 for left
        this.isRunning = false;
        this.isDashing = false;
        this.isJumping = false;
        this.canDoubleJump = true;
        this.timeSinceGrounded = 0;
        this.jumpBufferTime = 0;
        this.dashCooldown = 0;
        this.dashDuration = 200; // ms
        this.dashCooldownTime = 800; // ms
        
        // Combat properties
        this.attackCooldown = 0;
        this.attackCooldownTime = 300;
        this.rocks = 10;
        this.maxRocks = 20;
        
        // Health and status
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.coins = 0;
        this.score = 0;
        
        // Animation setup
        this.setupAnimations();
        this.playAnimation('idle_right');
        
        // Load sprite with error handling
        this.loadSprite('art/sprites/luckie-sprite.png');
    }

    /**
     * Set up animation frames for the player sprite
     * New sprite: 181x132px total, 2 rows × 4 frames, 45x66px each
     * Top row (y=0): Right movement frames
     * Bottom row (y=66): Left movement frames
     */
    setupAnimations() {
        const frameWidth = 45;
        const frameHeight = 66;
        
        // Right movement animations (top row)
        this.addAnimation('idle_right', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        this.addAnimation('run_right', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 45, y: 0, width: frameWidth, height: frameHeight },
            { x: 90, y: 0, width: frameWidth, height: frameHeight },
            { x: 135, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Left movement animations (bottom row)
        this.addAnimation('idle_left', [
            { x: 0, y: 66, width: frameWidth, height: frameHeight }
        ], true);
        
        this.addAnimation('run_left', [
            { x: 0, y: 66, width: frameWidth, height: frameHeight },
            { x: 45, y: 66, width: frameWidth, height: frameHeight },
            { x: 90, y: 66, width: frameWidth, height: frameHeight },
            { x: 135, y: 66, width: frameWidth, height: frameHeight }
        ], true);
        
        // Jumping animations (use first frame of each direction)
        this.addAnimation('jump_right', [
            { x: 45, y: 0, width: frameWidth, height: frameHeight }
        ], false);
        
        this.addAnimation('jump_left', [
            { x: 45, y: 66, width: frameWidth, height: frameHeight }
        ], false);
        
        // Attack animations (use frame 3 of each direction)
        this.addAnimation('attack_right', [
            { x: 90, y: 0, width: frameWidth, height: frameHeight }
        ], false);
        
        this.addAnimation('attack_left', [
            { x: 90, y: 66, width: frameWidth, height: frameHeight }
        ], false);
        
        // Dash animations (use frame 4 of each direction)
        this.addAnimation('dash_right', [
            { x: 135, y: 0, width: frameWidth, height: frameHeight }
        ], false);
        
        this.addAnimation('dash_left', [
            { x: 135, y: 66, width: frameWidth, height: frameHeight }
        ], false);

        // Adjust animation speeds
        this.animations.idle_right.speed = 200;
        this.animations.idle_left.speed = 200;
        this.animations.run_right.speed = 100;
        this.animations.run_left.speed = 100;
        this.animations.jump_right.speed = 150;
        this.animations.jump_left.speed = 150;
        this.animations.attack_right.speed = 80;
        this.animations.attack_left.speed = 80;
        this.animations.dash_right.speed = 50;
        this.animations.dash_left.speed = 50;
    }

    /**
     * Handle player input and movement
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        const input = this.game.input;
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Handle input
        this.handleMovementInput(input);
        this.handleJumpInput(input, deltaTime);
        this.handleAttackInput(input);
        
        // Update animations based on state
        this.updateAnimationState();
        
        // Apply Sonic-style physics
        this.updateSonicPhysics();
        
        // Update camera to follow player
        this.updateCamera();
    }

    /**
     * Update various timers
     * @param {number} deltaTime - Time since last frame
     */
    updateTimers(deltaTime) {
        // Update grounded time for coyote time
        if (this.onGround) {
            this.timeSinceGrounded = 0;
            this.canDoubleJump = true;
        } else {
            this.timeSinceGrounded += deltaTime;
        }
        
        // Update jump buffer
        if (this.jumpBufferTime > 0) {
            this.jumpBufferTime -= deltaTime;
        }
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
        }
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }

    /**
     * Handle horizontal movement input
     * @param {InputManager} input - Input manager
     */
    handleMovementInput(input) {
        this.isRunning = false;
        this.isDashing = false;
        
        // Check for dash input
        const wantsToDash = input.isDashing() && this.dashCooldown <= 0;
        
        // Horizontal movement
        if (input.isMovingLeft()) {
            this.isRunning = true;
            this.facing = -1;
            
            if (wantsToDash) {
                this.performDash(-1);
            } else {
                this.accelerateHorizontally(-this.runAcceleration);
            }
        } else if (input.isMovingRight()) {
            this.isRunning = true;
            this.facing = 1;
            
            if (wantsToDash) {
                this.performDash(1);
            } else {
                this.accelerateHorizontally(this.runAcceleration);
            }
        }
        
        // Apply appropriate friction
        this.friction = this.onGround ? this.groundFriction : this.airFriction;
    }

    /**
     * Apply horizontal acceleration
     * @param {number} acceleration - Acceleration amount
     */
    accelerateHorizontally(acceleration) {
        const maxSpeed = this.isDashing ? this.maxDashSpeed : this.maxRunSpeed;
        const control = this.onGround ? 1 : this.airControl;
        
        this.velocity.x += acceleration * control;
        this.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x));
    }

    /**
     * Perform dash move
     * @param {number} direction - Direction to dash (-1 or 1)
     */
    performDash(direction) {
        this.isDashing = true;
        this.velocity.x = direction * this.maxDashSpeed;
        this.dashCooldown = this.dashCooldownTime;
        
        // Dash can reset air jumps
        if (!this.onGround) {
            this.canDoubleJump = true;
        }
        
        // Play dash sound effect
        if (this.game.audioManager) {
            this.game.audioManager.playSound('dash', 0.8);
        }
    }

    /**
     * Handle jump input with coyote time and jump buffering
     * @param {InputManager} input - Input manager
     * @param {number} deltaTime - Time since last frame
     */
    handleJumpInput(input, deltaTime) {
        if (input.isJumping()) {
            this.jumpBufferTime = this.jumpBuffer;
        }
        
        // Check if we can jump
        const canCoyoteJump = this.timeSinceGrounded <= this.coyoteTime;
        const canJump = this.onGround || canCoyoteJump || this.canDoubleJump;
        
        if (this.jumpBufferTime > 0 && canJump) {
            this.performJump();
            this.jumpBufferTime = 0;
            
            // Use double jump if in air
            if (!this.onGround && !canCoyoteJump) {
                this.canDoubleJump = false;
            }
        }
    }

    /**
     * Perform jump
     */
    performJump() {
        this.velocity.y = -this.jumpPower;
        this.isJumping = true;
        this.onGround = false;
        
        // Play jump sound effect
        if (this.game.audioManager) {
            this.game.audioManager.playSound('jump', 0.7);
        }
    }

    /**
     * Handle attack input (rock throwing)
     * @param {InputManager} input - Input manager
     */
    handleAttackInput(input) {
        if (input.isMouseClicked() && this.attackCooldown <= 0 && this.rocks > 0) {
            this.throwRock(input.getMousePosition());
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
        
        // Play attack animation and sound
        const animDirection = this.facing > 0 ? 'right' : 'left';
        this.playAnimation(`attack_${animDirection}`);
        if (this.game.audioManager) {
            this.game.audioManager.playSound('attack', 0.6);
        }
    }

    /**
     * Update animation state based on current movement
     */
    updateAnimationState() {
        // Don't change animation if playing a non-looping one
        if (this.currentAnimation === 'attack_left' || this.currentAnimation === 'attack_right') {
            return;
        }
        
        const direction = this.facing > 0 ? 'right' : 'left';
        
        if (this.isDashing) {
            this.playAnimation(`dash_${direction}`);
        } else if (!this.onGround) {
            this.playAnimation(`jump_${direction}`);
        } else if (this.isRunning) {
            this.playAnimation(`run_${direction}`);
        } else {
            this.playAnimation(`idle_${direction}`);
        }
        
        // No longer need flipX since we have directional sprites
        this.flipX = false;
    }

    /**
     * Apply Sonic-style physics improvements
     */
    updateSonicPhysics() {
        // Variable jump height based on input
        if (this.velocity.y < 0 && !this.game.input.isJumping()) {
            this.velocity.y *= 0.5; // Cut jump short
        }
        
        // Slope physics (if on ramps)
        // TODO: Implement when slope platforms are added
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
        // Play hurt animation and sound
        this.playAnimation('hurt');
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
        // Don't deactivate player immediately
        this.playAnimation('hurt');
        
        // Trigger game over
        if (this.game) {
            this.game.gameOver();
        }
    }

    /**
     * Collect a coin
     * @param {number} value - Coin value
     */
    collectCoin(value = 1) {
        this.coins += value;
        this.score += value * 10;
        
        if (this.game.audioManager) {
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
        this.rocks = 10;
        this.velocity = { x: 0, y: 0 };
        this.facing = 1;
        this.invulnerable = false;
        this.playAnimation('idle');
        this.updateUI();
        this.updateHealthUI();
    }
}