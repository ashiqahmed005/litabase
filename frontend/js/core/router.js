// ===== Router =====
// Hash-based URL router. Each page gets a shareable URL (#/connections, etc.).
// The back/forward buttons work because navigate() calls history.pushState().
//
// Context pages (e.g. dashboard-view) depend on in-memory state and cannot be
// navigated to directly via URL — they are excluded from history entries and
// redirect to their parent if accessed cold.
//
// API:
//   Router.init()              — call once at app bootstrap (wires popstate)
//   Router.start(default)      — call after login; activates page from URL or default
//   Router.navigate(page)      — pushes a history entry and activates the page
//   Router.navigate(page, { replace: true }) — replaces current history entry
//   Router.onEnter(page, fn)   — register a hook called every time a page is activated

const _hooks = {};

// Pages that require in-memory context (e.g. a selected dashboard ID).
// They are never written into the URL and redirect to a parent if hit cold.
const _CONTEXT_PAGES = new Set(['dashboard-view']);

// ── Internal ──────────────────────────────────────────────────────────────────

function _pageFromHash() {
  // "#/connections" → "connections"  |  "" or "#/" → null
  return location.hash.replace(/^#\/?/, '') || null;
}

function _activate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });

  document.getElementById(`page-${page}`)?.classList.remove('hidden');

  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) {
    nav.classList.add('active');
    nav.setAttribute('aria-current', 'page');
  }

  _hooks[page]?.();
}

// ── Public ────────────────────────────────────────────────────────────────────

export const Router = {

  // Register a callback that fires every time `page` is activated.
  onEnter(page, fn) {
    _hooks[page] = fn;
  },

  // Navigate to a page, updating the browser URL.
  // Context-dependent pages (dashboard-view) never push a history entry.
  navigate(page, { replace = false } = {}) {
    if (!_CONTEXT_PAGES.has(page)) {
      const method = replace ? 'replaceState' : 'pushState';
      history[method](null, '', `#/${page}`);
    }
    _activate(page);
  },

  // Called once after a successful login.
  // Activates the page from the current URL hash, or falls back to defaultPage.
  start(defaultPage = 'dashboards') {
    const page = _pageFromHash();
    const isValid = page
      && !_CONTEXT_PAGES.has(page)
      && document.getElementById(`page-${page}`);

    if (isValid) {
      _activate(page);
    } else {
      Router.navigate(defaultPage, { replace: true });
    }
  },

  // Wire the browser back/forward buttons. Call once at bootstrap.
  init() {
    window.addEventListener('popstate', () => {
      const page = _pageFromHash();
      const isValid = page
        && !_CONTEXT_PAGES.has(page)
        && document.getElementById(`page-${page}`);

      if (!isValid) {
        // Hash points somewhere invalid (cold context page, unknown route, empty).
        // Replace rather than push so the back button doesn't get stuck.
        Router.navigate('dashboards', { replace: true });
        return;
      }
      _activate(page);
    });
  },
};
