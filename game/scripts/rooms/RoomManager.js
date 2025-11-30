/**
 * RoomManager - lightweight scene swapper for interior rooms that are NOT LevelDefinitions.
 * Builds a self-contained world state from a plain descriptor (background + platforms)
 * and restores the previous level state on exit.
 */
class RoomManager {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.returnInfo = null;
        this.room = null;
    }

    isActive() {
        return this.active;
    }

    /**
     * Enter a room built from a plain descriptor:
     * {
     *   id, width, height,
     *   spawn: {x,y},
     *   exit: {x,y,radius},
     *   backgroundImage: {src,width,height},
     *   platforms: [{x,y,width,height,type}]
     * }
     */
    enterRoom(room = {}, returnPosition = null) {
        if (!this.game || !room) return false;
        this.captureReturnState(returnPosition);
        this.buildRoomWorld(room);
        this.room = room;
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
        this.returnInfo = null;
    }

    captureReturnState(returnPosition = null) {
        const g = this.game;
        this.returnInfo = {
            levelId: g.currentLevelId || 'testRoom',
            level: this.clonePlain(g.level),
            platforms: (g.platforms || []).map(p => ({ x: p.x, y: p.y, width: p.width, height: p.height, type: p.type })),
            enemies: (g.enemies || []).slice(),
            items: (g.items || []).slice(),
            hazards: (g.hazards || []).slice(),
            chests: (g.chests || []).slice(),
            npcs: (g.npcs || []).slice(),
            backgroundLayers: (g.backgroundLayers || []).slice(),
            townDecor: (g.townDecor || []).slice(),
            playerPos: returnPosition || { x: g.player?.x || 0, y: g.player?.y || 0 },
            testMode: g.testMode
        };
    }

    restoreReturnState() {
        const g = this.game;
        const snap = this.returnInfo;
        if (!snap) return;
        g.testMode = snap.testMode;
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
        if (g.player) {
            g.player.x = snap.playerPos?.x || 0;
            g.player.y = snap.playerPos?.y || 0;
            if (g.player.velocity) {
                g.player.velocity.x = 0;
                g.player.velocity.y = 0;
            }
        }
    }

    buildRoomWorld(room = {}) {
        const g = this.game;
        const factory = g.entityFactory || this.game?.worldBuilder?.factory;
        g.currentLevelId = room.id || 'room';
        g.currentTheme = room.theme || 'interior';
        g.platforms = [];
        g.enemies = [];
        g.items = [];
        g.hazards = [];
        g.chests = [];
        g.npcs = [];
        g.townDecor = [];

        if (room.backgroundImage?.src) {
            const bg = room.backgroundImage;
            const img = this.getSprite(bg.src);
            g.backgroundLayers = [{
                render: (ctx, camera) => {
                    if (!ctx || !img || !img.complete) return;
                    const w = bg.width || img.width;
                    const h = bg.height || img.height;
                    const destX = -(camera?.x || 0);
                    const destY = -(camera?.y || 0);
                    ctx.drawImage(img, 0, 0, w, h, destX, destY, w, h);
                },
                update: () => {}
            }];
        } else {
            g.backgroundLayers = [];
        }

        const platforms = Array.isArray(room.platforms) ? room.platforms : [];
        platforms.forEach(p => {
            const subtype = p.type || p.subtype || p.kind || 'platform';
            let plat = null;
            if (factory?.create) {
                plat = factory.create({ type: 'platform', subtype, x: p.x, y: p.y, width: p.width, height: p.height });
            } else if (factory?.platform) {
                plat = factory.platform(p.x, p.y, p.width, p.height, subtype);
            } else {
                plat = { ...p, type: subtype };
            }
            if (plat) g.platforms.push(plat);
        });

        // Ensure a floor exists
        const levelWidth = room.width || 1024;
        const levelHeight = room.height || 720;
        const hasGround = g.platforms.some(p => p && p.type === 'ground');
        if (!hasGround) {
            const floor = factory?.platform
                ? factory.platform(0, levelHeight - 40, levelWidth, 40, 'ground')
                : { x: 0, y: levelHeight - 40, width: levelWidth, height: 40, type: 'ground' };
            if (floor) g.platforms.push(floor);
        }

        const spawn = room.spawn || { x: 100, y: 400 };
        g.level = {
            width: levelWidth,
            height: levelHeight,
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
