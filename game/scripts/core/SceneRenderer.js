/**
 * SceneRenderer - draws world entities and backgrounds.
 */
class SceneRenderer {
    constructor(game) {
        this.game = game;
    }

    render(ctx, canvas) {
        if (!ctx || !canvas) return;
        const g = this.game;

        // Background (farthest)
        // Use camera X/Y for world-aligned layers; parallax managers ignore Y internally
        const bgCamera = { x: g.camera?.x || 0, y: g.camera?.y || 0 };

        const isRoom = g.activeWorld?.kind === 'room';

        // Room letterboxing: draw black background and center room content
        let roomOffsetX = 0;
        let roomOffsetY = 0;
        if (isRoom) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate letterbox offsets to center the room
            const roomBounds = g.activeWorld?.bounds || { width: canvas.width, height: canvas.height };
            roomOffsetX = Math.max(0, (canvas.width - roomBounds.width) / 2);
            roomOffsetY = Math.max(0, (canvas.height - roomBounds.height) / 2);
            
            // Translate context to center the room content
            if (roomOffsetX > 0 || roomOffsetY > 0) {
                ctx.save();
                ctx.translate(roomOffsetX, roomOffsetY);
            }
        }

        if (g.testMode && !isRoom) {
            g.renderTestBackground(ctx, canvas);
        } else {
            g.backgroundLayers.forEach(layer => {
                if (layer?.render) {
                    layer.render(ctx, bgCamera);
                }
            });
        }

        if (!isRoom) {
            // Palms (should sit behind fronds/town elements)
            g.palmTreeManager.render(ctx, bgCamera, g.gameTime);

            // Town fronds/backdrop layer (in front of palms/background, behind ground/town elements)
            g.townDecor.filter(d => d.layer === 'backdrop' || d.layer === 'midground').forEach(decor => decor?.render?.(ctx, g.camera));
        }

        // Platforms (ground/floating) - skip drawing in rooms to hide floor visuals
        if (!isRoom) {
            g.platforms.forEach(platform => StylizedPlatform.renderPlatform(ctx, platform, g.camera, g));
        }

        // Town ground setpieces (e.g., town-specific ground tiles)
        if (!isRoom) {
            g.townDecor.filter(d => d.layer === 'ground').forEach(decor => decor?.render?.(ctx, g.camera));
        }

        // Foreground town elements (buildings, lamps, benches, etc.)
        if (!isRoom) {
            g.townDecor.filter(d => d.layer === 'foreground' || d.layer === undefined || d.layer === null).forEach(decor => decor?.render?.(ctx, g.camera));
        }

        // Signs
        g.signBoards.forEach(sign => sign?.render?.(ctx, g.camera));

        // NPCs
        g.npcs.forEach(npc => npc?.render?.(ctx, g.camera));

        // Chests
        g.chests.forEach(chest => chest?.render?.(ctx, g.camera));

        // Small palms (if any)
        g.smallPalms.forEach(palm => palm?.render?.(ctx, g.camera));

        // Hazards
        g.hazards.forEach(hazard => hazard?.render?.(ctx, g.camera));

        // Items
        g.items.forEach(item => item?.render?.(ctx, g.camera));

        // Enemies
        g.enemies.forEach(enemy => enemy?.render?.(ctx, g.camera));

        // Projectiles
        g.projectiles.forEach(projectile => projectile?.render?.(ctx, g.camera));

        // Player
        g.player?.render?.(ctx, g.camera);

        // Flag
        g.flag?.render?.(ctx, g.camera);
        
        // Restore context if we applied letterbox translation
        if (isRoom && (roomOffsetX > 0 || roomOffsetY > 0)) {
            ctx.restore();
        }
    }
}
