/**
 * SceneManager - lightweight scene/flow controller with enter/update/render/exit hooks.
 */
class SceneManager {
    constructor(game, context = null) {
        this.game = game;
        this.context = context || { game };
        this.current = null;
        this.previous = null;
        this.currentName = null;
        this.previousName = null;
        this.scenes = {};
    }

    register(name, scene) {
        this.scenes[name] = scene;
        if (scene && typeof scene.attach === 'function') {
            scene.attach(this.context);
        }
    }

    change(name) {
        if (!this.scenes[name]) return false;
        if (this.current && typeof this.current.exit === 'function') {
            this.current.exit();
        }
        this.previous = this.current;
        this.previousName = this.currentName;
        this.current = this.scenes[name];
        this.currentName = name;
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
