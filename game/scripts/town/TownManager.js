/**
 * TownManager - handles town region detection and entry UI.
 * Designed for modular towns with banners/buildings/foreground/interiors.
 */
class TownManager {
    constructor(game, config = {}) {
        this.game = game;
        this.towns = (config && config.towns) ? [...config.towns] : [];
        this.currentTownId = null;
        this.lastBannerAt = 0;
    }

    /**
        * Check player position and trigger town entry when crossing a region.
        */
    update(deltaTime = 0) {
        const g = this.game;
        const p = g.player;
        if (!p || !g.level) return;

        const town = this.getTownForPosition(g.currentLevelId, p.x);
        const townId = town?.id || null;
        if (townId && townId !== this.currentTownId) {
            this.currentTownId = townId;
            this.lastBannerAt = g.gameTime || 0;
            g.uiManager?.showTownBanner?.(town);
            this.loadTownContent(town);
        } else if (!townId) {
            this.currentTownId = null;
        }
    }

    /**
     * Placeholder for future building/foreground/interior instantiation.
     */
    loadTownContent(town) {
        // Future: instantiate buildings/foreground/interiors from town config.
        // e.g., this.game.worldBuilder.buildTown(town);
    }

    getTownForPosition(levelId, x) {
        if (!Array.isArray(this.towns)) return null;
        return this.towns.find(t => (!t.levelId || t.levelId === levelId) && x >= (t.region?.startX ?? Infinity) && x <= (t.region?.endX ?? -Infinity)) || null;
    }
}
