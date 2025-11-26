// HealthPotion - simple health pickup that heals the player
class HealthPotion extends Item {
    constructor(x, y, healAmount = 25) {
        super(x, y, 20, 20);
        this.type = 'health_potion';
        this.healAmount = healAmount;
        this.collectSound = 'health';
        this.collectMessage = `+${healAmount} HP`;
        this.fallbackColor = '#ff5555';
        this.collisionOffset = { x: 2, y: 2 };
        this.collisionWidth = 16;
        this.collisionHeight = 16;
        this.magnetRange = 32;
        this.autoCollect = false;
        this.bobHeight = 3;
        this.loadSprite('art/sprites/health-pot.png');
    }

    onItemUpdate(deltaTime) {
        // no special behavior beyond base bobbing/magnetism
    }

    collect(collector) {
        if (this.collected || !collector) return false;
        collector.heal(this.healAmount);
        this.collected = true;
        this.active = false;
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound(this.collectSound, 0.7);
        }
        collector.updateUI?.();
        return true;
    }
}
