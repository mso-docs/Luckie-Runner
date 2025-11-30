# Build / Run / Dev Setup

This guide explains how to launch the game locally, expected runtime requirements, and common dev tasks. The project runs directly in the browser; no bundler is required unless you add one.

## Requirements
- **Browser:** Modern Chromium-based browser (Chrome/Edge) or Firefox.
- **Node.js:** Optional, only if you add tooling or a dev server. If needed, use Node 18+.
- **No build step needed:** Scripts are loaded via `<script>` tags in `game/index.html`.

## Running Locally
1) Open `game/index.html` in your browser. A simple way is to run a static server from the repo root:
   - Python: `python -m http.server 8000`
   - Node (serve): `npx serve game` or `npx http-server game`
   - Or open `game/index.html` directly from the filesystem (may hit CORS limits in some browsers; a local server is recommended).
2) The game initializes via `<script>` tags in `index.html`. Ensure new scripts are added there if you create new files.

## Editing and Reloading
- Modify JS/HTML/CSS files, then refresh the page.
- Keep script load order: class definitions before EntityFactory registration and before `Game.js`.

## Lint/Format (if you add tooling)
- There is no enforced linter/formatter in this repo. If you add one:
  - ESLint: `npx eslint game/scripts/**/*.js`
  - Prettier: `npx prettier --write "game/scripts/**/*.js" "docs/**/*.md"`
- Agree on a style with your team (see `docs/code-style-and-contrib.md`).

## Bundling (optional)
- Not required. If you add a bundler (Vite/Webpack/Rollup), ensure:
  - All global registrations (`window.LevelDefinitions`, `window.RoomDescriptors`) remain accessible.
  - EntityFactory registration runs after classes are defined.
  - `index.html` (or your entry) loads the bundled output instead of individual scripts.

## Testing (manual)
- Use the debug toggle in-game to view hitboxes.
- Check the browser console for missing asset errors.
- Verify new entities spawn by adding them to a level/room and observing in-game.

## Common Run Issues
- **Blank screen / errors:** Check console for missing script paths; ensure `index.html` loads all needed scripts.
- **Missing assets:** Network tab 404s; confirm `art/...`, `music/...`, `sfx/...` paths.
- **CORS/file loading:** Use a local server instead of file:// if assets fail to load.
