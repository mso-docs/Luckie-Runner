/**
 * TownPatrolNPC - modular town NPC with patrol loop and talk animation.
 */
class TownPatrolNPC extends BaseNPC {
    constructor(game, config = {}) {
        const width = config.width ?? 38;
        const height = config.height ?? 63;
        const patrolPath = Array.isArray(config.patrol) && config.patrol.length ? config.patrol : [{ x: config.x ?? 0, y: config.y ?? 0 }];
        const startX = (config.x !== undefined ? config.x : patrolPath[0]?.x) ?? 0;
        const startY = config.y ?? patrolPath[0]?.y ?? 0;
        super(startX, startY, width, height, {
            id: config.id,
            name: config.name || 'NPC',
            dialogueId: config.dialogueId || 'npc.default',
            interactRadius: config.interactRadius ?? 110,
            canTalk: true,
            spriteDefaultFacesLeft: config.spriteDefaultFacesLeft ?? false  // Default to right-facing
        });
        this.game = game;

        const sprite = config.sprite || 'art/sprites/mike.png';
        const frames = config.frames ?? 4;
        this.loadTileSheet(sprite, width, height, [0], 500);

        // Animation sets
        this.idleFrame = config.idleFrame ?? 2; // first walk frame is idle
        this.walkFrames = config.walkFrames ?? [2, 3]; // last two = walk cycle
        this.talkFrames = config.talkFrames ?? [0, 1]; // first two = talk
        this.tileAnimationFrames = this.walkFrames;
        this.tileAnimationSpeed = 320;

        // Patrol
        this.patrol = patrolPath.map(p => ({ x: p.x ?? startX, y: p.y ?? startY }));
        this.patrolIndex = 0;
        this.speed = config.speed ?? 40;
        this.pauseMs = config.pauseMs ?? 30; // brief pause when turning
        this.pauseTimer = 0;

        // Keep feet on ground
        const groundY = this.game?.townManager?.getGroundY();
        if (groundY !== null && groundY !== undefined) {
            this.y = groundY - this.height;
            this.patrol = this.patrol.map(p => ({
                x: p.x,
                y: groundY - this.height
            }));
        }

        // Disable gravity so patrol stays flat
        this.gravity = 0;
        this.onGround = true;
        this.active = true;

        // Hit reaction
        this.hitRecoverMs = 0;
        this.hitRecoverDuration = 220;
        this.homeX = this.x;
    }

    setTalking(isTalking) {
        if (isTalking) {
            this.isTalking = true;
            this.tileAnimationFrames = this.talkFrames;
            this.tileAnimationSpeed = 280;
            this.tileAnimationIndex = 0;
            this.tileAnimationTime = 0;
        } else {
            this.isTalking = false;
            this.tileAnimationFrames = this.walkFrames;
            this.tileAnimationSpeed = 320;
            this.tileAnimationIndex = 0;
            this.tileAnimationTime = 0;
            this.tileIndex = this.idleFrame;
        }
    }

    onDialogueClosed() {
        this.setTalking(false);
    }

    update(deltaTime) {
        if (!this.active) return;
        // Brief pause after hit knockback
        if (this.hitRecoverMs > 0) {
            this.hitRecoverMs = Math.max(0, this.hitRecoverMs - deltaTime);
        }
        // Stop patrol while talking
        if (!this.isTalking && this.hitRecoverMs <= 0 && this.patrol.length > 1) {
            if (this.pauseTimer > 0) {
                this.pauseTimer = Math.max(0, this.pauseTimer - deltaTime);
            } else {
                const target = this.patrol[this.patrolIndex];
                const dir = Math.sign((target.x ?? this.x) - this.x);
                const move = dir * this.speed * (deltaTime / 1000);
                const nextX = this.x + move;
                const reached = (dir >= 0 && nextX >= target.x) || (dir < 0 && nextX <= target.x);
                this.x = reached ? target.x : nextX;
                // Only update facing direction when not talking
                if (!this.isTalking) {
                    // Use same logic as BaseNPC.faceToward for consistency
                    if (this.spriteDefaultFacesLeft) {
                        this.flipX = dir < 0;  // Flip when moving left
                    } else {
                        this.flipX = dir > 0;  // Flip when moving right
                    }
                }

                if (reached) {
                    this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
                    this.pauseTimer = this.pauseMs;
                }
            }
        }

        // Advance animation frames
        this.updateAnimation(deltaTime);
    }

    /**
     * Reaction when hit by a projectile (no damage).
     */
    onProjectileHit(projectile) {
        const knockDir = projectile?.x < this.x ? 1 : -1;
        this.homeX = this.homeX ?? this.x;
        this.knockbackVelocityX = knockDir * 820;
        this.velocity.y = Math.min(this.velocity.y || 0, -420);
        this.hitRecoverMs = Math.max(this.hitRecoverDuration, 450);
        this.pauseTimer = Math.max(this.pauseTimer, this.hitRecoverDuration);

        // Small tilt/flash feedback
        this.tileAnimationFrames = this.walkFrames;
        this.tileAnimationIndex = this.idleFrame;
        this.tileAnimationTime = 0;
    }
}

if (typeof module !== 'undefined') {
    module.exports = TownPatrolNPC;
}
if (typeof window !== 'undefined') {
    window.TownPatrolNPC = TownPatrolNPC;
}
