/**
 * CollisionBox - manages an entity's collision dimensions and smoothing toward targets.
 */
class CollisionBox {
    constructor(width = 0, height = 0, offset = { x: 0, y: 0 }) {
        this.width = width;
        this.height = height;
        this.offset = { x: offset.x || 0, y: offset.y || 0 };

        this.target = {
            width: this.width,
            height: this.height,
            offset: { ...this.offset }
        };
        this.snapThreshold = 0.5;
    }

    /**
     * Set a new target collision box to interpolate toward.
     */
    setTarget(width, height, offset = { x: 0, y: 0 }) {
        this.target = {
            width,
            height,
            offset: { x: offset.x || 0, y: offset.y || 0 }
        };
    }

    /**
     * Reset box and target to given size/offset immediately.
     */
    reset(width, height, offset = { x: 0, y: 0 }) {
        this.width = width;
        this.height = height;
        this.offset = { x: offset.x || 0, y: offset.y || 0 };
        this.setTarget(width, height, offset);
    }

    /**
     * Smoothly interpolate toward the target based on deltaTime and a base speed.
     */
    update(deltaTime = 0, baseSpeedMs = 100) {
        const lerp = (a, b, t) => a + (b - a) * t;
        const factor = Math.min(1, Math.max(0.05, deltaTime / (baseSpeedMs || 100))) || 0.35;

        this.width = lerp(this.width, this.target.width, factor);
        this.height = lerp(this.height, this.target.height, factor);
        this.offset = {
            x: lerp(this.offset.x, this.target.offset.x, factor),
            y: lerp(this.offset.y, this.target.offset.y, factor)
        };

        const close = (a, b) => Math.abs(a - b) < this.snapThreshold;
        if (close(this.width, this.target.width)) this.width = this.target.width;
        if (close(this.height, this.target.height)) this.height = this.target.height;
        if (close(this.offset.x, this.target.offset.x)) this.offset.x = this.target.offset.x;
        if (close(this.offset.y, this.target.offset.y)) this.offset.y = this.target.offset.y;
    }

    /**
     * Apply current box values to an entity's collision fields.
     */
    applyTo(entity) {
        if (!entity) return;
        entity.collisionWidth = this.width;
        entity.collisionHeight = this.height;
        entity.collisionOffset = { ...this.offset };
    }
}
