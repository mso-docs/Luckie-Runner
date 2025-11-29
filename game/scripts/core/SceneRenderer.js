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

        // Background
        if (g.testMode) {
            g.renderTestBackground(ctx, canvas);
        } else {
            g.backgroundLayers.forEach(layer => {
                if (layer instanceof Background || layer instanceof ProceduralBackground) {
                    layer.render(ctx, g.camera);
                }
            });
        }

        // Canvas-based palms just behind platforms
        g.palmTreeManager.render(ctx, g.camera, g.gameTime);

        // Platforms
        g.platforms.forEach(platform => StylizedPlatform.renderPlatform(ctx, platform, g.camera));

        // Signs
        g.signBoards.forEach(sign => sign?.render?.(ctx, g.camera));

        // NPCs
        g.npcs.forEach(npc => npc?.render?.(ctx, g.camera));

        // Chests
        g.chests.forEach(chest => chest?.render?.(ctx, g.camera));

        // Small palms
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
    }
}
