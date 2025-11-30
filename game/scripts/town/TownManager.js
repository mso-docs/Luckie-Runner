/**
 * TownManager - handles town region detection and entry UI.
 * Designed for modular towns with banners/buildings/foreground/interiors.
 */
class TownManager {
    constructor(game, config = {}) {
        this.game = game;
        this.towns = (config && config.towns) ? [...config.towns] : [];
        this.preloadDistance = config.preloadDistance ?? null;
        this.currentTownId = null;
        this.lastBannerAt = 0;
        this.activeTownMusicId = null;
        this.musicTransition = null;
        this.fadeDuration = 1200;
        this.baseMusicVolume = game.currentLevelMusicVolume ?? 0.8;
        this.activeContent = { buildings: [], setpieces: [] };
        this.doorAutoCloseMs = 2200;
        this.townNpcs = [];
        this.loadedTownId = null;
        this.preloadedTownId = null;
        this.pendingTownToLoad = null;
        this.initialWarmDone = false;
        this.activeInterior = null;
        this.interiorReturn = null;
        this.interiorConfigMap = this.buildInteriorMap();
        this.autoEnterDoorsInDebug = true; // allow debug auto-enter when standing in door radius
        this.roomManager = this.resolveRoomManager(game);

        this.spriteCache = {};
        this.spriteDecodePromises = {};
        this.spritePreloadReady = false; // set true after decode promises resolve
        this.spritePreloadPromise = null;
        this.townCache = {};

        this.preloadTownSprites();
        this.preloadTownMusic();
        this.warmFirstTownContent();
        this.registerLegacyInteriorsAsRooms();
    }

    /**
        * Check player position and trigger town entry when crossing a region.
        */
    update(deltaTime = 0) {
        const g = this.game;
        const p = g.player;
        if (!p || !g.level) return;

        this.ensureUpcomingTownPrepared();

        const town = this.getTownForPosition(g.currentLevelId, p.x);
        const townId = town?.id || null;
        if (townId && townId !== this.currentTownId) {
            this.handleTownEntry(town);
        } else if (!townId) {
            this.handleTownExit();
        }

        // If a town load was deferred until sprites decoded, load now
        if (this.pendingTownToLoad && this.spritePreloadReady) {
            this.loadTownContent(this.pendingTownToLoad);
            this.pendingTownToLoad = null;
        }

        this.updateMusicTransition(deltaTime);
        this.updateBuildingDoors(deltaTime);
        this.updateSetpieceAnimation(deltaTime);
        this.updateTownNpcs(deltaTime);
        this.ensureTownNpcsPresent();
    }

    /**
     * Instantiate building/foreground/interior metadata.
     */
    loadTownContent(town) {
        this.resetTownContent();
        if (!town) return;
        this.loadedTownId = town?.id || null;
        this.preloadedTownId = this.loadedTownId;
        const blueprint = this.getTownBlueprint(town);
        const buildings = blueprint.buildings.map(b => this.clonePlain(b));
        const setpieces = blueprint.setpieces.map(s => this.clonePlain(s));
        const npcs = blueprint.npcDefs.map(def => this.createNpc(def));
        this.activeContent = { buildings, setpieces };
        this.townNpcs = npcs;

        // Build renderable sprites so SceneRenderer can draw town content
        const decor = [];
        const addRenderable = (def) => {
            const renderable = this.buildDecorRenderable(def);
            if (renderable) decor.push(renderable);
        };

        buildings.forEach(b => addRenderable({
            x: b.exterior?.x ?? 0,
            y: b.exterior?.y ?? 0,
            width: b.displayWidth ?? b.exterior?.displayWidth ?? b.exterior?.width ?? b.width ?? b.frameWidth,
            height: b.displayHeight ?? b.exterior?.displayHeight ?? b.exterior?.height ?? b.height ?? b.frameHeight,
            sprite: b.sprite || b.exterior?.sprite,
            frames: b.frames,
            frameHeight: b.frameHeight,
            frameWidth: b.frameWidth,
            frameDirection: b.frameDirection,
            frameIndexRef: b,
            layer: b.exterior?.layer || 'foreground',
            doorRef: b
        }));

        setpieces.forEach(sp => addRenderable(sp));

        // Layer ordering: ground -> background -> foreground -> default
        // Lower numbers are drawn first (farthest); higher numbers are on top (closest)
        const layerOrder = { background: 0, backdrop: 0.5, midground: 1, ground: 2, foreground: 3, overlay: 4 };
        decor.sort((a, b) => (layerOrder[a.layer] ?? 3) - (layerOrder[b.layer] ?? 3));

        this.game.townDecor = decor;
        this.spawnTownNpcs();
    }

    /**
     * Preload first town content as soon as sprites finish decoding to avoid first-entry pop-in.
     */
    warmFirstTownContent(force = false) {
        if (!Array.isArray(this.towns) || !this.towns.length) return;
        const currentLevel = this.game?.currentLevelId;
        const firstTown = this.towns.find(t => !t.levelId || t.levelId === currentLevel) || this.towns[0];
        if (!firstTown) return;
        if (!force && this.initialWarmDone && this.loadedTownId === firstTown.id) return;
        const load = () => {
            this.loadTownContent(firstTown);
            this.initialWarmDone = true;
        };
        if (this.spritePreloadPromise) {
            this.spritePreloadPromise.then(load).catch(load);
        } else {
            load();
        }
    }

    resetTownContent() {
        this.activeContent = { buildings: [], setpieces: [] };
        this.game.townDecor = [];
        this.removeTownNpcs();
        this.loadedTownId = null;
    }

    getTownBlueprint(town) {
        const id = town?.id || '__unknown';
        // Always rebuild so config tweaks (door offsets, interiors) take effect immediately
        this.townCache[id] = this.buildTownBlueprint(town);
        return this.townCache[id];
    }

    buildTownBlueprint(town) {
        const buildings = Array.isArray(town?.buildings) ? town.buildings.map(def => this.createBuilding(def)) : [];
        const setpieces = Array.isArray(town?.setpieces) ? town.setpieces.map(def => this.createSetpiece(def)) : [];
        const npcDefs = Array.isArray(town?.npcs) ? town.npcs.map(def => this.clonePlain(def)) : [];
        // Prime renderables offscreen to reduce pop-in
        const renderables = [...buildings.map(b => this.buildDecorRenderable({
            x: b.exterior?.x ?? 0,
            y: b.exterior?.y ?? 0,
            width: b.displayWidth ?? b.exterior?.displayWidth ?? b.exterior?.width ?? b.width ?? b.frameWidth,
            height: b.displayHeight ?? b.exterior?.displayHeight ?? b.exterior?.height ?? b.height ?? b.frameHeight,
            sprite: b.sprite || b.exterior?.sprite,
            frames: b.frames,
            frameHeight: b.frameHeight,
            frameWidth: b.frameWidth,
            frameDirection: b.frameDirection,
            frameIndexRef: b,
            layer: b.exterior?.layer || 'foreground',
            doorRef: b
        })), ...setpieces.map(sp => this.buildDecorRenderable(sp))].filter(Boolean);
        renderables.forEach(r => this.primeRenderable(r));
        return { buildings, setpieces, npcDefs };
    }

    createBuilding(def = {}) {
        const frames = def.exterior?.frames ?? 2;
        const frameDirection = def.exterior?.frameDirection || 'vertical'; // 'vertical' or 'horizontal'
        const scale = def.exterior?.scale ?? 1;

        const autoAlignToGround = def.exterior?.autoAlignToGround ?? true;
        let exteriorY = def.exterior?.y ?? 0;
        const exteriorHeight = ((def.exterior?.height ?? def.exterior?.frameHeight ?? 0) * scale) || 0;
        if (autoAlignToGround && exteriorHeight) {
            const groundY = this.getGroundY();
            if (groundY !== null && groundY !== undefined) {
                exteriorY = groundY - exteriorHeight;
            }
        }

        const exterior = { ...(def.exterior || {}), y: exteriorY };
        const frameHeight = def.exterior?.frameHeight ?? (() => {
            if (frameDirection === 'horizontal') return def.exterior?.height || 0;
            const h = def.exterior?.height || 0;
            return Math.max(1, Math.floor(h / Math.max(1, frames)));
        })();
        const frameWidth = def.exterior?.frameWidth ?? (() => {
            if (frameDirection === 'horizontal') {
                const w = def.exterior?.width || 0;
                return Math.max(1, Math.floor(w / Math.max(1, frames)));
            }
            return def.exterior?.width || 0;
        })();

        const displayWidth = (def.exterior?.width ?? frameWidth) * scale;
        const displayHeight = (def.exterior?.height ?? frameHeight) * scale;
        exterior.displayWidth = displayWidth;
        exterior.displayHeight = displayHeight;
        exterior.scale = scale;

        const doorWidth = (def.door?.width ?? def.exterior?.doorWidth ?? 36) * scale;
        const doorHeight = (def.door?.height ?? def.exterior?.doorHeight ?? 48) * scale;
        const exteriorBottom = (exterior?.y ?? 0) + displayHeight;
        const spriteOffsetX = def.door?.spriteOffsetX;
        const spriteOffsetY = def.door?.spriteOffsetY;
        const doorXDefault = (spriteOffsetX !== undefined)
            ? (exterior?.x ?? 0) + (spriteOffsetX * scale)
            : (exterior?.x ?? 0) + ((displayWidth - doorWidth) / 2);
        const doorYDefault = (spriteOffsetY !== undefined)
            ? (exterior?.y ?? 0) + (spriteOffsetY * scale)
            : exteriorBottom - doorHeight;
        const interactRadiusDefault = (def.door?.interactRadius ?? Math.max(doorWidth, doorHeight) * 0.6);

        return {
            id: def.id || null,
            name: def.name || 'Building',
            exterior,
            frames,
            frameDirection,
            frameHeight,
            frameWidth,
            displayWidth,
            displayHeight,
            frameIndex: 0, // 0 = door closed, 1 = door open
            door: {
                x: def.door?.x ?? doorXDefault,
                y: def.door?.y ?? doorYDefault,
                width: doorWidth,
                height: doorHeight,
                interactRadius: interactRadiusDefault
            },
            sprite: def.exterior?.sprite || null,
            interiorId: def.interior?.id || def.interiorId || null,
            interior: def.interior ? this.clonePlain(def.interior) : null,
            npcs: Array.isArray(def.npcs) ? [...def.npcs] : [],
            doorTimer: 0,
            doorOpen: false
        };
    }

    createSetpiece(def = {}) {
        const scale = def.scale ?? 1;
        const frames = def.frames ?? 1;
        const frameDirection = def.frameDirection || 'vertical';
        const frameHeight = def.frameHeight || null;
        const frameWidth = def.frameWidth || null;
        const baseWidth = def.width ?? frameWidth;
        const baseHeight = def.height ?? frameHeight;
        const displayWidth = (baseWidth || frameWidth || 0) * scale || (def.width ?? 64);
        const displayHeight = (baseHeight || frameHeight || 0) * scale || (def.height ?? 64);
        const autoAlignToGround = def.autoAlignToGround ?? true;
        let y = def.y ?? 0;
        if (autoAlignToGround && displayHeight) {
            const groundY = this.getGroundY();
            if (groundY !== null && groundY !== undefined) {
                // For ground-layer props, align to ground top; otherwise sit on top of ground
                if (def.layer === 'ground') {
                    y = groundY;
                } else {
                    y = groundY - displayHeight;
                }
            }
        }
        return {
            id: def.id || null,
            name: def.name || 'Setpiece',
            x: def.x ?? 0,
            y,
            width: displayWidth,
            height: displayHeight,
            layer: def.layer || 'foreground',
            sprite: def.sprite || null,
            frames,
            frameHeight: frameHeight || null,
            frameWidth: frameWidth || null,
            frameDirection,
            frameIndex: 0,
            frameTimeMs: def.frameTimeMs ?? 120,
            scale,
            tileX: def.tileX || false,
            tileWidth: def.tileWidth || null
        };
    }

    createNpc(def = {}) {
        const npc = this.game?.entityFactory?.townNpc?.(def);
        if (npc) {
            npc.dialogueId = def.dialogueId || npc.dialogueId;
        }
        return npc;
    }

    buildInteriorMap() {
        const map = {};
        if (!Array.isArray(this.towns)) return map;
        this.towns.forEach(town => {
            (town?.interiors || []).forEach(int => {
                const id = int?.id || int?.interiorId;
                if (!id) return;
                map[id] = this.clonePlain(int);
            });
        });
        return map;
    }

    getInteriorConfig(id = null, building = null) {
        if (!id) return null;
        if (building?.interior && (!building.interior?.id || building.interior?.id === id)) {
            return building.interior;
        }
        return this.interiorConfigMap?.[id] || null;
    }

    resolveRoomManager(game) {
        const g = game || this.game;
        if (g?.roomManager) return g.roomManager;
        const ctor = (typeof RoomManager !== 'undefined')
            ? RoomManager
            : (typeof window !== 'undefined' ? window.RoomManager : null);
        if (!ctor) return null;
        const instance = new ctor(g);
        if (g) g.roomManager = instance;
        return instance;
    }

    ensureRoomManager() {
        if (this.roomManager && typeof this.roomManager.enterRoom === 'function') return this.roomManager;
        this.roomManager = this.resolveRoomManager(this.game);
        return this.roomManager;
    }

    registerLegacyInteriorsAsRooms() {
        if (typeof window === 'undefined') return;
        window.RoomDescriptors = window.RoomDescriptors || {};
        const defs = window.LevelDefinitions || {};
        Object.entries(defs).forEach(([id, def]) => {
            if (!def) return;
            // Only convert explicit interiors (avoid normal levels like testRoom)
            const isInteriorLike = def.theme === 'interior' || def.isInterior === true || def.backgroundImage;
            if (!isInteriorLike) return;
            if (window.RoomDescriptors[id]) return;
            const room = this.convertLevelDefinitionToRoom(id, def);
            if (room) {
                window.RoomDescriptors[id] = room;
            }
        });
    }

    resolveInteriorRoom(interiorId = null, interiorConfig = {}) {
        if (!interiorId) return null;
        const explicitRoom = interiorConfig.room || interiorConfig.descriptor;
        if (explicitRoom) return this.clonePlain(explicitRoom);

        const globalRoom = this.getGlobalRoomDescriptor(interiorId);
        if (globalRoom) return globalRoom;

        const levelDef = interiorConfig.level || interiorConfig.definition || (typeof window !== 'undefined' ? window.LevelDefinitions?.[interiorId] : null);
        if (levelDef) {
            return this.convertLevelDefinitionToRoom(interiorId, levelDef);
        }
        return null;
    }

    getGlobalRoomDescriptor(id = null) {
        if (!id || typeof window === 'undefined') return null;
        const normalized = id.replace('_', '');
        return (window.RoomDescriptors?.[id] || window.RoomDescriptors?.[normalized]) || null;
    }

    convertLevelDefinitionToRoom(interiorId = null, levelDef = {}) {
        const width = levelDef.width || 1024;
        const height = levelDef.height || 720;
        const spawn = levelDef.spawn || { x: 200, y: height - 200 };
        const exit = levelDef.exit || { x: spawn.x, y: spawn.y + 40, radius: 80 };
        return {
            id: interiorId,
            width,
            height,
            spawn,
            exit,
            backgroundImage: levelDef.backgroundImage,
            platforms: Array.isArray(levelDef.platforms) ? levelDef.platforms.map(p => ({ ...p })) : [],
            enemies: Array.isArray(levelDef.enemies) ? levelDef.enemies.map(e => ({ ...e })) : [],
            items: Array.isArray(levelDef.items) ? levelDef.items.map(i => ({ ...i })) : [],
            npcs: Array.isArray(levelDef.npcs) ? levelDef.npcs.map(n => ({ ...n })) : [],
            hazards: Array.isArray(levelDef.hazards) ? levelDef.hazards.map(h => ({ ...h })) : [],
            theme: levelDef.theme || 'interior'
        };
    }

    getTownForPosition(levelId, x) {
        if (!Array.isArray(this.towns)) return null;
        return this.towns.find(t => (!t.levelId || t.levelId === levelId) && x >= (t.region?.startX ?? Infinity) && x <= (t.region?.endX ?? -Infinity)) || null;
    }

    /**
     * Load upcoming town content before it reaches the viewport to avoid pop-in.
     */
    ensureUpcomingTownPrepared() {
        if (!Array.isArray(this.towns) || !this.towns.length) return;
        const g = this.game;
        const camera = g.camera || {};
        const viewportWidth = camera.viewportWidth || g.canvas?.width || 0;
        const cameraRight = (camera.x || 0) + viewportWidth;
        const lookahead = this.getTownPreloadDistance(viewportWidth);
        const upcoming = this.towns.find(town => {
            if (town.levelId && town.levelId !== g.currentLevelId) return false;
            const startX = town.region?.startX ?? Infinity;
            const endX = town.region?.endX ?? -Infinity;
            if (cameraRight > endX) return false; // already passed this town
            if (startX > cameraRight + lookahead) return false; // still too far away
            if (this.preloadedTownId === town.id) return false; // already loaded
            if (this.currentTownId && this.currentTownId !== town.id) return false; // don't replace an active town
            return true;
        });
        if (!upcoming) return;

        // If sprites are still decoding, defer until they're ready.
        if (!this.spritePreloadReady && this.spritePreloadPromise) {
            this.pendingTownToLoad = this.pendingTownToLoad || upcoming;
            return;
        }

        this.loadTownContent(upcoming);
    }

    getTownPreloadDistance(viewportWidth = 0) {
        const base = viewportWidth ? viewportWidth * 1.1 : 1200;
        const minimum = 900;
        return Math.max(minimum, this.preloadDistance || base);
    }

    /**
     * Build and cache renderables for all towns on the current level without changing active decor.
     */
    warmLevelTownCache() {
        if (!Array.isArray(this.towns)) return;
        const levelId = this.game?.currentLevelId;
        this.towns
            .filter(t => !t.levelId || t.levelId === levelId)
            .forEach(town => {
                this.townCache[town.id || '__unknown'] = this.buildTownBlueprint(town);
            });
    }

    handleTownEntry(town) {
        const g = this.game;
        this.currentTownId = town.id;
        this.lastBannerAt = g.gameTime || 0;
        g.uiManager?.showTownBanner?.(town);
        if (!this.spritePreloadReady && this.spritePreloadPromise) {
            this.pendingTownToLoad = town;
            return;
        }
        this.loadTownContent(town);
        this.handleTownMusic(town);
    }

    handleTownExit() {
        if (!this.currentTownId) return;
        this.handleTownMusic(null);
        this.currentTownId = null;
        this.preloadedTownId = null;
    }

    handleTownMusic(town) {
        const audio = this.getAudioManager();
        if (!audio) return;
        const baseId = this.getBaseMusicId();
        const baseVolume = this.getBaseMusicVolume();

        if (town) {
            const townMusicId = this.getTownMusicId(town);
            if (!townMusicId) return;
            this.ensureTownMusicLoaded(town);
            this.ensureTrackPlaying(baseId, baseVolume);
            this.activeTownMusicId = townMusicId;
            this.beginTownEntryTransition({
                baseId,
                townId: townMusicId,
                fromBase: audio.getTrackVolume?.(baseId) ?? baseVolume,
                toTown: this.getTownMusicVolume(town)
            });
            return;
        }

        if (this.activeTownMusicId) {
            const townMusicId = this.activeTownMusicId;
            this.beginTownExitTransition({
                baseId,
                townId: townMusicId,
                fromTown: audio.getTrackVolume?.(townMusicId) ?? this.getTownMusicVolume(town),
                toBase: baseVolume
            });
            this.activeTownMusicId = null;
        }
    }

    beginCrossFade({ baseId = null, townId = null, fromBase = 0, toBase = 0, fromTown = 0, toTown = 0 }) {
        this.musicTransition = {
            stage: 'cross',
            baseId,
            townId,
            fromBase,
            toBase,
            fromTown,
            toTown,
            elapsed: 0,
            duration: this.fadeDuration
        };
    }

    beginTownEntryTransition({ baseId = null, townId = null, fromBase = 0, toTown = 0 }) {
        this.musicTransition = {
            stage: 'fadeOutBase',
            baseId,
            townId,
            fromBase,
            toBase: 0,
            fromTown: 0,
            toTown,
            elapsed: 0,
            duration: this.fadeDuration
        };
    }

    beginTownExitTransition({ baseId = null, townId = null, fromTown = 0, toBase = 0 }) {
        this.musicTransition = {
            stage: 'fadeOutTown',
            baseId,
            townId,
            fromBase: 0,
            toBase,
            fromTown,
            toTown: 0,
            elapsed: 0,
            duration: this.fadeDuration
        };
    }

    /**
     * Handle interact input for town building doors. Returns true if consumed.
     */
    handleDoorInteract() {
        const g = this.game;
        const p = g.player;
        const input = g.services?.input || g.input;
        if (!p || !input) return false;
        const consumeInteract = () => {
            if (typeof input.consumeInteract === 'function') return input.consumeInteract();
            return input.consumeInteractPress?.();
        };
        const pressed = consumeInteract();
        const allowAuto = this.autoEnterDoorsInDebug && g.debug;
        if (!pressed && !allowAuto) return false;

        // Interior exit handling: only care about exit zones, ignore building doors
        if (this.activeInterior && this.isInsideInteriorRoom()) {
            if (this.isPlayerAtInteriorExit(p)) {
                this.exitInterior();
            } else if (pressed) {
                g.uiManager?.showSpeechBubble?.('Move closer to the exit to leave.');
            }
            return true;
        }

        const building = this.getNearbyBuildingDoor(p);
        if (building) {
            this.enterBuilding(building);
            return true;
        }

        // Debug aid: report nearest door distance when interact is pressed but no door found
        if (g.debug && Array.isArray(this.activeContent?.buildings)) {
            let nearest = null;
            let bestDistSq = Infinity;
            const px = p.x + (p.width ? p.width / 2 : 0);
            const py = p.y + (p.height ? p.height : 0);
            this.activeContent.buildings.forEach(b => {
                const door = b.door || {};
                const cx = (door.x ?? 0) + (door.width || 0) / 2;
                const cy = (door.y ?? 0) + (door.height || 0) / 2;
                const dx = px - cx;
                const dy = py - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    nearest = { building: b, door, distSq };
                }
            });
            if (nearest) {
                const dist = Math.sqrt(nearest.distSq);
                const radius = nearest.door.interactRadius ?? 0;
                g.uiManager?.showSpeechBubble?.(`Door too far: ${dist.toFixed(1)} (radius ${radius})`);
            } else {
                g.uiManager?.showSpeechBubble?.('No building doors loaded');
            }
        }

        return false;
    }

    getNearbyBuildingDoor(player) {
        if (!player || !Array.isArray(this.activeContent?.buildings)) return null;
        const px = player.x + (player.width ? player.width / 2 : 0);
        const py = player.y + (player.height ? player.height : 0);
        return this.activeContent.buildings.find(b => {
            const door = b.door || {};
            const centerX = (door.x ?? 0) + (door.width || 0) / 2;
            const centerY = (door.y ?? 0) + (door.height || 0) / 2;
            const dx = (px || 0) - centerX;
            const dy = (py || 0) - centerY;
            const distSq = dx * dx + dy * dy;
            const radius = door.interactRadius ?? 32;
            return distSq <= radius * radius;
        }) || null;
    }

    enterBuilding(building) {
        const label = building?.name || 'Building';
        const interiorId = building?.interiorId || building?.interior?.id || null;
        if (!interiorId) {
            this.game?.uiManager?.showSpeechBubble?.(`${label} is locked.`);
            return;
        }

        const interiorConfig = this.getInteriorConfig(interiorId, building) || {};
        const roomDesc = this.resolveInteriorRoom(interiorId, interiorConfig);
        if (!roomDesc) {
            this.game?.uiManager?.showSpeechBubble?.(`Add Room "${interiorId}" to enter ${label}.`);
            return;
        }

        const player = this.game?.player;
        const returnPosition = this.getExteriorReturnPosition(building, player);
        const spawnOverride = interiorConfig.spawn || interiorConfig.spawnPoint || roomDesc.spawn || null;
        const exitZone = interiorConfig.exit || interiorConfig.exitZone || this.getDefaultInteriorExit(spawnOverride || roomDesc.spawn, player);

        const prevTestMode = this.game?.testMode;
        if (this.game) {
            this.game.testMode = false; // force non-test layout for interiors
        }

        this.interiorReturn = {
            levelId: this.game?.currentLevelId || null,
            townId: this.currentTownId,
            buildingId: building?.id || null,
            position: returnPosition,
            prevTestMode
        };
        this.activeInterior = {
            id: interiorId,
            buildingId: building?.id || null,
            exitZone,
            label
        };

        this.openBuildingDoor(building);
        const mgr = this.ensureRoomManager();
        if (roomDesc && mgr) {
            const room = mgr.buildRoomDescriptor(interiorId, roomDesc, spawnOverride, exitZone);
            mgr.enterRoom(room, returnPosition);
        } else {
            this.game?.uiManager?.showSpeechBubble?.('Room system is unavailable.');
        }
    }

    openBuildingDoor(building) {
        if (!building) return;
        building.doorOpen = true;
        building.frameIndex = 1; // second frame = door open
        building.doorTimer = this.doorAutoCloseMs;
    }

    closeBuildingDoor(building) {
        if (!building) return;
        building.doorOpen = false;
        building.frameIndex = 0;
        building.doorTimer = 0;
    }

    updateBuildingDoors(deltaTime = 0) {
        if (!Array.isArray(this.activeContent?.buildings)) return;
        this.activeContent.buildings.forEach(b => {
            if (!b.doorOpen) return;
            b.doorTimer = Math.max(0, (b.doorTimer || 0) - deltaTime);
            if (b.doorTimer <= 0) {
                this.closeBuildingDoor(b);
            }
        });
    }

    updateSetpieceAnimation(deltaTime = 0) {
        if (!Array.isArray(this.activeContent?.setpieces)) return;
        this.activeContent.setpieces.forEach(sp => {
            if (!sp.frames || sp.frames <= 1) return;
            const frameTime = sp.frameTimeMs ?? 120;
            sp._frameTimer = (sp._frameTimer || 0) + deltaTime;
            if (sp._frameTimer >= frameTime) {
                const advance = Math.floor(sp._frameTimer / frameTime);
                sp._frameTimer -= advance * frameTime;
                sp.frameIndex = ((sp.frameIndex || 0) + advance) % sp.frames;
            }
        });
    }

    getExteriorReturnPosition(building, player = null) {
        if (!building) return null;
        const door = building.door || {};
        const playerWidth = player?.width ?? 48;
        const playerHeight = player?.height ?? 64;
        const doorWidth = door.width ?? playerWidth;
        const doorHeight = door.height ?? playerHeight;
        const x = (door.x ?? 0) + Math.max(0, (doorWidth - playerWidth) / 2);
        const y = (door.y ?? 0) + Math.max(0, doorHeight - playerHeight);
        return { x, y };
    }

    getDefaultInteriorExit(spawn = null, player = null) {
        const playerWidth = player?.width ?? 48;
        const playerHeight = player?.height ?? 64;
        const fallbackSpawn = spawn || { x: player?.x ?? 80, y: player?.y ?? 0 };
        return {
            x: fallbackSpawn.x + playerWidth * 0.5,
            y: fallbackSpawn.y + playerHeight * 0.5,
            radius: Math.max(playerWidth, playerHeight) * 0.8
        };
    }

    isInsideInteriorRoom() {
        const g = this.game;
        if (!this.activeInterior || !g) return false;
        const activeRoomId = g.currentRoomId || null;
        const worldKind = g.activeWorld?.kind || (g.roomManager?.isActive?.() ? 'room' : 'level');
        return worldKind === 'room' && activeRoomId === this.activeInterior.id;
    }

    isPlayerAtInteriorExit(player) {
        if (!player || !this.activeInterior?.exitZone) return false;
        const zone = this.activeInterior.exitZone;
        const px = player.x + (player.width ? player.width / 2 : 0);
        const py = player.y + (player.height || 0);
        if (zone.radius) {
            const dx = px - (zone.x ?? 0);
            const dy = py - (zone.y ?? 0);
            return dx * dx + dy * dy <= Math.pow(zone.radius, 2);
        }
        const zx = zone.x ?? 0;
        const zy = zone.y ?? 0;
        const zw = zone.width ?? 64;
        const zh = zone.height ?? 64;
        return px >= zx && px <= zx + zw && py >= zy && py <= zy + zh;
    }

    exitInterior() {
        if (!this.activeInterior || !this.interiorReturn) return;
        const targetLevel = this.interiorReturn.levelId || 'testRoom';
        const spawn = this.interiorReturn.position || null;
        const prevTestMode = this.interiorReturn.prevTestMode;
        if (this.game && typeof prevTestMode === 'boolean') {
            this.game.testMode = prevTestMode;
        }
        this.activeInterior = null;
        this.interiorReturn = null;
        if (this.roomManager?.isActive()) {
            this.roomManager.exitRoom();
            return;
        }
        this.restoreExteriorWorld(targetLevel, spawn);
    }

    restoreExteriorWorld(levelId = null, spawn = null) {
        const g = this.game;
        if (!g || !levelId) return;
        this.resetTownContent();
        this.currentTownId = null;
        g.createLevel?.(levelId);
        const spawnX = spawn?.x ?? g.level?.spawnX ?? g.player?.x ?? 0;
        const spawnY = spawn?.y ?? g.level?.spawnY ?? g.player?.y ?? 0;
        if (g.player) {
            g.player.x = spawnX;
            g.player.y = spawnY;
            if (g.player.velocity) {
                g.player.velocity.x = 0;
                g.player.velocity.y = 0;
            }
            g.player.onGround = false;
        }
        g.setActiveWorld?.('level', { id: levelId, theme: g.currentTheme, bounds: { width: g.level?.width, height: g.level?.height } });
        const town = this.getTownForPosition(levelId, spawnX);
        if (town) {
            this.currentTownId = town.id;
            this.loadTownContent(town);
            this.handleTownMusic(town);
        }
    }

    spawnTownNpcs() {
        const g = this.game;
        if (!Array.isArray(this.townNpcs)) return;
        this.townNpcs.forEach(npc => {
            if (!npc) return;
            npc.game = g;
            if (!g.npcs.includes(npc)) {
                g.npcs.push(npc);
            }
        });
    }

    removeTownNpcs() {
        if (!this.game || !Array.isArray(this.townNpcs) || !Array.isArray(this.game.npcs)) return;
        this.game.npcs = this.game.npcs.filter(npc => !this.townNpcs.includes(npc));
        this.townNpcs = [];
    }

    restoreTownNpcs() {
        this.spawnTownNpcs();
    }

    updateTownNpcs(deltaTime = 0) {
        if (!Array.isArray(this.townNpcs)) return;
        this.townNpcs.forEach(npc => npc?.update?.(deltaTime));
    }

    ensureTownNpcsPresent() {
        const g = this.game;
        if (!Array.isArray(this.townNpcs) || !Array.isArray(g.npcs)) return;
        this.townNpcs.forEach(npc => {
            if (!npc) return;
            // Re-align to ground each ensure step to keep with player layer
            const groundY = this.getGroundY();
            if (groundY !== null && groundY !== undefined) {
                npc.y = groundY - npc.height;
                if (Array.isArray(npc.patrol)) {
                    npc.patrol = npc.patrol.map(p => ({ x: p.x, y: groundY - npc.height }));
                }
            }
            npc.game = g;
            if (!g.npcs.includes(npc)) {
                g.npcs.push(npc);
            }
        });
    }

    buildDecorRenderable(def = {}) {
        const spritePath = def.sprite;
        const img = this.getSprite(spritePath);
        if (!img) return null;
        const frames = Math.max(1, def.frames || 1);
        const frameDirection = def.frameDirection || 'vertical';
        const scale = def.scale ?? 1;
        const frameWidth = def.frameWidth ?? (frameDirection === 'horizontal' ? (img.width / frames) : img.width);
        const frameHeight = def.frameHeight ?? (frameDirection === 'vertical' ? (img.height / frames) : img.height);
        const width = def.width ?? ((frameDirection === 'horizontal' ? frameWidth : (def.frameWidth ?? frameWidth)) * scale);
        const height = def.height ?? ((frameDirection === 'vertical' ? frameHeight : (def.frameHeight ?? frameHeight)) * scale);
        const ref = def.frameIndexRef;
        const tileX = !!def.tileX;
        const tileWidth = def.tileWidth || (frameWidth * scale);
        const manager = this;
        return {
            x: def.x || 0,
            y: def.y || 0,
            width,
            height,
            layer: def.layer || 'foreground',
            sprite: spritePath,
            render: (ctx, camera) => {
                if (!ctx || !img.complete) return;
                const frameIdx = ref?.frameIndex ?? def.frameIndex ?? 0;
                const sx = frameDirection === 'horizontal' ? frameIdx * frameWidth : 0;
                const sy = frameDirection === 'vertical' ? frameIdx * frameHeight : 0;
                const destX = (def.x || 0) - (camera?.x || 0);
                const destY = (def.y || 0) - (camera?.y || 0);
                const srcW = frameDirection === 'horizontal' ? frameWidth : img.width;
                const srcH = frameDirection === 'vertical' ? frameHeight : img.height;

                if (tileX) {
                    for (let x = 0; x < width; x += tileWidth) {
                        const drawWidth = Math.min(tileWidth, width - x);
                        ctx.drawImage(
                            img,
                            sx, sy,
                            srcW, srcH,
                            destX + x,
                            destY,
                            drawWidth,
                            height
                        );
                    }
                } else {
                    ctx.drawImage(
                        img,
                        sx, sy,
                        srcW,
                        srcH,
                        destX,
                        destY,
                        width,
                        height
                    );
                }

                // Debug overlay for building doors (visible when debug is enabled)
                if (manager?.game?.debug && def.doorRef?.door) {
                    const door = def.doorRef.door;
                    const doorX = (door.x || 0) - (camera?.x || 0);
                    const doorY = (door.y || 0) - (camera?.y || 0);
                    ctx.save();
                    ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(doorX, doorY, door.width || 0, door.height || 0);
                    const radius = door.interactRadius || 0;
                    if (radius > 0) {
                        ctx.beginPath();
                        ctx.arc(doorX + (door.width || 0) / 2, doorY + (door.height || 0) / 2, radius, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(0, 200, 100, 0.6)';
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }
        };
    }

    getGroundY() {
        const g = this.game;
        if (typeof g.testGroundY === 'number') return g.testGroundY;
        if (Array.isArray(g.platforms)) {
            const ground = g.platforms.find(p => p?.type === 'ground');
            if (ground) return ground.y;
        }
        if (g.canvas?.height) {
            const groundHeight = g.config?.testRoom?.groundHeight ?? 50;
            return g.canvas.height - groundHeight;
        }
        if (g.level?.height) {
            const groundHeight = g.config?.testRoom?.groundHeight ?? 50;
            return g.level.height - groundHeight;
        }
        return null;
    }

    getSprite(path) {
        if (!path) return null;
        if (this.spriteCache[path]) return this.spriteCache[path];
        const img = new Image();
        img.decoding = 'async';
        // Normalize paths with spaces to avoid fetch/load failures
        const normalizedSrc = encodeURI(path);
        img.src = normalizedSrc;
        this.spriteCache[path] = img;
        if (typeof img.decode === 'function') {
            this.spriteDecodePromises[path] = img.decode().catch(() => {});
        }
        return img;
    }

    preloadTownSprites() {
        if (!Array.isArray(this.towns)) return;
        const paths = new Set();
        this.towns.forEach(town => {
            (town?.buildings || []).forEach(b => {
                if (b?.exterior?.sprite) paths.add(b.exterior.sprite);
            });
            (town?.setpieces || []).forEach(sp => {
                if (sp?.sprite) paths.add(sp.sprite);
            });
        });
        // Preload via Image + fetch(blob) to force network/cache, then decode and prime GPU upload
        const promises = [];
        paths.forEach(p => {
            const img = this.getSprite(p);
            if (img && typeof img.decode === 'function') {
                const promise = img.decode().then(() => this.primeSpriteUpload(img)).catch(() => {});
                this.spriteDecodePromises[p] = promise;
                promises.push(promise);
            }
            if (typeof fetch === 'function') {
                const fetchPromise = fetch(encodeURI(p), { cache: 'force-cache' })
                    .then(res => res.ok ? res.blob() : null)
                    .then(blob => {
                        if (!blob || !img) return null;
                        const objectUrl = URL.createObjectURL(blob);
                        img.src = objectUrl;
                        if (typeof img.decode === 'function') {
                            const decodePromise = img.decode().then(() => this.primeSpriteUpload(img)).catch(() => {});
                            this.spriteDecodePromises[p] = decodePromise;
                            return decodePromise;
                        }
                        return null;
                    })
                    .catch(() => null);
                promises.push(fetchPromise);
            }
        });
        const filtered = promises.filter(Boolean);
        if (filtered.length) {
            this.spritePreloadPromise = Promise.all(filtered)
                .then(() => {
                    this.spritePreloadReady = true;
                    if (!this.preloadedTownId && this.towns?.length) {
                        const firstTown = this.towns[0];
                        this.preloadedTownId = firstTown.id;
                        this.loadTownContent(firstTown);
                    }
                    if (this.pendingTownToLoad) {
                        this.loadTownContent(this.pendingTownToLoad);
                        this.pendingTownToLoad = null;
                    }
                })
                .catch(() => { this.spritePreloadReady = true; });
        } else {
            this.spritePreloadReady = true;
        }
    }

    /**
     * Draw once to a tiny offscreen canvas to force GPU upload and avoid first-draw hitch/pop.
     */
    primeSpriteUpload(img) {
        if (!img || !img.width || !img.height) return;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(2, img.width);
            canvas.height = Math.min(2, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Draw renderable offscreen once to encourage eager upload.
     */
    primeRenderable(renderable) {
        if (!renderable || typeof renderable.render !== 'function') return;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 4;
            canvas.height = 4;
            const ctx = canvas.getContext('2d');
            renderable.render(ctx, { x: 0, y: 0 });
        } catch (e) {
            // ignore
        }
    }

    /**
     * Clone plain data (no functions/cycles). Falls back to the source if cloning fails.
     */
    clonePlain(obj) {
        if (obj === null || obj === undefined) return obj;
        try {
            if (typeof structuredClone === 'function') return structuredClone(obj);
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return obj;
        }
    }

    cloneObject(obj) {
        try {
            return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return JSON.parse(JSON.stringify(obj));
        }
    }

    updateMusicTransition(deltaTime = 0) {
        const t = this.musicTransition;
        const audio = this.getAudioManager();
        if (!t || !audio) return;
        t.elapsed += deltaTime;
        const progress = Math.min(1, t.elapsed / t.duration);
        const lerp = (a, b) => a + (b - a) * progress;

        if (t.stage === 'fadeOutBase') {
            if (t.baseId) {
                audio.setTrackVolume?.(t.baseId, lerp(t.fromBase, t.toBase));
            }
            if (progress >= 1) {
                if (t.baseId && audio.music?.[t.baseId]) {
                    audio.setTrackVolume?.(t.baseId, 0);
                }
                // Immediately start town theme at 0 then fade it in (no pause)
                this.ensureTrackPlaying(t.townId, 0);
                this.musicTransition = {
                    ...t,
                    stage: 'fadeInTown',
                    fromTown: 0,
                    elapsed: 0,
                    duration: this.fadeDuration
                };
            }
            return;
        }

        if (t.stage === 'fadeInTown') {
            if (t.townId) {
                audio.setTrackVolume?.(t.townId, lerp(t.fromTown ?? 0, t.toTown ?? 0));
            }
            if (progress >= 1) {
                this.musicTransition = null;
            }
            return;
        }

        if (t.stage === 'fadeOutTown') {
            if (t.townId) {
                audio.setTrackVolume?.(t.townId, lerp(t.fromTown, t.toTown));
            }
            if (progress >= 1) {
                if (t.townId && audio.music?.[t.townId]) {
                    audio.setTrackVolume?.(t.townId, 0);
                    audio.music[t.townId].pause();
                }
                // Bring base back only after town is fully silent
                this.ensureTrackPlaying(t.baseId, 0);
                this.musicTransition = {
                    ...t,
                    stage: 'fadeInBase',
                    fromBase: 0,
                    elapsed: 0,
                    duration: this.fadeDuration
                };
            }
            return;
        }

        if (t.stage === 'fadeInBase') {
            if (t.baseId) {
                audio.setTrackVolume?.(t.baseId, lerp(t.fromBase ?? 0, t.toBase ?? 0));
            }
            if (progress >= 1) {
                this.musicTransition = null;
            }
            return;
        }

        // Default cross-fade stage (legacy fallback)
        if (t.baseId) {
            audio.setTrackVolume?.(t.baseId, lerp(t.fromBase, t.toBase));
        }
        if (t.townId) {
            audio.setTrackVolume?.(t.townId, lerp(t.fromTown, t.toTown));
        }

        if (progress >= 1) {
            if (t.townId && t.toTown === 0 && audio.music?.[t.townId]) {
                audio.music[t.townId].pause();
            }
            this.musicTransition = null;
        }
    }

    ensureTownMusicLoaded(town) {
        const audio = this.getAudioManager();
        const id = this.getTownMusicId(town);
        const src = town?.music?.src;
        if (!audio || !id || !src) return;
        if (!audio.music?.[id]) {
            audio.loadMusic?.(id, src);
        }
    }

    ensureTrackPlaying(name, volume = 1) {
        const audio = this.getAudioManager();
        if (!audio || !name || !audio.music?.[name]) return;
        audio.playMusic?.(name, volume, { allowParallel: true, restartIfPlaying: false });
        audio.setTrackVolume?.(name, volume);
    }

    getBaseMusicId() {
        return this.game.currentLevelMusicId || 'level1';
    }

    getBaseMusicVolume() {
        return this.game.currentLevelMusicVolume ?? this.baseMusicVolume ?? 0.8;
    }

    getTownMusicId(town) {
        return town?.music?.id || null;
    }

    getTownMusicVolume(town = null) {
        return town?.music?.volume ?? 0.9;
    }

    getAudioManager() {
        return this.game?.services?.audio?.managerRef || this.game?.audioManager || null;
    }

    preloadTownMusic() {
        const audio = this.getAudioManager();
        if (!audio || !Array.isArray(this.towns)) return;
        this.towns.forEach(town => {
            const id = this.getTownMusicId(town);
            const src = town?.music?.src;
            if (id && src && !audio.music?.[id]) {
                audio.loadMusic?.(id, src);
            }
        });
    }
}
