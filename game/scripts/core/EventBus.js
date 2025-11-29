/**
 * EventBus - minimal pub/sub.
 */
class EventBus {
    constructor() {
        this.handlers = {};
    }

    on(event, handler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        if (!this.handlers[event]) return;
        this.handlers[event] = this.handlers[event].filter(h => h !== handler);
    }

    emit(event, payload) {
        (this.handlers[event] || []).forEach(h => h(payload));
    }
}
