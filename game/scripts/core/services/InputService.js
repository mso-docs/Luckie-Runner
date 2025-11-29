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
}
