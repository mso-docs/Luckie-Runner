/**
 * ThemeRegistry - maps theme ids to background presets.
 * Keeps background generation data-driven and reusable.
 */
class ThemeRegistry {
    constructor() {
        this.themes = {};

        // Default built-in themes
        this.register('beach', {
            layers: [
                { type: 'procedural', speed: 0.1, y: 0, generator: BackgroundGenerators.createSunsetSky, heightScale: 1, widthScale: 1 },
                { type: 'procedural', speed: 0.3, y: 0.6, generator: BackgroundGenerators.createOcean, heightScale: 0.4, widthScale: 2 },
                { type: 'procedural', speed: 0.5, y: 0.5, generator: BackgroundGenerators.createHills, heightScale: 0.5, widthScale: 1.5 }
            ]
        });

        this.register('flat', {
            layers: []
        });
    }

    register(id, theme) {
        this.themes[id] = theme;
    }

    get(id) {
        return this.themes[id] || this.themes.beach || null;
    }

    /**
     * Build Background/ProceduralBackground instances for a theme id.
     */
    buildLayers(id, game) {
        const theme = this.get(id);
        if (!theme) return [];
        const render = game.getRenderService ? game.getRenderService() : { width: () => game.canvas?.width ?? 0, height: () => game.canvas?.height ?? 0 };
        const width = render.width();
        const height = render.height();

        return (theme.layers || []).map(layer => {
            const layerWidth = width * (layer.widthScale || 1);
            const layerHeight = height * (layer.heightScale || 1);
            if (layer.type === 'procedural' && typeof layer.generator === 'function') {
                return new ProceduralBackground(
                    layerWidth,
                    layerHeight,
                    layer.speed ?? 0.1,
                    layer.y != null ? height * layer.y : 0,
                    layer.generator
                );
            }
            if (layer.type === 'image' && layer.src) {
                return new Background(layer.src, layer.speed ?? 0.2, layer.y ?? 0, layer.infiniteScroll ?? false);
            }
            return null;
        }).filter(Boolean);
    }
}
