import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../../js/core/store.js';

// Store is a module singleton — reset between tests.
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

beforeEach(async () => {
  Store.clearUser();
  Store.setDashboardId(null);
  await flush();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Store — user', () => {
  it('getUser() returns null initially', () => {
    expect(Store.getUser()).toBeNull();
  });

  it('setUser() stores the user object', () => {
    Store.setUser({ id: 1, name: 'Alice' });
    expect(Store.getUser()).toEqual({ id: 1, name: 'Alice' });
  });

  it('clearUser() resets the user to null', () => {
    Store.setUser({ id: 1, name: 'Alice' });
    Store.clearUser();
    expect(Store.getUser()).toBeNull();
  });

  it('user$ signal notifies subscribers on change', async () => {
    const received = [];
    const unsub = Store.user$.subscribe(() => received.push(Store.getUser()));

    Store.setUser({ id: 2, name: 'Bob' });
    await flush();

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ id: 2, name: 'Bob' });
    unsub();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Store — isLoggedIn$ (computed)', () => {
  it('is false when user is null', async () => {
    await flush();
    expect(Store.isLoggedIn$.get()).toBe(false);
  });

  it('becomes true after setUser()', async () => {
    Store.setUser({ id: 1, name: 'Alice' });
    await flush();
    expect(Store.isLoggedIn$.get()).toBe(true);
  });

  it('returns to false after clearUser()', async () => {
    Store.setUser({ id: 1, name: 'Alice' });
    await flush();
    Store.clearUser();
    await flush();
    expect(Store.isLoggedIn$.get()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Store — dashboardId', () => {
  it('getDashboardId() returns null initially', () => {
    expect(Store.getDashboardId()).toBeNull();
  });

  it('setDashboardId() stores the id', () => {
    Store.setDashboardId(42);
    expect(Store.getDashboardId()).toBe(42);
  });

  it('accepts string ids (UUIDs)', () => {
    Store.setDashboardId('abc-123');
    expect(Store.getDashboardId()).toBe('abc-123');
  });

  it('dashboardId$ signal notifies subscribers on change', async () => {
    let notified = false;
    const unsub  = Store.dashboardId$.subscribe(() => { notified = true; });

    Store.setDashboardId(7);
    await flush();

    expect(notified).toBe(true);
    unsub();
  });
});
