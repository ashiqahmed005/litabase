// ===== Signal — reactive state primitive =====
//
// Batching: signal.set() never calls subscribers synchronously.
// All pending subscriber calls are flushed together in one microtask.
// This means multiple signal changes in the same synchronous block
// only trigger each watcher once — no redundant re-renders.

// ── Scheduler ────────────────────────────────────────────────────────────────

const _pending   = new Set(); // subscriber fns waiting to run
let   _scheduled = false;     // true while a microtask flush is queued

function _schedule(fn) {
  _pending.add(fn);
  if (!_scheduled) {
    _scheduled = true;
    queueMicrotask(_flush);
  }
}

function _flush() {
  _scheduled = false;
  // Snapshot and clear before running so that any set() calls made
  // during flush are collected into the *next* batch, not re-entrant.
  const batch = [..._pending];
  _pending.clear();
  batch.forEach(fn => fn());
}

// ── Primitives ────────────────────────────────────────────────────────────────

export function signal(initial) {
  let _value = initial;
  const _subs = new Set();

  return {
    get()         { return _value; },
    set(next)     { _value = next; _subs.forEach(fn => _schedule(fn)); },
    update(fn)    { this.set(fn(_value)); },
    subscribe(fn) { _subs.add(fn); return () => _subs.delete(fn); },
  };
}

// Derived read-only signal — recomputes whenever any dep changes.
export function computed(fn, ...deps) {
  const sig = signal(fn());
  deps.forEach(dep => dep.subscribe(() => sig.set(fn())));
  return { get: () => sig.get(), subscribe: (fn) => sig.subscribe(fn) };
}

// Reactive side effect — runs fn immediately, then re-runs whenever a dep changes.
// Returns a cleanup function that cancels the subscriptions.
//
//   const stop = effect(() => {
//     document.title = name$.get() ? `${name$.get()} — Litabase` : 'Litabase';
//   }, name$);
//
//   stop(); // unsubscribe when no longer needed
export function effect(fn, ...deps) {
  fn(); // run once immediately to establish initial state
  const unsubs = deps.map(sig => sig.subscribe(() => fn()));
  return () => unsubs.forEach(u => u());
}
