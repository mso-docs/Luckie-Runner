/**
 * Slime - simple enemy that shuffles toward the player
 * Uses ground-slime.png (4 frames, 32x32 each)
 */
class Slime extends Enemy {
    constructor(x, y) {
        super(x, y, 59, 32);
        this.type = 'slime';
        this.health = 30;
        this.maxHealth = 30;
        this.patrolSpeed = 0.8;
        this.chaseSpeed = 1.4;
        this.attackDamage = 15;
        this.attackRange = 32;
        this.detectionRange = 220;
        this.dropChance = 1; // always evaluate drops via custom logic

        // Load 4-frame sheet (single row, 32px each)
        this.loadTileSheet('art/sprites/ground-slime.png', 32, 32, [0, 1, 2, 3], 160);

        // Collision slightly smaller than sprite
        this.collisionOffset = { x: 6, y: 6 };
        this.collisionWidth = 47;
        this.collisionHeight = 20;
    }

    /**
     * Simple update: wander if no target, chase when player in range
     */
    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);

        // Choose target and basic movement
        if (this.game && this.game.player) {
            const dist = CollisionDetection.getDistance(this, this.game.player);
            if (dist <= this.detectionRange) {
                // chase
                const dir = this.game.player.x > this.x ? 1 : -1;
                this.velocity.x = dir * this.chaseSpeed;
            } else {
                // slow patrol left/right
                const leftBound = this.patrolStartX - this.patrolDistance;
                const rightBound = this.patrolStartX + this.patrolDistance;
                if (this.x <= leftBound) this.patrolDirection = 1;
                if (this.x >= rightBound) this.patrolDirection = -1;
                this.velocity.x = this.patrolDirection * this.patrolSpeed;
            }
        }
    }

    /**
     * Override drops: always coins, optional potion and rock bag
     */
    handleDrops() {
        if (!this.game || !this.game.items) return;

        const dropX = this.x + this.width / 2;
        const dropY = this.y + this.height / 2;

        // Always drop 1-5 coins (value 1 each)
        const coinCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < coinCount; i++) {
            const coin = new Coin(dropX - 8 + (Math.random() * 10 - 5), dropY - 8);
            coin.game = this.game;
            this.game.items.push(coin);
        }

        // 1/4 chance health potion
        if (Math.random() <= 0.25) {
            const potion = new HealthPotion(dropX - 10, dropY - 10, 25);
            potion.game = this.game;
            this.game.items.push(potion);
        }

        // 1/2 chance rock bag with 2-5 rocks
        if (Math.random() <= 0.5) {
            const rocks = Math.floor(Math.random() * 4) + 2; // 2-5
            const bag = new RockBag(dropX - 10, dropY - 10, rocks);
            bag.game = this.game;
            this.game.items.push(bag);
        }
    }
}
