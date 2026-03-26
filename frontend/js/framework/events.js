// ===== Event Bus =====
// Decouples features — no direct imports between features needed for notifications.
//
// Usage:
//   Events.on('query:saved', payload => ...)   // subscribe
//   Events.emit('query:saved', { id })          // publish
//   const off = Events.on(...); off();           // unsubscribe

const _listeners = new Map();

export const Events = {
  on(event, fn) {
    if (!_listeners.has(event)) _listeners.set(event, new Set());
    _listeners.get(event).add(fn);
    return () => _listeners.get(event).delete(fn);
  },

  emit(event, payload) {
    _listeners.get(event)?.forEach(fn => fn(payload));
  },
};
