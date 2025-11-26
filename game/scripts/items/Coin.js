/**
 * Coin - Basic collectible currency
 * Awards points and can be used in shops
 */
class Coin extends Item {
    constructor(x, y, value = 1) {
        super(x, y, 16, 16);
        
        this.type = 'coin';
        this.value = value;
        this.collectScore = value * 10;
        this.collectMessage = `+${value} Coin${value > 1 ? 's' : ''}`;
        this.collectSound = 'coin';
        
        // Coin-specific properties
        this.magnetRange = 60; // Coins are more magnetic
        this.autoCollect = true;
        this.spinSpeed = 0; // Disable manual spin; use sheet animation only
        this.sparkleTimer = 0;
        this.sparkleInterval = 500; // Sparkle every 500ms
        
        // Different coin types based on value
        this.setupCoinType(value);
        
        // Animation setup
        this.setupAnimations();
        this.playAnimation('spin');
        
        // Set fallback color (gold for coins)
        this.fallbackColor = '#FFD700';
        
        // Load shared sheet (4 frames, 24x23)
        this.loadTileSheet('art/items/coin-sheet.png', 24, 23, [0, 1, 2, 3], 140);
    }

    /**
     * Set up coin appearance based on value
     * @param {number} value - Coin value
     */
    setupCoinType(value) {
        if (value >= 5) {
            // Gold coin
            this.width = this.height = 40;
            this.glowColor = '#FFD700';
            this.sparkleColor = '#FFF700';
            this.collectScore = value * 15;
        } else if (value >= 3) {
            // Silver coin
            this.width = this.height = 36;
            this.glowColor = '#C0C0C0';
            this.sparkleColor = '#E0E0E0';
            this.collectScore = value * 12;
        } else {
            // Bronze/copper coin
            this.width = this.height = 32;
            this.glowColor = '#CD7F32';
            this.sparkleColor = '#DAA520';
            this.collectScore = value * 10;
        }
    }

    /**
     * Set up coin spin animation
     */
    setupAnimations() {
        const frameWidth = 24;
        const frameHeight = 23;
        
        // Spinning animation - use 4-frame sheet
        this.addAnimation('spin', [
            { x: 0 * frameWidth, y: 0, width: frameWidth, height: frameHeight },
            { x: 1 * frameWidth, y: 0, width: frameWidth, height: frameHeight },
            { x: 2 * frameWidth, y: 0, width: frameWidth, height: frameHeight },
            { x: 3 * frameWidth, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Set animation speed - slower for better visibility
        this.animations.spin.speed = 140;
    }

    /**
     * Update coin-specific behavior
     * @param {number} deltaTime - Time since last frame
     */
    onItemUpdate(deltaTime) {
        // Update sparkle timer
        this.sparkleTimer += deltaTime;
    }

    /**
     * Render coin with gold glow
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible) return;
        
        ctx.save();
        ctx.shadowColor = 'rgba(255,215,0,0.8)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        super.render(ctx, camera);
        ctx.restore();
    }

    /**
     * Apply coin collection effect
     * @param {Entity} collector - Entity collecting the coin
     * @returns {boolean} True if successfully collected
     */
    applyEffect(collector) {
        if (collector.collectCoin) {
            collector.collectCoin(this.value);
            return true;
        } else if (collector.coins !== undefined) {
            collector.coins += this.value;
            if (collector.updateUI) collector.updateUI();
            return true;
        }
        return false;
    }

    /**
     * Get glow color for coin
     * @returns {string} CSS color string
     */
    getGlowColor() {
        return this.glowColor || '#FFD700';
    }

    /**
     * Render coin with sparkle effects (disabled)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderEffects(ctx, camera) {
        // Effects disabled to prevent rectangles
        return;
    }

    /**
     * Render sparkle effects around coin (now disabled)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderSparkles(ctx, camera) {
        // Sparkles disabled to prevent rectangles
        return;
    }

    /**
     * Draw a star shape
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} innerRadius - Inner radius
     * @param {number} outerRadius - Outer radius
     */
    drawStar(ctx, x, y, innerRadius, outerRadius) {
        const points = 4;
        const rotation = Date.now() / 1000; // Rotating sparkles
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const pointX = Math.cos(angle) * radius;
            const pointY = Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(pointX, pointY);
            } else {
                ctx.lineTo(pointX, pointY);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Called when coin is collected
     * @param {Entity} collector - Entity that collected the coin
     */
    onCollected(collector) {
        // Create special effect for valuable coins
        if (this.value >= 5) {
            this.createCoinBurst();
        }
        
        // Add extra score for combos (if implemented)
        if (this.game && this.game.coinCombo) {
            this.game.coinCombo.addCoin(this.value);
        }
    }

    /**
     * Create burst effect for valuable coins
     */
    createCoinBurst() {
        // TODO: Add particle burst effect
        // This would create golden particles radiating outward
    }

    /**
     * Create a coin with specific value and position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} value - Coin value
     * @returns {Coin} New coin instance
     */
    static create(x, y, value = 1) {
        return new Coin(x, y, value);
    }

    /**
     * Create multiple coins scattered around a position
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} count - Number of coins
     * @param {number} value - Value per coin
     * @returns {Array<Coin>} Array of coin instances
     */
    static createScattered(x, y, count, value = 1) {
        const coins = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const distance = 20 + Math.random() * 20;
            const coinX = x + Math.cos(angle) * distance;
            const coinY = y + Math.sin(angle) * distance;
            
            const coin = new Coin(coinX, coinY, value);
            
            // Give coins some initial velocity for scatter effect
            coin.velocity.x = Math.cos(angle) * 2;
            coin.velocity.y = Math.sin(angle) * 2 - 3; // Slight upward arc
            
            coins.push(coin);
        }
        
        return coins;
    }

    /**
     * Create a trail of coins
     * @param {number} startX - Start X position
     * @param {number} startY - Start Y position
     * @param {number} endX - End X position
     * @param {number} endY - End Y position
     * @param {number} count - Number of coins in trail
     * @param {number} value - Value per coin
     * @returns {Array<Coin>} Array of coin instances
     */
    static createTrail(startX, startY, endX, endY, count, value = 1) {
        const coins = [];
        
        for (let i = 0; i < count; i++) {
            const progress = i / (count - 1);
            const coinX = startX + (endX - startX) * progress;
            const coinY = startY + (endY - startY) * progress;
            
            const coin = new Coin(coinX, coinY, value);
            coins.push(coin);
        }
        
        return coins;
    }
}
