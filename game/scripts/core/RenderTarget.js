/**
 * RenderTarget - simple interface wrapper for rendering surfaces.
 */
class RenderTarget {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    clear() {
        this.ctx?.clearRect?.(0, 0, this.canvas?.width || 0, this.canvas?.height || 0);
    }

    width() {
        return this.canvas?.width || 0;
    }

    height() {
        return this.canvas?.height || 0;
    }
}
