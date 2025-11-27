/**
 * Flag - Level completion objective
 * Players must touch the flag to complete the level
 */
class Flag extends Entity {
    constructor(x, y) {
        super(x, y, 64, 128); // Matches sprite frame size

        // Flag properties
        this.type = 'flag';
        this.active = true;
        this.collected = false;

        // Sprite sheet animation (two-frame wave)
        this.loadTileSheet('art/items/flag.png', 64, 128, [0, 1], 260);

        // Completion effect
        this.completionTime = 0;
        this.isCompleting = false;
    }
    
    /**
     * Update flag animation
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (!this.active) return;

        // Advance sprite animation frames (simple two-frame loop)
        this.updateAnimation(deltaTime);

        if (this.isCompleting) {
            this.completionTime += deltaTime / 1000;
            
            // Trigger victory after completion animation
            if (this.completionTime > 1.0 && this.game) {
                // Triggering victory after completion animation
                this.game.stateManager.victory();
                this.isCompleting = false; // Prevent multiple calls
            }
        }
    }
    
    /**
     * Check collision with player
     * @param {Player} player - Player object
     * @returns {boolean} - True if collision occurred
     */
    checkCollision(player) {
        if (!this.active || this.collected) return false;
        
        const playerBounds = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const flagBounds = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
        
        return CollisionDetection.rectangleCollision(playerBounds, flagBounds);
    }
    
    /**
     * Collect the flag (complete the level)
     * @param {Player} player - Player who collected the flag
     * @returns {boolean} - True if successfully collected
     */
    collect(player) {
        if (this.collected || !this.active) {
            // Flag already collected or inactive
            return false;
        }
        
        // FLAG COLLECTED! Starting completion sequence
        this.collected = true;
        this.isCompleting = true;
        this.completionTime = 0;
        
        // Add bonus score for completing level
        if (player) {
            player.score += 500;
            player.updateUI();
            // Added bonus points
        }

        // Play completion sound
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound('level', 0.8);
        }

        // Level completed! Flag collected
        return true;
    }
    
    /**
     * Render the flag
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    render(ctx, camera) {
        if (!this.active) return;

        // Apply a subtle scale pulse on completion
        const originalScaleX = this.scale.x;
        const originalScaleY = this.scale.y;
        if (this.isCompleting) {
            const completionScale = 1 + Math.sin(this.completionTime * 10) * 0.08;
            this.scale.x = completionScale;
            this.scale.y = completionScale;
        }

        // Draw sprite (includes shadow)
        super.render(ctx, camera);

        // Restore scale for future renders
        this.scale.x = originalScaleX;
        this.scale.y = originalScaleY;

        // Render completion glow effect
        if (this.isCompleting) {
            const screenX = this.x - camera.x;
            const screenY = this.y - camera.y;
            const glowAlpha = Math.abs(Math.sin(this.completionTime * 8)) * 0.5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = `rgba(255, 107, 107, ${glowAlpha})`;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha * 0.3})`;
            ctx.fillRect(
                screenX - 10,
                screenY - 10,
                this.width + 20,
                this.height + 20
            );
            
            ctx.shadowBlur = 0;
        }
    }
    
    /**
     * Get collision bounds for the flag
     * @returns {Object} - Collision bounds
     */
    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    /**
     * Create a flag at specified position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Flag} - New flag instance
     */
    static create(x, y) {
        return new Flag(x, y);
    }
}
