/**
 * DecorPlatform - configurable, static, solid surface with optional art.
 * Used for jumpable/invisible platforms where collision and visuals can vary per instance.
 * Supply width/height (collision box), optional sprite/frame data, and offsets.
 */
class DecorPlatform extends Entity {
    constructor(x, y, config = {}) {
        const width = config.width ?? 120;
        const height = config.height ?? 32;
        super(x ?? 0, y ?? 0, width, height);
        this.type = config.type || 'decor_platform';

        // Collision
        this.solid = true;
        this.hitbox = {
            width: config.hitboxWidth ?? width,
            height: config.hitboxHeight ?? height,
            offsetX: config.hitboxOffsetX ?? 0,
            offsetY: config.hitboxOffsetY ?? 0
        };

        // Visuals
        this.spritePath = config.sprite || null;
        this.frameWidth = config.frameWidth ?? config.width ?? width;
        this.frameHeight = config.frameHeight ?? config.height ?? height;
        this.frames = config.frames ?? 1;
        this.frameDirection = config.frameDirection || 'horizontal';
        this.fallbackColor = config.fallbackColor || '#5a5a5a';

        // Apply hitbox
        this.collisionBox = new CollisionBox(
            this.hitbox.width,
            this.hitbox.height,
            { x: this.hitbox.offsetX, y: this.hitbox.offsetY }
        );
        this.collisionBox.applyTo(this);

        // Load art if provided
        if (this.spritePath) {
            this.loadSprite(this.spritePath, {
                frameWidth: this.frameWidth,
                frameHeight: this.frameHeight,
                frames: this.frames,
                frameDirection: this.frameDirection
            });
        }
    }

    // Static object: no physics updates needed beyond base collision.
    updatePhysics() {}
}

if (typeof window !== 'undefined') {
    window.DecorPlatform = DecorPlatform;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DecorPlatform;
}
