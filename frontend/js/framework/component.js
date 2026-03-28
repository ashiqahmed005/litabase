// ===== Component — base class =====
// Each component owns its markup, event bindings, and cleanup.
// Subclass it and override render() — return a single HTMLElement.
//
// Lifecycle:
//   mount(container) → render() → onMount()
//   signal change   → update() → render() replaces root in place
//   destroy()       → onDestroy() → subscriptions released → root removed
//
// Signals:
//   watch(sig)     — re-render when sig changes
//   watch(sig, fn) — call fn instead of re-rendering
//
// Children:
//   adopt(child)   — child.destroy() is called when parent is destroyed
//
// Error handling:
//   Override onError(err) to return a fallback HTMLElement.
//   Default shows an inline error message so the rest of the UI keeps working.

export class Component {
  constructor(props = {}) {
    this.props     = props;
    this._root     = null;
    this._subs     = [];   // signal unsubscribers
    this._children = [];   // adopted child components
  }

  // ── Override in subclass ──────────────────────────────────────────────────

  // Must return a single HTMLElement. Called fresh on every update.
  render() { return document.createElement('div'); }

  // Called once after first mount, with root already in the DOM.
  onMount() {}

  // Called before final destruction.
  onDestroy() {}

  // Called when render() throws. Return a fallback element, or rethrow to propagate.
  onError(err) {
    console.error(`[${this.constructor.name}] render error:`, err);
    const el = document.createElement('div');
    el.className = 'empty-state';
    const p = document.createElement('p');
    p.className = 'error-text';
    p.textContent = `Something went wrong: ${err.message}`;
    el.appendChild(p);
    return el;
  }

  // ── Framework internals ───────────────────────────────────────────────────

  // Appends this component as the sole child of container.
  mount(container) {
    this._root = this._safeRender();
    container.replaceChildren(this._root);
    this.onMount();
    return this;
  }

  // Re-render and swap the root element in place.
  update() {
    if (!this._root) return;
    this._releaseChildren();
    const next = this._safeRender();
    this._root.replaceWith(next);
    this._root = next;
  }

  // Fully tear down: subscriptions, children, and DOM.
  destroy() {
    this.onDestroy();
    this._subs.forEach(unsub => unsub());
    this._releaseChildren();
    this._root?.remove();
    this._root     = null;
    this._subs     = [];
    this._children = [];
  }

  // Watch a signal. Calls fn on change, or triggers update() if fn is omitted.
  watch(sig, fn) {
    const unsub = sig.subscribe(fn ?? (() => this.update()));
    this._subs.push(unsub);
    return this;
  }

  // Adopt a child component — it will be released when this component updates or is destroyed.
  adopt(child) {
    this._children.push(child);
    return child;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _safeRender() {
    try {
      return this.render();
    } catch(err) {
      return this.onError(err);
    }
  }

  // Release children's subscriptions without removing their DOM
  // (used before update() where replaceWith() handles DOM cleanup).
  _releaseChildren() {
    this._children.forEach(c => {
      c.onDestroy?.();
      c._subs.forEach(u => u());
      c._releaseChildren?.();
      c._subs     = [];
      c._children = [];
    });
    this._children = [];
  }
}
