/**
 * TownManager - handles town region detection and entry UI.
 * Designed for modular towns with banners/buildings/foreground/interiors.
 */
class TownManager {
    constructor(game, config = {}) {
        this.game = game;
        this.towns = (config && config.towns) ? [...config.towns] : [];
        this.currentTownId = null;
        this.lastBannerAt = 0;
        this.activeTownMusicId = null;
        this.musicTransition = null;
        this.fadeDuration = 1200;
        this.baseMusicVolume = game.currentLevelMusicVolume ?? 0.8;
        this.activeContent = { buildings: [], setpieces: [] };
        this.doorAutoCloseMs = 2200;

        this.preloadTownMusic();
    }

    /**
        * Check player position and trigger town entry when crossing a region.
        */
    update(deltaTime = 0) {
        const g = this.game;
        const p = g.player;
        if (!p || !g.level) return;

        const town = this.getTownForPosition(g.currentLevelId, p.x);
        const townId = town?.id || null;
        if (townId && townId !== this.currentTownId) {
            this.handleTownEntry(town);
        } else if (!townId) {
            this.handleTownExit();
        }

        this.updateMusicTransition(deltaTime);
        this.updateBuildingDoors(deltaTime);
    }

    /**
     * Instantiate building/foreground/interior metadata.
     */
    loadTownContent(town) {
        this.resetTownContent();
        if (!town) return;
        const buildings = Array.isArray(town.buildings) ? town.buildings.map(def => this.createBuilding(def)) : [];
        const setpieces = Array.isArray(town.setpieces) ? town.setpieces.map(def => this.createSetpiece(def)) : [];
        this.activeContent = { buildings, setpieces };
    }

    resetTownContent() {
        this.activeContent = { buildings: [], setpieces: [] };
    }

    createBuilding(def = {}) {
        return {
            id: def.id || null,
            name: def.name || 'Building',
            exterior: def.exterior || {},
            frames: def.exterior?.frames ?? 2,
            frameHeight: def.exterior?.frameHeight ?? (() => {
                const frames = def.exterior?.frames ?? 2;
                const h = def.exterior?.height || 0;
                return Math.max(1, Math.floor(h / Math.max(1, frames)));
            })(),
            frameIndex: 0, // 0 = door closed, 1 = door open
            door: {
                x: def.door?.x ?? def.exterior?.x ?? 0,
                y: def.door?.y ?? def.exterior?.y ?? 0,
                width: def.door?.width ?? def.exterior?.doorWidth ?? 36,
                height: def.door?.height ?? def.exterior?.doorHeight ?? 48,
                interactRadius: def.door?.interactRadius ?? 32
            },
            interiorId: def.interiorId || null,
            npcs: Array.isArray(def.npcs) ? [...def.npcs] : [],
            doorTimer: 0,
            doorOpen: false
        };
    }

    createSetpiece(def = {}) {
        return {
            id: def.id || null,
            name: def.name || 'Setpiece',
            x: def.x ?? 0,
            y: def.y ?? 0,
            width: def.width ?? 64,
            height: def.height ?? 64,
            layer: def.layer || 'foreground',
            sprite: def.sprite || null
        };
    }

    getTownForPosition(levelId, x) {
        if (!Array.isArray(this.towns)) return null;
        return this.towns.find(t => (!t.levelId || t.levelId === levelId) && x >= (t.region?.startX ?? Infinity) && x <= (t.region?.endX ?? -Infinity)) || null;
    }

    handleTownEntry(town) {
        const g = this.game;
        this.currentTownId = town.id;
        this.lastBannerAt = g.gameTime || 0;
        g.uiManager?.showTownBanner?.(town);
        this.loadTownContent(town);
        this.handleTownMusic(town);
    }

    handleTownExit() {
        if (!this.currentTownId) return;
        this.handleTownMusic(null);
        this.resetTownContent();
        this.currentTownId = null;
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
        if (!consumeInteract()) return false;

        const building = this.getNearbyBuildingDoor(p);
        if (!building) return false;
        this.enterBuilding(building);
        return true;
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
        const interiorId = building?.interiorId || 'interior';
        this.openBuildingDoor(building);
        // Placeholder hook for loading interiors; replace with real scene/level switch.
        this.game?.uiManager?.showSpeechBubble?.(`Entering ${label} (${interiorId})`);
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
