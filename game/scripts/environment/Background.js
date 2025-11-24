/**
 * Background - Handles parallax scrolling backgrounds
 */
class Background {
    constructor(imagePath, speed = 0.5, y = 0) {
        this.image = new Image();
        this.image.src = imagePath;
        this.speed = speed;
        this.y = y;
        this.x = 0;
        this.loaded = false;
        
        this.image.onload = () => {
            this.loaded = true;
        };
        
        this.image.onerror = () => {
            console.warn('Failed to load background:', imagePath);
        };
    }
    
    update(cameraX) {
        this.x = -cameraX * this.speed;
    }
    
    render(ctx, camera) {
        if (!this.loaded) return;
        
        const screenY = this.y - camera.y;
        const offsetX = this.x % this.image.width;
        
        // Draw repeating background
        for (let i = -1; i < Math.ceil(ctx.canvas.width / this.image.width) + 1; i++) {
            ctx.drawImage(
                this.image,
                offsetX + i * this.image.width,
                screenY
            );
        }
    }
}