/**
 * UIRenderer - reserved for canvas HUD overlays if needed.
 * Currently a no-op placeholder to keep the pipeline modular.
 */
class UIRenderer {
    constructor(game) {
        this.game = game;
    }

    render(ctx, canvas) {
        // No canvas HUD overlays; DOM handles UI.
        return;
    }
}
