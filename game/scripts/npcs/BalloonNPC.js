/**
 * BalloonNPC - Cheerful balloon fan perched atop optional parkour
 */
class BalloonNPC extends BaseNPC {
    constructor(x, y, dialogueId = 'balloon.default') {
        super(x, y, 55, 63, {
            id: 'balloon_fan',
            name: 'Balloon Fan',
            dialogueId: dialogueId,
            interactRadius: 120,
            canTalk: true,
            spriteDefaultFacesLeft: true  // Balloon sprite faces left by default
        });

        this.loadSprite('art/sprites/balloon.png');
        this.baseY = y;
        this.bobTime = 0;
        this.bobAmount = 7;
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
     * Slightly smaller footprint for the shadow
     */
    getShadowScale() {
        return { x: 0.55, y: 0.4 };
    }
}

if (typeof module !== 'undefined') {
    module.exports = BalloonNPC;
}
