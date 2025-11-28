/**
 * SmallPalm - Foreground palm entity with simple landing/leave animation triggers
 * Frames: 9 horizontal frames, 121px wide, 191px tall.
 * Frame 0: idle. Frames 1-4: landing. Frames 4-8: departure/settling.
 * Frame 8 (index) is shown while the player is on top.
 */
class SmallPalm extends Entity {
    constructor(x, y) {
        super(x, y, 121, 191);
        this.spritePath = 'art/bg/palms/small-palm.png';
        this.frameCount = 9;
        this.frameWidth = 121;
        this.frameHeight = 191;
        this.animationBuilt = false;
        this.playerOnTopCurrent = false;
        this.wasOnTop = false;
        this.state = 'idle';

        this.animationSpeed = 90; // ms per frame for landing/leave
        this.loadSprite(this.spritePath);
        this.collisionBox = new CollisionBox(this.width, this.height, { x: 0, y: 0 });
        this.collisionReduced = false;
        this.resetCollisionBox();
        this.lastDropTime = 0;
        this.dropCooldown = 1500; // ms between drops
        this.dropChance = 0.2; // 1 in 5 chance on landing
        this.lowerHitActive = false;
    }

    resetCollisionBox() {
        this.collisionReduced = false;
        this.collisionBox.reset(this.width, this.height, { x: 0, y: 0 });
        this.collisionBox.applyTo(this);
    }

    applyOccupiedCollision() {
        this.collisionBox.setTarget(
            121,
            137,
            { x: 0, y: this.height - 137 }
        );
        this.collisionReduced = true;
    }

    ensureAnimations() {
        if (this.animationBuilt || !this.spriteLoaded) return;

        const sourceWidth = this.sprite.naturalWidth || this.sprite.width || (this.frameWidth * this.frameCount);
        const sourceHeight = this.sprite.naturalHeight || this.sprite.height || this.frameHeight;
        const frameW = sourceWidth / this.frameCount;
        const frameH = sourceHeight;

        const buildFrames = (start, endInclusive) => {
            const frames = [];
            for (let i = start; i <= endInclusive; i++) {
                frames.push({
                    x: frameW * i,
                    y: 0,
                    width: frameW,
                    height: frameH
                });
            }
            return frames;
        };

        this.addAnimation('idle', buildFrames(0, 0), false);      // frame 1 idle
        this.addAnimation('occupied', buildFrames(4, 4), false); // frame 4 when player on top

        const leaveFrames = buildFrames(4, 8);   // frames 5-9 when leaving
        this.addAnimation('depart', leaveFrames, false);

        // Set per-animation speed
        this.animations['depart'].speed = this.animationSpeed;
        // Freeze occupied by giving it a huge frame duration and single frame
        if (this.animations['occupied']) {
            this.animations['occupied'].speed = 999999;
        }

        this.playAnimation('idle', true);
        this.animationBuilt = true;
    }

    /**
     * Mark whether the player is on top this frame.
     * @param {boolean} isOnTop
     * @param {boolean} landedThisFrame - true when first contact occurs
     */
    setPlayerOnTop(isOnTop, landedThisFrame = false) {
        this.playerOnTopCurrent = this.playerOnTopCurrent || isOnTop;
        if (isOnTop && (landedThisFrame || !this.wasOnTop)) {
            this.triggerLand();
            if (landedThisFrame) {
                this.tryDropCoconut();
            }
        }
        // When the player leaves the top, allow another drop chance on the next landing
        if (isOnTop) {
            // Adjust collision to sit lower while occupied so the player appears to stand on top
            this.applyOccupiedCollision();
        }
    }

    /**
     * Called once per frame after collision checks to finalize state transitions.
     */
    finalizeContactFrame() {
        this.ensureAnimations();

        // Leaving detection
        if (!this.playerOnTopCurrent && this.wasOnTop) {
            this.triggerDepart();
            // Chance to drop when leaving the collision box
            this.tryDropCoconut();
        }

        // Staying on top keeps the occupied frame locked
        if (this.playerOnTopCurrent) {
            this.state = 'occupied';
            this.playAnimation('occupied', true);
            this.animationFrame = 0;
            this.animationTime = 0;
        }

        this.wasOnTop = this.playerOnTopCurrent;
        this.playerOnTopCurrent = false;
        this.lowerHitActive = false;
    }

    triggerLand() {
        this.ensureAnimations();
        this.state = 'occupied';
        this.playAnimation('occupied', true);
        this.animationFrame = 0;
        this.animationTime = 0;
        this.applyOccupiedCollision();
    }

    triggerDepart() {
        this.ensureAnimations();
        this.state = 'departing';
        this.playAnimation('depart', true);
    }

    onAnimationComplete(animationName) {
        if (animationName === 'depart') {
            this.state = 'idle';
            this.playAnimation('idle', true);
            this.resetCollisionBox();
        }
    }

    // Small palm is static; no physics/gravity
    updatePhysics() {}

    onUpdate(deltaTime = 0) {
        this.ensureAnimations();

        // Smooth collision transitions in sync with animation timing
        this.collisionBox.update(deltaTime, this.animationSpeed || 100);
        this.collisionBox.applyTo(this);

        // Explicitly skip animation advancement while occupied
        if (this.state === 'occupied') {
            this.animationFrame = 0;
            this.animationTime = 0;
            return;
        }
    }

    getShadowScale() {
        return { x: 0.7, y: 0.4 };
    }

    tryDropCoconut() {
        if (!this.game) return;
        const now = Date.now();
        if (now - this.lastDropTime < this.dropCooldown) return;
        if (Math.random() > this.dropChance) return;

        // Spawn at the base of the palm (near trunk foot)
        const dropX = this.x + (this.width / 2) - 12;
        const dropY = this.y + this.height - 24;
        const coconut = new CoconutItem(dropX, dropY, 1);
        coconut.game = this.game;
        this.game.items.push(coconut);
        this.lastDropTime = now;
    }
}
