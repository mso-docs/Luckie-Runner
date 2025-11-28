/**
 * Camera - Tracks viewport position and keeps movement logic isolated.
 */
class Camera {
    constructor({ viewportWidth = 0, viewportHeight = 0, lead = { x: 0, y: 0 }, lerpSpeed = 0.15 } = {}) {
        this.x = 0;
        this.y = 0;
        this.target = { x: 0, y: 0 };
        this.lead = lead || { x: 0, y: 0 };
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.lerpSpeed = lerpSpeed;
        this.bounds = { width: 0, height: 0 };
    }

    /**
     * Update viewport dimensions (needed if canvas resizes).
     */
    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    /**
     * Update world bounds for clamping.
     */
    setBounds(width, height) {
        this.bounds.width = width || 0;
        this.bounds.height = height || 0;
    }

    /**
     * Reset camera to a position.
     */
    reset(position = { x: 0, y: 0 }) {
        this.x = position.x || 0;
        this.y = position.y || 0;
        this.target = { x: this.x, y: this.y };
    }

    /**
     * Follow the player with optional test-mode behavior.
     */
    followPlayer(player, { testMode = false } = {}) {
        if (!player) return;

        if (testMode) {
            this.x = player.x - this.viewportWidth / 2 + player.width / 2;
            this.y = 0;
            return;
        }

        this.target.x = player.x - this.viewportWidth / 2 + player.width / 2 + (this.lead?.x || 0);
        this.target.y = player.y - this.viewportHeight / 2 + player.height / 2 + (this.lead?.y || 0);

        this.x += (this.target.x - this.x) * this.lerpSpeed;
        this.y += (this.target.y - this.y) * this.lerpSpeed;

        // Clamp to world bounds
        const maxX = Math.max(0, (this.bounds.width || 0) - this.viewportWidth);
        const maxY = Math.max(0, (this.bounds.height || 0) - this.viewportHeight);
        this.x = Math.max(0, Math.min(maxX, this.x));
        this.y = Math.max(0, Math.min(maxY, this.y));
    }

    /**
     * Current camera state snapshot.
     */
    getState() {
        return { x: this.x, y: this.y };
    }
}
