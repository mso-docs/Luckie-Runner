/**
 * SoundGalleryManager - Manages the Club Cidic music player interface
 * Controls track selection, playback, and vinyl record animations
 */
class SoundGalleryManager {
    constructor(game) {
        this.game = game;
        this.audio = game.services?.audio || game.audioManager;
        this.isOpen = false;
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.selectedTrackIndex = 0;
        
        // Track library with actual game music files
        this.tracks = [
            { id: 'time-to-slime', name: 'Time to Slime', src: 'music/time-to-slime.mp3' },
            { id: 'beachside', name: 'Beachside', src: 'music/beachside.mp3' },
            { id: 'beachside-boba', name: 'Beachside Boba', src: 'music/beachside-boba.mp3' },
            { id: 'beach-house', name: 'Beach House', src: 'music/beach-house.mp3' },
            { id: 'overworld', name: 'Overworld', src: 'music/overworld.mp3' },
            { id: 'level1', name: 'Level 1', src: 'music/level1.mp3' },
            { id: 'level2', name: 'Level 2', src: 'music/level2.mp3' },
            { id: 'level3', name: 'Level 3', src: 'music/level3.mp3' },
            { id: 'tutorial-battle', name: 'Tutorial Battle', src: 'music/tutorial-battle.mp3' },
            { id: 'titlescreen', name: 'Title Screen', src: 'music/titlescreen.mp3' }
        ];
        
        // Player state
        this.shuffle = false;
        this.repeat = false;
        this.loop = false;
        
        // Keep track of Club Cidic music state for persistence
        this.clubCidicMusicState = {
            isPlaying: false,
            trackId: 'time-to-slime',
            trackIndex: 0
        };
        
        this.initializeUI();
        this.attachEventListeners();
    }

    initializeUI() {
        this.overlay = document.getElementById('soundGalleryOverlay');
        this.trackList = document.getElementById('trackList');
        this.trackName = document.getElementById('currentTrackName');
        this.vinylRecord = document.getElementById('vinylRecord');
        this.playPauseIcon = document.getElementById('playPauseIcon');
        this.searchInput = document.getElementById('trackSearch');
        
        // Populate track list
        this.renderTrackList();
    }

    renderTrackList() {
        if (!this.trackList) return;
        
        this.trackList.innerHTML = '';
        
        this.tracks.forEach((track, index) => {
            const trackItem = document.createElement('button');
            trackItem.className = 'track-item';
            trackItem.dataset.trackIndex = index;
            trackItem.dataset.trackId = track.id;
            
            if (index === this.currentTrackIndex) {
                trackItem.classList.add('active');
            }
            
            trackItem.innerHTML = `
                <span class="track-icon">🎵</span>
                <span class="track-text">${track.name}</span>
            `;
            
            trackItem.addEventListener('click', () => {
                this.selectTrack(index);
            });
            
            this.trackList.appendChild(trackItem);
        });
    }

    attachEventListeners() {
        // Play/Pause button
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Previous track
        const prevBtn = document.getElementById('prevTrack');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousTrack());
        }

        // Next track
        const nextBtn = document.getElementById('nextTrack');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextTrack());
        }

        // Close button
        const closeBtn = document.getElementById('soundGalleryClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Shuffle button
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }

        // Repeat button
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => this.toggleRepeat());
        }

        // Loop button
        const loopBtn = document.getElementById('loopBtn');
        if (loopBtn) {
            loopBtn.addEventListener('click', () => this.toggleLoop());
        }

        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.filterTracks(e.target.value));
        }

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    handleKeyPress(e) {
        if (!this.isOpen) return;

        switch(e.key) {
            case 'z':
            case 'Z':
                e.preventDefault();
                this.close();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPreviousTrack();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.selectNextTrack();
                break;
            case 'Enter':
                e.preventDefault();
                this.playSelectedTrack();
                break;
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
        }
    }

    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.overlay?.classList.remove('hidden');
        this.overlay?.setAttribute('aria-hidden', 'false');
        
        // Pause game
        if (this.game.pause) {
            this.game.pause();
        }
        
        // Load current Club Cidic music state
        this.restoreClubCidicState();
        
        // Focus search input
        setTimeout(() => this.searchInput?.focus(), 100);
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay?.classList.add('hidden');
        this.overlay?.setAttribute('aria-hidden', 'true');
        
        // Save Club Cidic music state for persistence
        this.saveClubCidicState();
        
        // Resume game
        if (this.game.resume) {
            this.game.resume();
        }
        
        // Music continues playing in Club Cidic based on player's choice
        // (already handled by saveClubCidicState)
    }

    selectTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        
        this.currentTrackIndex = index;
        this.selectedTrackIndex = index;
        
        // Update UI
        this.updateTrackListUI();
        this.updateCurrentTrackDisplay();
        
        // Play the selected track
        this.playCurrentTrack();
    }

    playSelectedTrack() {
        this.selectTrack(this.selectedTrackIndex);
    }

    selectPreviousTrack() {
        this.selectedTrackIndex = (this.selectedTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.highlightSelectedTrack();
        this.scrollToSelectedTrack();
    }

    selectNextTrack() {
        this.selectedTrackIndex = (this.selectedTrackIndex + 1) % this.tracks.length;
        this.highlightSelectedTrack();
        this.scrollToSelectedTrack();
    }

    highlightSelectedTrack() {
        const trackItems = this.trackList?.querySelectorAll('.track-item');
        trackItems?.forEach((item, index) => {
            if (index === this.selectedTrackIndex) {
                item.style.border = '3px solid #95d5b2';
                item.style.boxShadow = '0 0 20px rgba(149, 213, 178, 0.6)';
            } else if (index !== this.currentTrackIndex) {
                item.style.border = '';
                item.style.boxShadow = '';
            }
        });
    }

    scrollToSelectedTrack() {
        const trackItems = this.trackList?.querySelectorAll('.track-item');
        const selectedItem = trackItems?.[this.selectedTrackIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    updateTrackListUI() {
        const trackItems = this.trackList?.querySelectorAll('.track-item');
        trackItems?.forEach((item, index) => {
            if (index === this.currentTrackIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateCurrentTrackDisplay() {
        const track = this.tracks[this.currentTrackIndex];
        if (this.trackName && track) {
            this.trackName.textContent = track.name;
        }
    }

    playCurrentTrack() {
        const track = this.tracks[this.currentTrackIndex];
        if (!track || !this.audio) return;
        
        // Play music through audio service
        this.audio.playMusic?.(track.id, 0.9);
        
        this.isPlaying = true;
        this.updatePlayPauseUI();
        this.startVinylSpin();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.audio) return;
        
        // Resume or play current track
        if (this.audio.resumeMusic) {
            this.audio.resumeMusic();
        } else {
            this.playCurrentTrack();
        }
        
        this.isPlaying = true;
        this.updatePlayPauseUI();
        this.startVinylSpin();
    }

    pause() {
        if (!this.audio) return;
        
        this.audio.pauseMusic?.();
        
        this.isPlaying = false;
        this.updatePlayPauseUI();
        this.stopVinylSpin();
    }

    previousTrack() {
        const newIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.selectTrack(newIndex);
    }

    nextTrack() {
        let newIndex;
        if (this.shuffle) {
            newIndex = Math.floor(Math.random() * this.tracks.length);
        } else {
            newIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        }
        this.selectTrack(newIndex);
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        const btn = document.getElementById('shuffleBtn');
        if (btn) {
            btn.style.background = this.shuffle 
                ? 'linear-gradient(135deg, #95d5b2, #74c69d)' 
                : 'linear-gradient(135deg, #52b788, #40916c)';
        }
    }

    toggleRepeat() {
        this.repeat = !this.repeat;
        const btn = document.getElementById('repeatBtn');
        if (btn) {
            btn.style.background = this.repeat 
                ? 'linear-gradient(135deg, #95d5b2, #74c69d)' 
                : 'linear-gradient(135deg, #52b788, #40916c)';
        }
    }

    toggleLoop() {
        this.loop = !this.loop;
        const btn = document.getElementById('loopBtn');
        if (btn) {
            btn.style.background = this.loop 
                ? 'linear-gradient(135deg, #95d5b2, #74c69d)' 
                : 'linear-gradient(135deg, #52b788, #40916c)';
        }
    }

    updatePlayPauseUI() {
        if (this.playPauseIcon) {
            this.playPauseIcon.textContent = this.isPlaying ? '⏸' : '▶';
        }
    }

    startVinylSpin() {
        this.vinylRecord?.classList.add('spinning');
    }

    stopVinylSpin() {
        this.vinylRecord?.classList.remove('spinning');
    }

    filterTracks(searchTerm) {
        const trackItems = this.trackList?.querySelectorAll('.track-item');
        const term = searchTerm.toLowerCase();
        
        trackItems?.forEach(item => {
            const trackText = item.querySelector('.track-text')?.textContent.toLowerCase();
            if (trackText?.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    saveClubCidicState() {
        // Save current music state for Club Cidic room
        this.clubCidicMusicState = {
            isPlaying: this.isPlaying,
            trackId: this.tracks[this.currentTrackIndex]?.id || 'time-to-slime',
            trackIndex: this.currentTrackIndex
        };
        
        // Store in game's town manager if available
        if (this.game.townManager) {
            this.game.townManager.clubCidicMusicState = this.clubCidicMusicState;
        }
    }

    restoreClubCidicState() {
        // Restore music state from town manager
        const savedState = this.game.townManager?.clubCidicMusicState || this.clubCidicMusicState;
        
        this.currentTrackIndex = savedState.trackIndex || 0;
        this.selectedTrackIndex = this.currentTrackIndex;
        this.isPlaying = savedState.isPlaying || false;
        
        this.updateTrackListUI();
        this.updateCurrentTrackDisplay();
        this.updatePlayPauseUI();
        
        if (this.isPlaying) {
            this.startVinylSpin();
        } else {
            this.stopVinylSpin();
        }
    }

    // Called when entering Club Cidic room
    applyClubCidicMusic() {
        const state = this.clubCidicMusicState;
        
        if (state.isPlaying) {
            // Continue playing the selected track
            const track = this.tracks[state.trackIndex];
            if (track && this.audio) {
                this.audio.playMusic?.(track.id, 0.9);
            }
        } else {
            // Stop music if player paused it
            this.audio?.stopMusic?.();
        }
    }
}

// Export for use in Game.js
if (typeof window !== 'undefined') {
    window.SoundGalleryManager = SoundGalleryManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundGalleryManager;
}
