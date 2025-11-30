/**
 * RoomRegistry - data-first room catalogue with sensible defaults.
 * Mirrors the pattern used for NPC and town data so interiors can be swapped
 * without touching engine code.
 */
class RoomRegistry {
    constructor(defaults = {}) {
        this.rooms = {};
        this.defaults = {
            id: 'room',
            width: 1024,
            height: 720,
            theme: 'interior',
            music: { src: 'music/beach-house.mp3', volume: 0.8 },
            autoFloor: true,
            autoWalls: true,
            backgroundImage: null,
            backgroundLayers: null,
            platforms: [],
            enemies: [],
            items: [],
            hazards: [],
            chests: [],
            npcs: [],
            ...this.clonePlain(defaults)
        };
    }

    setDefaults(overrides = {}) {
        this.defaults = {
            ...this.defaults,
            ...this.clonePlain(overrides)
        };
        return this.defaults;
    }

    register(id, def = {}) {
        if (!id) return null;
        const room = this.normalize(def, { id });
        this.rooms[id] = room;
        if (typeof window !== 'undefined') {
            window.RoomDescriptors = window.RoomDescriptors || {};
            window.RoomDescriptors[id] = room;
        }
        return room;
    }

    registerMany(map = {}) {
        Object.entries(map).forEach(([id, def]) => this.register(id, def));
        return this;
    }

    /**
     * Build a normalized descriptor from registry + overrides.
     */
    build(id, overrides = {}) {
        const base = typeof id === 'string' ? (this.get(id) || {}) : (id || {});
        const merged = { ...this.clonePlain(base), ...this.clonePlain(overrides) };
        const targetId = typeof id === 'string' ? id : (overrides?.id || base?.id);
        return this.normalize(merged, { id: targetId });
    }

    get(id) {
        return this.rooms[id] || null;
    }

    list() {
        return Object.keys(this.rooms);
    }

    normalize(def = {}, options = {}) {
        if (!def && !options?.id) return null;
        const width = def.width ?? this.defaults.width;
        const height = def.height ?? this.defaults.height;
        const spawn = options.spawnOverride || def.spawn || {
            x: Math.round(width * 0.2),
            y: Math.max(0, height - 200)
        };
        const exit = options.exitOverride || def.exit || {
            x: spawn.x,
            y: spawn.y + 40,
            radius: def.exit?.radius ?? 80
        };
        const copyList = (list, shallow = false) => Array.isArray(list)
            ? list.map(entry => shallow ? { ...entry } : this.clonePlain(entry))
            : [];
        const music = def.music
            ? { ...this.defaults.music, ...this.clonePlain(def.music) }
            : (this.defaults.music ? { ...this.defaults.music } : null);
        const backgroundImage = def.backgroundImage ? { ...def.backgroundImage } : (this.defaults.backgroundImage ? { ...this.defaults.backgroundImage } : null);

        return {
            ...this.defaults,
            ...this.clonePlain(def),
            id: options.id || def.id || def.roomId || def.name || this.defaults.id,
            width,
            height,
            spawn,
            exit,
            theme: def.theme || this.defaults.theme,
            music,
            autoFloor: def.autoFloor !== undefined ? def.autoFloor : this.defaults.autoFloor,
            autoWalls: def.autoWalls !== undefined ? def.autoWalls : this.defaults.autoWalls,
            backgroundImage,
            backgroundLayers: Array.isArray(def.backgroundLayers) ? copyList(def.backgroundLayers, true) : (this.defaults.backgroundLayers ? copyList(this.defaults.backgroundLayers, true) : null),
            platforms: copyList(def.platforms),
            enemies: copyList(def.enemies),
            items: copyList(def.items),
            hazards: copyList(def.hazards),
            chests: copyList(def.chests),
            npcs: copyList(def.npcs)
        };
    }

    clonePlain(obj) {
        if (obj === null || obj === undefined) return obj;
        try {
            if (typeof structuredClone === 'function') return structuredClone(obj);
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return obj;
        }
    }
}

// Expose globally for browser + CommonJS usage
if (typeof window !== 'undefined') {
    window.RoomRegistry = window.RoomRegistry || RoomRegistry;
    window.roomRegistry = window.roomRegistry || new RoomRegistry();
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomRegistry;
}
