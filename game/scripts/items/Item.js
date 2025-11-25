/**
 * Item - Base class for all collectible items
 * Provides common functionality for pickups, power-ups, and consumables
 */
class Item extends Entity {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        
        // Item-specific properties
        this.type = 'item';
        this.value = 1;
        this.collectible = true;
        this.collected = false;
        this.magnetRange = 50; // Distance at which item is attracted to player
        this.magnetSpeed = 3;
        this.autoCollect = false; // Some items auto-collect when near
        
        // Visual properties
        this.bobHeight = 4; // How much the item bobs up and down
        this.bobSpeed = 2; // Speed of bobbing animation
        this.bobTime = Math.random() * Math.PI * 2; // Random start time for bobbing
        this.originalY = y;
        this.glowSize = 0;
        this.glowDirection = 1;
        
        // Physics - items are affected by gravity but with reduced effect
        this.gravity = 0.2;
        this.friction = 0.9;
        this.maxSpeed = { x: 3, y: 8 };
        this.bounceDecay = 0.7; // How much bounce is lost on collision
        
        // Collection effects
        this.collectSound = 'item_pickup';
        this.collectEffect = true;
        this.collectMessage = '';
        this.collectScore = 0;
        
        // Lifetime properties
        this.hasLifetime = false;
        this.lifetime = 30000; // 30 seconds default
        this.age = 0;
        this.blinkTime = 5000; // Start blinking 5 seconds before expiration
        this.blinking = false;
        this.blinkTimer = 0;
        
        // Spawning animation
        this.spawnAnimation = true;
        this.spawnTime = 0;
        this.spawnDuration = 300;
        this.spawnScale = 0.1;
    }

    /**
     * Update item behavior
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        if (this.collected) return;
        
        // Update spawning animation
        if (this.spawnAnimation) {
            this.updateSpawnAnimation(deltaTime);
        }
        
        // Update bobbing animation
        this.updateBobbingAnimation(deltaTime);
        
        // Update magnetic attraction to player
        this.updateMagnetism();
        
        // Update lifetime and blinking
        this.updateLifetime(deltaTime);
        
        // Custom item logic
        this.onItemUpdate(deltaTime);
    }

    /**
     * Update spawning animation
     * @param {number} deltaTime - Time since last frame
     */
    updateSpawnAnimation(deltaTime) {
        this.spawnTime += deltaTime;
        const progress = Math.min(this.spawnTime / this.spawnDuration, 1);
        
        // Scale from small to normal size
        this.scale.x = this.scale.y = this.spawnScale + (1 - this.spawnScale) * progress;
        
        // Small upward velocity when spawning
        if (progress < 0.5) {
            this.velocity.y = -2;
        }
        
        // End spawn animation
        if (progress >= 1) {
            this.spawnAnimation = false;
            this.scale.x = this.scale.y = 1;
        }
    }

    /**
     * Update bobbing animation
     * @param {number} deltaTime - Time since last frame
     */
    updateBobbingAnimation(deltaTime) {
        this.bobTime += (deltaTime / 1000) * this.bobSpeed;
        
        // Only bob if on ground or floating
        if (this.onGround || Math.abs(this.velocity.y) < 0.5) {
            const bobOffset = Math.sin(this.bobTime) * this.bobHeight;
            this.y = this.originalY + bobOffset;
        } else {
            this.originalY = this.y; // Update base position when moving
        }
        
        // Update glow effect
        this.glowSize += this.glowDirection * deltaTime / 100;
        if (this.glowSize > 5) {
            this.glowSize = 5;
            this.glowDirection = -1;
        } else if (this.glowSize < 0) {
            this.glowSize = 0;
            this.glowDirection = 1;
        }
    }

    /**
     * Update magnetic attraction to player
     */
    updateMagnetism() {
        if (!this.game || !this.game.player || !this.collectible) return;
        
        const player = this.game.player;
        const distance = CollisionDetection.getDistance(this, player);
        
        // Attract to player if within magnet range
        if (distance <= this.magnetRange) {
            const attraction = Math.min(1, (this.magnetRange - distance) / this.magnetRange);
            const direction = {
                x: (player.x + player.width / 2) - (this.x + this.width / 2),
                y: (player.y + player.height / 2) - (this.y + this.height / 2)
            };
            
            const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
            if (magnitude > 0) {
                this.velocity.x += (direction.x / magnitude) * this.magnetSpeed * attraction * 0.5;
                this.velocity.y += (direction.y / magnitude) * this.magnetSpeed * attraction * 0.3;
            }
            
            // Auto-collect if very close
            if (this.autoCollect && distance < 20) {
                this.collect(player);
            }
        }
    }

    /**
     * Update lifetime and blinking effects
     * @param {number} deltaTime - Time since last frame
     */
    updateLifetime(deltaTime) {
        if (!this.hasLifetime) return;
        
        this.age += deltaTime;
        
        // Start blinking near expiration
        if (this.age >= this.lifetime - this.blinkTime) {
            this.blinking = true;
            this.blinkTimer += deltaTime;
            
            // Blink faster as expiration approaches
            const timeLeft = this.lifetime - this.age;
            const blinkRate = Math.max(100, timeLeft / 10);
            
            if (this.blinkTimer >= blinkRate) {
                this.visible = !this.visible;
                this.blinkTimer = 0;
            }
        }
        
        // Remove item when lifetime expires
        if (this.age >= this.lifetime) {
            this.onExpired();
            this.active = false;
        }
    }

    /**
     * Attempt to collect this item
     * @param {Entity} collector - Entity trying to collect the item
     * @returns {boolean} True if successfully collected
     */
    collect(collector) {
        if (this.collected || !this.collectible) return false;
        
        this.collected = true;
        this.visible = false;
        this.active = false;
        
        // Apply item effect
        const success = this.applyEffect(collector);
        
        if (success) {
            // Create collection effect
            this.createCollectionEffect();
            
            // Play collection sound
            if (this.game.audioManager && this.collectSound) {
                this.game.audioManager.playSound(this.collectSound, 0.7);
            }
            
            // Show collection message
            if (this.collectMessage) {
                this.showCollectionMessage();
            }
            
            // Award score
            if (this.collectScore > 0 && collector.score !== undefined) {
                collector.score += this.collectScore;
                if (collector.updateUI) collector.updateUI();
            }
            
            // Trigger collection callback
            this.onCollected(collector);
        }
        
        return success;
    }

    /**
     * Apply the item's effect to the collector
     * @param {Entity} collector - Entity collecting the item
     * @returns {boolean} True if effect was successfully applied
     */
    applyEffect(collector) {
        // Override in subclasses
        return true;
    }

    /**
     * Create visual effect when item is collected
     */
    createCollectionEffect() {
        // TODO: Add particle effects
        // This would create sparkles, poof effects, etc.
    }

    /**
     * Show collection message to player
     */
    showCollectionMessage() {
        // TODO: Add floating text system
        // This would show "+10 Coins", "Health Restored", etc.
    }

    /**
     * Handle item bouncing off surfaces
     * @param {Object} collision - Collision information
     */
    handleBounce(collision) {
        if (collision.bottom && this.velocity.y > 0) {
            this.velocity.y *= -this.bounceDecay;
            this.onGround = true;
        }
        if (collision.top && this.velocity.y < 0) {
            this.velocity.y *= -this.bounceDecay;
        }
        if ((collision.left || collision.right) && Math.abs(this.velocity.x) > 0.5) {
            this.velocity.x *= -this.bounceDecay;
        }
    }

    /**
     * Render item with glow and effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible || this.collected) return;
        
        // Draw main item sprite only (no glow)
        super.render(ctx, camera);
        
        // Draw additional effects (disabled for now)
        // this.renderEffects(ctx, camera);
    }

    /**
     * Render glow effect around item (disabled)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderGlow(ctx, camera) {
        // Glow disabled to prevent rectangles
        return;
    }

    /**
     * Get the glow color for this item
     * @returns {string} CSS color string
     */
    getGlowColor() {
        return '#FFD700'; // Gold glow by default
    }

    /**
     * Render additional visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderEffects(ctx, camera) {
        // Override in subclasses for item-specific effects
    }

    /**
     * Check if item should be collected by entity
     * @param {Entity} entity - Entity to check collision with
     * @returns {boolean} True if collision detected and should collect
     */
    checkCollision(entity) {
        if (this.collected || !this.collectible) return false;
        return CollisionDetection.entityCollision(this, entity);
    }

    /**
     * Set item lifetime
     * @param {number} lifetime - Lifetime in milliseconds
     */
    setLifetime(lifetime) {
        this.hasLifetime = true;
        this.lifetime = lifetime;
    }

    /**
     * Make item auto-collect when near player
     * @param {boolean} autoCollect - Enable auto-collection
     */
    setAutoCollect(autoCollect) {
        this.autoCollect = autoCollect;
    }

    // Virtual methods (override in subclasses)
    onItemUpdate(deltaTime) {}
    onCollected(collector) {}
    onExpired() {}
}

/**
 * RockItem - Collectible rocks for throwing
 */
class RockItem extends Item {
    constructor(x, y, rockCount = 5) {
        super(x, y, 12, 12);
        
        this.type = 'rocks';
        this.value = rockCount;
        this.collectSound = 'special';
        this.collectMessage = `+${rockCount} Rocks`;
        this.collectScore = 5;
        
        // Visual properties
        this.fallbackColor = '#8B4513'; // Brown color for rocks
        this.bobHeight = 2;
        this.bobSpeed = 1.5;
        
        // Load rock sprite (if available)
        this.loadSprite('art/items/rocks.png');
    }

    onCollected(collector) {
        if (collector.addRocks) {
            collector.addRocks(this.value);
        }
        return true;
    }

    /**
     * Create a scattered group of rock items
     * @param {number} x - Center X position
     * @param {number} y - Center Y position  
     * @param {number} count - Number of rock piles
     * @param {number} rocksPerPile - Rocks per pile
     * @returns {Array} Array of RockItem instances
     */
    static createScattered(x, y, count = 1, rocksPerPile = 3) {
        const items = [];
        const spreadRadius = 30;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = Math.random() * spreadRadius;
            const itemX = x + Math.cos(angle) * distance;
            const itemY = y + Math.sin(angle) * distance;
            
            items.push(new RockItem(itemX, itemY, rocksPerPile));
        }
        
        return items;
    }
}