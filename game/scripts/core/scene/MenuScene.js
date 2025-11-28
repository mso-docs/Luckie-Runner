class MenuScene {
    attach(game) {
        this.game = game;
    }

    enter() {
        // ensure menu visible
        this.game.stateManager.showMenu('startMenu');
        this.game.running = false;
        this.game.stopLoop?.();
        this.game.ensureTitleMusicPlaying?.();
    }

    exit() {
        this.game.stateManager.hideAllMenus();
    }

    update() {
        // menus are DOM-driven; no canvas updates needed
    }

    render() {
        // menus are DOM; nothing to render on canvas
    }
}
