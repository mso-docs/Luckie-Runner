/**
 * SaveService - higher-level interface for persisting settings and run stats.
 */
class SaveService {
    constructor(persistence) {
        this.persistence = persistence || new PersistenceService();
        this.keys = {
            settings: 'luckie_settings',
            runStats: 'luckie_run_stats'
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
}
