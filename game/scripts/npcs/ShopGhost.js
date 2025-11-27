/**
 * ShopGhost - simple NPC with two-frame sprite and proximity-based interactions
 */
class ShopGhost extends Entity {
    constructor(x, y) {
        super(x, y, 47, 64);

        this.loadTileSheet('art/sprites/shop-ghost.png', 47, 64, [0], 999999); // disable auto-anim
        this.interactRadius = 120;
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

    isPlayerNearby(player, customRadius) {
        const radius = customRadius || this.interactRadius;
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    }
}
