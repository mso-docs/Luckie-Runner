/**
 * RenderContext - adapter for canvas/context.
 */
class RenderContext {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    clear() {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    width() {
        return this.canvas?.width || 0;
    }

    height() {
        return this.canvas?.height || 0;
    }
}
