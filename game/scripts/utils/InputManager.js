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
        this.keyPresses = new Set();

        this.init();
    }

    init() {
        // Keyboard event listeners
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code.toLowerCase()] = true;
            
            // Track single key presses (ignore repeats while held)
            if (!e.repeat) {
                this.keyPresses.add(e.key.toLowerCase());
                this.keyPresses.add(e.code.toLowerCase());
            }
            
            // Prevent default for game controls
            if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code.toLowerCase()] = false;
        });

        // Mouse event listeners - attach to canvas only to avoid UI clicks
        const canvas = document.getElementById('gameCanvas');
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        canvas.addEventListener('mousedown', (e) => {
            this.mouse.pressed = true;
            this.mouse.clicked = true;
        });

        canvas.addEventListener('mouseup', (e) => {
            this.mouse.pressed = false;
        });

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Keyboard input methods
    isKeyPressed(key) {
        return !!this.keys[key.toLowerCase()];
    }

    /**
     * Consume a single press of the interaction key (Z)
     * @returns {boolean} true if a fresh press was detected
     */
    consumeActionPress() {
        const keys = ['z', 'keyz'];
        const pressed = keys.some(k => this.keyPresses.has(k));
        if (pressed) {
            keys.forEach(k => this.keyPresses.delete(k));
        }
        return pressed;
    }

    /**
     * Consume a single press of the chest interaction key (E or Enter)
     * @returns {boolean} true if a fresh press was detected
     */
    consumeInteractPress() {
        const keys = ['e', 'keye', 'enter', 'numpadenter'];
        const pressed = keys.some(k => this.keyPresses.has(k));
        if (pressed) {
            keys.forEach(k => this.keyPresses.delete(k));
        }
        return pressed;
    }

    /**
     * Check if the interaction key (Z) is being held
     * @returns {boolean}
     */
    isActionHeld() {
        return this.isKeyPressed('z') || this.isKeyPressed('keyz');
    }

    consumeKeyPress(key) {
        const normalized = key.toLowerCase();
        if (this.keyPresses.has(normalized)) {
            this.keyPresses.delete(normalized);
            return true;
        }
        return false;
    }

    // Movement controls - WASD + Arrow keys
    isMovingLeft() {
        return this.isKeyPressed('a') || this.isKeyPressed('arrowleft');
    }

    isMovingRight() {
        return this.isKeyPressed('d') || this.isKeyPressed('arrowright');
    }
    
    isMovingDown() {
        return this.isKeyPressed('s') || this.isKeyPressed('arrowdown');
    }

    isJumping() {
        return this.isKeyPressed('w') || this.isKeyPressed(' ') || this.isKeyPressed('arrowup') || this.isKeyPressed('space');
    }

    isDashing() {
        return this.isKeyPressed('shift') || this.isKeyPressed('shiftleft') || this.isKeyPressed('shiftright');
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
