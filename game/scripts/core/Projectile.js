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
        this.autoFadeOnImpact = true;
        
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
        
        // Track last position for impact resolution
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update age and check lifetime
        this.age += deltaTime;
        if (this.age >= this.lifeTime) {
            this.active = false;
            return;
        }
        
        // Refresh direction for effects based on current velocity
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > 0.001) {
            this.speed = speed;
            this.direction = {
                x: this.velocity.x / speed,
                y: this.velocity.y / speed
            };
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

        let damage = this.damage;
        if (this.owner && typeof this.owner.modifyOutgoingDamage === 'function') {
            damage = this.owner.modifyOutgoingDamage(this.damage, target);
        }
        
        // Deal damage
        if (target.takeDamage) {
            target.takeDamage(damage, this.owner);
        }
        
        // Play hit effect
        this.createHitEffect(target);
        
        // Auto fade on impact if enabled
        if (this.autoFadeOnImpact && !this.piercing) {
            this.startFadeOut();
        }
        
        // Trigger hit callback (projectile decides what to do next)
        this.onHitTarget(target);
    }

    /**
     * Handle hitting an obstacle
     * @param {Entity} obstacle - Obstacle that was hit
     */
    hitObstacle(obstacle) {
        // Create impact effect
        this.createHitEffect(obstacle);
        
        // Auto fade on impact if enabled
        if (this.autoFadeOnImpact && !this.piercing) {
            this.startFadeOut();
        }
        
        // Trigger hit callback (projectile decides what to do next)
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
        this.prevX = x;
        this.prevY = y;
        this.autoFadeOnImpact = false; // handle fade manually when motion stops
        this.bounceDamping = 0.5; // lose half vertical speed each bounce
        this.bounceFriction = 0.8; // horizontal friction per bounce
        this.minBounceSpeed = 60; // below this, the rock disintegrates
        this.maxBounces = 6;
        this.bounceCount = 0;
        
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
        // Rock disappears on collision with enemy (no bouncing on enemies)
        this.active = false;
        
        // Add small knockback to target
        if (target.velocity) {
            const knockbackForce = 1.5;
            target.velocity.x += this.direction.x * knockbackForce;
        }
    }

    onHitObstacle(obstacle) {
        // Bounce off solid platforms/ground; disintegrate when energy is gone
        if (!obstacle || !obstacle.solid) {
            this.disintegrate(obstacle);
            return;
        }

        const rockBounds = CollisionDetection.getCollisionBounds(this);
        const obstacleBounds = CollisionDetection.getCollisionBounds(obstacle);

        const overlapX = Math.min(
            rockBounds.x + rockBounds.width - obstacleBounds.x,
            obstacleBounds.x + obstacleBounds.width - rockBounds.x
        );
        const overlapY = Math.min(
            rockBounds.y + rockBounds.height - obstacleBounds.y,
            obstacleBounds.y + obstacleBounds.height - rockBounds.y
        );

        const hitFromAbove = (this.prevY + rockBounds.height) <= obstacleBounds.y;
        const hitFromBelow = this.prevY >= obstacleBounds.y + obstacleBounds.height;
        const hitFromLeft = (this.prevX + rockBounds.width) <= obstacleBounds.x;
        const hitFromRight = this.prevX >= obstacleBounds.x + obstacleBounds.width;

        let bounced = false;

        if (overlapY <= overlapX && (hitFromAbove || hitFromBelow)) {
            // Resolve penetration on vertical axis
            if (hitFromAbove) {
                this.y = obstacleBounds.y - this.height - 0.1;
            } else {
                this.y = obstacleBounds.y + obstacleBounds.height + 0.1;
            }

            this.velocity.y = -this.velocity.y * this.bounceDamping;
            this.velocity.x *= this.bounceFriction;
            bounced = true;
        } else if (overlapX < overlapY && (hitFromLeft || hitFromRight)) {
            // Resolve horizontal collisions (walls/sides of platforms)
            if (hitFromLeft) {
                this.x = obstacleBounds.x - this.width - 0.1;
            } else {
                this.x = obstacleBounds.x + obstacleBounds.width + 0.1;
            }

            this.velocity.x = -this.velocity.x * this.bounceDamping;
            this.velocity.y *= this.bounceFriction;
            bounced = true;
        }

        if (bounced) {
            this.bounceCount++;
            this.onGround = false; // allow gravity to re-apply for the next arc

            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            const outOfEnergy = speed < this.minBounceSpeed || this.bounceCount > this.maxBounces;

            if (outOfEnergy) {
                this.disintegrate(obstacle, false);
            }
        } else {
            // Unknown collision direction; just disintegrate to avoid sticking
            this.disintegrate(obstacle, false);
        }
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

    /**
     * Disintegrate the rock when it no longer has energy to bounce
     */
    disintegrate(target, playEffect = true) {
        if (this.fadeOut) return;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.onGround = true;
        if (playEffect) {
            this.createHitEffect(target);
        }
        this.startFadeOut();
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
