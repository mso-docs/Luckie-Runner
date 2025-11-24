/**
 * GroundSlime - Basic enemy that moves horizontally
 * Simple patrol and chase behavior
 */
class GroundSlime extends Enemy {
    constructor(x, y) {
        super(x, y, 24, 20);
        
        // Ground slime specific properties
        this.type = 'ground_slime';
        this.health = 30;
        this.maxHealth = 30;
        this.patrolSpeed = 0.8;
        this.chaseSpeed = 2.5;
        this.attackDamage = 15;
        this.attackRange = 30;
        this.detectionRange = 120;
        
        // Physics - slimes are bouncy
        this.friction = 0.9;
        this.gravity = 0.4;
        
        // Animation setup
        this.setupAnimations();
        this.playAnimation('idle');
        
        // Set fallback color (green slime)
        this.fallbackColor = '#44ff44';
        
        // Load sprite
        this.loadSprite('art/sprites/green-slime.png');
        
        // Set collision bounds (smaller than sprite for better gameplay)
        this.collisionOffset = { x: 2, y: 4 };
        this.collisionWidth = 20;
        this.collisionHeight = 16;
    }

    /**
     * Set up animations for ground slime
     */
    setupAnimations() {
        const frameWidth = 24;
        const frameHeight = 20;
        
        // Idle animation - gentle bounce
        this.addAnimation('idle', [
            { x: 0, y: 0, width: frameWidth, height: frameHeight },
            { x: 24, y: 0, width: frameWidth, height: frameHeight },
            { x: 48, y: 0, width: frameWidth, height: frameHeight },
            { x: 24, y: 0, width: frameWidth, height: frameHeight }
        ], true);
        
        // Walk animation - slime stretch and compress
        this.addAnimation('walk', [
            { x: 0, y: 20, width: frameWidth, height: frameHeight },
            { x: 24, y: 20, width: frameWidth, height: frameHeight },
            { x: 48, y: 20, width: frameWidth, height: frameHeight },
            { x: 72, y: 20, width: frameWidth, height: frameHeight }
        ], true);
        
        // Run animation - faster movement
        this.addAnimation('run', [
            { x: 0, y: 40, width: frameWidth, height: frameHeight },
            { x: 24, y: 40, width: frameWidth, height: frameHeight },
            { x: 48, y: 40, width: frameWidth, height: frameHeight },
            { x: 72, y: 40, width: frameWidth, height: frameHeight }
        ], true);
        
        // Attack animation - slime extends forward
        this.addAnimation('attack', [
            { x: 0, y: 60, width: frameWidth, height: frameHeight },
            { x: 24, y: 60, width: frameWidth, height: frameHeight },
            { x: 48, y: 60, width: frameWidth, height: frameHeight }
        ], false);
        
        // Hurt animation
        this.addAnimation('hurt', [
            { x: 72, y: 60, width: frameWidth, height: frameHeight },
            { x: 96, y: 60, width: frameWidth, height: frameHeight }
        ], false);
        
        // Death animation - slime melts
        this.addAnimation('death', [
            { x: 0, y: 80, width: frameWidth, height: frameHeight },
            { x: 24, y: 80, width: frameWidth, height: frameHeight },
            { x: 48, y: 80, width: frameWidth, height: frameHeight },
            { x: 72, y: 80, width: frameWidth, height: frameHeight }
        ], false);

        // Set animation speeds
        this.animations.idle.speed = 300;
        this.animations.walk.speed = 200;
        this.animations.run.speed = 120;
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
        
        // Add slight bouncing effect when moving
        if (this.onGround && Math.abs(this.velocity.x) > 0.5) {
            this.addBounciness();
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
        if (this.game.audioManager) {
            switch (newState) {
                case 'chase':
                    if (oldState === 'patrol') {
                        this.game.audioManager.playSound('slime_alert', 0.4);
                    }
                    break;
                case 'attack':
                    this.game.audioManager.playSound('slime_attack', 0.5);
                    break;
                case 'hurt':
                    this.game.audioManager.playSound('slime_hurt', 0.6);
                    break;
            }
        }
    }

    /**
     * Override drops for ground slime
     */
    handleDrops() {
        // Ground slimes have higher coin drop rate
        this.dropChance = 0.8;
        this.dropTable = [
            { item: 'coin', chance: 0.9, amount: 1 },
            { item: 'health', chance: 0.1, amount: 5 }
        ];
        
        super.handleDrops();
    }
}