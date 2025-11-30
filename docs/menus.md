# Creating a New Menu from Scratch

This guide explains how to add a new in-game menu (e.g., Settings, Credits, Controls) from scratch. It covers the HTML structure, styling hook points, and JavaScript wiring with the existing menu/state systems. Minimal prior knowledge is assumed.

## Core Components and Where They Live
- **HTML**: Menus are defined in `game/index.html` as top-level `<div class="menu" id="...">` blocks. They are shown/hidden via classes (`hidden`) or GameStateManager/SceneManager methods.
- **CSS**: Styles in `game/styles/*.css` (e.g., `main.css`) control layout, typography, visibility (`.hidden`), and buttons.
- **UIManager** (`game/scripts/ui/UIManager.js`): Wires buttons, handles toggles for overlays (inventory, chest, shop, pause). You can add similar hooks for your menu.
- **GameStateManager / SceneManager**:
  - `GameStateManager` (`game/scripts/core/GameStateManager.js`) has helpers for pause/game/menu states (show/hide menus by id).
  - `SceneManager` (`game/scripts/core/scene/*.js`) handles higher-level scenes (`menu`, `play`, `pause`), often delegating to GameStateManager/UIManager.

## What a Menu Needs
1) **HTML container**: A `<div>` with a unique `id`, `class="menu hidden"` (hidden by default).
2) **Focusable elements**: Buttons/links with `id` or `data-action` for wiring in JS.
3) **Show/Hide logic**: JS to toggle `.hidden`, often via `GameStateManager.showMenu(menuId)` / `hideMenu(menuId)` or UIManager equivalents.
4) **Event wiring**: Button click handlers that call game actions (start, resume, open settings, close menu).
5) **Optional overlay behavior**: Pausing the game loop, muting audio, or blocking input while menu is open.

## Step-by-Step: Add a “Settings” Menu

### 1) Add HTML (game/index.html)
Place near other menus:
```html
<!-- Settings Menu -->
<div id="settingsMenu" class="menu hidden" role="dialog" aria-labelledby="settingsTitle">
  <h2 id="settingsTitle">Settings</h2>
  <div class="settings-row">
    <label for="settingsMasterVolume">Master Volume: <span id="settingsMasterValue">80%</span></label>
    <input type="range" id="settingsMasterVolume" min="0" max="100" value="80" step="5">
  </div>
  <div class="settings-row">
    <label for="settingsMusicVolume">Music Volume: <span id="settingsMusicValue">60%</span></label>
    <input type="range" id="settingsMusicVolume" min="0" max="100" value="60" step="5">
  </div>
  <div class="settings-row">
    <label for="settingsSfxVolume">SFX Volume: <span id="settingsSfxValue">80%</span></label>
    <input type="range" id="settingsSfxVolume" min="0" max="100" value="80" step="5">
  </div>
  <div class="settings-actions">
    <button id="settingsApplyButton" type="button">Apply</button>
    <button id="settingsCloseButton" type="button">Close</button>
  </div>
</div>
```

### 2) Style It (game/styles/main.css or a new CSS file)
```css
#settingsMenu.menu {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
}
.settings-row {
  width: 360px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #f7f7f7;
}
.settings-actions {
  display: flex;
  gap: 12px;
}
```

### 3) Wire JS (UIManager or a small helper)
Add in `UIManager.js` (or a new helper file) to bind buttons and show/hide:
```js
// UIManager.js
setupSettingsMenu() {
  this.settingsMenu = document.getElementById('settingsMenu');
  this.settingsApplyButton = document.getElementById('settingsApplyButton');
  this.settingsCloseButton = document.getElementById('settingsCloseButton');
  this.masterSlider = document.getElementById('settingsMasterVolume');
  this.musicSlider = document.getElementById('settingsMusicVolume');
  this.sfxSlider = document.getElementById('settingsSfxVolume');
  this.masterValue = document.getElementById('settingsMasterValue');
  this.musicValue = document.getElementById('settingsMusicValue');
  this.sfxValue = document.getElementById('settingsSfxValue');

  const updateLabels = () => {
    this.masterValue.textContent = `${this.masterSlider.value}%`;
    this.musicValue.textContent = `${this.musicSlider.value}%`;
    this.sfxValue.textContent = `${this.sfxSlider.value}%`;
  };
  [this.masterSlider, this.musicSlider, this.sfxSlider].forEach(slider => {
    slider?.addEventListener('input', updateLabels);
  });
  updateLabels();

  this.settingsApplyButton?.addEventListener('click', () => {
    const audio = this.game?.audioController;
    if (audio) {
      audio.setMasterVolume(this.masterSlider.value);
      audio.setMusicVolume(this.musicSlider.value);
      audio.setSfxVolume(this.sfxSlider.value);
    }
    this.hideSettingsMenu();
  });
  this.settingsCloseButton?.addEventListener('click', () => this.hideSettingsMenu());
},

showSettingsMenu() {
  this.settingsMenu?.classList.remove('hidden');
  this.game?.stateManager?.pause?.(); // Optional: pause game while in settings
},

hideSettingsMenu() {
  this.settingsMenu?.classList.add('hidden');
  this.game?.stateManager?.resume?.(); // Optional: resume game
}
```
Call `setupSettingsMenu()` from `UIManager.init` or after UI is ready.

### 4) Expose a Trigger
- Add a button in another menu (e.g., Pause) to open Settings:
```html
<button id="openSettingsButton" type="button">Settings</button>
```
Wire it:
```js
document.getElementById('openSettingsButton')
  ?.addEventListener('click', () => this.showSettingsMenu());
```

## How Menus Are Shown/Hidden Today
- Existing menus in `index.html`: `startMenu`, `instructionsMenu`, `gameOverMenu`, `pauseMenu`, `loadMenu`.
- `GameStateManager.showMenu(menuId)` / `hideMenu(menuId)` toggle `.hidden` on those ids.
- `UIManager` sets up event listeners for start/pause/inventory/etc.
- You can follow the same pattern: give your menu a unique id, then call `stateManager.showMenu('settingsMenu')` if you register it similarly, or directly toggle `.hidden`.

## Optional: Integrate with SceneManager
- Scenes (`MenuScene`, `PlayScene`, `PauseScene`) live in `game/scripts/core/scene/`.
- If your menu represents a whole scene (e.g., “Credits” scene), register it with `sceneManager.register('credits', new CreditsScene())` and switch with `sceneManager.change('credits')`.
- For simple overlays, prefer the `.hidden` toggle pattern to avoid complex scene changes.

## Checklist
1) Add HTML block with unique `id`, `class="menu hidden"`, and buttons/inputs.
2) Style in CSS for layout and visibility.
3) Wire JS to show/hide and handle button actions (in UIManager or a helper).
4) Add triggers (buttons/keys) to open/close the menu.
5) Optionally pause/resume the game loop while the menu is open.
6) Test focus, keyboard accessibility, and that game state resumes correctly.

## Troubleshooting
- **Menu never appears**: Ensure you remove `.hidden` in JS and the element `id` matches.
- **Buttons do nothing**: Check event listener wiring and that UIManager/setup ran.
- **Game keeps running under menu**: Pause via `stateManager.pause()` when showing; resume on hide.
- **Styles not applied**: Confirm CSS is loaded and selectors match your ids/classes.
