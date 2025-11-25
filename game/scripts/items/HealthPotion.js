/**
 * HealthPotion - Collectible that restores player health
 * Provides healing and temporary regeneration effects
 */
class HealthPotion extends Item {
    constructor(x, y, healAmount = 25, regeneration = false) {
        super(x, y, 12, 16);
        
        this.type = 'health_potion';
        this.healAmount = healAmount;
        this.hasRegeneration = regeneration;
        this.regenAmount = 2; // HP per second
        this.regenDuration = 5000; // 5 seconds
        this.collectMessage = `+${healAmount} Health`;
        
        // Set appropriate sound based on potion type
        if (healAmount >= 50) {
            this.collectSound = 'great'; // Greater health potion
        } else if (healAmount >= 25) {
            this.collectSound = 'less'; // Standard health potion (red rectangle)
        } else {
            this.collectSound = 'health'; // Minor health potion
        }
        
        this.collectScore = healAmount;
        
        // Health potion specific properties
        this.magnetRange = 40;
        this.autoCollect = false; // Player must actively collect health
        this.bubbleTimer = 0;
        this.bubbleInterval = 800; // Bubble effect every 800ms
        
        // Different potion types based on heal amount
        this.setupPotionType(healAmount);
        
        // Animation setup
        this.setupAnimations();
        this.playAnimation('bubble');
        
        // Set fallback color (red for health potions)
        this.fallbackColor = '#ff4444';
        
        // Load sprite (using placeholder for now)
        this.setupSprite();
    }

    /**
     * Set up potion appearance based on heal amount
     * @param {number} healAmount - Amount of health restored
     */
    setupPotionType(healAmount) {
        if (healAmount >= 50) {
            // Greater health potion
            this.width = this.height = 18;
            this.glowColor = '#FF0080'; // Magenta
            this.liquidColor = '#FF69B4';
            this.bottleColor = '#8B008B';
            this.collectMessage = `+${healAmount} Health (Greater)`;
            this.hasRegeneration = true;
            this.regenDuration = 8000;
        } else if (healAmount >= 25) {
            // Standard health potion
            this.width = 12;
            this.height = 16;
            this.glowColor = '#FF4444'; // Red
            this.liquidColor = '#FF6666';
            this.bottleColor = '#800000';
            this.collectMessage = `+${healAmount} Health`;
        } else {
            // Minor health potion
            this.width = 10;
            this.height = 14;
            this.glowColor = '#FFB3B3'; // Light red
            this.liquidColor = '#FFCCCC';
            this.bottleColor = '#A0522D';
            this.collectMessage = `+${healAmount} Health (Minor)`;
        }
        
        // Set collision bounds
        this.collisionOffset = { x: 1, y: 1 };
        this.collisionWidth = this.width - 2;
        this.collisionHeight = this.height - 2;
    }

    /**
     * Set up health potion animations
     */
    setupAnimations() {
        const frameWidth = this.width;
        const frameHeight = this.height;
        
        // Bubbling animation - liquid bubbling inside bottle
        this.addAnimation('bubble', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: frameWidth, y: 0, width: frameWidth, height: frameHeight },
            { x: frameWidth * 2, y: 0, width: frameWidth, height: frameHeight },
            { x: frameWidth, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        this.animations.bubble.speed = 400;
    }

    /**
     * Set up sprite rendering (custom drawing for now)
     */
    setupSprite() {
        // For now, we'll use custom rendering instead of a sprite file
        // This allows us to create different colored potions programmatically
        this.useCustomRendering = true;
    }

    /**
     * Update health potion specific behavior
     * @param {number} deltaTime - Time since last frame
     */
    onItemUpdate(deltaTime) {
        // Update bubble timer
        this.bubbleTimer += deltaTime;
        
        // Create floating bubbles occasionally
        if (this.bubbleTimer >= this.bubbleInterval) {
            this.createBubble();
            this.bubbleTimer = 0;
        }
    }

    /**
     * Apply health potion effect
     * @param {Entity} collector - Entity collecting the potion
     * @returns {boolean} True if successfully applied
     */
    applyEffect(collector) {
        if (!collector.health !== undefined) return false;
        
        // Don't apply if already at full health (unless it's a greater potion)
        if (collector.health >= collector.maxHealth && this.healAmount < 50) {
            return false;
        }
        
        // Apply immediate healing
        const oldHealth = collector.health;
        if (collector.heal) {
            collector.heal(this.healAmount);
        } else {
            collector.health = Math.min(collector.maxHealth, collector.health + this.healAmount);
        }
        
        const actualHealing = collector.health - oldHealth;
        
        // Apply regeneration effect if applicable
        if (this.hasRegeneration && collector.addStatusEffect) {
            collector.addStatusEffect('regeneration', this.regenDuration, this.regenAmount);
        }
        
        // Update UI
        if (collector.updateHealthUI) {
            collector.updateHealthUI();
        }
        
        // Create healing visual effect
        this.createHealingEffect(collector, actualHealing);
        
        return actualHealing > 0;
    }

    /**
     * Create healing visual effect on the collector
     * @param {Entity} collector - Entity being healed
     * @param {number} amount - Amount healed
     */
    createHealingEffect(collector, amount) {
        // TODO: Add healing particle effects
        // This would create green + symbols floating upward
        
        // For now, just show a simple effect
        if (this.game && this.game.effectSystem) {
            this.game.effectSystem.createHealingNumbers(
                collector.x + collector.width / 2,
                collector.y,
                amount
            );
        }
    }

    /**
     * Create a bubble effect
     */
    createBubble() {
        // TODO: Add small bubble particle rising from potion
        // This would create small spheres that float upward and fade
    }

    /**
     * Get glow color for potion
     * @returns {string} CSS color string
     */
    getGlowColor() {
        return this.glowColor || '#FF4444';
    }

    /**
     * Custom render for health potion
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible || this.collected) return;
        
        // Draw glow effect
        this.renderGlow(ctx, camera);
        
        if (this.useCustomRendering) {
            this.renderCustomPotion(ctx, camera);
        } else {
            // Use sprite if available
            super.render(ctx, camera);
        }
        
        // Draw additional effects
        this.renderEffects(ctx, camera);
    }

    /**
     * Custom render potion bottle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderCustomPotion(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        ctx.save();
        
        // Apply transformations
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        ctx.scale(this.scale.x, this.scale.y);
        ctx.globalAlpha = this.alpha;
        
        // Draw bottle outline
        ctx.strokeStyle = this.bottleColor || '#800000';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Glass effect
        
        // Bottle body (rounded rectangle)
        const bodyWidth = this.width - 4;
        const bodyHeight = this.height * 0.7;
        const bodyX = -bodyWidth / 2;
        const bodyY = -this.height / 2 + this.height * 0.3;
        
        this.drawRoundedRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 3);
        ctx.fill();
        ctx.stroke();
        
        // Bottle neck
        const neckWidth = bodyWidth * 0.4;
        const neckHeight = this.height * 0.3;
        const neckX = -neckWidth / 2;
        const neckY = -this.height / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.drawRoundedRect(ctx, neckX, neckY, neckWidth, neckHeight, 2);
        ctx.fill();
        ctx.stroke();
        
        // Liquid inside bottle
        ctx.fillStyle = this.liquidColor || '#FF6666';
        ctx.globalAlpha = 0.8;
        
        // Animate liquid level slightly
        const liquidLevel = 0.8 + Math.sin(this.bobTime) * 0.05;
        const liquidHeight = bodyHeight * liquidLevel;
        const liquidY = bodyY + (bodyHeight - liquidHeight);
        
        this.drawRoundedRect(ctx, bodyX + 1, liquidY, bodyWidth - 2, liquidHeight - 1, 2);
        ctx.fill();
        
        // Cork/cap
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#8B4513'; // Brown cork
        const capWidth = neckWidth;
        const capHeight = 3;
        const capX = -capWidth / 2;
        const capY = -this.height / 2 - 1;
        
        ctx.fillRect(capX, capY, capWidth, capHeight);
        
        ctx.restore();
    }

    /**
     * Draw rounded rectangle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} radius - Corner radius
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Render health potion effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderEffects(ctx, camera) {
        // Render healing aura for greater potions
        if (this.healAmount >= 50) {
            this.renderHealingAura(ctx, camera);
        }
    }

    /**
     * Render healing aura around greater potions
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderHealingAura(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        const centerX = screenX + this.width / 2;
        const centerY = screenY + this.height / 2;
        
        ctx.save();
        
        // Pulsing healing aura
        const pulseTime = Date.now() % 2000;
        const pulse = Math.sin(pulseTime / 2000 * Math.PI * 2) * 0.3 + 0.7;
        
        ctx.globalAlpha = 0.2 * pulse;
        ctx.fillStyle = '#00FF00'; // Green healing light
        
        // Draw multiple aura rings
        for (let i = 0; i < 3; i++) {
            const radius = (this.width / 2 + 5) + i * 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha *= 0.6;
        }
        
        ctx.restore();
    }

    /**
     * Called when health potion is collected
     * @param {Entity} collector - Entity that collected the potion
     */
    onCollected(collector) {
        // Create special effect for greater potions
        if (this.healAmount >= 50) {
            this.createGreaterHealEffect();
        }
    }

    /**
     * Create special effect for greater health potions
     */
    createGreaterHealEffect() {
        // TODO: Add enhanced healing particle effects
        // This would create a burst of green healing energy
    }

    /**
     * Create health potion with specific healing amount
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} healAmount - Amount to heal
     * @param {boolean} regeneration - Whether to include regeneration
     * @returns {HealthPotion} New health potion instance
     */
    static create(x, y, healAmount = 25, regeneration = false) {
        return new HealthPotion(x, y, healAmount, regeneration);
    }

    /**
     * Create a minor health potion
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {HealthPotion} Minor health potion
     */
    static createMinor(x, y) {
        return new HealthPotion(x, y, 10, false);
    }

    /**
     * Create a standard health potion
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {HealthPotion} Standard health potion
     */
    static createStandard(x, y) {
        return new HealthPotion(x, y, 25, false);
    }

    /**
     * Create a greater health potion
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {HealthPotion} Greater health potion
     */
    static createGreater(x, y) {
        return new HealthPotion(x, y, 50, true);
    }
}