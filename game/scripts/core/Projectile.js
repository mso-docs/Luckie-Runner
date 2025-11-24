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
        // Update age and check lifetime
        this.age += deltaTime;
        if (this.age >= this.lifeTime) {
            this.active = false;
            return;
        }

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
        if (this.game.level) {
            const platforms = this.game.level.platforms || [];
            const walls = this.game.level.walls || [];
            
            platforms.concat(walls).forEach(obstacle => {
                if (obstacle.solid && CollisionDetection.entityCollision(this, obstacle)) {
                    this.hitObstacle(obstacle);
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
            this.active = false;
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
        this.active = false;
        
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
            this.game.audioManager.playSound('hit', 0.5);
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
        super(x, y, 8, 8, velocity, 15);
        
        // Rocks use gravity
        this.gravity = 0.3;
        this.lifeTime = 2000;
        
        // Set fallback color (brown for rocks)
        this.fallbackColor = '#8B4513';
        
        // Set owner as player type
        this.ownerType = 'player';
    }

    onHitTarget(target) {
        // Add knockback to target
        if (target.velocity) {
            const knockbackForce = 2;
            target.velocity.x += this.direction.x * knockbackForce;
        }
    }

    onHitObstacle(obstacle) {
        // Rocks can bounce off obstacles
        if (this.age > 100) { // Prevent immediate bouncing
            this.velocity.x *= -0.5;
            this.velocity.y *= -0.3;
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