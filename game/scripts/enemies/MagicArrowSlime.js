/**
 * MagicArrowSlime - Ranged enemy that shoots magical arrows
 * Keeps distance from player and provides ranged combat
 */
class MagicArrowSlime extends Enemy {
    constructor(x, y) {
        super(x, y, 28, 24);
        
        // Magic arrow slime specific properties
        this.type = 'magic_arrow_slime';
        this.health = 30;
        this.maxHealth = 30;
        this.patrolSpeed = 0.6;
        this.chaseSpeed = 1.0; // Slower than melee enemies
        this.attackDamage = 18;
        this.attackRange = 200; // Long range
        this.detectionRange = 180;
        this.preferredDistance = 120; // Tries to stay this far from player
        
        // Ranged attack properties
        this.arrowSpeed = 6;
        this.arrowAccuracy = 0.8; // 0-1, how accurate the aim is
        this.burstCount = 3; // Number of arrows in a burst
        this.burstDelay = 200; // ms between arrows in burst
        this.currentBurst = 0;
        this.burstTimer = 0;
        this.rechargingTime = 2000; // ms to recharge after burst
        this.isRecharging = false;
        this.rechargeTimer = 0;
        
        // Magic effects
        this.magicPower = 100;
        this.maxMagicPower = 100;
        this.magicRegenRate = 10; // per second
        this.arrowCost = 20;
        
        // Kiting behavior (staying at range)
        this.isKiting = false;
        this.kiteDirection = 1;
        this.lastKiteTime = 0;
        this.kiteInterval = 3000; // Change kite direction every 3 seconds
        
        // Animation setup
        this.setupAnimations();
        this.playAnimation('idle');
        
        // Set fallback color (bright cyan for magic slime)
        this.fallbackColor = '#00ffff';
        
        // Load custom sprite sheet (same as other slimes)
        this.loadSprite('art/sprites/custom-green-slime.png');
        
        // Current movement direction for animation
        this.currentDirection = 'idle';
        this.lastDirection = 'idle';
        
        // Set collision bounds
        this.collisionOffset = { x: 2, y: 4 };
        this.collisionWidth = 24;
        this.collisionHeight = 20;
    }

    /**
     * Set up animations for magic arrow slime using 4x4 sprite sheet
     * Row 1 (y=0): Move Up animation
     * Row 2 (y=32): Move Right animation
     * Row 3 (y=64): Idle animation
     * Row 4 (y=96): Move Left animation  
     */
    setupAnimations() {
        const frameWidth = 32;
        const frameHeight = 32;
        
        // Idle animation - Row 3
        this.addAnimation('idle', [
            { x: 0, y: 64, width: frameWidth, height: frameHeight },
            { x: 32, y: 64, width: frameWidth, height: frameHeight },
            { x: 64, y: 64, width: frameWidth, height: frameHeight },
            { x: 96, y: 64, width: frameWidth, height: frameHeight }
        ], true);
        
        // Move Left animation - Row 4
        this.addAnimation('move_left', [
            { x: 0, y: 96, width: frameWidth, height: frameHeight },
            { x: 32, y: 96, width: frameWidth, height: frameHeight },
            { x: 64, y: 96, width: frameWidth, height: frameHeight },
            { x: 96, y: 96, width: frameWidth, height: frameHeight }
        ], true);
        
        // Move Right animation - Row 2
        this.addAnimation('move_right', [
            { x: 0, y: 32, width: frameWidth, height: frameHeight },
            { x: 32, y: 32, width: frameWidth, height: frameHeight },
            { x: 64, y: 32, width: frameWidth, height: frameHeight },
            { x: 96, y: 32, width: frameWidth, height: frameHeight }
        ], true);
        
        // Move Up animation - Row 1
        this.addAnimation('move_up', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 32, y: 0, width: frameWidth, height: frameHeight },
            { x: 64, y: 0, width: frameWidth, height: frameHeight },
            { x: 96, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Charge attack animation - using move_up
        this.addAnimation('charge', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 32, y: 0, width: frameWidth, height: frameHeight },
            { x: 64, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Attack animation
        this.addAnimation('attack', [
            { x: 96, y: 0, width: frameWidth, height: frameHeight },
            { x: 64, y: 32, width: frameWidth, height: frameHeight },
            { x: 32, y: 64, width: frameWidth, height: frameHeight }
        ], false);
        
        // Hurt animation
        this.addAnimation('hurt', [
            { x: 96, y: 96, width: frameWidth, height: frameHeight },
            { x: 32, y: 64, width: frameWidth, height: frameHeight }
        ], false);
        
        // Death animation
        this.addAnimation('death', [
            { x: 96, y: 64, width: frameWidth, height: frameHeight },
            { x: 64, y: 64, width: frameWidth, height: frameHeight },
            { x: 32, y: 64, width: frameWidth, height: frameHeight },
            { x: 0, y: 64, width: frameWidth, height: frameHeight }
        ], false);

        // Set animation speeds
        this.animations.idle.speed = 500;
        this.animations.move_left.speed = 300;
        this.animations.move_right.speed = 300;
        this.animations.move_up.speed = 300;
        this.animations.charge.speed = 150;
        this.animations.attack.speed = 100;
        this.animations.hurt.speed = 200;
        this.animations.death.speed = 250;
    }

    /**
     * Magic arrow slime specific update logic
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);
        
        // Update directional animation based on movement
        this.updateDirectionalAnimation();
        
        // Regenerate magic power
        this.regenerateMagic(deltaTime);
        
        // Update ranged attack logic
        this.updateRangedAttack(deltaTime);
        
        // Update kiting behavior
        this.updateKiting(deltaTime);
    }
    
    /**
     * Update animation based on movement direction
     */
    updateDirectionalAnimation() {
        let newDirection = 'idle';
        
        // Determine direction based on velocity
        if (Math.abs(this.velocity.x) > 0.3) {
            newDirection = this.velocity.x > 0 ? 'move_right' : 'move_left';
        } else if (this.velocity.y < -1) {
            newDirection = 'move_up';
        }
        
        // Only change animation if direction changed and not in special states
        if (newDirection !== this.currentDirection && 
            this.currentAnimation !== 'attack' && 
            this.currentAnimation !== 'charge' && 
            this.currentAnimation !== 'hurt' && 
            this.currentAnimation !== 'death') {
            
            this.currentDirection = newDirection;
            this.playAnimation(newDirection);
        }
    }

    /**
     * Regenerate magic power over time
     * @param {number} deltaTime - Time since last frame
     */
    regenerateMagic(deltaTime) {
        if (this.magicPower < this.maxMagicPower) {
            this.magicPower += (this.magicRegenRate * deltaTime) / 1000;
            this.magicPower = Math.min(this.maxMagicPower, this.magicPower);
        }
    }

    /**
     * Update ranged attack burst system
     * @param {number} deltaTime - Time since last frame
     */
    updateRangedAttack(deltaTime) {
        // Handle recharge time
        if (this.isRecharging) {
            this.rechargeTimer -= deltaTime;
            if (this.rechargeTimer <= 0) {
                this.isRecharging = false;
                this.currentBurst = 0;
            }
        }
        
        // Handle burst delay between arrows
        if (this.burstTimer > 0) {
            this.burstTimer -= deltaTime;
        }
    }

    /**
     * Update kiting behavior to maintain distance
     * @param {number} deltaTime - Time since last frame
     */
    updateKiting(deltaTime) {
        if (!this.target) {
            this.isKiting = false;
            return;
        }
        
        const distance = CollisionDetection.getDistance(this, this.target);
        const targetX = this.target.x;
        
        // Determine if should kite
        if (this.state === 'chase' && distance < this.preferredDistance) {
            this.isKiting = true;
        } else if (distance > this.preferredDistance * 1.5) {
            this.isKiting = false;
        }
        
        // Update kite direction periodically
        this.lastKiteTime += deltaTime;
        if (this.lastKiteTime >= this.kiteInterval) {
            this.kiteDirection = Math.random() < 0.5 ? 1 : -1;
            this.lastKiteTime = 0;
        }
    }

    /**
     * Override chase state for kiting behavior
     * @param {number} deltaTime - Time since last frame
     */
    chaseState(deltaTime) {
        if (!this.target) {
            this.changeState('patrol');
            return;
        }
        
        const distance = CollisionDetection.getDistance(this, this.target);
        
        // Check if can attack
        if (distance <= this.attackRange && 
            !this.isRecharging && 
            this.magicPower >= this.arrowCost) {
            this.changeState('attack');
            return;
        }
        
        // Check if lost target
        if (!this.canSeeTarget && this.searchTime <= 0) {
            this.changeState('patrol');
            return;
        }
        
        // Kiting behavior - maintain distance
        if (this.isKiting) {
            // Move away from target
            const direction = this.target.x > this.x ? -1 : 1;
            this.velocity.x = direction * this.chaseSpeed * this.kiteDirection;
        } else {
            // Move towards target (but slower than melee enemies)
            const targetX = this.canSeeTarget ? this.target.x : this.lastSeenTargetX;
            const direction = targetX > this.x ? 1 : -1;
            this.velocity.x = direction * this.chaseSpeed * 0.7; // Reduced speed
        }
        
        // Play appropriate animation
        if (this.isKiting || distance < this.preferredDistance) {
            this.playAnimation('run');
        } else {
            this.playAnimation('walk');
        }
    }

    /**
     * Override attack state for burst firing
     * @param {number} deltaTime - Time since last frame
     */
    attackState(deltaTime) {
        // Stop movement during attack
        this.velocity.x *= 0.3;
        
        // First part - charging animation
        if (this.stateTime < 300) {
            this.playAnimation('charge');
            return;
        }
        
        // Fire arrows in burst
        if (this.currentBurst < this.burstCount && this.burstTimer <= 0) {
            this.fireArrow();
            this.currentBurst++;
            this.burstTimer = this.burstDelay;
        }
        
        // Attack animation during firing
        if (this.currentBurst > 0) {
            this.playAnimation('attack');
        }
        
        // Check if burst complete
        if (this.currentBurst >= this.burstCount && this.stateTime >= 600) {
            // Start recharge period
            this.isRecharging = true;
            this.rechargeTimer = this.rechargingTime;
            this.changeState('chase');
        }
    }

    /**
     * Fire a magic arrow at the target
     */
    fireArrow() {
        if (!this.target || this.magicPower < this.arrowCost) return;
        
        // Calculate aim with some inaccuracy
        const targetCenter = this.target.getCenter();
        const myCenter = this.getCenter();
        
        // Predict target movement slightly
        const prediction = {
            x: targetCenter.x + this.target.velocity.x * 10,
            y: targetCenter.y + this.target.velocity.y * 5
        };
        
        // Add accuracy variation
        const inaccuracy = (1 - this.arrowAccuracy) * 50;
        const aimX = prediction.x + (Math.random() - 0.5) * inaccuracy;
        const aimY = prediction.y + (Math.random() - 0.5) * inaccuracy;
        
        // Calculate velocity
        const direction = {
            x: aimX - myCenter.x,
            y: aimY - myCenter.y
        };
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        const velocity = {
            x: (direction.x / magnitude) * this.arrowSpeed,
            y: (direction.y / magnitude) * this.arrowSpeed
        };
        
        // Create magic arrow
        const arrow = new MagicArrow(myCenter.x - 6, myCenter.y - 2, velocity);
        arrow.setOwner(this, 'enemy');
        arrow.game = this.game;
        
        if (this.game.projectiles) {
            this.game.projectiles.push(arrow);
        }
        
        // Use magic power
        this.magicPower -= this.arrowCost;
        
        // Create magic effect
        this.createMagicCastEffect();
        
        // Play arrow sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('magic_arrow', 0.5);
        }
    }

    /**
     * Create visual effect when casting magic
     */
    createMagicCastEffect() {
        // TODO: Add magical particles and glow effects
        // This would create sparkles and magical aura around the slime
    }

    /**
     * Override damage handling for magic slime effects
     * @param {number} amount - Damage amount
     * @param {Entity} source - Damage source
     */
    onTakeDamage(amount, source) {
        super.onTakeDamage(amount, source);
        
        // Interrupt charging/attacks when hit
        if (this.state === 'attack') {
            this.isRecharging = true;
            this.rechargeTimer = this.rechargingTime * 0.5;
            this.changeState('hurt');
        }
        
        // Lose some magic power when hit
        this.magicPower = Math.max(0, this.magicPower - 10);
        
        // Create magic disruption effect
        this.createMagicDisruptionEffect();
    }

    /**
     * Create effect when magic is disrupted
     */
    createMagicDisruptionEffect() {
        // TODO: Add magical disruption particles
        // This would show the magic being scattered
    }

    /**
     * Override state change for magic slime sounds
     * @param {string} newState - New state
     * @param {string} oldState - Previous state
     */
    onStateChange(newState, oldState) {
        super.onStateChange(newState, oldState);
        
        if (this.game.audioManager) {
            switch (newState) {
                case 'chase':
                    if (oldState === 'patrol') {
                        this.game.audioManager.playSound('magic_slime_alert', 0.4);
                    }
                    break;
                case 'attack':
                    this.game.audioManager.playSound('magic_charge', 0.6);
                    break;
                case 'hurt':
                    this.game.audioManager.playSound('magic_hurt', 0.6);
                    break;
            }
        }
    }

    /**
     * Render magic slime with magical aura (disabled)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        // Draw main sprite only
        super.render(ctx, camera);
    }

    /**
     * Draw magical aura around slime (disabled)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    drawMagicalAura(ctx, camera) {
        // Disabled to prevent rectangles
        return;
    }

    /**
     * Draw magic power bar (disabled)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    drawMagicPowerBar(ctx, camera) {
        // Disabled to prevent rectangles
        return;
    }

    /**
     * Override drops for magic arrow slime
     */
    handleDrops() {
        // Magic slimes have chance to drop special items
        this.dropChance = 0.75;
        this.dropTable = [
            { item: 'coin', chance: 0.7, amount: 3 },
            { item: 'health', chance: 0.3, amount: 20 }
        ];
        
        super.handleDrops();
    }
}