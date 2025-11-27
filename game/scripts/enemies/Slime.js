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
        this.patrolSoundInterval = 0.9; // seconds between shuffle sounds
        this.patrolSoundCooldown = 0;

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
        const dtSeconds = deltaTime / 1000;

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

        // Play soft shuffle when in the normal patrol state
        if (this.state === 'patrol') {
            this.playPatrolShuffle(dtSeconds);
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

        // Play a soft shuffle as the slime patrols
        this.playPatrolShuffle(dt);

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

    /**
     * Play a gentle patrol shuffle sound on a cooldown while moving
     * @param {number} deltaSeconds - Time since last frame in seconds
     */
    playPatrolShuffle(deltaSeconds) {
        if (this.state === 'death') return;

        // Reduce cooldown
        if (this.patrolSoundCooldown > 0) {
            this.patrolSoundCooldown -= deltaSeconds;
        }

        if (!this.game || !this.game.audioManager) return;

        if (this.patrolSoundCooldown <= 0) {
            const player = this.game.player;
            if (!player) return;

            // Volume falls off with distance; silent beyond 60px
            const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
            const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
            const dist = Math.hypot(dx, dy);
            const maxHearDistance = 200;
            if (dist > maxHearDistance) return;

            const proximity = 1 - (dist / maxHearDistance);
            const minAudible = 0.4; // keep faint sound when very close to the cutoff
            const volume = 0.9 * Math.max(minAudible, proximity);
            this.game.audioManager.playSound('slime_patrol', volume);
            this.patrolSoundCooldown = this.patrolSoundInterval;
        }
    }

    /**
     * Render with a squish effect during death instead of normal frames
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        let originalScaleX = this.scale.x;
        let originalScaleY = this.scale.y;
        let originalY = this.y;

        if (this.state === 'death') {
            const t = Math.min(1, (this.stateTime || 0) / 400); // ease over first 400ms
            const squishY = Math.max(0.25, 1 - 0.6 * t); // flatten downward
            const stretchX = 1 + 0.6 * t; // widen

            // Anchor feet to ground while squishing
            const yShift = (this.height / 2) * (1 - squishY);
            this.y = originalY + yShift;

            this.scale.x = stretchX;
            this.scale.y = squishY;
        }

        super.render(ctx, camera);

        // Restore transforms after render
        this.scale.x = originalScaleX;
        this.scale.y = originalScaleY;
        this.y = originalY;
    }
}
