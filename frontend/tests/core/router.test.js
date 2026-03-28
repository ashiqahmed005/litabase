import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Router queries the DOM for page sections and nav items, and writes to
// history. Each test gets a fresh Router import + a minimal DOM fixture.

function buildDOM(pages = ['dashboards', 'connections', 'editor']) {
  document.body.innerHTML = '';
  pages.forEach(id => {
    const section = document.createElement('section');
    section.id        = `page-${id}`;
    section.className = 'page hidden';
    document.body.appendChild(section);
  });
  const nav = document.createElement('nav');
  pages.forEach(id => {
    const btn = document.createElement('button');
    btn.className   = 'nav-item';
    btn.dataset.page = id;
    nav.appendChild(btn);
  });
  document.body.appendChild(nav);
}

let Router;

beforeEach(async () => {
  vi.resetModules();
  buildDOM();
  history.replaceState(null, '', '/');
  ({ Router } = await import('../../js/core/router.js'));
});

afterEach(() => vi.restoreAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('Router.navigate()', () => {
  it('removes .hidden from the target page', () => {
    Router.navigate('connections');
    expect(document.getElementById('page-connections').classList.contains('hidden')).toBe(false);
  });

  it('adds .hidden to all other pages', () => {
    Router.navigate('connections');
    expect(document.getElementById('page-dashboards').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('page-editor').classList.contains('hidden')).toBe(true);
  });

  it('marks only the matching nav-item as active', () => {
    Router.navigate('connections');
    const items = document.querySelectorAll('.nav-item');
    const active = [...items].filter(el => el.classList.contains('active'));
    expect(active).toHaveLength(1);
    expect(active[0].dataset.page).toBe('connections');
  });

  it('sets aria-current="page" on the active nav item', () => {
    Router.navigate('editor');
    expect(document.querySelector('.nav-item[data-page="editor"]').getAttribute('aria-current')).toBe('page');
  });

  it('removes aria-current from previously active nav items', () => {
    Router.navigate('connections');
    Router.navigate('editor');
    expect(document.querySelector('.nav-item[data-page="connections"]').getAttribute('aria-current')).toBeNull();
  });

  it('pushes a history entry for normal pages', () => {
    const spy = vi.spyOn(history, 'pushState');
    Router.navigate('connections');
    expect(spy).toHaveBeenCalledWith(null, '', '#/connections');
  });

  it('uses replaceState when replace: true', () => {
    const replaceSpy = vi.spyOn(history, 'replaceState');
    const pushSpy    = vi.spyOn(history, 'pushState');
    Router.navigate('connections', { replace: true });
    expect(replaceSpy).toHaveBeenCalledWith(null, '', '#/connections');
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('does NOT push history for context pages (dashboard-view)', () => {
    // Add the context page to the DOM so the router can find it
    const s = document.createElement('section');
    s.id = 'page-dashboard-view'; s.className = 'page hidden';
    document.body.appendChild(s);

    const spy = vi.spyOn(history, 'pushState');
    Router.navigate('dashboard-view');
    expect(spy).not.toHaveBeenCalled();
  });

  it('fires the registered onEnter hook for the page', () => {
    const spy = vi.fn();
    Router.onEnter('connections', spy);
    Router.navigate('connections');
    expect(spy).toHaveBeenCalledOnce();
  });

  it("does not fire another page's hook", () => {
    const spy = vi.fn();
    Router.onEnter('editor', spy);
    Router.navigate('connections');
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Router.start()', () => {
  it('activates the page matching the current URL hash', () => {
    history.replaceState(null, '', '#/connections');
    Router.start('dashboards');
    expect(document.getElementById('page-connections').classList.contains('hidden')).toBe(false);
  });

  it('falls back to defaultPage when hash is empty', () => {
    history.replaceState(null, '', '/');
    Router.start('dashboards');
    expect(document.getElementById('page-dashboards').classList.contains('hidden')).toBe(false);
  });

  it('falls back to defaultPage when hash points to an unknown route', () => {
    history.replaceState(null, '', '#/does-not-exist');
    Router.start('dashboards');
    expect(document.getElementById('page-dashboards').classList.contains('hidden')).toBe(false);
  });

  it('falls back to defaultPage when hash points to a context page', () => {
    history.replaceState(null, '', '#/dashboard-view');
    Router.start('dashboards');
    expect(document.getElementById('page-dashboards').classList.contains('hidden')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Router.init() — popstate handling', () => {
  it('activates the hash page on popstate', () => {
    Router.init();
    history.replaceState(null, '', '#/editor');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(document.getElementById('page-editor').classList.contains('hidden')).toBe(false);
  });

  it('falls back to dashboards on popstate with empty hash', () => {
    Router.init();
    history.replaceState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(document.getElementById('page-dashboards').classList.contains('hidden')).toBe(false);
  });
});
