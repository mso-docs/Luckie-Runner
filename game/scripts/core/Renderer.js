/**
 * Renderer - keeps drawing concerns out of Game.
 * Responsible for clearing, drawing layers/entities, and debug overlays.
 */
class Renderer {
    constructor(game, services = {}) {
        this.game = game;
        this.services = services;
    }

    /**
     * Resolve render context from DI services or fall back to the game's canvas.
     */
    getContext() {
        const render = this.services?.render || this.game?.services?.render || null;
        if (render) {
            return {
                ctx: render.ctx || this.game?.ctx || null,
                canvas: render.canvas || this.game?.canvas || null,
                clear: render.clear ? render.clear.bind(render) : () => {
                    const ctx = render.ctx || this.game?.ctx;
                    const canvas = render.canvas || this.game?.canvas;
                    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                },
                width: render.width ? render.width.bind(render) : () => render.canvas?.width ?? this.game?.canvas?.width ?? 0,
                height: render.height ? render.height.bind(render) : () => render.canvas?.height ?? this.game?.canvas?.height ?? 0
            };
        }

        const ctx = this.game?.ctx || null;
        const canvas = this.game?.canvas || null;
        return {
            ctx,
            canvas,
            clear: () => {
                if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
            },
            width: () => canvas?.width ?? 0,
            height: () => canvas?.height ?? 0
        };
    }

    /**
     * Main render entry point.
     */
    renderFrame() {
        const { ctx, canvas, clear } = this.getContext();
        if (!ctx || !canvas) return;

        clear();

        this.renderBackground(ctx, canvas);

        // Canvas-based palms go just behind platforms
        this.game.palmTreeManager.render(ctx, this.game.camera, this.game.gameTime);

        this.renderPlatforms(ctx);
        this.renderSigns(ctx);
        this.renderNPCs(ctx);
        this.renderChests(ctx);

        if (Array.isArray(this.game.smallPalms)) {
            this.game.smallPalms.forEach(palm => palm.render(ctx, this.game.camera));
        }

        this.game.hazards.forEach(hazard => hazard.render(ctx, this.game.camera));
        this.game.items.forEach(item => item.render(ctx, this.game.camera));
        this.game.enemies.forEach(enemy => enemy.render(ctx, this.game.camera));
        this.game.projectiles.forEach(projectile => projectile.render(ctx, this.game.camera));
        if (this.game.player) this.game.player.render(ctx, this.game.camera);
        if (this.game.flag) this.game.flag.render(ctx, this.game.camera);

        // Keep UI elements anchored
        if (this.game.dialogueManager?.isActive()) {
            this.game.uiManager?.updateDialoguePosition?.();
        }
        this.game.uiManager?.updateNpcCallouts?.();

        if (this.game.debug) {
            this.renderDebugOverlay(ctx);
        }
    }

    /**
     * Render layered parallax background or test grid.
     */
    renderBackground(ctx, canvas) {
        if (!ctx || !canvas) return;
        if (this.game.testMode) {
            this.renderTestBackground(ctx, canvas);
            return;
        }

        this.game.backgroundLayers.forEach(layer => {
            if (layer instanceof Background || layer instanceof ProceduralBackground) {
                layer.render(ctx, this.game.camera);
            }
        });
    }

    renderPlatforms(ctx) {
        if (!ctx) return;
        this.game.platforms.forEach(platform => {
            StylizedPlatform.renderPlatform(ctx, platform, this.game.camera);
        });
    }

    renderNPCs(ctx) {
        if (!ctx) return;
        this.game.npcs.forEach(npc => {
            if (npc.render) npc.render(ctx, this.game.camera);
        });
    }

    renderChests(ctx) {
        if (!ctx) return;
        this.game.chests.forEach(chest => {
            if (chest?.render) chest.render(ctx, this.game.camera);
        });
    }

    renderSigns(ctx) {
        if (!ctx || !Array.isArray(this.game.signBoards)) return;
        this.game.signBoards.forEach(sign => {
            if (sign?.render) sign.render(ctx, this.game.camera);
        });
    }

    renderDebugOverlay(ctx) {
        if (!ctx) return;
        const cam = this.game.camera || { x: 0, y: 0 };
        const drawRect = (x, y, w, h, color = 'rgba(0,255,0,0.35)', stroke = '#00ff00') => {
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1;
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        };

        const rectForEntity = (e) => ({
            x: (e.x + (e.collisionOffset?.x || 0)) - cam.x,
            y: (e.y + (e.collisionOffset?.y || 0)) - cam.y,
            w: e.collisionWidth || e.width || 0,
            h: e.collisionHeight || e.height || 0
        });

        if (this.game.player) {
            const r = rectForEntity(this.game.player);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,255,0,0.25)', '#00ff00');
        }

        this.game.enemies.forEach(enemy => {
            if (!enemy) return;
            const r = rectForEntity(enemy);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,0,0,0.25)', '#ff0000');
        });
        this.game.items.forEach(item => {
            if (!item) return;
            const r = rectForEntity(item);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,215,0,0.25)', '#ffd700');
        });
        this.game.projectiles.forEach(p => {
            if (!p) return;
            const r = rectForEntity(p);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,255,255,0.25)', '#00ffff');
        });
        this.game.hazards.forEach(h => {
            if (!h) return;
            const r = rectForEntity(h);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,0,255,0.25)', '#ff00ff');
        });
        this.game.chests.forEach(ch => {
            if (!ch) return;
            const r = rectForEntity(ch);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,0,255,0.25)', '#0000ff');
        });

        if (Array.isArray(this.game.smallPalms)) {
            this.game.smallPalms.forEach(palm => {
                if (!palm) return;
                const r = rectForEntity(palm);
                drawRect(r.x, r.y, r.w, r.h, 'rgba(0,128,0,0.25)', '#008000');
            });
        }

        this.game.platforms.forEach(p => {
            if (!p) return;
            drawRect(p.x - cam.x, p.y - cam.y, p.width, p.height, 'rgba(128,128,128,0.2)', '#808080');
        });

        if (Array.isArray(this.game.signBoards)) {
            this.game.signBoards.forEach(sign => {
                if (!sign) return;
                const r = rectForEntity(sign);
                drawRect(r.x, r.y, r.w, r.h, 'rgba(255,165,0,0.25)', '#ffa500');
            });
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
