/**
 * BalloonNPC - Cheerful balloon fan perched atop optional parkour
 */
class BalloonNPC extends Entity {
    constructor(x, y, dialogueId = 'balloon.default') {
        super(x, y, 55, 63);

        this.loadSprite('art/sprites/balloon.png');
        this.interactRadius = 120;
        this.canTalk = true;
        this.baseY = y;
        this.bobTime = 0;
        this.bobAmount = 7;
        this.dialogueId = dialogueId;
    }

    /**
     * Gentle bobbing to keep the sprite lively
     */
    onUpdate(deltaTime) {
        this.bobTime += deltaTime * 0.0025;
        const offset = Math.sin(this.bobTime) * this.bobAmount;
        this.y = this.baseY + offset;
    }

    /**
     * Keep speech bubble from jittering when dialogue closes
     */
    onDialogueClosed() {
        this.y = this.baseY;
    }

    /**
     * Simple proximity check for dialogue
     */
    isPlayerNearby(player, radius) {
        const range = radius || this.interactRadius;
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        return Math.hypot(dx, dy) <= range;
    }

    /**
     * Slightly smaller footprint for the shadow
     */
    getShadowScale() {
        return { x: 0.55, y: 0.4 };
    }
}

if (typeof module !== 'undefined') {
    module.exports = BalloonNPC;
}
