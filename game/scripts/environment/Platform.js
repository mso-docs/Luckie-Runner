/**
 * Platform - Solid ground or floating platforms
 */
class Platform {
    constructor(x, y, width, height, type = 'ground') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.solid = true;
        this.color = type === 'ground' ? '#8B4513' : '#654321';
    }
    
    render(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Only render if on screen
        if (screenX + this.width >= 0 && screenX <= ctx.canvas.width &&
            screenY + this.height >= 0 && screenY <= ctx.canvas.height) {
            
            ctx.fillStyle = this.color;
            ctx.fillRect(screenX, screenY, this.width, this.height);
            
            // Add border
            ctx.strokeStyle = '#543210';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, this.width, this.height);
        }
    }
}