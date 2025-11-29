/**
 * GroundSlime - Basic enemy that moves horizontally
 * Simple patrol and chase behavior
 */
class GroundSlime extends Enemy {
    constructor(x, y) {
        // ground-slime.png is 234x32 with 4 frames in 1 row
        // Frame size: 234/4 = 58.5 (round to 58) width, 32 height
        super(x, y, 58, 32);
        
        // Ground slime specific properties
        this.type = 'ground_slime';
        this.health = 25;
        this.maxHealth = 25;
        this.patrolSpeed = 0.5;
        this.chaseSpeed = 1.5;
        this.attackDamage = 15;
        this.attackRange = 30;
        this.detectionRange = 120;
        
        // Physics - slimes are bouncy
        this.friction = 0.9;
        this.gravity = 0.4;
        
        // Animation setup
        this.setupAnimations();
        this.playAnimation('idle');
        
        // Load new ground slime sprite
        this.loadSprite('art/sprites/ground-slime.png');
        
        // Current movement direction for animation
        this.currentDirection = 'idle';
        this.lastDirection = 'idle';
        
        // Set collision bounds (smaller than sprite for better gameplay)
        this.collisionOffset = { x: 8, y: 6 }; // Adjusted for 32px height sprite
        this.collisionWidth = 42;
        this.collisionHeight = 20;
    }

    /**
     * Set up animations for ground slime using single row sprite (234x32)
     * 4 frames in 1 row (58px wide each, 32px tall)
     * Frames 0-3: Idle/movement animation
     */
    setupAnimations() {
        const frameWidth = 58;
        const frameHeight = 32;
        
        // Idle animation - 4 frames in single row
        this.addAnimation('idle', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 58, y: 0, width: frameWidth, height: frameHeight },
            { x: 116, y: 0, width: frameWidth, height: frameHeight },
            { x: 174, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Movement animations - use same 4 frames
        this.addAnimation('move_left', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 58, y: 0, width: frameWidth, height: frameHeight },
            { x: 116, y: 0, width: frameWidth, height: frameHeight },
            { x: 174, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Move Right animation - same frames, will be flipped in rendering
        this.addAnimation('move_right', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 58, y: 0, width: frameWidth, height: frameHeight },
            { x: 116, y: 0, width: frameWidth, height: frameHeight },
            { x: 174, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Attack animation - use frames 2-4 for variety
        this.addAnimation('attack', [
            { x: 58, y: 0, width: frameWidth, height: frameHeight },
            { x: 116, y: 0, width: frameWidth, height: frameHeight },
            { x: 174, y: 0, width: frameWidth, height: frameHeight }
        ], false);
        
        // Move up uses same frames as idle
        this.addAnimation('move_up', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 58, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Hurt animation - quick flash between frames
        this.addAnimation('hurt', [
            { x: 96, y: 96, width: frameWidth, height: frameHeight },
            { x: 64, y: 0, width: frameWidth, height: frameHeight }
        ], false);
        
        // Death animation - fade through idle frames
        this.addAnimation('death', [
            { x: 96, y: 0, width: frameWidth, height: frameHeight },
            { x: 64, y: 0, width: frameWidth, height: frameHeight },
            { x: 32, y: 0, width: frameWidth, height: frameHeight },
            { x: 0, y: 0, width: frameWidth, height: frameHeight }
        ], false);

        // Set animation speeds
        this.animations.idle.speed = 300;
        this.animations.move_left.speed = 200;
        this.animations.move_right.speed = 200;
        this.animations.move_up.speed = 200;
        this.animations.attack.speed = 100;
        this.animations.hurt.speed = 150;
        this.animations.death.speed = 200;
    }

    /**
     * Ground slime specific update logic
     * @param {number} deltaTime - Time since last frame
     */
    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);
        
        // Update directional animation based on movement
        this.updateDirectionalAnimation();
        
        // Add slight bouncing effect when moving
        if (this.onGround && Math.abs(this.velocity.x) > 0.5) {
            this.addBounciness();
        }
    }
    
    /**
     * Update animation based on movement direction
     */
    updateDirectionalAnimation() {
        let newDirection = 'idle';
        
        // Determine direction based on velocity
        if (Math.abs(this.velocity.x) > 0.3) {
            newDirection = this.velocity.x > 0 ? 'move_right' : 'move_left';
        } else if (this.velocity.y < -1) {
            newDirection = 'move_up';
        }
        
        // Only change animation if direction changed and not in special states
        if (newDirection !== this.currentDirection && 
            this.currentAnimation !== 'attack' && 
            this.currentAnimation !== 'hurt' && 
            this.currentAnimation !== 'death') {
            
            this.currentDirection = newDirection;
            this.playAnimation(newDirection);
        }
    }

    /**
     * Add bouncing movement to make slime feel more alive
     */
    addBounciness() {
        // Small random bounces when moving
        if (Math.random() < 0.05) { // 5% chance per frame
            this.velocity.y -= 2;
        }
    }

    /**
     * Override patrol state for slime-specific behavior
     * @param {number} deltaTime - Time since last frame
     */
    patrolState(deltaTime) {
        super.patrolState(deltaTime);
        
        // Occasionally pause during patrol
        if (Math.random() < 0.002) { // Rare chance to pause
            this.velocity.x = 0;
            this.playAnimation('idle');
        }
    }

    /**
     * Override attack to add slime-specific effects
     * @param {number} deltaTime - Time since last frame
     */
    attackState(deltaTime) {
        // Slimes do a small jump when attacking
        if (this.stateTime < 50 && this.onGround) {
            this.velocity.y -= 4;
            this.velocity.x = this.facing * 2; // Lunge forward
        }
        
        super.attackState(deltaTime);
    }

    /**
     * Override damage handling for slime effects
     * @param {number} amount - Damage amount
     * @param {Entity} source - Damage source
     */
    onTakeDamage(amount, source) {
        super.onTakeDamage(amount, source);
        
        // Slimes become more aggressive when hurt
        this.chaseSpeed += 0.5;
        this.detectionRange += 20;
        
        // Create slime splatter effect
        this.createSlimeSplatter();
    }

    /**
     * Create slime splatter particles when hit
     */
    createSlimeSplatter() {
        // TODO: Add green particle effects
        // This would create green slime particles flying out
    }

    /**
     * Override state change for slime-specific sounds
     * @param {string} newState - New state
     * @param {string} oldState - Previous state
     */
    onStateChange(newState, oldState) {
        super.onStateChange(newState, oldState);
        
        // Play appropriate sounds for state changes
        const audio = this.game?.services?.audio || this.game?.audioManager;
        if (!audio) return;
        switch (newState) {
            case 'chase':
                if (oldState === 'patrol') {
                    audio.playSound?.('slime_alert', 0.4);
                }
                break;
            case 'attack':
                audio.playSound?.('slime_attack', 0.5);
                break;
            case 'hurt':
                audio.playSound?.('slime_hurt', 0.6);
                break;
        }
    }

    /**
     * Override drops for ground slime
     */
    handleDrops() {
        // Ground slimes drop coins often and have a 25% health potion chance
        this.dropChance = 1;
        this.dropTable = [
            { item: 'health_potion', chance: 0.25, amount: 1 }, // 25% chance for health potion
            { item: 'coin', chance: 0.6, amount: Math.floor(Math.random() * 3) + 1 }, // 60% chance coins
            { item: 'rocks', chance: 0.3, amount: Math.floor(Math.random() * 2) + 1 } // rocks as fallback
        ];
        
        super.handleDrops();
    }
}
