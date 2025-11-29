/**
 * InputService - adapter over InputManager for DI.
 */
class InputService {
    constructor(manager) {
        this.manager = manager;
    }

    update() {
        this.manager?.update();
    }

    consumeAction() {
        return this.manager?.consumeActionPress?.() || false;
    }

    consumeInteract() {
        return this.manager?.consumeInteractPress?.() || false;
    }

    consume(key) {
        return this.manager?.consumeKeyPress?.(key) || false;
    }

    isHeld(key) {
        return this.manager?.isKeyPressed?.(key) || false;
    }

    // Movement helpers (pass-through)
    isMovingLeft() {
        return this.manager?.isMovingLeft?.() || false;
    }

    isMovingRight() {
        return this.manager?.isMovingRight?.() || false;
    }

    isJumping() {
        return this.manager?.isJumping?.() || false;
    }

    isSpaceJumping() {
        return this.manager?.isSpaceJumping?.() || false;
    }

    isMouseClicked() {
        return this.manager?.isMouseClicked?.() || false;
    }

    getMousePosition() {
        return this.manager?.getMousePosition?.() || { x: 0, y: 0 };
    }
}
