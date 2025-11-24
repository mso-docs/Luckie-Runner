/**
 * LevelGenerator - Generates dynamic level content
 */
class LevelGenerator {
    static generateBasicLevel() {
        return {
            platforms: LevelGenerator.generatePlatforms(),
            enemies: LevelGenerator.generateEnemies(),
            items: LevelGenerator.generateItems(),
            hazards: LevelGenerator.generateHazards()
        };
    }
    
    static generatePlatforms() {
        const platforms = [];
        
        // Ground platforms
        for (let x = 0; x < 3000; x += 64) {
            platforms.push({
                x: x,
                y: 560,
                width: 64,
                height: 40,
                type: 'ground',
                solid: true,
                color: '#8B4513'
            });
        }
        
        // Create gaps
        const gaps = [800, 1200, 1800, 2400];
        gaps.forEach(gapX => {
            for (let i = 0; i < platforms.length; i++) {
                if (platforms[i].x >= gapX && platforms[i].x < gapX + 128) {
                    platforms.splice(i, 1);
                    i--;
                }
            }
        });
        
        // Floating platforms
        const floatingPlatforms = [
            { x: 300, y: 400, width: 96, height: 16 },
            { x: 500, y: 320, width: 64, height: 16 },
            { x: 750, y: 350, width: 128, height: 16 },
            { x: 1100, y: 380, width: 96, height: 16 },
            { x: 1350, y: 300, width: 128, height: 16 },
            { x: 1600, y: 420, width: 64, height: 16 }
        ];
        
        floatingPlatforms.forEach(platform => {
            platforms.push({
                ...platform,
                type: 'floating',
                solid: true,
                color: '#654321'
            });
        });
        
        return platforms;
    }
    
    static generateEnemies() {
        return [
            { x: 400, y: 350, type: 'GroundSlime' },
            { x: 600, y: 270, type: 'GroundSlime' },
            { x: 1000, y: 520, type: 'PoisonSlime' },
            { x: 1250, y: 250, type: 'MagicArrowSlime' },
            { x: 1500, y: 370, type: 'GroundSlime' },
            { x: 2000, y: 300, type: 'MagicArrowSlime' }
        ];
    }
    
    static generateItems() {
        const items = [];
        
        // Coin spawns
        const coinSpawns = [
            { x: 250, y: 450, count: 5, trail: true },
            { x: 550, y: 270, count: 3, trail: true },
            { x: 1050, y: 330, count: 4, trail: true },
            { x: 1650, y: 370, count: 6, trail: true }
        ];
        
        coinSpawns.forEach(spawn => {
            if (spawn.trail) {
                for (let i = 0; i < spawn.count; i++) {
                    items.push({
                        type: 'coin',
                        x: spawn.x + i * 30,
                        y: spawn.y - i * 10,
                        value: 1
                    });
                }
            }
        });
        
        // Health potions
        items.push(
            { type: 'health', x: 700, y: 300, healAmount: 20 },
            { type: 'health', x: 1150, y: 330, healAmount: 30 },
            { type: 'health', x: 1800, y: 370, healAmount: 30 }
        );
        
        return items;
    }
    
    static generateHazards() {
        return [
            { x: 900, y: 540, width: 32, height: 20, type: 'spikes' },
            { x: 1300, y: 540, width: 64, height: 20, type: 'spikes' },
            { x: 2200, y: 540, width: 32, height: 20, type: 'spikes' }
        ];
    }
}