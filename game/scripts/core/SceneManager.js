/**
 * SceneManager - lightweight scene/flow controller with enter/update/render/exit hooks.
 */
class SceneManager {
    constructor(game) {
        this.game = game;
        this.current = null;
        this.previous = null;
        this.scenes = {};
    }

    register(name, scene) {
        this.scenes[name] = scene;
        if (scene && typeof scene.attach === 'function') {
            scene.attach(this.game);
        }
    }

    change(name) {
        if (!this.scenes[name]) return false;
        if (this.current && typeof this.current.exit === 'function') {
            this.current.exit();
        }
        this.previous = this.current;
        this.current = this.scenes[name];
        if (this.current && typeof this.current.enter === 'function') {
            this.current.enter();
        }
        return true;
    }

    update(dt) {
        if (this.current && typeof this.current.update === 'function') {
            this.current.update(dt);
        }
    }

    render() {
        if (this.current && typeof this.current.render === 'function') {
            this.current.render();
        }
    }
}
