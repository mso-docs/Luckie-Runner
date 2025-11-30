# Converting Legacy HTML/CSS UI to Canvas + JavaScript (Beginner Guide)

This guide explains, step by step, how to move a simple HTML/CSS UI (like a modal or panel) into canvas-rendered elements controlled by JavaScript. It assumes no prior knowledge.

## What You’re Moving From and To
- **From:** DOM-based UI (HTML tags styled by CSS, shown/hidden with classes).
- **To:** Canvas-based UI (drawn with the 2D context in JavaScript, shown/hidden by code).

## Key Differences
- **Layout:** HTML/CSS handles layout automatically; canvas requires you to set positions and sizes in code.
- **Styling:** CSS gives colors, borders, fonts; canvas draws shapes/text manually.
- **Interaction:** DOM has built-in events (click, focus); canvas needs manual hit-testing (checking if the mouse is over a region) and custom event handling.

## Basic Building Blocks in Canvas
- **Canvas element:** The game already uses a `<canvas>` (see `game/index.html` with `#gameCanvas`).
- **2D context:** Access with `const ctx = canvas.getContext('2d');`.
- **Drawing:** Use `ctx.fillRect` (boxes), `ctx.strokeRect` (outlines), `ctx.fillText` (text), `ctx.drawImage` (images).
- **State:** Store your UI state in JavaScript objects (e.g., `{ isOpen: true, buttons: [...] }`).

## Step-by-Step: Convert a Simple Modal
Imagine you had this HTML modal:
```html
<div id="myModal" class="modal hidden">
  <h2>Title</h2>
  <p>Body text</p>
  <button id="okButton">OK</button>
</div>
```

### 1) Define Modal State in JS
```js
const modal = {
  isOpen: false,
  title: 'Title',
  body: 'Body text',
  buttons: [
    { label: 'OK', onClick: () => { modal.isOpen = false; } }
  ],
  x: 300, y: 150, width: 400, height: 200
};
```

### 2) Draw It on Canvas
Call this from your render loop (after the world draws):
```js
function renderModal(ctx, camera) {
  if (!modal.isOpen) return;
  // Dim background
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Panel
  ctx.fillStyle = '#1e1e2e';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.fillRect(modal.x, modal.y, modal.width, modal.height);
  ctx.strokeRect(modal.x, modal.y, modal.width, modal.height);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText(modal.title, modal.x + 16, modal.y + 32);

  // Body
  ctx.font = '16px sans-serif';
  ctx.fillText(modal.body, modal.x + 16, modal.y + 64);

  // Button (simple single button example)
  const btn = modal.buttons[0];
  const btnX = modal.x + modal.width - 100;
  const btnY = modal.y + modal.height - 50;
  const btnW = 80, btnH = 30;
  ctx.fillStyle = '#3a82f7';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(btn.label, btnX + 16, btnY + 20);

  ctx.restore();

  // Store button hitbox for clicks
  modal.buttons[0].hitbox = { x: btnX, y: btnY, w: btnW, h: btnH };
}
```

### 3) Handle Clicks Manually
Add a mouse listener to test if the click is inside the button rectangle:
```js
canvas.addEventListener('click', (e) => {
  if (!modal.isOpen) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const btn = modal.buttons[0];
  const hb = btn.hitbox;
  if (hb && mx >= hb.x && mx <= hb.x + hb.w && my >= hb.y && my <= hb.y + hb.h) {
    btn.onClick();
  }
});
```

### 4) Open/Close in Code
Replace CSS `hidden` toggles with JS flags:
```js
modal.isOpen = true; // show
modal.isOpen = false; // hide
```

## General Tips for Converting Other UI
- **Panels/Windows:** Draw a rectangle (fill + stroke), add a title and body text.
- **Lists (like shop/inventory):** Loop over items; for each, draw a row rectangle and text; store hitboxes for clicks.
- **Buttons:** Draw rectangles, center text, store hitboxes, and run callbacks on click.
- **Sliders:** Draw a line and a handle circle; on mouse down/move, update the handle position and value.
- **Focus/States:** Track `isHovered`, `isPressed` flags if you want hover effects; change fill color accordingly.
- **Fonts/Colors:** Define a small theme object (e.g., `{ panelBg, panelBorder, text, accent }`) and reuse.

## Where to Put the Code
- Rendering: After the world render, call your UI draw functions (e.g., in `Renderer`/`SceneRenderer` UI pass).
- State: Store UI state on a global UI manager object (like `UIManager`) or a dedicated JS module.
- Input: Add mouse listeners once (on the canvas) and route events to active UI elements by checking hitboxes.

## Common Pitfalls
- **No automatic layout:** You must set positions/sizes. Consider using simple constants or functions to compute layout.
- **Hit-testing needed:** Canvas doesn’t know where buttons are; you must store rectangles and test clicks.
- **Text wrapping:** `ctx.fillText` does not wrap automatically; split long text manually or limit line length.
- **Z-order:** Draw UI after the game world so it appears on top.

## Minimal Checklist
1) Define UI state in JS (isOpen, x/y, width/height, labels, buttons).
2) Draw shapes/text in the render loop when isOpen is true.
3) Store hitboxes for interactive elements.
4) Add canvas mouse listeners; on click, test hitboxes and call callbacks.
5) Remove or hide the old HTML/CSS modal (or ignore it) once the canvas version is working.
