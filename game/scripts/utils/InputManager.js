/**
 * InputManager - Handles all keyboard and mouse input for the game
 * Provides a clean interface for checking input states
 */
class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            clicked: false,
            pressed: false
        };

        this.init();
    }

    init() {
        // Keyboard event listeners
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code.toLowerCase()] = true;
            
            // Prevent default for game controls
            if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code.toLowerCase()] = false;
        });

        // Mouse event listeners
        document.addEventListener('mousemove', (e) => {
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        document.addEventListener('mousedown', (e) => {
            this.mouse.pressed = true;
            this.mouse.clicked = true;
        });

        document.addEventListener('mouseup', (e) => {
            this.mouse.pressed = false;
        });

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Keyboard input methods
    isKeyPressed(key) {
        return !!this.keys[key.toLowerCase()];
    }

    // Movement controls
    isMovingLeft() {
        return this.isKeyPressed('a') || this.isKeyPressed('arrowleft');
    }

    isMovingRight() {
        return this.isKeyPressed('d') || this.isKeyPressed('arrowright');
    }

    isJumping() {
        return this.isKeyPressed('w') || this.isKeyPressed(' ') || this.isKeyPressed('arrowup');
    }

    isDashing() {
        return this.isKeyPressed('shift');
    }

    // UI controls
    isPaused() {
        return this.isKeyPressed('escape') || this.isKeyPressed('p');
    }

    // Mouse controls
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    isMouseClicked() {
        const clicked = this.mouse.clicked;
        this.mouse.clicked = false; // Reset click state
        return clicked;
    }

    isMousePressed() {
        return this.mouse.pressed;
    }

    // Reset states (called each frame)
    update() {
        // Mouse click is reset after being checked
        // Key states persist until keyup
    }
}