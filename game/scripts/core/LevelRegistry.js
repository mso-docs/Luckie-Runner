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

    registerAll(map = {}) {
        Object.entries(map).forEach(([id, def]) => this.register(id, def));
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
        const allowMissingSpawn = Boolean(def.testRoom || def.allowMissingSpawn);
        if (!def.spawn && !def.spawnOverride && !allowMissingSpawn) {
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
        if (def.theme && typeof def.theme !== 'string') {
            errors.push('theme must be a string id when provided.');
        }

        const validateEntities = (list, name, fields = []) => {
            if (!Array.isArray(list)) return;
            list.forEach((entry, idx) => {
                if (typeof entry !== 'object') {
                    errors.push(`${name}[${idx}] must be an object.`);
                    return;
                }
                fields.forEach(field => {
                    if (typeof entry[field] !== 'number') {
                        errors.push(`${name}[${idx}].${field} must be a number.`);
                    }
                });
            });
        };

        validateEntities(def.platforms, 'platforms', ['x', 'y', 'width', 'height']);
        validateEntities(def.enemies, 'enemies', ['x', 'y']);
        validateEntities(def.items, 'items', ['x', 'y']);
        validateEntities(def.npcs, 'npcs', ['x', 'y']);
        return { valid: errors.length === 0, errors };
    }

    list() {
        return Object.keys(this.levels);
    }

    /**
     * Validate all registered levels; returns {id, valid, errors[]}[]
     */
    validateAll() {
        return this.list().map(id => {
            const def = this.get(id);
            const result = this.validate(def);
            return { id, ...result };
        });
    }
}
