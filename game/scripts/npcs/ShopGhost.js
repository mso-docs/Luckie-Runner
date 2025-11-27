/**
 * ShopGhost - simple NPC with two-frame sprite and proximity-based interactions
 */
class ShopGhost {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 47;
        this.height = 64;
        this.frameIndex = 0;
        this.frameWidth = 47;
        this.frameHeight = 64;
        this.sprite = new Image();
        this.sprite.src = 'art/sprites/shop-ghost.png';
        this.bobOffset = 0;
        this.bobTime = 0;
        this.interactRadius = 120;
        this.visible = true;
    }

    update(deltaTime) {
        // Gentle vertical bobbing
        this.bobTime += deltaTime * 0.0025;
        this.bobOffset = Math.sin(this.bobTime) * 6;
    }

    render(ctx, camera) {
        if (!this.visible) return;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + this.bobOffset;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            this.sprite,
            this.frameIndex * this.frameWidth,
            0,
            this.frameWidth,
            this.frameHeight,
            screenX,
            screenY,
            this.frameWidth,
            this.frameHeight
        );
        ctx.restore();
    }

    toggleFrame() {
        this.frameIndex = this.frameIndex === 0 ? 1 : 0;
    }

    isPlayerNearby(player, customRadius) {
        const radius = customRadius || this.interactRadius;
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    }
}
