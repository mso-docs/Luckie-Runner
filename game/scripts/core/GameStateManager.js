/**
 * GameStateManager - Handles game state transitions and menu management
 * Centralizes state logic for better maintainability
 */
class GameStateManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.currentState = 'menu';
        this.previousState = null;
        
        // Valid game states
        this.states = {
            MENU: 'menu',
            PLAYING: 'playing', 
            PAUSED: 'paused',
            GAME_OVER: 'gameOver',
            VICTORY: 'victory'
        };

        this.lastRunStats = { score: 0, coins: 0 };
        
        // GameStateManager initialized
    }

    /**
     * Capture the current run stats before wiping world state
     */
    captureRunStats() {
        this.lastRunStats = {
            score: this.game?.player?.score || 0,
            coins: this.game?.player?.coins || 0
        };
    }
    
    /**
     * Change game state with validation
     */
    setState(newState) {
        if (!Object.values(this.states).includes(newState)) {
            // Invalid state - not changing
            return false;
        }
        
        this.previousState = this.currentState;
        this.currentState = newState;
        
        // State changed
        return true;
    }
    
    /**
     * Get current state
     */
    getState() {
        return this.currentState;
    }
    
    /**
     * Check if in specific state
     */
    isState(state) {
        return this.currentState === state;
    }
    
    /**
     * Check if game is actively running
     */
    isPlaying() {
        return this.currentState === this.states.PLAYING;
    }
    
    /**
     * Check if game is paused
     */
    isPaused() {
        return this.currentState === this.states.PAUSED;
    }
    
    /**
     * Check if in menu
     */
    isInMenu() {
        return this.currentState === this.states.MENU;
    }
    
    /**
     * Start the game
     */
    startGame() {
        if (this.game?.sceneManager) {
            this.setState(this.states.PLAYING);
            this.game.sceneManager.change('play');
            return;
        }

        // Legacy flow
        if (this.game && typeof this.game.resetGame === 'function') {
            this.game.resetGame();
        }

        this.setState(this.states.PLAYING);
        this.game.running = true;
        this.hideAllMenus();

        this.game.initializeGameSystems();
        if (typeof this.game.startLoop === 'function') {
            this.game.startLoop();
        }
        if (this.game.audioManager) {
            this.game.audioManager.playMusic('level1', 0.8);
        }
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        if (!this.isState(this.states.PLAYING)) return;

        if (this.game?.sceneManager) {
            this.setState(this.states.PAUSED);
            this.game.sceneManager.change('pause');
            return;
        }

        this.setState(this.states.PAUSED);
        this.showMenu('pauseMenu');
        if (this.game.audioManager) {
            this.game.audioManager.setMusicVolume(this.game.audioManager.getMusicVolume() * 0.3);
        }
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        if (!this.isState(this.states.PAUSED)) return;

        if (this.game?.sceneManager) {
            this.setState(this.states.PLAYING);
            this.game.sceneManager.change('play');
            return;
        }

        this.setState(this.states.PLAYING);
        this.hideAllMenus();
        if (this.game.audioManager) {
            this.game.audioManager.setMusicVolume(this.game.audioManager.getMusicVolume() / 0.3);
        }
    }
    
    /**
     * Handle game over
     */
    gameOver() {
        this.captureRunStats();
        this.setState(this.states.GAME_OVER);
        this.game.running = false;
        if (typeof this.game.stopLoop === 'function') {
            this.game.stopLoop();
        }
        
        // Update game over screen
        const gameOverMenu = document.getElementById('gameOverMenu');
        const title = gameOverMenu.querySelector('h2');
        if (title) {
            title.textContent = 'Game Over';
        }
        
        // Update final scores
        this.updateFinalScores();
        if (this.game && typeof this.game.resetGame === 'function') {
            this.game.resetGame();
        }
        this.showMenu('gameOverMenu');
        
        // Play game over sound
        if (this.game.audioManager) {
            this.game.audioManager.stopAllMusic();
            this.game.audioManager.playSound('game_over', 0.8);
        }
        
        // Game Over
    }
    
    /**
     * Handle victory
     */
    victory() {
        this.captureRunStats();
        this.setState(this.states.VICTORY);
        this.game.running = false;
        if (typeof this.game.stopLoop === 'function') {
            this.game.stopLoop();
        }
        
        // Bonus points for victory
        if (this.game.player) {
            this.game.player.score += 1000;
            this.game.player.updateUI();
        }
        
        // Update victory screen
        const gameOverMenu = document.getElementById('gameOverMenu');
        const title = gameOverMenu.querySelector('h2');
        if (title) {
            title.textContent = 'Level Complete!';
        }
        
        this.updateFinalScores();
        if (this.game && typeof this.game.resetGame === 'function') {
            this.game.resetGame();
        }
        this.showMenu('gameOverMenu');
        
        // Play victory sound
        if (this.game.audioManager) {
            this.game.audioManager.stopAllMusic();
            this.game.audioManager.playSound('level', 0.8);
        }
        
        // Victory!
    }
    
    /**
     * Restart the game
     */
    restartGame() {
        this.setState(this.states.PLAYING);
        this.hideAllMenus();

        // Always rebuild world to respawn all items/entities
        if (this.game && typeof this.game.resetGame === 'function') {
            this.game.resetGame();
        }
        
        // Start new game
        this.startGame();
        
        // Game restarted
    }
    
    /**
     * Return to main menu
     */
    returnToMenu() {
        this.captureRunStats();
        this.setState(this.states.MENU);
        this.game.running = false;

        if (this.game?.sceneManager) {
            this.game.sceneManager.change('menu');
            return;
        }

        if (typeof this.game.stopLoop === 'function') {
            this.game.stopLoop();
        }
        if (this.game.audioManager) {
            this.game.audioManager.stopAllMusic();
        }
        this.game.resetGame();
        this.showMenu('startMenu');
        if (this.game.audioManager) {
            this.game.playTitleMusic();
        }
    }
    
    /**
     * Show specific menu
     */
    showMenu(menuId) {
        this.hideAllMenus();
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.remove('hidden');
            if (this.game && this.game.playMenuEnterSound) {
                this.game.playMenuEnterSound();
            }
        } else {
            // Menu not found - skipping
        }
    }
    
    /**
     * Hide all menus
     */
    hideAllMenus() {
        const menus = document.querySelectorAll('.menu');
        const anyVisible = Array.from(menus).some(menu => !menu.classList.contains('hidden'));
        menus.forEach(menu => {
            menu.classList.add('hidden');
        });
        if (anyVisible && this.game && this.game.playMenuExitSound) {
            this.game.playMenuExitSound();
        }
    }
    
    /**
     * Update final scores in UI
     */
    updateFinalScores() {
        const finalScoreElement = document.getElementById('finalScore');
        const finalCoinsElement = document.getElementById('finalCoins');
        
        if (finalScoreElement) {
            finalScoreElement.textContent = this.lastRunStats.score || 0;
        }
        if (finalCoinsElement) {
            finalCoinsElement.textContent = this.lastRunStats.coins || 0;
        }
    }
    
    /**
     * Handle keyboard shortcuts for state changes
     */
    handleKeyboardShortcuts(key) {
        switch (key) {
            case 'Escape':
            case 'p':
            case 'P':
                if (this.isState(this.states.PLAYING)) {
                    this.pauseGame();
                } else if (this.isState(this.states.PAUSED)) {
                    this.resumeGame();
                }
                break;
                
            case 'r':
            case 'R':
                if (this.isState(this.states.GAME_OVER) || this.isState(this.states.VICTORY)) {
                    this.restartGame();
                }
                break;
        }
    }
}
