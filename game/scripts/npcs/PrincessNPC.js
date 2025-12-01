/**
 * PrincessNPC - Climbable-peak NPC with simple two-frame animation
 */
class PrincessNPC extends BaseNPC {
    constructor(x, y, dialogueId = 'princess.default') {
        super(x, y, 49, 64, {
            id: 'princess',
            name: 'Princess',
            dialogueId: dialogueId,
            interactRadius: 110,
            canTalk: true
        });

        this.loadTileSheet('art/sprites/princess-sprite.png', 49, 64, [0], 999999);
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
}

if (typeof module !== 'undefined') {
    module.exports = PrincessNPC;
}
