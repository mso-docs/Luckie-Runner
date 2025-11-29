/**
 * ServiceLocator - typed accessor for core services.
 */
class ServiceLocator {
    constructor(services = {}) {
        this.services = services;
    }

    input() {
        return this.services.input || null;
    }

    audio() {
        return this.services.audio || null;
    }

    render() {
        return this.services.render || null;
    }

    persistence() {
        return this.services.persistence || null;
    }

    reset() {
        return this.services.reset || null;
    }

    save() {
        return this.services.save || null;
    }

    eventBus() {
        return this.services.eventBus || null;
    }
}
