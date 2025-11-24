/**
 * Entity - Base class for all game objects
 * Provides common properties and methods for sprites, enemies, items, etc.
 */
class Entity {
    constructor(x, y, width, height) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Physics properties
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.maxSpeed = { x: 5, y: 15 };
        this.friction = 0.8;
        this.gravity = 0.5;
        this.onGround = false;
        
        // Collision properties
        this.collisionOffset = { x: 0, y: 0 };
        this.collisionWidth = width;
        this.collisionHeight = height;
        this.solid = true;
        
        // Rendering properties
        this.sprite = null;
        this.spriteLoaded = false;
        this.visible = true;
        this.alpha = 1.0;
        this.rotation = 0;
        this.scale = { x: 1, y: 1 };
        this.flipX = false;
        this.flipY = false;
        
        // Animation properties
        this.animations = {};
        this.currentAnimation = null;
        this.animationFrame = 0;
        this.animationTime = 0;
        this.animationSpeed = 100; // ms per frame
        
        // State properties
        this.active = true;
        this.health = 100;
        this.maxHealth = 100;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        // Game references
        this.game = null;
    }

    /**
     * Load sprite image
     * @param {string} imagePath - Path to sprite image
     */
    loadSprite(imagePath) {
        this.sprite = new Image();
        this.spriteLoaded = false;
        this.sprite.onload = () => {
            this.spriteLoaded = true;
        };
        this.sprite.onerror = () => {
            this.spriteLoaded = false;
            this.sprite = null;
        };
        this.sprite.src = imagePath;
    }

    /**
     * Add an animation sequence
     * @param {string} name - Animation name
     * @param {Array} frames - Array of frame objects {x, y, width, height}
     * @param {boolean} loop - Whether animation should loop
     */
    addAnimation(name, frames, loop = true) {
        this.animations[name] = {
            frames: frames,
            loop: loop,
            speed: this.animationSpeed
        };
    }

    /**
     * Play an animation
     * @param {string} name - Animation name
     * @param {boolean} restart - Force restart if already playing
     */
    playAnimation(name, restart = false) {
        if (this.currentAnimation !== name || restart) {
            this.currentAnimation = name;
            this.animationFrame = 0;
            this.animationTime = 0;
        }
    }

    /**
     * Update entity (called each frame)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (!this.active) return;

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
            }
        }

        // Apply physics
        this.updatePhysics(deltaTime);
        
        // Update animations
        this.updateAnimation(deltaTime);
        
        // Custom update logic (override in subclasses)
        this.onUpdate(deltaTime);
    }

    /**
     * Update physics (gravity, movement, friction)
     * @param {number} deltaTime - Time since last frame
     */
    updatePhysics(deltaTime) {
        // Apply gravity
        if (!this.onGround) {
            this.velocity.y += this.gravity;
        }

        // Apply friction
        this.velocity.x *= this.friction;

        // Clamp velocities to max speeds
        this.velocity.x = Math.max(-this.maxSpeed.x, Math.min(this.maxSpeed.x, this.velocity.x));
        this.velocity.y = Math.max(-this.maxSpeed.y, Math.min(this.maxSpeed.y, this.velocity.y));

        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    /**
     * Update animation frames
     * @param {number} deltaTime - Time since last frame
     */
    updateAnimation(deltaTime) {
        if (!this.currentAnimation || !this.animations[this.currentAnimation]) return;

        const animation = this.animations[this.currentAnimation];
        this.animationTime += deltaTime;

        if (this.animationTime >= animation.speed) {
            this.animationTime = 0;
            this.animationFrame++;

            if (this.animationFrame >= animation.frames.length) {
                if (animation.loop) {
                    this.animationFrame = 0;
                } else {
                    this.animationFrame = animation.frames.length - 1;
                    this.onAnimationComplete(this.currentAnimation);
                }
            }
        }
    }

    /**
     * Render entity on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object for screen position
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible) return;

        // Calculate screen position
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Don't render if off screen
        if (screenX + this.width < 0 || screenX > ctx.canvas.width ||
            screenY + this.height < 0 || screenY > ctx.canvas.height) {
            return;
        }

        ctx.save();
        
        // Apply transformations
        ctx.globalAlpha = this.alpha;
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        ctx.scale(this.scale.x, this.scale.y);

        // Draw sprite or animation frame if available
        if (this.sprite && this.spriteLoaded) {
            if (this.currentAnimation && this.animations[this.currentAnimation]) {
                const animation = this.animations[this.currentAnimation];
                const frame = animation.frames[this.animationFrame];
                
                ctx.drawImage(
                    this.sprite,
                    frame.x, frame.y, frame.width, frame.height,
                    -this.width / 2, -this.height / 2, this.width, this.height
                );
            } else {
                // Draw entire sprite
                ctx.drawImage(
                    this.sprite,
                    -this.width / 2, -this.height / 2, this.width, this.height
                );
            }
        }
        // No fallback rendering - sprites only

        ctx.restore();
    }



    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @param {Entity} source - Source of damage (optional)
     */
    takeDamage(amount, source = null) {
        if (this.invulnerable) return false;

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.onDeath(source);
        } else {
            this.onTakeDamage(amount, source);
        }
        return true;
    }

    /**
     * Heal entity
     * @param {number} amount - Heal amount
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.onHeal(amount);
    }

    /**
     * Make entity invulnerable for specified time
     * @param {number} duration - Invulnerability duration in ms
     */
    makeInvulnerable(duration) {
        this.invulnerable = true;
        this.invulnerabilityTime = duration;
    }

    /**
     * Get center position
     * @returns {Object} Center position {x, y}
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    /**
     * Set center position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setCenter(x, y) {
        this.x = x - this.width / 2;
        this.y = y - this.height / 2;
    }

    // Virtual methods (override in subclasses)
    onUpdate(deltaTime) {}
    onTakeDamage(amount, source) {}
    onDeath(source) { this.active = false; }
    onHeal(amount) {}
    onAnimationComplete(animationName) {}
}