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
        this.attackRange = 64; // wider than body to ensure contact hits
        this.detectionRange = 260;
        this.dropChance = 1; // always evaluate drops via custom logic

        // Optional simple patrol behavior (used in the test room)
        this.simplePatrol = null;

        // Load 4-frame sheet (single row, 59x32 each)
        this.loadTileSheet('art/sprites/ground-slime.png', 59, 32, [0, 1, 2, 3], 160);

        // Collision slightly smaller than sprite
        this.collisionOffset = { x: 6, y: 6 };
        this.collisionWidth = 47;
        this.collisionHeight = 20;
    }

    /**
     * Enable a basic left/right patrol between two X positions.
     * @param {number} leftX - Left patrol point in world space.
     * @param {number} rightX - Right patrol point in world space.
     * @param {number} speed - Patrol speed in px/sec.
     * @param {number|null} groundY - Optional Y position to clamp to (top of platform minus slime height).
     */
    setSimplePatrol(leftX, rightX, speed = 90, groundY = null) {
        this.simplePatrol = {
            left: Math.min(leftX, rightX),
            right: Math.max(leftX, rightX),
            speed,
            direction: 1,
            groundY,
        };
        this.state = 'patrol';
    }

    /**
     * Simple update: wander if no target, chase when player in range
     */
    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);

        // Simple patrol mode for the test room (keeps core enemy logic running)
        if (this.simplePatrol) {
            this.updateSimplePatrol(deltaTime);
            return;
        }

        // Don't override movement when attacking/hurt/dead
        if (this.state === 'attack' || this.state === 'hurt' || this.state === 'death') {
            return;
        }

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

            // Contact damage when overlapping the player
            if (CollisionDetection.entityCollision(this, this.game.player) && this.attackCooldown <= 0) {
                this.dealDamageToTarget();
                this.attackCooldown = this.attackCooldownTime;
            }
        }
    }

    /**
     * Simple, reliable patrol between two points with ground clamping.
     * @param {number} deltaTime - Time since last frame in ms.
     */
    updateSimplePatrol(deltaTime) {
        const dt = deltaTime / 1000;
        const patrol = this.simplePatrol;
        if (!patrol) return;

        // Reverse at the bounds
        if (this.x <= patrol.left) {
            patrol.direction = 1;
        } else if (this.x + this.width >= patrol.right) {
            patrol.direction = -1;
        }

        // Move horizontally
        this.velocity.x = patrol.direction * patrol.speed;
        this.flipX = this.velocity.x < 0;

        // Apply gravity already accumulated in base update
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        // Keep the slime pinned to the expected ground height in the test room
        if (patrol.groundY !== null && this.y > patrol.groundY) {
            this.y = patrol.groundY;
            this.velocity.y = 0;
            this.onGround = true;
        }

        // Contact damage in patrol mode
        if (this.state !== 'death' && this.game && this.game.player && this.attackCooldown <= 0) {
            if (CollisionDetection.entityCollision(this, this.game.player)) {
                this.dealDamageToTarget();
                this.attackCooldown = this.attackCooldownTime;
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
        const spread = 35;

        // Always drop 1-5 coins (value 1 each)
        const coinCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < coinCount; i++) {
            const offsetX = (Math.random() * spread * 2) - spread;
            const coin = new Coin(dropX + offsetX, dropY - 12);
            coin.game = this.game;
            this.game.items.push(coin);
        }

        // 1/4 chance health potion
        if (Math.random() <= 0.25) {
            const offsetX = (Math.random() * spread * 2) - spread;
            const potion = new HealthPotion(dropX + offsetX, dropY - 16, 25);
            potion.game = this.game;
            this.game.items.push(potion);
        }

        // 1/2 chance rock bag with 2-5 rocks
        if (Math.random() <= 0.5) {
            const rocks = Math.floor(Math.random() * 4) + 2; // 2-5
            const offsetX = (Math.random() * spread * 2) - spread;
            const bag = new RockBag(dropX + offsetX, dropY - 16, rocks);
            bag.game = this.game;
            this.game.items.push(bag);
        }
    }
}
