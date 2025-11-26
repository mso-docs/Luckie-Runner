/**
 * Enemy - Base class for all enemy entities
 * Implements state machine behavior and common enemy functionality
 */
class Enemy extends Entity {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        
        // Enemy-specific properties
        this.type = 'enemy';
        this.aggressive = true;
        this.detectionRange = 150;
        this.attackRange = 50;
        this.patrolDistance = 100;
        this.patrolSpeed = 1;
        this.chaseSpeed = 2;
        this.attackDamage = 20;
        this.attackCooldown = 0;
        this.attackCooldownTime = 1000;
        this.stunTime = 0;
        
        // Physics settings
        this.gravity = 800; // Simple gravity (pixels/second²)
        
        // State machine
        this.state = 'patrol';
        this.previousState = 'patrol';
        this.stateTime = 0;
        this.stateMachine = {
            patrol: this.patrolState.bind(this),
            chase: this.chaseState.bind(this),
            attack: this.attackState.bind(this),
            hurt: this.hurtState.bind(this),
            death: this.deathState.bind(this)
        };
        
        // Patrol properties
        this.patrolStartX = x;
        this.patrolDirection = 1;
        this.facing = 1;
        
        // Target tracking
        this.target = null;
        this.lastSeenTargetX = 0;
        
        // Set default enemy fallback color (bright red)
        this.fallbackColor = '#ff0000';
        this.searchTime = 0;
        this.maxSearchTime = 3000; // 3 seconds
        
        // AI properties
        this.reactTime = 200; // Time before reacting to player
        this.reactionTimer = 0;
        this.canSeeTarget = false;
        
        // Drop properties (what enemy drops when defeated)
        this.dropChance = 0.8; // 80% chance to drop something
        this.dropTable = [
            { item: 'coin', chance: 0.75, amount: Math.floor(Math.random() * 2) + 1 }, // 1-2 coins, 75% chance
            { item: 'rocks', chance: 0.17, amount: Math.floor(Math.random() * 3) + 2 } // 2-4 rocks, 17% chance
        ];

        // Quick hit flash/pow effect
        this.hitFlashTime = 0;
        this.hitFlashDuration = 600; // ms
        this.hitFlashAngle = -Math.PI / 2;
        this.hitFlashParticles = [];
        this.hitFlashDamage = 0;
        this.hitRayDuration = 500; // ms for quick pow lines
    }

    /**
     * Override to inject hit flash even on lethal damage
     */
    takeDamage(amount, source = null) {
        if (this.invulnerable) return false;
        this.spawnHitFlash(source, amount);
        return super.takeDamage(amount, source);
    }

    /**
     * Build a hit flash effect with stars and rays
     * @param {Entity|null} source - What hit the enemy
     */
    spawnHitFlash(source, amount = 0) {
        this.hitFlashTime = this.hitFlashDuration;
        this.hitFlashDamage = amount;

        // Determine incoming angle (from source toward enemy)
        const enemyCenter = this.getCenter();
        let angle = -Math.PI / 2;
        if (source && typeof source.x === 'number') {
            const srcCenter = source.getCenter ? source.getCenter() : { x: source.x, y: source.y };
            angle = Math.atan2(enemyCenter.y - srcCenter.y, enemyCenter.x - srcCenter.x);
        }
        this.hitFlashAngle = angle;

        // Build particles once per hit for stable visuals
        const rays = [];
        const stars = [];
        const mainColors = ['#ffd166', '#ffe066', '#ffb703'];
        const pastel = ['#c8f2ff', '#dff6ff', '#f7e2ff', '#e8ffe7', '#fff0e0'];

        // Five rays in an upper semicircle for visibility
        const rayCount = 5;
        const start = -Math.PI;  // left/up
        const end = 0;           // right/up
        for (let i = 0; i < rayCount; i++) {
            const t = rayCount === 1 ? 0.5 : i / (rayCount - 1);
            const rayAngle = start + (end - start) * t;
            rays.push({
                angle: rayAngle,
                length: 30 + Math.random() * 12, // larger, more pronounced rays
                width: 2 + Math.random() * 1.5
            });
        }

        // One big yellow star with damage text
        stars.push({
            size: 12,
            angle: angle,
            distance: 36,
            color: '#ffd12f',
            stroke: '#e2a400',
            isBig: true,
            baseRotation: angle + Math.PI / 2,
            rotation: (Math.random() - 0.5) * 0.35
        });

        // Three small pastel stars with spacing
        const smallCount = 3;
        const smallOffsets = [-0.5, 0.5, Math.PI * 0.85];
        for (let i = 0; i < smallCount; i++) {
            const dist = 46 + i * 8;
            stars.push({
                size: 6 + Math.random() * 1.5,
                angle: angle + smallOffsets[i],
                distance: dist,
                color: pastel[i % pastel.length],
                stroke: 'rgba(0,0,0,0.08)',
                isBig: false,
                baseRotation: angle + smallOffsets[i],
                rotation: (Math.random() - 0.5) * 0.5
            });
        }

        this.hitFlashParticles = { rays, stars };
    }

    /**
     * Update enemy AI and state machine
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        if (!this.active) return;
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Find and track target
        this.updateTargetTracking();
        
        // Run current state
        this.runStateMachine(deltaTime);
        
        // Update facing direction
        if (this.velocity.x > 0) this.facing = 1;
        else if (this.velocity.x < 0) this.facing = -1;
        this.flipX = this.facing < 0;
    }

    /**
     * Update various timers
     * @param {number} deltaTime - Time since last frame
     */
    updateTimers(deltaTime) {
        this.stateTime += deltaTime;
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        if (this.stunTime > 0) {
            this.stunTime -= deltaTime;
        }
        
        if (this.reactionTimer > 0) {
            this.reactionTimer -= deltaTime;
        }
        
        if (this.searchTime > 0) {
            this.searchTime -= deltaTime;
        }

        if (this.hitFlashTime > 0) {
            this.hitFlashTime -= deltaTime;
        }
    }

    /**
     * Render enemy with optional hit flash "POW" overlay
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible) return;

        // Draw enemy sprite/animation
        super.render(ctx, camera);

        // Draw a quick "POW" overlay when recently hit
        if (this.hitFlashTime > 0) {
            const intensity = this.hitFlashTime / this.hitFlashDuration;
            const dir = {
                x: Math.cos(this.hitFlashAngle),
                y: Math.sin(this.hitFlashAngle)
            };
            const side = dir.x >= 0 ? 1 : -1;
            const starOriginX = this.x - camera.x + this.width / 2 + side * (this.width * 0.6);
            const starOriginY = this.y - camera.y - this.height * 0.6; // above the ground but near body
            const rayOriginX = this.x - camera.x + this.width / 2 + side * 10; // a bit wider origin for spread
            const rayOriginY = starOriginY;
            const life = 1 - intensity; // 0 at start, 1 at end
            const wiggle = Math.sin(life * Math.PI * 4) * 6 * (0.6 + 0.4 * intensity);
            const perp = { x: -dir.y, y: dir.x };
            const rayElapsed = this.hitFlashDuration - this.hitFlashTime;
            const rayIntensity = Math.max(0, 1 - rayElapsed / this.hitRayDuration);

            ctx.save();
            ctx.globalAlpha = Math.min(1, intensity);

            const { rays, stars } = this.hitFlashParticles || { rays: [], stars: [] };

            // Impact rays (directional)
            if (rayElapsed < this.hitRayDuration) {
                ctx.save();
                ctx.globalAlpha = rayIntensity;
                rays.forEach(ray => {
                    const len = ray.length * (0.6 + 0.4 * rayIntensity);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = ray.width;
                    const startX = rayOriginX + Math.cos(ray.angle) * 10;
                    const startY = Math.min(rayOriginY + Math.sin(ray.angle) * 10, rayOriginY); // clamp to upper half
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(
                        startX + Math.cos(ray.angle) * len,
                        startY + Math.sin(ray.angle) * len
                    );
                    ctx.stroke();
                });
                ctx.restore();
            }

        // Stars emanating from impact: draw small behind, big on top
        const bigStar = stars.find(s => s.isBig);
        const damageStarSize = bigStar ? bigStar.size * 5 : 30;

        // Pastel stars (background layer, 1/3 of big star)
        stars.filter(s => !s.isBig).forEach(star => {
            const dist = star.distance * (0.7 + 0.3 * intensity);
            let sx = starOriginX + Math.cos(star.angle) * dist;
            let sy = starOriginY + Math.sin(star.angle) * dist - this.height * 2.0; // lift stars to ~2x enemy height
            sx += perp.x * wiggle;
            sy += perp.y * wiggle;
            const size = damageStarSize / 3;
            const rot = (star.baseRotation || 0) + (star.rotation || 0) + Math.sin(life * Math.PI * 4) * 0.4;
            this.drawStar(ctx, sx, sy, size, star.color, star.stroke, rot);
        });

        // Big damage star on top
        if (bigStar) {
            const dist = bigStar.distance * (0.7 + 0.3 * intensity);
            let sx = starOriginX + Math.cos(bigStar.angle) * dist;
            let sy = starOriginY + Math.sin(bigStar.angle) * dist - this.height * 2.0;
            sx += perp.x * wiggle;
            sy += perp.y * wiggle;
            const rot = (bigStar.baseRotation || 0) + (bigStar.rotation || 0) + Math.sin(life * Math.PI * 4) * 0.35;
            this.drawStar(ctx, sx, sy, damageStarSize, bigStar.color, bigStar.stroke, rot);

            if (this.hitFlashDamage > 0) {
                ctx.save();
                ctx.font = 'bold 26px Arial';
                ctx.fillStyle = '#ff8c00';
                ctx.lineWidth = 6;
                ctx.strokeStyle = '#000000';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 4;
                ctx.shadowOffsetY = 4;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeText(String(this.hitFlashDamage), sx, sy);
                ctx.fillText(String(this.hitFlashDamage), sx, sy);
                ctx.restore();
            }
        }

            ctx.restore();
        }
    }

    /**
     * Draw a simple 5-point star
     */
    drawStar(ctx, x, y, size, fill, stroke = null, rotation = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = Math.PI / 5 * i - Math.PI / 2;
            const radius = i % 2 === 0 ? size : size * 0.45;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Find and track the player target
     */
    updateTargetTracking() {
        if (!this.game || !this.game.player) {
            this.target = null;
            this.canSeeTarget = false;
            return;
        }
        
        const player = this.game.player;
        const distance = CollisionDetection.getDistance(this, player);
        
        // Check if player is in detection range
        if (distance <= this.detectionRange) {
            // Simple line of sight check (can be improved with raycasting)
            this.canSeeTarget = this.hasLineOfSight(player);
            
            if (this.canSeeTarget) {
                this.target = player;
                this.lastSeenTargetX = player.x;
                this.searchTime = this.maxSearchTime;
                
                // Start reaction timer if not already reacting
                if (this.state === 'patrol' && this.reactionTimer <= 0) {
                    this.reactionTimer = this.reactTime;
                }
            }
        } else {
            this.canSeeTarget = false;
            
            // Lose target if too far and haven't seen them recently
            if (this.searchTime <= 0) {
                this.target = null;
            }
        }
    }

    /**
     * Simple line of sight check
     * @param {Entity} target - Target to check
     * @returns {boolean} True if can see target
     */
    hasLineOfSight(target) {
        // Simple check - can be improved with proper raycasting
        // For now, just check if target is roughly at same height
        const heightDiff = Math.abs(this.y - target.y);
        return heightDiff < 64; // Within 2 tile heights
    }

    /**
     * Run the state machine
     * @param {number} deltaTime - Time since last frame
     */
    runStateMachine(deltaTime) {
        if (this.stunTime > 0) return; // Don't update if stunned
        
        const currentStateFunction = this.stateMachine[this.state];
        if (currentStateFunction) {
            currentStateFunction(deltaTime);
        }
    }

    /**
     * Change to a new state
     * @param {string} newState - State to change to
     */
    changeState(newState) {
        if (this.state !== newState) {
            this.previousState = this.state;
            this.state = newState;
            this.stateTime = 0;
            this.onStateChange(newState, this.previousState);
        }
    }

    /**
     * Patrol state - move back and forth in a set area
     * @param {number} deltaTime - Time since last frame
     */
    patrolState(deltaTime) {
        // Check if should start chasing
        if (this.target && this.canSeeTarget && this.reactionTimer <= 0) {
            this.changeState('chase');
            return;
        }
        
        // Patrol movement
        const leftBound = this.patrolStartX - this.patrolDistance / 2;
        const rightBound = this.patrolStartX + this.patrolDistance / 2;
        
        // Change direction at bounds
        if (this.x <= leftBound && this.patrolDirection < 0) {
            this.patrolDirection = 1;
        } else if (this.x >= rightBound && this.patrolDirection > 0) {
            this.patrolDirection = -1;
        }
        
        // Move in patrol direction
        this.velocity.x = this.patrolDirection * this.patrolSpeed;
        
        // Animation is handled by individual enemy classes with directional logic
    }

    /**
     * Chase state - pursue the target
     * @param {number} deltaTime - Time since last frame
     */
    chaseState(deltaTime) {
        if (!this.target) {
            this.changeState('patrol');
            return;
        }
        
        // Check if close enough to attack
        const distance = CollisionDetection.getDistance(this, this.target);
        if (distance <= this.attackRange && this.attackCooldown <= 0) {
            this.changeState('attack');
            return;
        }
        
        // Check if lost target
        if (!this.canSeeTarget && this.searchTime <= 0) {
            this.changeState('patrol');
            return;
        }
        
        // Move towards target (or last known position)
        const targetX = this.canSeeTarget ? this.target.x : this.lastSeenTargetX;
        const direction = targetX > this.x ? 1 : -1;
        
        this.velocity.x = direction * this.chaseSpeed;
        
        // Animation is handled by individual enemy classes with directional logic
    }

    /**
     * Attack state - perform attack on target
     * @param {number} deltaTime - Time since last frame
     */
    attackState(deltaTime) {
        // Stop movement during attack
        this.velocity.x *= 0.5;
        
        // Play attack animation
        this.playAnimation('attack');
        
        // Check if attack animation is done
        if (this.stateTime >= 300) { // Attack duration
            // Deal damage if target is still in range
            if (this.target) {
                const distance = CollisionDetection.getDistance(this, this.target);
                if (distance <= this.attackRange) {
                    this.dealDamageToTarget();
                }
            }
            
            // Set cooldown and return to chase
            this.attackCooldown = this.attackCooldownTime;
            this.changeState('chase');
        }
    }

    /**
     * Hurt state - enemy has taken damage
     * @param {number} deltaTime - Time since last frame
     */
    hurtState(deltaTime) {
        // Brief stun period
        this.velocity.x *= 0.7;
        
        // Play hurt animation
        this.playAnimation('hurt');
        
        // Return to appropriate state after hurt duration
        if (this.stateTime >= 200) {
            if (this.target && this.canSeeTarget) {
                this.changeState('chase');
            } else {
                this.changeState('patrol');
            }
        }
    }

    /**
     * Death state - enemy is defeated
     * @param {number} deltaTime - Time since last frame
     */
    deathState(deltaTime) {
        // Play death animation
        this.playAnimation('death');
        
        // Fade out
        this.alpha -= deltaTime / 1000;
        
        // Remove after fading
        if (this.alpha <= 0) {
            this.active = false;
        }
    }

    /**
     * Deal damage to current target
     */
    dealDamageToTarget() {
        if (this.target && this.target.takeDamage) {
            this.target.takeDamage(this.attackDamage, this);
        }
        
        // Play attack sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('slimy', 0.6);
        }
    }

    /**
     * Override takeDamage to handle hurt state
     * @param {number} amount - Damage amount
     * @param {Entity} source - Damage source
     */
    onTakeDamage(amount, source) {
        // Enter hurt state
        this.changeState('hurt');
        this.hitFlashTime = this.hitFlashDuration;
        
        // Add knockback
        if (source) {
            const direction = source.x < this.x ? 1 : -1;
            this.velocity.x += direction * 3;
        }
        
        // Become aggressive if hit
        this.aggressive = true;
        this.target = source;
    }

    /**
     * Override death to handle drops and effects
     * @param {Entity} source - Death source
     */
    onDeath(source) {
        // Prevent double-processing drops/effects
        if (this.state === 'death') return;

        this.changeState('death');
        
        // Create death effects
        this.createDeathEffect();
        
        // Handle drops
        this.handleDrops();
        
        // Play death sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('slime_defeat', 0.7);
        }
        
        // Award score to player
        if (this.game.player) {
            this.game.player.score += 100;
            this.game.player.updateUI();
        }
    }

    /**
     * Create visual effect when enemy dies
     */
    createDeathEffect() {
        // TODO: Add particle effects
        // This would create explosion/poof effects
    }

    /**
     * Handle item drops when enemy dies
     */
    handleDrops() {
        if (!this.game || Math.random() > this.dropChance) return;
        
        // Roll for drops based on drop table
        for (let drop of this.dropTable) {
            if (Math.random() <= drop.chance) {
                this.createDrop(drop.item, drop.amount);
                break; // Only one drop per enemy
            }
        }
    }

    /**
     * Create a dropped item
     * @param {string} itemType - Type of item to drop
     * @param {number} amount - Amount/value of item
     */
    createDrop(itemType, amount) {
        const dropX = this.x + this.width / 2;
        const dropY = this.y + this.height / 2;
        
        let droppedItem;
        
        switch (itemType) {
            case 'coin':
                droppedItem = new Coin(dropX - 8, dropY - 8);
                break;
            case 'health_potion':
                droppedItem = new HealthPotion(dropX - 10, dropY - 10);
                break;
            case 'rock_bag':
                droppedItem = new RockBag(dropX - 10, dropY - 10, amount || 3);
                break;
            case 'rocks':
                droppedItem = new RockItem(dropX - 6, dropY - 6, amount);
                break;
            default:
                return;
        }
        
        if (droppedItem && this.game.items) {
            droppedItem.game = this.game;
            this.game.items.push(droppedItem);
        }
    }

    /**
     * Called when state changes
     * @param {string} newState - New state
     * @param {string} oldState - Previous state
     */
    onStateChange(newState, oldState) {
        // Override in subclasses for state-specific setup
    }

    /**
     * Get current state for debugging
     * @returns {Object} State information
     */
    getStateInfo() {
        return {
            state: this.state,
            stateTime: this.stateTime,
            hasTarget: !!this.target,
            canSeeTarget: this.canSeeTarget,
            health: this.health,
            attackCooldown: this.attackCooldown
        };
    }
}
