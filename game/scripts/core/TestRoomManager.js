/**
 * TestRoomManager - handles test-mode toggles and snapshot restore.
 */
class TestRoomManager {
    constructor(game) {
        this.game = game;
    }

    toggleTestMode() {
        const g = this.game;
        g.testMode = !g.testMode;
        if (g.stateManager?.isPlaying()) {
            g.stateManager.startGame();
        }
    }

    resetSnapshots() {
        this.game.initialTestRoomState = null;
    }
}
