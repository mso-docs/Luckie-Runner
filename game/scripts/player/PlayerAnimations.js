/**
 * PlayerAnimations - Helper class for managing player animation states
 * Provides smooth transitions and animation blending for the player character
 */
class PlayerAnimations {
    constructor(player) {
        this.player = player;
        this.previousAnimation = null;
        this.transitionTime = 0;
        this.maxTransitionTime = 100; // ms for smooth transitions
        this.dustEffects = [];
    }

    /**
     * Update animation system
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        this.updateTransitions(deltaTime);
        this.updateDustEffects(deltaTime);
        this.handleAnimationEffects();
    }

    /**
     * Handle smooth animation transitions
     * @param {number} deltaTime - Time since last frame
     */
    updateTransitions(deltaTime) {
        if (this.transitionTime > 0) {
            this.transitionTime -= deltaTime;
        }
    }

    /**
     * Play animation with smooth transition
     * @param {string} animationName - Animation to play
     * @param {boolean} force - Force animation change
     */
    playAnimation(animationName, force = false) {
        if (this.player.currentAnimation !== animationName || force) {
            this.previousAnimation = this.player.currentAnimation;
            this.player.playAnimation(animationName);
            this.transitionTime = this.maxTransitionTime;
        }
    }

    /**
     * Handle animation-specific effects
     */
    handleAnimationEffects() {
        const player = this.player;
        
        // Landing effects
        if (player.onGround && player.velocity.y > 5 && !player.wasOnGround) {
            this.createLandingDust();
            const audio = player.game?.services?.audio || player.game?.audioManager;
            if (audio) {
                audio.playSound?.('land', 0.4);
            }
        }
        
        // Running dust effects
        if (player.currentAnimation === 'run' && player.onGround) {
            if (Math.random() < 0.1) { // 10% chance per frame
                this.createRunningDust();
            }
        }
        
        // Dash effects
        if (player.isDashing) {
            this.createDashEffect();
        }
        
        // Jump effects
        if (player.currentAnimation === 'jump' && player.animationFrame === 0) {
            this.createJumpDust();
        }
        
        // Store previous ground state
        player.wasOnGround = player.onGround;
    }

    /**
     * Create dust effect when landing
     */
    createLandingDust() {
        const count = 5;
        for (let i = 0; i < count; i++) {
            this.dustEffects.push({
                x: this.player.x + Math.random() * this.player.width,
                y: this.player.y + this.player.height,
                velocityX: (Math.random() - 0.5) * 4,
                velocityY: -Math.random() * 2,
                size: Math.random() * 3 + 1,
                life: 300,
                maxLife: 300,
                color: '#8B4513'
            });
        }
    }

    /**
     * Create dust effect when running
     */
    createRunningDust() {
        this.dustEffects.push({
            x: this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 10,
            y: this.player.y + this.player.height,
            velocityX: -this.player.facing * 2 + (Math.random() - 0.5),
            velocityY: -Math.random(),
            size: Math.random() * 2 + 0.5,
            life: 200,
            maxLife: 200,
            color: '#D2B48C'
        });
    }

    /**
     * Create effect when jumping
     */
    createJumpDust() {
        const count = 3;
        for (let i = 0; i < count; i++) {
            this.dustEffects.push({
                x: this.player.x + Math.random() * this.player.width,
                y: this.player.y + this.player.height,
                velocityX: (Math.random() - 0.5) * 2,
                velocityY: Math.random() * 2,
                size: Math.random() * 2 + 1,
                life: 250,
                maxLife: 250,
                color: '#DEB887'
            });
        }
    }

    /**
     * Create dash trail effect
     */
    createDashEffect() {
        const count = 3;
        for (let i = 0; i < count; i++) {
            this.dustEffects.push({
                x: this.player.x + Math.random() * this.player.width,
                y: this.player.y + Math.random() * this.player.height,
                velocityX: -this.player.facing * 3 + (Math.random() - 0.5),
                velocityY: (Math.random() - 0.5) * 2,
                size: Math.random() * 2 + 1,
                life: 150,
                maxLife: 150,
                color: '#FFD700'
            });
        }
    }

    /**
     * Update dust particle effects
     * @param {number} deltaTime - Time since last frame
     */
    updateDustEffects(deltaTime) {
        this.dustEffects = this.dustEffects.filter(dust => {
            // Update position
            dust.x += dust.velocityX;
            dust.y += dust.velocityY;
            
            // Apply gravity and friction
            dust.velocityY += 0.1;
            dust.velocityX *= 0.98;
            
            // Update life
            dust.life -= deltaTime;
            
            return dust.life > 0;
        });
    }

    /**
     * Render dust effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera object
     */
    renderEffects(ctx, camera) {
        this.dustEffects.forEach(dust => {
            const screenX = dust.x - camera.x;
            const screenY = dust.y - camera.y;
            
            // Don't render off-screen effects
            if (screenX < -10 || screenX > ctx.canvas.width + 10 ||
                screenY < -10 || screenY > ctx.canvas.height + 10) {
                return;
            }
            
            ctx.save();
            
            // Fade out over time
            const alpha = dust.life / dust.maxLife;
            ctx.globalAlpha = alpha;
            
            // Set color
            ctx.fillStyle = dust.color;
            
            // Draw dust particle
            ctx.beginPath();
            ctx.arc(screenX, screenY, dust.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }

    /**
     * Get current animation frame info for advanced effects
     * @returns {Object} Frame information
     */
    getCurrentFrameInfo() {
        const player = this.player;
        const animation = player.animations[player.currentAnimation];
        
        if (!animation) return null;
        
        return {
            name: player.currentAnimation,
            frame: player.animationFrame,
            totalFrames: animation.frames.length,
            progress: player.animationFrame / animation.frames.length,
            timeInFrame: player.animationTime,
            frameData: animation.frames[player.animationFrame]
        };
    }

    /**
     * Check if animation just started a specific frame
     * @param {number} frameNumber - Frame number to check
     * @returns {boolean} True if just started this frame
     */
    justStartedFrame(frameNumber) {
        const frameInfo = this.getCurrentFrameInfo();
        return frameInfo && 
               frameInfo.frame === frameNumber && 
               frameInfo.timeInFrame < 16; // Within one frame (assuming 60fps)
    }

    /**
     * Check if animation just finished
     * @returns {boolean} True if animation just completed
     */
    justFinished() {
        const player = this.player;
        const animation = player.animations[player.currentAnimation];
        
        if (!animation || animation.loop) return false;
        
        return player.animationFrame >= animation.frames.length - 1 &&
               player.animationTime >= animation.speed;
    }

    /**
     * Reset all effects
     */
    reset() {
        this.dustEffects = [];
        this.transitionTime = 0;
        this.previousAnimation = null;
    }
}
