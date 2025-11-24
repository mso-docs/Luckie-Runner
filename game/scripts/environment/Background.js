/**
 * Background - Handles infinitely scrolling backgrounds with parallax support
 */
class Background {
    constructor(imagePath, speed = 0.5, y = 0, infiniteScroll = false) {
        this.image = new Image();
        this.image.src = imagePath;
        this.speed = speed;
        this.y = y;
        this.x = 0;
        this.loaded = false;
        this.infiniteScroll = infiniteScroll;
        this.scrollOffset = 0;
        
        this.image.onload = () => {
            this.loaded = true;
            console.log(`Background loaded: ${imagePath} (${this.image.width}x${this.image.height})`);
        };
        
        this.image.onerror = () => {
            console.warn('Failed to load background:', imagePath);
        };
    }
    
    update(cameraX, deltaTime = 16) {
        if (this.infiniteScroll) {
            // Independent infinite scrolling - moves continuously regardless of camera
            this.scrollOffset += this.speed * (deltaTime / 16); // Normalize to 60fps
            this.scrollOffset %= this.image.width; // Wrap around
        } else {
            // Parallax scrolling - follows camera movement
            this.x = -cameraX * this.speed;
        }
    }
    
    render(ctx, camera) {
        if (!this.loaded) return;
        
        const screenY = this.y - camera.y;
        let offsetX;
        
        if (this.infiniteScroll) {
            // Use independent scroll offset for infinite scrolling
            offsetX = -this.scrollOffset;
        } else {
            // Use parallax offset
            offsetX = this.x % this.image.width;
        }
        
        // Calculate how many tiles we need to cover the screen
        const tilesNeeded = Math.ceil(ctx.canvas.width / this.image.width) + 2;
        
        // Draw repeating background tiles
        for (let i = -1; i < tilesNeeded; i++) {
            const drawX = offsetX + i * this.image.width;
            
            ctx.drawImage(
                this.image,
                drawX,
                screenY,
                this.image.width,
                this.image.height
            );
        }
    }
}