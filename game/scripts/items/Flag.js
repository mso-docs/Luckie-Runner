/**
 * Flag - Level completion objective
 * Players must touch the flag to complete the level
 */
class Flag extends Entity {
    constructor(x, y) {
        super(x, y, 32, 80); // Flag dimensions
        
        // Flag properties
        this.type = 'flag';
        this.active = true;
        this.collected = false;
        
        // Animation properties
        this.animationTime = 0;
        this.waveSpeed = 3;
        this.waveAmplitude = 2;
        
        // Pole properties
        this.poleWidth = 4;
        this.poleHeight = 80;
        this.flagWidth = 28;
        this.flagHeight = 20;
        
        // Colors
        this.poleColor = '#8B4513';
        this.flagColor = '#FF6B6B';
        this.flagAccentColor = '#FF4444';
        
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
        
        this.animationTime += deltaTime / 1000;
        
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
        
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Only render if on screen
        if (screenX + this.width < 0 || screenX > ctx.canvas.width ||
            screenY + this.height < 0 || screenY > ctx.canvas.height) {
            return;
        }
        
        // Save context
        ctx.save();
        
        // Render pole
        ctx.fillStyle = this.poleColor;
        ctx.fillRect(
            screenX,
            screenY,
            this.poleWidth,
            this.poleHeight
        );
        
        // Add pole highlight
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(
            screenX,
            screenY,
            this.poleWidth - 1,
            this.poleHeight
        );
        
        // Calculate flag animation
        const waveOffset = Math.sin(this.animationTime * this.waveSpeed) * this.waveAmplitude;
        const completionScale = this.isCompleting ? 
            1 + Math.sin(this.completionTime * 10) * 0.1 : 1;
        
        // Render flag
        const flagX = screenX + this.poleWidth;
        const flagY = screenY + 10 + waveOffset;
        
        ctx.save();
        ctx.translate(flagX + this.flagWidth / 2, flagY + this.flagHeight / 2);
        ctx.scale(completionScale, completionScale);
        
        // Flag background
        ctx.fillStyle = this.flagColor;
        ctx.fillRect(
            -this.flagWidth / 2,
            -this.flagHeight / 2,
            this.flagWidth,
            this.flagHeight
        );
        
        // Flag stripe
        ctx.fillStyle = this.flagAccentColor;
        ctx.fillRect(
            -this.flagWidth / 2,
            -this.flagHeight / 2 + 5,
            this.flagWidth,
            3
        );
        
        // Flag border
        ctx.strokeStyle = '#CC0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            -this.flagWidth / 2,
            -this.flagHeight / 2,
            this.flagWidth,
            this.flagHeight
        );
        
        ctx.restore();
        
        // Render completion glow effect
        if (this.isCompleting) {
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
        
        // Debug rendering
        if (this.game && this.game.debug) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, this.width, this.height);
            
            // Show collection radius
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX - 5, screenY - 5, this.width + 10, this.height + 10);
        }
        
        // Restore context
        ctx.restore();
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