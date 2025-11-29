/**
 * SaveService - higher-level interface for persisting settings and run stats.
 */
class SaveService {
    constructor(persistence) {
        this.persistence = persistence || new PersistenceService();
        this.keys = {
            settings: 'luckie_settings',
            runStats: 'luckie_run_stats',
            saves: 'luckie_saves'
        };
    }

    saveSettings(settings = {}) {
        this.persistence.save(this.keys.settings, settings);
    }

    loadSettings(defaults = {}) {
        return this.persistence.load(this.keys.settings, defaults) || defaults;
    }

    saveRunStats(stats = {}) {
        this.persistence.save(this.keys.runStats, stats);
    }

    loadRunStats(defaults = {}) {
        return this.persistence.load(this.keys.runStats, defaults) || defaults;
    }

    listSlots() {
        return this.persistence.load(this.keys.saves, []) || [];
    }

    getSlot(id) {
        if (!id) return null;
        const slots = this.listSlots();
        return slots.find(s => s.id === id) || null;
    }

    saveSlot(id, payload = {}) {
        if (!id) return null;
        const slots = this.listSlots().filter(s => s.id !== id);
        const entry = {
            id,
            updatedAt: Date.now(),
            ...payload
        };
        slots.unshift(entry);
        this.persistence.save(this.keys.saves, slots);
        return entry;
    }

    deleteSlot(id) {
        if (!id) return;
        const slots = this.listSlots().filter(s => s.id !== id);
        this.persistence.save(this.keys.saves, slots);
    }
}
