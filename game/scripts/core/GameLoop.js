/**
 * GameLoop - Handles frame scheduling and delta time calculation.
 * Keeps time concerns decoupled from the Game so it can be reused elsewhere.
 */
class GameLoop {
    /**
     * @param {Object} options
     * @param {function(number, Object):void} options.onUpdate - Called every frame with (deltaMs, info)
     * @param {number} options.timeScale - Multiplier applied to delta
     * @param {number} options.maxDeltaMs - Upper clamp for raw delta to avoid huge jumps
     */
    constructor({ onUpdate, timeScale = 1, maxDeltaMs = 1000 / 15 } = {}) {
        this.onUpdate = onUpdate;
        this.timeScale = timeScale;
        this.maxDeltaMs = maxDeltaMs;

        this.running = false;
        this.lastTime = 0;
        this.gameTime = 0;
        this.frameCount = 0;

        this._tick = this._tick.bind(this);
    }

    setTimeScale(scale = 1) {
        this.timeScale = Math.max(0, scale);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this._tick);
    }

    stop() {
        this.running = false;
    }

    _tick(currentTime) {
        if (!this.running) return;

        const rawDelta = currentTime - this.lastTime;
        this.lastTime = currentTime;

        const clampedDelta = Math.min(rawDelta, this.maxDeltaMs);
        const delta = clampedDelta * this.timeScale;

        this.gameTime += delta;
        this.frameCount += 1;

        if (typeof this.onUpdate === 'function') {
            this.onUpdate(delta, {
                rawDelta: clampedDelta,
                gameTime: this.gameTime,
                frame: this.frameCount,
                timeScale: this.timeScale
            });
        }

        requestAnimationFrame(this._tick);
    }
}
