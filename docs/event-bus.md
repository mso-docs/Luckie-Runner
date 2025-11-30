# Event Bus Guide (Publish/Subscribe)

This guide covers the lightweight EventBus used for decoupled messaging. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/core/EventBus.js`
- Class: `EventBus`

---
## API
```js
const bus = new EventBus();
const unsubscribe = bus.on('player:hit', (payload) => { /* handle */ });
bus.emit('player:hit', { amount: 10 });
bus.off('player:hit', handler); // optional manual removal
unsubscribe(); // preferred; returned by on()
```

Methods:
- `on(eventName, handler)`: subscribe; returns an unsubscribe function.
- `off(eventName, handler)`: remove a handler.
- `emit(eventName, payload)`: call all handlers for the event with `payload`.

---
## Where It’s Used
- Constructed in `Game` and stored in `services.eventBus`.
- Scenes receive `events` via `sceneContext` (see `Game.sceneContext`).
- You can use it for UI-to-game or system-to-system notifications without direct references.

---
## Common Patterns
- Player damage:
  ```js
  bus.emit('player:damaged', { amount: 10, source: 'spike' });
  ```
- Analytics/logging:
  ```js
  bus.on('item:collected', ({ id }) => console.log('Picked', id));
  ```
- UI updates:
  ```js
  bus.on('coins:changed', ({ total }) => ui.updateCoins(total));
  ```

---
## Troubleshooting
- No handler firing: check event name spelling; ensure subscription occurs before emit.
- Memory concerns: keep the unsubscribe function and call it when destroying long-lived objects.
