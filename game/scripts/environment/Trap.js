/**
 * Trap - Hazardous environment objects
 */
class Trap {
    constructor(x, y, width, height, damage = 25) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.damage = damage;
        this.active = true;
        this.animationTime = 0;
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
    }
    
    checkPlayerCollision(player) {
        if (!this.active || !player) return;
        
        const collision = (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
        
        if (collision) {
            player.takeDamage(this.damage, this);
            
            // Play hurt sound when trap is triggered
            if (player.game && player.game.audioManager) {
                player.game.audioManager.playSound('hurt', 0.6);
            }
        }
    }
    
    render(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Simple spike trap visualization
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(screenX, screenY, this.width, this.height);
    }
}