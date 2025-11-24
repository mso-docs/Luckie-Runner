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
        
        // Set default enemy fallback color
        this.fallbackColor = '#ff4444';
        this.searchTime = 0;
        this.maxSearchTime = 3000; // 3 seconds
        
        // AI properties
        this.reactTime = 200; // Time before reacting to player
        this.reactionTimer = 0;
        this.canSeeTarget = false;
        
        // Drop properties (what enemy drops when defeated)
        this.dropChance = 0.7; // 70% chance to drop something
        this.dropTable = [
            { item: 'coin', chance: 0.8, amount: 1 },
            { item: 'health', chance: 0.2, amount: 10 }
        ];
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
        
        // Play patrol animation
        if (Math.abs(this.velocity.x) > 0.1) {
            this.playAnimation('walk');
        } else {
            this.playAnimation('idle');
        }
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
        
        // Play chase animation
        this.playAnimation('run');
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
            this.game.audioManager.playSound('enemy_attack', 0.6);
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
        this.changeState('death');
        
        // Create death effects
        this.createDeathEffect();
        
        // Handle drops
        this.handleDrops();
        
        // Play death sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('enemy_death', 0.7);
        }
        
        // Award score to player
        if (this.game.player) {
            this.game.player.score += 50;
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
            case 'health':
                droppedItem = new HealthPotion(dropX - 8, dropY - 8);
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