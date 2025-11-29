/**
 * Renderer - keeps drawing concerns out of Game.
 * Responsible for clearing, drawing layers/entities, and debug overlays.
 */
class Renderer {
    constructor(game, services = {}) {
        this.game = game;
        this.services = services;
        this.sceneRenderer = new SceneRenderer(game);
        this.uiRenderer = new UIRenderer(game);
        this.debugRenderer = new DebugRenderer(game);
    }

    /**
     * Resolve render context from DI services or fall back to the game's canvas.
     */
    getContext() {
        const render = this.services?.render || this.game?.services?.render || null;
        if (render && render.ctx && render.canvas) {
            return {
                ctx: render.ctx,
                canvas: render.canvas,
                clear: render.clear ? render.clear.bind(render) : () => render.ctx.clearRect(0, 0, render.canvas.width, render.canvas.height),
                width: render.width ? render.width.bind(render) : () => render.canvas.width,
                height: render.height ? render.height.bind(render) : () => render.canvas.height
            };
        }

        const ctx = this.game?.ctx || null;
        const canvas = this.game?.canvas || null;
        if (!ctx || !canvas) {
            console.error('Renderer: missing canvas or context.');
            throw new Error('Renderer: missing canvas or context.');
        }
        return {
            ctx,
            canvas,
            clear: () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            },
            width: () => canvas.width,
            height: () => canvas.height
        };
    }

    /**
     * Main render entry point.
     */
    renderFrame() {
        const { ctx, canvas, clear } = this.getContext();
        if (!ctx || !canvas) {
            console.error('Renderer: unable to render frame due to missing context.');
            throw new Error('Renderer: missing render context.');
        }

        clear();

        this.sceneRenderer.render(ctx, canvas);
        this.uiRenderer.render(ctx, canvas);

        // Keep UI elements anchored
        if (this.game.dialogueManager?.isActive()) {
            this.game.uiManager?.updateDialoguePosition?.();
        }
        this.game.uiManager?.updateNpcCallouts?.();

        if (this.game.debug) {
            this.debugRenderer.render(ctx);
        }
    }

    /**
     * Test-room specific background grid.
     */
    renderTestBackground(ctx, canvas) {
        if (!ctx || !canvas) return;
        this.game.palmTreeManager.render(ctx, this.game.camera, this.game.gameTime);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(5, 15, 360, 70);

        ctx.fillStyle = 'white';
        ctx.font = '16px "Hey Gorgeous", "Trebuchet MS", "Fredoka One", "Segoe UI", sans-serif';
        ctx.fillText('TEST ROOM - Debug Environment', 10, 35);
        ctx.fillText('Press F2 to toggle back to main game', 10, 55);
        ctx.fillText('Grid: 100px squares', 10, 75);
    }
}
