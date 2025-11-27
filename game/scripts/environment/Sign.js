class Sign extends Entity {
    constructor(x, y, spriteSrc) {
        super(x, y, 40, 52);
        this.sprite = new Image();
        this.sprite.src = spriteSrc || 'art/items/sign.png';
        this.spriteLoaded = false;
        this.sprite.onload = () => { this.spriteLoaded = true; };
    }

    render(ctx, camera) {
        if (!this.visible) return;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        if (screenX + this.width < 0 || screenX > ctx.canvas.width || screenY + this.height < 0 || screenY > ctx.canvas.height) return;

        // Shadow
        this.renderShadow(ctx, screenX, camera);

        ctx.save();
        ctx.translate(screenX - this.width / 2, screenY - this.height / 2);
        if (this.spriteLoaded) {
            ctx.drawImage(this.sprite, 0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = '#d9b178';
            ctx.fillRect(0, 0, this.width, this.height);
        }
        ctx.restore();
    }
}

if (typeof module !== 'undefined') {
    module.exports = Sign;
}
