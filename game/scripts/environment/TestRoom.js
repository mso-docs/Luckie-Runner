/**
 * TestRoom - Simple test environment for debugging
 * Creates a minimal room with just a player and a platform
 */
class TestRoom {
    constructor() {
        this.width = 800;
        this.height = 600;
        this.platforms = [];
        this.items = [];
        this.enemies = [];
        this.hazards = [];
        this.background = null;
        
        this.createTestEnvironment();
    }
    
    /**
     * Create a simple test environment
     */
    createTestEnvironment() {
        // Create a solid platform in the middle of the screen
        const platformWidth = 200;
        const platformHeight = 20;
        const platformX = (this.width - platformWidth) / 2;
        const platformY = this.height / 2 + 100; // Center vertically, but lower
        
        this.platforms.push(new Platform(platformX, platformY, platformWidth, platformHeight));
        
        // Add ground platform at bottom for safety
        const groundWidth = this.width;
        const groundHeight = 40;
        const groundX = 0;
        const groundY = this.height - groundHeight;
        
        this.platforms.push(new Platform(groundX, groundY, groundWidth, groundHeight));
        
        // Add walls to prevent falling off sides
        const wallWidth = 20;
        const wallHeight = this.height;
        
        // Left wall
        this.platforms.push(new Platform(-wallWidth, 0, wallWidth, wallHeight));
        
        // Right wall
        this.platforms.push(new Platform(this.width, 0, wallWidth, wallHeight));
        
        // Create simple background
        this.background = {
            color: '#87CEEB', // Sky blue
            draw: function(ctx) {
                ctx.fillStyle = this.color;
                ctx.fillRect(0, 0, 800, 600);
                
                // Draw grid for reference
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                
                // Vertical lines every 50px
                for (let x = 0; x <= 800; x += 50) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, 600);
                    ctx.stroke();
                }
                
                // Horizontal lines every 50px
                for (let y = 0; y <= 600; y += 50) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(800, y);
                    ctx.stroke();
                }
            }
        };
    }
    
    /**
     * Get player spawn position (on the center platform)
     */
    getPlayerSpawnPosition() {
        const platform = this.platforms[0]; // Main center platform
        return {
            x: platform.x + platform.width / 2 - 22.5, // Center on platform (player is 45px wide)
            y: platform.y - 66 // Just above platform (player is 66px tall)
        };
    }
    
    /**
     * Update test room (minimal logic needed)
     */
    update(deltaTime) {
        // No dynamic elements to update in test room
    }
    
    /**
     * Draw test room background
     */
    drawBackground(ctx) {
        if (this.background) {
            this.background.draw(ctx);
        }
    }
    
    /**
     * Draw test room info
     */
    drawDebugInfo(ctx) {
        ctx.fillStyle = 'black';
        ctx.font = '16px "Hey Gorgeous", "Trebuchet MS", "Fredoka One", "Segoe UI", sans-serif';
        ctx.fillText('TEST ROOM - Debug Environment', 10, 30);
        ctx.fillText('Press F2 to toggle back to main game', 10, 50);
        ctx.fillText('Grid: 50px squares', 10, 70);
    }
}
