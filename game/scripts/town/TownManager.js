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
    }

    /**
     * Placeholder for future building/foreground/interior instantiation.
     */
    loadTownContent(town) {
        // Future: instantiate buildings/foreground/interiors from town config.
        // e.g., this.game.worldBuilder.buildTown(town);
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
