/**
 * GenericNPC - Configurable NPC for non-patrolling characters
 * Used for Princess, Balloon Fan, Shop Ghost, and other static/animated NPCs
 */
class GenericNPC extends BaseNPC {
    constructor(config = {}) {
        const x = config.x ?? 0;
        const y = config.y ?? 0;
        const width = config.width ?? 48;
        const height = config.height ?? 64;
        
        super(x, y, width, height, {
            id: config.id,
            name: config.name || 'NPC',
            dialogueId: config.dialogueId,
            dialogueLines: config.dialogueLines,
            interactRadius: config.interactRadius ?? 120,
            canTalk: config.canTalk !== false,
            spriteDefaultFacesLeft: config.spriteDefaultFacesLeft ?? true
        });

        // Load sprite (tile sheet or single sprite)
        if (config.useTileSheet) {
            const frames = config.frames ?? 1;
            const animFrames = config.animationFrames || [0];
            const animSpeed = config.animationSpeed ?? 999999;
            this.loadTileSheet(config.sprite, width, height, animFrames, animSpeed);
        } else {
            this.loadSprite(config.sprite);
        }

        // Bobbing animation (for Balloon Fan and Shop Ghost)
        this.hasBobbing = config.bobbing ?? false;
        if (this.hasBobbing) {
            this.baseY = y;
            this.bobTime = 0;
            this.bobAmount = config.bobbingAmount ?? 7;
            this.bobbingSpeed = config.bobbingSpeed ?? 0.0025;
        }

        // Frame toggling (for Shop Ghost)
        this.canToggleFrame = config.canToggleFrame ?? false;

        // Talk animation frames
        this.talkFrames = config.talkFrames || [0, 1];
        this.idleFrames = config.idleFrames || [0];

        // Custom shadow scale
        this.customShadowScale = config.shadowScale || null;
    }

    /**
     * Update bobbing animation if enabled
     */
    onUpdate(deltaTime) {
        if (this.hasBobbing) {
            this.bobTime += deltaTime * this.bobbingSpeed;
            const offset = Math.sin(this.bobTime) * this.bobAmount;
            this.y = this.baseY + offset;
        }
    }

    /**
     * Custom render for bobbing effect (Shop Ghost style)
     */
    render(ctx, camera) {
        if (!this.visible) return;
        if (this.hasBobbing && !this.baseY) {
            // If baseY not set, render normally
            super.render(ctx, camera);
            return;
        }
        if (this.hasBobbing && this.bobTime !== undefined) {
            const originalY = this.y;
            const offset = Math.sin(this.bobTime) * this.bobAmount;
            this.y = this.baseY + offset;
            super.render(ctx, camera);
            this.y = originalY;
        } else {
            super.render(ctx, camera);
        }
    }

    /**
     * Toggle between animation frames (for Shop Ghost)
     */
    toggleFrame() {
        if (this.canToggleFrame) {
            this.tileIndex = this.tileIndex === 0 ? 1 : 0;
        }
    }

    /**
     * Set talking animation
     */
    setTalking(isTalking) {
        this.isTalking = isTalking;
        if (isTalking) {
            this.tileAnimationFrames = this.talkFrames;
            this.tileAnimationSpeed = 320;
            this.tileAnimationIndex = 0;
            this.tileAnimationTime = 0;
        } else {
            this.tileAnimationFrames = this.idleFrames;
            this.tileAnimationSpeed = 999999;
            this.tileAnimationIndex = 0;
            this.tileAnimationTime = 0;
            this.tileIndex = this.idleFrames[0];
        }
    }

    /**
     * Called when dialogue closes
     */
    onDialogueClosed() {
        this.setTalking(false);
        // Reset position for bobbing NPCs
        if (this.hasBobbing && this.baseY !== undefined) {
            this.y = this.baseY;
        }
    }

    /**
     * Custom shadow scale
     */
    getShadowScale() {
        return this.customShadowScale || { x: 0.8, y: 0.4 };
    }
}

if (typeof module !== 'undefined') {
    module.exports = GenericNPC;
}
if (typeof window !== 'undefined') {
    window.GenericNPC = GenericNPC;
}
