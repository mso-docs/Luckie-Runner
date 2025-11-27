/**
 * PrincessNPC - Climbable-peak NPC with simple two-frame animation
 */
class PrincessNPC extends Entity {
    constructor(x, y) {
        super(x, y, 49, 64);

        this.loadTileSheet('art/sprites/princess-sprite.png', 49, 64, [0], 999999);
        this.interactRadius = 110;
        this.canTalk = true;
    }

    /**
     * Toggle the talking animation (both frames) or idle (first frame)
     * @param {boolean} isTalking
     */
    setTalking(isTalking) {
        if (isTalking) {
            this.tileAnimationFrames = [0, 1];
            this.tileAnimationSpeed = 320;
            this.tileAnimationIndex = 0;
            this.tileAnimationTime = 0;
        } else {
            this.tileAnimationFrames = [0];
            this.tileAnimationSpeed = 999999;
            this.tileAnimationIndex = 0;
            this.tileAnimationTime = 0;
            this.tileIndex = 0;
        }
    }

    /**
     * Called when dialogue closes (resets to idle)
     */
    onDialogueClosed() {
        this.setTalking(false);
    }

    /**
     * Simple proximity check
     */
    isPlayerNearby(player, radius) {
        const checkRadius = radius || this.interactRadius;
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        return Math.hypot(dx, dy) <= checkRadius;
    }
}

if (typeof module !== 'undefined') {
    module.exports = PrincessNPC;
}
