/**
 * DebugRenderer - draws collision overlays and debug shapes.
 */
class DebugRenderer {
    constructor(game) {
        this.game = game;
    }

    render(ctx) {
        const g = this.game;
        if (!ctx) return;
        const cam = g.camera || { x: 0, y: 0 };
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

        if (g.player) {
            const r = rectForEntity(g.player);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,255,0,0.25)', '#00ff00');
        }
        g.enemies.forEach(enemy => {
            if (!enemy) return;
            const r = rectForEntity(enemy);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,0,0,0.25)', '#ff0000');
        });
        g.items.forEach(item => {
            if (!item) return;
            const r = rectForEntity(item);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,215,0,0.25)', '#ffd700');
        });
        g.projectiles.forEach(p => {
            if (!p) return;
            const r = rectForEntity(p);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,255,255,0.25)', '#00ffff');
        });
        g.hazards.forEach(h => {
            if (!h) return;
            const r = rectForEntity(h);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(255,0,255,0.25)', '#ff00ff');
        });
        g.chests.forEach(ch => {
            if (!ch) return;
            const r = rectForEntity(ch);
            drawRect(r.x, r.y, r.w, r.h, 'rgba(0,0,255,0.25)', '#0000ff');
        });
        if (Array.isArray(g.smallPalms)) {
            g.smallPalms.forEach(palm => {
                if (!palm) return;
                const r = rectForEntity(palm);
                drawRect(r.x, r.y, r.w, r.h, 'rgba(0,128,0,0.25)', '#008000');
            });
        }
        g.platforms.forEach(p => {
            if (!p) return;
            const x = p.x - cam.x;
            const y = p.y - cam.y;
            drawRect(x, y, p.width, p.height, 'rgba(128,128,128,0.2)', '#808080');
        });
        if (Array.isArray(g.signBoards)) {
            g.signBoards.forEach(sign => {
                if (!sign) return;
                const r = rectForEntity(sign);
                drawRect(r.x, r.y, r.w, r.h, 'rgba(255,165,0,0.25)', '#ffa500');
            });
        }
    }
}
