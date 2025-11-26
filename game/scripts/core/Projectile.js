/**
 * Projectile - Base class for all projectiles (rocks, arrows, etc.)
 * Extends Entity with projectile-specific behavior
 */
class Projectile extends Entity {
    constructor(x, y, width, height, velocity, damage = 10) {
        super(x, y, width, height);
        
        // Projectile-specific properties
        this.damage = damage;
        this.speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        this.direction = {
            x: velocity.x / this.speed,
            y: velocity.y / this.speed
        };
        this.velocity = velocity;
        this.lifeTime = 3000; // 3 seconds default
        this.age = 0;
        this.piercing = false;
        this.hitTargets = new Set();
        
        // Projectiles don't use gravity by default
        this.gravity = 0;
        this.friction = 1; // No friction
        this.solid = false; // Projectiles pass through solid objects
        
        // Owner reference (who shot this projectile)
        this.owner = null;
        this.ownerType = 'neutral'; // 'player', 'enemy', 'neutral'
    }

    /**
     * Set the owner of this projectile
     * @param {Entity} owner - Entity that created this projectile
     * @param {string} type - Type of owner ('player', 'enemy', 'neutral')
     */
    setOwner(owner, type = 'neutral') {
        this.owner = owner;
        this.ownerType = type;
    }

    /**
     * Update projectile (movement, collision, lifetime)
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        const dt = deltaTime / 1000;
        
        // Update age and check lifetime
        this.age += deltaTime;
        if (this.age >= this.lifeTime) {
            this.active = false;
            return;
        }

        // Move with current velocity (gravity already applied in base physics)
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        // Update rotation to match movement direction
        this.rotation = Math.atan2(this.velocity.y, this.velocity.x);

        // Check for collisions with appropriate targets
        this.checkCollisions();
    }

    /**
     * Check collisions with targets
     */
    checkCollisions() {
        if (!this.game) return;

        // Check collision with enemies if fired by player
        if (this.ownerType === 'player') {
            this.game.enemies.forEach(enemy => {
                if (this.canHit(enemy) && CollisionDetection.entityCollision(this, enemy)) {
                    this.hitTarget(enemy);
                }
            });
        }
        
        // Check collision with player if fired by enemy
        else if (this.ownerType === 'enemy') {
            if (this.canHit(this.game.player) && CollisionDetection.entityCollision(this, this.game.player)) {
                this.hitTarget(this.game.player);
            }
        }

        // Check collision with solid environment
        if (this.game.platforms) {
            this.game.platforms.forEach(platform => {
                if (platform.solid && CollisionDetection.rectangleCollision(this, platform)) {
                    this.hitObstacle(platform);
                }
            });
        }
    }

    /**
     * Check if projectile can hit target
     * @param {Entity} target - Target to check
     * @returns {boolean} True if can hit
     */
    canHit(target) {
        // Can't hit owner
        if (target === this.owner) return false;
        
        // Can't hit already hit targets (unless piercing)
        if (!this.piercing && this.hitTargets.has(target)) return false;
        
        // Can't hit inactive targets
        if (!target.active) return false;
        
        return true;
    }

    /**
     * Handle hitting a target
     * @param {Entity} target - Target that was hit
     */
    hitTarget(target) {
        // Add to hit targets
        this.hitTargets.add(target);
        
        // Deal damage
        if (target.takeDamage) {
            target.takeDamage(this.damage, this.owner);
        }
        
        // Play hit effect
        this.createHitEffect(target);
        
        // Remove projectile if not piercing
        if (!this.piercing) {
            this.startFadeOut();
        }
        
        // Trigger hit callback
        this.onHitTarget(target);
    }

    /**
     * Handle hitting an obstacle
     * @param {Entity} obstacle - Obstacle that was hit
     */
    hitObstacle(obstacle) {
        // Create impact effect
        this.createHitEffect(obstacle);
        
        // Remove projectile
        this.startFadeOut();
        
        // Trigger hit callback
        this.onHitObstacle(obstacle);
    }

    /**
     * Create visual effect when hitting something
     * @param {Entity} target - What was hit
     */
    createHitEffect(target) {
        // TODO: Add particle effects, sound effects, screen shake, etc.
        if (this.game && this.game.audioManager) {
            // Use different sounds for different hit types
            if (target && target.type === 'enemy') {
                this.game.audioManager.playSound('slimy', 0.5);
            } else {
                this.game.audioManager.playSound('hit', 0.3);
            }
        }
    }

    /**
     * Render projectile with trail effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible) return;

        // Draw trail effect
        this.drawTrail(ctx, camera);
        
        // Draw main projectile
        super.render(ctx, camera);
    }

    /**
     * Draw trailing effect behind projectile
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    drawTrail(ctx, camera) {
        // Skip trail for rocks to keep the sprite clean
        if (this instanceof Rock) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Draw simple trail line
        const trailLength = this.speed * 0.5;
        const startX = screenX + this.width / 2 - this.direction.x * trailLength;
        const startY = screenY + this.height / 2 - this.direction.y * trailLength;
        const endX = screenX + this.width / 2;
        const endY = screenY + this.height / 2;
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }

    // Virtual methods (override in subclasses)
    onHitTarget(target) {}
    onHitObstacle(obstacle) {}
}

/**
 * Rock - Player's thrown projectile
 */
class Rock extends Projectile {
    constructor(x, y, velocity) {
        super(x, y, 24, 24, velocity, 15);
        
        // Rock specific properties for arcing, long-range travel
        this.gravity = 300; // slight drop compared to player gravity
        this.startX = x; // Track starting position for distance calculation
        this.startY = y;
        this.maxDistance = 400; // fallback; overridden by player
        this.lifeTime = 8000; // allow time to arc to ground
        
        // Set fallback color (brown for rocks)
        this.fallbackColor = '#8B4513';
        
        // Pixel-art rock sprite
        this.loadSprite('art/items/rock-item.png');
        
        // Set owner as player type
        this.ownerType = 'player';
    }

    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);
        
        // Check if rock has traveled minimum distance (5 tiles)
        const distanceTraveled = Math.sqrt(
            Math.pow(this.x - this.startX, 2) + 
            Math.pow(this.y - this.startY, 2)
        );
        
        // No auto-despawn on distance; let it fall to ground/obstacle
    }

    onHitTarget(target) {
        // Rock disappears on collision with enemy
        this.active = false;
        
        // Add small knockback to target
        if (target.velocity) {
            const knockbackForce = 1.5;
            target.velocity.x += this.direction.x * knockbackForce;
        }
    }

    onHitObstacle(obstacle) {
        // Rock disappears on collision with any obstacle
        this.active = false;
    }

    /**
     * Begin a fade-out timer before removal
     */
    startFadeOut() {
        if (this.fadeOut) return;
        this.fadeOut = true;
        this.fadeDuration = 2000; // 2 seconds
        this.fadeElapsed = 0;
    }

    /**
     * Override update to handle gravity and fade
     */
    update(deltaTime) {
        if (!this.active) return;

        // Apply gravity (projectiles don't use base Entity gravity)
        if (!this.onGround) {
            const dt = deltaTime / 1000;
            this.velocity.y += this.gravity * dt;
        }

        // Standard update (movement, collisions, lifetime)
        super.update(deltaTime);

        // Handle fade-out
        if (this.fadeOut) {
            this.fadeElapsed += deltaTime;
            const progress = Math.min(1, this.fadeElapsed / this.fadeDuration);
            this.alpha = 1 - progress;
            if (progress >= 1) {
                this.active = false;
            }
        }
    }
}

/**
 * MagicArrow - Enemy projectile
 */
class MagicArrow extends Projectile {
    constructor(x, y, velocity) {
        super(x, y, 12, 4, velocity, 20);
        
        // Arrows don't use gravity
        this.gravity = 0;
        this.lifeTime = 4000;
        
        // Load arrow sprite
        this.loadSprite('art/sprites/magic-arrow.png'); // Will need to create this asset
        
        // Set owner as enemy type
        this.ownerType = 'enemy';
    }

    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);
        
        // Add magical particle effects
        if (Math.random() < 0.3) {
            this.createMagicParticle();
        }
    }

    createMagicParticle() {
        // TODO: Create magical particle effects
        // This would create small sparkles around the arrow
    }
}
