class CutsceneScene {
    attach(ctx) {
        this.ctx = ctx;
    }

    enter() {
        if (!this.ctx) return;
        const audio = this.ctx?.audio || this.ctx?.services?.audio;
        this.ctx.setRunning?.(true);
        this.ctx.stateManager?.setState?.(this.ctx.stateManager?.states?.CUTSCENE || 'cutscene');
        // Duck current music slightly while cutscene plays
        if (audio?.setMusicVolume) {
            const current = audio.getMusicVolume ? audio.getMusicVolume() : 1;
            audio._cutsceneRestoreVolume = current;
            audio.setMusicVolume(current * 0.7);
        } else if (audio?.setMusic) {
            const current = audio.getMusic ? audio.getMusic() : 1;
            audio._cutsceneRestoreVolume = current;
            audio.setMusic(current * 0.7);
        }
        this.ctx.cutscenePlayer?.start();
    }

    exit() {
        const audio = this.ctx?.audio || this.ctx?.services?.audio;
        if (audio && audio._cutsceneRestoreVolume) {
            if (audio.setMusicVolume) {
                audio.setMusicVolume(audio._cutsceneRestoreVolume);
            } else if (audio.setMusic) {
                audio.setMusic(audio._cutsceneRestoreVolume);
            }
            audio._cutsceneRestoreVolume = null;
        }
    }

    update() {
        // Cutscene tick handled from Game.onTick
    }

    render() {
        // Rendering happens via CutscenePlayer.render inside Game.onTick.
    }
}
