/**
 * RockBag - grants multiple rocks using rock-bag sprite
 */
class RockBag extends Item {
    constructor(x, y, rockCount = 2) {
        super(x, y, 36, 36);
        this.type = 'rock_bag';
        this.value = rockCount;
        this.collectSound = 'special';
        this.collectMessage = `+${rockCount} Rocks`;
        this.collectScore = 5;

        this.bobHeight = 2;
        this.bobSpeed = 1.5;
        this.magnetRange = 40;

        this.loadSprite('art/items/rock-bag.png');
    }

    onCollected(collector) {
        if (collector.addRocks) {
            collector.addRocks(this.value);
        }
        return true;
    }
}
