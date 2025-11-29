class MenuScene {
    attach(ctx) {
        this.ctx = ctx;
    }

    enter() {
        // ensure menu visible
        this.ctx.stateManager.showMenu('startMenu');
        this.ctx.setRunning?.(false);
        this.ctx.stopLoop?.();
        this.ctx.ensureTitleMusicPlaying?.();
    }

    exit() {
        this.ctx.stateManager.hideAllMenus();
    }

    update() {
        // menus are DOM-driven; no canvas updates needed
    }

    render() {
        // menus are DOM; nothing to render on canvas
    }
}
