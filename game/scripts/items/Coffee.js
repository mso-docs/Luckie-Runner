/**
 * CoffeeItem - Grants a temporary speed buff when collected
 */
class CoffeeItem extends Item {
    constructor(x, y) {
        super(x, y, 22, 32);

        this.type = 'coffee';
        this.collectSound = 'coffee';
        this.collectMessage = '+Coffee Speed!';
        this.collectScore = 0;
        this.bobHeight = 3;
        this.bobSpeed = 2.2;

        this.loadSprite('art/items/coffee.png');
    }

    applyEffect(collector) {
        if (!collector || typeof collector.applyCoffeeBuff !== 'function') return false;
        collector.applyCoffeeBuff(2, 120000); // 2x speed for 2 minutes
        return true;
    }
}
