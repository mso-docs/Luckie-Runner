/**
 * ShopGhost - simple NPC with two-frame sprite and proximity-based interactions
 */
class ShopGhost extends BaseNPC {
    constructor(x, y, dialogueId = 'npc.shop_ghost') {
        super(x, y, 47, 64, {
            id: 'shop_ghost',
            name: 'Shop Ghost',
            dialogueId: dialogueId,
            interactRadius: 120,
            canTalk: true // Shop ghost uses Z key and Enter
        });

        this.loadTileSheet('art/sprites/shop-ghost.png', 47, 64, [0], 999999); // disable auto-anim
        this.bobOffset = 0;
        this.bobTime = 0;
    }

    onUpdate(deltaTime) {
        // Gentle vertical bobbing
        this.bobTime += deltaTime * 0.0025;
        this.bobOffset = Math.sin(this.bobTime) * 6;
    }

    render(ctx, camera) {
        if (!this.visible) return;
        const originalY = this.y;
        this.y = originalY + this.bobOffset;
        super.render(ctx, camera);
        this.y = originalY;
    }

    toggleFrame() {
        this.tileIndex = this.tileIndex === 0 ? 1 : 0;
    }
}
