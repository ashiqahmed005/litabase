import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component } from '../../js/framework/component.js';
import { signal } from '../../js/framework/signal.js';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

// ── Test fixtures ─────────────────────────────────────────────────────────────

class Simple extends Component {
  render() {
    const d = document.createElement('div');
    d.className   = 'simple';
    d.textContent = 'rendered';
    return d;
  }
}

class Counter extends Component {
  constructor(props) {
    super(props);
    this.renderCount = 0;
  }
  render() {
    this.renderCount++;
    const d = document.createElement('div');
    d.dataset.render = this.renderCount;
    return d;
  }
}

class Broken extends Component {
  render() { throw new Error('render failed'); }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Component.mount()', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders into the container', () => {
    new Simple().mount(container);
    expect(container.querySelector('.simple')).not.toBeNull();
  });

  it('replaces any existing container content', () => {
    container.innerHTML = '<p>old content</p>';
    new Simple().mount(container);
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('.simple')).not.toBeNull();
  });

  it('calls onMount() after the root is in the DOM', () => {
    const spy = vi.fn();
    class C extends Simple { onMount() { spy(this._root?.isConnected); } }
    new C().mount(container);
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('returns `this` for chaining', () => {
    const c = new Simple();
    expect(c.mount(container)).toBe(c);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Component.update()', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('replaces the root element with a fresh render', () => {
    const c = new Counter();
    c.mount(container);
    expect(container.querySelector('[data-render="1"]')).not.toBeNull();

    c.update();
    expect(container.querySelector('[data-render="1"]')).toBeNull();
    expect(container.querySelector('[data-render="2"]')).not.toBeNull();
  });

  it('is a no-op when the component is not mounted', () => {
    expect(() => new Simple().update()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Component.destroy()', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('removes the root element from the DOM', () => {
    const c = new Simple();
    c.mount(container);
    expect(container.children.length).toBe(1);
    c.destroy();
    expect(container.children.length).toBe(0);
  });

  it('calls onDestroy()', () => {
    const spy = vi.fn();
    class C extends Simple { onDestroy() { spy(); } }
    const c = new C();
    c.mount(container);
    c.destroy();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('clears _root so update() is a no-op afterwards', () => {
    const c = new Simple();
    c.mount(container);
    c.destroy();
    expect(c._root).toBeNull();
    expect(() => c.update()).not.toThrow();
  });

  it('unsubscribes all signal watchers so update() is never called again', async () => {
    const s        = signal(0);
    const updateSpy = vi.fn();
    const c = new Simple();
    c.mount(container);
    c.update = updateSpy;
    c.watch(s);

    c.destroy();
    s.set(1);
    await flush();

    expect(updateSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Component.watch()', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('calls update() when the signal changes', async () => {
    const s        = signal(0);
    const updateSpy = vi.fn();
    const c = new Simple();
    c.mount(container);
    c.update = updateSpy;
    c.watch(s);

    s.set(1);
    await flush();
    expect(updateSpy).toHaveBeenCalledOnce();
  });

  it('accepts a custom callback instead of update()', async () => {
    const s   = signal('a');
    const spy = vi.fn();
    const c   = new Simple();
    c.mount(container);
    c.watch(s, spy);

    s.set('b');
    await flush();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('returns `this` for chaining', () => {
    const c = new Simple();
    c.mount(container);
    expect(c.watch(signal(0))).toBe(c);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Component.adopt()', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('calls onDestroy() on adopted children when the parent is destroyed', () => {
    const childDestroySpy = vi.fn();
    class Child extends Simple { onDestroy() { childDestroySpy(); } }

    const parent = new Simple();
    const child  = new Child();
    parent.mount(container);
    parent.adopt(child);
    parent.destroy();

    expect(childDestroySpy).toHaveBeenCalledOnce();
  });

  it('releases adopted children subscriptions on parent update', async () => {
    const s         = signal(0);
    const childSpy  = vi.fn();
    const child     = new Simple();
    child.watch     = vi.fn(); // prevent actual watch
    child._subs     = [childSpy]; // simulate a subscription
    const parent    = new Simple();
    parent.mount(container);
    parent.adopt(child);

    parent.update(); // should release child subs
    expect(childSpy).toHaveBeenCalledOnce(); // the unsub fn was called
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Component error boundary', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('mounts a fallback element instead of throwing when render() fails', () => {
    expect(() => new Broken().mount(container)).not.toThrow();
    expect(container.querySelector('.empty-state')).not.toBeNull();
  });

  it('the fallback contains an error-text element', () => {
    new Broken().mount(container);
    expect(container.querySelector('.error-text')).not.toBeNull();
  });

  it('custom onError() can return a bespoke fallback', () => {
    class C extends Component {
      render() { throw new Error('oops'); }
      onError()  {
        const d = document.createElement('div');
        d.className = 'custom-fallback';
        return d;
      }
    }
    new C().mount(container);
    expect(container.querySelector('.custom-fallback')).not.toBeNull();
  });
});
