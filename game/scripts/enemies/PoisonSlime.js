/**
 * PoisonSlime - Enemy that leaves poison puddles
 * Creates environmental hazards that damage player over time
 */
class PoisonSlime extends Enemy {
    constructor(x, y) {
        super(x, y, 26, 22);
        
        // Poison slime specific properties
        this.type = 'poison_slime';
        this.health = 40;
        this.maxHealth = 40;
        this.patrolSpeed = 0.6;
        this.chaseSpeed = 2.0;
        this.attackDamage = 12;
        this.attackRange = 35;
        this.detectionRange = 140;
        
        // Poison specific properties
        this.poisonDamage = 5;
        this.poisonDuration = 3000; // 3 seconds
        this.puddleLifetime = 10000; // 10 seconds
        this.puddleSpawnRate = 2000; // Every 2 seconds while chasing
        this.lastPuddleTime = 0;
        
        // Animation setup
        this.setupAnimations();
        this.playAnimation('idle');
        
        // Set fallback color (purple for poison slime)
        this.fallbackColor = '#8844ff';
        
        // Load sprite
        this.loadSprite('art/sprites/poison-slme.png'); // Note: typo in original file name
        
        // Set collision bounds
        this.collisionOffset = { x: 2, y: 4 };
        this.collisionWidth = 22;
        this.collisionHeight = 18;
        
        // Track poison puddles created by this slime
        this.createdPuddles = [];
    }

    /**
     * Set up animations for poison slime
     */
    setupAnimations() {
        const frameWidth = 26;
        const frameHeight = 22;
        
        // Idle animation - bubbling effect
        this.addAnimation('idle', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 26, y: 0, width: frameWidth, height: frameHeight },
            { x: 52, y: 0, width: frameWidth, height: frameHeight },
            { x: 78, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Walk animation - poison dripping
        this.addAnimation('walk', [
            { x: 0, y: 22, width: frameWidth, height: frameHeight },
            { x: 26, y: 22, width: frameWidth, height: frameHeight },
            { x: 52, y: 22, width: frameWidth, height: frameHeight },
            { x: 78, y: 22, width: frameWidth, height: frameHeight }
        ], true);
        
        // Run animation - more aggressive poison effect
        this.addAnimation('run', [
            { x: 0, y: 44, width: frameWidth, height: frameHeight },
            { x: 26, y: 44, width: frameWidth, height: frameHeight },
            { x: 52, y: 44, width: frameWidth, height: frameHeight },
            { x: 78, y: 44, width: frameWidth, height: frameHeight }
        ], true);
        
        // Attack animation - poison spray
        this.addAnimation('attack', [
            { x: 0, y: 66, width: frameWidth, height: frameHeight },
            { x: 26, y: 66, width: frameWidth, height: frameHeight },
            { x: 52, y: 66, width: frameWidth, height: frameHeight },
            { x: 78, y: 66, width: frameWidth, height: frameHeight }
        ], false);
        
        // Hurt animation
        this.addAnimation('hurt', [
            { x: 0, y: 88, width: frameWidth, height: frameHeight },
            { x: 26, y: 88, width: frameWidth, height: frameHeight }
        ], false);
        
        // Death animation - poison dissolves
        this.addAnimation('death', [
            { x: 52, y: 88, width: frameWidth, height: frameHeight },
            { x: 78, y: 88, width: frameWidth, height: frameHeight },
            { x: 104, y: 88, width: frameWidth, height: frameHeight },
            { x: 130, y: 88, width: frameWidth, height: frameHeight }
        ], false);

        // Set animation speeds
        this.animations.idle.speed = 400;
        this.animations.walk.speed = 250;
        this.animations.run.speed = 150;
        this.animations.attack.speed = 120;
        this.animations.hurt.speed = 200;
        this.animations.death.speed = 300;
    }

    /**
     * Poison slime specific update logic
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);
        
        // Create poison puddles while chasing
        this.updatePoisonPuddles(deltaTime);
        
        // Clean up expired puddles
        this.cleanupPuddles();
    }

    /**
     * Update poison puddle creation logic
     * @param {number} deltaTime - Time since last frame
     */
    updatePoisonPuddles(deltaTime) {
        this.lastPuddleTime += deltaTime;
        
        // Create puddle while chasing and moving
        if (this.state === 'chase' && 
            Math.abs(this.velocity.x) > 0.5 && 
            this.lastPuddleTime >= this.puddleSpawnRate && 
            this.onGround) {
            
            this.createPoisonPuddle();
            this.lastPuddleTime = 0;
        }
    }

    /**
     * Create a poison puddle at current position
     */
    createPoisonPuddle() {
        const puddle = new PoisonPuddle(
            this.x + this.width / 2 - 8,
            this.y + this.height - 4,
            this.poisonDamage,
            this.poisonDuration,
            this.puddleLifetime
        );
        
        puddle.game = this.game;
        this.createdPuddles.push(puddle);
        
        // Add to game hazards
        if (this.game.hazards) {
            this.game.hazards.push(puddle);
        }
        
        // Play puddle creation sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('poison_drop', 0.3);
        }
    }

    /**
     * Remove expired puddles from tracking
     */
    cleanupPuddles() {
        this.createdPuddles = this.createdPuddles.filter(puddle => puddle.active);
    }

    /**
     * Override attack for poison-specific behavior
     * @param {number} deltaTime - Time since last frame
     */
    attackState(deltaTime) {
        super.attackState(deltaTime);
        
        // Create poison spray at end of attack animation
        if (this.stateTime >= 200 && this.stateTime < 250) {
            this.createPoisonSpray();
        }
    }

    /**
     * Create poison spray attack
     */
    createPoisonSpray() {
        if (!this.target) return;
        
        // Create multiple poison projectiles
        const sprayCount = 3;
        const sprayAngle = Math.PI / 6; // 30 degrees
        const baseAngle = Math.atan2(
            this.target.y - this.y,
            this.target.x - this.x
        );
        
        for (let i = 0; i < sprayCount; i++) {
            const angle = baseAngle + (i - 1) * sprayAngle / 2;
            const speed = 4;
            const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            
            const poisonGlob = new PoisonGlob(
                this.x + this.width / 2,
                this.y + this.height / 2,
                velocity,
                this.poisonDamage
            );
            
            poisonGlob.setOwner(this, 'enemy');
            poisonGlob.game = this.game;
            
            if (this.game.projectiles) {
                this.game.projectiles.push(poisonGlob);
            }
        }
    }

    /**
     * Override damage handling for poison slime effects
     * @param {number} amount - Damage amount
     * @param {Entity} source - Damage source
     */
    onTakeDamage(amount, source) {
        super.onTakeDamage(amount, source);
        
        // Create defensive poison puddle when hurt
        if (this.onGround) {
            this.createPoisonPuddle();
        }
        
        // Create poison particles
        this.createPoisonSplatter();
    }

    /**
     * Create poison splatter particles when hit
     */
    createPoisonSplatter() {
        // TODO: Add purple/green poison particle effects
        // This would create toxic looking particles
    }

    /**
     * Override death to create final poison explosion
     * @param {Entity} source - Death source
     */
    onDeath(source) {
        // Create multiple poison puddles on death
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2) * (i / 3);
            const distance = 20;
            const puddleX = this.x + Math.cos(angle) * distance;
            const puddleY = this.y + this.height;
            
            const deathPuddle = new PoisonPuddle(
                puddleX,
                puddleY,
                this.poisonDamage * 0.5,
                this.poisonDuration * 0.5,
                this.puddleLifetime * 0.5
            );
            
            deathPuddle.game = this.game;
            if (this.game.hazards) {
                this.game.hazards.push(deathPuddle);
            }
        }
        
        super.onDeath(source);
    }

    /**
     * Override state change for poison slime sounds
     * @param {string} newState - New state
     * @param {string} oldState - Previous state
     */
    onStateChange(newState, oldState) {
        super.onStateChange(newState, oldState);
        
        if (this.game.audioManager) {
            switch (newState) {
                case 'chase':
                    if (oldState === 'patrol') {
                        this.game.audioManager.playSound('poison_slime_alert', 0.4);
                    }
                    break;
                case 'attack':
                    this.game.audioManager.playSound('poison_attack', 0.5);
                    break;
                case 'hurt':
                    this.game.audioManager.playSound('poison_hurt', 0.6);
                    break;
            }
        }
    }

    /**
     * Override drops for poison slime
     */
    handleDrops() {
        // Poison slimes drop health items more often
        this.dropChance = 0.6;
        this.dropTable = [
            { item: 'coin', chance: 0.6, amount: 2 },
            { item: 'health', chance: 0.4, amount: 15 }
        ];
        
        super.handleDrops();
    }
}

/**
 * PoisonPuddle - Environmental hazard left by poison slimes
 */
class PoisonPuddle extends Entity {
    constructor(x, y, damage, poisonDuration, lifetime) {
        super(x, y, 16, 8);
        
        this.type = 'poison_puddle';
        this.damage = damage;
        this.poisonDuration = poisonDuration;
        this.lifetime = lifetime;
        this.age = 0;
        
        // Appearance properties
        this.alpha = 0.8;
        this.pulsePeriod = 1000; // Pulse every second
        this.pulseTimer = 0;
        
        // Physics
        this.gravity = 0;
        this.solid = false;
        
        // Collision
        this.collisionOffset = { x: 2, y: 2 };
        this.collisionWidth = 12;
        this.collisionHeight = 4;
        
        // Load puddle sprite (simple colored rectangle for now)
        this.color = '#800080'; // Purple color
    }

    /**
     * Update poison puddle
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        this.age += deltaTime;
        this.pulseTimer += deltaTime;
        
        // Fade out near end of lifetime
        if (this.age > this.lifetime * 0.7) {
            const fadeTime = this.lifetime - this.age;
            this.alpha = Math.max(0.2, fadeTime / (this.lifetime * 0.3));
        }
        
        // Remove when expired
        if (this.age >= this.lifetime) {
            this.active = false;
        }
        
        // Check for player collision
        this.checkPlayerCollision();
        
        // Pulse effect
        const pulsePhase = (this.pulseTimer % this.pulsePeriod) / this.pulsePeriod;
        this.scale.x = this.scale.y = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.1;
    }

    /**
     * Check for collision with player
     */
    checkPlayerCollision() {
        if (!this.game || !this.game.player) return;
        
        const player = this.game.player;
        if (CollisionDetection.entityCollision(this, player) && !player.invulnerable) {
            this.applyPoisonEffect(player);
        }
    }

    /**
     * Apply poison effect to target
     * @param {Entity} target - Target to poison
     */
    applyPoisonEffect(target) {
        if (target.takeDamage) {
            target.takeDamage(this.damage, this);
            
            // Apply poison status effect
            if (target.addStatusEffect) {
                target.addStatusEffect('poison', this.poisonDuration, this.damage / 2);
            }
        }
    }

    /**
     * Render poison puddle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible) return;
        
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // Draw puddle as an ellipse
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(
            screenX + this.width / 2,
            screenY + this.height / 2,
            this.width / 2 * this.scale.x,
            this.height / 2 * this.scale.y,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Add bubbling effect
        if (this.pulseTimer % 500 < 50) { // Brief bubbles
            ctx.fillStyle = '#A040A0';
            for (let i = 0; i < 3; i++) {
                const bubbleX = screenX + Math.random() * this.width;
                const bubbleY = screenY + Math.random() * this.height;
                ctx.beginPath();
                ctx.arc(bubbleX, bubbleY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

/**
 * PoisonGlob - Projectile fired by poison slimes
 */
class PoisonGlob extends Projectile {
    constructor(x, y, velocity, damage) {
        super(x, y, 6, 6, velocity, damage);
        
        this.gravity = 0.2; // Slight gravity
        this.lifeTime = 2500;
        this.color = '#800080';
        
        // Create small poison puddle on impact
        this.createsPuddle = true;
    }

    /**
     * Override hit obstacle to create poison puddle
     * @param {Entity} obstacle - What was hit
     */
    onHitObstacle(obstacle) {
        super.onHitObstacle(obstacle);
        
        if (this.createsPuddle && this.game.hazards) {
            const puddle = new PoisonPuddle(
                this.x - 8,
                this.y - 2,
                this.damage * 0.5,
                1500,
                5000
            );
            puddle.game = this.game;
            this.game.hazards.push(puddle);
        }
    }

    /**
     * Render poison glob
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible) return;
        
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}