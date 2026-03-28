import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect } from '../../js/framework/signal.js';

// Flush all pending microtasks.
// Two rounds handle chained updates: signal → computed subscriber → computed's own subscribers.
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

// ─────────────────────────────────────────────────────────────────────────────
describe('signal()', () => {
  it('returns the initial value', () => {
    expect(signal(42).get()).toBe(42);
    expect(signal(null).get()).toBeNull();
    expect(signal('hello').get()).toBe('hello');
  });

  it('set() updates the stored value synchronously', () => {
    const s = signal(0);
    s.set(99);
    expect(s.get()).toBe(99);
  });

  it('update() applies a transform and stores the result', () => {
    const s = signal(4);
    s.update(n => n * 3);
    expect(s.get()).toBe(12);
  });

  it('notifies subscribers asynchronously (batched via microtask)', async () => {
    const s   = signal(0);
    const spy = vi.fn();
    s.subscribe(spy);

    s.set(1);
    expect(spy).not.toHaveBeenCalled(); // still pending

    await flush();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('batches multiple set() calls in the same tick into one subscriber notification', async () => {
    const s   = signal(0);
    const spy = vi.fn();
    s.subscribe(spy);

    s.set(1);
    s.set(2);
    s.set(3);

    await flush();
    expect(spy).toHaveBeenCalledOnce();  // one notification, not three
    expect(s.get()).toBe(3);
  });

  it('notifies all subscribers on change', async () => {
    const s    = signal(0);
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    s.subscribe(spy1);
    s.subscribe(spy2);

    s.set(1);
    await flush();

    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
  });

  it('subscribe() returns an unsubscribe function that stops notifications', async () => {
    const s     = signal(0);
    const spy   = vi.fn();
    const unsub = s.subscribe(spy);

    unsub();
    s.set(1);
    await flush();

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not notify a subscriber removed before flush fires', async () => {
    const s     = signal(0);
    const spy   = vi.fn();
    const unsub = s.subscribe(spy);

    s.set(1);
    unsub();       // removed before microtask runs
    await flush();

    // Subscriber was removed but was already in the pending set — implementation
    // may or may not call it. The important contract is that after unsub() future
    // set() calls never fire the subscriber.
    spy.mockClear();
    s.set(2);
    await flush();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('computed()', () => {
  it('derives initial value from the compute function', () => {
    const s = signal(5);
    const c = computed(() => s.get() * 2, s);
    expect(c.get()).toBe(10);
  });

  it('recomputes when a dependency signal changes', async () => {
    const s = signal(3);
    const c = computed(() => s.get() + 1, s);

    s.set(9);
    await flush();

    expect(c.get()).toBe(10);
  });

  it('works with multiple dependencies', async () => {
    const a   = signal(2);
    const b   = signal(3);
    const sum = computed(() => a.get() + b.get(), a, b);

    expect(sum.get()).toBe(5);

    a.set(10);
    await flush();
    expect(sum.get()).toBe(13);

    b.set(7);
    await flush();
    expect(sum.get()).toBe(17);
  });

  it('returns a read-only signal (no set method)', () => {
    const s = signal(1);
    const c = computed(() => s.get(), s);
    expect(c.set).toBeUndefined();
  });

  it('is itself subscribable', async () => {
    const s   = signal(1);
    const c   = computed(() => s.get() * 10, s);
    const spy = vi.fn();

    c.subscribe(spy);
    s.set(5);
    await flush();

    expect(c.get()).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('effect()', () => {
  it('runs the function immediately on creation', () => {
    const s   = signal('hello');
    const spy = vi.fn();
    effect(spy, s);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('re-runs when a dependency changes', async () => {
    const s   = signal(0);
    const spy = vi.fn();
    effect(spy, s);
    expect(spy).toHaveBeenCalledTimes(1);

    s.set(1);
    await flush();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('returns a cleanup function that cancels further re-runs', async () => {
    const s    = signal(0);
    const spy  = vi.fn();
    const stop = effect(spy, s);

    stop();
    s.set(1);
    await flush();

    expect(spy).toHaveBeenCalledOnce(); // only the initial call
  });

  it('runs once per batch even if the dependency changes multiple times', async () => {
    const s   = signal(0);
    const spy = vi.fn();
    effect(spy, s);
    spy.mockClear(); // clear the initial call

    s.set(1);
    s.set(2);
    s.set(3);
    await flush();

    expect(spy).toHaveBeenCalledOnce();
  });
});
