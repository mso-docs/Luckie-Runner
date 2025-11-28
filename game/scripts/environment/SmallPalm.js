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
        this.addAnimation('occupied', buildFrames(3, 3), false); // frame 4 when player on top

        const leaveFrames = buildFrames(5, 8);   // frames 6-9 when leaving
        this.addAnimation('depart', leaveFrames, false);

        // Set per-animation speed
        this.animations['depart'].speed = this.animationSpeed;

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
    }

    triggerLand() {
        this.ensureAnimations();
        this.state = 'occupied';
        this.playAnimation('occupied', true);
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
        }
    }

    // Small palm is static; no physics/gravity
    updatePhysics() {}

    onUpdate() {
        this.ensureAnimations();
    }

    getShadowScale() {
        return { x: 0.7, y: 0.4 };
    }
}
