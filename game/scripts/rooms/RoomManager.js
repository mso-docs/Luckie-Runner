/**
 * RoomWorldBuilder - builds a room container separate from level worlds.
 * Handles flooring, background assets, and plain entity lists.
 */
class RoomWorldBuilder {
    constructor(game) {
        this.game = game;
        this.factory = game?.entityFactory || game?.worldBuilder?.factory || null;
    }

    build(descriptor = {}) {
        const room = this.clonePlain(descriptor) || {};
        room.id = room.id || 'room';
        room.theme = room.theme || 'interior';

        const bounds = {
            width: room.width || 1024,
            height: room.height || 720
        };

        const spawn = room.spawn || { x: 200, y: bounds.height - 200 };
        const exit = room.exit || { x: spawn.x, y: spawn.y + 40, radius: 80 };

        const buildEntityList = (defs) => Array.isArray(defs)
            ? defs.map(def => {
                // Get fresh factory reference in case it wasn't available at construction time
                const factory = this.factory || this.game?.entityFactory || this.game?.worldBuilder?.factory || null;
                if (factory?.create) {
                    const entity = factory.create(def);
                    if (entity) return entity;
                }
                return this.clonePlain(def);
            }).filter(Boolean)
            : [];

        const buildChestList = (defs) => Array.isArray(defs)
            ? defs.map(def => {
                // Get fresh factory reference in case it wasn't available at construction time
                const factory = this.factory || this.game?.entityFactory || this.game?.worldBuilder?.factory || null;
                if (factory?.chest && typeof def?.x === 'number' && typeof def?.y === 'number') {
                    return factory.chest(def.x, def.y, def.displayName, def.contents);
                }
                if (factory?.create) {
                    const entity = factory.create({ type: 'chest', ...def });
                    if (entity) return entity;
                }
                return this.clonePlain(def);
            }).filter(Boolean)
            : [];

        const entities = {
            platforms: [],
            enemies: buildEntityList(room.enemies),
            items: buildEntityList(room.items),
            hazards: buildEntityList(room.hazards),
            chests: buildChestList(room.chests),
            npcs: buildEntityList(room.npcs),
            projectiles: []
        };

        const platforms = Array.isArray(room.platforms) ? room.platforms : [];
        platforms.forEach(p => {
            const subtype = p.type || p.subtype || p.kind || 'platform';
            let plat = null;
            if (this.factory?.create) {
                plat = this.factory.create({ type: 'platform', subtype, x: p.x, y: p.y, width: p.width, height: p.height });
            } else if (this.factory?.platform) {
                plat = this.factory.platform(p.x, p.y, p.width, p.height, subtype);
            } else {
                plat = { ...p, type: subtype };
            }
            if (plat) {
                plat.solid = plat.solid !== false;
                entities.platforms.push(plat);
            }
        });

        if (room.autoFloor !== false) {
            this.ensureFloor(entities.platforms, bounds);
        }
        if (room.autoWalls !== false) {
            this.ensureRoomWalls(entities.platforms, bounds);
        }

        const backgroundLayers = Array.isArray(room.backgroundLayers) && room.backgroundLayers.length
            ? room.backgroundLayers.map(layer => ({ ...layer }))
            : this.buildBackgroundLayers(room.backgroundImage);

        return {
            descriptor: { ...room, spawn, exit },
            bounds,
            entities,
            backgroundLayers
        };
    }

    ensureFloor(platforms, bounds) {
        const hasGround = platforms.some(p => p && p.type === 'ground');
        if (hasGround) return;
        const floorHeight = 40;
        const y = Math.max(0, (bounds.height || 720) - floorHeight);
        const floorWidth = bounds.width || 1024;
        const floor = this.factory?.platform
            ? this.factory.platform(0, y, floorWidth, floorHeight, 'ground')
            : { x: 0, y, width: floorWidth, height: floorHeight, type: 'ground' };
        if (floor) floor.solid = floor.solid !== false;
        platforms.push(floor);
    }

    ensureRoomWalls(platforms, bounds) {
        const width = bounds.width || 1024;
        const height = bounds.height || 720;
        const wallThickness = 32;
        const addWall = (x, y, w, h) => {
            const wall = this.factory?.platform
                ? this.factory.platform(x, y, w, h, 'wall')
                : { x, y, width: w, height: h, type: 'wall' };
            if (wall) {
                wall.solid = wall.solid !== false;
                platforms.push(wall);
            }
        };
        addWall(-wallThickness, 0, wallThickness, height); // left
        addWall(width, 0, wallThickness, height); // right
        addWall(0, 0, width, wallThickness); // ceiling
    }

    buildBackgroundLayers(bgConfig) {
        if (!bgConfig?.src) return [];
        const img = this.getSprite(bgConfig.src);
        return [{
            render: (ctx, camera) => {
                if (!ctx || !img || !img.complete) return;
                const w = bgConfig.width || img.width;
                const h = bgConfig.height || img.height;
                const destX = -(camera?.x || 0);
                const destY = -(camera?.y || 0);
                ctx.drawImage(img, 0, 0, w, h, destX, destY, w, h);
            },
            update: () => {}
        }];
    }

    getSprite(path) {
        if (!path) return null;
        this.spriteCache = this.spriteCache || {};
        if (this.spriteCache[path]) return this.spriteCache[path];
        const img = new Image();
        img.decoding = 'async';
        img.src = encodeURI(path);
        this.spriteCache[path] = img;
        return img;
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

/**
 * RoomManager - lightweight scene swapper for interior rooms (distinct from levels).
 * Builds a self-contained room world and restores the previous level world on exit.
 */
class RoomManager {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.returnInfo = null;
        this.room = null;
        this.roomEntities = null;
        this.builder = new RoomWorldBuilder(game);
        this.roomRegistry = this.resolveRoomRegistry(game);
    }

    isActive() {
        return this.active;
    }

    buildRoomDescriptor(id, base = {}, spawnOverride = null, exitOverride = null) {
        const registry = this.resolveRoomRegistry();
        const isId = typeof id === 'string';
        const merged = isId
            ? { ...(registry?.get?.(id) || {}), ...(this.builder.clonePlain(base) || {}) }
            : (this.builder.clonePlain(id || base) || {});
        const resolvedId = isId ? id : (merged.id || merged.roomId || merged.name || 'room');
        if (registry?.normalize) {
            const normalized = registry.normalize(merged, { id: resolvedId, spawnOverride, exitOverride });
            if (normalized) normalized.__normalizedRoom = true;
            return normalized;
        }
        const room = merged || {};
        room.id = resolvedId || room.id || 'room';
        room.width = room.width || 1024;
        room.height = room.height || 720;
        room.spawn = spawnOverride || room.spawn || { x: 200, y: room.height - 200 };
        room.exit = exitOverride || room.exit || { x: room.spawn.x, y: room.spawn.y + 40, radius: 80 };
        room.theme = room.theme || 'interior';
        room.__normalizedRoom = true;
        return room;
    }

    resolveRoomDescriptor(roomLike, spawnOverride = null, exitOverride = null) {
        if (typeof roomLike === 'string') {
            return this.buildRoomDescriptor(roomLike, {}, spawnOverride, exitOverride);
        }
        if (!roomLike) return null;
        return this.buildRoomDescriptor(roomLike.id || roomLike.roomId || roomLike.name, roomLike, spawnOverride, exitOverride);
    }

    enterRoomById(id, overrides = {}, returnPosition = null, spawnOverride = null, exitOverride = null) {
        const descriptor = this.buildRoomDescriptor(id, overrides, spawnOverride, exitOverride);
        return this.enterRoom(descriptor, returnPosition);
    }

    /**
     * Enter a room built from a plain descriptor.
     */
    enterRoom(room = {}, returnPosition = null) {
        if (!this.game || !room) return false;
        const descriptor = room.__normalizedRoom ? room : this.resolveRoomDescriptor(room);
        if (!descriptor) return false;
        this.captureReturnState(returnPosition);
        const roomState = this.builder.build(descriptor);
        this.applyRoomWorld(roomState);
        this.room = roomState.descriptor;
        this.roomEntities = roomState.entities;
        this.alignRoomNpcsToFloor();
        this.active = true;
        return true;
    }

    /**
     * If the player is at the exit zone, leave and restore previous world.
     */
    tryExitRoom(player) {
        if (!this.active || !this.room || !player) return false;
        const exit = this.room.exit || {};
        const px = player.x + (player.width ? player.width / 2 : 0);
        const py = player.y + (player.height || 0);
        const ex = exit.x ?? 0;
        const ey = exit.y ?? 0;
        const radius = exit.radius ?? 64;
        const dx = px - ex;
        const dy = py - ey;
        const distSq = dx * dx + dy * dy;
        if (distSq <= radius * radius) {
            this.exitRoom();
            return true;
        }
        return false;
    }

    exitRoom() {
        if (!this.active || !this.returnInfo) return;
        this.restoreReturnState();
        this.active = false;
        this.room = null;
        this.roomEntities = null;
        this.returnInfo = null;
    }

    alignRoomNpcsToFloor() {
        if (!this.game) return;
        const roomNpcs = (this.roomEntities && Array.isArray(this.roomEntities.npcs)) ? this.roomEntities.npcs : [];
        const gameNpcs = Array.isArray(this.game.npcs) ? this.game.npcs : [];
        const floorY = this.getRoomFloorY();
        const spawnY = this.room?.spawn?.y;
        const align = (npc) => {
            if (!npc) return;
            npc.game = this.game;
            npc.active = npc.active !== false;
            const targetFloor = (typeof floorY === 'number') ? floorY : (typeof spawnY === 'number' ? spawnY + (npc.height || 0) : null);
            if (typeof targetFloor === 'number' && typeof npc.height === 'number') {
                npc.y = targetFloor - npc.height;
            } else if (typeof spawnY === 'number') {
                npc.y = spawnY;
            }
        };
        roomNpcs.forEach(align);
        gameNpcs.forEach(align);
    }

    getRoomFloorY() {
        const platforms = this.roomEntities?.platforms || [];
        const ground = platforms.find(p => p?.type === 'ground');
        if (ground) return ground.y;
        if (this.room?.height) {
            const floorHeight = 40;
            return this.room.height - floorHeight;
        }
        return null;
    }

    captureReturnState(returnPosition = null) {
        const g = this.game;
        this.returnInfo = {
            levelId: g.currentLevelId || 'testRoom',
            level: this.clonePlain(g.level),
            theme: g.currentTheme,
            platforms: (g.platforms || []).map(p => ({ x: p.x, y: p.y, width: p.width, height: p.height, type: p.type })),
            enemies: (g.enemies || []).slice(),
            items: (g.items || []).slice(),
            hazards: (g.hazards || []).slice(),
            chests: (g.chests || []).slice(),
            npcs: (g.npcs || []).slice(),
            backgroundLayers: (g.backgroundLayers || []).slice(),
            townDecor: (g.townDecor || []).slice(),
            projectiles: (g.projectiles || []).slice(),
            signBoards: (g.signBoards || []).slice(),
            signBoard: g.signBoard || null,
            smallPalms: (g.smallPalms || []).slice(),
            shopGhost: g.shopGhost || null,
            princess: g.princess || null,
            balloonFan: g.balloonFan || null,
            playerPos: returnPosition || { x: g.player?.x || 0, y: g.player?.y || 0 },
            testMode: g.testMode
        };
    }

    restoreReturnState() {
        const g = this.game;
        const snap = this.returnInfo;
        if (!snap) return;
        g.testMode = snap.testMode;
        g.currentRoomId = null;
        g.currentLevelId = snap.levelId;
        g.level = this.clonePlain(snap.level);
        g.platforms = (snap.platforms || []).map(p => (g.entityFactory?.platform ? g.entityFactory.platform(p.x, p.y, p.width, p.height, p.type) : { ...p, type: p.type || 'platform' }));
        g.enemies = snap.enemies || [];
        g.items = snap.items || [];
        g.hazards = snap.hazards || [];
        g.chests = snap.chests || [];
        g.npcs = snap.npcs || [];
        g.backgroundLayers = snap.backgroundLayers || [];
        g.townDecor = snap.townDecor || [];
        g.projectiles = snap.projectiles || [];
        g.signBoards = snap.signBoards || [];
        g.signBoard = snap.signBoard || null;
        g.smallPalms = snap.smallPalms || [];
        g.shopGhost = snap.shopGhost || null;
        g.princess = snap.princess || null;
        g.balloonFan = snap.balloonFan || null;
        g.currentTheme = snap.theme || g.currentTheme;
        if (g.player) {
            g.player.x = snap.playerPos?.x || 0;
            g.player.y = snap.playerPos?.y || 0;
            if (g.player.velocity) {
                g.player.velocity.x = 0;
                g.player.velocity.y = 0;
            }
        }
        g.setActiveWorld?.('level', { id: snap.levelId, theme: g.currentTheme, bounds: { width: g.level?.width, height: g.level?.height } });
    }

    applyRoomWorld(roomState) {
        const g = this.game;
        const { descriptor, entities, bounds, backgroundLayers } = roomState;
        g.currentRoomId = descriptor.id || 'room';
        g.currentLevelId = null;
        g.currentTheme = descriptor.theme || 'interior';
        // Hard-clear any lingering level entities before wiring room entities
        ['platforms', 'enemies', 'items', 'hazards', 'chests', 'npcs', 'projectiles'].forEach(key => {
            if (Array.isArray(g[key])) {
                g[key].length = 0;
            } else {
                g[key] = [];
            }
        });

        g.platforms = Array.isArray(entities.platforms) ? entities.platforms.slice() : [];
        g.enemies = Array.isArray(entities.enemies) ? entities.enemies.slice() : [];
        g.items = Array.isArray(entities.items) ? entities.items.slice() : [];
        g.hazards = Array.isArray(entities.hazards) ? entities.hazards.slice() : [];
        g.chests = Array.isArray(entities.chests) ? entities.chests.slice() : [];
        g.npcs = Array.isArray(entities.npcs) ? entities.npcs.slice() : [];
        g.projectiles = Array.isArray(entities.projectiles) ? entities.projectiles.slice() : [];
        g.townDecor = [];
        g.flag = null;
        g.signBoards = [];
        g.signBoard = null;
        g.smallPalms = [];
        g.shopGhost = null;
        g.princess = null;
        g.balloonFan = null;
        const fallbackBg = [{
            render: (ctx) => {
                ctx.save();
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.restore();
            },
            update: () => {}
        }];
        g.backgroundLayers = (Array.isArray(backgroundLayers) && backgroundLayers.length) ? backgroundLayers : fallbackBg;

        const spawn = descriptor.spawn || { x: 100, y: 400 };
        g.level = {
            width: bounds.width,
            height: bounds.height,
            spawnX: spawn.x,
            spawnY: spawn.y
        };

        if (g.player) {
            g.player.x = spawn.x;
            g.player.y = spawn.y;
            if (g.player.velocity) {
                g.player.velocity.x = 0;
                g.player.velocity.y = 0;
            }
        }

        g.setActiveWorld?.('room', { id: descriptor.id, theme: g.currentTheme, bounds });
    }

    resolveRoomRegistry(game = null) {
        if (this.roomRegistry) return this.roomRegistry;
        const g = game || this.game;
        const existing = g?.roomRegistry || (typeof window !== 'undefined' ? window.roomRegistry : null);
        if (existing) {
            this.roomRegistry = existing;
            if (g && !g.roomRegistry) g.roomRegistry = existing;
            return this.roomRegistry;
        }
        const ctor = (typeof RoomRegistry !== 'undefined')
            ? RoomRegistry
            : (typeof window !== 'undefined' ? window.RoomRegistry : null);
        if (ctor) {
            this.roomRegistry = new ctor();
            if (g) g.roomRegistry = this.roomRegistry;
            if (typeof window !== 'undefined') {
                window.roomRegistry = window.roomRegistry || this.roomRegistry;
            }
        }
        return this.roomRegistry;
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

// Expose for browser global and CommonJS consumers
if (typeof window !== 'undefined') {
    window.RoomManager = RoomManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomManager;
}
