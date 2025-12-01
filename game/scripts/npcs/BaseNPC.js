/**
 * BaseNPC - Base class for all NPC types
 * Provides common functionality like dialogue, facing, and proximity detection
 */
class BaseNPC extends Entity {
    constructor(x, y, width, height, config = {}) {
        super(x, y, width, height);
        
        // NPC identity
        this.id = config.id || null;
        this.name = config.name || 'NPC';
        
        // Dialogue properties
        this.dialogueId = config.dialogueId || null;
        this.dialogueLines = config.dialogueLines || null;
        this.canTalk = config.canTalk !== false; // Default to true
        this.interactRadius = config.interactRadius ?? 120;
        
        // Talking state
        this.isTalking = false;
        
        // Sprite facing direction (some sprites face left by default, some right)
        this.spriteDefaultFacesLeft = config.spriteDefaultFacesLeft || false;
    }

    /**
     * Check if player is nearby for interaction
     */
    isPlayerNearby(player, radius) {
        if (!player) return false;
        const checkRadius = radius ?? this.interactRadius;
        const dx = (player.x + (player.width || 0) / 2) - (this.x + this.width / 2);
        const dy = (player.y + (player.height || 0) / 2) - (this.y + this.height / 2);
        return Math.hypot(dx, dy) <= checkRadius;
    }

    /**
     * Make NPC face toward a target (usually the player)
     */
    faceToward(target) {
        if (!target) return;
        const targetCenterX = target.x + (target.width || 0) / 2;
        const npcCenterX = this.x + this.width / 2;
        const playerIsOnRight = targetCenterX > npcCenterX;
        
        // If sprite defaults to facing left, flip logic is reversed
        if (this.spriteDefaultFacesLeft) {
            this.flipX = !playerIsOnRight; // Flip when player is on LEFT
        } else {
            this.flipX = playerIsOnRight;  // Flip when player is on RIGHT
        }
    }

    /**
     * Called when dialogue starts (override in subclass for custom behavior)
     */
    setTalking(isTalking) {
        this.isTalking = isTalking;
    }

    /**
     * Called when dialogue closes (override in subclass for custom behavior)
     */
    onDialogueClosed() {
        this.setTalking(false);
    }
}

if (typeof module !== 'undefined') {
    module.exports = BaseNPC;
}
if (typeof window !== 'undefined') {
    window.BaseNPC = BaseNPC;
}
