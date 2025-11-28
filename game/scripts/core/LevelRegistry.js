/**
 * LevelRegistry - maps level ids to definitions and provides simple validation.
 */
class LevelRegistry {
    constructor() {
        this.levels = {};
    }

    register(id, def) {
        this.levels[id] = def;
    }

    get(id) {
        return this.levels[id] || null;
    }

    /**
     * Basic shape validation; returns {valid:boolean, errors:string[]}
     */
    validate(def) {
        const errors = [];
        if (!def) {
            errors.push('Level definition is missing.');
            return { valid: false, errors };
        }
        if (!def.spawn && !def.spawnOverride) {
            // optional, but useful to warn
            errors.push('Missing spawn info (spawn or spawnOverride).');
        }
        if (def.platforms && !Array.isArray(def.platforms)) {
            errors.push('platforms must be an array.');
        }
        if (def.enemies && !Array.isArray(def.enemies)) {
            errors.push('enemies must be an array.');
        }
        if (def.items && !Array.isArray(def.items)) {
            errors.push('items must be an array.');
        }
        if (def.npcs && !Array.isArray(def.npcs)) {
            errors.push('npcs must be an array.');
        }
        return { valid: errors.length === 0, errors };
    }
}
