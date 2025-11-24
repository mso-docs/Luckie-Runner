/**
 * Player - Main character class for Luckie Puppy
 * Implements Sonic-inspired movement with running, jumping, dashing, and rock throwing
 */
class Player extends Entity {
    constructor(x, y) {
        super(x, y, 32, 32);
        
        // Player-specific physics
        this.runAcceleration = 0.8;
        this.maxRunSpeed = 8;
        this.maxDashSpeed = 12;
        this.jumpPower = 12;
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
        this.playAnimation('idle');
        
        // Set fallback color (blue for player)
        this.fallbackColor = '#4488ff';
        
        // Load sprite with error handling
        this.loadSprite('art/sprites/luckiersprites.png');
    }

    /**
     * Set up animation frames for the player sprite
     */
    setupAnimations() {
        // Assuming the sprite sheet has 32x32 frames
        const frameWidth = 32;
        const frameHeight = 32;
        
        // Idle animation (frames 0-3)
        this.addAnimation('idle', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 32, y: 0, width: frameWidth, height: frameHeight },
            { x: 64, y: 0, width: frameWidth, height: frameHeight },
            { x: 96, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Running animation (frames 4-7)
        this.addAnimation('run', [
            { x: 0, y: 32, width: frameWidth, height: frameHeight },
            { x: 32, y: 32, width: frameWidth, height: frameHeight },
            { x: 64, y: 32, width: frameWidth, height: frameHeight },
            { x: 96, y: 32, width: frameWidth, height: frameHeight }
        ], true);
        
        // Jumping animation (frames 8-9)
        this.addAnimation('jump', [
            { x: 0, y: 64, width: frameWidth, height: frameHeight },
            { x: 32, y: 64, width: frameWidth, height: frameHeight }
        ], false);
        
        // Hurt animation (frames 10-11)
        this.addAnimation('hurt', [
            { x: 64, y: 64, width: frameWidth, height: frameHeight },
            { x: 96, y: 64, width: frameWidth, height: frameHeight }
        ], false);
        
        // Attack animation (frames 12-13)
        this.addAnimation('attack', [
            { x: 0, y: 96, width: frameWidth, height: frameHeight },
            { x: 32, y: 96, width: frameWidth, height: frameHeight }
        ], false);
        
        // Dash animation (frame 14)
        this.addAnimation('dash', [
            { x: 64, y: 96, width: frameWidth, height: frameHeight }
        ], false);

        // Adjust animation speeds
        this.animations.idle.speed = 200;
        this.animations.run.speed = 100;
        this.animations.jump.speed = 150;
        this.animations.hurt.speed = 100;
        this.animations.attack.speed = 80;
        this.animations.dash.speed = 50;
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
     * @param {Object} mousePos - Mouse position {x, y}
     */
    throwRock(mousePos) {
        // Calculate throw direction
        const playerCenter = this.getCenter();
        const direction = {
            x: mousePos.x - playerCenter.x,
            y: mousePos.y - playerCenter.y
        };
        
        // Normalize and set throw speed
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        const throwSpeed = 10;
        const velocity = {
            x: (direction.x / magnitude) * throwSpeed,
            y: (direction.y / magnitude) * throwSpeed
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
        
        // Play attack animation and sound
        this.playAnimation('attack');
        if (this.game.audioManager) {
            this.game.audioManager.playSound('attack', 0.6);
        }
    }

    /**
     * Update animation state based on current movement
     */
    updateAnimationState() {
        // Don't change animation if playing a non-looping one
        if (this.currentAnimation === 'hurt' || this.currentAnimation === 'attack') {
            return;
        }
        
        if (this.isDashing) {
            this.playAnimation('dash');
        } else if (!this.onGround) {
            this.playAnimation('jump');
        } else if (this.isRunning) {
            this.playAnimation('run');
        } else {
            this.playAnimation('idle');
        }
        
        // Flip sprite based on facing direction
        this.flipX = this.facing < 0;
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
        
        // Smooth camera following
        const lerpSpeed = 0.1;
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
        
        if (scoreElement) scoreElement.textContent = this.score;
        if (coinsElement) coinsElement.textContent = this.coins;
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