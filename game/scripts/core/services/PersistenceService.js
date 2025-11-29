/**
 * PersistenceService - simple localStorage adapter.
 */
class PersistenceService {
    constructor(storage = null) {
        this.storage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    }

    save(key, value) {
        if (!this.storage || !key) return;
        try {
            this.storage.setItem(key, JSON.stringify(value));
        } catch (e) {
            // ignore
        }
    }

    load(key, defaultValue = null) {
        if (!this.storage || !key) return defaultValue;
        try {
            const raw = this.storage.getItem(key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
}
