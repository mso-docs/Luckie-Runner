# Building a Modal from Scratch (HTML/CSS/JS)

This guide shows how to create a new modal window (dialog) using the existing UI patterns. It assumes minimal prior knowledge.

## What a Modal Needs
- **HTML container:** A `<div>` with a unique `id`, `role="dialog"`, and `class="modal hidden"` (hidden by default).
- **Header/body/actions:** Title text, body content, and buttons.
- **CSS:** Position, backdrop, sizes, fonts, and the `.hidden` class to hide it.
- **JS wiring:** Show/hide functions and button event handlers.

## Step 1: Add HTML (game/index.html)
Place near other menus/overlays:
```html
<div id="exampleModal" class="modal hidden" role="dialog" aria-labelledby="exampleModalTitle">
  <div class="modal__window">
    <div class="modal__header">
      <h2 id="exampleModalTitle">Example Modal</h2>
      <button id="exampleModalClose" class="modal__close" aria-label="Close">×</button>
    </div>
    <div class="modal__body">
      <p>This is the body text for the modal.</p>
    </div>
    <div class="modal__footer">
      <button id="exampleModalCancel" type="button">Cancel</button>
      <button id="exampleModalConfirm" type="button" class="primary">Confirm</button>
    </div>
  </div>
</div>
```

## Step 2: Style It (CSS)
Add to `game/styles/main.css`:
```css
.modal.hidden { display: none; }
.modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 10;
}
.modal__window {
  width: 420px;
  background: #1e1e2e;
  color: #f7f7f7;
  border: 2px solid #ffffff;
  border-radius: 8px;
  box-shadow: 0 10px 32px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  padding: 16px;
}
.modal__header, .modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.modal__body { margin: 12px 0; }
.modal__close { background: transparent; color: #f7f7f7; border: none; font-size: 20px; cursor: pointer; }
.modal__footer .primary { background: #3a82f7; color: #fff; border: none; padding: 8px 12px; cursor: pointer; }
```

## Step 3: Wire JS (UIManager or a small helper)
In `game/scripts/ui/UIManager.js`, add setup and show/hide helpers:
```js
setupExampleModal() {
  this.exampleModal = document.getElementById('exampleModal');
  this.exampleModalClose = document.getElementById('exampleModalClose');
  this.exampleModalCancel = document.getElementById('exampleModalCancel');
  this.exampleModalConfirm = document.getElementById('exampleModalConfirm');

  const hide = () => this.hideExampleModal();
  this.exampleModalClose?.addEventListener('click', hide);
  this.exampleModalCancel?.addEventListener('click', hide);
  this.exampleModalConfirm?.addEventListener('click', () => {
    // TODO: add your confirm action here
    hide();
  });
},

showExampleModal() {
  this.exampleModal?.classList.remove('hidden');
  // Optional: pause game or block input as needed
},

hideExampleModal() {
  this.exampleModal?.classList.add('hidden');
}
```
Call `setupExampleModal()` from your UI initialization (e.g., `UIManager.init`).

## Step 4: Open the Modal
Trigger from a button or event:
```js
document.getElementById('openExampleButton')
  ?.addEventListener('click', () => uiManager.showExampleModal());
```
Or call `uiManager.showExampleModal()` from game logic when needed (e.g., after a quest).

## Optional: Keyboard Handling
- Close on `Escape`:
  ```js
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') uiManager.hideExampleModal();
  });
  ```
- Trap focus (advanced): cycle focus between buttons if you need accessibility focus trapping.

## Optional: Canvas-Rendered Modal
If you prefer drawing the modal on canvas (no HTML), follow the pattern in `docs/canvas-ui-conversion.md`: store modal state in JS, draw rectangles/text in the render pass, and do hit-testing for buttons on mouse events.

## Variables and What They Do
- `exampleModal`: The outer overlay. Removing `hidden` shows it.
- `exampleModalClose/Cancel/Confirm`: Buttons to close or confirm actions.
- `modal__window`: Inner panel for visual framing.
- `isOpen` flag (if you store state): Use it to decide when to draw or show.

## Checklist
1) Add the modal HTML with unique ids and `.hidden`.
2) Add CSS for overlay + window + buttons.
3) Cache elements in JS; add show/hide helpers and button handlers.
4) Trigger `show...` from a button or game event.
5) (Optional) Add Escape-to-close and focus handling; (Optional) use canvas rendering instead of DOM.
